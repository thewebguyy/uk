/**
 * CMUK DIGITAL SYSTEM - CATALOG ENGINE
 * JSON-driven product management system
 */

class CatalogEngine {
  constructor(options = {}) {
    this.config = {
      dataSource: options.dataSource || '/data/products.json',
      cacheEnabled: options.cacheEnabled !== false,
      cacheKey: 'cmuk_catalog_cache',
      cacheDuration: options.cacheDuration || 3600000, // 1 hour
      ...options
    };

    this.products = [];
    this.categories = new Map();
    this.isLoaded = false;
    this.isLoading = false;
  }

  /**
   * Initialize catalog - load products
   */
  async init() {
    try {
      await this.loadCatalog();
      this.emit('catalog:ready', { productCount: this.products.length });
      return true;
    } catch (error) {
      console.error('Failed to initialize catalog:', error);
      this.emit('catalog:error', { error });
      return false;
    }
  }

  /**
   * Load catalog from data source
   */
  async loadCatalog() {
    if (this.isLoading) {
      console.warn('Catalog is already loading');
      return;
    }

    this.isLoading = true;
    this.emit('catalog:loading:start');

    // Try cache first
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache();
      if (cached) {
        this.processProducts(cached);
        this.isLoading = false;
        this.isLoaded = true;
        this.emit('catalog:loaded:cache');
        return;
      }
    }

    // Fetch from source
    try {
      const response = await fetch(this.config.dataSource);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate data structure
      if (!this.validateCatalogData(data)) {
        throw new Error('Invalid catalog data structure');
      }

      // Cache data
      if (this.config.cacheEnabled) {
        this.saveToCache(data);
      }

      this.processProducts(data);
      this.isLoading = false;
      this.isLoaded = true;
      this.emit('catalog:loaded:remote');

    } catch (error) {
      this.isLoading = false;
      throw error;
    }
  }

  /**
   * Validate catalog data structure
   */
  validateCatalogData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.products)) return false;
    
    // Validate each product has required fields
    return data.products.every(product => 
      product.id &&
      product.name &&
      product.price !== undefined
    );
  }

  /**
   * Process products and build indexes
   */
  processProducts(data) {
    this.products = data.products.map(product => ({
      ...product,
      // Ensure consistent structure
      id: product.id,
      name: product.name,
      slug: product.slug || this.generateSlug(product.name),
      description: product.description || '',
      price: parseFloat(product.price),
      currency: product.currency || 'USD',
      category: product.category || 'Uncategorized',
      tags: product.tags || [],
      images: product.images || [],
      model3d: product.model3d || null,
      customizable: product.customizable || {},
      stock: product.stock !== undefined ? product.stock : 999,
      metadata: product.metadata || {}
    }));

    // Build category index
    this.categories.clear();
    this.products.forEach(product => {
      if (!this.categories.has(product.category)) {
        this.categories.set(product.category, []);
      }
      this.categories.get(product.category).push(product);
    });
  }

  /**
   * Get all products
   */
  getProducts(filters = {}) {
    let results = [...this.products];

    // Apply filters
    if (filters.category) {
      results = results.filter(p => p.category === filters.category);
    }

    if (filters.minPrice !== undefined) {
      results = results.filter(p => p.price >= filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      results = results.filter(p => p.price <= filters.maxPrice);
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(p => 
        filters.tags.some(tag => p.tags.includes(tag))
      );
    }

    if (filters.inStock) {
      results = results.filter(p => p.stock > 0);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    if (filters.sortBy) {
      results = this.sortProducts(results, filters.sortBy, filters.sortOrder);
    }

    return results;
  }

  /**
   * Get product by ID
   */
  getProductById(id) {
    return this.products.find(p => p.id === id);
  }

  /**
   * Get product by slug
   */
  getProductBySlug(slug) {
    return this.products.find(p => p.slug === slug);
  }

  /**
   * Get products by category
   */
  getProductsByCategory(category) {
    return this.categories.get(category) || [];
  }

  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Get category with product count
   */
  getCategoriesWithCount() {
    const result = [];
    this.categories.forEach((products, category) => {
      result.push({
        name: category,
        count: products.length,
        slug: this.generateSlug(category)
      });
    });
    return result;
  }

  /**
   * Search products
   */
  search(query, options = {}) {
    const results = this.getProducts({
      search: query,
      ...options
    });

    return {
      query,
      count: results.length,
      results
    };
  }

  /**
   * Sort products
   */
  sortProducts(products, sortBy, order = 'asc') {
    const sorted = [...products];
    const multiplier = order === 'desc' ? -1 : 1;

    sorted.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (typeof aVal === 'string') {
        return multiplier * aVal.localeCompare(bVal);
      }

      return multiplier * (aVal - bVal);
    });

    return sorted;
  }

  /**
   * Generate URL-friendly slug
   */
  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Cache management
   */
  saveToCache(data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(this.config.cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  }

  getFromCache() {
    try {
      const cached = localStorage.getItem(this.config.cacheKey);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;

      if (age > this.config.cacheDuration) {
        this.clearCache();
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('Failed to read from cache:', error);
      return null;
    }
  }

  clearCache() {
    try {
      localStorage.removeItem(this.config.cacheKey);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Event emitter
   */
  emit(eventName, data = {}) {
    const event = new CustomEvent(eventName, { detail: data });
    document.dispatchEvent(event);
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CatalogEngine;
}