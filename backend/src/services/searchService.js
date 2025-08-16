/**
 * Search Service
 * Handles search logic, suggestions, and trending analysis
 */

const productService = require('./productService');
const sentimentService = require('./sentimentService');
const cacheService = require('./cacheService');
const { logger } = require('../utils/logger');
const { 
  CACHE_KEYS, 
  CACHE_TTL, 
  SEARCH_CONFIG, 
  PRODUCT_CATEGORIES,
  SUGGESTED_SEARCHES,
  TRENDING_CONFIG
} = require('../config/constants');

class SearchService {
  constructor() {
    this.searchHistory = new Map();
    this.trendingQueries = new Map();
    this.popularCategories = new Map();
  }

  /**
   * Perform product search with ranking and filtering
   */
  async performSearch({ query, filters = {}, page = 1, limit = 20, sortBy = 'relevance', sortOrder = 'desc', searchContext = null, conversationContext = {} }) {
    try {
      const startTime = Date.now();
      
      // Generate cache key
      const cacheKey = `${CACHE_KEYS.SEARCH_RESULTS}:${this.generateSearchCacheKey(query, filters, page, limit, sortBy, sortOrder)}`;
      
      // Check cache first
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult) {
        logger.debug(`Cache hit for search: "${query}"`);
        return {
          ...cachedResult,
          searchTime: Date.now() - startTime,
          fromCache: true
        };
      }

      logger.info(`Performing search: "${query}"`, { filters, page, limit, sortBy });

      // Get products based on search criteria with optional search context
      const searchResult = await this.searchProducts(query, filters, searchContext, conversationContext);
      
      let products = [];
      let hasDbResults = false;
      let aiProducts = [];
      let aiMessage = null;
      
      if (searchResult && typeof searchResult === 'object') {
        products = searchResult.products || [];
        hasDbResults = searchResult.hasDbResults || false;
        aiProducts = searchResult.aiProducts || [];
        aiMessage = searchResult.aiMessage || null;
      } else {
        // Fallback for legacy format
        products = Array.isArray(searchResult) ? searchResult : [];
        hasDbResults = products.length > 0;
      }

      // Apply sentiment-based ranking to database products
      if (products.length > 0) {
        products = await this.enhanceWithSentiment(products);
        // Apply sorting
        products = this.sortProducts(products, sortBy, sortOrder);
      }

      // Calculate total and apply pagination
      const total = products.length;
      const startIndex = (page - 1) * limit;
      const paginatedProducts = products.slice(startIndex, startIndex + limit);

      const result = {
        products: paginatedProducts,
        total,
        page,
        limit,
        searchTime: Date.now() - startTime,
        fromCache: false,
        hasDbResults,
        aiProducts,
        aiMessage
      };

      // Cache result for 5 minutes
      await cacheService.set(cacheKey, result, CACHE_TTL.SEARCH_RESULTS);

      // Track search for trending analysis
      this.trackSearchQuery(query, filters);

      return result;

    } catch (error) {
      logger.error('Search service error:', error);
      throw error;
    }
  }

  /**
   * Search products using AI-powered contextual matching with search context
   */
  async searchProducts(query, filters, searchContext = null, conversationContext = {}) {
    try {
      // Get all products from database
      const allProducts = await productService.getAllProducts();
      
      // Use AI-powered contextual search with search context and conversation context
      const openaiService = require('./openaiService');
      const searchResult = await openaiService.contextualProductSearch(query, allProducts, searchContext, conversationContext);
      
      // Handle different response formats from AI service
      let results = [];
      let hasDbResults = true;
      let aiProducts = null;
      
      if (searchResult && typeof searchResult === 'object' && 'hasDbResults' in searchResult) {
        // New format with AI recommendations when no DB matches
        results = searchResult.dbProducts || [];
        hasDbResults = searchResult.hasDbResults;
        aiProducts = searchResult.aiProducts;
      } else if (Array.isArray(searchResult)) {
        // Legacy format - array of products from database
        results = searchResult;
        hasDbResults = results.length > 0;
      } else {
        // Fallback format
        results = [];
        hasDbResults = false;
      }
      
      // Apply filters to database results
      if (results.length > 0) {
        results = this.applyFilters(results, filters);
      }

      logger.info(`AI contextual search returned ${results.length} database products for query: "${query}" (context: ${searchContext ? 'yes' : 'no'})`);
      
      return {
        products: results,
        hasDbResults,
        aiProducts: aiProducts?.products || [],
        aiMessage: aiProducts?.message || null
      };

    } catch (error) {
      logger.error('Product search error:', error);
      throw error;
    }
  }

  /**
   * Calculate text relevance score
   */
  calculateTextRelevance(text, searchTerms) {
    let score = 0;
    
    searchTerms.forEach(term => {
      if (text.includes(term)) {
        // Exact match gets higher score
        if (text === term) {
          score += 1.0;
        } else if (text.startsWith(term)) {
          score += 0.8;
        } else if (text.includes(` ${term} `) || text.includes(` ${term}`)) {
          score += 0.6;
        } else {
          score += 0.3;
        }
      }
    });

    return Math.min(score, 1.0);
  }

  /**
   * Calculate category relevance
   */
  calculateCategoryRelevance(productCategory, query) {
    const queryLower = query.toLowerCase();
    
    for (const [key, category] of Object.entries(PRODUCT_CATEGORIES)) {
      if (productCategory === category.id || productCategory === category.name) {
        // Check if query matches category keywords
        const keywordMatch = category.keywords.some(keyword => 
          queryLower.includes(keyword.toLowerCase())
        );
        
        if (keywordMatch) {
          return 1.0;
        }
        
        // Check subcategories
        const subcategoryMatch = category.subcategories?.some(sub => 
          queryLower.includes(sub.toLowerCase())
        );
        
        if (subcategoryMatch) {
          return 0.8;
        }
      }
    }
    
    return 0;
  }

  /**
   * Calculate tag relevance
   */
  calculateTagRelevance(tags, searchTerms) {
    let score = 0;
    
    if (!Array.isArray(tags)) return 0;
    
    tags.forEach(tag => {
      const tagLower = tag.toLowerCase();
      searchTerms.forEach(term => {
        if (tagLower.includes(term) || term.includes(tagLower)) {
          score += 0.5;
        }
      });
    });
    
    return Math.min(score, 1.0);
  }

  /**
   * Apply search filters
   */
  applyFilters(products, filters) {
    let filtered = [...products];

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(product => 
        product.category === filters.category
      );
    }

    // Price range filter
    if (filters.minPrice || filters.maxPrice) {
      filtered = filtered.filter(product => {
        const price = this.extractPrice(product.price);
        const min = filters.minPrice ? parseFloat(filters.minPrice) : 0;
        const max = filters.maxPrice ? parseFloat(filters.maxPrice) : Infinity;
        return price >= min && price <= max;
      });
    }

    // Rating filter
    if (filters.minRating) {
      filtered = filtered.filter(product => 
        product.rating >= parseFloat(filters.minRating)
      );
    }

    // Brand filter
    if (filters.brand) {
      const brands = Array.isArray(filters.brand) ? filters.brand : [filters.brand];
      filtered = filtered.filter(product => 
        brands.includes(product.brand)
      );
    }

    // Tags filter
    if (filters.tags && Array.isArray(filters.tags)) {
      filtered = filtered.filter(product => 
        product.tags && filters.tags.some(tag => 
          product.tags.includes(tag)
        )
      );
    }

    return filtered;
  }

  /**
   * Extract numeric price from price string
   */
  extractPrice(priceString) {
    if (typeof priceString === 'number') return priceString;
    if (!priceString) return 0;
    
    // Extract first number from price string like "$28–$35" or "$29.99"
    const match = priceString.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * Enhance products with sentiment data
   */
  async enhanceWithSentiment(products) {
    try {
      const productIds = products.map(p => p.id);
      const sentimentData = await sentimentService.getProductsSentimentBatch(productIds);

      return products.map(product => {
        const sentiment = sentimentData[product.id];
        if (sentiment) {
          product.sentiment = sentiment;
          // Boost relevance score based on sentiment
          if (sentiment.score > 0.5) {
            product.relevanceScore += SEARCH_CONFIG.RELEVANCE_WEIGHTS.SENTIMENT_BOOST;
          }
        }
        return product;
      });

    } catch (error) {
      logger.warn('Failed to enhance products with sentiment:', error);
      return products;
    }
  }

  /**
   * Sort products by specified criteria
   */
  sortProducts(products, sortBy, sortOrder) {
    const direction = sortOrder === 'desc' ? -1 : 1;

    return products.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = (a.relevanceScore || 0) - (b.relevanceScore || 0);
          break;
        case 'price':
          comparison = this.extractPrice(a.price) - this.extractPrice(b.price);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'popularity':
          comparison = (a.sentiment?.mentionCount || 0) - (b.sentiment?.mentionCount || 0);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        default:
          comparison = (a.relevanceScore || 0) - (b.relevanceScore || 0);
      }

      return comparison * direction;
    });
  }

  /**
   * Generate AI response for search results
   */
  async generateAIResponse(query, searchResults) {
    try {
      const productCount = searchResults.products.length;
      
      if (productCount === 0) {
        // Use OpenAI to generate product recommendations when no results found
        const openaiService = require('./openaiService');
        if (openaiService.isAvailable()) {
          try {
            const aiResult = await openaiService.generateProductCards(query, []);
            // Add AI-generated products to search results
            searchResults.products = aiResult.products || [];
            searchResults.total = aiResult.products ? aiResult.products.length : 0;
            return aiResult.message;
          } catch (error) {
            logger.error('OpenAI generation failed:', error);
            return this.generateNoResultsResponse(query);
          }
        } else {
          return this.generateNoResultsResponse(query);
        }
      }

      const avgRating = searchResults.products.reduce((sum, p) => sum + (p.rating || 0), 0) / productCount;
      
      // Analyze sentiment distribution
      const sentiments = searchResults.products
        .map(p => p.sentiment?.label)
        .filter(Boolean);
      
      const sentimentCounts = sentiments.reduce((acc, sentiment) => {
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        return acc;
      }, {});

      return this.generateContextualResponse(query, {
        productCount,
        avgRating,
        sentimentCounts,
        searchTime: searchResults.searchTime
      });

    } catch (error) {
      logger.error('AI response generation error:', error);
      return `I found ${searchResults.products.length} products matching "${query}". Here are the results sorted by relevance and community sentiment.`;
    }
  }

  /**
   * Generate contextual response based on search results
   */
  generateContextualResponse(query, stats) {
    const { productCount, avgRating, sentimentCounts, searchTime } = stats;

    let response = `I discovered ${productCount} products matching "${query}".`;

    // Add sentiment insight
    const totalSentiments = Object.values(sentimentCounts).reduce((a, b) => a + b, 0);
    if (totalSentiments > 0) {
      const highlyRegarded = sentimentCounts['highly-regarded'] || 0;
      const wellRegarded = sentimentCounts['well-regarded'] || 0;
      const positiveRatio = (highlyRegarded + wellRegarded) / totalSentiments;

      if (positiveRatio > 0.7) {
        response += ' Great news - most of these products have excellent community sentiment and reviews.';
      } else if (positiveRatio > 0.4) {
        response += ' These products show mixed community sentiment, so I\'ve highlighted the top-rated ones for you.';
      } else {
        response += ' I\'ve found some products, but community sentiment is mixed. Check the detailed reviews for each item.';
      }
    }

    // Add category-specific insights
    const queryLower = query.toLowerCase();
    if (queryLower.includes('skincare') || queryLower.includes('beauty')) {
      response += ' I\'ve prioritized products with clean ingredients and proven results from the beauty community.';
    } else if (queryLower.includes('tech') || queryLower.includes('wireless')) {
      response += ' These tech products are sorted by value and real-world performance based on user feedback.';
    } else if (queryLower.includes('fitness') || queryLower.includes('workout')) {
      response += ' These fitness products are popular among home workout enthusiasts and have strong community support.';
    } else if (queryLower.includes('kitchen') || queryLower.includes('cooking')) {
      response += ' I\'ve found kitchen gadgets that home cooks actually recommend and use regularly.';
    }

    // Add rating insight
    if (avgRating > 90) {
      response += ' The average rating is exceptionally high across these products.';
    } else if (avgRating > 80) {
      response += ' These products maintain solid ratings from users.';
    }

    return response;
  }

  /**
   * Generate response for no results
   */
  generateNoResultsResponse(query) {
    const suggestions = this.getAlternativeSearchSuggestions(query);
    
    let response = `I didn't find matching products in our database. Here are some general recommendations:`;
    
    if (suggestions.length > 0) {
      response += ` You might want to try searching for: ${suggestions.slice(0, 3).join(', ')}.`;
    } else {
      response += ' Try adjusting your search terms or explore our trending categories below.';
    }
    
    return response;
  }

  /**
   * Get alternative search suggestions
   */
  getAlternativeSearchSuggestions(query) {
    const queryLower = query.toLowerCase();
    let suggestions = [];

    // Category-based suggestions
    for (const [key, category] of Object.entries(PRODUCT_CATEGORIES)) {
      const hasKeyword = category.keywords.some(keyword => 
        queryLower.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        suggestions = suggestions.concat(SUGGESTED_SEARCHES[key] || []);
      }
    }

    // If no category match, return default suggestions
    if (suggestions.length === 0) {
      suggestions = SUGGESTED_SEARCHES.DEFAULT;
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Get contextual suggestions based on query
   */
  async getContextualSuggestions(query) {
    try {
      const cacheKey = `${CACHE_KEYS.SEARCH_RESULTS}:suggestions:${query}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const suggestions = [];
      const queryLower = query.toLowerCase();

      // Category-based suggestions
      if (queryLower.includes('skincare') || queryLower.includes('beauty')) {
        suggestions.push(
          { text: 'Anti-aging', icon: '✨', query: 'anti-aging skincare products' },
          { text: 'Sensitive skin', icon: '🤲', query: 'skincare for sensitive skin' },
          { text: 'Natural ingredients', icon: '🌿', query: 'natural skincare products' },
          { text: 'Under $30', icon: '💰', query: 'skincare products under $30' }
        );
      } else if (queryLower.includes('tech') || queryLower.includes('wireless')) {
        suggestions.push(
          { text: 'iPhone accessories', icon: '📱', query: 'iPhone accessories' },
          { text: 'Wireless charging', icon: '🔋', query: 'wireless charging accessories' },
          { text: 'Gaming accessories', icon: '🎮', query: 'gaming tech accessories' },
          { text: 'USB-C accessories', icon: '🔌', query: 'USB-C tech accessories' }
        );
      } else if (queryLower.includes('fitness') || queryLower.includes('workout')) {
        suggestions.push(
          { text: 'Home gym equipment', icon: '🏠', query: 'home gym equipment' },
          { text: 'Yoga accessories', icon: '🧘', query: 'yoga and meditation accessories' },
          { text: 'Portable equipment', icon: '🎒', query: 'portable fitness equipment' },
          { text: 'Recovery tools', icon: '💆', query: 'muscle recovery tools' }
        );
      } else {
        // Universal suggestions
        suggestions.push(
          { text: 'Under $50', icon: '💰', query: `${query} under $50` },
          { text: 'Trending now', icon: '📈', query: `trending ${query}` },
          { text: 'Best rated', icon: '⭐', query: `best rated ${query}` },
          { text: 'New releases', icon: '🆕', query: `new ${query}` }
        );
      }

      const result = suggestions.slice(0, 6);
      
      // Cache for 1 hour
      await cacheService.set(cacheKey, result, CACHE_TTL.LONG);
      
      return result;

    } catch (error) {
      logger.error('Contextual suggestions error:', error);
      return [];
    }
  }

  /**
   * Get search suggestions/autocomplete
   */
  async getSearchSuggestions(partial, limit = 10) {
    try {
      const cacheKey = `suggestions:${partial.toLowerCase()}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Mock implementation - replace with actual search index
      const allSuggestions = [
        ...Object.values(SUGGESTED_SEARCHES).flat(),
        // Add trending searches
        ...Array.from(this.trendingQueries.keys())
      ];

      const partialLower = partial.toLowerCase();
      const suggestions = allSuggestions
        .filter(suggestion => suggestion.toLowerCase().includes(partialLower))
        .slice(0, limit)
        .map(suggestion => ({
          text: suggestion,
          type: 'suggestion'
        }));

      // Cache for 10 minutes
      await cacheService.set(cacheKey, suggestions, 600);
      
      return suggestions;

    } catch (error) {
      logger.error('Search suggestions error:', error);
      return [];
    }
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches({ limit = 20, timeframe = 'daily', category } = {}) {
    try {
      const cacheKey = `${CACHE_KEYS.TRENDING_SEARCHES}:${timeframe}:${category || 'all'}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Mock trending data - replace with actual analytics
      const trending = Array.from(this.trendingQueries.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, limit)
        .map(([query, data]) => ({
          query,
          count: data.count,
          growth: this.calculateTrendingGrowth(data),
          category: this.categorizeQuery(query)
        }));

      // Filter by category if specified
      const filtered = category ? 
        trending.filter(item => item.category === category) : 
        trending;

      // Cache for 30 minutes
      await cacheService.set(cacheKey, filtered, CACHE_TTL.MEDIUM * 6);
      
      return filtered;

    } catch (error) {
      logger.error('Trending searches error:', error);
      return [];
    }
  }

  /**
   * Get popular categories
   */
  async getPopularCategories(limit = 10) {
    try {
      const cacheKey = CACHE_KEYS.POPULAR_CATEGORIES;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Get categories with search counts
      const categories = Object.values(PRODUCT_CATEGORIES)
        .map(category => ({
          ...category,
          searchCount: this.getCategorySearchCount(category.id),
          trending: this.getCategoryTrending(category.id)
        }))
        .sort((a, b) => b.searchCount - a.searchCount)
        .slice(0, limit);

      // Cache for 2 hours
      await cacheService.set(cacheKey, categories, CACHE_TTL.LONG * 2);
      
      return categories;

    } catch (error) {
      logger.error('Popular categories error:', error);
      return Object.values(PRODUCT_CATEGORIES).slice(0, limit);
    }
  }

  /**
   * Track search query for analytics
   */
  trackSearchQuery(query, filters = {}) {
    try {
      const key = query.toLowerCase().trim();
      if (!key) return;

      const existing = this.trendingQueries.get(key) || { 
        count: 0, 
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        filters: new Set()
      };

      existing.count++;
      existing.lastSeen = Date.now();
      
      // Track unique filter combinations
      if (Object.keys(filters).length > 0) {
        existing.filters.add(JSON.stringify(filters));
      }

      this.trendingQueries.set(key, existing);

      // Also track in search history
      this.addToSearchHistory(query, filters);

    } catch (error) {
      logger.error('Track search query error:', error);
    }
  }

  /**
   * Add to search history
   */
  addToSearchHistory(query, filters) {
    const timestamp = Date.now();
    const entry = { query, filters, timestamp };
    
    if (!this.searchHistory.has(query)) {
      this.searchHistory.set(query, []);
    }
    
    this.searchHistory.get(query).push(entry);
    
    // Keep only last 100 entries per query
    const history = this.searchHistory.get(query);
    if (history.length > 100) {
      this.searchHistory.set(query, history.slice(-100));
    }
  }

  /**
   * Calculate trending growth
   */
  calculateTrendingGrowth(data) {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // This is a simplified calculation
    // In a real implementation, you'd compare current hour vs previous hour
    const timeSinceFirst = now - data.firstSeen;
    const hoursSinceFirst = timeSinceFirst / (60 * 60 * 1000);
    
    if (hoursSinceFirst < 1) return 100; // New queries get 100% growth
    
    return Math.min(Math.round((data.count / hoursSinceFirst) * 10), 100);
  }

  /**
   * Categorize query based on keywords
   */
  categorizeQuery(query) {
    const queryLower = query.toLowerCase();
    
    for (const [key, category] of Object.entries(PRODUCT_CATEGORIES)) {
      const hasKeyword = category.keywords.some(keyword => 
        queryLower.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        return category.id;
      }
    }
    
    return 'general';
  }

  /**
   * Get category search count
   */
  getCategorySearchCount(categoryId) {
    let count = 0;
    
    for (const [query, data] of this.trendingQueries.entries()) {
      if (this.categorizeQuery(query) === categoryId) {
        count += data.count;
      }
    }
    
    return count;
  }

  /**
   * Get category trending status
   */
  getCategoryTrending(categoryId) {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    let recentCount = 0;
    let totalCount = 0;
    
    for (const [query, data] of this.trendingQueries.entries()) {
      if (this.categorizeQuery(query) === categoryId) {
        totalCount += data.count;
        if (data.lastSeen > hourAgo) {
          recentCount += data.count;
        }
      }
    }
    
    return totalCount > 0 ? Math.round((recentCount / totalCount) * 100) : 0;
  }

  /**
   * Generate cache key for search results
   */
  generateSearchCacheKey(query, filters, page, limit, sortBy, sortOrder) {
    const filterKey = Object.keys(filters).length > 0 ? 
      JSON.stringify(filters) : 'no-filters';
    
    return `${query}:${filterKey}:${page}:${limit}:${sortBy}:${sortOrder}`;
  }

  /**
   * Get available filters for category
   */
  async getAvailableFilters(category) {
    try {
      const cacheKey = `filters:${category}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Mock implementation - replace with actual database aggregation
      const filters = {
        priceRanges: [
          { label: 'Under $25', min: 0, max: 25 },
          { label: '$25 - $50', min: 25, max: 50 },
          { label: '$50 - $100', min: 50, max: 100 },
          { label: 'Over $100', min: 100, max: null }
        ],
        ratings: [4.5, 4.0, 3.5, 3.0],
        brands: ['GlowLab', 'SoundCore Pro', 'FlexFit Pro', 'KitchenTech'],
        tags: ['Natural', 'Wireless', 'Bluetooth', 'Portable', 'Smart']
      };

      // Category-specific filters
      if (category === 'skincare-beauty') {
        filters.skinTypes = ['All Skin Types', 'Sensitive', 'Oily', 'Dry', 'Combination'];
        filters.ingredients = ['Hyaluronic Acid', 'Vitamin C', 'Retinol', 'Niacinamide'];
      } else if (category === 'tech-accessories') {
        filters.compatibility = ['iPhone', 'Android', 'Universal', 'USB-C'];
        filters.features = ['Wireless', 'Fast Charging', 'Waterproof', 'Portable'];
      }

      // Cache for 1 hour
      await cacheService.set(cacheKey, filters, CACHE_TTL.LONG);
      
      return filters;

    } catch (error) {
      logger.error('Get available filters error:', error);
      return {};
    }
  }

  /**
   * User search history methods
   */
  async getUserSearchHistory(userId, { limit = 20, offset = 0 } = {}) {
    // Mock implementation - replace with database
    return {
      searches: [],
      total: 0
    };
  }

  async clearUserSearchHistory(userId) {
    // Mock implementation - replace with database
    return true;
  }

  async saveUserSearch(userId, searchData) {
    // Mock implementation - replace with database
    return {
      id: Date.now().toString(),
      ...searchData,
      userId,
      createdAt: new Date()
    };
  }

  async getUserSavedSearches(userId) {
    // Mock implementation - replace with database
    return [];
  }
}

module.exports = new SearchService();
