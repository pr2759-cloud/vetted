import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

interface SuggestedSearchesProps {
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
  title?: string;
}

export const SuggestedSearches: React.FC<SuggestedSearchesProps> = ({
  suggestions,
  onSelectSuggestion,
  title = 'Popular skincare searches:'
}) => {
  if (!suggestions.length) return null;

  return (
    <div className="w-full">
      <p className="text-sm text-gray-600 mb-3 font-medium">{title}</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={suggestion}
            onClick={() => onSelectSuggestion(suggestion)}
            className="group bg-white hover:bg-primary-50 border border-gray-200 hover:border-primary-300 
                     rounded-full px-4 py-2 text-sm text-gray-700 hover:text-primary-700 
                     transition-all duration-200 shadow-sm hover:shadow-md
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center space-x-2">
              <TrendingUp className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
              <span>{suggestion}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};