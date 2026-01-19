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
}

// Generate simple hash for customization object
function getCustomizationHash(customization) {
  if (!customization || Object.keys(customization).length === 0) return '';
  // simple stable stringify sort of
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
        `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" style="width: 100%; height: 100%; object-fit: cover;">` :
        `<div style="width: 100%; height: 100%; background: var(--color-grey-light); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--color-grey);">No Image</div>`
      }
        </div>
        <div class="cart-item-details">
          <div class="cart-item-title">${escapeHtml(item.name)}</div>
          <div class="cart-item-price">£${item.price.toFixed(2)} × ${item.quantity}</div>
          <div class="cart-item-total" style="font-weight: 600; margin-top: 0.25rem;">£${(item.price * item.quantity).toFixed(2)}</div>
          ${item.customization && item.customization.size ? `<div style="font-size: 0.7rem; color: #666;">Size: ${item.customization.size}, Color: ${item.customization.color}</div>` : ''}
        </div>
        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')" aria-label="Remove ${escapeHtml(item.name)} from cart">
          ×
        </button>
      </div>
    `).join('');
  }

  // Update subtotal
  const total = getCartTotal();
  if (cartSubtotalElement) {
    cartSubtotalElement.textContent = `£${total.toFixed(2)}`;
  }
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