/**
 * Analytics Controller
 * Handles analytics data, tracking, and reporting
 */

const { validationResult } = require('express-validator');
const analyticsService = require('../services/analyticsService');
const { logger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

class AnalyticsController {
  /**
   * Track user event
   * POST /api/analytics/track
   */
  async trackEvent(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: errors.array()
        });
      }

      const { 
        event, 
        properties = {}, 
        productId, 
        category,
        timestamp 
      } = req.body;

      const trackingData = {
        event,
        properties,
        productId,
        category,
        userId: req.user?.id,
        sessionId: req.sessionID,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: timestamp || new Date(),
        requestId: req.id
      };

      logger.debug('Tracking analytics event', {
        requestId: req.id,
        event,
        productId,
        userId: req.user?.id
      });

      // Track event asynchronously
      const result = await analyticsService.trackEvent(trackingData);

      res.json({
        success: true,
        data: { eventId: result.eventId },
        message: 'Event tracked successfully'
      });

    } catch (error) {
      logger.error('Track event error:', {
        error: error.message,
        requestId: req.id,
        event: req.body.event
      });
      next(error);
    }
  }

  /**
   * Get search analytics
   * GET /api/analytics/search
   */
  async getSearchAnalytics(req, res, next) {
    try {
      const { 
        timeframe = '7d',
        granularity = 'daily',
        category,
        limit = 100
      } = req.query;

      // Check admin privileges for detailed analytics
      if (!req.user?.isAdmin) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Admin privileges required'
        });
      }

      const validatedLimit = Math.min(parseInt(limit), 1000);

      logger.debug('Getting search analytics', {
        requestId: req.id,
        timeframe,
        granularity,
        category,
        limit: validatedLimit
      });

      const analytics = await analyticsService.getSearchAnalytics({
        timeframe,
        granularity,
        category,
        limit: validatedLimit
      });

      res.json({
        success: true,
        data: analytics,
        meta: {
          timeframe,
          granularity,
          category: category || 'all'
        }
      });

    } catch (error) {
      logger.error('Get search analytics error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get product analytics
   * GET /api/analytics/products
   */
  async getProductAnalytics(req, res, next) {
    try {
      const { 
        timeframe = '7d',
        category,
        sortBy = 'views',
        limit = 50
      } = req.query;

      const validatedLimit = Math.min(parseInt(limit), 200);

      logger.debug('Getting product analytics', {
        requestId: req.id,
        timeframe,
        category,
        sortBy,
        limit: validatedLimit
      });

      const analytics = await analyticsService.getProductAnalytics({
        timeframe,
        category,
        sortBy,
        limit: validatedLimit
      });

      res.json({
        success: true,
        data: analytics,
        meta: {
          timeframe,
          category: category || 'all',
          sortBy
        }
      });

    } catch (error) {
      logger.error('Get product analytics error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get user behavior analytics
   * GET /api/analytics/user-behavior
   */
  async getUserBehaviorAnalytics(req, res, next) {
    try {
      const { 
        timeframe = '30d',
        segment,
        metric = 'all'
      } = req.query;

      // Check admin privileges
      if (!req.user?.isAdmin) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Admin privileges required'
        });
      }

      logger.debug('Getting user behavior analytics', {
        requestId: req.id,
        timeframe,
        segment,
        metric
      });

      const analytics = await analyticsService.getUserBehaviorAnalytics({
        timeframe,
        segment,
        metric
      });

      res.json({
        success: true,
        data: analytics,
        meta: {
          timeframe,
          segment: segment || 'all',
          metric
        }
      });

    } catch (error) {
      logger.error('Get user behavior analytics error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get trending analysis
   * GET /api/analytics/trending
   */
  async getTrendingAnalysis(req, res, next) {
    try {
      const { 
        type = 'searches',
        timeframe = 'daily',
        category,
        limit = 20
      } = req.query;

      const validatedLimit = Math.min(parseInt(limit), 100);

      logger.debug('Getting trending analysis', {
        requestId: req.id,
        type,
        timeframe,
        category,
        limit: validatedLimit
      });

      const trending = await analyticsService.getTrendingAnalysis({
        type,
        timeframe,
        category,
        limit: validatedLimit
      });

      res.json({
        success: true,
        data: trending,
        meta: {
          type,
          timeframe,
          category: category || 'all',
          count: trending.length
        }
      });

    } catch (error) {
      logger.error('Get trending analysis error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get conversion funnel analytics
   * GET /api/analytics/funnel
   */
  async getConversionFunnel(req, res, next) {
    try {
      const { 
        timeframe = '30d',
        category,
        cohort 
      } = req.query;

      // Check admin privileges
      if (!req.user?.isAdmin) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Admin privileges required'
        });
      }

      logger.debug('Getting conversion funnel', {
        requestId: req.id,
        timeframe,
        category,
        cohort
      });

      const funnel = await analyticsService.getConversionFunnel({
        timeframe,
        category,
        cohort
      });

      res.json({
        success: true,
        data: funnel,
        meta: {
          timeframe,
          category: category || 'all',
          cohort: cohort || 'all'
        }
      });

    } catch (error) {
      logger.error('Get conversion funnel error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get real-time analytics dashboard data
   * GET /api/analytics/realtime
   */
  async getRealtimeAnalytics(req, res, next) {
    try {
      // Check admin privileges
      if (!req.user?.isAdmin) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Admin privileges required'
        });
      }

      logger.debug('Getting realtime analytics', {
        requestId: req.id
      });

      const realtime = await analyticsService.getRealtimeAnalytics();

      res.json({
        success: true,
        data: realtime,
        meta: {
          timestamp: new Date().toISOString(),
          refreshInterval: 30 // seconds
        }
      });

    } catch (error) {
      logger.error('Get realtime analytics error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get user's personal analytics
   * GET /api/analytics/user/me
   */
  async getUserPersonalAnalytics(req, res, next) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      const { timeframe = '30d' } = req.query;

      logger.debug('Getting user personal analytics', {
        requestId: req.id,
        userId,
        timeframe
      });

      const analytics = await analyticsService.getUserPersonalAnalytics(userId, {
        timeframe
      });

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Get user personal analytics error:', {
        error: error.message,
        requestId: req.id,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Export analytics data
   * POST /api/analytics/export
   */
  async exportAnalytics(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: errors.array()
        });
      }

      // Check admin privileges
      if (!req.user?.isAdmin) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Admin privileges required'
        });
      }

      const { 
        type,
        timeframe,
        format = 'csv',
        filters = {}
      } = req.body;

      logger.info('Analytics export requested', {
        requestId: req.id,
        type,
        timeframe,
        format,
        adminId: req.user.id
      });

      const exportJob = await analyticsService.exportAnalytics({
        type,
        timeframe,
        format,
        filters,
        requestedBy: req.user.id
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: {
          jobId: exportJob.id,
          status: exportJob.status,
          estimatedTime: exportJob.estimatedTime
        },
        message: 'Export job created successfully'
      });

    } catch (error) {
      logger.error('Export analytics error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get export job status
   * GET /api/analytics/export/:jobId
   */
  async getExportJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;

      // Check admin privileges
      if (!req.user?.isAdmin) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Admin privileges required'
        });
      }

      logger.debug('Getting export job status', {
        requestId: req.id,
        jobId
      });

      const jobStatus = await analyticsService.getExportJobStatus(jobId);

      if (!jobStatus) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Export job not found'
        });
      }

      res.json({
        success: true,
        data: jobStatus
      });

    } catch (error) {
      logger.error('Get export job status error:', {
        error: error.message,
        requestId: req.id,
        jobId: req.params.jobId
      });
      next(error);
    }
  }

  /**
   * Generate analytics report
   * POST /api/analytics/report
   */
  async generateReport(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: errors.array()
        });
      }

      // Check admin privileges
      if (!req.user?.isAdmin) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Admin privileges required'
        });
      }

      const { 
        reportType,
        timeframe,
        filters = {},
        recipients = []
      } = req.body;

      logger.info('Analytics report generation requested', {
        requestId: req.id,
        reportType,
        timeframe,
        adminId: req.user.id
      });

      const report = await analyticsService.generateReport({
        reportType,
        timeframe,
        filters,
        recipients,
        generatedBy: req.user.id
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: report,
        message: 'Report generation initiated'
      });

    } catch (error) {
      logger.error('Generate report error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get analytics health metrics
   * GET /api/analytics/health
   */
  async getAnalyticsHealth(req, res, next) {
    try {
      // Check admin privileges
      if (!req.user?.isAdmin) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Admin privileges required'
        });
      }

      logger.debug('Getting analytics health metrics', {
        requestId: req.id
      });

      const health = await analyticsService.getAnalyticsHealth();

      res.json({
        success: true,
        data: health,
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Get analytics health error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
