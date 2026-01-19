/**
 * FRONTEND API INTEGRATION - FIREBASE VERSION
 * Reads products directly from Firestore
 * Auth handled via Firebase Auth
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, getDoc, query, where, limit, orderBy, startAfter } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// CONFIGURATION
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyA6pLJdRb4V5LUUrHdwSKRne-ZgXJoqqY8",
  authDomain: "cmuksite.firebaseapp.com",
  projectId: "cmuksite",
  storageBucket: "cmuksite.firebasestorage.app",
  messagingSenderId: "311601861870",
  appId: "1:311601861870:web:4d3c04c418a789961dcfff"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const CONFIG = {
  API_URL: 'http://localhost:5000/api', // Kept for legacy backend endpoints if needed
  STRIPE_PUBLIC_KEY: 'pk_test_your_stripe_key'
};

// ============================================
// AUTHENTICATION
// ============================================

class AuthService {
  static async register(userData) {
    try {
      const { email, password, name } = userData;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with name
      await updateProfile(user, {
        displayName: name
      });

      // Format user object
      const formattedUser = {
        uid: user.uid,
        email: user.email,
        name: name,
        createdAt: new Date().toISOString()
      };

      // Store in localStorage for compatibility
      localStorage.setItem('user', JSON.stringify(formattedUser));
      localStorage.setItem('authToken', await user.getIdToken());

      return { success: true, user: formattedUser };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: this.getErrorMessage(error) };
    }
  }

  static async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const formattedUser = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || 'User',
        createdAt: user.metadata.creationTime
      };

      localStorage.setItem('user', JSON.stringify(formattedUser));
      localStorage.setItem('authToken', await user.getIdToken());

      return { success: true, user: formattedUser };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: this.getErrorMessage(error) };
    }
  }

  static async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const formattedUser = {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        createdAt: user.metadata.creationTime
      };

      localStorage.setItem('user', JSON.stringify(formattedUser));
      localStorage.setItem('authToken', await user.getIdToken());

      return { success: true, user: formattedUser };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, message: this.getErrorMessage(error) };
    }
  }

  static async logout() {
    try {
      await signOut(auth);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
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

  static getErrorMessage(error) {
    switch (error.code) {
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password.';
      case 'auth/email-already-in-use': return 'Email is already registered.';
      case 'auth/weak-password': return 'Password should be at least 6 characters.';
      default: return error.message;
    }
  }
}

// ============================================
// PRODUCTS (FIRESTORE)
// ============================================

class ProductService {
  static async getProducts(filters = {}) {
    try {
      let productsRef = collection(db, 'products');
      let q = query(productsRef);

      // Apply category filter
      // FIELD: 'categories' (array) matches 'array-contains'
      if (filters.category && filters.category !== 'all') {
        q = query(q, where('categories', 'array-contains', filters.category));
      }

      // Apply limit (default to 50 for performance)
      const limitCount = filters.limit || 50;
      q = query(q, limit(limitCount));

      // Execute query
      const querySnapshot = await getDocs(q);

      let products = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          _id: doc.id,
          ...data,
          // Map array -> string for frontend compatibility
          category: Array.isArray(data.categories) ? data.categories[0] : (data.category || 'Uncategorized'),
          imageUrl: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : (data.imageUrl || '')
        });
      });

      // Client-side filtering/sorting for price
      if (filters.minPrice) {
        products = products.filter(p => p.price >= parseFloat(filters.minPrice));
      }
      if (filters.maxPrice) {
        products = products.filter(p => p.price <= parseFloat(filters.maxPrice));
      }

      return products;
    } catch (error) {
      console.error('Get products error:', error);
      return [];
    }
  }

  static async getProduct(id) {
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          _id: docSnap.id,
          ...data,
          category: Array.isArray(data.categories) ? data.categories[0] : (data.category || 'Uncategorized'),
          imageUrl: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : (data.imageUrl || '')
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Get product error:', error);
      return null;
    }
  }

  static async getFeaturedProducts() {
    try {
      const q = query(collection(db, 'products'), where('featured', '==', true), limit(4));
      const querySnapshot = await getDocs(q);

      const products = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          _id: doc.id,
          ...data,
          category: Array.isArray(data.categories) ? data.categories[0] : (data.category || 'Uncategorized'),
          imageUrl: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : (data.imageUrl || '')
        });
      });

      return products;
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
  // Load Stripe.js (Assuming Stripe script is loaded in HTML)
  if (typeof Stripe === 'undefined') {
    console.error('Stripe.js not loaded');
    return;
  }
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
// EXPORTS
// ============================================

// Assign to window for global access
window.AuthService = AuthService;
window.ProductService = ProductService;
window.CheckoutService = CheckoutService;
window.OrderService = OrderService;
window.initializeStripeCheckout = initializeStripeCheckout;
window.submitContactForm = submitContactForm;

console.log('API Integration (Firebase Version) Loaded');