/**
 * CMUK DIGITAL SYSTEM - STATUS TICKER
 * Real-time system status and notification display
 */

class SystemTicker {
  constructor(options = {}) {
    this.config = {
      container: options.container || document.body,
      position: options.position || 'top',
      messages: options.messages || [],
      updateInterval: options.updateInterval || 5000,
      scrollSpeed: options.scrollSpeed || 30,
      ...options
    };

    this.messages = [...this.config.messages];
    this.currentIndex = 0;
    this.tickerElement = null;
    this.contentElement = null;
    this.updateTimer = null;

    this.init();
  }

  /**
   * Initialize ticker
   */
  init() {
    this.createTicker();
    this.startAutoUpdate();
    this.emit('ticker:ready');
  }

  /**
   * Create ticker DOM element
   */
  createTicker() {
    // Create ticker container
    this.tickerElement = document.createElement('div');
    this.tickerElement.className = 'system-ticker';
    this.tickerElement.setAttribute('data-position', this.config.position);

    // Create content wrapper
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'system-ticker-content';

    // Add status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'system-status';
    statusIndicator.innerHTML = `
      <span class="system-status-dot"></span>
      <span>SYSTEM</span>
    `;
    this.contentElement.appendChild(statusIndicator);

    // Add default messages if none provided
    if (this.messages.length === 0) {
      this.messages = this.getDefaultMessages();
    }

    // Populate messages
    this.renderMessages();

    this.tickerElement.appendChild(this.contentElement);
    this.config.container.insertBefore(this.tickerElement, this.config.container.firstChild);
  }

  /**
   * Get default system messages
   */
  getDefaultMessages() {
    return [
      { text: 'SYSTEM ONLINE', type: 'status', priority: 'high' },
      { text: 'CATALOG LOADED', type: 'info', priority: 'normal' },
      { text: '3D STUDIO READY', type: 'success', priority: 'normal' },
      { text: 'SECURE CONNECTION ESTABLISHED', type: 'security', priority: 'normal' },
      { text: 'REAL-TIME CONFIGURATION ENABLED', type: 'feature', priority: 'normal' }
    ];
  }

  /**
   * Render messages in ticker
   */
  renderMessages() {
    // Clear existing messages (except status indicator)
    const existingMessages = this.contentElement.querySelectorAll('.system-ticker-item');
    existingMessages.forEach(item => item.remove());

    // Add messages
    this.messages.forEach((message, index) => {
      const messageElement = document.createElement('div');
      messageElement.className = 'system-ticker-item';
      messageElement.setAttribute('data-type', message.type || 'info');
      messageElement.setAttribute('data-priority', message.priority || 'normal');
      messageElement.textContent = message.text;
      this.contentElement.appendChild(messageElement);
    });

    // Duplicate messages for seamless scroll
    this.messages.forEach(message => {
      const messageElement = document.createElement('div');
      messageElement.className = 'system-ticker-item';
      messageElement.setAttribute('data-type', message.type || 'info');
      messageElement.textContent = message.text;
      this.contentElement.appendChild(messageElement);
    });
  }

  /**
   * Add message to ticker
   */
  addMessage(text, options = {}) {
    const message = {
      text: text.toUpperCase(),
      type: options.type || 'info',
      priority: options.priority || 'normal',
      timestamp: Date.now()
    };

    this.messages.unshift(message);

    // Keep only recent messages
    if (this.messages.length > 20) {
      this.messages.pop();
    }

    this.renderMessages();
    this.emit('ticker:message:added', message);
  }

  /**
   * Update system status
   */
  updateStatus(status, message) {
    const statusTypes = {
      online: { color: 'var(--system-green)', message: 'SYSTEM ONLINE' },
      loading: { color: 'var(--system-gray)', message: 'LOADING' },
      error: { color: '#FF0000', message: 'SYSTEM ERROR' },
      warning: { color: '#FFFF00', message: 'WARNING' }
    };

    const statusConfig = statusTypes[status] || statusTypes.online;
    const statusDot = this.tickerElement.querySelector('.system-status-dot');
    
    if (statusDot) {
      statusDot.style.background = statusConfig.color;
    }

    if (message) {
      this.addMessage(message, { type: 'status', priority: 'high' });
    }

    this.emit('ticker:status:changed', { status, message });
  }

