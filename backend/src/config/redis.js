/**
 * Redis Configuration
 * Redis connection and caching management
 */

const redis = require('redis');
const { logger } = require('../utils/logger');

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = parseInt(process.env.REDIS_MAX_RETRIES) || 5;
    this.reconnectDelay = parseInt(process.env.REDIS_RETRY_DELAY_MS) || 1000;
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 300; // 5 minutes
  }

  /**
   * Connect to Redis
   * @param {Object} options - Redis connection options
   */
  async connect(options = {}) {
    try {
      if (process.env.ENABLE_CACHING !== 'true') {
        logger.info('Redis caching is disabled');
        return null;
      }

      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Parse Redis URL to get connection details
      const url = new URL(redisUrl);
      
      // Default Redis options
      const defaultOptions = {
        socket: {
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          connectTimeout: 10000,
          lazyConnect: true,
          keepAlive: 30000,
          reconnectStrategy: (retries) => {
            if (retries > this.maxReconnectAttempts) {
              logger.error('Redis max reconnection attempts reached');
              return false;
            }
            const delay = Math.min(retries * this.reconnectDelay, 3000);
            logger.info(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          }
        },
        database: parseInt(process.env.REDIS_DB) || 0,
        password: process.env.REDIS_PASSWORD || url.password || undefined,
        username: url.username || undefined
      };

      const connectionOptions = { ...defaultOptions, ...options };

      logger.info('Connecting to Redis...', {
        host: connectionOptions.socket.host,
        port: connectionOptions.socket.port,
        database: connectionOptions.database
      });

      // Create Redis client
      this.client = redis.createClient(connectionOptions);

      // Setup event listeners before connecting
      this.setupEventListeners();

      // Connect to Redis
      await this.client.connect();

      this.isConnected = true;
      this.reconnectAttempts = 0;

      logger.info('✅ Redis connected successfully', {
        host: connectionOptions.socket.host,
        port: connectionOptions.socket.port,
        database: connectionOptions.database
      });

      // Test connection with ping
      const pong = await this.client.ping();
      logger.debug('Redis ping response:', pong);

      return this.client;

    } catch (error) {
      this.isConnected = false;
      logger.error('❌ Redis connection failed:', error.message);
      
      // Don't throw error, just continue without cache
      logger.warn('Continuing without Redis cache');
      return null;
    }
  }

  /**
   * Setup Redis event listeners
   */
  setupEventListeners() {
    if (!this.client) return;

    this.client.on('connect', () => {
      logger.debug('Redis client connecting...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Redis client ready');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis client error:', error.message);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis client connection ended');
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info(`Redis client reconnecting... (attempt ${this.reconnectAttempts})`);
    });

    // Process termination handlers
    process.on('SIGINT', this.gracefulShutdown.bind(this, 'SIGINT'));
    process.on('SIGTERM', this.gracefulShutdown.bind(this, 'SIGTERM'));
    process.on('SIGUSR2', this.gracefulShutdown.bind(this, 'SIGUSR2')); // nodemon restart
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(signal) {
    logger.info(`${signal} received. Closing Redis connection...`);
    
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        logger.info('✅ Redis connection closed gracefully');
      }
    } catch (error) {
      logger.error('Error during Redis shutdown:', error.message);
    }
  }

  /**
   * Get value from Redis
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  async get(key) {
    try {
      if (!this.isConnected || !this.client) {
        logger.debug('Redis not available, cache miss for key:', key);
        return null;
      }

      const value = await this.client.get(key);
      
      if (value === null) {
        logger.debug('Cache miss for key:', key);
        return null;
      }

      logger.debug('Cache hit for key:', key);
      return JSON.parse(value);

    } catch (error) {
      logger.error('Redis GET error:', error.message);
      return null;
    }
  }

  /**
   * Set value in Redis
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = null) {
    try {
      if (!this.isConnected || !this.client) {
        logger.debug('Redis not available, skipping cache set for key:', key);
        return false;
      }

      const serializedValue = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL;

      await this.client.setEx(key, expiration, serializedValue);
      logger.debug(`Cache set for key: ${key} (TTL: ${expiration}s)`);
      
      return true;

    } catch (error) {
      logger.error('Redis SET error:', error.message);
      return false;
    }
  }

  /**
   * Delete key from Redis
   * @param {string} key - Cache key to delete
   */
  async del(key) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const result = await this.client.del(key);
      logger.debug(`Cache delete for key: ${key}, deleted: ${result}`);
      
      return result > 0;

    } catch (error) {
      logger.error('Redis DEL error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists in Redis
   * @param {string} key - Cache key
   */
  async exists(key) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;

    } catch (error) {
      logger.error('Redis EXISTS error:', error.message);
      return false;
    }
  }

  /**
   * Set expiration for a key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   */
  async expire(key, ttl) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const result = await this.client.expire(key, ttl);
      return result === 1;

    } catch (error) {
      logger.error('Redis EXPIRE error:', error.message);
      return false;
    }
  }

  /**
   * Get TTL for a key
   * @param {string} key - Cache key
   */
  async ttl(key) {
    try {
      if (!this.isConnected || !this.client) {
        return -1;
      }

      return await this.client.ttl(key);

    } catch (error) {
      logger.error('Redis TTL error:', error.message);
      return -1;
    }
  }

  /**
   * Increment counter
   * @param {string} key - Counter key
   * @param {number} increment - Increment value (default: 1)
   */
  async incr(key, increment = 1) {
    try {
      if (!this.isConnected || !this.client) {
        return 0;
      }

      const result = increment === 1 
        ? await this.client.incr(key)
        : await this.client.incrBy(key, increment);
      
      return result;

    } catch (error) {
      logger.error('Redis INCR error:', error.message);
      return 0;
    }
  }

  /**
   * Get multiple keys at once
   * @param {string[]} keys - Array of cache keys
   */
  async mget(keys) {
    try {
      if (!this.isConnected || !this.client || !keys.length) {
        return {};
      }

      const values = await this.client.mGet(keys);
      const result = {};

      keys.forEach((key, index) => {
        try {
          result[key] = values[index] ? JSON.parse(values[index]) : null;
        } catch (parseError) {
          logger.error(`Error parsing cached value for key ${key}:`, parseError.message);
          result[key] = null;
        }
      });

      return result;

    } catch (error) {
      logger.error('Redis MGET error:', error.message);
      return {};
    }
  }

  /**
   * Set multiple key-value pairs
   * @param {Object} keyValuePairs - Object with key-value pairs
   * @param {number} ttl - Time to live in seconds
   */
  async mset(keyValuePairs, ttl = null) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const serializedPairs = [];
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        serializedPairs.push(key, JSON.stringify(value));
      });

      await this.client.mSet(serializedPairs);

      // Set expiration for all keys if TTL provided
      if (ttl) {
        const promises = Object.keys(keyValuePairs).map(key => 
          this.client.expire(key, ttl)
        );
        await Promise.all(promises);
      }

      return true;

    } catch (error) {
      logger.error('Redis MSET error:', error.message);
      return false;
    }
  }

  /**
   * Delete keys by pattern
   * @param {string} pattern - Key pattern (e.g., "user:*")
   */
  async delPattern(pattern) {
    try {
      if (!this.isConnected || !this.client) {
        return 0;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.client.del(keys);
      logger.debug(`Deleted ${result} keys matching pattern: ${pattern}`);
      
      return result;

    } catch (error) {
      logger.error('Redis pattern delete error:', error.message);
      return 0;
    }
  }

  /**
   * Flush all cache data
   */
  async flushAll() {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      await this.client.flushAll();
      logger.info('Redis cache flushed');
      
      return true;

    } catch (error) {
      logger.error('Redis FLUSHALL error:', error.message);
      return false;
    }
  }

  /**
   * Get Redis connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      client: this.client ? 'initialized' : 'not initialized'
    };
  }

  /**
   * Health check for Redis
   */
  async healthCheck() {
    try {
      if (!this.isConnected || !this.client) {
        return {
          status: 'unhealthy',
          message: 'Redis not connected',
          timestamp: new Date().toISOString()
        };
      }

      // Test connection with ping
      const start = Date.now();
      const pong = await this.client.ping();
      const latency = Date.now() - start;

      if (pong !== 'PONG') {
        throw new Error('Invalid ping response');
      }

      // Get basic Redis info
      const info = await this.client.info('server');
      const memory = await this.client.info('memory');
      const clients = await this.client.info('clients');

      return {
        status: 'healthy',
        message: 'Redis connection is healthy',
        timestamp: new Date().toISOString(),
        details: {
          latency: `${latency}ms`,
          version: this.extractInfoValue(info, 'redis_version'),
          uptime: this.extractInfoValue(info, 'uptime_in_seconds'),
          memoryUsed: this.extractInfoValue(memory, 'used_memory_human'),
          connectedClients: this.extractInfoValue(clients, 'connected_clients')
        }
      };

    } catch (error) {
      logger.error('Redis health check failed:', error.message);
      return {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get Redis statistics
   */
  async getStats() {
    try {
      if (!this.isConnected || !this.client) {
        throw new Error('Redis not connected');
      }

      const info = await this.client.info();
      const keyspace = await this.client.info('keyspace');

      return {
        connection: this.getConnectionStatus(),
        server: {
          version: this.extractInfoValue(info, 'redis_version'),
          mode: this.extractInfoValue(info, 'redis_mode'),
          uptime: this.extractInfoValue(info, 'uptime_in_seconds')
        },
        memory: {
          used: this.extractInfoValue(info, 'used_memory_human'),
          peak: this.extractInfoValue(info, 'used_memory_peak_human'),
          fragmentation: this.extractInfoValue(info, 'mem_fragmentation_ratio')
        },
        stats: {
          totalConnections: this.extractInfoValue(info, 'total_connections_received'),
          totalCommands: this.extractInfoValue(info, 'total_commands_processed'),
          keyspaceHits: this.extractInfoValue(info, 'keyspace_hits'),
          keyspaceMisses: this.extractInfoValue(info, 'keyspace_misses')
        },
        keyspace: this.parseKeyspaceInfo(keyspace)
      };

    } catch (error) {
      logger.error('Failed to get Redis stats:', error.message);
      throw error;
    }
  }

  /**
   * Extract value from Redis INFO response
   */
  extractInfoValue(info, key) {
    try {
      const match = info.match(new RegExp(`${key}:(.+)`));
      return match ? match[1].trim() : 'N/A';
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * Parse keyspace information
   */
  parseKeyspaceInfo(keyspace) {
    const databases = {};
    
    try {
      const lines = keyspace.split('\r\n');
      
      lines.forEach(line => {
        const match = line.match(/^db(\d+):keys=(\d+),expires=(\d+),avg_ttl=(\d+)$/);
        if (match) {
          databases[`db${match[1]}`] = {
            keys: parseInt(match[2]),
            expires: parseInt(match[3]),
            avgTtl: parseInt(match[4])
          };
        }
      });
    } catch (error) {
      logger.error('Error parsing keyspace info:', error.message);
    }

    return databases;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        this.client = null;
        logger.info('Redis disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error.message);
      throw error;
    }
  }

  /**
   * Mask sensitive information in connection string
   */
  maskConnectionString(url) {
    try {
      return url.replace(/:([^@/]+)@/, ':***@');
    } catch (error) {
      return 'redis://***:***@***:***';
    }
  }
}

// Create singleton instance
const redisManager = new RedisManager();

/**
 * Connect to Redis (convenience function)
 */
async function connectRedis(options) {
  return await redisManager.connect(options);
}

/**
 * Get Redis connection status
 */
function getRedisStatus() {
  return redisManager.getConnectionStatus();
}

/**
 * Redis health check
 */
async function healthCheck() {
  return await redisManager.healthCheck();
}

/**
 * Get Redis statistics
 */
async function getRedisStats() {
  return await redisManager.getStats();
}

module.exports = {
  connectRedis,
  getRedisStatus,
  healthCheck,
  getRedisStats,
  redisManager
};