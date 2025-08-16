/**
 * Search Context Service
 * Manages search context and conversation history for AI-powered contextual search
 */

const { logger } = require('../utils/logger');

class SearchContextService {
  constructor() {
    // In-memory storage for search contexts (in production, use Redis or database)
    this.searchContexts = new Map();
    this.maxContextAge = 30 * 60 * 1000; // 30 minutes
    this.maxHistoryLength = 10; // Keep last 10 interactions per session
    
    // Clean up old contexts every 10 minutes
    setInterval(() => {
      this.cleanupOldContexts();
    }, 10 * 60 * 1000);
  }

  /**
   * Generate or retrieve session ID from request
   */
  getSessionId(req) {
    // Try to get session ID from headers, query params, or generate one
    return req.headers['x-search-session-id'] || 
           req.query.sessionId || 
           req.body.sessionId ||
           `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get search context for a session
   */
  getSearchContext(sessionId) {
    const context = this.searchContexts.get(sessionId);
    
    if (!context) {
      return this.createNewContext(sessionId);
    }

    // Update last accessed time
    context.lastAccessed = Date.now();
    return context;
  }

  /**
   * Create a new search context for a session
   */
  createNewContext(sessionId) {
    const context = {
      sessionId,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      searchHistory: [],
      userPreferences: {
        categories: [],
        priceRanges: [],
        brands: [],
        features: []
      },
      conversationFlow: {
        currentTopic: null,
        followUpContext: null,
        lastQuery: null,
        searchIntent: null
      }
    };

    this.searchContexts.set(sessionId, context);
    logger.debug(`Created new search context for session: ${sessionId}`);
    return context;
  }

  /**
   * Add search interaction to context
   */
  addSearchInteraction(sessionId, interaction) {
    const context = this.getSearchContext(sessionId);
    
    const searchEntry = {
      timestamp: Date.now(),
      query: interaction.query,
      results: interaction.results || [],
      hasDbResults: interaction.hasDbResults || false,
      isAiRecommendation: interaction.isAiRecommendation || false,
      userAction: interaction.userAction || null, // clicked, viewed, etc.
      filters: interaction.filters || {}
    };

    context.searchHistory.unshift(searchEntry);

    // Keep only the most recent interactions
    if (context.searchHistory.length > this.maxHistoryLength) {
      context.searchHistory = context.searchHistory.slice(0, this.maxHistoryLength);
    }

    // Update conversation flow
    this.updateConversationFlow(context, interaction);

    // Update user preferences based on search patterns
    this.updateUserPreferences(context, interaction);

    context.lastAccessed = Date.now();
    logger.debug(`Added search interaction for session ${sessionId}: "${interaction.query}"`);
  }

  /**
   * Update conversation flow context
   */
  updateConversationFlow(context, interaction) {
    const flow = context.conversationFlow;
    
    // Detect search intent
    const query = interaction.query.toLowerCase();
    if (query.includes('better') || query.includes('alternative') || query.includes('similar')) {
      flow.searchIntent = 'alternative';
    } else if (query.includes('cheaper') || query.includes('budget') || query.includes('under')) {
      flow.searchIntent = 'budget';
    } else if (query.includes('premium') || query.includes('best') || query.includes('top')) {
      flow.searchIntent = 'premium';
    } else if (query.includes('compare') || query.includes('vs') || query.includes('difference')) {
      flow.searchIntent = 'comparison';
    } else {
      flow.searchIntent = 'discovery';
    }

    // Update current topic based on results
    if (interaction.results && interaction.results.length > 0) {
      const categories = interaction.results.map(p => p.category).filter(Boolean);
      if (categories.length > 0) {
        flow.currentTopic = categories[0]; // Most common category
      }
    }

    flow.lastQuery = interaction.query;
    flow.followUpContext = {
      previousResults: interaction.results?.slice(0, 3) || [], // Keep top 3 for context
      searchIntent: flow.searchIntent,
      timestamp: Date.now()
    };
  }

  /**
   * Update user preferences based on search patterns
   */
  updateUserPreferences(context, interaction) {
    const preferences = context.userPreferences;
    
    // Track searched categories
    if (interaction.results) {
      interaction.results.forEach(product => {
        if (product.category && !preferences.categories.includes(product.category)) {
          preferences.categories.push(product.category);
        }
        if (product.brand && !preferences.brands.includes(product.brand)) {
          preferences.brands.push(product.brand);
        }
      });
    }

    // Extract price preferences from queries
    const query = interaction.query.toLowerCase();
    const priceMatches = query.match(/under\s*\$?(\d+)/i) || query.match(/\$(\d+)/g);
    if (priceMatches) {
      const prices = priceMatches.map(match => parseInt(match.replace(/\$|under/gi, '')));
      prices.forEach(price => {
        if (!preferences.priceRanges.includes(price)) {
          preferences.priceRanges.push(price);
        }
      });
    }

    // Keep preferences lists manageable
    preferences.categories = preferences.categories.slice(-5);
    preferences.brands = preferences.brands.slice(-8);
    preferences.priceRanges = preferences.priceRanges.slice(-5);
  }

  /**
   * Get contextual information for AI search enhancement
   */
  getContextForAISearch(sessionId) {
    const context = this.getSearchContext(sessionId);
    
    return {
      recentSearches: context.searchHistory.slice(0, 5).map(entry => ({
        query: entry.query,
        timestamp: entry.timestamp,
        hasResults: entry.hasDbResults || entry.results.length > 0,
        categories: entry.results.map(r => r.category).filter(Boolean)
      })),
      userPreferences: context.userPreferences,
      conversationFlow: context.conversationFlow,
      sessionInfo: {
        sessionAge: Date.now() - context.createdAt,
        totalSearches: context.searchHistory.length,
        lastSearchTime: context.searchHistory.length > 0 ? context.searchHistory[0].timestamp : null
      }
    };
  }

  /**
   * Generate context summary for AI prompts
   */
  generateContextSummary(sessionId) {
    const context = this.getContextForAISearch(sessionId);
    
    let summary = '';
    
    // Add recent search context
    if (context.recentSearches.length > 0) {
      const recentQueries = context.recentSearches.map(s => `"${s.query}"`).join(', ');
      summary += `Recent searches in this session: ${recentQueries}. `;
    }

    // Add user preferences
    if (context.userPreferences.categories.length > 0) {
      summary += `User has shown interest in: ${context.userPreferences.categories.join(', ')}. `;
    }

    if (context.userPreferences.brands.length > 0) {
      summary += `Previously searched brands: ${context.userPreferences.brands.join(', ')}. `;
    }

    if (context.userPreferences.priceRanges.length > 0) {
      const avgPrice = context.userPreferences.priceRanges.reduce((a, b) => a + b, 0) / context.userPreferences.priceRanges.length;
      summary += `User's typical price range appears to be around $${Math.round(avgPrice)}. `;
    }

