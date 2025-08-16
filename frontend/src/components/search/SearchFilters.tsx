import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Star, 
  TrendingUp, 
  Sparkles,
  DollarSign,
  Tag,
  Zap
} from 'lucide-react';

import { SearchFilters as FilterOptions } from '../../types';

interface SearchFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  totalResults?: number;
  isVisible: boolean;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFiltersChange,
  totalResults = 0,
  isVisible
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    categories: [],
    priceRanges: [],
    ratings: [],
    sentiments: [],
    trending: [],
    features: []
  });

  const filterCategories = {
    categories: {
      icon: <Tag className="w-4 h-4" />,
      title: 'Categories',
      options: [
        'Skincare & Beauty',
        'Tech Accessories', 
        'Fitness & Wellness',
        'Home & Kitchen',
        "Men's Grooming",
        'Electronics',
        'Health & Nutrition'
      ]
    },
    priceRanges: {
      icon: <DollarSign className="w-4 h-4" />,
      title: 'Price Range',
      options: [
        'Under $25',
        '$25 - $50', 
        '$50 - $100',
        '$100 - $200',
        '$200+'
      ]
    },
    ratings: {
      icon: <Star className="w-4 h-4" />,
      title: 'Rating',
      options: [
        '4.5+ Stars (90+ Rating)',
        '4+ Stars (80+ Rating)',
        '3.5+ Stars (70+ Rating)',
        '3+ Stars (60+ Rating)'
      ]
    },
    sentiments: {
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Community Sentiment',
      options: [
        'Highly Regarded',
        'Well Regarded', 
        'Mixed Reviews',
        'Rising Stars'
      ]
    },
    trending: {
      icon: <TrendingUp className="w-4 h-4" />,
      title: 'Trending',
      options: [
        'Trending Up',
        'New Products',
        'Most Popular',
        'Hidden Gems'
      ]
    },
    features: {
      icon: <Zap className="w-4 h-4" />,
      title: 'Special Features',
      options: [
        'Organic/Natural',
        'Cruelty-Free',
        'Vegan',
        'Wireless',
        'Smart Features',
        'Portable',
        'Water-Resistant',
        'Long-Lasting'
      ]
    }
  };

  const handleFilterToggle = (category: keyof FilterOptions, value: string) => {
    const newFilters = { ...activeFilters };
    const currentFilters = newFilters[category] || [];
    
    if (currentFilters.includes(value)) {
      newFilters[category] = currentFilters.filter(item => item !== value);
    } else {
      newFilters[category] = [...currentFilters, value];
    }
    
    setActiveFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters: FilterOptions = {
      categories: [],
      priceRanges: [],
      ratings: [],
      sentiments: [],
      trending: [],
      features: []
    };
    setActiveFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const getTotalActiveFilters = () => {
    return Object.values(activeFilters).reduce((total, filters) => total + (filters?.length || 0), 0);
  };

  const activeFiltersCount = getTotalActiveFilters();

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6"
    >
      {/* Filter Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Filter className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Filter Results</h3>
            <p className="text-sm text-gray-600">
              {activeFiltersCount > 0 
                ? `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active • ${totalResults} results`
                : `${totalResults} results available`
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAllFilters();
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Clear all
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && !isExpanded && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(activeFilters).map(([category, filters]) =>
              filters.map((filter: string) => (
                <span
                  key={`${category}-${filter}`}
                  className="inline-flex items-center space-x-1 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium"
                >
                  <span>{filter}</span>
                  <button
                    onClick={() => handleFilterToggle(category as keyof FilterOptions, filter)}
                    className="ml-1 hover:bg-primary-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* Filter Options */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200"
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(filterCategories).map(([categoryKey, categoryData]) => (
                <div key={categoryKey} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="text-primary-600">
                      {categoryData.icon}
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {categoryData.title}
                    </h4>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {categoryData.options.map((option) => (
                      <label
                        key={option}
                        className="flex items-center space-x-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={activeFilters[categoryKey as keyof FilterOptions]?.includes(option) || false}
                          onChange={() => handleFilterToggle(categoryKey as keyof FilterOptions, option)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0 focus:ring-2"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};