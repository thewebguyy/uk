/**
 * USER ROUTES
 * User profile, preferences, and wishlist management
 */

const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// GET USER PROFILE
// ============================================

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('wishlist', 'name price images slug');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// ============================================
// UPDATE USER PROFILE
// ============================================

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address, newsletterSubscribed } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        name,
        phone,
        address,
        newsletterSubscribed
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// ============================================
// ADD TO WISHLIST
// ============================================

router.post('/wishlist/:productId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already in wishlist
    if (user.wishlist.includes(req.params.productId)) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    user.wishlist.push(req.params.productId);
    await user.save();

    res.json({
      success: true,
      message: 'Product added to wishlist',
      data: {
        wishlistCount: user.wishlist.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist'
    });
  }
});

// ============================================
// REMOVE FROM WISHLIST
// ============================================

router.delete('/wishlist/:productId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.wishlist = user.wishlist.filter(
      id => id.toString() !== req.params.productId
    );

    await user.save();

    res.json({
      success: true,
      message: 'Product removed from wishlist',
      data: {
        wishlistCount: user.wishlist.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist'
    });
  }
});

// ============================================
// GET WISHLIST
// ============================================

router.get('/wishlist', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('wishlist', 'name price images slug stock');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        wishlist: user.wishlist
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist'
    });
  }
});

// ============================================
// DELETE ACCOUNT
// ============================================

router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Soft delete - deactivate account
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

module.exports = router;