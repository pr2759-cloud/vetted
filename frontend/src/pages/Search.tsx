import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Filter, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

import { SearchInput } from '../components/search/SearchInput';
import { ChatInterface } from '../components/chat/ChatInterface';
import { useSearch } from '../hooks/useSearch';
import { SearchResult, SearchFilters, ChatMessage, Product } from '../types';


export const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [currentSearch, setCurrentSearch] = useState<SearchResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({
    categories: [],
    priceRanges: [],
    ratings: [],
    sentiments: [],
    trending: [],
    features: []
  });

  const { 
    searchProducts, 
    isLoading, 
    error 
  } = useSearch();

  const performSearch = useCallback(async (query: string, filters?: SearchFilters, isConversational = false) => {
    if (!query.trim()) return;

    const filtersToUse = filters || activeFilters;
    
    // Build conversation context for follow-up questions
    const conversationContext = isConversational ? {
      previousProducts: currentSearch?.products || [],
      previousQuery: currentSearch?.query || '',
      chatHistory: chatMessages.slice(-6) // Last 6 messages for context
    } : {};

    try {
      // Perform search with conversation context
      const result = await searchProducts({
        query: query.trim(),
        filters: filtersToUse,
        limit: 20,
        offset: 0,
        conversationContext
      });

      setCurrentSearch(result);
      setShowChat(true);
      
      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: query.trim(),
        timestamp: new Date(),
        conversationId: result.searchId
      };
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: result.aiResponse || `Found ${result.products?.length || 0} products`,
        timestamp: new Date(),
        searchResult: result,
        products: result.products,
        hasDbResults: result.hasDbResults,
        isAiRecommendation: result.isAiRecommendation,
        conversationId: result.searchId,
        analysisType: (result as any).analysisType
      };
      
      setChatMessages(prev => [...prev, userMessage, assistantMessage]);
      
      // Debug logging
      console.log('Search result received:', {
        query: result.query,
        productsCount: result.products?.length || 0,
        hasDbResults: result.hasDbResults,
        isAiRecommendation: result.isAiRecommendation,
        aiResponse: result.aiResponse
      });

    } catch (err) {
      console.error('Search failed:', err);
      
      toast.error('Search failed. Please try again.');
    }
  }, [searchProducts, activeFilters, chatMessages, currentSearch]);

  // Initialize search from URL params
  useEffect(() => {
    const query = searchParams.get('q');
    if (query && query !== searchQuery) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [searchParams]); // Remove performSearch from dependencies to prevent infinite loop

  const handleNewSearch = (query: string) => {
    setSearchQuery(query);
    // Update URL
    setSearchParams({ q: query });
    performSearch(query, undefined, false); // New search, not conversational
  };

  const handleChatMessage = async (message: string) => {
    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: message,
        timestamp: new Date(),
        conversational: true
      };
      
      setChatMessages(prev => [...prev, userMessage]);
      
      // Build conversation context for follow-up questions
      const conversationContext = {
        previousProducts: currentSearch?.products || [],
        previousQuery: currentSearch?.query || '',
        chatHistory: [...chatMessages, userMessage].slice(-6) // Include current message
      };
      
      // Perform contextual search for the chat message
      const result = await searchProducts({
        query: message.trim(),
        filters: activeFilters,
        limit: 20,
        offset: 0,
        conversationContext
      });
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: result.aiResponse || `Found ${result.products?.length || 0} products`,
        timestamp: new Date(),
        searchResult: result,
        products: result.products,
        hasDbResults: result.hasDbResults,
        isAiRecommendation: result.isAiRecommendation,
        conversational: true,
        analysisType: (result as any).analysisType
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
      
    } catch (err) {
      console.error('Chat message failed:', err);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to process message. Please try again.');
    }
  };

  const onProductClick = (product: Product) => {
    // Handle product click - could open modal, navigate to product page, etc.
    console.log('Product clicked:', product);
  };

  const handleChatSubmit = () => {
    if (chatInput.trim() && !isLoading) {
      handleChatMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  const handleFeatureAction = (action: string) => {
    handleChatMessage(action);
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setActiveFilters(newFilters);
    // If there's a current search, re-run it with new filters
    if (currentSearch) {
      performSearch(currentSearch.query, newFilters, false);
    }
  };

  const toggleFilter = (category: keyof SearchFilters, value: string) => {
    const newFilters = { ...activeFilters };
    const currentList = newFilters[category] || [];
    
    if (currentList.includes(value)) {
      newFilters[category] = currentList.filter(item => item !== value);
    } else {
      newFilters[category] = [...currentList, value];
    }
    
    handleFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters: SearchFilters = {
      categories: [],
      priceRanges: [],
      ratings: [],
      sentiments: [],
      trending: [],
      features: []
    };
    handleFiltersChange(emptyFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).reduce((total, filters) => total + (filters?.length || 0), 0);
  };

  // Show initial interface if no search has been performed
  if (!showChat) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              What would you like to discover?
            </h1>
            <p className="text-gray-600 mb-8">
              Search for any product and I'll help you find the best options with detailed sentiment analysis.
            </p>
          </motion.div>
          
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleNewSearch}
            placeholder="Search for products, e.g. 'wireless earbuds under $100'"
            loading={isLoading}
            autoFocus
          />
        </div>
      </div>
    );
  }

  const filterCategories = {
    categories: {
      title: 'Skincare Categories',
      options: [
        'Face Cleansers',
        'Serums & Treatments',
        'Moisturizers',
        'Sun Protection',
        'Masks & Exfoliants',
        'Eye Care'
      ]
    },
    priceRanges: {
      title: 'Price Range',
      options: [
        'Under $25',
        '$25 - $50', 
        '$50 - $100',
        '$100 - $200',
        '$200+'
      ]
    },
    sentiments: {
      title: 'Community Sentiment',
      options: [
        'Highly Regarded',
        'Well Regarded', 
        'Mixed Reviews',
        'Rising Stars'
      ]
    },
    features: {
      title: 'Skincare Features',
      options: [
        'Organic/Natural',
        'Cruelty-Free',
        'Vegan',
        'Fragrance-Free',
        'Hypoallergenic',
        'Non-Comedogenic'
      ]
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col relative">
      {/* Floating Filter Button */}
      {showChat && (
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="fixed top-20 right-6 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 z-40 transform hover:scale-105"
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-700" />
            {getActiveFilterCount() > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {getActiveFilterCount()}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Floating Filters Panel */}
      {showFilters && showChat && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed top-20 right-6 w-80 bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-xl z-30 max-h-[calc(100vh-10rem)] overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              {Object.entries(filterCategories).map(([categoryKey, categoryData]) => (
                <div key={categoryKey}>
                  <h4 className="font-medium text-gray-900 text-sm mb-3">
                    {categoryData.title}
                  </h4>
                  <div className="space-y-2">
                    {categoryData.options.map((option) => (
                      <label
                        key={option}
                        className="flex items-center space-x-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={activeFilters[categoryKey as keyof SearchFilters]?.includes(option) || false}
                          onChange={() => toggleFilter(categoryKey as keyof SearchFilters, option)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-2"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {getActiveFilterCount() > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="w-full mt-4 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-28">
          <ChatInterface
            messages={chatMessages}
            onProductClick={onProductClick}
            onFeatureAction={handleFeatureAction}
            loading={isLoading}
          />
          
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700 mt-4"
            >
              <p>{error}</p>
              <button 
                onClick={() => currentSearch && performSearch(currentSearch.query)}
                className="mt-2 text-red-600 hover:text-red-800 font-medium"
              >
                Try again
              </button>
            </motion.div>
          )}
        </div>

        {/* Sticky Conversational Chatbox */}
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-1/2 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-200/20 p-4"
          >
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleChatKeyPress}
                placeholder="Ask me about any product..."
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-500 shadow-inner"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleChatSubmit}
                disabled={!chatInput.trim() || isLoading}
                className={`
                  absolute right-3 top-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200
                  ${chatInput.trim() && !isLoading
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};