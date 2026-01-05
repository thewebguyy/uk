/**
 * ENHANCED AUTHENTICATION MIDDLEWARE
 * JWT verification, role checking, login attempt tracking, and session management
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/config');
const logger = require('../services/logger.service');
const { AuthenticationError, AuthorizationError } = require('./errorHandler');

// ============================================
// LOGIN ATTEMPT TRACKING
// ============================================

// In-memory tracking (use Redis in production for distributed systems)
const loginAttempts = new Map();

// Cleanup old attempts every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of loginAttempts.entries()) {
    if (now - data.lastAttempt > config.security.accountLockoutDuration) {
      loginAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * Track failed login attempt
 */
const trackLoginAttempt = (identifier) => {
  const key = identifier.toLowerCase();
  const now = Date.now();
  
  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, {
      count: 1,
      lastAttempt: now,
      lockedUntil: null
    });
    return { isLocked: false, remainingAttempts: config.security.maxLoginAttempts - 1 };
  }
  
  const attempt = loginAttempts.get(key);
  
  // Check if account is locked
  if (attempt.lockedUntil && now < attempt.lockedUntil) {
    const remainingTime = Math.ceil((attempt.lockedUntil - now) / 60000); // minutes
    logger.logSecurity('LOCKED_ACCOUNT_LOGIN_ATTEMPT', { identifier: key });
    return {
      isLocked: true,
      remainingTime,
      message: `Account is locked. Try again in ${remainingTime} minutes.`
    };
  }
  
  // Reset if lockout period has passed
  if (attempt.lockedUntil && now >= attempt.lockedUntil) {
    attempt.count = 0;
    attempt.lockedUntil = null;
  }
  
  // Increment attempt count
  attempt.count++;
  attempt.lastAttempt = now;
  
  // Lock account if max attempts exceeded
  if (attempt.count >= config.security.maxLoginAttempts) {
    attempt.lockedUntil = now + config.security.accountLockoutDuration;
    const lockoutMinutes = Math.ceil(config.security.accountLockoutDuration / 60000);
    
    logger.logSecurity('ACCOUNT_LOCKED', {
      identifier: key,
      attempts: attempt.count,
      lockoutMinutes
    });
    
    return {
      isLocked: true,
      remainingTime: lockoutMinutes,
      message: `Too many failed attempts. Account locked for ${lockoutMinutes} minutes.`
    };
  }
  
  loginAttempts.set(key, attempt);
  
  return {
    isLocked: false,
    remainingAttempts: config.security.maxLoginAttempts - attempt.count
  };
};

/**
 * Reset login attempts on successful login
 */
const resetLoginAttempts = (identifier) => {
  const key = identifier.toLowerCase();
  loginAttempts.delete(key);
};

/**
 * Check if account is locked
 */
const isAccountLocked = (identifier) => {
  const key = identifier.toLowerCase();
  const attempt = loginAttempts.get(key);
  
  if (!attempt || !attempt.lockedUntil) {
    return { isLocked: false };
  }
  
  const now = Date.now();
  if (now < attempt.lockedUntil) {
    const remainingTime = Math.ceil((attempt.lockedUntil - now) / 60000);
    return {
      isLocked: true,
      remainingTime,
      message: `Account is locked. Try again in ${remainingTime} minutes.`
    };
  }
  
  // Lockout period has passed
  attempt.count = 0;
  attempt.lockedUntil = null;
  loginAttempts.set(key, attempt);
  
  return { isLocked: false };
};

// ============================================
// JWT TOKEN VERIFICATION
// ============================================

/**
 * Verify and decode JWT token
 */
const verifyToken = (token, secret = config.jwt.secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    }
    throw error;
  }
};

/**
 * Generate access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'access' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
};

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Main authentication middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Validate token type
    if (decoded.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    // Get user from database
    const user = await User.findById(decoded.id).select('email name role isActive');

    if (!user) {
      logger.logSecurity('TOKEN_USER_NOT_FOUND', { userId: decoded.id });
      throw new AuthenticationError('User not found');
    }

    if (!user.isActive) {
      logger.logSecurity('INACTIVE_USER_ACCESS_ATTEMPT', { userId: decoded.id });
      throw new AuthenticationError('Account is deactivated');
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role
    };

    logger.logAuth('TOKEN_VALIDATED', user._id.toString(), true);
    next();
  } catch (error) {
    logger.logAuth('TOKEN_VALIDATION_FAILED', null, false, { error: error.message });
    next(error);
  }
};

// ============================================
// REFRESH TOKEN HANDLING
// ============================================

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token required');
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, config.jwt.refreshSecret);
    
    // Validate token type
    if (decoded.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }

    // Get user
    const user = await User.findById(decoded.id).select('email name role isActive');

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id.toString());

    // Optionally rotate refresh token
    const newRefreshToken = generateRefreshToken(user._id.toString());

    logger.logAuth('TOKEN_REFRESHED', user._id.toString(), true);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    logger.logAuth('TOKEN_REFRESH_FAILED', null, false, { error: error.message });
    next(error);
  }
};

// ============================================
// OPTIONAL AUTHENTICATION
// ============================================

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('email name role isActive');

    if (user && user.isActive) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// ============================================
// ROLE-BASED ACCESS CONTROL
// ============================================

/**
 * Check if user is admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  if (req.user.role !== 'admin') {
    logger.logSecurity('UNAUTHORIZED_ADMIN_ACCESS', {
      userId: req.user.id,
      role: req.user.role
    });
    throw new AuthorizationError('Admin access required');
  }

  next();
};

/**
 * Check if user is customer or admin
 */
const isCustomerOrAdmin = (req, res, next) => {
  if (!req.user) {
    throw new AuthenticationError('Authentication required');
  }

  if (!['customer', 'admin'].includes(req.user.role)) {
    throw new AuthorizationError('Access denied');
  }

  next();
};

/**
 * Check multiple roles
 */
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      logger.logSecurity('UNAUTHORIZED_ROLE_ACCESS', {
        userId: req.user.id,
        requiredRoles: roles,
        userRole: req.user.role
      });
      throw new AuthorizationError(`Access denied. Required roles: ${roles.join(', ')}`);
    }

    next();
  };
};

// ============================================
// RESOURCE OWNERSHIP
// ============================================

/**
 * Check resource ownership
 */
const checkOwnership = (resourceField = 'user') => {
  return async (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Admins can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check ownership
    const resource = req.resource;

    if (!resource) {
      throw new NotFoundError('Resource not found');
    }

    const ownerId = resource[resourceField]?._id?.toString() || resource[resourceField]?.toString();

    if (!ownerId || ownerId !== req.user.id) {
      logger.logSecurity('UNAUTHORIZED_RESOURCE_ACCESS', {
        userId: req.user.id,
        resourceId: resource._id,
        resourceType: resource.constructor.modelName
      });
      throw new AuthorizationError('Not authorized to access this resource');
    }

    next();
  };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  authenticateToken,
  refreshAccessToken,
  optionalAuth,
  isAdmin,
  isCustomerOrAdmin,
  hasRole,
  checkOwnership,
  
  // Token utilities
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  
  // Login attempt tracking
  trackLoginAttempt,
  resetLoginAttempts,
  isAccountLocked
};