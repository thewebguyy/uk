/**
 * WISHLIST ROUTES
 * Complete wishlist management with product details
 */

const express = require('express');
const router = express.Router();
const { User, Product } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// GET WISHLIST
// ============================================

router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'wishlist',
        match: { isActive: true }, // Only active products
        select: 'name price salePrice images slug stock category rating'
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        wishlist: user.wishlist,
        count: user.wishlist.length
      }
    });

  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist'
    });
  }
});

// ============================================
// ADD TO WISHLIST
// ============================================

router.post('/add/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already in wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    user.wishlist.push(productId);
    await user.save();

    res.json({
      success: true,
      message: 'Product added to wishlist',
      data: {
        wishlistCount: user.wishlist.length,
        product: {
          id: product._id,
          name: product.name,
          price: product.price
        }
      }
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist'
    });
  }
});

// ============================================
// REMOVE FROM WISHLIST
// ============================================

router.delete('/remove/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove from wishlist
    const initialLength = user.wishlist.length;
    user.wishlist = user.wishlist.filter(
      id => id.toString() !== productId
    );

    if (user.wishlist.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in wishlist'
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Product removed from wishlist',
      data: {
        wishlistCount: user.wishlist.length
      }
    });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist'
    });
  }
});

// ============================================
// CLEAR WISHLIST
// ============================================

router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.wishlist = [];
    await user.save();

    res.json({
      success: true,
      message: 'Wishlist cleared',
      data: {
        wishlistCount: 0
      }
    });

  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist'
    });
  }
});

// ============================================
// CHECK IF PRODUCT IN WISHLIST
// ============================================

router.get('/check/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const inWishlist = user.wishlist.includes(productId);

    res.json({
      success: true,
      data: {
        inWishlist,
        wishlistCount: user.wishlist.length
      }
    });

  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check wishlist'
    });
  }
});

// ============================================
// MOVE WISHLIST ITEM TO CART
// ============================================

router.post('/move-to-cart/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if in wishlist
    if (!user.wishlist.includes(productId)) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in wishlist'
      });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Remove from wishlist
    user.wishlist = user.wishlist.filter(
      id => id.toString() !== productId
    );
    await user.save();

    res.json({
      success: true,
      message: 'Product ready to add to cart',
      data: {
        product: {
          id: product._id,
          name: product.name,
          price: product.salePrice || product.price,
          stock: product.stock
        },
        wishlistCount: user.wishlist.length
      }
    });

  } catch (error) {
    console.error('Move to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move product'
    });
  }
});

module.exports = router;