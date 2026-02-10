const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const stripe = require("stripe");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

// Define secrets
const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const webhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

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

        const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Map items to Stripe format
        // We add tax and shipping as separate line items for transparency if needed,
        // or we can use Stripe's native tax/shipping. For this prompt, we'll use line items.
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

        // Add Tax as a line item
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

        // Add Shipping as a line item
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
 * Stripe Webhook Handler
 * Processes checkout.session.completed to update order status
 */
exports.stripeWebhook = onRequest({ secrets: [stripeSecret, webhookSecret] }, async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        const stripeClient = stripe(stripeSecret.value());
        // Use req.rawBody for signature verification
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
                await admin.firestore().collection('orders').doc(orderId).update({
                    status: 'paid',
                    paidAt: admin.firestore.FieldValue.serverTimestamp(),
                    stripeSessionId: session.id
                });
                logger.info(`Order ${orderId} successfully completed.`);
            } catch (dbError) {
                logger.error(`Database update failed for order ${orderId}:`, dbError);
                return res.status(500).send("Database Update Failed");
            }
        }
    }

    res.status(200).json({ received: true });
});