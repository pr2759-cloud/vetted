/**
 * Validation Middleware
 * Handles request validation using express-validator
 */

const { validationResult } = require('express-validator');
const { logger } = require('../utils/logger');

/**
 * Validation middleware to check for validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn('Validation failed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      errors: errorMessages,
      body: req.body,
      query: req.query,
      params: req.params
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages,
      requestId: req.id
    });
  }

  next();
};

/**
 * Custom validation functions
 */
const customValidations = {
  /**
   * Check if value is a valid MongoDB ObjectId
   */
  isMongoId: (value) => {
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    return mongoIdRegex.test(value);
  },

  /**
   * Check if value is a valid email
   */
  isEmail: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  /**
   * Check if value is a valid URL
   */
  isURL: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if value is a strong password
   */
  isStrongPassword: (value) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(value);
  },

  /**
   * Check if value is a valid phone number
   */
  isPhoneNumber: (value) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(value);
  },

  /**
   * Check if value is within allowed range
   */
  isInRange: (value, min, max) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  },

  /**
   * Check if value is a valid date
   */
  isValidDate: (value) => {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date);
  },

  /**
   * Check if value is a valid JSON string
   */
  isValidJSON: (value) => {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Sanitization functions
 */
const sanitizers = {
  /**
   * Trim whitespace and normalize string
   */
  normalizeString: (value) => {
    if (typeof value !== 'string') return value;
    return value.trim().replace(/\s+/g, ' ');
  },

  /**
   * Convert to lowercase
   */
  toLowerCase: (value) => {
    if (typeof value !== 'string') return value;
    return value.toLowerCase();
  },

  /**
   * Remove HTML tags
   */
  stripHtml: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/<[^>]*>/g, '');
  },

  /**
   * Escape special characters for regex
   */
  escapeRegex: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  /**
   * Normalize phone number
   */
  normalizePhone: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/\D/g, '');
  }
};

/**
 * Validation schemas for common use cases
 */
const validationSchemas = {
  pagination: {
    limit: {
      in: ['query'],
      isInt: {
        options: { min: 1, max: 100 },
        errorMessage: 'Limit must be between 1 and 100'
      },
      toInt: true,
      optional: true
    },
    offset: {
      in: ['query'],
      isInt: {
        options: { min: 0 },
        errorMessage: 'Offset must be a non-negative integer'
      },
      toInt: true,
      optional: true
    }
  },

  searchQuery: {
    query: {
      in: ['body'],
      isLength: {
        options: { min: 1, max: 500 },
        errorMessage: 'Query must be between 1 and 500 characters'
      },
      trim: true
    }
  },

  productId: {
    productId: {
      in: ['params'],
      custom: {
        options: (value) => customValidations.isMongoId(value),
        errorMessage: 'Invalid product ID format'
      }
    }
  }
};

module.exports = {
  validationMiddleware,
  customValidations,
  sanitizers,
  validationSchemas
};

// Export as default for backward compatibility
module.exports.default = validationMiddleware;