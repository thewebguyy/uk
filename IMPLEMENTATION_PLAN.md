# Creative Merch UK - Website Refactoring Implementation Plan

## Overview
This document outlines the complete implementation plan for refactoring and enhancing the Creative Merch UK website based on the detailed requirements provided.

---

## 1. Updated File Structure

```
uk/
├── index.html                    # Homepage (updated)
├── shop.html                     # Shop page (existing)
├── product.html                  # Product detail page (updated with customization options)
├── designstudio.html             # Design Studio page (updated)
├── designservice.html            # Design Service page (existing)
├── premiumservices.html          # Premium Services page (fix dropdown)
├── senditems.html                # Send Items page (fix header & layout)
├── contact.html                  # Contact page (update layout)
├── account.html                  # Sign In/Sign Up page (update with Google Auth, payments)
├── checkout.html                 # Checkout page (existing)
├── installation.html             # Installation page (existing)
├── subscriptions.html            # Subscriptions page (existing)
│
├── # NEW PAGES
├── reviews.html                  # Reviews/Gallery page (NEW)
├── event-setup.html              # Event Set Up page (NEW)
├── workshop.html                 # Workshop page (NEW)
├── faq.html                      # FAQ page (NEW)
├── customer-account.html         # Customer Account Dashboard (NEW)
├── privacy-policy.html           # Privacy Policy page (NEW)
├── terms-conditions.html         # Terms & Conditions page (NEW)
│
├── # TEMPLATES/COMPONENTS
├── components/
│   └── header.html               # Reusable header template reference
│   └── footer.html               # Reusable footer template reference
│
├── style.css                     # Main stylesheet (updated)
├── js/
│   ├── cart.js                   # Cart functionality (update for scrolling fix)
│   ├── app.js                    # Main app JS
│   ├── product-customizer.js     # NEW: Product customization logic
│   └── components.js             # NEW: Header/Footer injection
└── ...
```

---

## 2. Detailed Changes Per Page/Section

### 2.1 Global Changes

#### A. Header Component (All Pages)
- **Create unified header** that can be included on all pages
- **Fix cart dropdown scrolling**: Add `max-height` and `overflow-y: auto` to offcanvas body
- **Menu synchronization**: Ensure all pages have identical navigation structure
- **Shop menu hover**: Already implemented with CSS hover, verify scrolling works for long lists

#### B. Footer Component (All Pages)
- **Add new links**:
  - Privacy Policy → `/privacy-policy.html`
  - Terms & Conditions → `/terms-conditions.html`
  - FAQ → `/faq.html`
- **Standardize footer across all pages**

#### C. Banner Standardization
- Use consistent announcement banner across all pages
- Remove page-specific variations (except where explicitly noted)

#### D. Layout Principles
- Images side-by-side with text on desktop (CSS Grid/Flexbox)
- Stack responsively on mobile
- Avoid images underneath text

---

### 2.2 Homepage (index.html)

**Changes Required:**
1. ✅ Menu hover on "Shop" - Already implemented
2. ✅ Banner standardized - Already consistent
3. **"Shop Our Collection" section**:
   - Connect to products.json or Firebase (already using Firebase)
   - Limit to 4 products
   - Remove prices (keep only images and titles)
4. **"Design Studio" section**:
   - Remove "Start Your Design" button
   - Position image on side of text (already using grid layout)
5. **Remove "Premium Services" section** from homepage entirely
6. **"What Our Clients Say" section**:
   - Add "Read All Reviews" button linking to `/reviews.html`
7. **Footer**: Add Privacy Policy, Terms, FAQ links

---

### 2.3 Shop/Product Page (product.html)

**Major Changes:**
1. **Move product details to side of image** (already implemented with CSS Grid)
2. **Add customization options**:
   - Color selector (dropdown/swatches)
   - Quantity input (numeric stepper, min 1)
   - Size selector (dropdown: S, M, L, XL)
   - Print side: Radio buttons for "Front and Back", "Front Only", "Back Only"
   - Position: Radio buttons for "Left", "Right", "Centre", "Full"
   - Artwork: "Upload Artwork" button + "Take Me to Design Studio" link
3. **Dynamic price updates** based on selections (e.g., Front+Back adds £5)
4. **Keep Firebase product data integration**

---

### 2.4 Design Studio Page (designstudio.html)

**Changes Required:**
1. **Update banner** to new design (e.g., "Professional Design Services")
2. **Change "Custom Design" section to "Book Someone to Design Artwork"**:
   - Update text
   - Add booking form (Netlify Forms compatible)
3. **Ensure images are side-by-side with text**
4. **Remove "Logo Design" section entirely**
5. **Mock Up Generation section**: Add placeholder note for future integration
6. **Design Resources section**: Arrange items horizontally (single row)

