/**
 * Analytics Service
 * Handles event tracking, analytics data processing, and reporting
 */

const cacheService = require('./cacheService');
const { logger } = require('../utils/logger');
const { 
  CACHE_KEYS, 
  CACHE_TTL,
  TRENDING_CONFIG,
  PRODUCT_CATEGORIES 
} = require('../config/constants');

class AnalyticsService {
  constructor() {
    this.events = new Map();
    this.searchAnalytics = new Map();
    this.productAnalytics = new Map();
    this.userBehavior = new Map();
    this.exportJobs = new Map();
    this.realtimeData = {
      activeUsers: 0,
      currentSearches: 0,
      popularProducts: [],
      lastUpdated: Date.now()
    };
    
    // Initialize with some mock data
    this.initializeMockData();
    
    // Start real-time data updates
    this.startRealtimeUpdates();
  }

  /**
   * Initialize mock analytics data
   */
  initializeMockData() {
    // Generate sample search analytics
    const categories = Object.keys(PRODUCT_CATEGORIES);
    categories.forEach(category => {
      this.searchAnalytics.set(category, {
        totalSearches: Math.floor(Math.random() * 10000) + 1000,
        uniqueUsers: Math.floor(Math.random() * 5000) + 500,
        avgSearchesPerUser: Math.round((Math.random() * 3 + 1) * 10) / 10,
        topQueries: this.generateTopQueries(category),
        trendy: Math.random() > 0.5
      });
    });

    // Generate product analytics
    for (let i = 1; i <= 5; i++) {
      this.productAnalytics.set(i.toString(), {
        views: Math.floor(Math.random() * 5000) + 100,
        uniqueVisitors: Math.floor(Math.random() * 3000) + 50,
        avgViewTime: Math.floor(Math.random() * 120) + 30, // seconds
        bounceRate: Math.round((Math.random() * 0.3 + 0.2) * 100) / 100,
        conversionRate: Math.round((Math.random() * 0.1 + 0.05) * 100) / 100,
        wishlistAdds: Math.floor(Math.random() * 200) + 10,
        shares: Math.floor(Math.random() * 100) + 5
      });
    }

    logger.info('Analytics service initialized with mock data');
  }

  /**
   * Generate top queries for category
   */
  generateTopQueries(category) {
    const queryMap = {
      'skincare-beauty': [
        'vitamin c serum',
        'retinol cream',
        'hyaluronic acid',
        'anti aging',
        'moisturizer'
      ],
      'tech-accessories': [
        'wireless earbuds',
        'phone charger',
        'bluetooth speaker',
        'usb cable',
        'phone case'
      ],
      'mens-grooming': [
        'beard oil',
        'shaving cream',
        'cologne',
        'hair gel',
        'face wash'
      ],
      'fitness-wellness': [
        'resistance bands',
        'yoga mat',
        'protein powder',
        'dumbbells',
        'fitness tracker'
      ],
      'home-kitchen': [
        'kitchen scale',
        'coffee maker',
        'blender',
        'air fryer',
        'storage containers'
      ]
    };

    const queries = queryMap[category] || ['general search'];
    return queries.map(query => ({
      query,
      count: Math.floor(Math.random() * 500) + 50,
      growth: Math.round((Math.random() - 0.5) * 100)
    }));
  }