  /**
   * Show cart update
   */
  showCartUpdate(itemCount) {
    this.addMessage(`CART UPDATED: ${itemCount} ITEM${itemCount !== 1 ? 'S' : ''}`, {
      type: 'cart',
      priority: 'high'
    });
  }

  /**
   * Show product loaded
   */
  showProductLoaded(productName) {
    this.addMessage(`PRODUCT LOADED: ${productName}`, {
      type: 'product',
      priority: 'normal'
    });
  }

  /**
   * Show 3D model status
   */
  show3DStatus(status, progress) {
    if (status === 'loading') {
      this.addMessage(`3D MODEL LOADING: ${Math.round(progress)}%`, {
        type: '3d',
        priority: 'normal'
      });
    } else if (status === 'loaded') {
      this.addMessage('3D MODEL READY', {
        type: '3d',
        priority: 'normal'
      });
    } else if (status === 'error') {
      this.addMessage('3D MODEL LOAD ERROR', {
        type: 'error',
        priority: 'high'
      });
    }
  }

  /**
   * Start auto-update cycle
   */
  startAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.cycleMessage();
    }, this.config.updateInterval);
  }

  /**
   * Cycle through messages
   */
  cycleMessage() {
    this.currentIndex = (this.currentIndex + 1) % this.messages.length;
    this.emit('ticker:message:cycled', {
      index: this.currentIndex,
      message: this.messages[this.currentIndex]
    });
  }

  /**
   * Stop auto-update
   */
  stopAutoUpdate() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Hide ticker
   */
  hide() {
    if (this.tickerElement) {
      this.tickerElement.style.display = 'none';
    }
  }

  /**
   * Show ticker
   */
  show() {
    if (this.tickerElement) {
      this.tickerElement.style.display = 'flex';
    }
  }

  /**
   * Event emitter
   */
  emit(eventName, data = {}) {
    const event = new CustomEvent(eventName, { detail: data });
    document.dispatchEvent(event);
  }

  /**
   * Destroy ticker
   */
  destroy() {
    this.stopAutoUpdate();
    if (this.tickerElement && this.tickerElement.parentNode) {
      this.tickerElement.parentNode.removeChild(this.tickerElement);
    }
  }
}

/**
 * CMUK DIGITAL SYSTEM - UI UTILITIES
 * Helper functions for system UI components
 */

const SystemUI = {
  /**
   * Format price in system style
   */
  formatPrice(price, currency = 'USD') {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(price);

    return formatted.replace('$', 'USD ');
  },

  /**
   * Format product code
   */
  formatProductCode(code) {
    return code.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  },

  /**
   * Generate system timestamp
   */
  formatTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
  },

  /**
   * Create loading indicator
   */
  createLoadingIndicator(text = 'LOADING') {
    const loader = document.createElement('div');
    loader.className = 'system-loading';
    loader.textContent = text;
    return loader;
  },

  /**
   * Create status badge
   */
  createStatusBadge(status, text) {
    const badge = document.createElement('span');
    badge.className = `system-badge system-badge-${status}`;
    badge.textContent = text;
    return badge;
  },

  /**
   * Show notification
   */
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `system-notification system-notification-${type}`;
    notification.innerHTML = `
      <span class="system-notification-icon">▸</span>
      <span class="system-notification-text">${message}</span>
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('system-notification-visible');
    }, 10);

    // Auto-hide
    setTimeout(() => {
      notification.classList.remove('system-notification-visible');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, duration);
  },

  /**
   * Create grid item
   */
  createGridItem(content, options = {}) {
    const item = document.createElement('div');
    item.className = 'system-grid-item';
    
    if (options.border) {
      item.classList.add('system-border');
    }

    if (typeof content === 'string') {
      item.innerHTML = content;
    } else {
      item.appendChild(content);
    }

    return item;
  },

  /**
   * Validate form field
   */
  validateField(field, rules) {
    const value = field.value.trim();
    const errors = [];

    if (rules.required && !value) {
      errors.push('This field is required');
    }

    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Minimum length: ${rules.minLength}`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Maximum length: ${rules.maxLength}`);
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.message || 'Invalid format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SystemTicker, SystemUI };
}