/**
 * Chat Controller
 * Handles intelligent chat interactions with conversation context preservation
 */

const Product = require('../models/Product');
const openaiService = require('../services/openaiService');
const searchService = require('../services/searchService');
const { logger } = require('../utils/logger');

// In-memory conversation storage (should be replaced with database in production)
const conversationContexts = new Map();

class ChatController {
  /**
   * Process chat message with conversation context and AI recommendations
   */
  processMessage = async (req, res) => {
    try {
      const { message, conversationId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a string'
        });
      }

      logger.info('Processing chat message:', { message, conversationId });

      // Get or create conversation context
      const contextId = conversationId || this.generateConversationId();
      let conversationContext = conversationContexts.get(contextId) || {
        previousProducts: [],
        previousQuery: '',
        chatHistory: []
      };

      // Debug: Log conversation context retrieval
      console.log('🔍 Conversation context debug:', {
        requestedId: conversationId,
        actualId: contextId,
        contextExists: conversationContexts.has(contextId),
        previousProductsCount: conversationContext.previousProducts.length,
        mapSize: conversationContexts.size,
        allKeys: Array.from(conversationContexts.keys())
      });

      // Add current message to chat history
      conversationContext.chatHistory.push({
        type: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Enhanced conversational query detection
      const lowerMessage = message.toLowerCase();
      const isConversationalQuery = conversationContext.previousProducts.length > 0 && (
        // Direct references to products
        lowerMessage.includes('tell me more') ||
        lowerMessage.includes('more about') ||
        lowerMessage.includes('first product') ||
        lowerMessage.includes('second product') ||
        lowerMessage.includes('third product') ||
        lowerMessage.includes('this product') ||
        lowerMessage.includes('these products') ||
        lowerMessage.includes('the product') ||
        lowerMessage.includes('it') ||
        lowerMessage.includes('them') ||
        
        // Analysis questions
        lowerMessage.includes('pros') ||
        lowerMessage.includes('cons') ||
        lowerMessage.includes('advantages') ||
        lowerMessage.includes('disadvantages') ||
        lowerMessage.includes('benefits') ||
        lowerMessage.includes('drawbacks') ||
        lowerMessage.includes('good') ||
        lowerMessage.includes('bad') ||
        lowerMessage.includes('positive') ||
        lowerMessage.includes('negative') ||
        
        // Comparison and alternatives
        lowerMessage.includes('compare') ||
        lowerMessage.includes('comparison') ||
        lowerMessage.includes('versus') ||
        lowerMessage.includes('vs') ||
        lowerMessage.includes('alternative') ||
        lowerMessage.includes('alternatives') ||
        lowerMessage.includes('cheaper') ||
        lowerMessage.includes('expensive') ||
        lowerMessage.includes('similar') ||
        lowerMessage.includes('better') ||
        lowerMessage.includes('worse') ||
        
        // Detail questions
        lowerMessage.includes('details') ||
        lowerMessage.includes('features') ||
        lowerMessage.includes('specs') ||
        lowerMessage.includes('specifications') ||
        lowerMessage.includes('price') ||
        lowerMessage.includes('cost') ||
        lowerMessage.includes('worth') ||
        lowerMessage.includes('recommend') ||
        lowerMessage.includes('opinion') ||
        
        // Follow-up patterns
        lowerMessage.includes('what about') ||
        lowerMessage.includes('how about') ||
        lowerMessage.includes('any') ||
        lowerMessage.includes('which one') ||
        lowerMessage.includes('which is') ||
        
        // Question words that typically reference previous context
        (lowerMessage.startsWith('what ') && lowerMessage.length < 30) ||
        (lowerMessage.startsWith('which ') && lowerMessage.length < 30) ||
        (lowerMessage.startsWith('how ') && lowerMessage.length < 30) ||
        (lowerMessage.startsWith('why ') && lowerMessage.length < 30) ||
        (lowerMessage.startsWith('when ') && lowerMessage.length < 30) ||
        (lowerMessage.startsWith('where ') && lowerMessage.length < 30) ||
        (lowerMessage.startsWith('are there') && lowerMessage.length < 40) ||
        (lowerMessage.startsWith('is there') && lowerMessage.length < 40) ||
        (lowerMessage.startsWith('do you') && lowerMessage.length < 40) ||
        (lowerMessage.startsWith('can you') && lowerMessage.length < 40) ||
        
        // Single word or short phrases that clearly reference previous context
        (lowerMessage === 'pros and cons') ||
        (lowerMessage === 'pros and cons please') ||
        (lowerMessage === 'features') ||
        (lowerMessage === 'price') ||
        (lowerMessage === 'pricing') ||
        (lowerMessage === 'compare') ||
        (lowerMessage === 'comparison') ||
        (lowerMessage === 'details')
      );

      logger.info('Chat conversational detection:', {
        message,
        lowerMessage,
        isConversationalQuery,
        previousProductsCount: conversationContext.previousProducts.length,
        previousQuery: conversationContext.previousQuery,
        conversationId: contextId,
        hasContext: conversationContexts.has(contextId),
        totalContexts: conversationContexts.size
      });

      // If it's a conversational query, use OpenAI directly for better context awareness
      if (isConversationalQuery) {
        logger.info('Processing conversational query directly with OpenAI');
        
        // Determine if this is an "alternatives" query that should return new products
        const isAlternativesQuery = lowerMessage.includes('alternative') || 
                                   lowerMessage.includes('alternatives') || 
                                   lowerMessage.includes('cheaper') || 
                                   lowerMessage.includes('similar') ||
                                   (lowerMessage.includes('are there') && (lowerMessage.includes('other') || lowerMessage.includes('any')));
        
        let aiResponse;
        let responseProducts = [];
        let shouldReturnProducts = false;
        
        try {
          if (openaiService.isAvailable()) {
            if (isAlternativesQuery) {
              // For alternatives queries, search for actual alternatives and let AI explain them
              logger.info('Processing alternatives query - searching for similar products');
              
              // Extract key characteristics from previous products for alternative search
              const previousProduct = conversationContext.previousProducts[0];
              const searchQuery = `${previousProduct.category} under $${previousProduct.price.max + 20}`;
              
              const searchResult = await searchService.performSearch({
                query: searchQuery,
                filters: { categories: [previousProduct.category] },
                page: 1,
                limit: 5,
                sortBy: 'rating',
                sortOrder: 'desc'
              });
              
              // Filter out products that are the same as previous ones
              const alternativeProducts = searchResult.products.filter(p => 
                !conversationContext.previousProducts.some(prev => prev.id === p.id)
              );
              
              if (alternativeProducts.length > 0) {
                aiResponse = await openaiService.generateConversationalResponse(message, {
                  previousProducts: conversationContext.previousProducts,
                  previousQuery: conversationContext.previousQuery,
                  chatHistory: conversationContext.chatHistory,
                  currentTopic: conversationContext.previousQuery,
                  alternativeProducts: alternativeProducts
                });
                responseProducts = alternativeProducts;
                shouldReturnProducts = true;
              } else {
                aiResponse = `I couldn't find specific alternatives in our database, but based on the ${previousProduct.name} you were looking at, I'd recommend looking for similar products in the ${previousProduct.category} category with similar features but potentially different price points.`;
                responseProducts = [];
                shouldReturnProducts = false;
              }
            } else {
              // For analysis queries (pros/cons, features, etc.), return structured analysis
              logger.info('Processing analysis query - returning structured analysis');
              
              // Check if this is a pros/cons query that should return structured data
              const isProsConsAnalysis = lowerMessage.includes('pros') && lowerMessage.includes('cons');
              
              if (isProsConsAnalysis) {
                try {
                  // Generate pros/cons analysis as pure text (no product cards)
                  if (conversationContext.previousProducts.length > 0) {
                    const product = conversationContext.previousProducts[0];
                    aiResponse = `**${product.name} by ${product.brand}**

**Pros:**
• High user rating (${product.rating}/100) indicating excellent performance
• Competitive pricing at ${product.price?.display} offers good value for money
• Well-regarded by users with positive sentiment (${Math.round((product.sentiment?.score || 0.7) * 100)}% positive)
• Advanced features like ${product.features?.slice(0, 2).join(' and ') || 'premium functionality'}

**Cons:**
• Price point may be higher than some budget alternatives
• Specific features might not suit all user preferences
• Availability might be limited in some regions
• Learning curve may exist for new users

This analysis is based on the product's ${product.rating}/100 rating and ${product.reviews?.display || 'user feedback'}.`;
                  } else {
                    aiResponse = 'I need to see some products first before I can provide a pros and cons analysis. Please search for products first.';
                  }
                  
                  // NO PRODUCTS - just text response with pros/cons analysis
                  responseProducts = [];
                  shouldReturnProducts = false;
                } catch (error) {
                  logger.error('Error in pros/cons analysis:', error);
                  aiResponse = 'I encountered an error generating the pros and cons analysis. Please try again.';
                  responseProducts = [];
                  shouldReturnProducts = false;
                }
              } else {
                // Regular conversational analysis
                aiResponse = await openaiService.generateConversationalResponse(message, {
                  previousProducts: conversationContext.previousProducts,
                  previousQuery: conversationContext.previousQuery,
                  chatHistory: conversationContext.chatHistory,
                  currentTopic: conversationContext.previousQuery
                });
                responseProducts = [];
                shouldReturnProducts = false;
              }
            }
          } else {
            if (isAlternativesQuery) {
              aiResponse = `I'd be happy to help you find alternatives to the products from your previous search, but I don't have access to my AI search capabilities right now.`;
            } else {
              aiResponse = `I'd be happy to analyze the products from your previous search, but I don't have access to my AI analysis capabilities right now.`;
            }
            responseProducts = [];
            shouldReturnProducts = false;
          }
        } catch (error) {
          logger.error('OpenAI conversational analysis error:', error);
          aiResponse = `I encountered an error while processing your request. Please try again.`;
          responseProducts = [];
          shouldReturnProducts = false;
        }

        // Update conversation context
        conversationContext.chatHistory.push({
          type: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString(),
          products: responseProducts,
          hasDbResults: shouldReturnProducts && responseProducts.length > 0,
          isAiRecommendation: shouldReturnProducts
        });

        // Update previous products if we found alternatives
        if (shouldReturnProducts && responseProducts.length > 0) {
          conversationContext.previousProducts = responseProducts;
        }

        // Store updated context
        conversationContexts.set(contextId, conversationContext);

        // Return conversational response
        const response = {
          success: true,
          data: {
            message: aiResponse,
            products: responseProducts,
            hasDbResults: false, // Analysis responses should not show database result headers
            isAiRecommendation: false, // Analysis responses are not AI recommendations
            conversationId: contextId,
            timestamp: new Date().toISOString(),
            searchPerformed: false, // This is analysis, not search
            responseTime: 0,
            analysisType: isProsConsAnalysis ? 'pros-cons' : 'general' // Add analysis type flag
          }
        };

        logger.info('Conversational response generated:', { 
          conversationId: contextId,
          isAlternativesQuery,
          shouldReturnProducts,
          productsCount: responseProducts.length
        });

        return res.json(response);
      }

      // Use the search service to get contextual results for new searches
      const searchResult = await searchService.performSearch({
        query: message,
        filters: {},
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
        searchContext: null,
        conversationContext
      });

      let finalProducts = [];
      let aiResponse = '';
      let hasDbResults = false;
      let isAiRecommendation = false;

      // Process search results similar to searchController
      if (searchResult.products && searchResult.products.length > 0) {
        // Use database products
        finalProducts = searchResult.products;
        aiResponse = await searchService.generateAIResponse(message, searchResult);
        hasDbResults = true;
        isAiRecommendation = false;
      } else if (searchResult.aiProducts && searchResult.aiProducts.length > 0) {
        // Use AI-generated products
        finalProducts = searchResult.aiProducts;
        aiResponse = searchResult.aiMessage || `I didn't find matching products in our database, but I can recommend some excellent options:`;
        hasDbResults = false;
        isAiRecommendation = true;
      } else {
        // No products found anywhere
        finalProducts = [];
        aiResponse = await searchService.generateAIResponse(message, {
          products: [],
          total: 0,
          searchTime: searchResult.searchTime || 0
        });
        hasDbResults = false;
        isAiRecommendation = true;
      }

      // Update conversation context with new results
      if (finalProducts && finalProducts.length > 0) {
        conversationContext.previousProducts = finalProducts;
        conversationContext.previousQuery = message;
      }
      
      conversationContext.chatHistory.push({
        type: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        products: finalProducts,
        hasDbResults,
        isAiRecommendation
      });

      // Keep only last 10 messages to prevent memory issues
      if (conversationContext.chatHistory.length > 10) {
        conversationContext.chatHistory = conversationContext.chatHistory.slice(-10);
      }

      // Store updated context
      conversationContexts.set(contextId, conversationContext);
      
      // Debug: Log context storage
      console.log('💾 Context stored for new search:', {
        contextId,
        previousProductsCount: conversationContext.previousProducts.length,
        previousQuery: conversationContext.previousQuery,
        mapSize: conversationContexts.size
      });

      // Prepare response
      const response = {
        success: true,
        data: {
          message: aiResponse,
          products: finalProducts,
          hasDbResults,
          isAiRecommendation,
          conversationId: contextId,
          timestamp: new Date().toISOString(),
          searchPerformed: true,
          responseTime: searchResult.searchTime || 0
        }
      };

      logger.info('Chat response generated:', { 
        hasDbResults, 
        productsCount: finalProducts.length,
        isAiRecommendation,
        conversationId: contextId
      });

      res.json(response);

    } catch (error) {
      logger.error('Chat processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process chat message',
        data: {
          message: 'I apologize, but I encountered an error processing your request. Please try again.',
          products: [],
          hasDbResults: false,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Search database products based on user message
   */
  searchDatabaseProducts = async (message) => {
    try {
      const searchTerms = this.extractSearchTerms(message);
      logger.info('Extracted search terms:', searchTerms);

      if (searchTerms.length === 0) {
        return [];
      }

      // Build search query without text index for now
      const searchQuery = {
        $or: [
          // Partial matches in name, brand, category
          {
            name: { 
              $regex: searchTerms.join('|'), 
              $options: 'i' 
            }
          },
          {
            brand: { 
              $regex: searchTerms.join('|'), 
              $options: 'i' 
            }
          },
          {
            category: { 
              $regex: searchTerms.join('|'), 
              $options: 'i' 
            }
          },
          // Tag matches
          {
            tags: { 
              $in: searchTerms.map(term => new RegExp(term, 'i'))
            }
          },
          // Feature matches
          {
            features: { 
              $in: searchTerms.map(term => new RegExp(term, 'i'))
            }
          }
        ],
        status: 'active'
      };

      logger.info('Search query:', JSON.stringify(searchQuery, null, 2));

      const products = await Product.find(searchQuery)
        .select('name brand category price rating reviewCount tags features images description')
        .sort({ rating: -1, reviewCount: -1 })
        .limit(10)
        .lean();

      // Transform products for response
      return products.map(product => ({
        id: product._id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        price: {
          min: product.priceRange?.min || 0,
          max: product.priceRange?.max || 0,
          display: product.price || `$${product.priceRange?.min || 0}–$${product.priceRange?.max || 0}`
        },
        rating: product.rating,
        reviewCount: product.reviewCount,
        tags: product.tags || [],
        features: product.features || [],
        images: product.images?.map(img => img.url) || [],
        description: product.description
      }));

    } catch (error) {
      logger.error('Database search error:', error);
      return [];
    }
  }

  /**
   * Extract meaningful search terms from user message
   */
  extractSearchTerms = (message) => {
    // Common stop words to filter out
    const stopWords = new Set([
      'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 
      'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 
      'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 
      'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 
      'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 
      'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 
      'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 
      'at', 'by', 'for', 'with', 'through', 'during', 'before', 'after', 'above', 
      'below', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 
      'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 
      'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 
      'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 
      'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'want', 
      'need', 'looking', 'find', 'show', 'get', 'best', 'good', 'great'
    ]);

    // Extract words and filter
    const words = message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !stopWords.has(word) &&
        !/^\d+$/.test(word) // Remove pure numbers
      );

    // Remove duplicates and return
    return [...new Set(words)];
  }

  /**
   * Generate a unique conversation ID
   */
  generateConversationId = () => {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get conversation history with context
   */
  getConversationHistory = async (req, res) => {
    try {
      const { conversationId } = req.params;
      
      // Get conversation context from memory
      const conversationContext = conversationContexts.get(conversationId) || {
        previousProducts: [],
        previousQuery: '',
        chatHistory: []
      };
      
      res.json({
        success: true,
        data: {
          conversationId,
          messages: conversationContext.chatHistory,
          previousProducts: conversationContext.previousProducts,
          previousQuery: conversationContext.previousQuery,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get conversation history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve conversation history'
      });
    }
  }

  /**
   * Get conversation context for a given conversation ID
   */
  getConversationContext = (conversationId) => {
    return conversationContexts.get(conversationId) || {
      previousProducts: [],
      previousQuery: '',
      chatHistory: []
    };
  }

  /**
   * Clear conversation context (useful for starting fresh)
   */
  clearConversation = async (req, res) => {
    try {
      const { conversationId } = req.params;
      
      conversationContexts.delete(conversationId);
      
      res.json({
        success: true,
        data: {
          message: 'Conversation cleared successfully',
          conversationId
        }
      });
    } catch (error) {
      logger.error('Clear conversation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear conversation'
      });
    }
  }

  /**
   * Get chat suggestions based on available products
   */
  getChatSuggestions = async (req, res) => {
    try {
      // Get popular categories and brands for suggestions
      const suggestions = [
        "Show me skincare products",
        "What are the best tech accessories?",
        "Find fitness and wellness products", 
        "Show me men's grooming items",
        "What electronics do you have?",
        "Find products under $50",
        "Show me highly rated products",
        "What's trending in home and kitchen?"
      ];

      res.json({
        success: true,
        data: {
          suggestions,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get chat suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get chat suggestions'
      });
    }
  }
}

module.exports = new ChatController();