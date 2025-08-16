/**
 * Sentiment Controller
 * Handles sentiment analysis requests and sentiment data management
 */

const { validationResult } = require('express-validator');
const sentimentService = require('../services/sentimentService');
const productService = require('../services/productService');
const analyticsService = require('../services/analyticsService');
const { logger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_CODES, SENTIMENT_LABELS } = require('../config/constants');

class SentimentController {
  /**
   * Get sentiment analysis for a specific product
   * GET /api/sentiment/product/:id
   */
  async getProductSentiment(req, res, next) {
    try {
      const { id } = req.params;
      const { includeBreakdown = true, includeTrending = true } = req.query;

      logger.debug('Getting product sentiment', {
        requestId: req.id,
        productId: id,
        includeBreakdown,
        includeTrending
      });

      // Check if product exists
      const product = await productService.getProductById(id);
      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Product not found'
        });
      }

      // Get sentiment data
      const sentiment = await sentimentService.getProductSentiment(id, {
        includeBreakdown: includeBreakdown === 'true',
        includeTrending: includeTrending === 'true'
      });

      res.json({
        success: true,
        data: sentiment
      });

    } catch (error) {
      logger.error('Get product sentiment error:', {
        error: error.message,
        requestId: req.id,
        productId: req.params.id
      });
      next(error);
    }
  }

  /**
   * Get sentiment analysis for multiple products
   * POST /api/sentiment/products/batch
   */
  async getProductsSentimentBatch(req, res, next) {
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

      const { productIds, includeBreakdown = false } = req.body;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_INPUT,
          message: 'Product IDs array is required'
        });
      }

      if (productIds.length > 100) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_INPUT,
          message: 'Maximum 100 products can be processed at once'
        });
      }

      logger.debug('Getting batch sentiment data', {
        requestId: req.id,
        productCount: productIds.length,
        includeBreakdown
      });

      const sentimentData = await sentimentService.getProductsSentimentBatch(productIds, {
        includeBreakdown: includeBreakdown === true
      });

      res.json({
        success: true,
        data: sentimentData,
        meta: {
          requested: productIds.length,
          processed: Object.keys(sentimentData).length
        }
      });

    } catch (error) {
      logger.error('Get products sentiment batch error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get trending sentiment topics
   * GET /api/sentiment/trending
   */
  async getTrendingSentimentTopics(req, res, next) {
    try {
      const { 
        category,
        timeframe = 'daily',
        limit = 20,
        sentimentType
      } = req.query;

      const validatedLimit = Math.min(parseInt(limit), 50);

      logger.debug('Getting trending sentiment topics', {
        requestId: req.id,
        category,
        timeframe,
        limit: validatedLimit,
        sentimentType
      });

      const trendingTopics = await sentimentService.getTrendingSentimentTopics({
        category,
        timeframe,
        limit: validatedLimit,
        sentimentType
      });

      res.json({
        success: true,
        data: trendingTopics,
        meta: {
          category: category || 'all',
          timeframe,
          sentimentType: sentimentType || 'all',
          count: trendingTopics.length
        }
      });

    } catch (error) {
      logger.error('Get trending sentiment topics error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get sentiment statistics for a category
   * GET /api/sentiment/category/:category/stats
   */
  async getCategorySentimentStats(req, res, next) {
    try {
      const { category } = req.params;
      const { timeframe = '30d' } = req.query;

      logger.debug('Getting category sentiment stats', {
        requestId: req.id,
        category,
        timeframe
      });

      const stats = await sentimentService.getCategorySentimentStats(category, timeframe);

      res.json({
        success: true,
        data: stats,
        meta: {
          category,
          timeframe
        }
      });

    } catch (error) {
      logger.error('Get category sentiment stats error:', {
        error: error.message,
        requestId: req.id,
        category: req.params.category
      });
      next(error);
    }
  }

  /**
   * Get sentiment timeline for a product
   * GET /api/sentiment/product/:id/timeline
   */
  async getProductSentimentTimeline(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        timeframe = '30d',
        granularity = 'daily'
      } = req.query;

      logger.debug('Getting product sentiment timeline', {
        requestId: req.id,
        productId: id,
        timeframe,
        granularity
      });

      const timeline = await sentimentService.getProductSentimentTimeline(id, {
        timeframe,
        granularity
      });

      res.json({
        success: true,
        data: timeline,
        meta: {
          productId: id,
          timeframe,
          granularity
        }
      });

    } catch (error) {
      logger.error('Get product sentiment timeline error:', {
        error: error.message,
        requestId: req.id,
        productId: req.params.id
      });
      next(error);
    }
  }

  /**
   * Analyze sentiment for custom text
   * POST /api/sentiment/analyze
   */
  async analyzeSentiment(req, res, next) {
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

      const { text, context } = req.body;

      if (!text || text.trim().length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_INPUT,
          message: 'Text is required for sentiment analysis'
        });
      }

      if (text.length > 5000) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_INPUT,
          message: 'Text cannot exceed 5000 characters'
        });
      }

      logger.debug('Analyzing custom text sentiment', {
        requestId: req.id,
        textLength: text.length,
        context
      });

      const analysis = await sentimentService.analyzeSentiment(text, context);

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      logger.error('Analyze sentiment error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get sentiment labels and their descriptions
   * GET /api/sentiment/labels
   */
  async getSentimentLabels(req, res, next) {
    try {
      logger.debug('Getting sentiment labels', {
        requestId: req.id
      });

      const labels = Object.values(SENTIMENT_LABELS).map(label => ({
        id: label.id,
        name: label.name,
        description: label.description,
        emoji: label.emoji,
        color: label.color,
        backgroundColor: label.backgroundColor,
        scoreRange: label.scoreRange
      }));

      res.json({
        success: true,
        data: labels
      });

    } catch (error) {
      logger.error('Get sentiment labels error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get sentiment summary for user's interests
   * GET /api/sentiment/user/summary
   */
  async getUserSentimentSummary(req, res, next) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      const { categories, timeframe = '7d' } = req.query;

      logger.debug('Getting user sentiment summary', {
        requestId: req.id,
        userId,
        categories,
        timeframe
      });

      const summary = await sentimentService.getUserSentimentSummary(userId, {
        categories: categories ? categories.split(',') : undefined,
        timeframe
      });

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      logger.error('Get user sentiment summary error:', {
        error: error.message,
        requestId: req.id,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Submit sentiment feedback
   * POST /api/sentiment/feedback
   */
  async submitSentimentFeedback(req, res, next) {
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

      const { productId, actualSentiment, suggestedSentiment, comment } = req.body;
      const userId = req.user?.id;

      logger.info('Sentiment feedback submitted', {
        requestId: req.id,
        productId,
        actualSentiment,
        suggestedSentiment,
        userId
      });

      const feedback = await sentimentService.submitSentimentFeedback({
        productId,
        actualSentiment,
        suggestedSentiment,
        comment,
        userId,
        ip: req.ip
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: feedback,
        message: 'Feedback submitted successfully'
      });

    } catch (error) {
      logger.error('Submit sentiment feedback error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Refresh sentiment data for a product (admin only)
   * POST /api/sentiment/product/:id/refresh
   */
  async refreshProductSentiment(req, res, next) {
    try {
      const { id } = req.params;
      const { force = false } = req.body;

      // Check admin privileges
      if (!req.user?.isAdmin) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'Admin privileges required'
        });
      }

      logger.info('Refreshing product sentiment', {
        requestId: req.id,
        productId: id,
        force,
        adminId: req.user.id
      });

      const refreshResult = await sentimentService.refreshProductSentiment(id, {
        force: force === true
      });

      res.json({
        success: true,
        data: refreshResult,
        message: 'Sentiment data refresh initiated'
      });

    } catch (error) {
      logger.error('Refresh product sentiment error:', {
        error: error.message,
        requestId: req.id,
        productId: req.params.id
      });
      next(error);
    }
  }

  /**
   * Get sentiment analysis job status
   * GET /api/sentiment/jobs/:jobId
   */
  async getSentimentJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;

      logger.debug('Getting sentiment job status', {
        requestId: req.id,
        jobId
      });

      const jobStatus = await sentimentService.getSentimentJobStatus(jobId);

      if (!jobStatus) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Job not found'
        });
      }

      res.json({
        success: true,
        data: jobStatus
      });

    } catch (error) {
      logger.error('Get sentiment job status error:', {
        error: error.message,
        requestId: req.id,
        jobId: req.params.jobId
      });
      next(error);
    }
  }
}

module.exports = new SentimentController();
