/**
 * Authentication Middleware
 * Handles JWT authentication, authorization, and session management
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

class AuthMiddleware {
  /**
   * Verify JWT token and authenticate user
   */
  static async authenticate(req, res, next) {
    try {
      const token = AuthMiddleware.extractToken(req);
      
      if (!token) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Access token is required'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user
      const user = await User.findById(decoded.userId)
        .select('-password -passwordResetToken -emailVerificationToken');
        
      if (!user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid token - user not found'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Account is not active'
        });
      }

      // Check if user is locked
      if (user.isLocked) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Account is temporarily locked'
        });
      }

      // Update session activity
      if (req.sessionID) {
        await user.updateSessionActivity(req.sessionID);
      }

      // Attach user to request
      req.user = user;
      req.userId = user._id;
      
      logger.debug('User authenticated successfully', {
        userId: user._id,
        email: user.email,
        role: user.role
      });

      next();

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.INVALID_TOKEN,
          message: 'Invalid token'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.TOKEN_EXPIRED,
          message: 'Token has expired'
        });
      }

      logger.error('Authentication error:', error);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication failed'
      });
    }
  }

  /**
   * Optional authentication - doesn't fail if no token provided
   */
  static async optionalAuth(req, res, next) {
    try {
      const token = AuthMiddleware.extractToken(req);
      
      if (!token) {
        return next();
      }

      // Try to authenticate but don't fail if it doesn't work
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId)
        .select('-password -passwordResetToken -emailVerificationToken');
        
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
        req.userId = user._id;
        
        // Update session activity
        if (req.sessionID) {
          await user.updateSessionActivity(req.sessionID);
        }
      }

      next();

    } catch (error) {
      // Log error but continue without authentication
      logger.debug('Optional auth failed:', error.message);
      next();
    }
  }

  /**
   * Require specific role
   */
  static requireRole(role) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      if (req.user.role !== role && req.user.role !== 'admin') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: `${role} role required`
        });
      }

      next();
    };
  }

  /**
   * Require admin role
   */
  static requireAdmin(req, res, next) {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required'
      });
    }

    if (!req.user.isAdmin) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: 'Admin privileges required'
      });
    }

    next();
  }

  /**
   * Require moderator role or higher
   */
  static requireModerator(req, res, next) {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required'
      });
    }

    if (!req.user.isModerator) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: 'Moderator privileges required'
      });
    }

    next();
  }

  /**
   * Require specific permission
   */
  static requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      if (!req.user.hasPermission(permission)) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: `Permission '${permission}' required`
        });
      }

      next();
    };
  }

  /**
   * Verify email is confirmed
   */
  static requireEmailVerification(req, res, next) {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required'
      });
    }

    if (!req.user.emailVerified) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: 'Email verification required'
      });
    }

    next();
  }

  /**
   * Check subscription status
   */
  static requireSubscription(plan = null) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      if (!req.user.isPremiumUser) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Premium subscription required'
        });
      }

      if (plan && req.user.subscription.plan !== plan) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: `${plan} subscription required`
        });
      }

      next();
    };
  }

  /**
   * Ensure user owns resource or has admin privileges
   */
  static requireOwnership(resourceUserIdField = 'userId') {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      // Admin can access anything
      if (req.user.isAdmin) {
        return next();
      }

      // Get resource user ID from request params, body, or previous middleware
      let resourceUserId = req.params[resourceUserIdField] || 
                          req.body[resourceUserIdField] || 
                          req.resource?.[resourceUserIdField];

      // If checking current user's own resources
      if (resourceUserIdField === 'userId' && !resourceUserId) {
        resourceUserId = req.params.userId || req.params.id;
      }

      // Convert to string for comparison
      const userIdStr = req.user._id.toString();
      const resourceUserIdStr = resourceUserId?.toString();

      if (userIdStr !== resourceUserIdStr) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Access denied - insufficient permissions'
        });
      }

      next();
    };
  }

  /**
   * Rate limiting by user
   */
  static userRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const userRequestCounts = new Map();

    return (req, res, next) => {
      if (!req.user) {
        return next();
      }

      const userId = req.user._id.toString();
      const now = Date.now();
      
      // Clean up old entries
      if (Math.random() < 0.1) { // 10% chance to cleanup
        for (const [key, data] of userRequestCounts.entries()) {
          if (now - data.windowStart > windowMs) {
            userRequestCounts.delete(key);
          }
        }
      }

      // Get or create user request data
      let userData = userRequestCounts.get(userId);
      if (!userData || now - userData.windowStart > windowMs) {
        userData = {
          count: 0,
          windowStart: now
        };
        userRequestCounts.set(userId, userData);
      }

      // Check limit
      if (userData.count >= maxRequests) {
        return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
          success: false,
          error: ERROR_CODES.RATE_LIMIT_EXCEEDED,
          message: 'Too many requests from this user',
          retryAfter: Math.ceil((userData.windowStart + windowMs - now) / 1000)
        });
      }

      // Increment count
      userData.count++;
      next();
    };
  }

  /**
   * Extract token from request headers
   */
  static extractToken(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check query parameter
    if (req.query.token) {
      return req.query.token;
    }

    // Check cookie (if using cookies)
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    return null;
  }

  /**
   * Generate JWT token
   */
  static generateToken(user, expiresIn = process.env.JWT_EXPIRES_IN || '24h') {
    return jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(user) {
    return jwt.sign(
      { 
        userId: user._id,
        type: 'refresh'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('Invalid user');
      }

      return user;

    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Middleware to set cache headers for authenticated routes
   */
  static setCacheHeaders(req, res, next) {
    // Prevent caching of authenticated routes
    res.set({
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    next();
  }

  /**
   * Log authentication events
   */
  static logAuthEvent(event, user, req, additionalData = {}) {
    logger.info(`Auth event: ${event}`, {
      event,
      userId: user?._id,
      email: user?.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      ...additionalData
    });
  }

  /**
   * Middleware to track API usage
   */
  static trackApiUsage(req, res, next) {
    if (req.user) {
      // Track API call for analytics
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      
      // Could be extended to track usage in database
      logger.debug('API usage tracked', {
        userId: req.user._id,
        endpoint,
        timestamp: new Date(),
        ip: req.ip
      });
    }
    next();
  }

  /**
   * Check if user session is valid
   */
  static async validateSession(req, res, next) {
    if (!req.user || !req.sessionID) {
      return next();
    }

    try {
      const session = req.user.activeSessions.find(s => s.sessionId === req.sessionID);
      
      if (!session) {
        // Session not found, require re-authentication
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Session expired - please log in again'
        });
      }

      // Check if session is too old
      const sessionAge = Date.now() - session.lastAccessed.getTime();
      const maxSessionAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (sessionAge > maxSessionAge) {
        // Remove expired session
        await req.user.removeSession(req.sessionID);
        
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Session expired - please log in again'
        });
      }

      next();

    } catch (error) {
      logger.error('Session validation error:', error);
      next();
    }
  }

  /**
   * Middleware for GDPR compliance check
   */
  static requireGdprConsent(req, res, next) {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required'
      });
    }

    if (!req.user.gdprConsent?.given) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: 'GDPR consent required',
        requiresConsent: true
      });
    }

    next();
  }

  /**
   * Security headers middleware
   */
  static securityHeaders(req, res, next) {
    // Set security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    });
    next();
  }
}

module.exports = AuthMiddleware;