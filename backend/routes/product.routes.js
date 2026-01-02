/**
 * PRODUCT ROUTES
 * Product catalog, inventory, and search
 */

const express = require('express');
const router = express.Router();
const { Product } = require('../models');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ============================================
// GET ALL PRODUCTS (with filtering, search, pagination)
// ============================================

router.get('/', async (req, res) => {
  try {
    const {
      category,
      subcategory,
      search,
      minPrice,
      maxPrice,
      inStock,
      featured,
      sort = '-createdAt',
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (category) {
      query.category = category.toLowerCase();
    }

    if (subcategory) {
      query.subcategory = subcategory;
    }

    if (search) {
      query.$text = { $search: search };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    if (featured === 'true') {
      query.featured = true;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-reviews'); // Exclude reviews for list view

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});

// ============================================
// GET SINGLE PRODUCT
// ============================================

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    }).populate('reviews.user', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

// ============================================
// GET PRODUCT BY SLUG
// ============================================

router.get('/slug/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true
    }).populate('reviews.user', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

// ============================================
// GET FEATURED PRODUCTS
// ============================================

router.get('/featured/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;

    const products = await Product.find({
      featured: true,
      isActive: true,
      stock: { $gt: 0 }
    })
      .sort('-createdAt')
      .limit(limit)
      .select('-reviews');

    res.json({
      success: true,
      data: { products }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured products'
    });
  }
});

// ============================================
// GET CATEGORIES WITH COUNT
// ============================================

router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        categories: categories.map(cat => ({
          name: cat._id,
          count: cat.count
        }))
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// ============================================
// SEARCH PRODUCTS (Advanced)
// ============================================

router.post('/search', async (req, res) => {
  try {
    const { query, filters = {} } = req.body;

    const searchQuery = {
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
        { sku: { $regex: query, $options: 'i' } }
      ]
    };

    // Apply filters
    if (filters.category) {
      searchQuery.category = filters.category;
    }

    if (filters.priceRange) {
      searchQuery.price = {
        $gte: filters.priceRange.min || 0,
        $lte: filters.priceRange.max || 999999
      };
    }

    const products = await Product.find(searchQuery)
      .limit(20)
      .select('-reviews');

    res.json({
      success: true,
      data: {
        products,
        count: products.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// ============================================
// ADD PRODUCT REVIEW
// ============================================

router.post('/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed
    const existingReview = product.reviews.find(
      r => r.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Add review
    product.reviews.push({
      user: req.user.id,
      rating,
      comment
    });

    // Update average rating
    const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
    product.rating.average = totalRating / product.reviews.length;
    product.rating.count = product.reviews.length;

    await product.save();

    res.json({
      success: true,
      message: 'Review added successfully',
      data: {
        rating: product.rating
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add review'
    });
  }
});

// ============================================
// ADMIN: CREATE PRODUCT
// ============================================

router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
});

// ============================================
// ADMIN: UPDATE PRODUCT
// ============================================

router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
});

// ============================================
// ADMIN: DELETE PRODUCT (soft delete)
// ============================================

router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

// ============================================
// ADMIN: UPDATE STOCK
// ============================================

router.patch('/:id/stock', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { quantity, operation = 'set' } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (operation === 'set') {
      product.stock = quantity;
    } else if (operation === 'add') {
      product.stock += quantity;
    } else if (operation === 'subtract') {
      product.stock -= quantity;
    }

    // Ensure stock doesn't go negative
    if (product.stock < 0) product.stock = 0;

    await product.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        product: {
          id: product._id,
          name: product.name,
          stock: product.stock
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update stock'
    });
  }
});

module.exports = router;