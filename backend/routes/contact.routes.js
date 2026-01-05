/**
 * CONTACT ROUTES
 * Handles contact form submissions, inquiries, and admin management.
 *
 * Improvements:
 * - Added authentication and authorization using middleware from auth.middleware.
 * - Implemented input validation using Joi for robust schema checking.
 * - Enhanced error handling with specific messages and logging (console.error; replace with proper logger in production).
 * - Added rate limiting to submit route to prevent spam (using userRateLimit from auth.middleware).
 * - Sanitized inputs using mongo-sanitize to prevent NoSQL injections.
 * - Improved pagination with default values and total count.
 * - Added search functionality to GET route for filtering by name/email/service.
 * - For update status, added validation for status values.
 * - Asynchronous email sending with try-catch to not block response.
 * - Added optional CAPTCHA verification (commented; implement with reCAPTCHA or similar).
 * - Used consistent response format.
 * - Added JSDoc comments for documentation.
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const sanitize = require('mongo-sanitize');
const { Contact } = require('../models');
const { sendContactConfirmationEmail, sendAdminNotification } = require('../services/email.service');
const { authenticateToken, isAdmin, userRateLimit } = require('./auth.middleware'); // Assuming in same directory or adjust path

// ============================================
// SUBMIT CONTACT FORM
// ============================================

/**
 * Submit contact form endpoint.
 * @route POST /contact/submit
 * @access Public (rate limited)
 */
router.post(
  '/submit',
  userRateLimit(5, 60 * 1000), // 5 requests per minute per user/IP if unauth
  async (req, res) => {
    try {
      // Input validation
      const schema = Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().trim().max(20).optional(),
        service: Joi.string().trim().max(100).optional(),
        message: Joi.string().trim().min(10).max(2000).required(),
        // captchaToken: Joi.string().required(), // Uncomment for CAPTCHA
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      // Sanitize inputs
      const sanitizedData = {
        name: sanitize(value.name),
        email: sanitize(value.email),
        phone: sanitize(value.phone),
        service: sanitize(value.service),
        message: sanitize(value.message),
      };

      // Optional: Verify CAPTCHA
      // const captchaValid = await verifyCaptcha(value.captchaToken);
      // if (!captchaValid) {
      //   return res.status(400).json({ success: false, message: 'Invalid CAPTCHA' });
      // }

      const contact = new Contact(sanitizedData);
      await contact.save();

      // Send emails asynchronously without awaiting to not block response
      sendContactConfirmationEmail(contact).catch((emailError) => {
        console.error('Contact confirmation email error:', emailError);
      });

      sendAdminNotification('new-contact', contact).catch((emailError) => {
        console.error('Admin notification error:', emailError);
      });

      res.status(201).json({
        success: true,
        message: "Message sent successfully. We'll get back to you within 24 hours.",
        data: { id: contact._id },
      });
    } catch (error) {
      console.error('Contact submission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error.message, // Avoid in production
      });
    }
  }
);

// ============================================
// GET ALL CONTACT MESSAGES (Admin only)
// ============================================

/**
 * Get all contact messages with pagination and filters.
 * @route GET /contact
 * @access Admin
 */
router.get(
  '/',
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      const { status, search, page = 1, limit = 20 } = req.query;

      const query = {};
      if (status) {
        query.status = sanitize(status);
      }
      if (search) {
        const searchRegex = new RegExp(sanitize(search), 'i');
        query.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { service: searchRegex },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const contacts = await Contact.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Contact.countDocuments(query);

      res.json({
        success: true,
        data: {
          contacts,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error('Fetch contacts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch contact messages',
      });
    }
  }
);

// ============================================
// UPDATE CONTACT STATUS (Admin only)
// ============================================

/**
 * Update contact status.
 * @route PATCH /contact/:id/status
 * @access Admin
 */
router.patch(
  '/:id/status',
  authenticateToken,
  isAdmin,
  async (req, res) => {
    try {
      // Validate status
      const schema = Joi.object({
        status: Joi.string()
          .valid('pending', 'in-progress', 'resolved', 'closed')
          .required(),
        notes: Joi.string().trim().max(1000).optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const isResolvedOrClosed = ['resolved', 'closed'].includes(value.status);

      const contact = await Contact.findByIdAndUpdate(
        req.params.id,
        {
          status: value.status,
          notes: sanitize(value.notes),
          replied: isResolvedOrClosed,
          repliedAt: isResolvedOrClosed ? new Date() : undefined,
        },
        { new: true }
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact message not found',
        });
      }

      res.json({
        success: true,
        message: 'Status updated successfully',
        data: { contact },
      });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update status',
      });
    }
  }
);

module.exports = router;