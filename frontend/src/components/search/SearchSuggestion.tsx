import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SearchSuggestion as SearchSuggestionType } from '../../types';

interface SearchSuggestionProps {
  suggestion: SearchSuggestionType;
  compact?: boolean;
}

export const SearchSuggestion: React.FC<SearchSuggestionProps> = ({
  suggestion,
  compact = false
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/search?q=${encodeURIComponent(suggestion.query)}`);
  };

  if (compact) {
    return (
      <motion.button
        onClick={handleClick}
        className="group text-left p-3 bg-white hover:bg-primary-50 border border-gray-200 hover:border-primary-300 rounded-lg transition-all text-sm"
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{suggestion.icon}</span>
          <span className="text-gray-700 group-hover:text-primary-700 font-medium truncate">
            {suggestion.text}
          </span>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={handleClick}
      className="group flex items-center space-x-3 w-full p-4 bg-white hover:bg-primary-50 border border-gray-200 hover:border-primary-300 rounded-xl transition-all"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 group-hover:bg-primary-100 rounded-lg flex items-center justify-center transition-colors">
        <span className="text-lg">{suggestion.icon}</span>
      </div>
      
      <div className="flex-1 text-left">
        <h4 className="text-sm font-medium text-gray-900 group-hover:text-primary-900">
          {suggestion.text}
        </h4>
        {suggestion.category && (
          <p className="text-xs text-gray-500 group-hover:text-primary-600 mt-1">
            in {suggestion.category}
          </p>
        )}
      </div>
      
      <div className="flex-shrink-0 text-gray-400 group-hover:text-primary-500 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </motion.button>
  );
};