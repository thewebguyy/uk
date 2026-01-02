/**
 * FRONTEND API INTEGRATION
 * Complete examples for connecting frontend to backend
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  API_URL: 'http://localhost:5000/api',
  STRIPE_PUBLIC_KEY: 'pk_test_your_stripe_key'
};

// ============================================
// AUTHENTICATION
// ============================================

class AuthService {
  static async register(userData) {
    try {
      const response = await fetch(`${CONFIG.API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        return { success: true, user: data.data.user };
      }

      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static async login(email, password) {
    try {
      const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        return { success: true, user: data.data.user };
      }

      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  static logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
  }

  static getToken() {
    return localStorage.getItem('authToken');
  }

  static isAuthenticated() {
    return !!this.getToken();
  }

  static getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}

// ============================================
// PRODUCTS
// ============================================

class ProductService {
  static async getProducts(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`${CONFIG.API_URL}/products?${params}`);
      const data = await response.json();
      
      return data.success ? data.data.products : [];
    } catch (error) {
      console.error('Get products error:', error);
      return [];
    }
  }

  static async getProduct(id) {
    try {
      const response = await fetch(`${CONFIG.API_URL}/products/${id}`);
      const data = await response.json();
      
      return data.success ? data.data.product : null;
    } catch (error) {
      console.error('Get product error:', error);
      return null;
    }
  }

  static async getFeaturedProducts() {
    try {
      const response = await fetch(`${CONFIG.API_URL}/products/featured/list`);
      const data = await response.json();
      
      return data.success ? data.data.products : [];
    } catch (error) {
      console.error('Get featured products error:', error);
      return [];
    }
  }
}

// ============================================
// CHECKOUT WITH STRIPE
// ============================================

class CheckoutService {
  static async createPaymentIntent(orderData) {
    try {
      const response = await fetch(`${CONFIG.API_URL}/payments/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Create payment intent error:', error);
      return null;
    }
  }

  static async confirmPayment(orderId, paymentIntentId) {
    try {
      const response = await fetch(`${CONFIG.API_URL}/payments/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ orderId, paymentIntentId })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Confirm payment error:', error);
      return false;
    }
  }
}

// ============================================
// STRIPE ELEMENTS INTEGRATION
// ============================================

async function initializeStripeCheckout() {
  // Load Stripe.js
  const stripe = Stripe(CONFIG.STRIPE_PUBLIC_KEY);
  
  // Get cart items
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  
  if (cart.length === 0) {
    alert('Your cart is empty');
    window.location.href = '/shop.html';
    return;
  }

  // Prepare order data
  const shippingAddress = {
    name: document.getElementById('first-name').value + ' ' + document.getElementById('last-name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    street: document.getElementById('address').value,
    apartment: document.getElementById('apartment').value,
    city: document.getElementById('city').value,
    postcode: document.getElementById('postcode').value
  };

  const items = cart.map(item => ({
    productId: item.id,
    quantity: item.quantity,
    customization: item.customization || {}
  }));

  // Create payment intent
  const paymentData = await CheckoutService.createPaymentIntent({
    items,
    shippingAddress
  });

  if (!paymentData) {
    alert('Failed to initialize payment');
    return;
  }

  // Create Stripe Elements
  const elements = stripe.elements({
    clientSecret: paymentData.clientSecret
  });

  const paymentElement = elements.create('payment');
  paymentElement.mount('#payment-element');

  // Handle form submission
  const form = document.getElementById('checkout-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation.html?order=${paymentData.orderId}`
      }
    });

    if (error) {
      alert(error.message);
    }
  });
}

// ============================================
// CONTACT FORM
// ============================================

async function submitContactForm(formData) {
  try {
    const response = await fetch(`${CONFIG.API_URL}/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Contact form error:', error);
    return false;
  }
}

// ============================================
// ORDERS
// ============================================

class OrderService {
  static async getMyOrders() {
    try {
      const response = await fetch(`${CONFIG.API_URL}/orders/my-orders`, {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });

      const data = await response.json();
      return data.success ? data.data.orders : [];
    } catch (error) {
      console.error('Get orders error:', error);
      return [];
    }
  }

  static async trackOrder(orderNumber) {
    try {
      const response = await fetch(`${CONFIG.API_URL}/orders/track/${orderNumber}`);
      const data = await response.json();
      
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Track order error:', error);
      return null;
    }
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: Display products on shop page
async function loadShopProducts() {
  const products = await ProductService.getProducts({ category: 'apparel' });
  const grid = document.getElementById('products-grid');
  
  grid.innerHTML = products.map(product => `
    <div class="product-card">
      <h3>${product.name}</h3>
      <p>£${product.price}</p>
      <button onclick="addToCart(${product._id}, '${product.name}', ${product.price})">
        Add to Cart
      </button>
    </div>
  `).join('');
}

// Example 2: Handle registration
async function handleRegistration(event) {
  event.preventDefault();
  
  const formData = {
    name: document.getElementById('signup-name').value,
    email: document.getElementById('signup-email').value,
    password: document.getElementById('signup-password').value
  };

  const result = await AuthService.register(formData);
  
  if (result.success) {
    alert('Registration successful!');
    window.location.href = '/index.html';
  } else {
    alert(result.message);
  }
}

// Example 3: Handle login
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('signin-email').value;
  const password = document.getElementById('signin-password').value;

  const result = await AuthService.login(email, password);
  
  if (result.success) {
    window.location.href = '/index.html';
  } else {
    alert(result.message);
  }
}

// Example 4: Submit contact form
async function handleContactSubmit(event) {
  event.preventDefault();
  
  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    service: document.getElementById('service').value,
    message: document.getElementById('message').value
  };

  const success = await submitContactForm(formData);
  
  if (success) {
    alert('Message sent! We\'ll get back to you within 24 hours.');
    event.target.reset();
  } else {
    alert('Failed to send message. Please try again.');
  }
}

// Export for use in HTML files
window.AuthService = AuthService;
window.ProductService = ProductService;
window.CheckoutService = CheckoutService;
window.OrderService = OrderService;
window.initializeStripeCheckout = initializeStripeCheckout;
window.submitContactForm = submitContactForm;