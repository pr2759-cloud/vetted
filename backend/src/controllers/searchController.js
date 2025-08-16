/**
 * Search Controller
 * Handles product search and discovery operations
 */

const Product = require('../models/Product');
const openaiService = require('../services/openaiService');
const { logger } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class SearchController {
  /**
   * Search for products based on query and filters
   */
  async searchProducts(req, res) {
    try {
      const { query, filters = {}, limit = 20, offset = 0, conversationContext = {} } = req.body;
      const userId = req.user?.id;

      logger.info('Product search initiated', {
        requestId: req.id,
        userId,
        query,
        filters,
        limit,
        offset,
        hasConversationContext: !!conversationContext && Object.keys(conversationContext).length > 0
      });

      // Build database query based on search parameters
      const dbQuery = { status: 'active' };
      let searchStages = [];

      // Apply text search if query provided
      if (query && query.trim()) {
        const searchTerm = query.trim();
        searchStages.push({
          $match: {
            ...dbQuery,
            $or: [
              { name: { $regex: searchTerm, $options: 'i' } },
              { description: { $regex: searchTerm, $options: 'i' } },
              { brand: { $regex: searchTerm, $options: 'i' } },
              { category: { $regex: searchTerm, $options: 'i' } },
              { tags: { $in: [new RegExp(searchTerm, 'i')] } }
            ]
          }
        });
      } else {
        searchStages.push({ $match: dbQuery });
      }

      // Get products from database
      let products = [];
      try {
        if (searchStages.length > 0) {
          products = await Product.aggregate([
            ...searchStages,
            { $sort: { rating: -1, 'analytics.views': -1 } },
            { $limit: parseInt(limit) + parseInt(offset) },
            { $skip: parseInt(offset) }
          ]);
        } else {
          products = await Product.find(dbQuery)
            .sort({ rating: -1, 'analytics.views': -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit))
            .lean();
        }
      } catch (dbError) {
        logger.warn('Database search failed, returning empty results', { error: dbError.message });
        products = [];
      }

      // Transform products to frontend format
      let filteredProducts = products.map(product => ({
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: {
          min: product.priceRange?.min || 0,
          max: product.priceRange?.max || 0,
          display: product.price || `$${product.priceRange?.min || 0}–$${product.priceRange?.max || 0}`
        },
        rating: product.rating || 0,
        reviews: {
          count: product.reviewCount || 0,
          display: `${(product.reviewCount || 0).toLocaleString()} reviews`
        },
        tags: product.tags || [],
        category: product.category || 'Unknown',
        brand: product.brand || 'Unknown',
        images: product.images || [],
        sentiment: {
          label: 'well-regarded',
          emoji: '👍',
          text: 'Well Regarded',
          description: 'Popular choice',
          score: Math.min(1, (product.rating || 0) / 100),
          confidence: 0.85,
          mentionCount: product.reviewCount || 0,
          trending: 'stable',
          breakdown: {
            quality: Math.min(1, (product.rating || 0) / 100),
            value: 0.8,
            popularity: Math.min(1, ((product.analytics?.views || 0) / 1000)),
            reliability: Math.min(1, (product.rating || 0) / 100)
          }
        },
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }));

      // Only apply filters to database products, not AI recommendations
      if (filteredProducts.length > 0) {
        // Apply category filters
        if (filters.categories && filters.categories.length > 0) {
          filteredProducts = filteredProducts.filter(product =>
            filters.categories.includes(product.category)
          );
        }

        // Apply price range filters
        if (filters.priceRanges && filters.priceRanges.length > 0) {
          filteredProducts = filteredProducts.filter(product => {
            const price = product.price.min;
            return filters.priceRanges.some(range => {
              if (range === 'Under $25') return price < 25;
              if (range === '$25 - $50') return price >= 25 && price <= 50;
              if (range === '$50 - $100') return price >= 50 && price <= 100;
              if (range === '$100 - $200') return price >= 100 && price <= 200;
              if (range === '$200+') return price > 200;
              return false;
            });
          });
        }

        // Apply rating filters
        if (filters.ratings && filters.ratings.length > 0) {
          filteredProducts = filteredProducts.filter(product => {
            const rating = product.rating;
            return filters.ratings.some(ratingFilter => {
              if (ratingFilter === '4.5+ Stars (90+ Rating)') return rating >= 90;
              if (ratingFilter === '4+ Stars (80+ Rating)') return rating >= 80;
              if (ratingFilter === '3.5+ Stars (70+ Rating)') return rating >= 70;
              if (ratingFilter === '3+ Stars (60+ Rating)') return rating >= 60;
              return false;
            });
          });
        }

        // Apply sentiment filters
        if (filters.sentiments && filters.sentiments.length > 0) {
          filteredProducts = filteredProducts.filter(product => {
            const sentiment = product.sentiment.text;
            return filters.sentiments.some(sentimentFilter => {
              if (sentimentFilter === 'Highly Regarded') return product.sentiment.label === 'highly-regarded';
              if (sentimentFilter === 'Well Regarded') return product.sentiment.label === 'well-regarded';
              if (sentimentFilter === 'Mixed Reviews') return product.sentiment.label === 'mixed-reviews';
              if (sentimentFilter === 'Rising Stars') return product.sentiment.trending === 'new';
              return false;
            });
          });
        }

        // Apply trending filters
        if (filters.trending && filters.trending.length > 0) {
          filteredProducts = filteredProducts.filter(product => {
            const trending = product.sentiment.trending;
            return filters.trending.some(trendFilter => {
              if (trendFilter === 'Trending Up') return trending === 'up';
              if (trendFilter === 'New Products') return trending === 'new';
              if (trendFilter === 'Most Popular') return product.sentiment.mentionCount > 15000;
              if (trendFilter === 'Hidden Gems') return product.sentiment.mentionCount < 10000 && product.rating > 85;
              return false;
            });
          });
        }

        // Apply feature filters
        if (filters.features && filters.features.length > 0) {
          filteredProducts = filteredProducts.filter(product =>
            filters.features.some(feature =>
              product.tags.includes(feature)
            )
          );
        }
      }

      const searchResult = {
        products: filteredProducts,
        total: filteredProducts.length,
        hasMore: false,
        searchId: require('uuid').v4(),
        query,
        filters
      };

      // Extract conversation context
      const { previousProducts = [], previousQuery = '', chatHistory = [] } = conversationContext;
      
      // Debug logging
      logger.info('Conversation context received:', {
        hasPreviousProducts: previousProducts.length > 0,
        previousProductsCount: previousProducts.length,
        previousQuery,
        chatHistoryLength: chatHistory.length,
        currentQuery: query
      });
      
      // Check if this is a conversational query about previous products
      const isConversationalQuery = previousProducts.length > 0 && (
        query.toLowerCase().includes('pros') ||
        query.toLowerCase().includes('cons') ||
        query.toLowerCase().includes('compare') ||
        query.toLowerCase().includes('tell me more') ||
        query.toLowerCase().includes('what about') ||
        query.toLowerCase().includes('these products') ||
        query.toLowerCase().includes('these items')
      );
      
      // Check if we need AI recommendations or conversational analysis
      let needsAiRecommendations = searchResult.products.length === 0 && query && query.trim();
      let needsConversationalAnalysis = isConversationalQuery && previousProducts.length > 0;
      let aiResponse;
      let hasDbResults = searchResult.products.length > 0;
      let isAiRecommendation = false;
      
      if (needsConversationalAnalysis) {
        // When user asks about previous products (pros/cons, comparisons, etc.)
        try {
          if (openaiService.isAvailable()) {
            const aiResult = await openaiService.generateConversationalResponse(query, {
              previousProducts,
              previousQuery,
              chatHistory,
              currentTopic: previousQuery
            });
            aiResponse = aiResult.message || aiResult;
            
            // For conversational queries, return the previous products with AI analysis
            searchResult.products = previousProducts;
            searchResult.total = previousProducts.length;
            hasDbResults = false; // This is conversational, not DB search
            isAiRecommendation = false; // This is analysis, not new recommendations
          } else {
            aiResponse = `I'd be happy to analyze the products from your previous search, but I don't have access to my AI analysis capabilities right now.`;
          }
        } catch (error) {
          logger.error('OpenAI conversational analysis error:', error);
          aiResponse = `I encountered an error while analyzing the previous products. Please try again.`;
        }
      } else if (needsAiRecommendations) {
        // When no database products found, use AI to provide recommendations
        try {
          if (openaiService.isAvailable()) {
            const aiResult = await openaiService.generateProductCards(
              query, 
              [], 
              { previousProducts, previousQuery, chatHistory }
            );
            aiResponse = aiResult.message;
            const aiProducts = aiResult.products || [];
            
            // Add AI products to the search result (bypass filtering)
            searchResult.products = aiProducts;
            searchResult.total = aiProducts.length;
            isAiRecommendation = aiProducts.length > 0;
            hasDbResults = false; // Ensure this is false for AI products
          } else {
            aiResponse = `I couldn't find any products matching "${query}" in our database. Unfortunately, I don't have access to my AI knowledge base right now to provide alternative recommendations. You might try different search terms or browse our trending products.`;
          }
        } catch (error) {
          logger.error('OpenAI generation error in search:', error);
          aiResponse = `I couldn't find any products matching "${query}". Try a different search term or check out our trending products below.`;
        }
      } else if (searchResult.products.length === 0) {
        aiResponse = "I couldn't find any products. Try uploading some products first or check your search criteria.";
      } else {
        // Regular database search results
        if (hasDbResults) {
          aiResponse = `I discovered ${searchResult.products.length} products matching "${query}". I've found some products, but community sentiment is mixed. Check the detailed reviews for each item. The average rating is exceptionally high across these products.`;
        } else {
          aiResponse = `I discovered ${searchResult.products.length} amazing products matching "${query}". Here are the ones creating the most buzz and positive sentiment.`;
        }
      }
      
      // Generate suggestions based on results
      const suggestions = searchResult.products.length > 0 ? [
        { text: 'Under $50', icon: '💰', query: `${query} under $50` },
        { text: 'Trending now', icon: '📈', query: `trending ${query}` }
      ] : [
        { text: 'Browse all products', icon: '🛍️', query: '' },
        { text: 'Popular items', icon: '⭐', query: 'popular' }
      ];

      const response = {
        success: true,
        data: {
          query,
          aiResponse,
          products: searchResult.products,
          total: searchResult.total,
          hasMore: searchResult.hasMore,
          suggestions,
          searchId: searchResult.searchId,
          responseTime: res.responseTime,
          hasDbResults,
          isAiRecommendation
        }
      };

      logger.info('Product search completed', {
        requestId: req.id,
        productsFound: searchResult.products.length,
        responseTime: res.responseTime
      });

      res.json(response);

    } catch (error) {
      logger.error('Product search failed', {
        requestId: req.id,
        error: error.message,
        stack: error.stack
      });

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          requestId: req.id
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error during search',
        requestId: req.id
      });
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(req, res) {
    try {
      const { q: partialQuery } = req.query;
      
      // Mock suggestions - replace with actual service
      const allSuggestions = [
        'wireless earbuds under $100',
        'vitamin C serums for dark spots',
        'beard oils for coarse hair',
        'resistance bands for home workouts',
        'smart kitchen scales'
      ];
      
      const suggestions = allSuggestions.filter(s => 
        s.toLowerCase().includes(partialQuery.toLowerCase())
      );
      
      res.json({
        success: true,
        data: {
          query: partialQuery,
          suggestions
        }
      });

    } catch (error) {
      logger.error('Failed to get search suggestions', {
        requestId: req.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get search suggestions',
        requestId: req.id
      });
    }
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(req, res) {
    try {
      // Mock trending searches - replace with actual service
      const trendingSearches = [
        'wireless earbuds under $100',
        'vitamin C serums for dark spots',
        'smart home devices',
        'resistance bands for home workouts',
        'beard growth oils'
      ];
      
      res.json({
        success: true,
        data: {
          trending: trendingSearches
        }
      });

    } catch (error) {
      logger.error('Failed to get trending searches', {
        requestId: req.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get trending searches',
        requestId: req.id
      });
    }
  }

  /**
   * Get user search history
   */
  async getSearchHistory(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.json({
          success: true,
          data: {
            history: []
          }
        });
      }

      // Mock search history - replace with actual service
      const history = [
        {
          id: '1',
          query: 'wireless earbuds under $100',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          resultsCount: 15
        },
        {
          id: '2',
          query: 'vitamin C serums for dark spots',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          resultsCount: 23
        }
      ];
      
      res.json({
        success: true,
        data: {
          history
        }
      });

    } catch (error) {
      logger.error('Failed to get search history', {
        requestId: req.id,
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get search history',
        requestId: req.id
      });
    }
  }

  /**
   * Get search results by search ID
   */
  async getSearchById(req, res) {
    try {
      const { searchId } = req.params;
      const userId = req.user?.id;

      // Mock search result - replace with actual service
      // For now, always return a mock result
      const searchResult = {
        id: searchId,
        query: 'mock search query',
        products: [],
        total: 0,
        hasMore: false,
        timestamp: new Date()
      };

      res.json({
        success: true,
        data: searchResult
      });

    } catch (error) {
      logger.error('Failed to get search by ID', {
        requestId: req.id,
        searchId: req.params.searchId,
        error: error.message
      });

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message,
          requestId: req.id
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get search results',
        requestId: req.id
      });
    }
  }
}

module.exports = new SearchController();