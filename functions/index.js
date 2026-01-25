const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// 1. INVENTORY MANAGEMENT
// decreases stock when a new order is created
exports.updateStockOnPurchase = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data();
        const batch = admin.firestore().batch();

        // Check if items exist
        if (!order.items || !Array.isArray(order.items)) return null;

        order.items.forEach(item => {
            // Assuming item has productId and quantity
            const productRef = admin.firestore().collection('products').doc(item.id || item.productId);

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

// 2. LOW STOCK ALERT
// monitoring product updates
exports.checkLowStock = functions.firestore
    .document('products/{productId}')
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();

        // If stock dropped below 10 and was previously above 10
        if (newValue.stock < 10 && previousValue.stock >= 10) {
            // Send notification to admin (could be email or db notification)
            await admin.firestore().collection('admin_notifications').add({
                type: 'LOW_STOCK',
                message: `Product ${newValue.name} is low on stock (${newValue.stock} left).`,
                productId: context.params.productId,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                read: false
            });
            console.log(`Low stock alert created for ${newValue.name}`);
        }
    });

// 3. EMAIL AUTOMATION TRIGGER (via Firestore Trigger)
exports.sendOrderConfirmation = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
        const order = snap.data();

        // Write to a 'mail' collection to trigger the specific Firebase Extension (Firestore Send Email)
        // Or call SendGrid/Mailgun API directly here if set up
        return admin.firestore().collection('mail').add({
            to: order.email || order.shipping_address?.email,
            message: {
                subject: `Order Confirmation #${context.params.orderId}`,
                text: `Thank you for your order! Total: £${order.total_amount}. We will notify you when it ships.`,
                html: `<h1>Thank You!</h1><p>Your order #${context.params.orderId} has been received.</p>`
            }
        });
    });

// 4. STRIPE PAYMENT INTENT (Callable)
// Used by the checkout page
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { items, currency = 'gbp' } = data;

    // Calculate price safely on server side
    let total = 0;
    for (const item of items) {
        const productDoc = await admin.firestore().collection('products').doc(item.id).get();
        const productData = productDoc.data();
        let price = productData.price;
        // Add logic for customizations if needed
        if (item.customization && item.customization.printLocation === 'Front & Back') {
            price += 5;
        }
        total += price * item.quantity;
    }

    // Initialize Stripe (placeholder)
    // const stripe = require('stripe')(functions.config().stripe.secret);
    // const paymentIntent = await stripe.paymentIntents.create({ ... });

    // Returning mock client secret for now
    return {
        clientSecret: 'pi_mock_secret_' + Date.now(),
        amount: total
    };
});

// 5. REVIEW MODERATION (Optional)
exports.sanitizeReview = functions.firestore
    .document('products/{productId}/reviews/{reviewId}')
    .onCreate(async (snap, context) => {
        const review = snap.data();
        // Check for bad words, etc.
        // Ensure verified purchase
        // Update product average rating...

        // Simple average rating update logic
        const productRef = admin.firestore().collection('products').doc(context.params.productId);

        // In a real app, you'd transactionally update the average
        // Here we just increment a counter for demo
        return productRef.update({
            reviewCount: admin.firestore.FieldValue.increment(1)
            // ratingTotal: admin.firestore.FieldValue.increment(review.rating)
        });
    });
