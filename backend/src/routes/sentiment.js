/**
 * Sentiment Analysis Routes
 * Handles sentiment analysis for products and trends
 */

const express = require('express');
const { param, query } = require('express-validator');
const sentimentController = require('../controllers/sentimentController');
const { validationMiddleware } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Sentiment:
 *       type: object
 *       properties:
 *         label:
 *           type: string
 *           enum: [highly-regarded, well-regarded, mixed-reviews, poorly-regarded, highly-criticized, insufficient-data]
 *         emoji:
 *           type: string
 *         text:
 *           type: string
 *         description:
 *           type: string
 *         score:
 *           type: number
 *           minimum: -1
 *           maximum: 1
 *         confidence:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         mentionCount:
 *           type: integer
 *         trending:
 *           type: string
 *           enum: [up, down, stable, new]
 *         breakdown:
 *           type: object
 *           properties:
 *             quality:
 *               type: number
 *             value:
 *               type: number
 *             popularity:
 *               type: number
 *             reliability:
 *               type: number
 */

/**
 * @swagger
 * /api/sentiment/{productId}:
 *   get:
 *     summary: Get sentiment analysis for a specific product
 *     tags: [Sentiment]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product sentiment analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Sentiment'
 */
router.get('/:productId',
  [
    param('productId').isMongoId().withMessage('Invalid product ID')
  ],
  validationMiddleware,
  sentimentController.getProductSentiment
);

/**
 * @swagger
 * /api/sentiment/trends:
 *   get:
 *     summary: Get sentiment trends across categories
 *     tags: [Sentiment]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Time frame for trends
 *     responses:
 *       200:
 *         description: Sentiment trends data
 */
router.get('/trends',
  [
    query('category').optional().trim(),
    query('timeframe').optional().isIn(['day', 'week', 'month'])
  ],
  validationMiddleware,
  sentimentController.getSentimentTrends
);

/**
 * @swagger
 * /api/sentiment/categories:
 *   get:
 *     summary: Get sentiment analysis by category
 *     tags: [Sentiment]
 *     responses:
 *       200:
 *         description: Sentiment analysis by category
 */
router.get('/categories',
  sentimentController.getSentimentByCategory
);

/**
 * @swagger
 * /api/sentiment/refresh/{productId}:
 *   post:
 *     summary: Refresh sentiment analysis for a product
 *     tags: [Sentiment]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Updated sentiment analysis
 */
router.post('/refresh/:productId',
  [
    param('productId').isMongoId().withMessage('Invalid product ID')
  ],
  validationMiddleware,
  sentimentController.refreshProductSentiment
);

module.exports = router;