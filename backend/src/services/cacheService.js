/**
 * Cache Service
 * Centralized caching service with Redis backend and fallback strategies
 */

const { redisManager } = require('../config/redis');
const { logger } = require('../utils/logger');
const { CACHE_TTL } = require('../config/constants');

class CacheService {
  constructor() {
    this.localCache = new Map();
    this.localCacheMaxSize = 1000;
    this.isRedisAvailable = false;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Initialize cache service
   */
  async initialize() {
    try {
      this.isRedisAvailable = redisManager.isConnected;
      logger.info('Cache service initialized', {
        redis: this.isRedisAvailable ? 'available' : 'unavailable',
        fallback: 'memory'
      });
    } catch (error) {
      logger.error('Cache service initialization error:', error);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  async get(key) {
    try {
      if (!key) {
        logger.warn('Cache get called with empty key');
        return null;
      }

      // Try Redis first if available
      if (this.isRedisAvailable) {
        const value = await redisManager.get(key);
        if (value !== null) {
          this.stats.hits++;
          logger.debug(`Redis cache hit: ${key}`);
          return value;
        }
      }

      // Fallback to local cache
      const localValue = this.localCache.get(key);
      if (localValue) {
        // Check if expired
        if (localValue.expiresAt && Date.now() > localValue.expiresAt) {
          this.localCache.delete(key);
          this.stats.misses++;
          return null;
        }
        
        this.stats.hits++;
        logger.debug(`Local cache hit: ${key}`);
        return localValue.data;
      }

      this.stats.misses++;
      return null;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = CACHE_TTL.MEDIUM) {
    try {
      if (!key) {
        logger.warn('Cache set called with empty key');
        return false;
      }

      if (value === undefined) {
        logger.warn('Cache set called with undefined value', { key });
        return false;
      }

      // Try Redis first if available
      if (this.isRedisAvailable) {
        const success = await redisManager.set(key, value, ttl);
        if (success) {
          this.stats.sets++;
          logger.debug(`Redis cache set: ${key} (TTL: ${ttl}s)`);
          return true;
        }
      }

      // Fallback to local cache
      this.setLocal(key, value, ttl);
      this.stats.sets++;
      logger.debug(`Local cache set: ${key} (TTL: ${ttl}s)`);
      
      return true;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache set error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Set value in local cache
   */
  setLocal(key, value, ttl) {
    // Clean up local cache if it's getting too large
    if (this.localCache.size >= this.localCacheMaxSize) {
      this.cleanupLocalCache();
    }

    const expiresAt = ttl ? Date.now() + (ttl * 1000) : null;
    
    this.localCache.set(key, {
      data: value,
      expiresAt,
      createdAt: Date.now()
    });
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key to delete
   */
  async del(key) {
    try {
      if (!key) return false;

      let deleted = false;

      // Delete from Redis if available
      if (this.isRedisAvailable) {
        deleted = await redisManager.del(key);
      }

      // Delete from local cache
      const localDeleted = this.localCache.delete(key);
      
      if (deleted || localDeleted) {
        this.stats.deletes++;
        logger.debug(`Cache delete: ${key}`);
        return true;
      }

      return false;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache delete error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   */
  async exists(key) {
    try {
      if (!key) return false;

      // Check Redis first if available
      if (this.isRedisAvailable) {
        const exists = await redisManager.exists(key);
        if (exists) return true;
      }

      // Check local cache
      const localValue = this.localCache.get(key);
      if (localValue) {
        // Check if expired
        if (localValue.expiresAt && Date.now() > localValue.expiresAt) {
          this.localCache.delete(key);
          return false;
        }
        return true;
      }

      return false;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache exists error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get multiple keys at once
   * @param {string[]} keys - Array of cache keys
   */
  async mget(keys) {
    try {
      if (!Array.isArray(keys) || keys.length === 0) {
        return {};
      }

      const result = {};
      let remainingKeys = [...keys];

      // Try Redis first if available
      if (this.isRedisAvailable) {
        const redisValues = await redisManager.mget(keys);
        
        Object.entries(redisValues).forEach(([key, value]) => {
          if (value !== null) {
            result[key] = value;
            remainingKeys = remainingKeys.filter(k => k !== key);
            this.stats.hits++;
          }
        });
      }

      // Get remaining keys from local cache
      remainingKeys.forEach(key => {
        const localValue = this.localCache.get(key);
        if (localValue) {
          // Check if expired
          if (localValue.expiresAt && Date.now() > localValue.expiresAt) {
            this.localCache.delete(key);
            this.stats.misses++;
          } else {
            result[key] = localValue.data;
            this.stats.hits++;
          }
        } else {
          this.stats.misses++;
        }
      });

      return result;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache mget error:', error);
      return {};
    }
  }

  /**
   * Set multiple key-value pairs
   * @param {Object} keyValuePairs - Object with key-value pairs
   * @param {number} ttl - Time to live in seconds
   */
  async mset(keyValuePairs, ttl = CACHE_TTL.MEDIUM) {
    try {
      if (!keyValuePairs || Object.keys(keyValuePairs).length === 0) {
        return false;
      }

      // Try Redis first if available
      if (this.isRedisAvailable) {
        const success = await redisManager.mset(keyValuePairs, ttl);
        if (success) {
          this.stats.sets += Object.keys(keyValuePairs).length;
          return true;
        }
      }

      // Fallback to local cache
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        this.setLocal(key, value, ttl);
      });

      this.stats.sets += Object.keys(keyValuePairs).length;
      return true;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Increment counter
   * @param {string} key - Counter key
   * @param {number} increment - Increment value
   */
  async incr(key, increment = 1) {
    try {
      if (!key) return 0;

      // Try Redis first if available
      if (this.isRedisAvailable) {
        return await redisManager.incr(key, increment);
      }

      // Fallback to local cache
      const current = this.localCache.get(key);
      const currentValue = current ? (current.data || 0) : 0;
      const newValue = currentValue + increment;
      
      this.setLocal(key, newValue, CACHE_TTL.LONG);
      
      return newValue;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache incr error:', { key, error: error.message });
      return 0;
    }
  }

  /**
   * Delete keys by pattern
   * @param {string} pattern - Key pattern (e.g., "user:*")
   */
  async delPattern(pattern) {
    try {
      let deletedCount = 0;

      // Delete from Redis if available
      if (this.isRedisAvailable) {
        deletedCount += await redisManager.delPattern(pattern);
      }

      // Delete from local cache
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      const keysToDelete = [];
      
      for (const key of this.localCache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => {
        this.localCache.delete(key);
        deletedCount++;
      });

      this.stats.deletes += deletedCount;
      logger.debug(`Pattern delete: ${pattern}, deleted: ${deletedCount}`);
      
      return deletedCount;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache pattern delete error:', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Flush all cache data
   */
  async flushAll() {
    try {
      // Flush Redis if available
      if (this.isRedisAvailable) {
        await redisManager.flushAll();
      }

      // Clear local cache
      this.localCache.clear();
      
      logger.info('Cache flushed');
      return true;

    } catch (error) {
      this.stats.errors++;
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Cleanup expired entries from local cache
   */
  cleanupLocalCache() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, value] of this.localCache.entries()) {
      if (value.expiresAt && now > value.expiresAt) {
        keysToDelete.push(key);
      }
    }

    // If still too many entries, remove oldest ones
    if (this.localCache.size - keysToDelete.length >= this.localCacheMaxSize) {
      const entries = Array.from(this.localCache.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt);
      
      const toRemove = Math.floor(this.localCacheMaxSize * 0.2); // Remove 20%
      for (let i = 0; i < toRemove; i++) {
        if (entries[i]) {
          keysToDelete.push(entries[i][0]);
        }
      }
    }

    keysToDelete.forEach(key => this.localCache.delete(key));
    
    if (keysToDelete.length > 0) {
      logger.debug(`Local cache cleanup: removed ${keysToDelete.length} entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 ? 
      (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      localCacheSize: this.localCache.size,
      maxLocalCacheSize: this.localCacheMaxSize,
      redisAvailable: this.isRedisAvailable
    };
  }

  /**
   * Health check for cache service
   */
  async healthCheck() {
    try {
      const testKey = `health:${Date.now()}`;
      const testValue = { test: true, timestamp: Date.now() };

      // Test set operation
      const setSuccess = await this.set(testKey, testValue, 60);
      if (!setSuccess) {
        throw new Error('Cache set operation failed');
      }

      // Test get operation
      const getValue = await this.get(testKey);
      if (!getValue || getValue.test !== true) {
        throw new Error('Cache get operation failed');
      }

      // Test delete operation
      const delSuccess = await this.del(testKey);
      if (!delSuccess) {
        logger.warn('Cache delete operation failed during health check');
      }

      return {
        status: 'healthy',
        message: 'Cache service is operational',
        timestamp: new Date().toISOString(),
        stats: this.getStats(),
        details: {
          redis: this.isRedisAvailable ? 'connected' : 'unavailable',
          localCache: 'operational'
        }
      };

    } catch (error) {
      logger.error('Cache health check failed:', error);
      return {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date().toISOString(),
        stats: this.getStats()
      };
    }
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Get TTL for a key
   */
  async ttl(key) {
    try {
      if (!key) return -1;

      // Check Redis first if available
      if (this.isRedisAvailable) {
        return await redisManager.ttl(key);
      }

      // Check local cache
      const localValue = this.localCache.get(key);
      if (localValue && localValue.expiresAt) {
        const remaining = localValue.expiresAt - Date.now();
        return remaining > 0 ? Math.floor(remaining / 1000) : -1;
      }

      return -1;

    } catch (error) {
      logger.error('Cache TTL error:', { key, error: error.message });
      return -1;
    }
  }

  /**
   * Cache wrapper for functions
   * @param {string} key - Cache key
   * @param {Function} fn - Function to cache
   * @param {number} ttl - Cache TTL in seconds
   */
  async wrap(key, fn, ttl = CACHE_TTL.MEDIUM) {
    try {
      // Try to get from cache first
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const result = await fn();
      await this.set(key, result, ttl);
      
      return result;

    } catch (error) {
      logger.error('Cache wrap error:', { key, error: error.message });
      // If caching fails, still return the function result
      return await fn();
    }
  }

  /**
   * Batch cache operations
   */
  async batch(operations) {
    const results = [];
    
    for (const op of operations) {
      try {
        switch (op.type) {
          case 'get':
            results.push(await this.get(op.key));
            break;
          case 'set':
            results.push(await this.set(op.key, op.value, op.ttl));
            break;
          case 'del':
            results.push(await this.del(op.key));
            break;
          default:
            results.push(null);
        }
      } catch (error) {
        logger.error('Batch operation error:', { operation: op, error: error.message });
        results.push(null);
      }
    }
    
    return results;
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Initialize on module load
cacheService.initialize().catch(error => {
  logger.error('Failed to initialize cache service:', error);
});

module.exports = cacheService;