    // Add conversation flow context
    if (context.conversationFlow.currentTopic) {
      summary += `Current topic focus: ${context.conversationFlow.currentTopic}. `;
    }

    if (context.conversationFlow.searchIntent) {
      summary += `Search intent: ${context.conversationFlow.searchIntent}. `;
    }

    return summary.trim();
  }

  /**
   * Check if current query is a follow-up to previous searches
   */
  isFollowUpQuery(sessionId, currentQuery) {
    const context = this.getSearchContext(sessionId);
    
    if (context.searchHistory.length === 0) {
      return false;
    }

    const lastSearch = context.searchHistory[0];
    const timeSinceLastSearch = Date.now() - lastSearch.timestamp;
    
    // Consider it a follow-up if:
    // 1. Less than 5 minutes since last search
    // 2. Query contains follow-up indicators
    const followUpIndicators = [
      'better', 'alternative', 'similar', 'compare', 'vs', 'difference',
      'cheaper', 'more expensive', 'higher quality', 'premium',
      'what about', 'how about', 'instead', 'rather than'
    ];
    
    const hasFollowUpIndicator = followUpIndicators.some(indicator => 
      currentQuery.toLowerCase().includes(indicator)
    );

    return timeSinceLastSearch < 5 * 60 * 1000 && (
      hasFollowUpIndicator || 
      context.conversationFlow.searchIntent === 'comparison'
    );
  }

  /**
   * Clean up old search contexts
   */
  cleanupOldContexts() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, context] of this.searchContexts.entries()) {
      if (now - context.lastAccessed > this.maxContextAge) {
        this.searchContexts.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} old search contexts`);
    }
  }

  /**
   * Get active sessions count (for monitoring)
   */
  getActiveSessionsCount() {
    return this.searchContexts.size;
  }

  /**
   * Clear context for a specific session
   */
  clearSearchContext(sessionId) {
    const deleted = this.searchContexts.delete(sessionId);
    if (deleted) {
      logger.debug(`Cleared search context for session: ${sessionId}`);
    }
    return deleted;
  }
}

module.exports = new SearchContextService();