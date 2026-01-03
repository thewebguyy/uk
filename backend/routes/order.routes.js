/**
 * ORDER ROUTES
 * Order management and tracking
 */

const express = require('express');
const router = express.Router();
const { Order, Product } = require('../models');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { sendAdminNotification } = require('../services/email.service');

// ============================================
// GET USER'S ORDERS
// ============================================

router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: req.user.id };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .populate('items.product', 'name images');

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// ============================================
// GET SINGLE ORDER
// ============================================

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name images sku');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns the order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// ============================================
// GET ORDER BY ORDER NUMBER
// ============================================

router.get('/track/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('items.product', 'name images')
      .select('-user'); // Don't expose user info for public tracking

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Return limited info for public tracking
    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity
        })),
        tracking: order.tracking,
        timeline: order.timeline
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// ============================================
// CANCEL ORDER
// ============================================

router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check ownership
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order in current status'
      });
    }

    order.status = 'cancelled';
    order.timeline.push({
      status: 'cancelled',
      message: 'Order cancelled by customer'
    });

    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
});

// ============================================
// ADMIN: GET ALL ORDERS
// ============================================

router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query['payment.status'] = paymentStatus;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name sku')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// ============================================
// ADMIN: UPDATE ORDER STATUS
// ============================================

router.patch('/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, message } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.status = status;
    order.timeline.push({
      status,
      message: message || `Order status updated to ${status}`
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// ============================================
// ADMIN: ADD TRACKING INFO
// ============================================

router.patch('/:id/tracking', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { carrier, trackingNumber, trackingUrl } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.tracking = {
      carrier,
      trackingNumber,
      trackingUrl,
      shippedAt: new Date()
    };

    order.status = 'shipped';
    order.timeline.push({
      status: 'shipped',
      message: `Order shipped via ${carrier}`
    });

    await order.save();

    res.json({
      success: true,
      message: 'Tracking information added successfully',
      data: { order }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add tracking info'
    });
  }
});

// ============================================
// ADMIN: GET ORDER STATISTICS
// ============================================

router.get('/stats/overview', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    const query = dateQuery.$gte || dateQuery.$lte ? { createdAt: dateQuery } : {};

    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders
    ] = await Promise.all([
      Order.countDocuments(query),
      Order.aggregate([
        { $match: { ...query, 'payment.status': 'completed' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ]),
      Order.countDocuments({ ...query, status: 'pending' }),
      Order.countDocuments({ ...query, status: 'delivered' }),
      Order.countDocuments({ ...query, status: 'cancelled' })
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        averageOrderValue: totalRevenue[0]?.total / totalOrders || 0
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;