/**
 * Search Model
 * MongoDB schema for search queries, history, and analytics
 */

const mongoose = require('mongoose');
const { PRODUCT_CATEGORIES } = require('../config/constants');

// Search filters subdocument
const filtersSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: Object.keys(PRODUCT_CATEGORIES)
  },
  priceRange: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    }
  },
  rating: {
    min: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  brands: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  inStock: {
    type: Boolean
  },
  sortBy: {
    type: String,
    enum: ['relevance', 'price', 'rating', 'popularity', 'name', 'newest'],
    default: 'relevance'
  },
  sortOrder: {
    type: String,
    enum: ['asc', 'desc'],
    default: 'desc'
  }
}, { _id: false });

// Search results metadata subdocument
const resultsMetaSchema = new mongoose.Schema({
  totalFound: {
    type: Number,
    min: 0,
    default: 0
  },
  pageSize: {
    type: Number,
    min: 1,
    max: 100,
    default: 20
  },
  currentPage: {
    type: Number,
    min: 1,
    default: 1
  },
  searchTime: {
    type: Number, // milliseconds
    min: 0
  },
  fromCache: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Main Search Schema
const searchSchema = new mongoose.Schema({
  // Search Query
  query: {
    type: String,
    required: [true, 'Search query is required'],
    trim: true,
    maxlength: [500, 'Search query cannot exceed 500 characters'],
    index: 'text'
  },
  
  normalizedQuery: {
    type: String,
    trim: true,
    lowercase: true,
    index: true
  },
  
  queryType: {
    type: String,
    enum: ['text', 'voice', 'image', 'barcode'],
    default: 'text'
  },
  
  // Search Filters
  filters: filtersSchema,
  
  // Results Information
  resultsMeta: resultsMetaSchema,
  
  // User and Session
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  sessionId: {
    type: String,
    index: true
  },
  
  // Request Information
  ipAddress: {
    type: String,
    validate: {
      validator: function(v) {
        // Basic IP validation (IPv4 and IPv6)
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return !v || ipv4Regex.test(v) || ipv6Regex.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  
  userAgent: {
    type: String,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  },
  
  referrer: {
    type: String,
    maxlength: [300, 'Referrer cannot exceed 300 characters']
  },
  
  // Geographic Information
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Device Information
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    os: String,
    browser: String,
    isMobile: {
      type: Boolean,
      default: false
    }
  },
  
  // Search Context
  context: {
    source: {
      type: String,
      enum: ['homepage', 'category', 'product', 'recommendation', 'autocomplete', 'external'],
      default: 'homepage'
    },
    previousQuery: String,
    previousCategory: String,
    searchSequence: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  
  // Search Outcome
  outcome: {
    hadResults: {
      type: Boolean,
      default: true
    },
    clickedResult: {
      type: Boolean,
      default: false
    },
    clickedProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    clickPosition: {
      type: Number,
      min: 1
    },
    timeToClick: {
      type: Number, // milliseconds
      min: 0
    },
    refinedSearch: {
      type: Boolean,
      default: false
    },
    abandoned: {
      type: Boolean,
      default: false
    }
  },
  
  // Analytics Tags
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Performance Metrics
  performance: {
    searchLatency: {
      type: Number, // milliseconds
      min: 0
    },
    renderTime: {
      type: Number, // milliseconds
      min: 0
    },
    cacheHit: {
      type: Boolean,
      default: false
    }
  },
  
  // Experiment and Testing
  experimentId: String,
  testGroup: String,
  
  // Timestamps
  searchedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
searchSchema.index({ normalizedQuery: 1, searchedAt: -1 });
searchSchema.index({ userId: 1, searchedAt: -1 });
searchSchema.index({ sessionId: 1, searchedAt: -1 });
searchSchema.index({ 'filters.category': 1, searchedAt: -1 });
searchSchema.index({ ipAddress: 1, searchedAt: -1 });
searchSchema.index({ 'context.source': 1, searchedAt: -1 });
searchSchema.index({ 'outcome.hadResults': 1, searchedAt: -1 });

// Compound indexes for analytics
searchSchema.index({ normalizedQuery: 1, 'outcome.hadResults': 1, searchedAt: -1 });
searchSchema.index({ 'filters.category': 1, 'outcome.clickedResult': 1, searchedAt: -1 });
searchSchema.index({ userId: 1, 'outcome.clickedResult': 1, searchedAt: -1 });

// TTL index for automatic cleanup (optional - remove if you want to keep all data)
searchSchema.index({ searchedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year

// Virtual fields
searchSchema.virtual('hasFilters').get(function() {
  return this.filters && (
    this.filters.category ||
    this.filters.priceRange ||
    this.filters.rating ||
    (this.filters.brands && this.filters.brands.length > 0) ||
    (this.filters.tags && this.filters.tags.length > 0) ||
    this.filters.inStock !== undefined
  );
});

searchSchema.virtual('isSuccessful').get(function() {
  return this.outcome && this.outcome.hadResults && this.outcome.clickedResult;
});

searchSchema.virtual('searchDuration').get(function() {
  return this.outcome && this.outcome.timeToClick ? this.outcome.timeToClick : null;
});

searchSchema.virtual('categoryContext').get(function() {
  return this.filters && this.filters.category ? 
    PRODUCT_CATEGORIES[this.filters.category] : null;
});

// Pre-save middleware
searchSchema.pre('save', function(next) {
  // Generate normalized query for better analytics
  if (this.query && !this.normalizedQuery) {
    this.normalizedQuery = this.query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }
  
  // Auto-tag based on content
  if (!this.tags || this.tags.length === 0) {
    this.tags = this.generateAutoTags();
  }
  
  next();
});

// Instance Methods
searchSchema.methods.recordClick = function(productId, position, timeToClick) {
  this.outcome.clickedResult = true;
  this.outcome.clickedProductId = productId;
  this.outcome.clickPosition = position;
  this.outcome.timeToClick = timeToClick;
  return this.save();
};

searchSchema.methods.markAsAbandoned = function() {
  this.outcome.abandoned = true;
  return this.save();
};

searchSchema.methods.markAsRefined = function() {
  this.outcome.refinedSearch = true;
  return this.save();
};

searchSchema.methods.generateAutoTags = function() {
  const tags = [];
  
  // Add category tag
  if (this.filters && this.filters.category) {
    tags.push(this.filters.category);
  }
  
  // Add query length tag
  if (this.query) {
    const wordCount = this.query.split(/\s+/).length;
    if (wordCount === 1) tags.push('single-word');
    else if (wordCount <= 3) tags.push('short-query');
    else tags.push('long-query');
  }
  
  // Add filter complexity tag
  if (this.hasFilters) {
    tags.push('filtered-search');
  } else {
    tags.push('simple-search');
  }
  
  // Add device tag
  if (this.device && this.device.type) {
    tags.push(this.device.type);
  }
  
  // Add source tag
  if (this.context && this.context.source) {
    tags.push(`source-${this.context.source}`);
  }
  
  return tags;
};

searchSchema.methods.calculateRelevanceScore = function() {
  let score = 0;
  
  // Base score for having results
  if (this.outcome && this.outcome.hadResults) {
    score += 50;
  }
  
  // Bonus for clicks
  if (this.outcome && this.outcome.clickedResult) {
    score += 30;
    
    // Bonus for early clicks (higher position = earlier)
    if (this.outcome.clickPosition) {
      const positionBonus = Math.max(0, 20 - this.outcome.clickPosition);
      score += positionBonus;
    }
  }
  
  // Penalty for abandoned searches
  if (this.outcome && this.outcome.abandoned) {
    score -= 20;
  }
  
  return Math.max(0, Math.min(100, score));
};

// Static Methods
searchSchema.statics.getTrendingQueries = function(timeframe = '24h', limit = 20) {
  const timeAgo = new Date();
  
  switch (timeframe) {
    case '1h':
      timeAgo.setHours(timeAgo.getHours() - 1);
      break;
    case '24h':
      timeAgo.setDate(timeAgo.getDate() - 1);
      break;
    case '7d':
      timeAgo.setDate(timeAgo.getDate() - 7);
      break;
    case '30d':
      timeAgo.setDate(timeAgo.getDate() - 30);
      break;
    default:
      timeAgo.setDate(timeAgo.getDate() - 1);
  }
  
  return this.aggregate([
    {
      $match: {
        searchedAt: { $gte: timeAgo },
        'outcome.hadResults': true
      }
    },
    {
      $group: {
        _id: '$normalizedQuery',
        count: { $sum: 1 },
        originalQuery: { $first: '$query' },
        successRate: {
          $avg: {
            $cond: ['$outcome.clickedResult', 1, 0]
          }
        },
        avgPosition: { $avg: '$outcome.clickPosition' }
      }
    },
    {
      $sort: { count: -1, successRate: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

searchSchema.statics.getSearchAnalytics = function(timeframe = '7d', groupBy = 'day') {
  const timeAgo = new Date();
  
  switch (timeframe) {
    case '24h':
      timeAgo.setDate(timeAgo.getDate() - 1);
      break;
    case '7d':
      timeAgo.setDate(timeAgo.getDate() - 7);
      break;
    case '30d':
      timeAgo.setDate(timeAgo.getDate() - 30);
      break;
    default:
      timeAgo.setDate(timeAgo.getDate() - 7);
  }
  
  let dateGrouping;
  switch (groupBy) {
    case 'hour':
      dateGrouping = {
        year: { $year: '$searchedAt' },
        month: { $month: '$searchedAt' },
        day: { $dayOfMonth: '$searchedAt' },
        hour: { $hour: '$searchedAt' }
      };
      break;
    case 'day':
      dateGrouping = {
        year: { $year: '$searchedAt' },
        month: { $month: '$searchedAt' },
        day: { $dayOfMonth: '$searchedAt' }
      };
      break;
    case 'month':
      dateGrouping = {
        year: { $year: '$searchedAt' },
        month: { $month: '$searchedAt' }
      };
      break;
    default:
      dateGrouping = {
        year: { $year: '$searchedAt' },
        month: { $month: '$searchedAt' },
        day: { $dayOfMonth: '$searchedAt' }
      };
  }
  
  return this.aggregate([
    {
      $match: {
        searchedAt: { $gte: timeAgo }
      }
    },
    {
      $group: {
        _id: dateGrouping,
        totalSearches: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        successfulSearches: {
          $sum: {
            $cond: ['$outcome.clickedResult', 1, 0]
          }
        },
        noResultsSearches: {
          $sum: {
            $cond: [{ $eq: ['$outcome.hadResults', false] }, 1, 0]
          }
        },
        avgSearchTime: { $avg: '$performance.searchLatency' },
        topCategories: { $push: '$filters.category' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' },
        successRate: {
          $cond: [
            { $gt: ['$totalSearches', 0] },
            { $divide: ['$successfulSearches', '$totalSearches'] },
            0
          ]
        },
        noResultsRate: {
          $cond: [
            { $gt: ['$totalSearches', 0] },
            { $divide: ['$noResultsSearches', '$totalSearches'] },
            0
          ]
        }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
    }
  ]);
};

searchSchema.statics.getTopFailedQueries = function(timeframe = '7d', limit = 20) {
  const timeAgo = new Date();
  timeAgo.setDate(timeAgo.getDate() - (timeframe === '24h' ? 1 : 7));
  
  return this.aggregate([
    {
      $match: {
        searchedAt: { $gte: timeAgo },
        $or: [
          { 'outcome.hadResults': false },
          { 'outcome.abandoned': true }
        ]
      }
    },
    {
      $group: {
        _id: '$normalizedQuery',
        count: { $sum: 1 },
        originalQuery: { $first: '$query' },
        noResultsCount: {
          $sum: {
            $cond: [{ $eq: ['$outcome.hadResults', false] }, 1, 0]
          }
        },
        abandonedCount: {
          $sum: {
            $cond: ['$outcome.abandoned', 1, 0]
          }
        }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

searchSchema.statics.getUserSearchHistory = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ searchedAt: -1 })
    .limit(limit)
    .populate('outcome.clickedProductId', 'name slug category')
    .select('query filters outcome searchedAt');
};

searchSchema.statics.getSearchSuggestions = function(partialQuery, limit = 10) {
  const regex = new RegExp(partialQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\searchSchema.statics.getTrendingQueries = function(timeframe = '24h', limit = 20) {
  const timeAgo = new Date();
  
  switch (timeframe) {
    case '1h':
      timeAgo.setHours(timeAgo.getHours() - 1);
      break;
    case '24h':
      timeAgo.setDate(timeAgo.getDate() - 1);
      break;
    case '7d':
      timeAgo.setDate(timeAgo.getDate() - 7);
      break;
    case '30d':
      timeAgo.setDate(timeAgo.getDate() - 30);
      break;
    default:
      timeAgo.setDate(timeAgo.getDate() - 1);
  }
  
  return this.aggregate([
    {
      $match: {
        searchedAt: { $gte: timeAgo },
        'outcome.hadResults': true
      }
    },
    {
      $group: {
        _id: '$normalizedQuery',
        count: { $sum: 1 },
        originalQuery: { $first: '$query' },
        successRate: {
          $avg: {
            $cond: ['$outcome.clickedResult', 1, 0]
          }
        },
        avgPosition: { $avg: '$outcome.clickPosition' }
      }'), 'i');
  
  return this.aggregate([
    {
      $match: {
        query: regex,
        'outcome.hadResults': true,
        searchedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }
    },
    {
      $group: {
        _id: '$normalizedQuery',
        query: { $first: '$query' },
        count: { $sum: 1 },
        successRate: {
          $avg: {
            $cond: ['$outcome.clickedResult', 1, 0]
          }
        }
      }
    },
    {
      $match: {
        count: { $gte: 2 } // Minimum 2 occurrences
      }
    },
    {
      $sort: { count: -1, successRate: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: 0,
        query: 1,
        count: 1,
        successRate: 1
      }
    }
  ]);
};

searchSchema.statics.getCategoryPopularity = function(timeframe = '30d') {
  const timeAgo = new Date();
  timeAgo.setDate(timeAgo.getDate() - 30);
  
  return this.aggregate([
    {
      $match: {
        searchedAt: { $gte: timeAgo },
        'filters.category': { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$filters.category',
        searchCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        successRate: {
          $avg: {
            $cond: ['$outcome.clickedResult', 1, 0]
          }
        }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { searchCount: -1 }
    }
  ]);
};

searchSchema.statics.getDeviceAnalytics = function(timeframe = '30d') {
  const timeAgo = new Date();
  timeAgo.setDate(timeAgo.getDate() - 30);
  
  return this.aggregate([
    {
      $match: {
        searchedAt: { $gte: timeAgo }
      }
    },
    {
      $group: {
        _id: {
          deviceType: '$device.type',
          os: '$device.os',
          browser: '$device.browser'
        },
        searchCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgSearchTime: { $avg: '$performance.searchLatency' },
        successRate: {
          $avg: {
            $cond: ['$outcome.clickedResult', 1, 0]
          }
        }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { searchCount: -1 }
    }
  ]);
};

searchSchema.statics.findAbandonedSearchPatterns = function(timeframe = '7d') {
  const timeAgo = new Date();
  timeAgo.setDate(timeAgo.getDate() - 7);
  
  return this.aggregate([
    {
      $match: {
        searchedAt: { $gte: timeAgo },
        'outcome.abandoned': true
      }
    },
    {
      $group: {
        _id: {
          query: '$normalizedQuery',
          category: '$filters.category',
          hasFilters: {
            $cond: [
              {
                $or: [
                  { $ne: ['$filters.category', null] },
                  { $ne: ['$filters.priceRange', null] },
                  { $gt: [{ $size: { $ifNull: ['$filters.brands', []] } }, 0] }
                ]
              },
              true,
              false
            ]
          }
        },
        count: { $sum: 1 },
        avgSearchTime: { $avg: '$performance.searchLatency' },
        commonSources: { $push: '$context.source' }
      }
    },
    {
      $match: {
        count: { $gte: 3 } // Minimum 3 abandoned searches
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 50
    }
  ]);
};

// Query helpers
searchSchema.query.successful = function() {
  return this.where({ 'outcome.clickedResult': true });
};

searchSchema.query.failed = function() {
  return this.where({ 'outcome.hadResults': false });
};

searchSchema.query.abandoned = function() {
  return this.where({ 'outcome.abandoned': true });
};

searchSchema.query.fromCategory = function(category) {
  return this.where({ 'filters.category': category });
};

searchSchema.query.byUser = function(userId) {
  return this.where({ userId });
};

searchSchema.query.byDevice = function(deviceType) {
  return this.where({ 'device.type': deviceType });
};

searchSchema.query.recent = function(hours = 24) {
  const timeAgo = new Date();
  timeAgo.setHours(timeAgo.getHours() - hours);
  return this.where({ searchedAt: { $gte: timeAgo } });
};

// Export the model
module.exports = mongoose.model('Search', searchSchema);
