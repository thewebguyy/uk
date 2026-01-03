/**
 * PRODUCT REVIEWS ROUTES
 * Complete review management system
 */

const express = require('express');
const router = express.Router();
const { Product, Order } = require('../models');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ============================================
// ADD REVIEW TO PRODUCT
// ============================================

router.post('/:productId/reviews', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Review comment must be at least 10 characters'
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed
    const existingReview = product.reviews.find(
      r => r.user && r.user.toString() === req.user.id
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Optional: Verify user has purchased this product
    const hasPurchased = await Order.findOne({
      user: req.user.id,
      'items.product': productId,
      'payment.status': 'completed'
    });

    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        message: 'You can only review products you have purchased'
      });
    }

    // Add review
    product.reviews.push({
      user: req.user.id,
      rating: parseInt(rating),
      comment: comment.trim(),
      createdAt: new Date()
    });

    // Update average rating
    const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
    product.rating.average = totalRating / product.reviews.length;
    product.rating.count = product.reviews.length;

    await product.save();

    // Populate user for response
    await product.populate('reviews.user', 'name');

    const newReview = product.reviews[product.reviews.length - 1];

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: {
        review: newReview,
        rating: product.rating
      }
    });

  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review',
      error: error.message
    });
  }
});

// ============================================
// GET PRODUCT REVIEWS
// ============================================

router.get('/:productId/reviews', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sortBy = 'recent' } = req.query;

    const product = await Product.findById(productId)
      .select('reviews rating name')
      .populate('reviews.user', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Sort reviews
    let reviews = [...product.reviews];
    if (sortBy === 'recent') {
      reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'highest') {
      reviews.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'lowest') {
      reviews.sort((a, b) => a.rating - b.rating);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedReviews = reviews.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        productName: product.name,
        rating: product.rating,
        reviews: paginatedReviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: reviews.length,
          pages: Math.ceil(reviews.length / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
});

// ============================================
// UPDATE OWN REVIEW
// ============================================

router.put('/:productId/reviews/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    const { rating, comment } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const review = product.reviews.id(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check ownership
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own reviews'
      });
    }

    // Update review
    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }
      review.rating = parseInt(rating);
    }

    if (comment) {
      if (comment.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Review comment must be at least 10 characters'
        });
      }
      review.comment = comment.trim();
    }

    // Recalculate average rating
    const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
    product.rating.average = totalRating / product.reviews.length;

    await product.save();

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: {
        review,
        rating: product.rating
      }
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review'
    });
  }
});

// ============================================
// DELETE OWN REVIEW
// ============================================

router.delete('/:productId/reviews/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const review = product.reviews.id(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check ownership or admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    // Remove review
    product.reviews.pull(reviewId);

    // Recalculate average rating
    if (product.reviews.length > 0) {
      const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
      product.rating.average = totalRating / product.reviews.length;
      product.rating.count = product.reviews.length;
    } else {
      product.rating.average = 0;
      product.rating.count = 0;
    }

    await product.save();

    res.json({
      success: true,
      message: 'Review deleted successfully',
      data: {
        rating: product.rating
      }
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review'
    });
  }
});

// ============================================
// GET USER'S OWN REVIEWS
// ============================================

router.get('/my-reviews', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find({
      'reviews.user': req.user.id
    }).select('name slug images reviews rating');

    const myReviews = products.map(product => {
      const review = product.reviews.find(
        r => r.user.toString() === req.user.id
      );
      
      return {
        product: {
          id: product._id,
          name: product.name,
          slug: product.slug,
          image: product.images[0]?.url || null
        },
        review: {
          id: review._id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt
        }
      };
    });

    res.json({
      success: true,
      data: {
        reviews: myReviews,
        count: myReviews.length
      }
    });

  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your reviews'
    });
  }
});

// ============================================
// ADMIN: DELETE ANY REVIEW
// ============================================

router.delete('/admin/:productId/reviews/:reviewId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.reviews.pull(reviewId);

    // Recalculate average rating
    if (product.reviews.length > 0) {
      const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
      product.rating.average = totalRating / product.reviews.length;
      product.rating.count = product.reviews.length;
    } else {
      product.rating.average = 0;
      product.rating.count = 0;
    }

    await product.save();

    res.json({
      success: true,
      message: 'Review deleted by admin',
      data: {
        rating: product.rating
      }
    });

  } catch (error) {
    console.error('Admin delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review'
    });
  }
});

module.exports = router;