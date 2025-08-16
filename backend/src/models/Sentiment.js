/**
 * Sentiment Model
 * MongoDB schema for sentiment analysis data and tracking
 */

const mongoose = require('mongoose');
const { SENTIMENT_LABELS } = require('../config/constants');

// Sentiment breakdown subdocument
const breakdownSchema = new mongoose.Schema({
  quality: {
    type: Number,
    min: -1,
    max: 1,
    required: true
  },
  value: {
    type: Number,
    min: -1,
    max: 1,
    required: true
  },
  popularity: {
    type: Number,
    min: -1,
    max: 1,
    required: true
  },
  reliability: {
    type: Number,
    min: -1,
    max: 1,
    required: true
  },
  // Additional custom metrics
  innovation: {
    type: Number,
    min: -1,
    max: 1
  },
  sustainability: {
    type: Number,
    min: -1,
    max: 1
  }
}, { _id: false });

// Source-specific sentiment data
const sourceDataSchema = new mongoose.Schema({
  mentions: {
    type: Number,
    min: 0,
    required: true
  },
  avgScore: {
    type: Number,
    min: -1,
    max: 1,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Sentiment sources subdocument
const sourcesSchema = new mongoose.Schema({
  reddit: sourceDataSchema,
  twitter: sourceDataSchema,
  reviews: sourceDataSchema,
  youtube: sourceDataSchema,
  blogs: sourceDataSchema,
  forums: sourceDataSchema,
  news: sourceDataSchema
}, { _id: false });

// Historical sentiment data point
const historyPointSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  score: {
    type: Number,
    min: -1,
    max: 1,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  mentionCount: {
    type: Number,
    min: 0,
    required: true
  },
  label: {
    type: String,
    enum: Object.keys(SENTIMENT_LABELS),
    required: true
  }
}, { _id: false });

// Main Sentiment Schema
const sentimentSchema = new mongoose.Schema({
  // Product Reference
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required'],
    unique: true,
    index: true
  },
  
  // Current Sentiment
  label: {
    type: String,
    enum: {
      values: Object.keys(SENTIMENT_LABELS),
      message: 'Invalid sentiment label'
    },
    required: [true, 'Sentiment label is required'],
    index: true
  },
  
  score: {
    type: Number,
    min: [-1, 'Sentiment score cannot be less than -1'],
    max: [1, 'Sentiment score cannot be greater than 1'],
    required: [true, 'Sentiment score is required'],
    index: true
  },
  
  confidence: {
    type: Number,
    min: [0, 'Confidence cannot be less than 0'],
    max: [1, 'Confidence cannot be greater than 1'],
    required: [true, 'Confidence is required'],
    index: true
  },
  
  // Mention and Engagement Data
  mentionCount: {
    type: Number,
    min: [0, 'Mention count cannot be negative'],
    default: 0,
    index: true
  },
  
  uniqueMentioners: {
    type: Number,
    min: 0,
    default: 0
  },
  
  totalEngagement: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Trending Information
  trending: {
    type: String,
    enum: ['up', 'down', 'stable', 'new'],
    default: 'stable',
    index: true
  },
  
  trendingScore: {
    type: Number,
    min: 0,
    default: 0
  },
  
  velocityScore: {
    type: Number,
    default: 0
  },
  
  // Detailed Breakdown
  breakdown: {
    type: breakdownSchema,
    required: true
  },
  
  // Source-specific Data
  sources: sourcesSchema,
  
  // Historical Data (last 30 days)
  history: [historyPointSchema],
  
  // Keywords and Topics
  keywords: [{
    word: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    frequency: {
      type: Number,
      min: 0,
      required: true
    },
    sentiment: {
      type: Number,
      min: -1,
      max: 1,
      required: true
    }
  }],
  
  topicDistribution: [{
    topic: {
      type: String,
      required: true,
      trim: true
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },
    sentiment: {
      type: Number,
      min: -1,
      max: 1,
      required: true
    }
  }],
  
  // Analysis Metadata
  analysisVersion: {
    type: String,
    default: '1.0'
  },
  
  lastAnalyzed: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  nextAnalysisScheduled: {
    type: Date,
    index: true
  },
  
  // Quality Indicators
  dataQuality: {
    completeness: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    },
    freshness: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    },
    reliability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    }
  },
  
  // Alerts and Notifications
  alerts: [{
    type: {
      type: String,
      enum: ['significant_change', 'negative_spike', 'positive_surge', 'low_confidence', 'data_gap'],
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    triggered: {
      type: Date,
      default: Date.now
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Processing Status
  status: {
    type: String,
    enum: ['active', 'processing', 'stale', 'error', 'insufficient_data'],
    default: 'active',
    index: true
  },
  
  processingErrors: [{
    error: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    source: String
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
sentimentSchema.index({ productId: 1, lastAnalyzed: -1 });
sentimentSchema.index({ label: 1, score: -1 });
sentimentSchema.index({ trending: 1, trendingScore: -1 });
sentimentSchema.index({ mentionCount: -1, confidence: -1 });
sentimentSchema.index({ 'dataQuality.reliability': -1, score: -1 });
sentimentSchema.index({ status: 1, nextAnalysisScheduled: 1 });

// Compound indexes for analytics
sentimentSchema.index({ label: 1, trending: 1, lastAnalyzed: -1 });
sentimentSchema.index({ score: -1, confidence: -1, mentionCount: -1 });

// Virtual fields
sentimentSchema.virtual('labelInfo').get(function() {
  return SENTIMENT_LABELS[this.label] || SENTIMENT_LABELS.INSUFFICIENT_DATA;
});

sentimentSchema.virtual('overallQuality').get(function() {
  if (!this.dataQuality) return 0;
  const { completeness, freshness, reliability } = this.dataQuality;
  return (completeness + freshness + reliability) / 3;
});

sentimentSchema.virtual('isStale').get(function() {
  const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours
  return Date.now() - this.lastAnalyzed.getTime() > staleThreshold;
});

sentimentSchema.virtual('hasRecentActivity').get(function() {
  const recentThreshold = 60 * 60 * 1000; // 1 hour
  return Date.now() - this.lastAnalyzed.getTime() < recentThreshold;
});

sentimentSchema.virtual('totalSources').get(function() {
  if (!this.sources) return 0;
  return Object.values(this.sources).filter(source => source && source.mentions > 0).length;
});

sentimentSchema.virtual('avgSourceScore').get(function() {
  if (!this.sources) return this.score;
  
  const activeSources = Object.values(this.sources).filter(source => source && source.mentions > 0);
  if (activeSources.length === 0) return this.score;
  
  const totalScore = activeSources.reduce((sum, source) => sum + source.avgScore, 0);
  return totalScore / activeSources.length;
});

// Pre-save middleware
sentimentSchema.pre('save', function(next) {
  // Update timestamp
  this.updatedAt = new Date();
  
  // Validate score matches label
  const expectedLabel = this.scoreToLabel(this.score);
  if (this.label !== expectedLabel) {
    this.label = expectedLabel;
  }
  
  // Calculate trending score
  this.trendingScore = this.calculateTrendingScore();
  
  // Update data quality metrics
  this.updateDataQuality();
  
  // Check for alerts
  this.checkForAlerts();
  
  next();
});

// Instance Methods
sentimentSchema.methods.scoreToLabel = function(score) {
  if (score >= 0.7) return 'highly-regarded';
  if (score >= 0.3) return 'well-regarded';
  if (score >= -0.3) return 'mixed-reviews';
  if (score >= -0.7) return 'poorly-regarded';
  return 'highly-criticized';
};

sentimentSchema.methods.calculateTrendingScore = function() {
  let score = 0;
  
  // Base score from mention count
  score += Math.log(this.mentionCount + 1) / 10;
  
  // Trending direction bonus
  switch (this.trending) {
    case 'up':
      score += 0.5;
      break;
    case 'new':
      score += 0.7;
      break;
    case 'down':
      score -= 0.3;
      break;
    default:
      // stable
      break;
  }
  
  // Confidence bonus
  score += this.confidence * 0.2;
  
  // Positive sentiment bonus
  if (this.score > 0.5) {
    score += 0.3;
  }
  
  return Math.max(0, score);
};

sentimentSchema.methods.updateDataQuality = function() {
  if (!this.dataQuality) {
    this.dataQuality = {};
  }
  
  // Completeness: based on available sources
  const totalPossibleSources = 7; // reddit, twitter, reviews, youtube, blogs, forums, news
  const activeSources = this.totalSources;
  this.dataQuality.completeness = activeSources / totalPossibleSources;
  
  // Freshness: based on last analysis time
  const hoursSinceUpdate = (Date.now() - this.lastAnalyzed.getTime()) / (1000 * 60 * 60);
  this.dataQuality.freshness = Math.max(0, 1 - hoursSinceUpdate / 24);
  
  // Reliability: based on confidence and mention count
  const mentionReliability = Math.min(1, this.mentionCount / 100);
  this.dataQuality.reliability = (this.confidence + mentionReliability) / 2;
};

sentimentSchema.methods.checkForAlerts = function() {
  const alerts = [];
  
  // Check for significant score changes
  if (this.history && this.history.length > 1) {
    const previousScore = this.history[this.history.length - 2].score;
    const scoreDiff = Math.abs(this.score - previousScore);
    
    if (scoreDiff > 0.5) {
      alerts.push({
        type: 'significant_change',
        severity: scoreDiff > 0.7 ? 'high' : 'medium',
        message: `Sentiment score changed by ${(scoreDiff * 100).toFixed(1)}%`
      });
    }
  }
  
  // Check for negative spikes
  if (this.score < -0.5 && this.trending === 'down') {
    alerts.push({
      type: 'negative_spike',
      severity: this.score < -0.7 ? 'critical' : 'high',
      message: 'Negative sentiment spike detected'
    });
  }
  
  // Check for low confidence
  if (this.confidence < 0.6) {
    alerts.push({
      type: 'low_confidence',
      severity: this.confidence < 0.4 ? 'medium' : 'low',
      message: `Low confidence in sentiment analysis (${(this.confidence * 100).toFixed(1)}%)`
    });
  }
  
  // Check for insufficient data
  if (this.mentionCount < 10) {
    alerts.push({
      type: 'data_gap',
      severity: 'low',
      message: 'Insufficient mention data for reliable analysis'
    });
  }
  
  // Add new alerts only
  alerts.forEach(alert => {
    const existingAlert = this.alerts.find(a => 
      a.type === alert.type && !a.acknowledged
    );
    
    if (!existingAlert) {
      this.alerts.push(alert);
    }
  });
};

sentimentSchema.methods.addHistoryPoint = function(score, confidence, mentionCount, label) {
  const historyPoint = {
    date: new Date(),
    score,
    confidence,
    mentionCount,
    label
  };
  
  this.history.push(historyPoint);
  
  // Keep only last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  this.history = this.history.filter(point => point.date >= ninetyDaysAgo);
  
  return this.save();
};

sentimentSchema.methods.updateSource = function(sourceName, mentions, avgScore, confidence) {
  if (!this.sources) {
    this.sources = {};
  }
  
  this.sources[sourceName] = {
    mentions,
    avgScore,
    confidence: confidence || 0.5,
    lastUpdated: new Date()
  };
  
  return this.save();
};

sentimentSchema.methods.acknowledgeAlert = function(alertId, userId) {
  const alert = this.alerts.id(alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
  }
  return this.save();
};

sentimentSchema.methods.calculateTrend = function(days = 7) {
  if (!this.history || this.history.length < 2) {
    return 'stable';
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentHistory = this.history
    .filter(point => point.date >= cutoffDate)
    .sort((a, b) => a.date - b.date);
  
  if (recentHistory.length < 2) {
    return 'stable';
  }
  
  const firstScore = recentHistory[0].score;
  const lastScore = recentHistory[recentHistory.length - 1].score;
  const change = lastScore - firstScore;
  
  if (change > 0.1) return 'up';
  if (change < -0.1) return 'down';
  return 'stable';
};

sentimentSchema.methods.getInsights = function() {
  const insights = [];
  
  // Score-based insights
  if (this.score > 0.8) {
    insights.push('Exceptional community sentiment - product is highly beloved');
  } else if (this.score > 0.5) {
    insights.push('Strong positive sentiment from users');
  } else if (this.score < -0.5) {
    insights.push('Concerning negative sentiment detected');
  } else {
    insights.push('Mixed sentiment - individual experiences vary');
  }
  
  // Confidence insights
  if (this.confidence > 0.9) {
    insights.push('Very high confidence in sentiment analysis');
  } else if (this.confidence < 0.6) {
    insights.push('Moderate confidence - consider gathering more data');
  }
  
  // Trending insights
  if (this.trending === 'up') {
    insights.push('Sentiment is improving over time');
  } else if (this.trending === 'down') {
    insights.push('Declining sentiment trend - requires attention');
  } else if (this.trending === 'new') {
    insights.push('New product with emerging sentiment patterns');
  }
  
  // Source diversity insights
  if (this.totalSources >= 5) {
    insights.push('Sentiment data from diverse sources increases reliability');
  } else if (this.totalSources < 3) {
    insights.push('Limited data sources - expanding coverage recommended');
  }
  
  // Mention volume insights
  if (this.mentionCount > 10000) {
    insights.push('High community engagement and discussion volume');
  } else if (this.mentionCount < 100) {
    insights.push('Low mention volume - limited community discussion');
  }
  
  return insights;
};

// Static Methods
sentimentSchema.statics.findByLabel = function(label, options = {}) {
  const query = { label, status: 'active' };
  return this.find(query, null, options);
};

sentimentSchema.statics.findTrending = function(direction = 'up', limit = 20) {
  return this.find({ 
    trending: direction, 
    status: 'active',
    mentionCount: { $gte: 50 } // Minimum mentions for credible trending
  })
  .sort({ trendingScore: -1, score: -1 })
  .limit(limit);
};

sentimentSchema.statics.getTopByCategory = function(category, limit = 10) {
  return this.aggregate([
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $unwind: '$product'
    },
    {
      $match: {
        'product.category': category,
        status: 'active',
        mentionCount: { $gte: 20 }
      }
    },
    {
      $sort: { score: -1, confidence: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

sentimentSchema.statics.getSentimentDistribution = function(timeframe = '30d') {
  const timeAgo = new Date();
  timeAgo.setDate(timeAgo.getDate() - (timeframe === '7d' ? 7 : 30));
  
  return this.aggregate([
    {
      $match: {
        lastAnalyzed: { $gte: timeAgo },
        status: 'active'
      }
    },
    {
      $group: {
        _id: '$label',
        count: { $sum: 1 },
        avgScore: { $avg: '$score' },
        avgConfidence: { $avg: '$confidence' },
        totalMentions: { $sum: '$mentionCount' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

sentimentSchema.statics.getSourceAnalytics = function(timeframe = '30d') {
  const timeAgo = new Date();
  timeAgo.setDate(timeAgo.getDate() - 30);
  
  return this.aggregate([
    {
      $match: {
        lastAnalyzed: { $gte: timeAgo },
        status: 'active'
      }
    },
    {
      $project: {
        sources: { $objectToArray: '$sources' },
        score: 1,
        confidence: 1
      }
    },
    {
      $unwind: '$sources'
    },
    {
      $group: {
        _id: '$sources.k',
        totalMentions: { $sum: '$sources.v.mentions' },
        avgScore: { $avg: '$sources.v.avgScore' },
        avgConfidence: { $avg: '$sources.v.confidence' },
        productCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalMentions: -1 }
    }
  ]);
};

sentimentSchema.statics.findStaleData = function(hours = 24) {
  const staleThreshold = new Date();
  staleThreshold.setHours(staleThreshold.getHours() - hours);
  
  return this.find({
    lastAnalyzed: { $lt: staleThreshold },
    status: { $in: ['active', 'stale'] }
  }).sort({ lastAnalyzed: 1 });
};

sentimentSchema.statics.getAlertsReport = function(severity = null) {
  const matchStage = {
    'alerts.acknowledged': false,
    status: 'active'
  };
  
  if (severity) {
    matchStage['alerts.severity'] = severity;
  }
  
  return this.aggregate([
    {
      $match: matchStage
    },
    {
      $unwind: '$alerts'
    },
    {
      $match: {
        'alerts.acknowledged': false
      }
    },
    {
      $group: {
        _id: {
          type: '$alerts.type',
          severity: '$alerts.severity'
        },
        count: { $sum: 1 },
        products: { $push: '$productId' },
        latestAlert: { $max: '$alerts.triggered' }
      }
    },
    {
      $sort: { 'latestAlert': -1 }
    }
  ]);
};

sentimentSchema.statics.calculateCategoryAverages = function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $unwind: '$product'
    },
    {
      $match: {
        status: 'active',
        'dataQuality.reliability': { $gte: 0.5 }
      }
    },
    {
      $group: {
        _id: '$product.category',
        avgScore: { $avg: '$score' },
        avgConfidence: { $avg: '$confidence' },
        totalMentions: { $sum: '$mentionCount' },
        productCount: { $sum: 1 },
        topScores: { $push: '$score' }
      }
    },
    {
      $addFields: {
        topScores: { $slice: [{ $sortArray: { input: '$topScores', sortBy: -1 } }, 5] }
      }
    },
    {
      $sort: { avgScore: -1 }
    }
  ]);
};

sentimentSchema.statics.findSimilarSentiment = function(productId, threshold = 0.2) {
  return this.findById(productId)
    .then(sentiment => {
      if (!sentiment) return [];
      
      const scoreRange = {
        min: sentiment.score - threshold,
        max: sentiment.score + threshold
      };
      
      return this.find({
        _id: { $ne: productId },
        score: { $gte: scoreRange.min, $lte: scoreRange.max },
        label: sentiment.label,
        status: 'active'
      })
      .sort({ confidence: -1, mentionCount: -1 })
      .limit(10);
    });
};

sentimentSchema.statics.getVolatilityReport = function(days = 7) {
  return this.aggregate([
    {
      $match: {
        status: 'active',
        'history.2': { $exists: true } // At least 3 history points
      }
    },
    {
      $addFields: {
        recentHistory: {
          $filter: {
            input: '$history',
            cond: {
              $gte: [
                '$this.date',
                { $dateSubtract: { startDate: new Date(), unit: 'day', amount: days } }
              ]
            }
          }
        }
      }
    },
    {
      $addFields: {
        volatility: {
          $cond: [
            { $gte: [{ $size: '$recentHistory' }, 2] },
            {
              $stdDevPop: '$recentHistory.score'
            },
            0
          ]
        }
      }
    },
    {
      $match: {
        volatility: { $gt: 0.1 } // Only products with significant volatility
      }
    },
    {
      $sort: { volatility: -1 }
    },
    {
      $limit: 50
    },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $unwind: '$product'
    },
    {
      $project: {
        productName: '$product.name',
        category: '$product.category',
        currentScore: '$score',
        volatility: 1,
        trending: 1,
        mentionCount: 1
      }
    }
  ]);
};

// Query helpers
sentimentSchema.query.active = function() {
  return this.where({ status: 'active' });
};

sentimentSchema.query.highConfidence = function(threshold = 0.8) {
  return this.where({ confidence: { $gte: threshold } });
};

sentimentSchema.query.trending = function(direction) {
  return this.where({ trending: direction });
};

sentimentSchema.query.byScore = function(min, max) {
  const query = {};
  if (min !== undefined) query.$gte = min;
  if (max !== undefined) query.$lte = max;
  return this.where({ score: query });
};

sentimentSchema.query.recentlyAnalyzed = function(hours = 24) {
  const timeAgo = new Date();
  timeAgo.setHours(timeAgo.getHours() - hours);
  return this.where({ lastAnalyzed: { $gte: timeAgo } });
};

sentimentSchema.query.withAlerts = function(acknowledged = false) {
  return this.where({ 
    'alerts.acknowledged': acknowledged,
    'alerts.0': { $exists: true }
  });
};

// Export the model
module.exports = mongoose.model('Sentiment', sentimentSchema);
