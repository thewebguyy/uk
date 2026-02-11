/**
 * FRONTEND API INTEGRATION - FIREBASE + CLOUD FUNCTIONS VERSION
 * Connects directly to Firestore and Cloud Functions
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, getDoc, query, where, limit, orderBy, startAfter, addDoc, updateDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';

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
const functions = getFunctions(app); // Defaults to us-central1

const CONFIG = {
  // Stripe Live Publishable Key
  STRIPE_PUBLIC_KEY: 'pk_live_51Qr2StKg0noSfYuQGP6qNLoemAXaMiwaZZfcDfuAtcrq4h5RUlpuzkBE7HbdNa5XnqXaS44C6tiEvVtht9eBiLH500uVeNF7Je'
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

      await updateProfile(user, { displayName: name });

      // Send verification email
      await sendEmailVerification(user, {
        url: window.location.origin + '/login.html',
        handleCodeInApp: false
      });

      // Sign out user until verified
      await signOut(auth);

      // Create user doc in Firestore (optional but good for extra data)
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          name,
          email,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        // Doc might not exist, but we proceed
      }

      return {
        success: true,
        message: 'Account created! Please check your email to verify before logging in.'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: this.getErrorMessage(error) };
    }
  }

  static async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email is verified
      if (!user.emailVerified) {
        // Offer to resend
        const resend = confirm('Your email is not verified. Would you like us to resend the verification link?');
        if (resend) {
          try {
            await sendEmailVerification(user);
            alert('Verification email resent! Please check your inbox.');
          } catch (e) {
            alert('Error resending email: ' + e.message);
          }
        }
        await signOut(auth);
        return {
          success: false,
          message: 'Please verify your email address before logging in.',
          needsVerification: true
        };
      }

      return { success: true, user: this.formatUser(user) };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: this.getErrorMessage(error) };
    }
  }

  static async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return { success: true, user: this.formatUser(result.user) };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, message: this.getErrorMessage(error) };
    }
  }

  static async logout() {
    try {
      await signOut(auth);
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  static formatUser(user) {
    return {
      uid: user.uid,
      email: user.email,
      name: user.displayName || 'User',
      photoURL: user.photoURL
    };
  }

  static getCurrentUser_Sync() {
    return auth.currentUser ? this.formatUser(auth.currentUser) : null;
  }

  // Listen for auth state changes
  static initAuthListener(callback) {
    onAuthStateChanged(auth, (user) => {
      callback(user ? this.formatUser(user) : null);
    });
  }

  static async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Password reset email sent! Please check your inbox.' };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: this.getErrorMessage(error) };
    }
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

      if (filters.category && filters.category !== 'all') {
        q = query(q, where('categories', 'array-contains', filters.category));
      }

      // Order by generic field or default
      // Note: Firestore requires composite indexes for complex sorting + filtering
      // We will do basic filtering here and advanced sorting client-side if needed for small catalog

      const limitCount = filters.limit || 50;
      q = query(q, limit(limitCount));

      const querySnapshot = await getDocs(q);
      let products = [];

      querySnapshot.forEach((doc) => {
        products.push(this.formatProduct(doc));
      });

      // Price filter (Client side)
      if (filters.minPrice) products = products.filter(p => p.price >= parseFloat(filters.minPrice));
      if (filters.maxPrice) products = products.filter(p => p.price <= parseFloat(filters.maxPrice));
      if (filters.search) {
        const term = filters.search.toLowerCase();
        products = products.filter(p => p.name.toLowerCase().includes(term));
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
      return docSnap.exists() ? this.formatProduct(docSnap) : null;
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
      querySnapshot.forEach(doc => products.push(this.formatProduct(doc)));
      return products;
    } catch (error) {
      return [];
    }
  }

  static async getReviews(productId) {
    try {
      const reviewsRef = collection(db, 'products', productId, 'reviews');
      const q = query(reviewsRef, orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching reviews:", error);
      return [];
    }
  }

  static async addReview(reviewData) {
    try {
      const addReviewFn = httpsCallable(functions, 'addReview');
      const result = await addReviewFn(reviewData);
      return result.data; // { success: true }
    } catch (error) {
      console.error('Add review error:', error);
      return { success: false, message: error.message };
    }
  }

  static formatProduct(doc) {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      category: Array.isArray(data.categories) ? data.categories[0] : (data.category || 'Uncategorized'),
      imageUrl: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : (data.imageUrl || ''),
      stock: typeof data.stock === 'number' ? data.stock : 100 // Default stock if missing
    };
  }
}

// ============================================
// CHECKOUT & PAYMENTS (CLOUD FUNCTIONS)
// ============================================

class CheckoutService {
  /**
   * Creates a Stripe Checkout Session and returns the hosted URL
   * @param {Object} orderData { items, email, shippingAddress }
   */
  static async createCheckoutSession(orderData) {
    try {
      const createCheckoutSessionFn = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSessionFn({
        ...orderData,
        successUrl: window.location.origin + '/order-confirmation.html',
        cancelUrl: window.location.origin + '/checkout.html'
      });
      return result.data; // Expected { url }
    } catch (error) {
      console.error('Checkout session error:', error);
      throw error;
    }
  }
}

