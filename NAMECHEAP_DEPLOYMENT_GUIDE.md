# 📦 Namecheap Deployment Guide

## Files to Upload to Namecheap

### ✅ INCLUDE (Upload to public_html):

**HTML Files:**
- index.html
- shop.html
- product.html
- checkout.html
- order-confirmation.html
- order-tracking.html
- account.html
- wishlist.html
- login.html
- dashboard.html
- contact.html
- about.html
- faq.html
- privacy-policy.html
- terms-conditions.html
- reviews.html
- resources.html
- designstudio.html
- designservice.html
- studio.html
- installation.html
- event-setup.html
- senditems.html
- subscriptions.html
- premiumservices.html
- workshop.html

**Folders:**
- js/ (entire folder)
- components/ (entire folder)
- email-templates/ (entire folder - optional)
- All image files (*.png, *.jpg, *.jpeg, *.svg, *.webp)

**CSS/Styles:**
- style.css

**Images:**
- icon.png
- All other image files in the root and subdirectories

### ❌ EXCLUDE (Do NOT upload):

**Documentation Files:**
- *.md files (QUICK_SUMMARY.md, FIXES_COMPLETE.md, etc.)
- README.md
- GOOGLE_SIGNIN_SETUP.md
- SET_STRIPE_SECRET.md
- WEBSITE_AUDIT_REPORT.md
- NAMECHEAP_DEPLOYMENT_GUIDE.md

**Firebase Files:**
- functions/ folder
- .firebase/ folder
- firebase.json
- .firebaserc
- firestore.rules
- firestore.indexes.json

**Development Files:**
- node_modules/ folder
- .git/ folder
- .gitignore
- package.json
- package-lock.json
- deploy.zip

---

## 🚀 Deployment Steps:

### 1. Create Clean Deployment Folder
I'll create a script to copy only the necessary files.

### 2. Upload to Namecheap
- Connect via FTP or use Namecheap File Manager
- Upload all files to `public_html/` directory
- Maintain folder structure (js/, components/, etc.)

### 3. Configure Firebase for Namecheap Domain
After upload, you MUST add your Namecheap domain to Firebase:

**Firebase Console Steps:**
1. Go to https://console.firebase.google.com/
2. Select your project (cmuksite)
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add your domain: `customisemeuk.com` (or whatever your domain is)
6. Also add `www.customisemeuk.com` if applicable

**Without this step, Firebase authentication and database will NOT work!**

---

## ⚠️ CRITICAL: Domain Authorization

Since your site uses Firebase for:
- User authentication
- Database (Firestore)
- Cloud Functions (Stripe payments)

You MUST authorize your Namecheap domain in Firebase Console, or these features will fail with CORS errors.

---

## 📝 Post-Upload Checklist:

- [ ] All HTML files uploaded
- [ ] js/ folder uploaded with all files
- [ ] components/ folder uploaded
- [ ] style.css uploaded
- [ ] All images uploaded
- [ ] Domain added to Firebase authorized domains
- [ ] Test the website at your domain
- [ ] Test user login/signup
- [ ] Test checkout process
- [ ] Test Google Sign-In (after enabling in Firebase)

---

## 🔧 Troubleshooting:

**If you get CORS errors:**
- Make sure domain is added to Firebase authorized domains

**If checkout doesn't work:**
- Verify Stripe secret key is set (already done ✅)
- Check browser console for errors

**If images don't load:**
- Check file paths are correct
- Ensure images are in the same directory structure

---

Ready to create the deployment package?
