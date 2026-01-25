// ============================================
// CART.JS - Complete Cart Management System
// Creative Merch UK
// ============================================

// Initialize cart from localStorage
function getCart() {
  const cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
}

// Save cart to localStorage
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartDisplay();
  // Dispatch event for other listeners
  window.dispatchEvent(new Event('cartUpdated'));
}

// Generate simple hash for customization object
function getCustomizationHash(customization) {
  if (!customization || Object.keys(customization).length === 0) return '';
  return JSON.stringify(customization).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
}

// Add item to cart
function addToCart(productId, name, price, imageUrl = '', quantity = 1, customization = null) {
  const cart = getCart();

  // Create unique ID based on product + customization
  const custHash = getCustomizationHash(customization);
  const cartItemId = custHash ? `${productId}-${custHash}` : productId;

  // Check if specific variant exists
  const existingItem = cart.find(item => item.id === cartItemId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: cartItemId, // Unique Cart Item ID
      productId: productId, // Reference to original product
      name: name,
      price: price,
      imageUrl: imageUrl,
      quantity: quantity,
      customization: customization || {}
    });
  }

  saveCart(cart);

  // Save to Firestore for Abandoned Cart Recovery (if user is known or just by cookie ID)
  // For MVP, if we have a global saved email or user, we push it.
  if (typeof saveCartToFirestore === 'function') {
    saveCartToFirestore(cart);
  }

  // Show Offcanvas (optional interaction polish)
  const offcanvasEl = document.getElementById('cartOffcanvas');
  if (offcanvasEl && window.bootstrap) {
    const bsOffcanvas = window.bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
    bsOffcanvas.show();
  }
}


// Remove item from cart
function removeFromCart(cartItemId) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== cartItemId);
  saveCart(cart);
}

// Update item quantity
function updateQuantity(cartItemId, newQuantity) {
  const cart = getCart();
  const item = cart.find(item => item.id === cartItemId);

  if (item) {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
    } else {
      // Basic client-side max stock limit (could be improved with real stock check)
      if (newQuantity > 99) return;

      item.quantity = newQuantity;
      saveCart(cart);
    }
  }
}

// Get cart total
function getCartTotal() {
  const cart = getCart();
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Get cart item count
function getCartCount() {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.quantity, 0);
}

// Clear entire cart
function clearCart() {
  localStorage.removeItem('cart');
  updateCartDisplay();
}

// Update cart display in UI
function updateCartDisplay() {
  const cart = getCart();
  const cartItemsContainer = document.getElementById('cart-items');
  const cartEmptyContainer = document.getElementById('cart-empty');
  const cartSummaryContainer = document.getElementById('cart-summary');
  const cartCountBadge = document.getElementById('cart-count');
  const cartSubtotalElement = document.getElementById('cart-subtotal');

  // Update cart count badge
  const count = getCartCount();
  if (cartCountBadge) {
    cartCountBadge.textContent = count;
    if (count > 0) {
      cartCountBadge.classList.add('has-items');
    } else {
      cartCountBadge.classList.remove('has-items');
    }
  }

  // If cart is empty
  if (cart.length === 0) {
    if (cartItemsContainer) cartItemsContainer.innerHTML = '';
    if (cartEmptyContainer) cartEmptyContainer.style.display = 'block';
    if (cartSummaryContainer) cartSummaryContainer.style.display = 'none';
    return;
  }

  // Hide empty message, show summary
  if (cartEmptyContainer) cartEmptyContainer.style.display = 'none';
  if (cartSummaryContainer) cartSummaryContainer.style.display = 'block';

  // Render cart items
  if (cartItemsContainer) {
    cartItemsContainer.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-image">
          ${item.imageUrl ?
        `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}">` :
        `<div class="placeholder-img">No Image</div>`
      }
        </div>
        <div class="cart-item-details">
          <div class="cart-item-title">${escapeHtml(item.name)}</div>
          <div class="cart-item-customization">
             ${item.customization && item.customization.size ? `Size: ${item.customization.size}` : ''}
             ${item.customization && item.customization.color ? ` | Color: ${item.customization.color}` : ''}
          </div>
          <div class="cart-item-controls">
             <div class="quantity-selector-sm">
                <button type="button" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">−</button>
                <span>${item.quantity}</span>
                <button type="button" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
             </div>
             <div class="cart-item-price">£${(item.price * item.quantity).toFixed(2)}</div>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" aria-label="Remove item">×</button>
      </div>
    `).join('');
  }

  // Update subtotal
  const total = getCartTotal();
  if (cartSubtotalElement) {
    cartSubtotalElement.textContent = `£${total.toFixed(2)}`;
  }
}

// Helper quantity wrapper calling global function
window.changeCartItemQuantity = function (id, delta) {
  // Determine current qty? 
  // Easier to just use updateQuantity with absolute value above.
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize cart display when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateCartDisplay);
} else {
  updateCartDisplay();
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
  window.addToCart = addToCart;
  window.removeFromCart = removeFromCart;
  window.updateQuantity = updateQuantity;
  window.getCart = getCart;
  window.getCartTotal = getCartTotal;
  window.getCartCount = getCartCount;
  window.clearCart = clearCart;
  window.updateCartDisplay = updateCartDisplay;
}