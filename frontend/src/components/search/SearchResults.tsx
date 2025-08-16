import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';

import { SearchResult, Product } from '../../types';
import { ProductCard } from '../product/ProductCard';
import { SearchSuggestion } from '../search/SearchSuggestion';

interface SearchResultsProps {
  searchResult: SearchResult;
  onProductClick: (product: Product) => void;
  onLoadMore?: () => void;
  loading?: boolean;
  filtersComponent?: React.ReactNode;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  searchResult,
  onProductClick,
  onLoadMore,
  loading = false,
  filtersComponent
}) => {
  const { products, total, hasMore, suggestions } = searchResult;

  if (!products.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-8 text-center shadow-card"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          No products found
        </h3>
        
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          We couldn't find any products matching your search. Try different keywords or browse our trending products.
        </p>

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-3">Try these suggestions:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <SearchSuggestion key={index} suggestion={suggestion} />
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Results Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Discovered Products for "{searchResult.query}"
          </h2>
          <p className="text-gray-600">
            Found {total.toLocaleString()} products • {searchResult.responseTime}ms response time
          </p>
        </div>
        
        {searchResult.responseTime && searchResult.responseTime < 1000 && (
          <div className="flex items-center space-x-2 text-green-600 text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Fast search</span>
          </div>
        )}
      </motion.div>

      {/* Quick Filter Suggestions */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-gray-50 to-primary-50 rounded-xl p-4 border border-gray-100 mb-6"
        >
          <div className="flex items-center space-x-2 text-primary-600 font-semibold text-sm mb-3">
            <TrendingUp className="w-4 h-4" />
            <span>Quick filters:</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 6).map((suggestion, index) => (
              <SearchSuggestion 
                key={index} 
                suggestion={suggestion}
                compact={true}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Filters */}
      {filtersComponent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {filtersComponent}
        </motion.div>
      )}

      {/* Products Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index, duration: 0.3 }}
          >
            <ProductCard
              product={product}
              onClick={() => onProductClick(product)}
              showSentiment={true}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Load More Button */}
      {hasMore && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-3 px-8 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load More Products'}
          </button>
        </motion.div>
      )}

    </div>
  );
};