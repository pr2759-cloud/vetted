import React from 'react';
import { motion } from 'framer-motion';
import { Star, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

import { Product } from '../../types';
import { SentimentBadge } from './SentimentBadge';

interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
  showSentiment?: boolean;
  compact?: boolean;
  loading?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onClick,
  showSentiment = true,
  compact = false,
  loading = false
}) => {
  // Safety check for missing product data
  if (!product || !product.id) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-700">
        <p className="text-sm">Product data unavailable</p>
      </div>
    );
  }

  const handleClick = () => {
    if (onClick && !loading) {
      onClick(product);
    }
  };

  const getTrendingIcon = (trending: string) => {
    switch (trending) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-500 animate-bounce-gentle" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      case 'new':
        return <Sparkles className="w-3 h-3 text-blue-500 animate-pulse-slow" />;
      default:
        return <Minus className="w-3 h-3 text-gray-400" />;
    }
  };

  const formatMentionCount = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
        <div className="h-48 bg-gray-200"></div>
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`
        bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer
        hover:border-primary-300 hover:shadow-glow transition-all duration-200
        ${compact ? 'h-auto' : 'h-full'}
      `}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      layout
    >
      {/* Product Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
        {/* Rating Badge */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1 z-10">
          <Star className="w-3 h-3 text-yellow-400 fill-current" />
          <span className="text-xs font-semibold text-gray-700">{product.rating || 'N/A'}</span>
        </div>
        
        {/* Product image or placeholder */}
        {product.images && product.images.length > 0 ? (
          <img
            src={`http://localhost:3001${product.images[0]}`}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const placeholder = document.createElement('div');
                placeholder.className = 'text-6xl text-gray-300';
                placeholder.textContent = '📦';
                parent.appendChild(placeholder);
              }
            }}
          />
        ) : (
          <div className="text-6xl text-gray-300">📦</div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-3">
        {/* Product Title */}
        <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight">
          {product.name || 'Unnamed Product'}
        </h3>

        {/* Price and Reviews */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-primary-600">{product.price?.display || 'Price unavailable'}</span>
          <span className="text-gray-500">{product.reviews?.display || '0 reviews'}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md font-medium">
            {product.category || 'General'}
          </span>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-md font-medium">
            by {product.brand || 'Unknown'}
          </span>
          {(product.tags || []).slice(0, 1).map((tag) => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
              {tag}
            </span>
          ))}
        </div>

        {/* Sentiment Badge */}
        {showSentiment && product.sentiment && (
          <SentimentBadge
            sentiment={product.sentiment}
            size="sm"
            showBreakdown={!compact}
            showTrending={true}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {getTrendingIcon(product.sentiment?.trending || 'stable')}
            <span>{formatMentionCount(product.sentiment?.mentionCount || 0)} mentions</span>
          </div>
          
          <button className="text-xs text-gray-500 hover:text-primary-600 transition-colors">
            View Details
          </button>
        </div>
      </div>
    </motion.div>
  );
};