---

### 2.5 Premium Services Page (premiumservices.html)

**Changes Required:**
1. **Fix dropdown menu**: Ensure smooth expand/collapse with JS toggle
2. **Make items accessible**

---

### 2.6 Send Items In Page (senditems.html)

**Changes Required:**
1. **Fix entire header**: Replace with global header component
2. **Fix layout**: Arrange process step boxes side by side (2-column grid)

---

### 2.7 Contact Page (contact.html)

**Changes Required:**
1. **Move contact information to side** (already implemented with side-by-side layout)
2. Ensure consistency with global header/footer

---

### 2.8 Sign In Page (account.html)

**Changes Required:**
1. **Remove page title** (h1 "Welcome to Customise Me UK")
2. **Add "Sign In with Google"** option (Firebase Auth or Netlify Identity)
3. **Add payment method options**: Card, Apple Pay, or Stripe integration note

---

### 2.9 New Pages to Create

#### A. Reviews/Gallery Page (reviews.html)
- Gallery of customer work/reviews
- Grid layout for images
- Testimonials section
- Global header/footer

#### B. Event Set Up Page (event-setup.html)
- Event services description
- Contact form for event inquiries
- Image gallery of past events
- Global header/footer

#### C. Workshop Page (workshop.html)
- Workshop descriptions
- Schedule/calendar placeholder
- Registration form
- Global header/footer

#### D. FAQ Page (faq.html)
- Accordion-style Q&A
- Categories for different topics
- Global header/footer

#### E. Customer Account Page (customer-account.html)
- Order history section
- Profile editing
- Saved payments placeholder
- Logout button
- Global header/footer

#### F. Privacy Policy Page (privacy-policy.html)
- Standard privacy policy content
- Global header/footer

#### G. Terms & Conditions Page (terms-conditions.html)
- Standard T&C content
- Global header/footer

---

## 3. Global Styles Updates (style.css)

### New CSS Rules Needed:
1. **Cart offcanvas scroll fix**
2. **Side-by-side layout utilities**
3. **Product customization form styles**
4. **FAQ accordion styles**
5. **Gallery grid styles**
6. **Form improvements**

---

## 4. JavaScript Updates

### cart.js Updates:
- Ensure offcanvas scrolling works properly

### New: product-customizer.js:
- Handle color, size, print side, position selections
- Calculate dynamic pricing
- Handle artwork upload
- Store customization in cart

### New: components.js:
- Inject header/footer on all pages (optional - can use server-side includes or manual copy)

---

## 5. Testing Notes

### Functionality Tests:
1. **Menu hover** - Verify all dropdowns work on hover (desktop) and click (mobile)
2. **Cart scrolling** - Test with many items in cart
3. **Product customization** - Test all options and price updates
4. **Forms** - Test all forms submit correctly (Netlify Forms)
5. **Authentication** - Test Google Sign-In (if implemented)
6. **Responsive design** - Test all breakpoints (mobile, tablet, desktop)

### Cross-Browser Testing:
- Chrome
- Firefox
- Safari
- Edge

### Accessibility Testing:
- Keyboard navigation
- Screen reader compatibility
- ARIA labels
- Color contrast

---

## 6. Implementation Priority Order

### Phase 1: Critical Fixes
1. Fix cart dropdown scrolling
2. Fix senditems.html header
3. Standardize header/footer across all pages

### Phase 2: Homepage Updates
1. Remove Premium Services section
2. Update Shop Our Collection (remove prices)
3. Add "Read All Reviews" button

### Phase 3: Product Page Enhancement
1. Add customization options
2. Implement dynamic pricing

### Phase 4: Design Studio Updates
1. Remove Logo Design section
2. Update Custom Design to booking form
3. Fix layout for side-by-side

### Phase 5: New Pages
1. Create FAQ page
2. Create Reviews/Gallery page
3. Create Privacy Policy & Terms
4. Create Event Setup page
5. Create Workshop page
6. Create Customer Account page

### Phase 6: Sign-In Enhancements
1. Add Google Sign-In
2. Add payment method placeholders

---

## 7. External Services Notes

### Firebase (Already Configured):
- Products stored in Firestore
- Authentication available

### Netlify Forms:
- Add `netlify` attribute to forms
- Add hidden `form-name` input

### Stripe (For Payment):
- Requires Stripe.js
- Needs backend for secure payment processing
- Suggest using Netlify Functions

### Google OAuth:
- Can use Firebase Auth Google provider
- Already have Firebase configured

---

## 8. File Dependencies

Files that need the global header:
- All HTML files

Files that need global footer:
- All HTML files

Files that need cart.js:
- All pages with shopping functionality

---

*Implementation Start Date: January 16, 2026*
*Estimated Completion: Phased rollout*
