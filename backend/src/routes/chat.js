/**
 * Chat API Routes
 * Handles intelligent chat interactions with AI assistance
 */

const express = require('express');
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');

const chatController = require('../controllers/chatController');
const { validationMiddleware } = require('../middleware/validation');

const router = express.Router();

// Rate limiting for chat operations
const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    error: 'Too many chat messages, please slow down',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ChatMessage:
 *       type: object
 *       required:
 *         - message
 *       properties:
 *         message:
 *           type: string
 *           description: User's chat message
 *           minLength: 1
 *           maxLength: 1000
 *         conversationId:
 *           type: string
 *           description: Optional conversation ID for context
 *     ChatResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               description: AI-generated response
 *             products:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *             hasDbResults:
 *               type: boolean
 *               description: Whether products were found in database
 *             conversationId:
 *               type: string
 *             timestamp:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Send a chat message and get AI-powered product recommendations
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatMessage'
 *           examples:
 *             productQuery:
 *               summary: Product search query
 *               value:
 *                 message: "I'm looking for skincare products for dry skin"
 *                 conversationId: "conv_123456789"
 *             generalQuery:
 *               summary: General product question
 *               value:
 *                 message: "What are the best tech accessories under $50?"
 *     responses:
 *       200:
 *         description: Chat response with product recommendations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Invalid message format
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/message',
  chatRateLimit,
  [
    body('message')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1 and 1000 characters'),
    body('conversationId')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Conversation ID must be a valid string')
  ],
  validationMiddleware,
  chatController.processMessage
);

/**
 * @swagger
 * /api/chat/conversation/{conversationId}:
 *   get:
 *     summary: Get conversation history
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation history
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
 *                     conversationId:
 *                       type: string
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Conversation not found
 */
router.get('/conversation/:conversationId',
  [
    param('conversationId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Invalid conversation ID')
  ],
  validationMiddleware,
  chatController.getConversationHistory
);

/**
 * @swagger
 * /api/chat/suggestions:
 *   get:
 *     summary: Get chat suggestions for users
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: List of suggested chat messages
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
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example:
 *                         - "Show me skincare products"
 *                         - "What are the best tech accessories?"
 *                         - "Find fitness and wellness products"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.get('/suggestions',
  chatController.getChatSuggestions
);

/**
 * @swagger
 * /api/chat/health:
 *   get:
 *     summary: Check chat service health and AI availability
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Service health status
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
 *                     status:
 *                       type: string
 *                       enum: [healthy, degraded, unavailable]
 *                     aiAvailable:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.get('/health', (req, res) => {
  const openaiService = require('../services/openaiService');
  
  res.json({
    success: true,
    data: {
      status: 'healthy',
      aiAvailable: openaiService.isAvailable(),
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;