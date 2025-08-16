/**
 * Sentiment Service
 * Handles sentiment analysis for products and user content
 */

const cacheService = require('./cacheService');
const { logger } = require('../utils/logger');
const { 
  CACHE_KEYS, 
  CACHE_TTL, 
  SENTIMENT_LABELS,
  TRENDING_CONFIG 
} = require('../config/constants');

class SentimentService {
  constructor() {
    this.sentimentData = new Map();
    this.sentimentHistory = new Map();
    this.feedbackData = new Map();
    this.jobQueue = new Map();
    this.initializeSampleData();
  }

  /**
   * Initialize with sample sentiment data
   */
  initializeSampleData() {
    const sampleSentimentData = [
      {
        productId: '1',
        label: 'highly-regarded',
        score: 0.89,
        confidence: 0.94,
        mentionCount: 18247,
        trending: 'up',
        breakdown: {
          quality: 0.91,
          value: 0.78,
          popularity: 0.94,
          reliability: 0.86
        },
        sources: {
          reddit: { mentions: 8432, avgScore: 0.87 },
          twitter: { mentions: 4521, avgScore: 0.91 },
          reviews: { mentions: 5294, avgScore: 0.89 }
        },
        lastUpdated: new Date().toISOString()
      },
      {
        productId: '2',
        label: 'well-regarded',
        score: 0.74,
        confidence: 0.88,
        mentionCount: 12483,
        trending: 'up',
        breakdown: {
          quality: 0.82,
          value: 0.91,
          popularity: 0.68,
          reliability: 0.79
        },
        sources: {
          reddit: { mentions: 6241, avgScore: 0.76 },
          twitter: { mentions: 3892, avgScore: 0.72 },
          reviews: { mentions: 2350, avgScore: 0.74 }
        },
        lastUpdated: new Date().toISOString()
      },
      {
        productId: '3',
        label: 'mixed-reviews',
        score: 0.23,
        confidence: 0.81,
        mentionCount: 7892,
        trending: 'stable',
        breakdown: {
          quality: 0.71,
          value: 0.65,
          popularity: 0.54,
          reliability: 0.58
        },
        sources: {
          reddit: { mentions: 3421, avgScore: 0.19 },
          twitter: { mentions: 2847, avgScore: 0.28 },
          reviews: { mentions: 1624, avgScore: 0.21 }
        },
        lastUpdated: new Date().toISOString()
      },
      {
        productId: '4',
        label: 'well-regarded',
        score: 0.68,
        confidence: 0.86,
        mentionCount: 11567,
        trending: 'up',
        breakdown: {
          quality: 0.76,
          value: 0.88,
          popularity: 0.72,
          reliability: 0.73
        },
        sources: {
          reddit: { mentions: 5632, avgScore: 0.71 },
          twitter: { mentions: 3241, avgScore: 0.66 },
          reviews: { mentions: 2694, avgScore: 0.67 }
        },
        lastUpdated: new Date().toISOString()
      },
      {
        productId: '5',
        label: 'highly-regarded',
        score: 0.81,
        confidence: 0.91,
        mentionCount: 14329,
        trending: 'new',
        breakdown: {
          quality: 0.87,
          value: 0.79,
          popularity: 0.83,
          reliability: 0.84
        },
        sources: {
          reddit: { mentions: 7234, avgScore: 0.84 },
          twitter: { mentions: 4521, avgScore: 0.79 },
          reviews: { mentions: 2574, avgScore: 0.80 }
        },
        lastUpdated: new Date().toISOString()
      }
    ];

    sampleSentimentData.forEach(data => {
      this.sentimentData.set(data.productId, data);
      this.initializeSentimentHistory(data.productId);
    });

    logger.info(`Initialized sentiment data for ${sampleSentimentData.length} products`);
  }

  /**
   * Initialize sentiment history for a product
   */
  initializeSentimentHistory(productId) {
    const history = [];
    const currentData = this.sentimentData.get(productId);
    
    if (!currentData) return;

    // Generate 30 days of historical data
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add some variation to create realistic timeline
      const variation = (Math.random() - 0.5) * 0.2;
      const score = Math.max(-1, Math.min(1, currentData.score + variation));
      
      history.push({
        date: date.toISOString().split('T')[0],
        score,
        mentionCount: Math.floor(currentData.mentionCount * (0.8 + Math.random() * 0.4)),
        confidence: Math.max(0.5, Math.min(1, currentData.confidence + (Math.random() - 0.5) * 0.1))
      });
    }

