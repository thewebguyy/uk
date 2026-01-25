const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// ==========================================
// 1. INVENTORY MANAGEMENT
// ==========================================
exports.updateStockOnPurchase = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data();
        const batch = admin.firestore().batch();

        // Check if items exist
        if (!order.items || !Array.isArray(order.items)) return null;

        order.items.forEach(item => {
            // Assuming item has productId and quantity
            // Handle both id and productId properties
            const pid = item.id || item.productId;
            if (!pid) return;

            const productRef = admin.firestore().collection('products').doc(pid);

            // Atomic decrement
            batch.update(productRef, {
                stock: admin.firestore.FieldValue.increment(-item.quantity)
            });
        });

        // Commit the batch
        try {
            await batch.commit();
            console.log(`Stock updated for Order ${context.params.orderId}`);
        } catch (error) {
            console.error('Failed to update stock:', error);
        }

        return null;
    });

// ==========================================
// 2. STOCK ALERTS
// ==========================================
exports.checkLowStock = functions.firestore
    .document('products/{productId}')
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();

        // If stock dropped below 10 and was previously above 10
        if (newValue.stock < 10 && previousValue.stock >= 10) {
            // Send notification to admin (using mail collection)
            await admin.firestore().collection('mail').add({
                to: 'admin@customisemeuk.com',
                message: {
                    subject: `Low Stock Alert: ${newValue.name}`,
                    text: `Product ${newValue.name} is low on stock (${newValue.stock} left).`,
                    html: `<p>Product <strong>${newValue.name}</strong> is running low.</p><p>Current Stock: ${newValue.stock}</p>`
                }
            });
            console.log(`Low stock alert created for ${newValue.name}`);
        }

        // Restock Notification ( 0 -> >0 )
        if (previousValue.stock === 0 && newValue.stock > 0) {
            // Logic for notifying waiting users
            // Assumes we store waitlists in `waitlists/{productId}` document
            const waitlistDoc = await admin.firestore().collection('waitlists').doc(context.params.productId).get();
            if (waitlistDoc.exists) {
                const emails = waitlistDoc.data().emails || [];
                const batch = admin.firestore().batch();

                emails.forEach(email => {
                    // Create mail docs
                    const mailRef = admin.firestore().collection('mail').doc();
                    batch.set(mailRef, {
                        to: email,
                        message: {
                            subject: `${newValue.name} is Back in Stock!`,
                            html: `<p>Great news! The item you wanted is available again. <a href="https://customisemeuk.com/product.html?id=${context.params.productId}">Buy Now</a></p>`
                        }
                    });
                });

                // Clear waitlist or mark notified
                batch.delete(waitlistDoc.ref);

                await batch.commit();
            }
        }
    });

// ==========================================
// 3. EMAIL AUTOMATION
// ==========================================

// Order Confirmation
exports.sendOrderConfirmation = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data();
        const email = order.email || order.shipping_address?.email;

        if (!email) return null;

        // Write to a 'mail' collection to trigger the specific Firebase Extension (Firestore Send Email)
        return admin.firestore().collection('mail').add({
            to: email,
            message: {
                subject: `Order Confirmation #${context.params.orderId}`,
                text: `Thank you for your order! Total: £${order.total_amount}. We will notify you when it ships.`,
                html: `
            <div style="font-family: sans-serif; padding: 20px;">
                <h1>Thank You for Your Order!</h1>
                <p>Your order #${context.params.orderId} has been confirmed.</p>
                <div style="background: #f9f9f9; padding: 15px; margin: 20px 0;">
                    <p><strong>Total:</strong> £${order.total_amount}</p>
                    <p><strong>Status:</strong> Pending Processing</p>
                </div>
                <a href="https://customisemeuk.com/order-tracking.html?order=${context.params.orderId}" style="background: black; color: white; padding: 10px 20px; text-decoration: none;">Track Order</a>
            </div>
        `
            }
        });
    });

