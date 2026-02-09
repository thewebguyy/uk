# Set Stripe Secret Key in Firebase

## Run this command in your terminal:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
```

When prompted, paste your Stripe **SECRET** key (starts with `sk_live_...`)

**IMPORTANT:** 
- Do NOT use the publishable key (pk_live_...) - that's already set in the frontend
- Use the SECRET key (sk_live_...) which you can find in your Stripe Dashboard

## To verify it was set:

```bash
firebase functions:secrets:access STRIPE_SECRET_KEY
```

## After setting the secret, redeploy your functions:

```bash
firebase deploy --only functions
```

---

**Note for your client:**
The Stripe secret key can be found at:
1. Go to https://dashboard.stripe.com/
2. Click "Developers" → "API keys"
3. Copy the "Secret key" (starts with `sk_live_...`)
4. Run the command above and paste it when prompted
