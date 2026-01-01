// Cart Management System
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function updateCartUI() {
  const cartCount = document.getElementById('cart-count');
  const cartItems = document.getElementById('cart-items');
  const cartEmpty = document.getElementById('cart-empty');
  const cartSummary = document.getElementById('cart-summary');
  const cartSubtotal = document.getElementById('cart-subtotal');

  if (!cartCount) return; // Exit if elements don't exist on page

  // Update cart count
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;

  // Update cart display
  if (cart.length === 0) {
    if (cartEmpty) cartEmpty.style.display = 'block';
    if (cartSummary) cartSummary.style.display = 'none';
    if (cartItems) cartItems.innerHTML = '';
  } else {
    if (cartEmpty) cartEmpty.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';

    // Calculate subtotal
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartSubtotal) cartSubtotal.textContent = '£' + subtotal.toFixed(2);

    // Display cart items
    if (cartItems) {
      cartItems.innerHTML = cart.map(item => `
        <div class="cart-item mb-3 pb-3" style="border-bottom: 1px solid var(--color-grey-light);">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="mb-1">${item.name}</h6>
              <p class="text-grey mb-1" style="font-size: 0.875rem;">£${item.price.toFixed(2)}</p>
            </div>
            <button onclick="removeFromCart(${item.id})" class="btn-close btn-sm"></button>
          </div>
          <div class="d-flex align-items-center gap-2">
            <button onclick="updateQuantity(${item.id}, ${item.quantity - 1})" class="btn btn-sm btn-outline" style="padding: 0.25rem 0.5rem;">-</button>
            <span style="min-width: 30px; text-align: center;">${item.quantity}</span>
            <button onclick="updateQuantity(${item.id}, ${item.quantity + 1})" class="btn btn-sm btn-outline" style="padding: 0.25rem 0.5rem;">+</button>
          </div>
        </div>
      `).join('');
    }
  }
}

function addToCart(id, name, price) {
  const existingItem = cart.find(item => item.id === id);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
}

function updateQuantity(id, newQuantity) {
  if (newQuantity <= 0) {
    removeFromCart(id);
    return;
  }

  const item = cart.find(item => item.id === id);
  if (item) {
    item.quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
  }
}

function getCart() {
  return cart;
}

function clearCart() {
  cart = [];
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
}

// Initialize cart on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateCartUI);
} else {
  updateCartUI();
}