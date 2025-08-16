/**
 * Search API Routes
 * Handles product discovery and search functionality
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const rateLimit = require('express-rate-limit');

const searchController = require('../searchController');
const { validationMiddleware } = require('../middleware/validation');
// const AuthMiddleware = require('../middleware/auth'); // Commented out for now
const { logger } = require('../utils/logger');

const router = express.Router();

// Rate limiting specifically for search endpoints - disabled for development
const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute  
  max: 100000, // Extremely high limit for development
  skip: () => true, // Skip rate limiting entirely in development
  message: {
    error: 'Too many search requests, please try again in a minute',
    retryAfter: 60
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     SearchRequest:
 *       type: object
 *       required:
 *         - query
 *       properties:
 *         query:
 *           type: string
 *           description: Search query text
 *           example: "wireless earbuds under $100"
 *         filters:
 *           type: object
 *           properties:
 *             category:
 *               type: string
 *               example: "Tech Accessories"
 *             priceRange:
 *               type: object
 *               properties:
 *                 min:
 *                   type: number
 *                 max:
 *                   type: number
 *             rating:
 *               type: number
 *               minimum: 0
 *               maximum: 100
 *         limit:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *         offset:
 *           type: integer
 *           default: 0
 */

/**
 * @swagger
 * /api/search:
 *   post:
 *     summary: Search for products
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchRequest'
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.post('/',
  searchRateLimit,
  [
    body('query')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Query must be between 1 and 200 characters'),
    body('filters').optional().isObject(),
    body('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    body('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validationMiddleware,
  searchController.search
);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Partial search query
 *     responses:
 *       200:
 *         description: Search suggestions
 */
router.get('/suggestions',
  [
    query('q')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Query must be between 1 and 100 characters')
  ],
  validationMiddleware,
  searchController.getSuggestions
);

/**
 * @swagger
 * /api/search/trending:
 *   get:
 *     summary: Get trending searches
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Trending searches
 */
router.get('/trending',
  searchController.getTrendingSearches
);

/**
 * @swagger
 * /api/search/chat:
 *   post:
 *     summary: Chat with AI about products
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Follow-up question or chat message
 *                 example: "Tell me more about the first product"
 *               conversationContext:
 *                 type: object
 *                 properties:
 *                   previousProducts:
 *                     type: array
 *                     description: Products from previous search
 *                   previousQuery:
 *                     type: string
 *                     description: Previous search query
 *                   chatHistory:
 *                     type: array
 *                     description: Previous chat messages
 *     responses:
 *       200:
 *         description: AI chat response
 */
router.post('/chat',
  searchRateLimit,
  [
    body('query')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Query must be between 1 and 500 characters'),
    body('conversationContext').optional().isObject()
  ],
  validationMiddleware,
  searchController.chat
);

/**
 * @swagger
 * /api/search/history:
 *   get:
 *     summary: Get user search history
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User search history
 */
router.get('/history',
  // AuthMiddleware.optionalAuth, // Commented out for now
  searchController.getSearchHistory
);

/**
 * @swagger
 * /api/search/{searchId}:
 *   get:
 *     summary: Get search results by ID
 *     tags: [Search]
 *     parameters:
 *       - in: path
 *         name: searchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Search ID
 *     responses:
 *       200:
 *         description: Search results
 *       404:
 *         description: Search not found
 */
router.get('/:searchId',
  [
    param('searchId').isMongoId().withMessage('Invalid search ID')
  ],
  validationMiddleware,
  searchController.getSearchById
);

module.exports = router;