// Shipping Notification
exports.sendShippingNotification = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();

        if (newData.status === 'shipped' && oldData.status !== 'shipped') {
            return admin.firestore().collection('mail').add({
                to: newData.email,
                message: {
                    subject: `Your Order #${context.params.orderId} Has Shipped!`,
                    html: `
              <div style="font-family: sans-serif;">
                  <h1>It's on the way!</h1>
                  <p>Your items have been shipped and will be with you shortly.</p>
                  <p><strong>Tracking Number:</strong> ${newData.tracking_number || 'N/A'}</p>
                  <a href="https://customisemeuk.com/order-tracking.html?order=${context.params.orderId}">Track Shipment</a>
              </div>
            `
                }
            });
        }
    });

// ==========================================
// 4. CHECKOUT & PAYMENTS
// ==========================================
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
    // If we wanted to enforce auth:
    // if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

    const { items, currency = 'gbp' } = data;

    // Calculate price safely on server side
    let total = 0;
    for (const item of items) {
        const pid = item.id || item.productId;
        const productDoc = await admin.firestore().collection('products').doc(pid).get();

        if (productDoc.exists) {
            const productData = productDoc.data();
            let price = productData.price;
            // Add logic for customizations if needed
            if (item.customization && item.customization.printLocation === 'Front & Back') {
                price += 5;
            }
            total += price * item.quantity;
        } else {
            // Fallback or error
            total += (item.price || 0) * item.quantity;
        }
    }

    // Add shipping if < 100
    const shipping = total >= 100 ? 0 : 4.99;
    const grandTotal = total + shipping;

    // Returning mock client secret for now
    // Real implementation:
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(grandTotal * 100),
    //   currency: 'gbp',
    //   metadata: { integration_check: 'accept_a_payment' },
    // });

    return {
        clientSecret: 'pi_mock_secret_' + Date.now(),
        orderId: 'ORD-' + Date.now().toString(36).toUpperCase(),
        amounts: {
            subtotal: total,
            shipping: shipping,
            total: grandTotal
        }
    };
});

// ==========================================
// 5. SCHEDULED TASKS (PubSub)
// ==========================================

// Abandoned Cart Check (Every 30 mins)
exports.checkAbandonedCarts = functions.pubsub.schedule('every 30 minutes').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 60 * 1000); // 30 mins ago

    const carts = await admin.firestore().collection('carts')
        .where('updatedAt', '<', cutoff)
        .where('status', '==', 'active')
        .where('emailSent', '==', false)
        .get();

    const batch = admin.firestore().batch();

    carts.forEach(doc => {
        const cart = doc.data();
        if (cart.email) {
            const mailRef = admin.firestore().collection('mail').doc();
            batch.set(mailRef, {
                to: cart.email,
                message: {
                    subject: 'You left something behind!',
                    html: `<p>Don't miss out on your items. <a href="https://customisemeuk.com/checkout.html">Complete Checkout</a></p>`
                }
            });
            batch.update(doc.ref, { emailSent: true });
        }
    });

    await batch.commit();
    return null;
});

// Review Requests (Daily)
exports.sendReviewRequests = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    // Find orders delivered ~7 days ago
    // For simplicity, we flag them
    const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const orders = await admin.firestore().collection('orders')
        .where('status', '==', 'delivered')
        .where('time_delivered', '<=', sevenDaysAgo)
        .where('review_requested', '==', false)
        .limit(20)
        .get();

    const batch = admin.firestore().batch();

    orders.forEach(doc => {
        const order = doc.data();
        if (order.email) {
            const mailRef = admin.firestore().collection('mail').doc();
            batch.set(mailRef, {
                to: order.email,
                message: {
                    subject: 'How was your order?',
                    html: `<p>We'd love to hear your feedback on your recent order. <a href="https://customisemeuk.com/product.html">Leave a Review</a></p>`
                }
            });
            batch.update(doc.ref, { review_requested: true });
        }
    });

    await batch.commit();
    return null;
});
