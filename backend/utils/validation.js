/**
 * INPUT VALIDATION UTILITIES
 * Centralized validation rules using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../middleware/errorHandler');

// ============================================
// PASSWORD VALIDATION
// ============================================

const passwordRules = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character')
];

// ============================================
// COMMON VALIDATIONS
// ============================================

const emailValidation = body('email')
  .trim()
  .isEmail()
  .withMessage('Must be a valid email address')
  .normalizeEmail();

const phoneValidation = body('phone')
  .optional()
  .trim()
  .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
  .withMessage('Must be a valid phone number');

const nameValidation = body('name')
  .trim()
  .isLength({ min: 2, max: 100 })
  .withMessage('Name must be between 2 and 100 characters')
  .matches(/^[a-zA-Z\s'-]+$/)
  .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes');

const postcodeValidation = body('postcode')
  .trim()
  .matches(/^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$/i)
  .withMessage('Must be a valid UK postcode');

// ============================================
// REGISTRATION VALIDATION
// ============================================

const registerValidation = [
  nameValidation,
  emailValidation,
  ...passwordRules,
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match')
];

// ============================================
// LOGIN VALIDATION
// ============================================

const loginValidation = [
  emailValidation,
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// ============================================
// PASSWORD RESET VALIDATION
// ============================================

const forgotPasswordValidation = [
  emailValidation
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  ...passwordRules,
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password'),
  ...passwordRules.map(rule => 
    rule.builder.field === 'password' 
      ? body('newPassword').custom(rule.builder.custom || (() => true))
      : rule
  ),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match')
];

// ============================================
// PROFILE VALIDATION
// ============================================

const updateProfileValidation = [
  nameValidation,
  phoneValidation,
  body('address.street')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  body('address.postcode')
    .optional()
    .trim()
    .matches(/^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$/i)
    .withMessage('Must be a valid UK postcode'),
  body('newsletterSubscribed')
    .optional()
    .isBoolean()
    .withMessage('Newsletter subscription must be true or false')
];

// ============================================
// PRODUCT VALIDATION
// ============================================

const createProductValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Product name must be between 3 and 200 characters'),
  body('sku')
    .trim()
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('SKU must contain only uppercase letters, numbers, and hyphens'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .isIn(['apparel', 'stickers', 'party-decor', 'accessories'])
    .withMessage('Invalid category'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer')
];

const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Product name must be between 3 and 200 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer')
];

// ============================================
// ORDER VALIDATION
// ============================================

const createOrderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.productId')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  body('shippingAddress.name')
    .trim()
    .notEmpty()
    .withMessage('Recipient name is required'),
  body('shippingAddress.email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required'),
  body('shippingAddress.phone')
    .trim()
    .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
    .withMessage('Valid phone number is required'),
  body('shippingAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('shippingAddress.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('shippingAddress.postcode')
    .trim()
    .matches(/^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$/i)
    .withMessage('Valid UK postcode is required')
];

// ============================================
// CONTACT VALIDATION
// ============================================

const contactValidation = [
  nameValidation,
  emailValidation,
  phoneValidation,
  body('service')
    .optional()
    .isIn(['design', 'installation', 'workshop', 'subscribe-monthly', 'business', 'custom', 'general'])
    .withMessage('Invalid service type'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters')
];

// ============================================
// REVIEW VALIDATION
// ============================================

const reviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Review comment must be between 10 and 500 characters')
];

// ============================================
// QUERY PARAMETER VALIDATION
// ============================================

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
];

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Sanitize HTML from user input
 */
const sanitizeHtml = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Strip all HTML tags
 */
const stripHtml = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '');
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/--+/g, '-')
    .toLowerCase();
};

// ============================================
// VALIDATION RESULT HANDLER
// ============================================

/**
 * Check validation results and throw error if validation fails
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));
    
    throw new ValidationError('Validation failed', extractedErrors);
  }
  
  next();
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Auth validations
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  
  // Profile validations
  updateProfileValidation,
  
  // Product validations
  createProductValidation,
  updateProductValidation,
  
  // Order validations
  createOrderValidation,
  
  // Contact validations
  contactValidation,
  
  // Review validations
  reviewValidation,
  
  // Common validations
  paginationValidation,
  mongoIdValidation,
  emailValidation,
  phoneValidation,
  nameValidation,
  postcodeValidation,
  passwordRules,
  
  // Sanitization helpers
  sanitizeHtml,
  stripHtml,
  sanitizeFilename,
  
  // Handler
  handleValidationErrors
};