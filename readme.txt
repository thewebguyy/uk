# CMUK DIGITAL SYSTEM

## Architecture Overview

A brutalist, monochrome e-commerce platform transformed from a standard shop into a sophisticated Digital System with real-time 3D product configuration.

### Core Components

```
CMUK Digital System
├── CSS Architecture
│   ├── system.css - Brutalist design system with Binary Plus colors
│   ├── normalize.css - Browser consistency
│   └── vendor.css - Legacy support (minimal usage)
│
├── JavaScript Engines
│   ├── catalog-engine.js - JSON-driven product management
│   ├── studio-3d.js - Three.js 3D visualization
│   ├── system-ui.js - UI utilities and System Ticker
│   └── app.js - Main application controller
│
├── Data Layer
│   └── products.json - JSON catalog (edit to add/modify products)
│
└── HTML Structure
    └── index-system.html - Main brutalist interface
```

## Binary Plus Color Strategy

```css
--system-black: #000000   /* Headers, borders, heavy typography */
--system-white: #FFFFFF   /* Main background, void space */
--system-green: #00FF00   /* Action color, status, cart badges */
--system-gray: #94A3B8    /* Metadata, labels, ghost text */
```

## Typography System

```css
/* Industrial Fonts */
--font-industrial: 'Inter'        /* Headings (900 weight) */
--font-technical: 'Courier New'   /* Metadata, labels */
```

**Font Applications:**
- Headings: Inter Black (900) with tight kerning (-0.05em)
- Body: Inter Regular (400)
- Technical Text: Courier New for metadata, SKUs, timestamps
- Logo: Inter Black with extreme tightening (-0.1em)

## Setup Instructions

### 1. File Structure

Place files in the following structure:

```
project-root/
├── index-system.html
├── css/
│   ├── normalize.css
│   ├── system.css
│   └── vendor.css (optional legacy)
├── js/
│   ├── catalog-engine.js
│   ├── studio-3d.js
│   ├── system-ui.js
│   └── app.js
├── data/
│   └── products.json
├── images/
│   └── products/
│       └── [product images]
└── models/
    └── [3D model files .glb/.gltf]
```

### 2. Dependencies

The system uses CDN-hosted dependencies (no npm install required):

```html
<!-- Three.js for 3D Studio -->
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/controls/OrbitControls.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/GLTFLoader.js"></script>

<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
```

### 3. Adding Products (JSON-Driven)

Edit `/data/products.json` to add or modify products:

```json
{
  "id": "CMUK-006",
  "name": "Your Product Name",
  "slug": "your-product-name",
  "description": "Product description",
  "price": 299.00,
  "currency": "USD",
  "category": "Category Name",
  "tags": ["tag1", "tag2"],
  "images": ["/images/products/product-001.jpg"],
  "model3d": {
    "path": "/models/product-001.glb",
    "format": "glb"
  },
  "customizable": {
    "enabled": true,
    "parts": {
      "body": {
        "label": "Body Color",
        "type": "color",
        "options": [
          { "name": "System Black", "value": "#000000", "code": "BLK" }
        ],
        "default": "#000000"
      }
    }
  },
  "stock": 50,
  "sku": "PRD-001"
}
```

**No code changes required** - just edit the JSON file.

### 4. 3D Model Requirements

**Supported Formats:** GLTF (.gltf) or GLB (.glb)

**Model Preparation:**
- Use Blender or similar 3D software
- Export as GLTF 2.0 or GLB
- Name mesh objects for customization (e.g., "body", "collar", "zippers")
- Keep polygon count reasonable (< 100k for web)
- Include proper UV mapping for textures
- Test lighting in Blender with realistic materials

**Naming Convention for Customizable Parts:**
```
Object names in 3D software MUST match JSON keys:
- "body" → customizable.parts.body
- "collar" → customizable.parts.collar
- "zippers" → customizable.parts.zippers
```

## Feature Breakdown

### 1. System Status Ticker