// ============================================
// NEWSLETTER
// ============================================

class NewsletterService {
  static async subscribe(email) {
    try {
      // Use email as document ID for simple idempotency without needing read permissions
      // This works because we'll allow create/update in rules where documentId == email
      const docRef = doc(db, 'newsletter', email);

      await setDoc(docRef, {
        email,
        createdAt: serverTimestamp(),
        source: 'website_footer'
      }, { merge: true });

      return { success: true, message: 'Successfully subscribed!' };
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      return { success: false, message: 'Failed to subscribe. Please try again later.' };
    }
  }
}

class ContactService {
  static async submit(formData) {
    try {
      const submitContactFn = httpsCallable(functions, 'submitContact');
      const result = await submitContactFn(formData);
      return result.data;
    } catch (error) {
      console.error('Contact submit error:', error);
      throw error;
    }
  }
}

// ============================================
// UTILS
// ============================================
// Initialize Stripe
async function initializeStripe() {
  if (typeof Stripe !== 'undefined') {
    return Stripe(CONFIG.STRIPE_PUBLIC_KEY);
  }
  return null;
}

// ============================================
// EXPORTS
// ============================================

window.AuthService = AuthService;
window.ProductService = ProductService;
window.CheckoutService = CheckoutService;
window.NewsletterService = NewsletterService;
window.ContactService = ContactService;
window.initializeStripe = initializeStripe;
window.db = db; // Export db for index.html hero loading

// ============================================
// CART SYNC (ABANDONED CART)
// ============================================
window.saveCartToFirestore = async function (cart) {
  // Only save if we have some user identifier (Auth or Email entered)
  // For specific abandoned cart flow, we often need the email first.
  // Here we check if user is logged in:
  const user = auth.currentUser;
  if (user) {
    try {
      const cartRef = doc(db, 'carts', user.uid);
      await setDoc(cartRef, {
        items: cart,
        userId: user.uid,
        email: user.email,
        status: 'active',
        emailSent: false,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to sync cart", e);
    }
  } else {
    // If guest, we might store in a 'guest_carts' by a fuzzy ID, 
    // but for now only sync if we have an authoritative ID to link to email.
  }
};

// ============================================
// GLOBAL AUTH STATE LISTENER
// ============================================
AuthService.initAuthListener((user) => {
  const updateNavText = () => {
    const navTextElements = document.querySelectorAll('.nav-text');
    navTextElements.forEach(el => {
      if (user) {
        const firstName = user.name.split(' ')[0].toUpperCase();
        el.textContent = `HI, ${firstName}`;
      } else {
        el.textContent = 'SIGN IN / SIGN UP';
      }
    });
  };

  // Update immediately
  updateNavText();

  // Dispatch global event for other scripts
  document.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user } }));

  // Also update when components are loaded (for dynamic nav)
  document.addEventListener('allComponentsLoaded', updateNavText);
});

console.log('API Integration (Firebase + Functions) Loaded');