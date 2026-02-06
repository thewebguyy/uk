/**
 * CMUK DIGITAL SYSTEM - MAIN APPLICATION
 * Orchestrates catalog, 3D studio, and UI systems
 */

(function() {
  'use strict';

  // Application state
  const App = {
    catalog: null,
    studio: null,
    ticker: null,
    cart: [],
    currentProduct: null,
    customization: {},

    /**
     * Initialize application
     */
    async init() {
      console.log('Initializing CMUK Digital System...');

      // Initialize system ticker
      this.initTicker();

      // Initialize catalog
      await this.initCatalog();

      // Setup event listeners
      this.setupEventListeners();

      // Start system clock
      this.startSystemClock();

      // Initialize cart from localStorage
      this.loadCart();

      console.log('CMUK Digital System initialized');
    },

    /**
     * Initialize system ticker
     */
    initTicker() {
      this.ticker = new SystemTicker({
        messages: [
          { text: 'CMUK DIGITAL SYSTEM ONLINE', type: 'status' },
          { text: 'INITIALIZING CATALOG ENGINE', type: 'info' },
          { text: 'LOADING 3D STUDIO COMPONENTS', type: 'info' },
          { text: 'SECURE CONNECTION ESTABLISHED', type: 'security' }
        ]
      });
    },

    /**
     * Initialize catalog
     */
    async initCatalog() {
      this.catalog = new CatalogEngine({
        dataSource: '/data/products.json'
      });

      try {
        await this.catalog.init();
        this.ticker.addMessage('CATALOG LOADED SUCCESSFULLY');
        this.renderProducts();
        this.renderCategories();
        this.updateProductCount();
      } catch (error) {
        console.error('Catalog initialization failed:', error);
        this.ticker.updateStatus('error', 'CATALOG LOAD FAILED');
        this.showError('Failed to load catalog. Please refresh the page.');
      }
    },

    /**
     * Render products in grid
     */
    renderProducts(filters = {}) {
      const products = this.catalog.getProducts(filters);
      const grid = document.getElementById('product-grid');

      if (!grid) return;

      if (products.length === 0) {
        grid.innerHTML = `
          <div class="col-12 text-center py-5">
            <p class="system-technical system-gray">NO PRODUCTS FOUND</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = products.map(product => this.createProductCard(product)).join('');

      // Add click handlers
      grid.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
          const productId = card.dataset.productId;
          this.openStudio(productId);
        });
      });
    },

    /**
     * Create product card HTML
     */
    createProductCard(product) {
      const has3D = product.model3d ? 'HAS_3D_CONFIG' : 'STANDARD';
      const stockStatus = product.stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';

      return `
        <div class="col-md-6 col-lg-4 col-xl-3">
          <div class="product-card system-border system-transition-allowed" 
               data-product-id="${product.id}" 
               style="cursor: pointer;">
            
            <!-- Product Image -->
            <div class="product-image-container system-border-bottom" style="aspect-ratio: 1; overflow: hidden; background: #f5f5f5;">
              ${product.images && product.images[0] 
                ? `<img src="${product.images[0]}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">`
                : `<div class="d-flex align-items-center justify-content-center h-100 system-gray">NO IMAGE</div>`
              }
              
              <!-- 3D Badge -->
              ${product.model3d 
                ? '<div style="position: absolute; top: 10px; right: 10px;" class="system-ready small">3D</div>' 
                : ''
              }
            </div>

            <!-- Product Info -->
            <div class="p-3">
              <div class="system-label mb-2">${product.category.toUpperCase()}</div>
              <h5 class="mb-2" style="font-size: 1rem;">${product.name}</h5>
              <div class="d-flex justify-content-between align-items-center">
                <div class="h6 mb-0">${SystemUI.formatPrice(product.price, product.currency)}</div>
                <div class="system-technical small ${product.stock > 0 ? 'system-action' : 'system-gray'}">
                  ${stockStatus}
                </div>
              </div>
              <div class="system-technical system-gray small mt-2">
                ${product.sku}
              </div>
            </div>

          </div>
        </div>
      `;
    },

    /**
     * Render category filters
     */
    renderCategories() {
      const categories = this.catalog.getCategoriesWithCount();
      const filterContainer = document.getElementById('category-filter');

      if (!filterContainer) return;

      const allButton = `
        <button class="btn btn-sm active" data-category="all">
          ALL (${this.catalog.products.length})
        </button>
      `;

      const categoryButtons = categories.map(cat => `
        <button class="btn btn-sm" data-category="${cat.slug}">
          ${cat.name.toUpperCase()} (${cat.count})
        </button>
      `).join('');

      filterContainer.innerHTML = allButton + categoryButtons;

      // Add click handlers
      filterContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          // Update active state
          filterContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          // Filter products
          const category = btn.dataset.category;
          if (category === 'all') {
            this.renderProducts();
          } else {
            this.renderProducts({ category: this.getCategoryNameFromSlug(category) });
          }
        });
      });
    },

    /**
     * Get category name from slug
     */
    getCategoryNameFromSlug(slug) {
      const categories = this.catalog.getCategoriesWithCount();
      const cat = categories.find(c => c.slug === slug);
      return cat ? cat.name : slug;
    },

    /**
     * Open 3D Studio for product
     */
    openStudio(productId) {
      const product = this.catalog.getProductById(productId);

      if (!product) {
        console.error('Product not found:', productId);
        return;
      }

      this.currentProduct = product;
      this.customization = {};

      // Show studio section
      const studioSection = document.getElementById('studio-section');
      if (studioSection) {
        studioSection.style.display = 'block';
        studioSection.scrollIntoView({ behavior: 'smooth' });
      }

      // Update product info
      this.updateStudioProductInfo(product);

      // Initialize or update 3D studio
      if (product.model3d) {
        this.init3DStudio(product);
        this.ticker.showProductLoaded(product.name);
      } else {
        this.show3DPlaceholder();
      }

      // Render customization controls
      this.renderCustomizationControls(product);
    },

    /**
     * Initialize 3D Studio
     */
    init3DStudio(product) {
      const container = document.getElementById('studio-3d-container');

      if (!container) {
        console.error('3D container not found');
        return;
      }

      // Destroy existing studio if any
      if (this.studio) {
        this.studio.destroy();
      }

      // Create new studio instance
      this.studio = new Studio3D('studio-3d-container', {
        modelPath: product.model3d.path,
        enableShadows: true,
        autoRotate: false,
        showGrid: false
      });

      // Listen to studio events
      container.addEventListener('model:loading:start', () => {
        this.ticker.show3DStatus('loading', 0);
        document.getElementById('studio-status').textContent = 'LOADING 3D MODEL...';
      });

      container.addEventListener('model:loading:progress', (e) => {
        this.ticker.show3DStatus('loading', e.detail.progress);
      });

      container.addEventListener('model:loaded', (e) => {
        this.ticker.show3DStatus('loaded');
        document.getElementById('studio-status').textContent = '3D MODEL READY';
        console.log('Customizable parts:', this.studio.getCustomizableParts());
      });

      container.addEventListener('model:error', (e) => {
        this.ticker.show3DStatus('error');
        document.getElementById('studio-status').textContent = '3D MODEL ERROR';
        this.showError('Failed to load 3D model');
      });
    },

    /**
     * Show 3D placeholder
     */
    show3DPlaceholder() {
      const container = document.getElementById('studio-3d-container');
      if (container) {
        container.innerHTML = `
          <div class="d-flex align-items-center justify-content-center h-100">
            <div class="text-center">
              <h3 class="mb-3">3D CONFIGURATION NOT AVAILABLE</h3>
              <p class="system-technical system-gray">THIS PRODUCT DOES NOT SUPPORT 3D VISUALIZATION</p>
            </div>
          </div>
        `;
      }
    },

    /**
     * Update studio product information
     */
    updateStudioProductInfo(product) {
      const elements = {
        name: document.getElementById('studio-product-name'),
        code: document.getElementById('studio-product-code'),
        price: document.getElementById('studio-product-price'),
        description: document.getElementById('studio-product-description')
      };

      if (elements.name) elements.name.textContent = product.name;
      if (elements.code) elements.code.textContent = product.sku;
      if (elements.price) elements.price.textContent = SystemUI.formatPrice(product.price, product.currency);
      if (elements.description) elements.description.textContent = product.description;
    },

    /**
     * Render customization controls
     */
    renderCustomizationControls(product) {
      const container = document.getElementById('customization-controls');

      if (!container) return;

      if (!product.customizable || !product.customizable.enabled) {
        container.innerHTML = '<p class="system-technical system-gray small">NO CUSTOMIZATION AVAILABLE</p>';
        return;
      }

      const parts = product.customizable.parts;
      const controlsHTML = Object.keys(parts).map(partKey => {
        const part = parts[partKey];
        return this.createCustomizationControl(partKey, part);
      }).join('');

      container.innerHTML = controlsHTML;

      // Add change handlers
      container.querySelectorAll('select, input').forEach(input => {
        input.addEventListener('change', (e) => {
          this.handleCustomizationChange(e.target);
        });
      });
    },

    /**
     * Create customization control HTML
     */
    createCustomizationControl(partKey, part) {
      if (part.type === 'color') {
        return `
          <div class="mb-4">
            <label class="system-label mb-2">${part.label.toUpperCase()}</label>
            <select class="form-control system-input" data-part="${partKey}" data-type="color">
              ${part.options.map(option => `
                <option value="${option.value}" ${option.value === part.default ? 'selected' : ''}>
                  ${option.name.toUpperCase()} [${option.code}]
                </option>
              `).join('')}
            </select>
          </div>
        `;
      } else if (part.type === 'material') {
        return `
          <div class="mb-4">
            <label class="system-label mb-2">${part.label.toUpperCase()}</label>
            <select class="form-control system-input" data-part="${partKey}" data-type="material">
              ${part.options.map(option => `
                <option value="${option.value}" ${option.value === part.default ? 'selected' : ''}>
                  ${option.name.toUpperCase()}
                </option>
              `).join('')}
            </select>
          </div>
        `;
      }

      return '';
    },

    /**
     * Handle customization change
     */
    handleCustomizationChange(input) {
      const partKey = input.dataset.part;
      const type = input.dataset.type;
      const value = input.value;

      // Store customization
      this.customization[partKey] = value;

      // Update 3D model if studio is active
      if (this.studio && this.currentProduct.model3d) {
        if (type === 'color') {
          this.studio.setPartColor(partKey, value);
        } else if (type === 'material') {
          const part = this.currentProduct.customizable.parts[partKey];
          const option = part.options.find(opt => opt.value === value);
          if (option) {
            this.studio.setPartMaterial(partKey, {
              metalness: option.metalness || 0,
              roughness: option.roughness || 1
            });
          }
        }
      }

      this.ticker.addMessage(`CONFIGURATION UPDATED: ${partKey.toUpperCase()}`);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
      // Close studio button
      const closeStudioBtn = document.getElementById('btn-close-studio');
      if (closeStudioBtn) {
        closeStudioBtn.addEventListener('click', () => {
          this.closeStudio();
        });
      }

      // Reset camera
      const resetCameraBtn = document.getElementById('btn-reset-camera');
      if (resetCameraBtn) {
        resetCameraBtn.addEventListener('click', () => {
          if (this.studio) {
            this.studio.resetCamera();
          }
        });
      }

      // Toggle auto-rotate
      const toggleRotateBtn = document.getElementById('btn-toggle-rotate');
      if (toggleRotateBtn) {
        toggleRotateBtn.addEventListener('click', () => {
          if (this.studio) {
            this.studio.toggleAutoRotate();
          }
        });
      }

      // Screenshot
      const screenshotBtn = document.getElementById('btn-screenshot');
      if (screenshotBtn) {
        screenshotBtn.addEventListener('click', () => {
          if (this.studio) {
            const dataUrl = this.studio.takeScreenshot();
            this.downloadScreenshot(dataUrl);
          }
        });
      }

      // Add to cart
      const addToCartBtn = document.getElementById('btn-add-to-cart');
      if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
          this.addToCart();
        });
      }
    },

    /**
     * Close 3D Studio
     */
    closeStudio() {
      const studioSection = document.getElementById('studio-section');
      if (studioSection) {
        studioSection.style.display = 'none';
      }

      if (this.studio) {
        this.studio.destroy();
        this.studio = null;
      }

      this.currentProduct = null;
      this.customization = {};

      // Scroll to catalog
      document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    },

    /**
     * Add product to cart
     */
    addToCart() {
      if (!this.currentProduct) return;

      const cartItem = {
        id: Date.now(),
        product: this.currentProduct,
        customization: { ...this.customization },
        quantity: 1,
        timestamp: new Date().toISOString()
      };

      this.cart.push(cartItem);
      this.saveCart();
      this.updateCartCount();
      this.ticker.showCartUpdate(this.cart.length);

      SystemUI.showNotification(`${this.currentProduct.name} added to cart`, 'success');
    },

    /**
     * Update cart count display
     */
    updateCartCount() {
      const countElement = document.getElementById('cart-count');
      if (countElement) {
        countElement.textContent = this.cart.length;
      }
    },

    /**
     * Save cart to localStorage
     */
    saveCart() {
      try {
        localStorage.setItem('cmuk_cart', JSON.stringify(this.cart));
      } catch (error) {
        console.warn('Failed to save cart:', error);
      }
    },

    /**
     * Load cart from localStorage
     */
    loadCart() {
      try {
        const saved = localStorage.getItem('cmuk_cart');
        if (saved) {
          this.cart = JSON.parse(saved);
          this.updateCartCount();
        }
      } catch (error) {
        console.warn('Failed to load cart:', error);
        this.cart = [];
      }
    },

    /**
     * Download screenshot
     */
    downloadScreenshot(dataUrl) {
      const link = document.createElement('a');
      link.download = `cmuk-${this.currentProduct.sku}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      SystemUI.showNotification('Screenshot captured', 'success');
    },

    /**
     * Update product count display
     */
    updateProductCount() {
      const countElement = document.getElementById('product-count');
      if (countElement && this.catalog) {
        countElement.textContent = this.catalog.products.length;
      }
    },

    /**
     * Start system clock
     */
    startSystemClock() {
      const updateTime = () => {
        const timestamp = SystemUI.formatTimestamp();
        
        const timestampElement = document.getElementById('system-timestamp');
        if (timestampElement) {
          timestampElement.textContent = timestamp;
        }

        const footerTimestamp = document.getElementById('footer-timestamp');
        if (footerTimestamp) {
          footerTimestamp.textContent = timestamp;
        }
      };

      updateTime();
      setInterval(updateTime, 1000);
    },

    /**
     * Show error message
     */
    showError(message) {
      SystemUI.showNotification(message, 'error', 5000);
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

  // Expose App to window for debugging
  window.CMUKApp = App;

})();