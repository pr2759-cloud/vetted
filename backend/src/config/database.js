/**
 * Database Configuration
 * MongoDB connection and configuration management
 */

const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

class DatabaseManager {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000; // 5 seconds
  }

  /**
   * Connect to MongoDB
   * @param {string} uri - MongoDB connection URI
   * @param {Object} options - Connection options
   */
  async connect(uri = null, options = {}) {
    try {
      const connectionUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/vetted';
      
      // Default connection options
      const defaultOptions = {
        // Connection settings
        maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT_MS) || 30000,
        socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT_MS) || 30000,
        connectTimeoutMS: 30000,
        
        // Buffering settings (removed deprecated bufferMaxEntries)
        bufferCommands: false,
        
        // Replica set settings
        retryWrites: true,
        retryReads: true,
        readPreference: 'primary',
        
        // Monitoring
        heartbeatFrequencyMS: 10000,
        
        // Application name for monitoring
        appName: 'Vetted-Backend',
        
        // Compression
        compressors: ['zlib']
      };

      const connectionOptions = { ...defaultOptions, ...options };

      logger.info('Connecting to MongoDB...', {
        uri: this.maskConnectionString(connectionUri),
        options: {
          maxPoolSize: connectionOptions.maxPoolSize,
          serverSelectionTimeoutMS: connectionOptions.serverSelectionTimeoutMS
        }
      });

      // Connect to MongoDB
      await mongoose.connect(connectionUri, connectionOptions);
      
      this.connection = mongoose.connection;
      this.isConnected = true;
      this.reconnectAttempts = 0;

      logger.info('✅ MongoDB connected successfully', {
        host: this.connection.host,
        port: this.connection.port,
        database: this.connection.name,
        readyState: this.connection.readyState
      });

      // Setup connection event listeners
      this.setupEventListeners();

      return this.connection;

    } catch (error) {
      this.isConnected = false;
      logger.error('❌ MongoDB connection failed:', error);
      
      // Attempt reconnection if not at max attempts
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        await this.handleReconnection();
      } else {
        logger.error('Maximum reconnection attempts reached. Exiting...');
        throw error;
      }
    }
  }

  /**
   * Setup database connection event listeners
   */
  setupEventListeners() {
    if (!this.connection) return;

    // Connection successful
    this.connection.on('connected', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('MongoDB connection established');
    });

    // Connection error
    this.connection.on('error', (error) => {
      this.isConnected = false;
      logger.error('MongoDB connection error:', error);
    });

    // Connection disconnected
    this.connection.on('disconnected', () => {
      this.isConnected = false;
      logger.warn('MongoDB disconnected');
      
      // Attempt reconnection
      this.handleReconnection();
    });

    // MongoDB server selection failed
    this.connection.on('serverSelectionError', (error) => {
      this.isConnected = false;
      logger.error('MongoDB server selection failed:', error);
    });

    // Connection timeout
    this.connection.on('timeout', () => {
      logger.warn('MongoDB connection timeout');
    });

    // Replica set changes
    this.connection.on('fullsetup', () => {
      logger.info('MongoDB replica set fully connected');
    });

    // Process termination handlers
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGUSR2', this.gracefulShutdown.bind(this)); // nodemon restart
  }

  /**
   * Handle reconnection attempts
   */
  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * this.reconnectAttempts;

    logger.info(`Attempting to reconnect to MongoDB (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('Reconnection attempt failed:', error);
      }
    }, delay);
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(signal) {
    logger.info(`${signal} received. Closing MongoDB connection...`);
    
    try {
      if (this.connection && this.isConnected) {
        await this.connection.close();
        logger.info('✅ MongoDB connection closed gracefully');
      }
    } catch (error) {
      logger.error('Error during MongoDB shutdown:', error);
    } finally {
      process.exit(0);
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    if (!this.connection) {
      return {
        status: 'disconnected',
        readyState: 0,
        host: null,
        port: null,
        database: null
      };
    }

    const readyStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      status: readyStates[this.connection.readyState] || 'unknown',
      readyState: this.connection.readyState,
      host: this.connection.host,
      port: this.connection.port,
      database: this.connection.name,
      isConnected: this.isConnected
    };
  }

  /**
   * Health check for database
   */
  async healthCheck() {
    try {
      if (!this.isConnected || !this.connection) {
        return {
          status: 'unhealthy',
          message: 'Database not connected',
          timestamp: new Date().toISOString()
        };
      }

      // Simple ping to check connection
      await mongoose.connection.db.admin().ping();
      
      const stats = await mongoose.connection.db.stats();
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        timestamp: new Date().toISOString(),
        details: {
          readyState: this.connection.readyState,
          host: this.connection.host,
          port: this.connection.port,
          database: this.connection.name,
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexSize: stats.indexSize
        }
      };

    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const stats = await mongoose.connection.db.stats();
      const adminStats = await mongoose.connection.db.admin().serverStatus();

      return {
        database: {
          name: this.connection.name,
          collections: stats.collections,
          documents: stats.objects,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          indexSize: stats.indexSize,
          avgObjSize: stats.avgObjSize
        },
        server: {
          version: adminStats.version,
          uptime: adminStats.uptime,
          connections: adminStats.connections,
          memory: adminStats.mem,
          network: adminStats.network
        },
        connection: this.getConnectionStatus()
      };

    } catch (error) {
      logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    try {
      if (this.connection && this.isConnected) {
        await mongoose.disconnect();
        this.isConnected = false;
        this.connection = null;
        logger.info('MongoDB disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Mask sensitive information in connection string
   */
  maskConnectionString(uri) {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  }

  /**
   * Setup database indexes and constraints
   */
  async setupIndexes() {
    try {
      logger.info('Setting up database indexes...');

      // This will be called after models are loaded
      // Each model can define its own indexes
      
      // Example: Create compound indexes for common queries
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      logger.info(`Database setup complete. Collections: ${collections.length}`);
      
      return true;
    } catch (error) {
      logger.error('Failed to setup database indexes:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

/**
 * Connect to database (convenience function)
 */
async function connectDatabase(uri, options) {
  return await databaseManager.connect(uri, options);
}

/**
 * Get database connection status
 */
function getDatabaseStatus() {
  return databaseManager.getConnectionStatus();
}

/**
 * Database health check
 */
async function healthCheck() {
  return await databaseManager.healthCheck();
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  return await databaseManager.getStats();
}

module.exports = {
  connectDatabase,
  getDatabaseStatus,
  healthCheck,
  getDatabaseStats,
  databaseManager
};
