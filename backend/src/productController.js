/**
 * Product Controller
 * Handles product-related requests including details, reviews, and recommendations
 */

const { validationResult } = require('express-validator');
const productService = require('../services/productService');
const sentimentService = require('../services/sentimentService');
const analyticsService = require('../services/analyticsService');
const { logger } = require('../utils/logger');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

class ProductController {
  /**
   * Get product details by ID
   * GET /api/products/:id
   */
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const { includeSentiment = true, includeReviews = true } = req.query;

      logger.debug('Getting product details', {
        requestId: req.id,
        productId: id,
        includeSentiment,
        includeReviews
      });

      // Get product details
      const product = await productService.getProductById(id);

      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: 'Product not found'
        });
      }

      // Enhance with sentiment data if requested
      if (includeSentiment === 'true') {
        try {
          const sentiment = await sentimentService.getProductSentiment(id);
          product.sentiment = sentiment;
        } catch (error) {
          logger.warn('Failed to get sentiment data for product:', {
            productId: id,
            error: error.message
          });
        }
      }

      // Include reviews if requested
      if (includeReviews === 'true') {
        try {
          const reviews = await productService.getProductReviews(id, { limit: 10 });
          product.reviews = reviews;
        } catch (error) {
          logger.warn('Failed to get reviews for product:', {
            productId: id,
            error: error.message
          });
        }
      }

      // Track product view (async)
      analyticsService.trackProductView(id, req.ip, req.user?.id).catch(error => {
        logger.error('Failed to track product view:', error);
      });

      res.json({
        success: true,
        data: product
      });

    } catch (error) {
      logger.error('Get product error:', {
        error: error.message,
        requestId: req.id,
        productId: req.params.id
      });
      next(error);
    }
  }

  /**
   * Get multiple products by IDs
   * POST /api/products/batch
   */
  async getProductsBatch(req, res, next) {
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

      const { ids, includeSentiment = true } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_INPUT,
          message: 'Product IDs array is required'
        });
      }

      if (ids.length > 50) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_INPUT,
          message: 'Maximum 50 products can be requested at once'
        });
      }

      logger.debug('Getting batch products', {
        requestId: req.id,
        productCount: ids.length,
        includeSentiment
      });

      const products = await productService.getProductsBatch(ids, { includeSentiment });

      res.json({
        success: true,
        data: products,
        meta: {
          requested: ids.length,
          found: products.length
        }
      });

    } catch (error) {
      logger.error('Get products batch error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get product recommendations
   * GET /api/products/:id/recommendations
   */
  async getProductRecommendations(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        limit = 10, 
        type = 'similar',
        excludeViewed = false
      } = req.query;

      const validatedLimit = Math.min(parseInt(limit), 20);
      const userId = req.user?.id;

      logger.debug('Getting product recommendations', {
        requestId: req.id,
        productId: id,
        type,
        limit: validatedLimit,
        userId
      });

      const recommendations = await productService.getProductRecommendations(id, {
        limit: validatedLimit,
        type,
        userId,
        excludeViewed: excludeViewed === 'true'
      });

      res.json({
        success: true,
        data: recommendations,
        meta: {
          productId: id,
          type,
          count: recommendations.length
        }
      });

    } catch (error) {
      logger.error('Get recommendations error:', {
        error: error.message,
        requestId: req.id,
        productId: req.params.id
      });
      next(error);
    }
  }

  /**
   * Get product reviews
   * GET /api/products/:id/reviews
   */
  async getProductReviews(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        page = 1, 
        limit = 20,
        sortBy = 'date',
        sortOrder = 'desc',
        sentiment,
        verified = false
      } = req.query;

      const validatedPage = Math.max(1, parseInt(page));
      const validatedLimit = Math.min(parseInt(limit), 50);

      logger.debug('Getting product reviews', {
        requestId: req.id,
        productId: id,
        page: validatedPage,
        limit: validatedLimit,
        sortBy,
        sentiment
      });

      const reviews = await productService.getProductReviews(id, {
        page: validatedPage,
        limit: validatedLimit,
        sortBy,
        sortOrder,
        sentiment,
        verified: verified === 'true'
      });

      res.json({
        success: true,
        data: reviews.reviews,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          total: reviews.total,
          pages: Math.ceil(reviews.total / validatedLimit)
        }
      });

    } catch (error) {
      logger.error('Get product reviews error:', {
        error: error.message,
        requestId: req.id,
        productId: req.params.id
      });
      next(error);
    }
  }

  /**
   * Get product price history
   * GET /api/products/:id/price-history
   */
  async getProductPriceHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        timeframe = '30d',
        retailer 
      } = req.query;

      logger.debug('Getting product price history', {
        requestId: req.id,
        productId: id,
        timeframe,
        retailer
      });

      const priceHistory = await productService.getProductPriceHistory(id, {
        timeframe,
        retailer
      });

      res.json({
        success: true,
        data: priceHistory,
        meta: {
          productId: id,
          timeframe,
          retailer: retailer || 'all'
        }
      });

    } catch (error) {
      logger.error('Get price history error:', {
        error: error.message,
        requestId: req.id,
        productId: req.params.id
      });
      next(error);
    }
  }

  /**
   * Get trending products
   * GET /api/products/trending
   */
  async getTrendingProducts(req, res, next) {
    try {
      const { 
        category,
        timeframe = 'daily',
        limit = 20
      } = req.query;

      const validatedLimit = Math.min(parseInt(limit), 50);

      logger.debug('Getting trending products', {
        requestId: req.id,
        category,
        timeframe,
        limit: validatedLimit
      });

      const trendingProducts = await productService.getTrendingProducts({
        category,
        timeframe,
        limit: validatedLimit
      });

      res.json({
        success: true,
        data: trendingProducts,
        meta: {
          category: category || 'all',
          timeframe,
          count: trendingProducts.length
        }
      });

    } catch (error) {
      logger.error('Get trending products error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get product availability
   * GET /api/products/:id/availability
   */
  async getProductAvailability(req, res, next) {
    try {
      const { id } = req.params;
      const { retailer } = req.query;

      logger.debug('Getting product availability', {
        requestId: req.id,
        productId: id,
        retailer
      });

      const availability = await productService.getProductAvailability(id, retailer);

      res.json({
        success: true,
        data: availability
      });

    } catch (error) {
      logger.error('Get product availability error:', {
        error: error.message,
        requestId: req.id,
        productId: req.params.id
      });
      next(error);
    }
  }

  /**
   * Compare multiple products
   * POST /api/products/compare
   */
  async compareProducts(req, res, next) {
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

      const { productIds, compareFields } = req.body;

      if (!Array.isArray(productIds) || productIds.length < 2) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_INPUT,
          message: 'At least 2 products are required for comparison'
        });
      }

      if (productIds.length > 10) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_INPUT,
          message: 'Maximum 10 products can be compared at once'
        });
      }

      logger.debug('Comparing products', {
        requestId: req.id,
        productIds,
        compareFields
      });

      const comparison = await productService.compareProducts(productIds, compareFields);

      res.json({
        success: true,
        data: comparison
      });

    } catch (error) {
      logger.error('Compare products error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Add product to wishlist (requires authentication)
   * POST /api/products/:id/wishlist
   */
  async addToWishlist(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      logger.info('Adding product to wishlist', {
        requestId: req.id,
        productId: id,
        userId
      });

      const result = await productService.addToWishlist(userId, id);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
        message: 'Product added to wishlist'
      });

    } catch (error) {
      logger.error('Add to wishlist error:', {
        error: error.message,
        requestId: req.id,
        productId: req.params.id,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Remove product from wishlist
   * DELETE /api/products/:id/wishlist
   */
  async removeFromWishlist(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      logger.info('Removing product from wishlist', {
        requestId: req.id,
        productId: id,
        userId
      });

      await productService.removeFromWishlist(userId, id);

      res.json({
        success: true,
        message: 'Product removed from wishlist'
      });

    } catch (error) {
      logger.error('Remove from wishlist error:', {
        error: error.message,
        requestId: req.id,
        productId: req.params.id,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Report product issue
   * POST /api/products/:id/report
   */
  async reportProduct(req, res, next) {
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

      const { id } = req.params;
      const { reason, description } = req.body;
      const userId = req.user?.id;

      logger.info('Product report submitted', {
        requestId: req.id,
        productId: id,
        reason,
        userId
      });

      const report = await productService.reportProduct(id, {
        reason,
        description,
        userId,
        ip: req.ip
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: report,
        message: 'Report submitted successfully'
      });

    } catch (error) {
      logger.error('Report product error:', {
        error: error.message,
        requestId: req.id,
        productId: req.params.id
      });
      next(error);
    }
  }
}

module.exports = new ProductController();