  /**
   * Track analytics event
   */
  async trackEvent(eventData) {
    try {
      const event = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        ...eventData,
        timestamp: eventData.timestamp || new Date()
      };

      // Store event
      this.events.set(event.id, event);

      // Process event for real-time analytics
      await this.processEventForRealtime(event);

      // Update specific analytics based on event type
      await this.updateAnalyticsByEventType(event);

      logger.debug('Event tracked:', {
        eventId: event.id,
        type: event.event,
        productId: event.productId,
        userId: event.userId
      });

      return { eventId: event.id };

    } catch (error) {
      logger.error('Track event error:', error);
      throw error;
    }
  }

  /**
   * Process event for real-time analytics
   */
  async processEventForRealtime(event) {
    try {
      // Update active users count
      if (event.userId) {
        this.updateActiveUsers(event.userId);
      }

      // Update current searches
      if (event.event === 'search') {
        this.realtimeData.currentSearches++;
      }

      // Update popular products
      if (event.event === 'product_view' && event.productId) {
        this.updatePopularProducts(event.productId);
      }

      this.realtimeData.lastUpdated = Date.now();

    } catch (error) {
      logger.error('Process event for realtime error:', error);
    }
  }

  /**
   * Update analytics by event type
   */
  async updateAnalyticsByEventType(event) {
    try {
      switch (event.event) {
        case 'search':
          await this.updateSearchAnalytics(event);
          break;
        case 'product_view':
          await this.updateProductAnalytics(event);
          break;
        case 'wishlist_add':
          await this.updateWishlistAnalytics(event);
          break;
        case 'user_signup':
        case 'user_login':
          await this.updateUserAnalytics(event);
          break;
        default:
          // Generic event tracking
          break;
      }
    } catch (error) {
      logger.error('Update analytics by event type error:', error);
    }
  }

  /**
   * Update search analytics
   */
  async updateSearchAnalytics(event) {
    const category = event.category || 'general';
    const existing = this.searchAnalytics.get(category) || {
      totalSearches: 0,
      uniqueUsers: 0,
      topQueries: []
    };

    existing.totalSearches++;
    
    // Update top queries
    const queryIndex = existing.topQueries.findIndex(q => 
      q.query.toLowerCase() === event.properties?.query?.toLowerCase()
    );
    
    if (queryIndex >= 0) {
      existing.topQueries[queryIndex].count++;
    } else if (event.properties?.query) {
      existing.topQueries.push({
        query: event.properties.query,
        count: 1,
        growth: 0
      });
    }

    // Keep only top 10 queries
    existing.topQueries.sort((a, b) => b.count - a.count);
    existing.topQueries = existing.topQueries.slice(0, 10);

    this.searchAnalytics.set(category, existing);
  }

  /**
   * Update product analytics
   */
  async updateProductAnalytics(event) {
    if (!event.productId) return;

    const existing = this.productAnalytics.get(event.productId) || {
      views: 0,
      uniqueVisitors: 0,
      avgViewTime: 0,
      bounceRate: 0.3,
      conversionRate: 0.05,
      wishlistAdds: 0,
      shares: 0
    };

    existing.views++;
    
    // Track unique visitors
    if (event.userId) {
      existing.uniqueVisitors++;
    }

    this.productAnalytics.set(event.productId, existing);
  }

  /**
   * Update wishlist analytics
   */
  async updateWishlistAnalytics(event) {
    if (!event.productId) return;

    const existing = this.productAnalytics.get(event.productId) || {
      views: 0,
      uniqueVisitors: 0,
      avgViewTime: 0,
      bounceRate: 0.3,
      conversionRate: 0.05,
      wishlistAdds: 0,
      shares: 0
    };

    existing.wishlistAdds++;
    this.productAnalytics.set(event.productId, existing);
  }

  /**
   * Update user analytics
   */
  async updateUserAnalytics(event) {
    const userId = event.userId;
    if (!userId) return;

    const existing = this.userBehavior.get(userId) || {
      totalSessions: 0,
      totalPageViews: 0,
      avgSessionDuration: 0,
      lastActive: null,
      preferredCategories: {},
      searchHistory: []
    };

    if (event.event === 'user_login' || event.event === 'user_signup') {
      existing.totalSessions++;
    }

    existing.lastActive = event.timestamp;
    this.userBehavior.set(userId, existing);
  }

  /**
   * Update active users count
   */
  updateActiveUsers(userId) {
    // Simple implementation - in real system would use more sophisticated tracking
    this.realtimeData.activeUsers = Math.max(1, 
      this.realtimeData.activeUsers + (Math.random() > 0.7 ? 1 : 0)
    );
  }

  /**
   * Update popular products
   */
  updatePopularProducts(productId) {
    const existing = this.realtimeData.popularProducts.find(p => p.id === productId);
    
    if (existing) {
      existing.views++;
    } else {
      this.realtimeData.popularProducts.push({
        id: productId,
        views: 1
      });
    }

    // Keep only top 10
    this.realtimeData.popularProducts.sort((a, b) => b.views - a.views);
    this.realtimeData.popularProducts = this.realtimeData.popularProducts.slice(0, 10);
  }

  /**
   * Track search event
   */
  async trackSearch(query, filters, ip, requestId) {
    return await this.trackEvent({
      event: 'search',
      properties: { query, filters },
      ip,
      requestId
    });
  }

  /**
   * Track product view
   */
  async trackProductView(productId, ip, userId) {
    return await this.trackEvent({
      event: 'product_view',
      productId,
      userId,
      ip
    });
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(options = {}) {
    try {
      const { timeframe = '7d', granularity = 'daily', category, limit = 100 } = options;
      
      const cacheKey = `${CACHE_KEYS.ANALYTICS_DATA}:search:${timeframe}:${granularity}:${category || 'all'}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Get search data
      let searchData = category ? 
        [this.searchAnalytics.get(category)].filter(Boolean) :
        Array.from(this.searchAnalytics.values());

      // Generate timeline data
      const timeline = this.generateTimelineData(timeframe, granularity, 'search');
      
      // Calculate summary statistics
      const summary = {
        totalSearches: searchData.reduce((sum, data) => sum + data.totalSearches, 0),
        uniqueUsers: searchData.reduce((sum, data) => sum + data.uniqueUsers, 0),
        topQueries: this.aggregateTopQueries(searchData, limit),
        timeline
      };

      const result = {
        summary,
        categories: this.getCategoryBreakdown('search'),
        insights: this.generateSearchInsights(summary)
      };

      // Cache for 10 minutes
      await cacheService.set(cacheKey, result, CACHE_TTL.ANALYTICS_DATA);

      return result;

    } catch (error) {
      logger.error('Get search analytics error:', error);
      throw error;
    }
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(options = {}) {
    try {
      const { timeframe = '7d', category, sortBy = 'views', limit = 50 } = options;
      
      const cacheKey = `${CACHE_KEYS.ANALYTICS_DATA}:products:${timeframe}:${category || 'all'}:${sortBy}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Get product data
      let productData = Array.from(this.productAnalytics.entries()).map(([id, data]) => ({
        productId: id,
        ...data
      }));

      // Apply category filter if specified
      if (category) {
        productData = productData.filter(p => this.getProductCategory(p.productId) === category);
      }

      // Sort by specified metric
      productData.sort((a, b) => b[sortBy] - a[sortBy]);
      productData = productData.slice(0, limit);

      // Calculate summary
      const summary = {
        totalViews: productData.reduce((sum, data) => sum + data.views, 0),
        totalUniqueVisitors: productData.reduce((sum, data) => sum + data.uniqueVisitors, 0),
        avgBounceRate: productData.reduce((sum, data) => sum + data.bounceRate, 0) / productData.length,
        avgConversionRate: productData.reduce((sum, data) => sum + data.conversionRate, 0) / productData.length
      };

      const result = {
        summary,
        products: productData,
        categories: this.getCategoryBreakdown('products'),
        insights: this.generateProductInsights(summary, productData)
      };

      // Cache for 10 minutes
      await cacheService.set(cacheKey, result, CACHE_TTL.ANALYTICS_DATA);

      return result;

    } catch (error) {
      logger.error('Get product analytics error:', error);
      throw error;
    }
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics(options = {}) {
    try {
      const { timeframe = '30d', segment, metric = 'all' } = options;
      
      const cacheKey = `${CACHE_KEYS.ANALYTICS_DATA}:behavior:${timeframe}:${segment || 'all'}:${metric}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const userData = Array.from(this.userBehavior.values());
      
      // Apply segment filter if specified
      let segmentedData = userData;
      if (segment === 'new_users') {
        segmentedData = userData.filter(user => user.totalSessions <= 3);
      } else if (segment === 'returning_users') {
        segmentedData = userData.filter(user => user.totalSessions > 3);
      }

      const summary = {
        totalUsers: segmentedData.length,
        avgSessionsPerUser: segmentedData.reduce((sum, user) => sum + user.totalSessions, 0) / segmentedData.length,
        avgSessionDuration: segmentedData.reduce((sum, user) => sum + user.avgSessionDuration, 0) / segmentedData.length,
        activeUsers: this.realtimeData.activeUsers
      };

      const result = {
        summary,
        segments: this.getUserSegmentBreakdown(userData),
        timeline: this.generateTimelineData(timeframe, 'daily', 'users'),
        insights: this.generateUserInsights(summary)
      };

      // Cache for 15 minutes
      await cacheService.set(cacheKey, result, CACHE_TTL.ANALYTICS_DATA * 1.5);

      return result;

    } catch (error) {
      logger.error('Get user behavior analytics error:', error);
      throw error;
    }
  }

  /**
   * Get trending analysis
   */
  async getTrendingAnalysis(options = {}) {
    try {
      const { type = 'searches', timeframe = 'daily', category, limit = 20 } = options;
      
      const cacheKey = `trending:${type}:${timeframe}:${category || 'all'}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached.slice(0, limit);

      let trending = [];

      switch (type) {
        case 'searches':
          trending = this.getTrendingSearches(timeframe, category);
          break;
        case 'products':
          trending = this.getTrendingProducts(timeframe, category);
          break;
        case 'categories':
          trending = this.getTrendingCategories(timeframe);
          break;
        default:
          trending = this.getTrendingSearches(timeframe, category);
      }

      trending = trending.slice(0, limit);

      // Cache for 30 minutes
      await cacheService.set(cacheKey, trending, CACHE_TTL.MEDIUM * 6);

      return trending;

    } catch (error) {
      logger.error('Get trending analysis error:', error);
      return [];
    }
  }

  /**
   * Get trending searches
   */
  getTrendingSearches(timeframe, category) {
    const allQueries = [];
    
    // Aggregate queries from all categories or specific category
    const categories = category ? [category] : Array.from(this.searchAnalytics.keys());
    
    categories.forEach(cat => {
      const data = this.searchAnalytics.get(cat);
      if (data) {
        data.topQueries.forEach(query => {
          allQueries.push({
            ...query,
            category: cat,
            trendingScore: this.calculateTrendingScore(query, timeframe)
          });
        });
      }
    });

    return allQueries
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .map(q => ({
        query: q.query,
        count: q.count,
        category: q.category,
        growth: q.growth,
        trending: q.growth > 20 ? 'up' : q.growth < -20 ? 'down' : 'stable'
      }));
  }

  /**
   * Get trending products
   */
  getTrendingProducts(timeframe, category) {
    const products = Array.from(this.productAnalytics.entries())
      .map(([id, data]) => ({
        productId: id,
        ...data,
        category: this.getProductCategory(id),
        trendingScore: this.calculateProductTrendingScore(data, timeframe)
      }))
      .filter(p => !category || p.category === category)
      .sort((a, b) => b.trendingScore - a.trendingScore);

    return products.map(p => ({
      productId: p.productId,
      views: p.views,
      growth: this.calculateGrowthRate(p.views, timeframe),
      category: p.category
    }));
  }

  /**
   * Get trending categories
   */
  getTrendingCategories(timeframe) {
    return Object.keys(PRODUCT_CATEGORIES).map(categoryId => {
      const searchData = this.searchAnalytics.get(categoryId) || { totalSearches: 0 };
      const growth = this.calculateGrowthRate(searchData.totalSearches, timeframe);
      
      return {
        category: categoryId,
        searches: searchData.totalSearches,
        growth,
        trending: growth > 15 ? 'up' : growth < -15 ? 'down' : 'stable'
      };
    }).sort((a, b) => b.growth - a.growth);
  }

  /**
   * Calculate trending score
   */
  calculateTrendingScore(item, timeframe) {
    // Simple trending algorithm
    const baseScore = Math.log(item.count + 1);
    const growthBonus = Math.max(0, item.growth) / 100;
    return baseScore + growthBonus;
  }

  /**
   * Calculate product trending score
   */
  calculateProductTrendingScore(data, timeframe) {
    const viewScore = Math.log(data.views + 1);
    const engagementScore = (data.wishlistAdds + data.shares) / Math.max(data.views, 1);
    return viewScore + engagementScore * 2;
  }

  /**
   * Calculate growth rate
   */
  calculateGrowthRate(current, timeframe) {
    // Mock growth calculation - in real system would compare with previous period
    return Math.round((Math.random() - 0.4) * 100); // -40% to +60% growth
  }

  /**
   * Get conversion funnel analytics
   */
  async getConversionFunnel(options = {}) {
    try {
      const { timeframe = '30d', category, cohort } = options;
      
      // Mock funnel data
      const funnel = {
        steps: [
          { name: 'Search', users: 10000, conversionRate: 100 },
          { name: 'Product View', users: 6500, conversionRate: 65 },
          { name: 'Product Detail', users: 3200, conversionRate: 32 },
          { name: 'Add to Wishlist', users: 1800, conversionRate: 18 },
          { name: 'External Click', users: 900, conversionRate: 9 }
        ],
        insights: [
          'Highest drop-off occurs between search and product view',
          'Product detail engagement is strong among viewers',
          'Wishlist conversion could be improved with better CTAs'
        ]
      };

      return funnel;

    } catch (error) {
      logger.error('Get conversion funnel error:', error);
      throw error;
    }
  }

  /**
   * Get real-time analytics
   */
  async getRealtimeAnalytics() {
    try {
      return {
        ...this.realtimeData,
        timestamp: new Date().toISOString(),
        metrics: {
          activeUsers: this.realtimeData.activeUsers,
          currentSearches: this.realtimeData.currentSearches,
          popularProducts: this.realtimeData.popularProducts,
          recentActivity: this.getRecentActivity()
        }
      };

    } catch (error) {
      logger.error('Get realtime analytics error:', error);
      throw error;
    }
  }

  /**
   * Get recent activity
   */
  getRecentActivity() {
    const recentEvents = Array.from(this.events.values())
      .filter(event => Date.now() - new Date(event.timestamp) < 5 * 60 * 1000) // Last 5 minutes
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    return recentEvents.map(event => ({
      type: event.event,
      timestamp: event.timestamp,
      details: this.formatEventForDisplay(event)
    }));
  }

  /**
   * Format event for display
   */
  formatEventForDisplay(event) {
    switch (event.event) {
      case 'search':
        return `Search: "${event.properties?.query || 'Unknown'}"`;
      case 'product_view':
        return `Viewed product ${event.productId}`;
      case 'wishlist_add':
        return `Added product ${event.productId} to wishlist`;
      default:
        return event.event;
    }
  }

  /**
   * Get user personal analytics
   */
  async getUserPersonalAnalytics(userId, options = {}) {
    try {
      const { timeframe = '30d' } = options;
      
      const userData = this.userBehavior.get(userId);
      if (!userData) {
        return this.getEmptyUserAnalytics(userId);
      }

      return {
        userId,
        summary: {
          totalSessions: userData.totalSessions,
          totalPageViews: userData.totalPageViews,
          avgSessionDuration: userData.avgSessionDuration,
          lastActive: userData.lastActive,
          memberSince: userData.memberSince || new Date().toISOString()
        },
        interests: userData.preferredCategories || {},
        recentSearches: userData.searchHistory?.slice(0, 10) || [],
        insights: this.generatePersonalInsights(userData)
      };

    } catch (error) {
      logger.error('Get user personal analytics error:', { userId, error });
      throw error;
    }
  }

  /**
   * Generate personal insights for user
   */
  generatePersonalInsights(userData) {
    const insights = [];
    
    if (userData.totalSessions > 10) {
      insights.push('You\'re an active user - thanks for being part of our community!');
    }
    
    const topCategory = Object.keys(userData.preferredCategories || {})
      .sort((a, b) => userData.preferredCategories[b] - userData.preferredCategories[a])[0];
    
    if (topCategory) {
      insights.push(`You seem most interested in ${topCategory.replace('-', ' ')}`);
    }
    
    if (userData.avgSessionDuration > 300) { // 5 minutes
      insights.push('You spend quality time exploring products');
    }
    
    return insights;
  }

  /**
   * Get empty user analytics
   */
  getEmptyUserAnalytics(userId) {
    return {
      userId,
      summary: {
        totalSessions: 0,
        totalPageViews: 0,
        avgSessionDuration: 0,
        lastActive: null,
        memberSince: new Date().toISOString()
      },
      interests: {},
      recentSearches: [],
      insights: ['Welcome! Start exploring to see your personalized analytics.']
    };
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(options = {}) {
    try {
      const { type, timeframe, format = 'csv', filters = {}, requestedBy } = options;
      
      const jobId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const job = {
        id: jobId,
        type,
        timeframe,
        format,
        filters,
        requestedBy,
        status: 'queued',
        progress: 0,
        createdAt: new Date().toISOString(),
        estimatedTime: '5-10 minutes'
      };

      this.exportJobs.set(jobId, job);

      // Start processing (mock)
      this.processExportJob(jobId);

      return job;

    } catch (error) {
      logger.error('Export analytics error:', error);
      throw error;
    }
  }

  /**
   * Process export job (mock implementation)
   */
  async processExportJob(jobId) {
    try {
      const job = this.exportJobs.get(jobId);
      if (!job) return;

      job.status = 'processing';
      
      // Simulate processing steps
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        job.progress = progress;
        this.exportJobs.set(jobId, job);
      }

      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.downloadUrl = `/api/analytics/export/${jobId}/download`;
      
      this.exportJobs.set(jobId, job);

    } catch (error) {
      const job = this.exportJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        this.exportJobs.set(jobId, job);
      }
    }
  }

  /**
   * Get export job status
   */
  async getExportJobStatus(jobId) {
    return this.exportJobs.get(jobId) || null;
  }

  /**
   * Generate analytics report
   */
  async generateReport(options = {}) {
    try {
      const { reportType, timeframe, filters = {}, recipients = [], generatedBy } = options;
      
      const report = {
        id: `report-${Date.now()}`,
        type: reportType,
        timeframe,
        filters,
        generatedBy,
        recipients,
        status: 'generating',
        createdAt: new Date().toISOString()
      };

      // Mock report generation
      setTimeout(() => {
        report.status = 'completed';
        report.url = `/reports/${report.id}`;
      }, 3000);

      return report;

    } catch (error) {
      logger.error('Generate report error:', error);
      throw error;
    }
  }

  /**
   * Get analytics health metrics
   */
  async getAnalyticsHealth() {
    try {
      const now = Date.now();
      const recentEvents = Array.from(this.events.values())
        .filter(event => now - new Date(event.timestamp) < 60 * 60 * 1000); // Last hour

      return {
        status: 'healthy',
        metrics: {
          totalEvents: this.events.size,
          recentEvents: recentEvents.length,
          activeUsers: this.realtimeData.activeUsers,
          searchAnalytics: this.searchAnalytics.size,
          productAnalytics: this.productAnalytics.size,
          exportJobs: this.exportJobs.size
        },
        performance: {
          avgProcessingTime: '< 100ms',
          errorRate: '< 0.1%',
          uptime: '99.9%'
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Get analytics health error:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate timeline data
   */
  generateTimelineData(timeframe, granularity, type) {
    const days = this.parseTimeframeToDays(timeframe);
    const timeline = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      timeline.push({
        date: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 1000) + 100,
        type
      });
    }

    return timeline;
  }

  /**
   * Parse timeframe to days
   */
  parseTimeframeToDays(timeframe) {
    const match = timeframe.match(/(\d+)([dwmy])/);
    if (!match) return 7;

    const [, num, unit] = match;
    const number = parseInt(num);

    switch (unit) {
      case 'd': return number;
      case 'w': return number * 7;
      case 'm': return number * 30;
      case 'y': return number * 365;
      default: return 7;
    }
  }

  /**
   * Aggregate top queries from multiple categories
   */
  aggregateTopQueries(searchData, limit) {
    const allQueries = [];
    
    searchData.forEach(data => {
      data.topQueries.forEach(query => {
        const existing = allQueries.find(q => q.query === query.query);
        if (existing) {
          existing.count += query.count;
        } else {
          allQueries.push({ ...query });
        }
      });
    });

    return allQueries
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get category breakdown
   */
  getCategoryBreakdown(type) {
    const breakdown = {};
    
    Object.keys(PRODUCT_CATEGORIES).forEach(categoryId => {
      if (type === 'search') {
        const data = this.searchAnalytics.get(categoryId);
        breakdown[categoryId] = data ? data.totalSearches : 0;
      } else if (type === 'products') {
        // Count products by category
        breakdown[categoryId] = Array.from(this.productAnalytics.keys())
          .filter(id => this.getProductCategory(id) === categoryId)
          .length;
      }
    });

    return breakdown;
  }

  /**
   * Get user segment breakdown
   */
  getUserSegmentBreakdown(userData) {
    return {
      newUsers: userData.filter(user => user.totalSessions <= 3).length,
      returningUsers: userData.filter(user => user.totalSessions > 3 && user.totalSessions <= 10).length,
      powerUsers: userData.filter(user => user.totalSessions > 10).length
    };
  }

  /**
   * Generate search insights
   */
  generateSearchInsights(summary) {
    const insights = [];
    
    if (summary.totalSearches > 1000) {
      insights.push('High search volume indicates strong user engagement');
    }
    
    if (summary.topQueries.length > 0) {
      insights.push(`Most popular search: "${summary.topQueries[0].query}"`);
    }
    
    return insights;
  }

  /**
   * Generate product insights
   */
  generateProductInsights(summary, productData) {
    const insights = [];
    
    if (summary.avgBounceRate < 0.3) {
      insights.push('Low bounce rate indicates engaging product pages');
    }
    
    if (summary.avgConversionRate > 0.05) {
      insights.push('Conversion rate is above average');
    }
    
    if (productData.length > 0) {
      insights.push(`Top product has ${productData[0].views} views`);
    }
    
    return insights;
  }

  /**
   * Generate user insights
   */
  generateUserInsights(summary) {
    const insights = [];
    
    if (summary.avgSessionsPerUser > 5) {
      insights.push('Users are highly engaged with multiple sessions');
    }
    
    if (summary.avgSessionDuration > 300) {
      insights.push('Users spend quality time exploring content');
    }
    
    return insights;
  }

  /**
   * Get product category (mock)
   */
  getProductCategory(productId) {
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
   * Start real-time data updates
   */
  startRealtimeUpdates() {
    setInterval(() => {
      // Simulate real-time changes
      this.realtimeData.activeUsers = Math.max(0, 
        this.realtimeData.activeUsers + (Math.random() > 0.5 ? 1 : -1)
      );
      
      this.realtimeData.currentSearches = Math.floor(Math.random() * 50);
      this.realtimeData.lastUpdated = Date.now();
    }, 30000); // Update every 30 seconds
  }
}

module.exports = new AnalyticsService();