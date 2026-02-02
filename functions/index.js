const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const stripe = require("stripe");
const logger = require("firebase-functions/logger");

// 1. Define the secret link
const stripeSecret = defineSecret("STRIPE_SECRET_KEY");

// 2. Add the secret to the function options
exports.createPaymentIntent = onRequest({ secrets: [stripeSecret] }, async (req, res) => {
    // Enable CORS for Namecheap
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Methods', 'POST');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.status(204).send('');
        return;
    }

    try {
        // Use the secret value securely
        const stripeClient = stripe(stripeSecret.value());
        const { amount, cartId } = req.body;

        const paymentIntent = await stripeClient.paymentIntents.create({
            amount: amount,
            currency: "usd",
            automatic_payment_methods: { enabled: true },
            metadata: { cartId: cartId }
        }, {
            idempotencyKey: cartId // Prevents double-charging
        });

        res.status(200).send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        logger.error("Stripe Error:", error);
        res.status(500).send({ error: error.message });
    }
});