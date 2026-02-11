const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const stripe = require("stripe");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { getOrderConfirmationHTML } = require("./email-templates");

admin.initializeApp();

// Define secrets
const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const webhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const emailUser = defineSecret("EMAIL_USER");
const emailPass = defineSecret("EMAIL_PASSWORD");
const emailFrom = defineSecret("EMAIL_FROM");
const adminEmail = defineSecret("ADMIN_EMAIL");

/**
 * Helper: Send Order Confirmation Email
 */
async function sendOrderEmail(order, orderId, secrets) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: secrets.user,
                pass: secrets.pass
            }
        });

        const html = getOrderConfirmationHTML(order, orderId);

        const mailOptions = {
            from: secrets.from,
            to: order.email,
            subject: `Order Confirmed: ${orderId}`,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent to ${order.email}: ${info.messageId}`);

        // Also notify admin
        await transporter.sendMail({
            from: secrets.from,
            to: secrets.admin,
            subject: `New Order Received - ${orderId}`,
            html: `<h3>New Order from ${order.shippingAddress.name}</h3><p>Total: £${order.total.toFixed(2)}</p><a href="https://customisemeuk.com/order-tracking.html?order=${orderId}">View Order</a>`
        });

        return true;
    } catch (error) {
        logger.error("Email sending failed:", error);
        return false;
    }
}

/**
 * Create Stripe Checkout Session
 * Recalculates totals, creates a pending order, and returns session URL
 */
exports.createCheckoutSession = onCall({ secrets: [stripeSecret] }, async (request) => {
    const { items, email, shippingAddress, successUrl, cancelUrl } = request.data;

    if (!items || !items.length) {
        throw new HttpsError('invalid-argument', 'The cart is empty.');
    }

    try {
        const stripeClient = stripe(stripeSecret.value());

        // Recalculate Totals (Backend Source of Truth)
        let subtotal = 0;
        items.forEach(item => {
            subtotal += (item.price || 0) * (item.quantity || 1);
        });

        const tax = subtotal * 0.20;
        const shippingCost = subtotal >= 100 ? 0 : 4.99;

        // Generate sequential order ID: CMUK_001, CMUK_002, etc.
        const counterRef = admin.firestore().collection('metadata').doc('order_counter');
        const orderId = await admin.firestore().runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let nextCount = 1;

            if (counterDoc.exists) {
                nextCount = (counterDoc.data().count || 0) + 1;
            }

            transaction.set(counterRef, { count: nextCount }, { merge: true });

            // Format as CMUK_001 (padded to 3 digits)
            return `CMUK_${nextCount.toString().padStart(3, '0')}`;
        });

        const line_items = items.map(item => ({
            price_data: {
                currency: 'gbp',
                product_data: {
                    name: item.name,
                    images: item.imageUrl ? [item.imageUrl] : [],
                },
                unit_amount: Math.round(item.price * 100), // pence
            },
            quantity: item.quantity,
        }));

        if (tax > 0) {
            line_items.push({
                price_data: {
                    currency: 'gbp',
                    product_data: { name: 'VAT (20%)' },
                    unit_amount: Math.round(tax * 100),
                },
                quantity: 1,
            });
        }

        if (shippingCost > 0) {
            line_items.push({
                price_data: {
                    currency: 'gbp',
                    product_data: { name: 'Shipping' },
                    unit_amount: Math.round(shippingCost * 100),
                },
                quantity: 1,
            });
        }

        // 1. Create PENDING order document
        await admin.firestore().collection('orders').doc(orderId).set({
            items,
            subtotal,
            tax,
            shipping: shippingCost,
            total: subtotal + tax + shippingCost,
            email,
            shippingAddress: shippingAddress || {},
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Create Stripe Session
        const session = await stripeClient.checkout.sessions.create({
            line_items,
            mode: 'payment',
            customer_email: email,
            success_url: `${successUrl}?orderId=${orderId}`,
            cancel_url: cancelUrl,
            metadata: {
                orderId: orderId
            }
        });

        return { url: session.url };
    } catch (error) {
        logger.error("Stripe Session Creation Error:", error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Submit Contact Form
 */
exports.submitContact = onCall({
    secrets: [emailUser, emailPass, emailFrom, adminEmail]
}, async (request) => {
    const data = request.data;
    const { name, email, service, message } = data;

    if (!name || !email || !service || !message) {
        throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser.value(),
                pass: emailPass.value()
            }
        });

        const html = getContactEmailHTML(data);

        // Notify Admin
        await transporter.sendMail({
            from: emailFrom.value(),
            to: adminEmail.value(),
            subject: `New Inquiry: ${service} from ${name}`,
            html: html
        });

        // Auto-reply to customer
        await transporter.sendMail({
            from: emailFrom.value(),
            to: email,
            subject: "We received your message - Customise Me UK",
            html: `<p>Hi ${name},</p><p>Thank you for contacting Customise Me UK. We've received your inquiry regarding <strong>${service}</strong> and will get back to you within 24 hours.</p><p>Best regards,<br>The CMUK Team</p>`
        });

        return { success: true };
    } catch (error) {
        logger.error("Contact form processing failed:", error);
        throw new HttpsError('internal', 'Failed to send message.');
    }
});

/**
 * Stripe Webhook Handler
 * Processes checkout.session.completed to update order status
 */
exports.stripeWebhook = onRequest({
    secrets: [stripeSecret, webhookSecret, emailUser, emailPass, emailFrom, adminEmail]
}, async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        const stripeClient = stripe(stripeSecret.value());
        event = stripeClient.webhooks.constructEvent(req.rawBody, sig, webhookSecret.value());
    } catch (err) {
        logger.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderId = session.metadata.orderId;

        if (orderId) {
            try {
                const orderRef = admin.firestore().collection('orders').doc(orderId);
                const orderDoc = await orderRef.get();

                if (orderDoc.exists) {
                    const orderData = orderDoc.data();

                    // Update to 'paid'
                    await orderRef.update({
                        status: 'paid',
                        paidAt: admin.firestore.FieldValue.serverTimestamp(),
                        stripeSessionId: session.id
                    });

                    // Send Confirmation Email
                    await sendOrderEmail(orderData, orderId, {
                        user: emailUser.value(),
                        pass: emailPass.value(),
                        from: emailFrom.value(),
                        admin: adminEmail.value()
                    });

                    logger.info(`Order ${orderId} successfully completed and email sent.`);
                }
            } catch (dbError) {
                logger.error(`Webhook processing failed for order ${orderId}:`, dbError);
                return res.status(500).send("Processing Failed");
            }
        }
    }

    res.status(200).json({ received: true });
});