    this.sentimentHistory.set(productId, history);
  }

  /**
   * Get product sentiment analysis
   */
  async getProductSentiment(productId, options = {}) {
    try {
      const { includeBreakdown = true, includeTrending = true } = options;
      
      const cacheKey = `${CACHE_KEYS.SENTIMENT_DATA}:${productId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return this.filterSentimentData(cached, options);
      }

      // Get sentiment data
      const sentimentData = this.sentimentData.get(productId);
      if (!sentimentData) {
        return this.generateDefaultSentiment(productId);
      }

      // Enhance with sentiment label details
      const labelInfo = Object.values(SENTIMENT_LABELS).find(
        label => label.id === sentimentData.label
      ) || SENTIMENT_LABELS.INSUFFICIENT_DATA;

      const enhanced = {
        ...sentimentData,
        emoji: labelInfo.emoji,
        text: labelInfo.name,
        description: labelInfo.description,
        color: labelInfo.color,
        backgroundColor: labelInfo.backgroundColor,
        borderColor: labelInfo.borderColor
      };

      // Cache for 15 minutes
      await cacheService.set(cacheKey, enhanced, CACHE_TTL.SENTIMENT_DATA);

      return this.filterSentimentData(enhanced, options);

    } catch (error) {
      logger.error('Get product sentiment error:', { productId, error: error.message });
      return this.generateDefaultSentiment(productId);
    }
  }

  /**
   * Filter sentiment data based on options
   */
  filterSentimentData(data, options) {
    const { includeBreakdown = true, includeTrending = true } = options;
    
    const filtered = { ...data };
    
    if (!includeBreakdown) {
      delete filtered.breakdown;
      delete filtered.sources;
    }
    
    if (!includeTrending) {
      delete filtered.trending;
    }
    
    return filtered;
  }

  /**
   * Generate default sentiment for products without data
   */
  generateDefaultSentiment(productId) {
    const labelInfo = SENTIMENT_LABELS.INSUFFICIENT_DATA;
    
    return {
      productId,
      label: labelInfo.id,
      emoji: labelInfo.emoji,
      text: labelInfo.name,
      description: labelInfo.description,
      score: 0,
      confidence: 0,
      mentionCount: 0,
      trending: 'stable',
      color: labelInfo.color,
      backgroundColor: labelInfo.backgroundColor,
      borderColor: labelInfo.borderColor,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get sentiment for multiple products
   */
  async getProductsSentimentBatch(productIds, options = {}) {
    try {
      const { includeBreakdown = false } = options;
      const results = {};

      // Use cache for batch operations
      const cacheKeys = productIds.map(id => `${CACHE_KEYS.SENTIMENT_DATA}:${id}`);
      const cachedResults = await cacheService.mget(cacheKeys);

      const uncachedIds = [];
      
      // Process cached results
      productIds.forEach((id, index) => {
        const cacheKey = cacheKeys[index];
        const cached = cachedResults[cacheKey];
        
        if (cached) {
          results[id] = this.filterSentimentData(cached, options);
        } else {
          uncachedIds.push(id);
        }
      });

      // Process uncached products
      for (const id of uncachedIds) {
        const sentiment = await this.getProductSentiment(id, options);
        results[id] = sentiment;
      }

      return results;

    } catch (error) {
      logger.error('Get products sentiment batch error:', error);
      return {};
    }
  }

  /**
   * Get trending sentiment topics
   */
  async getTrendingSentimentTopics(options = {}) {
    try {
      const { 
        category, 
        timeframe = 'daily', 
        limit = 20, 
        sentimentType 
      } = options;

      const cacheKey = `trending:sentiment:${category || 'all'}:${timeframe}:${sentimentType || 'all'}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached.slice(0, limit);

      // Get all sentiment data
      const allSentiment = Array.from(this.sentimentData.values());
      
      // Filter by sentiment type if specified
      let filtered = allSentiment;
      if (sentimentType && sentimentType !== 'all') {
        filtered = filtered.filter(data => data.label === sentimentType);
      }

      // Calculate trending scores
      const trending = filtered
        .map(data => ({
          ...data,
          trendingScore: this.calculateSentimentTrendingScore(data, timeframe)
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);

      // Cache for 30 minutes
      await cacheService.set(cacheKey, trending, CACHE_TTL.MEDIUM * 6);

      return trending;

    } catch (error) {
      logger.error('Get trending sentiment topics error:', error);
      return [];
    }
  }

  /**
   * Calculate sentiment trending score
   */
  calculateSentimentTrendingScore(data, timeframe) {
    let score = 0;

    // Base score from mention count
    score += Math.log(data.mentionCount + 1) / 10;

    // Trending direction bonus
    if (data.trending === 'up') {
      score += 0.5;
    } else if (data.trending === 'new') {
      score += 0.7;
    } else if (data.trending === 'down') {
      score -= 0.3;
    }

    // Confidence bonus
    score += data.confidence * 0.2;

    // Sentiment score bonus (positive sentiment trends more)
    if (data.score > 0.5) {
      score += 0.3;
    } else if (data.score < -0.5) {
      score += 0.1; // Negative sentiment can still be trending
    }

    return Math.max(0, score);
  }

  /**
   * Get category sentiment statistics
   */
  async getCategorySentimentStats(category, timeframe = '30d') {
    try {
      const cacheKey = `sentiment:stats:${category}:${timeframe}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Get products for this category
      const categoryProducts = Array.from(this.sentimentData.values())
        .filter(data => this.getProductCategory(data.productId) === category);

      if (categoryProducts.length === 0) {
        return this.getEmptyCategoryStats(category);
      }

      const stats = {
        category,
        timeframe,
        totalProducts: categoryProducts.length,
        averageScore: this.calculateAverageScore(categoryProducts),
        distribution: this.calculateSentimentDistribution(categoryProducts),
        trending: this.calculateCategoryTrending(categoryProducts),
        topPerformers: this.getTopPerformers(categoryProducts, 5),
        insights: this.generateCategoryInsights(categoryProducts)
      };

      // Cache for 1 hour
      await cacheService.set(cacheKey, stats, CACHE_TTL.LONG);

      return stats;

    } catch (error) {
      logger.error('Get category sentiment stats error:', { category, error: error.message });
      throw error;
    }
  }

  /**
   * Calculate average sentiment score for category
   */
  calculateAverageScore(sentimentData) {
    if (sentimentData.length === 0) return 0;
    
    const totalScore = sentimentData.reduce((sum, data) => sum + data.score, 0);
    return Math.round((totalScore / sentimentData.length) * 100) / 100;
  }

  /**
   * Calculate sentiment distribution
   */
  calculateSentimentDistribution(sentimentData) {
    const distribution = {};
    
    // Initialize all labels
    Object.values(SENTIMENT_LABELS).forEach(label => {
      distribution[label.id] = 0;
    });

    // Count sentiment labels
    sentimentData.forEach(data => {
      distribution[data.label] = (distribution[data.label] || 0) + 1;
    });

    // Convert to percentages
    const total = sentimentData.length;
    Object.keys(distribution).forEach(key => {
      distribution[key] = Math.round((distribution[key] / total) * 100);
    });

    return distribution;
  }

  /**
   * Calculate category trending
   */
  calculateCategoryTrending(sentimentData) {
    const trendingCounts = {
      up: 0,
      down: 0,
      stable: 0,
      new: 0
    };

    sentimentData.forEach(data => {
      trendingCounts[data.trending] = (trendingCounts[data.trending] || 0) + 1;
    });

    return trendingCounts;
  }

  /**
   * Get top performing products by sentiment
   */
  getTopPerformers(sentimentData, limit) {
    return sentimentData
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(data => ({
        productId: data.productId,
        score: data.score,
        label: data.label,
        mentionCount: data.mentionCount
      }));
  }

  /**
   * Generate category insights
   */
  generateCategoryInsights(sentimentData) {
    const insights = [];
    const avgScore = this.calculateAverageScore(sentimentData);
    const distribution = this.calculateSentimentDistribution(sentimentData);

    if (avgScore > 0.6) {
      insights.push('Overall positive sentiment in this category');
    } else if (avgScore < -0.2) {
      insights.push('Category showing concerning sentiment trends');
    }

    if (distribution['highly-regarded'] > 30) {
      insights.push('Many products are highly beloved by the community');
    }

    if (distribution['mixed-reviews'] > 40) {
      insights.push('Mixed reception suggests varied user experiences');
    }

    const trendingUp = sentimentData.filter(d => d.trending === 'up').length;
    if (trendingUp > sentimentData.length * 0.5) {
      insights.push('Positive momentum in community discussions');
    }

    return insights;
  }

  /**
   * Get empty category stats
   */
  getEmptyCategoryStats(category) {
    return {
      category,
      totalProducts: 0,
      averageScore: 0,
      distribution: {},
      trending: { up: 0, down: 0, stable: 0, new: 0 },
      topPerformers: [],
      insights: ['No sentiment data available for this category']
    };
  }

  /**
   * Get product sentiment timeline
   */
  async getProductSentimentTimeline(productId, options = {}) {
    try {
      const { timeframe = '30d', granularity = 'daily' } = options;
      
      const cacheKey = `sentiment:timeline:${productId}:${timeframe}:${granularity}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const history = this.sentimentHistory.get(productId) || [];
      
      // Filter by timeframe
      const days = this.parseTimeframeToDays(timeframe);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const filtered = history.filter(entry => 
        new Date(entry.date) >= cutoffDate
      );

      // Apply granularity grouping if needed
      const timeline = this.groupByGranularity(filtered, granularity);

      // Cache for 1 hour
      await cacheService.set(cacheKey, timeline, CACHE_TTL.LONG);

      return timeline;

    } catch (error) {
      logger.error('Get product sentiment timeline error:', { productId, error: error.message });
      throw error;
    }
  }

  /**
   * Parse timeframe to days
   */
  parseTimeframeToDays(timeframe) {
    const match = timeframe.match(/(\d+)([dwmy])/);
    if (!match) return 30;

    const [, num, unit] = match;
    const number = parseInt(num);

    switch (unit) {
      case 'd': return number;
      case 'w': return number * 7;
      case 'm': return number * 30;
      case 'y': return number * 365;
      default: return 30;
    }
  }

  /**
   * Group timeline data by granularity
   */
  groupByGranularity(data, granularity) {
    if (granularity === 'daily') {
      return data; // Already daily
    }

    // For weekly/monthly, group and average
    const grouped = {};
    
    data.forEach(entry => {
      const date = new Date(entry.date);
      let key;
      
      if (granularity === 'weekly') {
        const week = this.getWeekOfYear(date);
        key = `${date.getFullYear()}-W${week}`;
      } else if (granularity === 'monthly') {
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      } else {
        key = entry.date;
      }

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          scores: [],
          mentionCounts: [],
          confidences: []
        };
      }

      grouped[key].scores.push(entry.score);
      grouped[key].mentionCounts.push(entry.mentionCount);
      grouped[key].confidences.push(entry.confidence);
    });

    // Calculate averages
    return Object.values(grouped).map(group => ({
      date: group.date,
      score: group.scores.reduce((a, b) => a + b, 0) / group.scores.length,
      mentionCount: Math.round(group.mentionCounts.reduce((a, b) => a + b, 0) / group.mentionCounts.length),
      confidence: group.confidences.reduce((a, b) => a + b, 0) / group.confidences.length
    }));
  }

  /**
   * Get week of year
   */
  getWeekOfYear(date) {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - firstDay) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + firstDay.getDay() + 1) / 7);
  }

  /**
   * Analyze sentiment for custom text
   */
  async analyzeSentiment(text, context = null) {
    try {
      // Basic sentiment analysis implementation
      const analysis = this.performBasicSentimentAnalysis(text);
      
      // Enhance with context if provided
      if (context) {
        analysis.context = context;
        analysis.contextualScore = this.adjustScoreForContext(analysis.score, context);
      }

      return analysis;

    } catch (error) {
      logger.error('Analyze sentiment error:', error);
      throw error;
    }
  }

  /**
   * Perform basic sentiment analysis (mock implementation)
   */
  performBasicSentimentAnalysis(text) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'best', 'awesome', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'useless'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.some(pos => word.includes(pos))) {
        positiveCount++;
      }
      if (negativeWords.some(neg => word.includes(neg))) {
        negativeCount++;
      }
    });

    const totalSentimentWords = positiveCount + negativeCount;
    let score = 0;
    let confidence = 0.5;

    if (totalSentimentWords > 0) {
      score = (positiveCount - negativeCount) / totalSentimentWords;
      confidence = Math.min(0.95, 0.5 + (totalSentimentWords / words.length));
    }

    const label = this.scoreToLabel(score);
    const labelInfo = Object.values(SENTIMENT_LABELS).find(l => l.id === label);

    return {
      text,
      score,
      confidence,
      label,
      labelInfo: labelInfo ? {
        name: labelInfo.name,
        description: labelInfo.description,
        emoji: labelInfo.emoji
      } : null,
      breakdown: {
        positiveWords: positiveCount,
        negativeWords: negativeCount,
        totalWords: words.length,
        sentimentWords: totalSentimentWords
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Convert score to sentiment label
   */
  scoreToLabel(score) {
    if (score >= 0.7) return 'highly-regarded';
    if (score >= 0.3) return 'well-regarded';
    if (score >= -0.3) return 'mixed-reviews';
    if (score >= -0.7) return 'poorly-regarded';
    return 'highly-criticized';
  }

  /**
   * Adjust score for context
   */
  adjustScoreForContext(score, context) {
    // Simple context adjustment
    if (context === 'product-review') {
      return score * 1.1; // Boost product review sentiment
    }
    if (context === 'social-media') {
      return score * 0.9; // Social media can be more polarized
    }
    return score;
  }

  /**
   * Get user sentiment summary
   */
  async getUserSentimentSummary(userId, options = {}) {
    try {
      const { categories, timeframe = '7d' } = options;
      
      // Mock implementation - would analyze user's interaction history
      const summary = {
        userId,
        timeframe,
        overall: {
          avgSentiment: 0.65,
          totalInteractions: 47,
          positiveRatio: 0.72
        },
        categories: this.generateUserCategorySummary(categories),
        insights: [
          'You tend to engage with highly-rated products',
          'Your interest in skincare products is growing',
          'You prefer products with strong community sentiment'
        ],
        recommendations: [
          'Try exploring the fitness category - high sentiment there',
          'Check out trending products in tech accessories'
        ]
      };

      return summary;

    } catch (error) {
      logger.error('Get user sentiment summary error:', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate user category summary
   */
  generateUserCategorySummary(categories) {
    const categorySummary = {};
    
    const productCategories = ['skincare-beauty', 'tech-accessories', 'mens-grooming', 'fitness-wellness', 'home-kitchen'];
    
    productCategories.forEach(categoryId => {
      if (!categories || categories.includes(categoryId)) {
        categorySummary[categoryId] = {
          interactions: Math.floor(Math.random() * 20) + 5,
          avgSentiment: Math.random() * 0.6 + 0.2, // 0.2 to 0.8
          lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        };
      }
    });

    return categorySummary;
  }

  /**
   * Submit sentiment feedback
   */
  async submitSentimentFeedback(feedbackData) {
    try {
      const feedback = {
        id: Date.now().toString(),
        ...feedbackData,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      // Store feedback for analysis
      this.feedbackData.set(feedback.id, feedback);

      logger.info('Sentiment feedback submitted:', {
        feedbackId: feedback.id,
        productId: feedback.productId,
        userId: feedback.userId
      });

      return feedback;

    } catch (error) {
      logger.error('Submit sentiment feedback error:', error);
      throw error;
    }
  }

  /**
   * Refresh product sentiment data
   */
  async refreshProductSentiment(productId, options = {}) {
    try {
      const { force = false } = options;
      
      // Check if refresh is needed
      const existingData = this.sentimentData.get(productId);
      const lastUpdated = existingData ? new Date(existingData.lastUpdated) : null;
      const now = new Date();
      const hoursSinceUpdate = lastUpdated ? (now - lastUpdated) / (1000 * 60 * 60) : Infinity;

      if (!force && hoursSinceUpdate < 1) {
        return {
          status: 'skipped',
          message: 'Sentiment data is recent, refresh not needed',
          lastUpdated: existingData.lastUpdated
        };
      }

      // Create refresh job
      const jobId = `refresh-${productId}-${Date.now()}`;
      const job = {
        id: jobId,
        productId,
        status: 'processing',
        progress: 0,
        startTime: now.toISOString(),
        estimatedCompletion: new Date(now.getTime() + 5 * 60 * 1000).toISOString() // 5 minutes
      };

      this.jobQueue.set(jobId, job);

      // Simulate async processing
      this.processRefreshJob(jobId, productId);

      return {
        status: 'initiated',
        jobId,
        estimatedTime: '5 minutes'
      };

    } catch (error) {
      logger.error('Refresh product sentiment error:', { productId, error: error.message });
      throw error;
    }
  }

  /**
   * Process sentiment refresh job (mock implementation)
   */
  async processRefreshJob(jobId, productId) {
    try {
      const job = this.jobQueue.get(jobId);
      if (!job) return;

      // Simulate processing steps
      const steps = [
        { progress: 20, message: 'Collecting social media mentions' },
        { progress: 40, message: 'Analyzing review sentiment' },
        { progress: 60, message: 'Processing community discussions' },
        { progress: 80, message: 'Calculating sentiment scores' },
        { progress: 100, message: 'Updating sentiment data' }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        
        job.progress = step.progress;
        job.message = step.message;
        this.jobQueue.set(jobId, job);
      }

      // Update sentiment data with new values
      this.updateSentimentData(productId);

      // Mark job as completed
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      this.jobQueue.set(jobId, job);

      logger.info('Sentiment refresh completed:', { jobId, productId });

    } catch (error) {
      const job = this.jobQueue.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        this.jobQueue.set(jobId, job);
      }
      logger.error('Sentiment refresh job failed:', { jobId, productId, error: error.message });
    }
  }

  /**
   * Update sentiment data for product
   */
  updateSentimentData(productId) {
    const existing = this.sentimentData.get(productId);
    if (!existing) return;

    // Generate some variation in the data
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const newScore = Math.max(-1, Math.min(1, existing.score + variation));
    const newLabel = this.scoreToLabel(newScore);

    const updated = {
      ...existing,
      score: Math.round(newScore * 100) / 100,
      label: newLabel,
      mentionCount: existing.mentionCount + Math.floor(Math.random() * 100),
      lastUpdated: new Date().toISOString()
    };

    this.sentimentData.set(productId, updated);

    // Clear cache
    cacheService.del(`${CACHE_KEYS.SENTIMENT_DATA}:${productId}`);
  }

  /**
   * Get sentiment job status
   */
  async getSentimentJobStatus(jobId) {
    return this.jobQueue.get(jobId) || null;
  }

  /**
   * Get product category (mock implementation)
   */
  getProductCategory(productId) {
    // Mock mapping - in real implementation, would query product service
    const categoryMap = {
      '1': 'skincare-beauty',
      '2': 'tech-accessories',
      '3': 'mens-grooming',
      '4': 'fitness-wellness',
      '5': 'home-kitchen'
    };
    
    return categoryMap[productId] || 'general';
  }

  /**
   * Health check for sentiment service
   */
  async healthCheck() {
    try {
      const totalProducts = this.sentimentData.size;
      const recentUpdates = Array.from(this.sentimentData.values())
        .filter(data => {
          const lastUpdated = new Date(data.lastUpdated);
          const hoursSince = (Date.now() - lastUpdated) / (1000 * 60 * 60);
          return hoursSince < 24;
        }).length;

      return {
        status: 'healthy',
        message: 'Sentiment service is operational',
        stats: {
          totalProducts,
          recentUpdates,
          activeJobs: this.jobQueue.size,
          feedbackCount: this.feedbackData.size
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Sentiment service health check failed:', error);
      return {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all sentiment labels and their configurations
   */
  getSentimentLabels() {
    return Object.values(SENTIMENT_LABELS).map(label => ({
      id: label.id,
      name: label.name,
      description: label.description,
      emoji: label.emoji,
      color: label.color,
      backgroundColor: label.backgroundColor,
      borderColor: label.borderColor,
      scoreRange: label.scoreRange
    }));
  }

  /**
   * Validate sentiment score range
   */
  validateScore(score) {
    return typeof score === 'number' && score >= -1 && score <= 1;
  }

  /**
   * Calculate sentiment trend over time
   */
  calculateSentimentTrend(productId, days = 7) {
    try {
      const history = this.sentimentHistory.get(productId);
      if (!history || history.length < 2) {
        return 'stable';
      }

      // Get recent data points
      const recentData = history.slice(-days);
      if (recentData.length < 2) {
        return 'stable';
      }

      const firstScore = recentData[0].score;
      const lastScore = recentData[recentData.length - 1].score;
      const change = lastScore - firstScore;

      if (change > 0.1) return 'improving';
      if (change < -0.1) return 'declining';
      return 'stable';

    } catch (error) {
      logger.error('Calculate sentiment trend error:', { productId, error: error.message });
      return 'stable';
    }
  }

  /**
   * Get sentiment insights for product
   */
  async getSentimentInsights(productId) {
    try {
      const sentiment = await this.getProductSentiment(productId);
      const insights = [];

      // Score-based insights
      if (sentiment.score > 0.8) {
        insights.push('This product has exceptional community sentiment');
      } else if (sentiment.score > 0.5) {
        insights.push('Strong positive sentiment from users');
      } else if (sentiment.score < -0.5) {
        insights.push('Concerning negative sentiment detected');
      } else {
        insights.push('Mixed sentiment - check individual reviews');
      }

      // Confidence insights
      if (sentiment.confidence > 0.9) {
        insights.push('High confidence in sentiment analysis');
      } else if (sentiment.confidence < 0.7) {
        insights.push('Sentiment analysis has moderate confidence');
      }

      // Trending insights
      if (sentiment.trending === 'up') {
        insights.push('Sentiment is improving over time');
      } else if (sentiment.trending === 'down') {
        insights.push('Declining sentiment trend detected');
      }

      // Mention count insights
      if (sentiment.mentionCount > 10000) {
        insights.push('High community engagement and discussion');
      } else if (sentiment.mentionCount < 100) {
        insights.push('Limited community discussion available');
      }

      return insights;

    } catch (error) {
      logger.error('Get sentiment insights error:', { productId, error: error.message });
      return ['Unable to generate sentiment insights'];
    }
  }

  /**
   * Compare sentiment between products
   */
  async compareSentiment(productIds) {
    try {
      const sentiments = await this.getProductsSentimentBatch(productIds, { includeBreakdown: true });
      
      const comparison = {
        products: Object.keys(sentiments).map(id => ({
          productId: id,
          sentiment: sentiments[id],
          relativeRanking: 0 // Will be calculated below
        })),
        summary: {
          avgScore: 0,
          bestProduct: null,
          worstProduct: null,
          mostMentioned: null
        }
      };

      // Calculate rankings and summary
      const scores = comparison.products.map(p => p.sentiment.score);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // Sort by score for ranking
      comparison.products.sort((a, b) => b.sentiment.score - a.sentiment.score);
      comparison.products.forEach((product, index) => {
        product.relativeRanking = index + 1;
      });

      // Calculate summary
      comparison.summary = {
        avgScore: Math.round(avgScore * 100) / 100,
        bestProduct: comparison.products[0]?.productId,
        worstProduct: comparison.products[comparison.products.length - 1]?.productId,
        mostMentioned: comparison.products.reduce((max, product) => 
          product.sentiment.mentionCount > (max?.sentiment.mentionCount || 0) ? product : max
        )?.productId
      };

      return comparison;

    } catch (error) {
      logger.error('Compare sentiment error:', { productIds, error: error.message });
      throw error;
    }
  }

  /**
   * Get sentiment aggregation for multiple products
   */
  async getAggregatedSentiment(productIds, options = {}) {
    try {
      const { weightByMentions = true } = options;
      const sentiments = await this.getProductsSentimentBatch(productIds);
      
      if (Object.keys(sentiments).length === 0) {
        return this.generateDefaultSentiment('aggregated');
      }

      let totalScore = 0;
      let totalWeight = 0;
      let totalMentions = 0;
      let totalConfidence = 0;

      Object.values(sentiments).forEach(sentiment => {
        const weight = weightByMentions ? sentiment.mentionCount : 1;
        totalScore += sentiment.score * weight;
        totalWeight += weight;
        totalMentions += sentiment.mentionCount;
        totalConfidence += sentiment.confidence;
      });

      const avgScore = totalWeight > 0 ? totalScore / totalWeight : 0;
      const avgConfidence = totalConfidence / Object.keys(sentiments).length;
      const label = this.scoreToLabel(avgScore);
      const labelInfo = Object.values(SENTIMENT_LABELS).find(l => l.id === label);

      return {
        productIds,
        label,
        score: Math.round(avgScore * 100) / 100,
        confidence: Math.round(avgConfidence * 100) / 100,
        mentionCount: totalMentions,
        productCount: Object.keys(sentiments).length,
        emoji: labelInfo?.emoji,
        text: labelInfo?.name,
        description: `Aggregated sentiment from ${Object.keys(sentiments).length} products`,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Get aggregated sentiment error:', { productIds, error: error.message });
      throw error;
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache() {
    try {
      // This would normally be handled by Redis TTL, but for manual cleanup
      const patterns = [
        `${CACHE_KEYS.SENTIMENT_DATA}:*`,
        'sentiment:*',
        'trending:sentiment:*'
      ];

      for (const pattern of patterns) {
        await cacheService.delPattern(pattern);
      }

      logger.info('Expired sentiment cache cleared');
      return true;

    } catch (error) {
      logger.error('Clear expired cache error:', error);
      return false;
    }
  }

  /**
   * Export sentiment data
   */
  async exportSentimentData(options = {}) {
    try {
      const { productIds, format = 'json', includeHistory = false } = options;
      
      let dataToExport;
      
      if (productIds && productIds.length > 0) {
        // Export specific products
        dataToExport = {};
        for (const id of productIds) {
          const sentiment = await this.getProductSentiment(id, { includeBreakdown: true });
          dataToExport[id] = sentiment;
          
          if (includeHistory) {
            dataToExport[id].history = this.sentimentHistory.get(id) || [];
          }
        }
      } else {
        // Export all sentiment data
        dataToExport = {};
        for (const [productId, sentiment] of this.sentimentData.entries()) {
          dataToExport[productId] = sentiment;
          
          if (includeHistory) {
            dataToExport[productId].history = this.sentimentHistory.get(productId) || [];
          }
        }
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        format,
        productCount: Object.keys(dataToExport).length,
        includeHistory,
        data: dataToExport
      };

      return exportData;

    } catch (error) {
      logger.error('Export sentiment data error:', error);
      throw error;
    }
  }

  /**
   * Import sentiment data (for data migration or testing)
   */
  async importSentimentData(importData, options = {}) {
    try {
      const { overwrite = false, validate = true } = options;
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const [productId, sentimentData] of Object.entries(importData.data || {})) {
        try {
          // Validate data if required
          if (validate) {
            if (!this.validateSentimentData(sentimentData)) {
              errors++;
              continue;
            }
          }

          // Check if exists and handle overwrite policy
          if (this.sentimentData.has(productId) && !overwrite) {
            skipped++;
            continue;
          }

          // Import sentiment data
          this.sentimentData.set(productId, {
            ...sentimentData,
            lastUpdated: new Date().toISOString()
          });

          // Import history if available
          if (sentimentData.history) {
            this.sentimentHistory.set(productId, sentimentData.history);
          }

          imported++;

        } catch (error) {
          logger.error('Import individual sentiment error:', { productId, error: error.message });
          errors++;
        }
      }

      const result = {
        imported,
        skipped,
        errors,
        total: Object.keys(importData.data || {}).length
      };

      logger.info('Sentiment data import completed:', result);
      return result;

    } catch (error) {
      logger.error('Import sentiment data error:', error);
      throw error;
    }
  }

  /**
   * Validate sentiment data structure
   */
  validateSentimentData(data) {
    const required = ['productId', 'label', 'score', 'confidence', 'mentionCount'];
    
    for (const field of required) {
      if (!(field in data)) {
        return false;
      }
    }

    // Validate score range
    if (!this.validateScore(data.score)) {
      return false;
    }

    // Validate confidence range
    if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
      return false;
    }

    // Validate mention count
    if (typeof data.mentionCount !== 'number' || data.mentionCount < 0) {
      return false;
    }

    return true;
  }
}

module.exports = new SentimentService();