Located at top of page, shows:
- System status (ONLINE, LOADING, ERROR)
- Product loading notifications
- Cart updates
- 3D model status
- Custom messages

**API:**
```javascript
ticker.addMessage('YOUR MESSAGE', { type: 'info', priority: 'normal' });
ticker.updateStatus('online', 'CUSTOM MESSAGE');
ticker.showCartUpdate(itemCount);
ticker.show3DStatus('loaded');
```

### 2. JSON Product Catalog

**Features:**
- Automatic catalog loading from JSON
- Category filtering
- Search functionality
- Stock management
- Caching (1-hour localStorage cache)

**API:**
```javascript
catalog.getProducts({ category: 'Outerwear' });
catalog.getProductById('CMUK-001');
catalog.search('jacket');
catalog.getCategories();
```

### 3. 3D Studio

**Features:**
- Real-time GLTF/GLB model loading
- Orbit controls (rotate, zoom, pan)
- Material customization (color, metalness, roughness)
- Shadow rendering
- Professional lighting setup
- Screenshot capture
- Auto-rotation option

**API:**
```javascript
studio.setPartColor('body', '#000000');
studio.setPartMaterial('zippers', { metalness: 0.9, roughness: 0.1 });
studio.resetCamera();
studio.toggleAutoRotate();
studio.takeScreenshot();
```

### 4. Shopping Cart

**Features:**
- localStorage persistence
- Customization tracking
- Real-time count updates
- Ticker notifications

## Design System Guidelines

### Grid Architecture

All containers use `1px solid black` borders for blueprint aesthetic:

```css
.system-border          /* All sides */
.system-border-top      /* Top only */
.system-border-bottom   /* Bottom only */
.system-border-left     /* Left only */
.system-border-right    /* Right only */
```

### NO Rounded Corners, NO Shadows

```css
* {
  border-radius: 0 !important;
  box-shadow: none !important;
}
```

**Exception:** 3D Studio viewport uses realistic shadows for depth.

### Button Styles

```html
<button class="btn">Default (white bg, black border)</button>
<button class="btn btn-primary">Primary (black bg, white text)</button>
<button class="btn btn-action">Action (green bg, black text)</button>
```

### Typography Classes

```html
<h1>Heavy heading (Inter Black, -0.05em kerning)</h1>
<p class="system-technical">Technical text (Courier, gray)</p>
<p class="system-label">Small label (Courier, uppercase)</p>
<p class="system-ghost">Placeholder text (gray, 50% opacity)</p>
```

## Testing Guide

### 1. Browser Compatibility Testing

**Required Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Test Points:**
- 3D model loading and rendering
- OrbitControls responsiveness
- CSS Grid layout
- localStorage functionality
- Web fonts loading

### 2. 3D Feature Testing

**Without WebGL Support:**
```javascript
// Fallback already implemented
if (!window.WebGLRenderingContext) {
  // Shows error message
  // Disables 3D features
  // Catalog still functional
}
```

**Test Cases:**
- Model loading progress
- Material customization
- Color updates in real-time
- Camera reset functionality
- Screenshot generation
- Auto-rotation toggle

### 3. Responsive Testing

**Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 991px
- Desktop: 992px+

**Mobile Considerations:**
- 3D Studio may need reduced quality
- Touch controls for OrbitControls
- Simplified ticker (smaller font)
- Stacked layout for configuration panel

### 4. Performance Testing

**Metrics:**
- Initial page load: < 3s
- 3D model load: < 5s (depends on model size)
- Catalog render: < 1s for 50 products
- Interaction latency: < 16ms (60fps)

**Optimization:**
- Use GLB instead of GLTF (binary format)
- Compress textures (< 2MB per model)
- Lazy-load product images
- Enable catalog caching

### 5. Accessibility Testing

