/**
 * Analytics Routes
 * Handles analytics tracking and reporting
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const analyticsController = require('../controllers/analyticsController');
const { validationMiddleware } = require('../middleware/validation');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/analytics/search:
 *   post:
 *     summary: Track a search event
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *               resultsCount:
 *                 type: integer
 *               searchId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Search event tracked successfully
 */
router.post('/search',
  [
    body('query').trim().isLength({ min: 1 }).withMessage('Query is required'),
    body('resultsCount').isInt({ min: 0 }).withMessage('Results count must be a positive integer'),
    body('searchId').optional().isString(),
    body('userId').optional().isMongoId()
  ],
  validationMiddleware,
  analyticsController.trackSearch
);

/**
 * @swagger
 * /api/analytics/product-view:
 *   post:
 *     summary: Track a product view event
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               searchId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product view tracked successfully
 */
router.post('/product-view',
  [
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('searchId').optional().isString(),
    body('userId').optional().isMongoId()
  ],
  validationMiddleware,
  analyticsController.trackProductView
);

/**
 * @swagger
 * /api/analytics/product-click:
 *   post:
 *     summary: Track a product click event
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               searchId:
 *                 type: string
 *               userId:
 *                 type: string
 *               position:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Product click tracked successfully
 */
router.post('/product-click',
  [
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('searchId').optional().isString(),
    body('userId').optional().isMongoId(),
    body('position').optional().isInt({ min: 0 })
  ],
  validationMiddleware,
  analyticsController.trackProductClick
);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get analytics dashboard data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *         description: Time frame for analytics
 *     responses:
 *       200:
 *         description: Analytics dashboard data
 */
router.get('/dashboard',
  // AuthMiddleware.authenticate, // Commented out for now
  [
    query('timeframe').optional().isIn(['day', 'week', 'month', 'year'])
  ],
  validationMiddleware,
  analyticsController.getDashboard
);

/**
 * @swagger
 * /api/analytics/search-trends:
 *   get:
 *     summary: Get search trends and popular queries
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results to return
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Time frame for trends
 *     responses:
 *       200:
 *         description: Search trends data
 */
router.get('/search-trends',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('timeframe').optional().isIn(['day', 'week', 'month'])
  ],
  validationMiddleware,
  analyticsController.getSearchTrends
);

/**
 * @swagger
 * /api/analytics/product-popularity:
 *   get:
 *     summary: Get product popularity metrics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Product popularity data
 */
router.get('/product-popularity',
  [
    query('category').optional().trim(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  validationMiddleware,
  analyticsController.getProductPopularity
);

module.exports = router;