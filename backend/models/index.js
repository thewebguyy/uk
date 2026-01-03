/**
 * MONGOOSE MODELS - UPDATED
 * Database schemas with validation and missing fields added
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ============================================
// USER MODEL - WITH PASSWORD RESET FIELDS
// ============================================

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password by default
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    apartment: String,
    city: String,
    postcode: String,
    country: { type: String, default: 'United Kingdom' }
  },
  newsletterSubscribed: {
    type: Boolean,
    default: false
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data from JSON
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

const User = mongoose.model('User', userSchema);

// ============================================
// PRODUCT MODEL
// ============================================

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    uppercase: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['apparel', 'stickers', 'party-decor', 'accessories'],
    lowercase: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'GBP',
    uppercase: true
  },
  salePrice: {
    type: Number,
    min: [0, 'Sale price cannot be negative']
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: { type: Boolean, default: false }
  }],
  sizes: [{
    name: String,
    inStock: Boolean,
    additionalPrice: { type: Number, default: 0 }
  }],
  colors: [{
    name: String,
    hexCode: String,
    inStock: Boolean
  }],
  customizable: {
    enabled: { type: Boolean, default: false },
    options: mongoose.Schema.Types.Mixed
  },
  model3d: {
    available: { type: Boolean, default: false },
    path: String,
    thumbnail: String
  },
  specifications: mongoose.Schema.Types.Mixed,
  tags: [String],
  featured: {
    type: Boolean,
    default: false
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
}, {
  timestamps: true
});

// Generate slug from name
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

const Product = mongoose.model('Product', productSchema);

// ============================================
// ORDER MODEL
// ============================================

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String, // Snapshot of product name
    price: Number, // Snapshot of price at time of order
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    customization: mongoose.Schema.Types.Mixed,
    subtotal: Number
  }],
  shippingAddress: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    apartment: String,
    city: { type: String, required: true },
    postcode: { type: String, required: true },
    country: { type: String, default: 'United Kingdom' }
  },
  billingAddress: {
    name: String,
    street: String,
    apartment: String,
    city: String,
    postcode: String,
    country: String
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true
    },
    shipping: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    }
  },
  payment: {
    method: {
      type: String,
      enum: ['card', 'paypal', 'bank_transfer'],
      default: 'card'
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date,
    stripePaymentIntentId: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  tracking: {
    carrier: String,
    trackingNumber: String,
    trackingUrl: String,
    shippedAt: Date,
    deliveredAt: Date
  },
  notes: {
    customer: String,
    internal: String
  },
  timeline: [{
    status: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `CMUK-${Date.now()}-${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

// Calculate totals
orderSchema.methods.calculateTotals = function() {
  this.pricing.subtotal = this.items.reduce((sum, item) => {
    item.subtotal = item.price * item.quantity;
    return sum + item.subtotal;
  }, 0);
  
  // Free shipping over £100 (updated threshold)
  this.pricing.shipping = this.pricing.subtotal >= 100 ? 0 : 4.99;
  
  // 20% VAT
  this.pricing.tax = (this.pricing.subtotal + this.pricing.shipping) * 0.20;
  
  this.pricing.total = this.pricing.subtotal + this.pricing.shipping + this.pricing.tax - this.pricing.discount;
  
  return this.pricing;
};

const Order = mongoose.model('Order', orderSchema);

// ============================================
// CONTACT MESSAGE MODEL
// ============================================

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: String,
  service: {
    type: String,
    enum: ['design', 'installation', 'workshop', 'subscribe-monthly', 'business', 'custom', 'general']
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['new', 'in-progress', 'resolved', 'closed'],
    default: 'new'
  },
  replied: {
    type: Boolean,
    default: false
  },
  repliedAt: Date,
  notes: String
}, {
  timestamps: true
});

const Contact = mongoose.model('Contact', contactSchema);

// ============================================
// NEWSLETTER MODEL (NEW)
// ============================================

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  subscribed: {
    type: Boolean,
    default: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: Date
}, {
  timestamps: true
});

const Newsletter = mongoose.model('Newsletter', newsletterSchema);

// ============================================
// DESIGN CONFIGURATION MODEL (NEW)
// ============================================

const designConfigSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: String, // For guest users
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  name: String,
  configuration: {
    rotation: Number,
    zoom: Number,
    color: String,
    material: String,
    size: String,
    customText: String,
    customImage: String
  },
  screenshot: String, // Base64 or URL
  isSaved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const DesignConfig = mongoose.model('DesignConfig', designConfigSchema);

// ============================================
// EXPORTS
// ============================================

module.exports = {
  User,
  Product,
  Order,
  Contact,
  Newsletter,
  DesignConfig
};