/**
 * Application Configuration
 * Centralized app setup and middleware configuration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('express-async-errors');

const { logger } = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const validationMiddleware = require('./middleware/validation');
const constants = require('./config/constants');

// Import routes
const apiRoutes = require('./routes/api');
const searchRoutes = require('./routes/search');
const productRoutes = require('./routes/products');
const sentimentRoutes = require('./routes/sentiment');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');

/**
 * Create and configure Express application
 * @returns {Express} Configured Express app
 */
function createApp() {
  const app = express();

  // Trust proxy for rate limiting and IP detection
  app.set('trust proxy', process.env.TRUST_PROXY === 'true');

  // Apply security middleware
  setupSecurity(app);
  
  // Apply general middleware
  setupMiddleware(app);
  
  // Setup logging
  setupLogging(app);
  
  // Setup request tracking
  setupRequestTracking(app);
  
  // Setup API routes
  setupRoutes(app);
  
  // Setup error handling
  setupErrorHandling(app);

  return app;
}

/**
 * Configure security middleware
 */
function setupSecurity(app) {
  // Helmet for security headers
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", process.env.FRONTEND_URL],
      },
    },
  }));

  // CORS configuration
  const corsOptions = {
    origin: function (origin, callback) {
      // In development, allow all localhost origins
      if (process.env.NODE_ENV !== 'production') {
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
      }
      
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.CORS_ORIGIN,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3002',
        'http://127.0.0.1:3002'
      ].filter(Boolean);
      
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.some(allowed => origin.includes(allowed))) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
  };

  app.use(cors(corsOptions));

  // Rate limiting with different rules for different endpoints (disabled in development)
  if (process.env.NODE_ENV === 'production') {
    setupRateLimiting(app);
  } else {
    logger.info('Rate limiting disabled in development mode');
  }
}

/**
 * Configure rate limiting
 */
function setupRateLimiting(app) {
  const createRateLimiter = (windowMs, max, message, skipPaths = []) => rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => skipPaths.some(path => req.path.startsWith(path)),
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    onLimitReached: (req) => {
      logger.warn(`Rate limit reached for IP: ${req.ip}`);
    }
  });

  // Rate limiting disabled for development
  // app.use('/api/search', createRateLimiter(
  //   constants.RATE_LIMITS.SEARCH_WINDOW, 
  //   constants.RATE_LIMITS.SEARCH_MAX, 
  //   'Too many search requests, please try again later'
  // ));

  // app.use('/api/analytics', createRateLimiter(
  //   constants.RATE_LIMITS.ANALYTICS_WINDOW,
  //   constants.RATE_LIMITS.ANALYTICS_MAX,
  //   'Too many analytics requests'
  // ));

  // General API rate limit - disabled for development
  // app.use('/api/', createRateLimiter(
  //   constants.RATE_LIMITS.API_WINDOW,
  //   constants.RATE_LIMITS.API_MAX,
  //   'Too many API requests, please try again later',
  //   ['/api/health', '/api/docs'] // Skip rate limiting for health check and docs
  // ));
}

/**
 * Configure general middleware
 */
function setupMiddleware(app) {
  // Compression
  app.use(compression({
    threshold: parseInt(process.env.COMPRESSION_THRESHOLD) || 1024,
    level: parseInt(process.env.COMPRESSION_LEVEL) || 6
  }));

  // Body parsing
  app.use(express.json({ 
    limit: process.env.MAX_FILE_SIZE || '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }));
  
  app.use(express.urlencoded({ 
    extended: true, 
    limit: process.env.MAX_FILE_SIZE || '10mb' 
  }));

  // Custom headers
  app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'Vetted API');
    res.setHeader('X-API-Version', constants.API_VERSION);
    next();
  });
}

/**
 * Configure logging
 */
function setupLogging(app) {
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined', { 
      stream: { 
        write: (msg) => logger.info(msg.trim()) 
      },
      skip: (req) => req.path === '/health' // Skip health check logs in production
    }));
  }
}

/**
 * Setup request tracking and ID generation
 */
function setupRequestTracking(app) {
  app.use((req, res, next) => {
    // Generate unique request ID
    req.id = require('uuid').v4();
    res.setHeader('X-Request-ID', req.id);
    
    // Track request start time
    req.startTime = Date.now();
    
    // Log request details in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`${req.method} ${req.path}`, {
        requestId: req.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    next();
  });

  // Response time tracking
  app.use((req, res, next) => {
    const oldSend = res.send;
    res.send = function(data) {
      res.responseTime = Date.now() - req.startTime;
      res.setHeader('X-Response-Time', `${res.responseTime}ms`);
      
      // Log slow requests
      if (res.responseTime > constants.SLOW_REQUEST_THRESHOLD) {
        logger.warn('Slow request detected', {
          requestId: req.id,
          method: req.method,
          path: req.path,
          responseTime: res.responseTime,
          statusCode: res.statusCode
        });
      }
      
      oldSend.apply(this, arguments);
    };
    next();
  });
}

/**
 * Configure API routes
 */
function setupRoutes(app) {
  // Health check (before any middleware that might fail)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: constants.API_VERSION,
      requestId: req.id
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Vetted API Server',
      version: constants.API_VERSION,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      documentation: process.env.NODE_ENV === 'development' ? '/api/docs' : null,
      endpoints: {
        health: '/health',
        api: '/api',
        search: '/api/search',
        products: '/api/products',
        sentiment: '/api/sentiment',
        analytics: '/api/analytics'
      }
    });
  });

  // API Documentation (development only)
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_SWAGGER_DOCS === 'true') {
    const swaggerJsdoc = require('swagger-jsdoc');
    const swaggerUi = require('swagger-ui-express');

    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Vetted API',
          version: constants.API_VERSION,
          description: 'Product discovery platform with sentiment analysis',
          contact: {
            name: 'API Support',
            email: 'support@vetted.com'
          }
        },
        servers: [
          {
            url: `http://localhost:${process.env.PORT || 3001}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            }
          }
        }
      },
      apis: ['./src/routes/*.js', './src/models/*.js'],
    };

    const swaggerDocs = swaggerJsdoc(swaggerOptions);
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Vetted API Documentation'
    }));
  }

  // Main API routes
  app.use('/api', apiRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/sentiment', sentimentRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/admin', adminRoutes);
}

/**
 * Configure error handling
 */
function setupErrorHandling(app) {
  // 404 handler for unknown routes
  app.use('*', (req, res) => {
    const error = {
      error: 'Route not found',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      requestId: req.id
    };
    
    logger.warn('404 - Route not found', error);
    res.status(404).json(error);
  });

  // Global error handling middleware
  app.use(errorHandler);
}

module.exports = { createApp };
