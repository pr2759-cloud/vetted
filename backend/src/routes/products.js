/**
 * Products API Routes
 * Handles product-related operations
 */

const express = require('express');
const { body, query, param } = require('express-validator');

const productController = require('../controllers/productController');
const { validationMiddleware } = require('../middleware/validation');
// const authMiddleware = require('../middleware/auth'); // Commented out for now

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Product ID
 *         name:
 *           type: string
 *           description: Product name
 *         price:
 *           type: object
 *           properties:
 *             min:
 *               type: number
 *             max:
 *               type: number
 *             display:
 *               type: string
 *         rating:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         reviews:
 *           type: object
 *           properties:
 *             count:
 *               type: integer
 *             display:
 *               type: string
 *         category:
 *           type: string
 *         brand:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         sentiment:
 *           $ref: '#/components/schemas/Sentiment'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get products with optional filtering
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *         description: Minimum rating filter
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [rating, price, popularity, newest]
 *         description: Sort criteria
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/',
  [
    query('category').optional().trim().isLength({ min: 1, max: 100 }),
    query('brand').optional().trim().isLength({ min: 1, max: 100 }),
    query('minRating').optional().isFloat({ min: 0, max: 100 }),
    query('sortBy').optional().isIn(['rating', 'price', 'popularity', 'newest']),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ],
  validationMiddleware,
  productController.getProducts
);

/**
 * @swagger
 * /api/products/categories:
 *   get:
 *     summary: Get product categories
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of product categories
 */
router.get('/categories',
  productController.getCategories
);

/**
 * @swagger
 * /api/products/trending:
 *   get:
 *     summary: Get trending products
 *     tags: [Products]
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
 *         description: Trending timeframe
 *     responses:
 *       200:
 *         description: List of trending products
 */
router.get('/trending',
  [
    query('category').optional().trim(),
    query('timeframe').optional().isIn(['day', 'week', 'month'])
  ],
  validationMiddleware,
  productController.getTrendingProducts
);

/**
 * @swagger
 * /api/products/{productId}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:productId',
  [
    param('productId').isMongoId().withMessage('Invalid product ID')
  ],
  validationMiddleware,
  productController.getProductById
);

/**
 * @swagger
 * /api/products/{productId}/similar:
 *   get:
 *     summary: Get similar products
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: List of similar products
 */
router.get('/:productId/similar',
  [
    param('productId').isMongoId().withMessage('Invalid product ID')
  ],
  validationMiddleware,
  productController.getSimilarProducts
);

/**
 * @swagger
 * /api/products/{productId}/reviews:
 *   get:
 *     summary: Get product reviews summary
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product reviews summary
 */
router.get('/:productId/reviews',
  [
    param('productId').isMongoId().withMessage('Invalid product ID')
  ],
  validationMiddleware,
  productController.getProductReviews
);

module.exports = router;