/**
 * DATABASE SEED SCRIPT
 * Populates database with sample data
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const { User, Product, Order, Contact, Newsletter } = require('../models');

// ============================================
// SAMPLE DATA
// ============================================

const sampleProducts = [
  // APPAREL
  {
    name: 'Custom T-Shirt',
    sku: 'CMUK-TS-001',
    description: 'Premium quality custom t-shirt made from 100% cotton. Perfect for personal designs, business branding, or special events. Available in multiple sizes and colors.',
    category: 'apparel',
    subcategory: 't-shirts',
    price: 15.99,
    stock: 100,
    images: [
      { url: '/images/products/tshirt-white.jpg', alt: 'White T-Shirt', isPrimary: true },
      { url: '/images/products/tshirt-black.jpg', alt: 'Black T-Shirt', isPrimary: false }
    ],
    sizes: [
      { name: 'XS', inStock: true, additionalPrice: 0 },
      { name: 'S', inStock: true, additionalPrice: 0 },
      { name: 'M', inStock: true, additionalPrice: 0 },
      { name: 'L', inStock: true, additionalPrice: 0 },
      { name: 'XL', inStock: true, additionalPrice: 0 },
      { name: 'XXL', inStock: true, additionalPrice: 2 }
    ],
    colors: [
      { name: 'White', hexCode: '#FFFFFF', inStock: true },
      { name: 'Black', hexCode: '#000000', inStock: true },
      { name: 'Navy', hexCode: '#001F3F', inStock: true },
      { name: 'Red', hexCode: '#FF4136', inStock: true }
    ],
    customizable: {
      enabled: true,
      options: { text: true, image: true, color: true }
    },
    model3d: {
      available: true,
      path: '/models/tshirt.glb',
      thumbnail: '/images/3d/tshirt-thumb.jpg'
    },
    tags: ['custom', 'personalised', 't-shirt', 'cotton'],
    featured: true,
    seo: {
      metaTitle: 'Custom T-Shirt | Personalised Apparel',
      metaDescription: 'Design your own custom t-shirt with our easy-to-use 3D designer.',
      keywords: ['custom t-shirt', 'personalised shirt', 'custom apparel']
    }
  },
  {
    name: 'Hoodie - Premium Custom',
    sku: 'CMUK-HD-001',
    description: 'Cozy premium hoodie with custom printing options. Features a soft fleece interior, adjustable drawstrings, and a spacious kangaroo pocket.',
    category: 'apparel',
    subcategory: 'hoodies',
    price: 32.99,
    salePrice: 28.99,
    stock: 75,
    images: [
      { url: '/images/products/hoodie-grey.jpg', alt: 'Grey Hoodie', isPrimary: true }
    ],
    sizes: [
      { name: 'S', inStock: true, additionalPrice: 0 },
      { name: 'M', inStock: true, additionalPrice: 0 },
      { name: 'L', inStock: true, additionalPrice: 0 },
      { name: 'XL', inStock: true, additionalPrice: 3 }
    ],
    colors: [
      { name: 'Grey', hexCode: '#808080', inStock: true },
      { name: 'Black', hexCode: '#000000', inStock: true },
      { name: 'Navy', hexCode: '#001F3F', inStock: true }
    ],
    customizable: {
      enabled: true,
      options: { text: true, image: true }
    },
    tags: ['hoodie', 'custom', 'winter', 'warm'],
    featured: true
  },
  
  // STICKERS
  {
    name: 'Vinyl Sticker Pack',
    sku: 'CMUK-ST-001',
    description: 'High-quality vinyl stickers perfect for laptops, water bottles, and more. Waterproof and durable. Pack of 10 custom designs.',
    category: 'stickers',
    subcategory: 'vinyl',
    price: 8.99,
    stock: 200,
    images: [
      { url: '/images/products/sticker-pack.jpg', alt: 'Vinyl Sticker Pack', isPrimary: true }
    ],
    customizable: {
      enabled: true,
      options: { design: true, quantity: true }
    },
    tags: ['stickers', 'vinyl', 'waterproof', 'custom'],
    featured: false
  },
  {
    name: 'Die-Cut Custom Stickers',
    sku: 'CMUK-ST-002',
    description: 'Premium die-cut stickers in any shape you want. Perfect for branding, promotions, or personal use. Minimum order: 50 pieces.',
    category: 'stickers',
    subcategory: 'die-cut',
    price: 25.00,
    stock: 150,
    images: [
      { url: '/images/products/die-cut-stickers.jpg', alt: 'Die-Cut Stickers', isPrimary: true }
    ],
    customizable: {
      enabled: true,
      options: { shape: true, design: true, quantity: true }
    },
    tags: ['die-cut', 'custom shape', 'business', 'branding']
  },
  
  // PARTY DECOR
  {
    name: 'Birthday Banner - Custom',
    sku: 'CMUK-PD-001',
    description: 'Personalized birthday banner with custom text and colors. Made from durable vinyl material, perfect for indoor or outdoor celebrations.',
    category: 'party-decor',
    subcategory: 'banners',
    price: 18.99,
    stock: 80,
    images: [
      { url: '/images/products/birthday-banner.jpg', alt: 'Custom Birthday Banner', isPrimary: true }
    ],
    customizable: {
      enabled: true,
      options: { text: true, color: true, size: true }
    },
    tags: ['birthday', 'banner', 'party', 'celebration'],
    featured: true
  },
  {
    name: 'Balloon Garland Kit',
    sku: 'CMUK-PD-002',
    description: 'Complete balloon garland kit with 100 balloons in coordinating colors. Includes assembly strip and instructions.',
    category: 'party-decor',
    subcategory: 'balloons',
    price: 24.99,
    stock: 60,
    images: [
      { url: '/images/products/balloon-garland.jpg', alt: 'Balloon Garland Kit', isPrimary: true }
    ],
    colors: [
      { name: 'Pastel Mix', hexCode: '#FFE4E1', inStock: true },
      { name: 'Rainbow', hexCode: '#FF6B6B', inStock: true },
      { name: 'Gold & White', hexCode: '#FFD700', inStock: true }
    ],
    tags: ['balloons', 'garland', 'party decor', 'celebration']
  },
  {
    name: 'Custom Cake Topper',
    sku: 'CMUK-PD-003',
    description: 'Personalized acrylic cake topper. Choose your text, font, and color. Perfect finishing touch for any celebration cake.',
    category: 'party-decor',
    subcategory: 'cake-toppers',
    price: 12.99,
    stock: 100,
    images: [
      { url: '/images/products/cake-topper.jpg', alt: 'Custom Cake Topper', isPrimary: true }
    ],
    customizable: {
      enabled: true,
      options: { text: true, color: true, font: true }
    },
    tags: ['cake topper', 'custom', 'acrylic', 'birthday', 'wedding'],
    featured: false
  },
  
  // ACCESSORIES
  {
    name: 'Custom Tote Bag',
    sku: 'CMUK-AC-001',
    description: 'Eco-friendly canvas tote bag with your custom design. Spacious and durable, perfect for shopping or everyday use.',
    category: 'accessories',
    subcategory: 'bags',
    price: 14.99,
    stock: 90,
    images: [
      { url: '/images/products/tote-bag.jpg', alt: 'Custom Tote Bag', isPrimary: true }
    ],
    customizable: {
      enabled: true,
      options: { text: true, image: true }
    },
    tags: ['tote bag', 'eco-friendly', 'canvas', 'reusable'],
    featured: false
  },
  {
    name: 'Personalised Mug',
    sku: 'CMUK-AC-002',
    description: 'Ceramic mug with full-color custom printing. Dishwasher and microwave safe. 11oz capacity.',
    category: 'accessories',
    subcategory: 'drinkware',
    price: 11.99,
    stock: 120,
    images: [
      { url: '/images/products/custom-mug.jpg', alt: 'Personalised Mug', isPrimary: true }
    ],
    customizable: {
      enabled: true,
      options: { text: true, image: true, photo: true }
    },
    tags: ['mug', 'ceramic', 'personalised', 'gift'],
    featured: true
  },
  {
    name: 'Custom Phone Case',
    sku: 'CMUK-AC-003',
    description: 'Protective phone case with your custom design. Available for iPhone and Samsung models. Slim profile with shock absorption.',
    category: 'accessories',
    subcategory: 'phone-cases',
    price: 16.99,
    stock: 150,
    images: [
      { url: '/images/products/phone-case.jpg', alt: 'Custom Phone Case', isPrimary: true }
    ],
    customizable: {
      enabled: true,
      options: { design: true, model: true }
    },
    tags: ['phone case', 'custom', 'protective', 'personalized']
  }
];

const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@customisemeuk.com',
    password: 'Admin123!',
    role: 'admin',
    phone: '020 1234 5678',
    address: {
      street: '123 High Street',
      city: 'London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom'
    }
  },
  {
    name: 'John Customer',
    email: 'john@example.com',
    password: 'Customer123!',
    role: 'customer',
    phone: '020 9876 5432',
    newsletterSubscribed: true,
    address: {
      street: '456 Market Road',
      city: 'Manchester',
      postcode: 'M1 1AA',
      country: 'United Kingdom'
    }
  }
];

// ============================================
// SEED FUNCTION
// ============================================

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/creative-merch-uk', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Contact.deleteMany({});
    await Newsletter.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Seed Users
    console.log('👥 Creating users...');
    const users = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${users.length} users`);
    console.log(`   Admin: admin@customisemeuk.com / Admin123!`);
    console.log(`   Customer: john@example.com / Customer123!\n`);

    // Seed Products
    console.log('📦 Creating products...');
    const products = await Product.insertMany(sampleProducts);
    console.log(`✅ Created ${products.length} products\n`);

    // Seed Newsletter Subscribers
    console.log('📧 Creating newsletter subscribers...');
    const newsletters = await Newsletter.insertMany([
      { email: 'subscriber1@example.com' },
      { email: 'subscriber2@example.com' },
      { email: 'john@example.com' }
    ]);
    console.log(`✅ Created ${newsletters.length} newsletter subscribers\n`);

    // Summary
    console.log('╔════════════════════════════════════════╗');
    console.log('║     SEED COMPLETED SUCCESSFULLY!       ║');
    console.log('╚════════════════════════════════════════╝\n');
    console.log('📊 Summary:');
    console.log(`   • ${users.length} Users`);
    console.log(`   • ${products.length} Products`);
    console.log(`   • ${newsletters.length} Newsletter Subscribers\n`);
    console.log('🚀 You can now start the server with: npm run dev\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Seed Error:', error);
    process.exit(1);
  }
}

// Run seed
seedDatabase();