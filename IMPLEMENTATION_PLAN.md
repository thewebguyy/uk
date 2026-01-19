# COMPREHENSIVE E-COMMERCE WEBSITE OPTIMIZATION PLAN

## PROJECT OVERVIEW
Refine and optimize Creative Merch UK's e-commerce website to create a best-in-class UK e-commerce experience.

---

## 📅 IMPLEMENTATION PRIORITY FRAMEWORK

### Phase 1: Critical Fixes (Week 1)
- [ ] **Navigation Standardization**: Ensure identical structure, styling, and functionality sitewide.
- [ ] **Shop Menu Scroll**: Fix dropdown to be scrollable when products exceed viewport height.
- [ ] **Banner Consistency**: Standardize announcement banner across all pages.
- [ ] **Cart Offcanvas**: Fix spacing, add scrollbar, ensure delete icon accessibility.
- [ ] **Product Detail Layout**: Restructure to side-by-side (Image Left, Details Right).
- [ ] **Send Items In Page**: Fix header alignment and layout (side-by-side).

### Phase 2: Essential Features (Week 2-3)
- [ ] **Homepage "Shop Our Collection"**: Connect to 4 specific products, remove prices, add hover effects.
- [ ] **Homepage "Design Studio"**: Remove "START YOUR PROJECT" button, side-by-side layout.
- [ ] **Homepage Reviews/Services**: Reorganize Premium Services and Reviews into a single row/grid.
- [ ] **Customer Account Page**: Create `account.html` (Dashboard, Orders, Profile, Addresses, Wallet).
- [ ] **Event Setup Page**: Create `event-setup.html`.
- [ ] **Sign In Page**: Remove title, add Google OAuth, layout changes.
- [ ] **Payment Integration**: Stripe, Apple Pay, Google Pay options.

### Phase 3: Optimization (Week 4-5)
- [ ] **Reviews/Gallery Page**: Create `reviews-gallery.html` with masonry grid and upload form.
- [ ] **Design Studio Page**: Rename sections, remove Logo Design, specific layout fixes.
- [ ] **Premium Services Page**: Fix dropdown menu debugging.
- [ ] **Trust Signals**: Add "Secure Checkout" badge, payment icons.
- [ ] **Mobile Optimization**: Bottom nav, gallery swipe, touch targets.

### Phase 4: Advanced Features (Week 6-8)
- [ ] **Personalization**: Recently viewed, recommendations.
- [ ] **Loyalty Program**: Points system UI.
- [ ] **Email Marketing**: Popups and flows.
- [ ] **SEO**: Meta tags, schema markup, sitemap.

---

## 🛠️ DETAILED TECHNICAL SPECIFICATIONS

### 1. Navigation & Header
- **Structure**: Top Bar (Logo, Search, Region, Icons) + Main Nav (Shop, Studio, Services).
- **Mega Menu**:
  - `max-height: 80vh`
  - `overflow-y: auto`
  - Consistent hover/click behavior.
- **Files to Update**: `index.html`, `shop.html`, `product.html`, `designstudio.html`, `designservice.html`, `premiumservices.html`, `senditems.html`, `contact.html`, `checkout.html`, `login.html`, `account.html`.

### 2. Shop Page & Product Details (`product.html`)
- **Layout**: CSS Grid `1fr 1fr`.
- **Customization Panel**:
  - Color Swatches.
  - Quantity Input (1-99).
  - Size Selector (XS-3XL).
  - Print Location (Radio: Front/Back/Both).
  - Design Position Visual Selector.
  - Artwork Upload.
- **Dynamic Pricing**: Javascript to update price based on Print Location.

### 3. Design Studio (`designstudio.html`)
- **Hero**: "Professional Design Services".
- **Sections**: "Book a Designer" (was Custom Design), Remove Logo Design.
- **Resources**: 3 cards in one row.

### 4. New Pages
- `reviews-gallery.html`: Masonry layout, filterable.
- `event-setup.html`: Venue decoration showcase, booking form.
- `customer-account.html`: Comprehensive dashboard (sidebar nav + content area).
- `privacy-policy.html`, `terms-conditions.html`, `faq.html`.

---

## 📝 FILE STRUCTURE UPDATES

```
uk/
├── index.html
├── shop.html
├── product.html (Updated layout)
├── customer-account.html (NEW)
├── reviews-gallery.html (NEW)
├── event-setup.html (NEW)
├── privacy-policy.html (NEW)
├── terms-conditions.html (NEW | Existing)
├── faq.html (NEW | Existing)
├── css/
│   └── style.css (Updated)
├── js/
│   ├── app.js
│   ├── cart.js
│   └── product-customizer.js (NEW)
└── ...
```

---

## ✅ PROGRESS TRACKING

### Session 1 Goals
1.  Establish `IMPLEMENTATION_PLAN.md`.
2.  Fix Global Header & Banner (CSS & HTML source of truth).
3.  Fix Shop Mega Menu Scrolling.
4.  Standardize Header across `index.html`, `shop.html`, `product.html`.
