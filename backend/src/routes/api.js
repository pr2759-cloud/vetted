/**
 * Main API Routes
 * Base API route handler and health checks
 */

const express = require('express');
const { logger } = require('../utils/logger');
const constants = require('../config/constants');

const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: API root endpoint
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API information
 */
router.get('/', (req, res) => {
  res.json({
    message: 'Vetted API Server',
    version: constants.API_VERSION,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      search: '/search',
      products: '/products',
      sentiment: '/sentiment',
      analytics: '/analytics',
      docs: process.env.NODE_ENV === 'development' ? '/docs' : null
    }
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Service health status
 */
router.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: constants.API_VERSION,
    requestId: req.id,
    services: {
      database: 'connected', // TODO: Add actual DB health check
      cache: 'connected',     // TODO: Add actual Redis health check
      api: 'operational'
    }
  };

  logger.debug('Health check requested', {
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(200).json(healthCheck);
});

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Detailed system status
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Detailed system status
 */
router.get('/status', (req, res) => {
  const status = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    system: {
      node_version: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptime: process.uptime(),
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100
      }
    },
    api: {
      version: constants.API_VERSION,
      environment: process.env.NODE_ENV,
      port: process.env.PORT || 3001
    }
  };

  res.json(status);
});

module.exports = router;