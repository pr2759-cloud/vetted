#!/usr/bin/env node

/**
 * Vetted Backend Server
 * Product discovery platform with sentiment analysis
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('express-async-errors');
require('dotenv').config();

// Import configurations and utilities
const { logger } = require('./src/utils/logger');
const { globalErrorHandler } = require('./src/middleware/errorHandler');
// Use mock database for development if MongoDB is not available
const { connectDatabase } = process.env.USE_MOCK_DB === 'true' 
  ? require('./src/config/mockDatabase')
  : require('./src/config/database');
const { connectRedis } = require('./src/config/redis');

// Import routes
const apiRoutes = require('./src/routes/api');
const searchRoutes = require('./src/routes/search');
const productRoutes = require('./src/routes/products');
const sentimentRoutes = require('./src/routes/sentiment');
const analyticsRoutes = require('./src/routes/analytics');
const adminRoutes = require('./src/routes/admin');
const chatRoutes = require('./src/routes/chat');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Rate limiting
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: message });
  }
});

// Apply different rate limits for different endpoints (disabled in development)
if (NODE_ENV === 'production') {
  app.use('/api/search', createRateLimiter(1 * 60 * 1000, 100, 'Too many search requests')); // 100 requests per minute
  app.use('/api/', createRateLimiter(1 * 60 * 1000, 200, 'Too many API requests')); // 200 requests per minute
} else {
  logger.info('Rate limiting disabled in development mode (server.js)');
}

// Static file serving for uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Body parsing middleware
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

// Logging middleware
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { 
    stream: { 
      write: (msg) => logger.info(msg.trim()) 
    }
  }));
}

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = require('uuid').v4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'connected', // Will be updated by actual health checks
      redis: 'connected',
      api: 'operational'
    }
  };

  res.status(200).json(healthCheck);
});

// API Documentation
if (NODE_ENV === 'development') {
  const swaggerJsdoc = require('swagger-jsdoc');
  const swaggerUi = require('swagger-ui-express');

  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Vetted API',
        version: '1.0.0',
        description: 'Product discovery platform with sentiment analysis',
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server',
        },
      ],
    },
    apis: ['./src/routes/*.js'], // Path to the API files
  };

  const swaggerDocs = swaggerJsdoc(swaggerOptions);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Vetted API Server',
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      docs: NODE_ENV === 'development' ? '/api/docs' : null
    }
  });
});

// API routes
app.use('/api', apiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// 404 handler for unknown routes
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handling middleware
app.use(globalErrorHandler);

// Initialize server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Connect to Redis
    if (process.env.ENABLE_CACHING === 'true') {
      await connectRedis();
      logger.info('✅ Redis connected successfully');
    }

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Vetted Backend Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      
      if (NODE_ENV === 'development') {
        logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      }
    });

    // Handle server shutdown gracefully
    const gracefulShutdown = (signal) => {
      logger.info(`🔄 ${signal} received, shutting down gracefully`);
      
      server.close(() => {
        logger.info('✅ HTTP server closed');
        
        // Close database connections
        require('mongoose').connection.close().then(() => {
          logger.info('✅ Database connection closed');
          process.exit(0);
        }).catch((err) => {
          logger.error('Database close error:', err);
          process.exit(1);
        });
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
