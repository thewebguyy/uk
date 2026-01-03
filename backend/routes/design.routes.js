/**
 * DESIGN CONFIGURATION ROUTES
 * Save and load 3D studio configurations
 */

const express = require('express');
const router = express.Router();
const { DesignConfig } = require('../models');
const { optionalAuth, authenticateToken } = require('../middleware/auth');

// ============================================
// SAVE DESIGN CONFIGURATION
// ============================================

router.post('/save', optionalAuth, async (req, res) => {
  try {
    const {
      name,
      productId,
      configuration,
      screenshot,
      sessionId
    } = req.body;

    if (!configuration) {
      return res.status(400).json({
        success: false,
        message: 'Configuration data is required'
      });
    }

    const designConfig = new DesignConfig({
      user: req.user?.id || null,
      sessionId: sessionId || null,
      productId: productId || null,
      name: name || 'Untitled Design',
      configuration,
      screenshot: screenshot || null,
      isSaved: true
    });

    await designConfig.save();

    res.status(201).json({
      success: true,
      message: 'Design configuration saved',
      data: {
        id: designConfig._id,
        name: designConfig.name,
        savedAt: designConfig.createdAt
      }
    });

  } catch (error) {
    console.error('Save design config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save design configuration',
      error: error.message
    });
  }
});

// ============================================
// GET USER'S SAVED DESIGNS
// ============================================

router.get('/my-designs', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const designs = await DesignConfig.find({
      user: req.user.id,
      isSaved: true
    })
      .populate('productId', 'name slug images')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DesignConfig.countDocuments({
      user: req.user.id,
      isSaved: true
    });

    res.json({
      success: true,
      data: {
        designs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get my designs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch designs'
    });
  }
});

// ============================================
// GET SINGLE DESIGN CONFIGURATION
// ============================================

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const design = await DesignConfig.findById(req.params.id)
      .populate('productId', 'name slug images price');

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design configuration not found'
      });
    }

    // Check access (owner or guest with session ID)
    if (design.user) {
      if (!req.user || design.user.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this design'
        });
      }
    }

    res.json({
      success: true,
      data: { design }
    });

  } catch (error) {
    console.error('Get design error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch design'
    });
  }
});

// ============================================
// UPDATE DESIGN CONFIGURATION
// ============================================

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, configuration, screenshot } = req.body;

    const design = await DesignConfig.findById(req.params.id);

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design configuration not found'
      });
    }

    // Check ownership
    if (!design.user || design.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this design'
      });
    }

    // Update fields
    if (name) design.name = name;
    if (configuration) design.configuration = configuration;
    if (screenshot) design.screenshot = screenshot;

    await design.save();

    res.json({
      success: true,
      message: 'Design updated successfully',
      data: { design }
    });

  } catch (error) {
    console.error('Update design error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update design'
    });
  }
});

// ============================================
// DELETE DESIGN CONFIGURATION
// ============================================

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const design = await DesignConfig.findById(req.params.id);

    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design configuration not found'
      });
    }

    // Check ownership
    if (!design.user || design.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this design'
      });
    }

    await design.deleteOne();

    res.json({
      success: true,
      message: 'Design deleted successfully'
    });

  } catch (error) {
    console.error('Delete design error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete design'
    });
  }
});

// ============================================
// DUPLICATE DESIGN CONFIGURATION
// ============================================

router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const originalDesign = await DesignConfig.findById(req.params.id);

    if (!originalDesign) {
      return res.status(404).json({
        success: false,
        message: 'Design configuration not found'
      });
    }

    // Check ownership
    if (!originalDesign.user || originalDesign.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to duplicate this design'
      });
    }

    // Create duplicate
    const duplicate = new DesignConfig({
      user: req.user.id,
      productId: originalDesign.productId,
      name: `${originalDesign.name} (Copy)`,
      configuration: originalDesign.configuration,
      screenshot: originalDesign.screenshot,
      isSaved: true
    });

    await duplicate.save();

    res.status(201).json({
      success: true,
      message: 'Design duplicated successfully',
      data: { design: duplicate }
    });

  } catch (error) {
    console.error('Duplicate design error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate design'
    });
  }
});

// ============================================
// GET DESIGNS BY PRODUCT
// ============================================

router.get('/product/:productId', authenticateToken, async (req, res) => {
  try {
    const designs = await DesignConfig.find({
      user: req.user.id,
      productId: req.params.productId,
      isSaved: true
    })
      .populate('productId', 'name slug images')
      .sort('-createdAt');

    res.json({
      success: true,
      data: {
        designs,
        count: designs.length
      }
    });

  } catch (error) {
    console.error('Get product designs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch designs'
    });
  }
});

module.exports = router;