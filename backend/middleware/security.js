/**
 * SECURITY MIDDLEWARE
 * CSRF protection, rate limiting, input sanitization, and security headers
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');
const csrf = require('csurf');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const config = require('../config/config');
const logger = require('../services/logger.service');
const { RateLimitError } = require('./errorHandler');

// ============================================
// REDIS CLIENT FOR RATE LIMITING
// ============================================

let redisClient;

if (config.env === 'production') {
  redisClient = redis.createClient({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error', { error: err });
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected for rate limiting');
  });
}

// ============================================
// HELMET - SECURITY HEADERS
// ============================================

const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "cdn.jsdelivr.net", "js.stripe.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.env === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' }
});

// ============================================
// RATE LIMITERS
// ============================================

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: config.env === 'production' && redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:general:'
  }) : undefined,
  handler: (req, res) => {
    logger.logSecurity('RATE_LIMIT_EXCEEDED', {
      limit: 'general',
      ip: req.ip
    }, req);
    throw new RateLimitError();
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  store: config.env === 'production' && redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }) : undefined,
  handler: (req, res) => {
    logger.logSecurity('AUTH_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      endpoint: req.originalUrl
    }, req);
    throw new RateLimitError('Too many authentication attempts');
  }
});

/**
 * Payment endpoint rate limiter
 */
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many payment requests, please try again later.',
  store: config.env === 'production' && redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:payment:'
  }) : undefined,
  handler: (req, res) => {
    logger.logSecurity('PAYMENT_RATE_LIMIT_EXCEEDED', {
      ip: req.ip
    }, req);
    throw new RateLimitError('Too many payment attempts');
  }
});

/**
 * File upload rate limiter
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many file uploads, please try again later.',
  store: config.env === 'production' && redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:upload:'
  }) : undefined
});

// ============================================
// CSRF PROTECTION
// ============================================

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'strict'
  }
});

/**
 * Middleware to attach CSRF token to response
 */
const attachCsrfToken = (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

/**
 * Skip CSRF for specific routes (like webhooks)
 */
const skipCsrf = (req, res, next) => {
  req.skipCsrf = true;
  next();
};

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize MongoDB operators from request
 */
const sanitizeMongo = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.logSecurity('NOSQL_INJECTION_ATTEMPT', {
      key,
      ip: req.ip
    }, req);
  }
});

/**
 * Sanitize XSS attempts
 */
const sanitizeXss = xss();

/**
 * Prevent HTTP Parameter Pollution
 */
const preventHpp = hpp({
  whitelist: [
    'price',
    'rating',
    'page',
    'limit',
    'sort',
    'category'
  ]
});

// ============================================
// CORS CONFIGURATION
// ============================================

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (config.urls.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.logSecurity('CORS_VIOLATION', {
        origin,
        allowedOrigins: config.urls.corsOrigins
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token'
  ],
  maxAge: 86400 // 24 hours
};

// ============================================
// SECURITY HEADERS MIDDLEWARE
// ============================================

const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// ============================================
// HTTPS ENFORCEMENT (PRODUCTION)
// ============================================

const enforceHttps = (req, res, next) => {
  if (config.env === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
};

// ============================================
// REQUEST VALIDATION
// ============================================

/**
 * Validate content type for POST/PUT/PATCH requests
 */
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      logger.logSecurity('MISSING_CONTENT_TYPE', { method: req.method }, req);
      return res.status(400).json({
        success: false,
        message: 'Content-Type header is required'
      });
    }
    
    if (!contentType.includes('application/json') && 
        !contentType.includes('multipart/form-data') &&
        !contentType.includes('application/x-www-form-urlencoded')) {
      logger.logSecurity('INVALID_CONTENT_TYPE', { contentType }, req);
      return res.status(415).json({
        success: false,
        message: 'Unsupported Content-Type'
      });
    }
  }
  
  next();
};

/**
 * Validate JSON payloads
 */
const validateJson = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.logSecurity('INVALID_JSON', { error: err.message }, req);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload'
    });
  }
  next();
};

// ============================================
// IP WHITELIST/BLACKLIST (OPTIONAL)
// ============================================

const ipBlacklist = new Set([
  // Add malicious IPs here
]);

const checkIpBlacklist = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  
  if (ipBlacklist.has(clientIp)) {
    logger.logSecurity('BLACKLISTED_IP_ATTEMPT', { ip: clientIp }, req);
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  next();
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  helmetConfig,
  generalLimiter,
  authLimiter,
  paymentLimiter,
  uploadLimiter,
  csrfProtection,
  attachCsrfToken,
  skipCsrf,
  sanitizeMongo,
  sanitizeXss,
  preventHpp,
  corsOptions,
  securityHeaders,
  enforceHttps,
  validateContentType,
  validateJson,
  checkIpBlacklist,
  redisClient
};