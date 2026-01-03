/**
 * NEWSLETTER ROUTES
 * Newsletter subscription management
 */

const express = require('express');
const router = express.Router();
const { Newsletter } = require('../models');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ============================================
// SUBSCRIBE TO NEWSLETTER
// ============================================

router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if already subscribed
    let subscription = await Newsletter.findOne({ email: email.toLowerCase() });

    if (subscription) {
      if (subscription.subscribed) {
        return res.status(200).json({
          success: true,
          message: 'You are already subscribed to our newsletter'
        });
      } else {
        // Re-subscribe
        subscription.subscribed = true;
        subscription.subscribedAt = new Date();
        subscription.unsubscribedAt = undefined;
        await subscription.save();

        return res.json({
          success: true,
          message: 'Welcome back! You have been re-subscribed'
        });
      }
    }

    // Create new subscription
    subscription = new Newsletter({
      email: email.toLowerCase()
    });

    await subscription.save();

    res.status(201).json({
      success: true,
      message: 'Thank you for subscribing to our newsletter!'
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe',
      error: error.message
    });
  }
});

// ============================================
// UNSUBSCRIBE FROM NEWSLETTER
// ============================================

router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const subscription = await Newsletter.findOne({ email: email.toLowerCase() });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our newsletter list'
      });
    }

    subscription.subscribed = false;
    subscription.unsubscribedAt = new Date();
    await subscription.save();

    res.json({
      success: true,
      message: 'You have been unsubscribed from our newsletter'
    });

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe',
      error: error.message
    });
  }
});

// ============================================
// GET ALL SUBSCRIBERS (Admin only)
// ============================================

router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { subscribed, page = 1, limit = 50 } = req.query;

    const query = {};
    if (subscribed !== undefined) {
      query.subscribed = subscribed === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const subscribers = await Newsletter.find(query)
      .sort('-subscribedAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Newsletter.countDocuments(query);
    const activeCount = await Newsletter.countDocuments({ subscribed: true });

    res.json({
      success: true,
      data: {
        subscribers,
        statistics: {
          total,
          active: activeCount,
          inactive: total - activeCount
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscribers'
    });
  }
});

// ============================================
// EXPORT SUBSCRIBERS (Admin only)
// ============================================

router.get('/export', authenticateToken, isAdmin, async (req, res) => {
  try {
    const subscribers = await Newsletter.find({ subscribed: true })
      .select('email subscribedAt')
      .sort('-subscribedAt');

    // Create CSV
    const csv = [
      'Email,Subscribed At',
      ...subscribers.map(sub => 
        `${sub.email},${sub.subscribedAt.toISOString()}`
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=newsletter-subscribers.csv');
    res.send(csv);

  } catch (error) {
    console.error('Export subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export subscribers'
    });
  }
});

module.exports = router;