**WCAG 2.1 AA Compliance:**
- Color contrast: ✓ (Black on White = 21:1)
- Green on Black: ✓ (System Green passes AA)
- Keyboard navigation: ✓ (focus-visible styling)
- Screen readers: Form labels, ARIA attributes
- Focus indicators: 2px green outline

**Test with:**
- NVDA (Windows)
- VoiceOver (macOS)
- Keyboard-only navigation

### 6. Edge Cases

**No 3D Model:**
- ✓ Shows placeholder message
- ✓ Product info still displays
- ✓ Cart functionality works

**JSON Load Failure:**
- ✓ Shows error in ticker
- ✓ Displays user-friendly message
- ✓ Suggests page refresh

**Slow 3D Model Load:**
- ✓ Progress indicator in ticker
- ✓ Loading message in studio
- ✓ Timeout after 30s with error

**Browser Storage Disabled:**
- ✓ Cart still works (session only)
- ✓ Catalog fetched fresh each time
- ✓ Warning logged to console

## Customization Examples

### Adding a New Color Option

In `products.json`:

```json
{
  "customizable": {
    "parts": {
      "body": {
        "options": [
          {
            "name": "Tactical Red",
            "value": "#8B0000",
            "code": "RED"
          }
        ]
      }
    }
  }
}
```

### Adding a New Material Option

```json
{
  "customizable": {
    "parts": {
      "hardware": {
        "label": "Hardware Finish",
        "type": "material",
        "options": [
          {
            "name": "Chrome",
            "value": "chrome",
            "metalness": 1.0,
            "roughness": 0.1
          }
        ]
      }
    }
  }
}
```

### Creating Custom Ticker Messages

```javascript
// In app.js or custom script
ticker.addMessage('NEW PRODUCT LAUNCH', {
  type: 'announcement',
  priority: 'high'
});
```

## Deployment Checklist

- [ ] All product images uploaded to `/images/products/`
- [ ] All 3D models uploaded to `/models/`
- [ ] `products.json` validated (use JSONLint)
- [ ] Fonts loading correctly (Inter from Google Fonts)
- [ ] Three.js CDN accessible
- [ ] Test on all major browsers
- [ ] Verify HTTPS (required for some WebGL features)
- [ ] Set up CORS if API/models on different domain
- [ ] Configure cache headers for assets
- [ ] Test with disabled JavaScript (graceful degradation)
- [ ] Verify localStorage quota (5-10MB typically)
- [ ] Check mobile performance (reduce model quality if needed)

## Troubleshooting

### 3D Models Not Loading

**Causes:**
1. Wrong file path in JSON
2. CORS policy blocking model fetch
3. Invalid GLB/GLTF file

**Solutions:**
```javascript
// Check console for errors
// Verify path: console.log(product.model3d.path)
// Test model in online GLTF viewer
// Serve from same domain or configure CORS
```

### Catalog Not Rendering

**Causes:**
1. JSON syntax error
2. products.json not accessible
3. JavaScript errors

**Solutions:**
- Validate JSON at jsonlint.com
- Check browser console for errors
- Verify `/data/products.json` path
- Check network tab for 404 errors

### Customization Not Working

**Causes:**
1. Mesh names don't match JSON keys
2. Materials not properly set in 3D model
3. JavaScript errors

**Solutions:**
```javascript
// Log customizable parts
console.log(studio.getCustomizableParts());

// Check if part exists
studio.customizableObjects.has('body'); // Should be true

// Manually test
studio.setPartColor('body', '#FF0000');
```

## License & Credits

**Original Template:** Kaira - Bootstrap 5 Fashion Store (TemplatesJungle)
**Transformation:** CMUK Digital System Architecture
**3D Engine:** Three.js (MIT License)
**Fonts:** Inter (OFL), Courier New (System)

---

## Support

For issues or questions:
1. Check browser console for errors
2. Verify JSON structure in products.json
3. Test 3D models in standalone viewer
4. Review this README's troubleshooting section

**System Status:** OPERATIONAL
**Last Updated:** 2026-01-01
**Version:** 1.0.0