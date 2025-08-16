import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Star, Loader2, Send, Filter, X, ChevronDown } from 'lucide-react';
import { ChatMessage, Product, SearchFilters } from '../../types';
import { ProductCard } from '../product/ProductCard';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onProductClick?: (product: Product) => void;
  loading?: boolean;
  onFiltersChange?: (filters: SearchFilters) => void;
}

const FILTER_OPTIONS = {
  categories: ['Electronics', 'Home & Kitchen', 'Beauty', 'Fashion', 'Sports', 'Books'],
  priceRanges: ['Under $25', '$25-$50', '$50-$100', '$100-$200', 'Over $200'],
  ratings: ['4+ Stars', '3+ Stars', '2+ Stars'],
  sentiments: ['Highly Regarded', 'Well Regarded', 'Mixed Reviews']
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onProductClick,
  loading = false,
  onFiltersChange
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({
    categories: [],
    priceRanges: [],
    ratings: [],
    sentiments: []
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim() && !loading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleFilter = (category: keyof SearchFilters, value: string) => {
    setActiveFilters(prev => {
      const currentList = prev[category] || [];
      const isActive = currentList.includes(value);
      const newList = isActive 
        ? currentList.filter(item => item !== value)
        : [...currentList, value];
      
      const newFilters = { ...prev, [category]: newList };
      onFiltersChange?.(newFilters);
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    const emptyFilters: SearchFilters = {
      categories: [],
      priceRanges: [],
      ratings: [],
      sentiments: []
    };
    setActiveFilters(emptyFilters);
    onFiltersChange?.(emptyFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(activeFilters).flat().length;
  };

  const FilterChip = ({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
        isActive
          ? 'bg-blue-500 text-white border-blue-500 shadow-md'
          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Compact Filters Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-medium text-gray-900">Filters</h3>
            {getActiveFilterCount() > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-0.5">
                {getActiveFilterCount()}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <Filter className="w-4 h-4" />
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Categories</label>
                <div className="flex flex-wrap gap-1">
                  {FILTER_OPTIONS.categories.slice(0, 3).map(category => (
                    <FilterChip
                      key={category}
                      label={category}
                      isActive={activeFilters.categories?.includes(category) || false}
                      onClick={() => toggleFilter('categories', category)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Price Range</label>
                <div className="flex flex-wrap gap-1">
                  {FILTER_OPTIONS.priceRanges.slice(0, 3).map(range => (
                    <FilterChip
                      key={range}
                      label={range}
                      isActive={activeFilters.priceRanges?.includes(range) || false}
                      onClick={() => toggleFilter('priceRanges', range)}
                    />
                  ))}
                </div>
              </div>
            </div>
            {getActiveFilterCount() > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-500 hover:text-red-500 flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Clear filters</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`flex gap-4 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-medium
                ${message.type === 'user' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-br from-primary-500 to-primary-600'
                }
              `}>
                {message.type === 'user' ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </div>

              {/* Message Content */}
              <div className={`flex-1 max-w-3xl ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`
                  inline-block px-6 py-4 rounded-2xl shadow-sm
                  ${message.type === 'user'
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                  }
                `}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {typeof message.content === 'string' ? message.content : 'Unable to display message content'}
                  </p>
                </div>

                {/* Pros/cons analysis indicator */}
                {message.type === 'assistant' && message.analysisType === 'pros-cons' && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <Bot className="w-4 h-4" />
                      <span>Analysis Complete</span>
                    </div>
                  </div>
                )}

                {/* Products Grid (only for non-analysis messages) */}
                {message.type === 'assistant' && 
                 message.analysisType !== 'pros-cons' && 
                 message.products && 
                 message.products.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      {message.hasDbResults && (
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <Star className="w-4 h-4 fill-current" />
                          <span>Found {message.products.length} products in our database</span>
                        </div>
                      )}
                      {message.isAiRecommendation && (
                        <div className="flex items-center space-x-2 text-sm text-blue-600">
                          <Bot className="w-4 h-4" />
                          <span>AI recommendations from my knowledge</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                      {message.products
                        .filter(product => product && product.id)
                        .map((product) => (
                        <div key={product.id} className="transform hover:scale-105 transition-transform">
                          <ProductCard 
                            product={product} 
                            onClick={onProductClick}
                            compact={true}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Timestamp */}
                <p className={`
                  text-xs text-gray-500 mt-2 
                  ${message.type === 'user' ? 'text-right' : 'text-left'}
                `}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="inline-block px-6 py-4 rounded-2xl rounded-bl-md bg-white border border-gray-200">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  <span className="text-sm text-gray-600">Searching for the best products...</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about any product..."
              className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 resize-none"
              rows={1}
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || loading}
              className={`
                absolute right-2 top-2 w-6 h-6 rounded-md flex items-center justify-center transition-colors
                ${inputValue.trim() && !loading
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {/* Quick suggestions */}
        <div className="mt-2 flex flex-wrap gap-2">
          {['pros and cons', 'alternatives', 'compare features'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setInputValue(suggestion);
              }}
              disabled={loading}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-md transition-colors border border-gray-200 hover:border-blue-300"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};