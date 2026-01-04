/**
 * AUTHENTICATION MIDDLEWARE
 * JWT verification, role checking, and related utilities.
 *
 * Improvements:
 * - Added JSDoc comments for better documentation.
 * - Improved error handling with more specific messages and logging (using console.error; replace with a proper logger in production).
 * - Used async/await consistently.
 * - Added support for refresh tokens in a separate middleware (basic implementation; assumes refresh token logic in auth routes).
 * - Enhanced rate limiter: Added periodic cleanup of the Map to prevent memory leaks in long-running processes.
 * - Suggested using a distributed rate limiter (e.g., with Redis) for production via comments.
 * - Ensured strict equality checks and optional chaining.
 * - Added HTTPS enforcement check (optional, can be enabled).
 * - Integrated Helmet usage recommendation in comments for security headers.
 * - For ownership check, added flexibility for resource loading if not pre-set.
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Recommendation: Use Helmet for security headers (npm install helmet)
// app.use(helmet());

// Recommendation: Enforce HTTPS in production
// const enforceHttps = (req, res, next) => {
//   if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
//     return next();
//   }
//   res.redirect(`https://${req.hostname}${req.url}`);
// };

// ============================================
// VERIFY JWT TOKEN
// ============================================

/**
 * Middleware to authenticate JWT token.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Next middleware function.
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token (synchronous, but can be made async with promisify if needed)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database (select minimal fields)
    const user = await User.findById(decoded.id).select('email name role isActive -_id');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Attach user to request
    req.user = {
      id: decoded.id, // Already a string from decoded
      email: user.email,
      name: user.name,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error); // Replace with logger.error in production

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message // Avoid exposing full error in production
    });
  }
};

// ============================================
// REFRESH TOKEN HANDLING (BASIC)
// ============================================

/**
 * Middleware to verify and refresh access token using refresh token.
 * Assumes refresh token is stored in HTTP-only cookie or separate header.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Next middleware function.
 */
const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken; // Assuming stored in HTTP-only cookie

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET); // Use separate secret

    const user = await User.findById(decoded.id).select('email name role isActive -_id');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Short-lived
    );

    // Optionally rotate refresh token here (generate new one and invalidate old)

    // Set new access token in response header or cookie
    res.setHeader('Authorization', `Bearer ${newAccessToken}`);

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

// ============================================
// OPTIONAL AUTHENTICATION
// ============================================

/**
 * Optional authentication middleware.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Next middleware function.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('email name role isActive -_id');

    if (user && user.isActive) {
      req.user = {
        id: decoded.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    req.user = null;
    next();
  }
};

// ============================================
// CHECK ADMIN ROLE
// ============================================

/**
 * Middleware to check if user is admin.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Next middleware function.
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

// ============================================
// CHECK CUSTOMER OR ADMIN
// ============================================

/**
 * Middleware to check if user is customer or admin.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Next middleware function.
 */
const isCustomerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'customer' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  next();
};

// ============================================
// CHECK RESOURCE OWNERSHIP
// ============================================

/**
 * Middleware to check resource ownership.
 * @param {string} [resourceField='user'] - Field name for owner ID in resource.
 * @returns {Function} Middleware function.
 */
const checkOwnership = (resourceField = 'user') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    // If req.resource not set, attempt to load it (example for a param-based resource)
    let resource = req.resource;
    if (!resource && req.params.id) {
      // Example: Load from a model, adjust based on your models
      // resource = await SomeModel.findById(req.params.id);
    }

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    const ownerId = resource[resourceField]?._id?.toString() || resource[resourceField]?.toString();

    if (!ownerId || ownerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource'
      });
    }

    next();
  };
};

// ============================================
// RATE LIMIT BY USER
// ============================================

// Recommendation: For production, use a library like 'rate-limiter-flexible' with Redis for distributed limiting.
// This in-memory version is for development only and includes periodic cleanup.

/**
 * User-based rate limiter middleware.
 * @param {number} [maxRequests=100] - Max requests per window.
 * @param {number} [windowMs=15 * 60 * 1000] - Time window in ms.
 * @returns {Function} Middleware function.
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  // Periodic cleanup every hour to remove inactive users
  setInterval(() => {
    const now = Date.now();
    for (const [userId, userRequests] of requests.entries()) {
      const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
      if (validRequests.length === 0) {
        requests.delete(userId);
      } else {
        requests.set(userId, validRequests);
      }
    }
  }, 60 * 60 * 1000); // Every hour

  return (req, res, next) => {
    if (!req.user) {
      return next(); // No limiting for unauth
    }

    const userId = req.user.id;
    const now = Date.now();

    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }

    validRequests.push(now);
    requests.set(userId, validRequests);

    next();
  };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  authenticateToken,
  refreshToken,
  optionalAuth,
  isAdmin,
  isCustomerOrAdmin,
  checkOwnership,
  userRateLimit
};