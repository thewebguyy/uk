/**
 * LOGGING SERVICE
 * Centralized logging with Winston
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create Winston logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'creative-merch-uk' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: config.logging.filePath,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write errors to error.log
    new winston.transports.File({ 
      filename: config.logging.errorFilePath,
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// Add console transport in development
if (config.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create stream for Morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

/**
 * Log error and optionally send email alert
 */
logger.logError = async (error, req = null) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    ...(req && {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user?.id
    })
  };

  logger.error('Application Error', errorInfo);

  // Send email alert for critical errors in production
  if (config.env === 'production' && config.monitoring.errorEmailEnabled) {
    try {
      const { sendErrorAlertEmail } = require('./email.service');
      await sendErrorAlertEmail(errorInfo);
    } catch (emailError) {
      logger.error('Failed to send error alert email', { error: emailError.message });
    }
  }
};

/**
 * Log security event
 */
logger.logSecurity = (event, details, req = null) => {
  logger.warn('Security Event', {
    event,
    ...details,
    ...(req && {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      user: req.user?.id
    })
  });
};

/**
 * Log authentication event
 */
logger.logAuth = (event, userId, success, details = {}) => {
  logger.info('Authentication Event', {
    event,
    userId,
    success,
    ...details
  });
};

module.exports = logger;