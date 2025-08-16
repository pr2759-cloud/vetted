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
