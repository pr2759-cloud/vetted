import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  placeholder?: string;
  loading?: boolean;
  suggestions?: string[];
  autoFocus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search for products...',
  loading = false,
  suggestions = [],
  autoFocus = false,
  size = 'lg'
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-base',
    lg: 'h-14 text-lg'
  };

  const paddingClasses = {
    sm: 'pl-10 pr-20 px-4',
    md: 'pl-12 pr-24 px-5',
    lg: 'pl-14 pr-28 px-6'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    setShowSuggestions(isFocused && suggestions.length > 0 && value.length > 0);
  }, [isFocused, suggestions, value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    onSubmit(suggestion);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const clearInput = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`
            relative flex items-center bg-white border border-gray-300 rounded-full
            transition-all duration-200 shadow-sm
            ${isFocused ? 'ring-2 ring-primary-500 ring-opacity-50 border-primary-300 shadow-glow' : 'hover:border-gray-400'}
            ${sizeClasses[size]}
          `}
        >
          {/* Search Icon */}
          <div className="absolute left-4 flex items-center pointer-events-none">
            <Search className={`${iconSizes[size]} text-gray-400`} />
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`
              flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500
              ${paddingClasses[size]}
            `}
            disabled={loading}
          />

          {/* Clear Button */}
          {value && !loading && (
            <motion.button
              type="button"
              onClick={clearInput}
              className="absolute right-16 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading || !value.trim()}
            className={`
              absolute right-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full
              flex items-center justify-center font-semibold
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:from-primary-600 hover:to-primary-700 transition-all
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              ${size === 'sm' ? 'w-8 h-8 text-xs' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base'}
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? (
              <Loader2 className={`${iconSizes[size]} animate-spin`} />
            ) : (
              <span className="hidden sm:block">Search</span>
            )}
            <Search className={`${iconSizes[size]} sm:hidden`} />
          </motion.button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="py-2">
              {suggestions.slice(0, 5).map((suggestion, index) => (
                <motion.button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 text-gray-700"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 4 }}
                >
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{suggestion}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};