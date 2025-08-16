/**
 * Admin API Routes
 * Handles product management and administrative operations
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, query, param } = require('express-validator');
const rateLimit = require('express-rate-limit');

const productController = require('../controllers/productController');
const { validationMiddleware } = require('../middleware/validation');
// const AuthMiddleware = require('../middleware/auth'); // Commented out for now
const { logger } = require('../utils/logger');

const router = express.Router();

// Rate limiting for admin operations
const adminRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too many admin requests, please try again later',
    retryAfter: 60
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/products/'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files
  },
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * @swagger
 * /api/admin/products:
 *   get:
 *     summary: Get all products for admin
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/products',
  adminRateLimit,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
    query('category').optional().isString().trim()
  ],
  validationMiddleware,
  productController.getAllProducts
);

/**
 * @swagger
 * /api/admin/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - priceMin
 *               - priceMax
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               brand:
 *                 type: string
 *               category:
 *                 type: string
 *               priceMin:
 *                 type: number
 *               priceMax:
 *                 type: number
 *               rating:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               reviewCount:
 *                 type: integer
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               features:
 *                 type: string
 *                 description: Comma-separated features
 *               availability:
 *                 type: string
 *                 enum: [in_stock, out_of_stock, limited]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               sentimentLabel:
 *                 type: string
 *               sentimentScore:
 *                 type: number
 *               sentimentText:
 *                 type: string
 *               sentimentDescription:
 *                 type: string
 *               sentimentConfidence:
 *                 type: number
 *               sentimentMentionCount:
 *                 type: integer
 *               sentimentTrending:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 */
router.post('/products',
  adminRateLimit,
  upload.array('images', 10),
  [
    body('name')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Product name is required and must be less than 200 characters'),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('brand').optional().trim().isLength({ max: 100 }),
    body('category')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category is required'),
    body('priceMin')
      .isFloat({ min: 0 })
      .withMessage('Minimum price must be a positive number'),
    body('priceMax')
      .isFloat({ min: 0 })
      .withMessage('Maximum price must be a positive number'),
    body('rating').optional().isInt({ min: 0, max: 100 }).toInt(),
    body('reviewCount').optional().isInt({ min: 0 }).toInt(),
    body('tags').optional().isString(),
    body('features').optional().isString(),
    body('availability')
      .optional()
      .isIn(['in_stock', 'out_of_stock', 'limited'])
      .withMessage('Invalid availability status'),
  ],
  validationMiddleware,
  productController.createProduct
);

/**
 * @swagger
 * /api/admin/products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/products/:id',
  adminRateLimit,
  [
    param('id').isString().isLength({ min: 1 }).withMessage('Invalid product ID')
  ],
  validationMiddleware,
  productController.getProductById
);

/**
 * @swagger
 * /api/admin/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               brand:
 *                 type: string
 *               category:
 *                 type: string
 *               priceMin:
 *                 type: number
 *               priceMax:
 *                 type: number
 *               rating:
 *                 type: integer
 *               reviewCount:
 *                 type: integer
 *               tags:
 *                 type: string
 *               features:
 *                 type: string
 *               availability:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put('/products/:id',
  adminRateLimit,
  upload.array('images', 10),
  [
    param('id').isString().isLength({ min: 1 }).withMessage('Invalid product ID'),
    body('name').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('brand').optional().trim().isLength({ max: 100 }),
    body('category').optional().trim().isLength({ min: 1, max: 100 }),
    body('priceMin').optional().isFloat({ min: 0 }),
    body('priceMax').optional().isFloat({ min: 0 }),
    body('rating').optional().isInt({ min: 0, max: 100 }).toInt(),
    body('reviewCount').optional().isInt({ min: 0 }).toInt(),
    body('availability').optional().isIn(['in_stock', 'out_of_stock', 'limited'])
  ],
  validationMiddleware,
  productController.updateProduct
);

/**
 * @swagger
 * /api/admin/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete('/products/:id',
  adminRateLimit,
  [
    param('id').isString().isLength({ min: 1 }).withMessage('Invalid product ID')
  ],
  validationMiddleware,
  productController.deleteProduct
);

/**
 * @swagger
 * /api/admin/products/bulk/import:
 *   post:
 *     summary: Bulk import products from CSV
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - csvFile
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Products imported successfully
 *       400:
 *         description: Invalid CSV format
 */
router.post('/products/bulk/import',
  adminRateLimit,
  multer({ dest: 'uploads/temp/' }).single('csvFile'),
  productController.bulkImportProducts
);

/**
 * @swagger
 * /api/admin/products/bulk/export:
 *   get:
 *     summary: Export all products to CSV
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/products/bulk/export',
  adminRateLimit,
  productController.exportProducts
);

/**
 * @swagger
 * /api/admin/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/analytics/dashboard',
  adminRateLimit,
  productController.getDashboardStats
);

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all available categories
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories',
  adminRateLimit,
  productController.getCategories
);

module.exports = router;