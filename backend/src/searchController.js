/**
 * Search Controller
 * Handles search requests, suggestions, and trending queries
 */

const { validationResult } = require('express-validator');
const searchService = require('./services/searchService');
const analyticsService = require('./services/analyticsService');
const { logger } = require('./utils/logger');
const { HTTP_STATUS, ERROR_CODES, SEARCH_CONFIG } = require('./config/constants');

class SearchController {
  /**
   * Perform product search
   * POST /api/search
   */
  async search(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: errors.array()
        });
      }

      const { 
        query, 
        filters = {}, 
        page = 1, 
        limit = SEARCH_CONFIG.DEFAULT_PAGE_SIZE,
        sortBy = 'relevance',
        sortOrder = 'desc',
        conversationContext = {}
      } = req.body;
      
      // Validate query length
      if (query.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_SEARCH_QUERY,
          message: `Search query must be at least ${SEARCH_CONFIG.MIN_QUERY_LENGTH} characters long`
        });
      }

      if (query.length > SEARCH_CONFIG.MAX_QUERY_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_SEARCH_QUERY,
          message: `Search query cannot exceed ${SEARCH_CONFIG.MAX_QUERY_LENGTH} characters`
        });
      }

      // Validate pagination
      const validatedPage = Math.max(1, parseInt(page));
      const validatedLimit = Math.min(
        Math.max(1, parseInt(limit)), 
        SEARCH_CONFIG.MAX_PAGE_SIZE
      );

      logger.info(`Search request: "${query}"`, {
        requestId: req.id,
        ip: req.ip,
        filters,
        page: validatedPage,
        limit: validatedLimit
      });
      
      logger.info('About to call searchService.performSearch');

      // Get or create search context for this session
      const searchContextService = require('./services/searchContextService');
      const sessionId = searchContextService.getSessionId(req);
      const contextSummary = searchContextService.generateContextSummary(sessionId);

      // Track search analytics (async, don't wait)
      analyticsService.trackSearch(query, filters, req.ip, req.id).catch(error => {
        logger.error('Analytics tracking failed:', error);
      });

      // Extract conversation context
      const { previousProducts = [], previousQuery = '', chatHistory = [] } = conversationContext;
      
      // Check if this is a conversational query about previous products
      const isConversationalQuery = previousProducts.length > 0 && (
        query.toLowerCase().includes('pros') ||
        query.toLowerCase().includes('cons') ||
        query.toLowerCase().includes('compare') ||
        query.toLowerCase().includes('tell me more') ||
        query.toLowerCase().includes('what about') ||
        query.toLowerCase().includes('these products') ||
        query.toLowerCase().includes('these items') ||
        query.toLowerCase().includes('advantages') ||
        query.toLowerCase().includes('disadvantages') ||
        query.toLowerCase().includes('benefits') ||
        query.toLowerCase().includes('drawbacks')
      );

      logger.info('Conversational context check:', {
        isConversationalQuery,
        hasPreviousProducts: previousProducts.length > 0,
        previousProductsCount: previousProducts.length,
        previousQuery,
        currentQuery: query
      });

      let finalProducts = [];
      let aiResponse = '';
      let isAiRecommendation = false;
      let searchResults = { hasDbResults: false, searchTime: 0 }; // Default values

      if (isConversationalQuery) {
        // Handle conversational queries about previous products
        logger.info('Processing conversational query about previous products');
        
        // Use previous products instead of searching
        finalProducts = previousProducts;
        
        // Generate conversational AI response
        const openaiService = require('./services/openaiService');
        try {
          if (openaiService.isAvailable()) {
            aiResponse = await openaiService.generateConversationalResponse(query, {
              previousProducts,
              previousQuery,
              chatHistory,
              currentTopic: previousQuery,
              searchResults: { hasDbResults: false }
            });
          } else {
            aiResponse = `I'd be happy to analyze the products from your previous search for "${previousQuery}", but I don't have access to my AI analysis capabilities right now.`;
          }
        } catch (error) {
          logger.error('OpenAI conversational analysis error:', error);
          aiResponse = `I encountered an error while analyzing the previous products. Please try again.`;
        }
        
        isAiRecommendation = false; // This is analysis, not new recommendations
      } else {
        // Regular search flow
        logger.info('Processing regular search query');
        
        // Perform search with context
        logger.info('Calling searchService.performSearch with params:', {
          query,
          filters,
          page: validatedPage,
          limit: validatedLimit,
          sortBy,
          sortOrder,
          hasContext: !!contextSummary,
          hasConversationContext: !!conversationContext
        });
        
        searchResults = await searchService.performSearch({
          query,
          filters,
          page: validatedPage,
          limit: validatedLimit,
          sortBy,
          sortOrder,
          searchContext: contextSummary,
          conversationContext
        });
        
        logger.info('searchService.performSearch completed:', {
          hasResults: !!searchResults,
          productsCount: searchResults?.products?.length || 0
        });
        
        // Determine which products to show and generate appropriate AI response
        if (searchResults.products && searchResults.products.length > 0) {
          // Use database products
          finalProducts = searchResults.products;
          aiResponse = await searchService.generateAIResponse(query, {
            products: searchResults.products,
            total: searchResults.products.length,
            searchTime: searchResults.searchTime
          });
          isAiRecommendation = false;
        } else if (searchResults.aiProducts && searchResults.aiProducts.length > 0) {
          // Use AI-generated products
          finalProducts = searchResults.aiProducts;
          aiResponse = searchResults.aiMessage || `I didn't find matching products in our database, but I can recommend some excellent options based on current market knowledge:`;
          isAiRecommendation = true;
        } else {
          // No products found anywhere
          finalProducts = [];
          aiResponse = await searchService.generateAIResponse(query, {
            products: [],
            total: 0,
            searchTime: searchResults.searchTime || 0
          });
          isAiRecommendation = true;
        }
      }

      // Get contextual suggestions
      const suggestions = await searchService.getContextualSuggestions(query);

      // Calculate pagination info
      const totalProducts = finalProducts.length;
      const totalPages = Math.ceil(totalProducts / validatedLimit);
      const hasNextPage = validatedPage < totalPages;
      const hasPrevPage = validatedPage > 1;

      // Store the search interaction in context for future searches
      searchContextService.addSearchInteraction(sessionId, {
        query,
        results: finalProducts,
        hasDbResults: searchResults.hasDbResults || false,
        isAiRecommendation,
        filters
      });

      const responseData = {
        success: true,
        data: {
          query,
          aiResponse,
          products: finalProducts,
          suggestions,
          total: totalProducts,
          hasMore: hasNextPage,
          searchId: `search-${Date.now()}`,
          responseTime: searchResults.searchTime || 0,
          hasDbResults: searchResults.hasDbResults || false,
          isAiRecommendation,
          sessionId, // Include session ID so frontend can maintain context
          pagination: {
            page: validatedPage,
            limit: validatedLimit,
            total: totalProducts,
            pages: totalPages,
            hasNextPage,
            hasPrevPage
          },
          meta: {
            searchTime: searchResults.searchTime || 0,
            totalResults: totalProducts,
            appliedFilters: filters,
            hasContext: contextSummary ? true : false
          }
        }
      };

      res.json(responseData);

    } catch (error) {
      logger.error('Search error:', {
        error: error.message,
        requestId: req.id,
        query: req.body.query
      });
      next(error);
    }
  }

  /**
   * Get search suggestions
   * GET /api/search/suggestions?q=query
   */
  async getSuggestions(req, res, next) {
    try {
      const { q: query, limit = SEARCH_CONFIG.SUGGESTION_LIMIT } = req.query;
      
      if (!query || query.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const validatedLimit = Math.min(parseInt(limit) || SEARCH_CONFIG.SUGGESTION_LIMIT, 20);

      logger.debug(`Getting suggestions for: "${query}"`, {
        requestId: req.id,
        limit: validatedLimit
      });

      const suggestions = await searchService.getSearchSuggestions(query, validatedLimit);
      
      res.json({
        success: true,
        data: suggestions
      });

    } catch (error) {
      logger.error('Suggestions error:', {
        error: error.message,
        requestId: req.id,
        query: req.query.q
      });
      next(error);
    }
  }

  /**
   * Get trending searches
   * GET /api/search/trending
   */
  async getTrendingSearches(req, res, next) {
    try {
      const { 
        limit = SEARCH_CONFIG.TRENDING_LIMIT,
        timeframe = 'daily',
        category 
      } = req.query;
      
      const validatedLimit = Math.min(parseInt(limit), 100);

      logger.debug('Getting trending searches', {
        requestId: req.id,
        limit: validatedLimit,
        timeframe,
        category
      });

      const trendingSearches = await searchService.getTrendingSearches({
        limit: validatedLimit,
        timeframe,
        category
      });
      
      res.json({
        success: true,
        data: trendingSearches,
        meta: {
          timeframe,
          category: category || 'all',
          count: trendingSearches.length
        }
      });

    } catch (error) {
      logger.error('Trending searches error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get popular categories
   * GET /api/search/categories
   */
  async getPopularCategories(req, res, next) {
    try {
      const { limit = SEARCH_CONFIG.POPULAR_CATEGORIES_LIMIT } = req.query;
      
      const validatedLimit = Math.min(parseInt(limit), 50);

      logger.debug('Getting popular categories', {
        requestId: req.id,
        limit: validatedLimit
      });

      const categories = await searchService.getPopularCategories(validatedLimit);
      
      res.json({
        success: true,
        data: categories,
        meta: {
          count: categories.length
        }
      });

    } catch (error) {
      logger.error('Popular categories error:', {
        error: error.message,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get search history for user
   * GET /api/search/history
   */
  async getSearchHistory(req, res, next) {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const userId = req.user?.id; // Assuming auth middleware sets req.user

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      const validatedLimit = Math.min(parseInt(limit), 100);
      const validatedOffset = Math.max(0, parseInt(offset));

      logger.debug('Getting search history', {
        requestId: req.id,
        userId,
        limit: validatedLimit,
        offset: validatedOffset
      });

      const history = await searchService.getUserSearchHistory(userId, {
        limit: validatedLimit,
        offset: validatedOffset
      });
      
      res.json({
        success: true,
        data: history.searches,
        meta: {
          total: history.total,
          limit: validatedLimit,
          offset: validatedOffset,
          hasMore: (validatedOffset + validatedLimit) < history.total
        }
      });

    } catch (error) {
      logger.error('Search history error:', {
        error: error.message,
        requestId: req.id,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Clear search history for user
   * DELETE /api/search/history
   */
  async clearSearchHistory(req, res, next) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      logger.info('Clearing search history', {
        requestId: req.id,
        userId
      });

      await searchService.clearUserSearchHistory(userId);
      
      res.json({
        success: true,
        message: 'Search history cleared successfully'
      });

    } catch (error) {
      logger.error('Clear search history error:', {
        error: error.message,
        requestId: req.id,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Get search filters for category
   * GET /api/search/filters/:category
   */
  async getSearchFilters(req, res, next) {
    try {
      const { category } = req.params;

      logger.debug('Getting search filters', {
        requestId: req.id,
        category
      });

      const filters = await searchService.getAvailableFilters(category);
      
      res.json({
        success: true,
        data: filters,
        meta: {
          category
        }
      });

    } catch (error) {
      logger.error('Search filters error:', {
        error: error.message,
        requestId: req.id,
        category: req.params.category
      });
      next(error);
    }
  }

  /**
   * Save search query (for logged-in users)
   * POST /api/search/save
   */
  async saveSearch(req, res, next) {
    try {
      const { query, filters = {}, name } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      if (!query || !name) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Query and name are required'
        });
      }

      logger.info('Saving search', {
        requestId: req.id,
        userId,
        query,
        name
      });

      const savedSearch = await searchService.saveUserSearch(userId, {
        query,
        filters,
        name
      });
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: savedSearch,
        message: 'Search saved successfully'
      });

    } catch (error) {
      logger.error('Save search error:', {
        error: error.message,
        requestId: req.id,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Get saved searches for user
   * GET /api/search/saved
   */
  async getSavedSearches(req, res, next) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required'
        });
      }

      logger.debug('Getting saved searches', {
        requestId: req.id,
        userId
      });

      const savedSearches = await searchService.getUserSavedSearches(userId);
      
      res.json({
        success: true,
        data: savedSearches
      });

    } catch (error) {
      logger.error('Saved searches error:', {
        error: error.message,
        requestId: req.id,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Get user search history
   * GET /api/search/history
   */
  async getSearchHistory(req, res, next) {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return res.json({
          success: true,
          data: {
            history: []
          }
        });
      }

      const validatedLimit = Math.min(parseInt(limit), 100);
      const validatedOffset = Math.max(0, parseInt(offset));

      logger.debug('Getting search history', {
        requestId: req.id,
        userId,
        limit: validatedLimit,
        offset: validatedOffset
      });

      const history = await searchService.getUserSearchHistory(userId, {
        limit: validatedLimit,
        offset: validatedOffset
      });
      
      res.json({
        success: true,
        data: history.searches || [],
        meta: {
          total: history.total || 0,
          limit: validatedLimit,
          offset: validatedOffset,
          hasMore: (validatedOffset + validatedLimit) < (history.total || 0)
        }
      });

    } catch (error) {
      logger.error('Search history error:', {
        error: error.message,
        requestId: req.id,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Handle conversational follow-up questions
   * POST /api/search/chat
   */
  async chat(req, res, next) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: errors.array()
        });
      }

      const { 
        query, 
        conversationContext = {} 
      } = req.body;
      
      // Validate query length
      if (query.length < 1) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_SEARCH_QUERY,
          message: 'Query cannot be empty'
        });
      }

      if (query.length > SEARCH_CONFIG.MAX_QUERY_LENGTH) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.INVALID_SEARCH_QUERY,
          message: `Query cannot exceed ${SEARCH_CONFIG.MAX_QUERY_LENGTH} characters`
        });
      }

      // Get search context for this session
      const searchContextService = require('./services/searchContextService');
      const sessionId = searchContextService.getSessionId(req);
      const searchContext = searchContextService.getContextForAISearch(sessionId);

      logger.info(`Chat request: "${query}"`, {
        requestId: req.id,
        ip: req.ip,
        hasContext: Object.keys(conversationContext).length > 0,
        hasSearchContext: searchContext.recentSearches.length > 0
      });

      // Enhanced conversation context with search history
      const enhancedContext = {
        ...conversationContext,
        searchHistory: searchContext.recentSearches,
        userPreferences: searchContext.userPreferences,
        conversationFlow: searchContext.conversationFlow,
        previousProducts: searchContext.recentSearches.length > 0 ? 
          searchContext.recentSearches[0].results || [] : []
      };
      
      // Debug logging
      console.log('🔍 Chat controller context debug:', {
        query,
        hasConversationContext: Object.keys(conversationContext).length > 0,
        hasSearchHistory: searchContext.recentSearches.length > 0,
        previousProductsCount: enhancedContext.previousProducts.length,
        conversationContextKeys: Object.keys(conversationContext)
      });

      // Generate conversational response using OpenAI service
      const openaiService = require('./services/openaiService');
      let aiResponse = '';

      if (openaiService.isAvailable()) {
        try {
          aiResponse = await openaiService.generateConversationalResponse(query, enhancedContext);
        } catch (error) {
          logger.error('OpenAI conversational response failed:', error);
          aiResponse = 'I apologize, but I\'m having trouble processing your question right now. Could you try rephrasing it?';
        }
      } else {
        aiResponse = 'I\'m currently unable to provide conversational responses. Please try searching for products instead.';
      }

      // Track chat analytics (async, don't wait)
      analyticsService.trackSearch(query, {}, req.ip, req.id).catch(error => {
        logger.error('Analytics tracking failed:', error);
      });

      res.json({
        success: true,
        data: {
          query,
          aiResponse,
          timestamp: new Date().toISOString(),
          conversational: true,
          responseTime: Date.now() - req.startTime
        }
      });

    } catch (error) {
      logger.error('Chat error:', {
        error: error.message,
        requestId: req.id,
        query: req.body.query
      });
      next(error);
    }
  }

  /**
   * Get search by ID - placeholder method
   * GET /api/search/:searchId
   */
  async getSearchById(req, res, next) {
    try {
      const { searchId } = req.params;
      
      // Mock implementation for now
      res.json({
        success: true,
        data: {
          id: searchId,
          query: 'mock search',
          products: [],
          total: 0,
          timestamp: new Date()
        }
      });

    } catch (error) {
      logger.error('Get search by ID error:', {
        error: error.message,
        requestId: req.id,
        searchId: req.params.searchId
      });
      next(error);
    }
  }
}

module.exports = new SearchController();
