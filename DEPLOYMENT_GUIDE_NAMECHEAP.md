# 🚀 Deployment Guide: Namecheap Hosting
**Target Domain:** `customisemeuk.com`

Since your application uses a **Serverless Architecture** (Firebase for backend logic, database, and auth), deploying to Namecheap (cPanel/Shared Hosting) is slightly different from a traditional website.

## ✅ Architecture Overview
- **Frontend (HTML/CSS/JS):** Hosted on **Namecheap** (`public_html`).
- **Backend (API/Database):** Hosted on **Firebase** (Google Cloud).
- **Connection:** Your website on Namecheap will talk to Firebase security via `js/api-integration.js`.

---

## 🛑 Step 1: Pre-Deployment Checklist (CRITICAL)

### 1. Update Stripe Key
You **MUST** replace the placeholder Stripe key with your real Live Public Key.
1. Open `js/api-integration.js`.
2. Find line ~31:
   ```javascript
   STRIPE_PUBLIC_KEY: 'pk_live_your_actual_publishable_key_here'
   ```
3. Replace `'pk_live_...'` with your actual **Stripe Live Public Key** (starts with `pk_live_`).

### 2. Authorize Domain in Firebase
For Login and Database to work, Firebase must know `customisemeuk.com` is safe.
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project **(cmuksite)**.
3. Go to **Authentication** > **Settings** > **Authorized Domains**.
4. Click **Add Domain**.
5. Enter `customisemeuk.com` and `www.customisemeuk.com`.

### 3. Authorize Domain in Stripe (Optional but Recommended)
1. Go to Stripe Dashboard > Settings > Payments > Apple Pay / Google Pay.
2. Add `customisemeuk.com` to the list if you use digital wallets.

---

## 📤 Step 2: Uploading to Namecheap

1. **Log in to Namecheap cPanel.**
2. Go to **File Manager**.
3. Navigate to `public_html` (or the folder for your domain).
4. **Delete** any default placeholder files (like `default.html` or `cgi-bin`).
5. **Upload** the following files and folders from your project:
   - **Files:** All `.html` files (`index.html`, `shop.html`, `checkout.html`, etc.), `style.css`, `icon.png`, etc.
   - **Folders:**
     - `/css`
     - `/js` (Make sure `api-integration.js` is updated!)
     - `/components`
     - `/images` (or wherever your PNGs are)
     
   > ❌ **DO NOT UPLOAD:**
   > - `backend/` folder (The Node.js server is not used).
   > - `functions/` folder (These are deployed to Google Cloud).
   > - `firebase.json`, `.firebaserc`, `.git`, `node_modules`.

---

## 🧪 Step 3: Verification
Once uploaded:
1. Visit `https://customisemeuk.com`.
2. **Check Console:** Open Developer Tools (F12) -> Console. Ensure there are no red CORS errors.
3. **Test Login:** Try to sign in. If it fails with "unauthorized domain", re-check Step 1.2.
4. **Test Newsletter:** Scroll to footer and test the subscription with your email.
