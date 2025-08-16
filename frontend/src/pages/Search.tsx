import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setActiveFilters(newFilters);
    // If there's a current search, re-run it with new filters
    if (currentSearch) {
      performSearch(currentSearch.query, newFilters, false);
    }
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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-24">
          <ChatInterface
            messages={chatMessages}
            onSendMessage={handleChatMessage}
            onProductClick={onProductClick}
            loading={isLoading}
            onFiltersChange={handleFiltersChange}
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
        
        {/* Sticky Search Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 px-4 py-2 shadow-lg z-50">
          <div className="max-w-4xl mx-auto">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleNewSearch}
              placeholder="Search products..."
              loading={isLoading}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};