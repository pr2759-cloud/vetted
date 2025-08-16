import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Sparkles, Clock } from 'lucide-react';

import { Sentiment, SENTIMENT_LABELS, TRENDING_LABELS } from '../../types';

interface SentimentBadgeProps {
  sentiment: Sentiment;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  showTrending?: boolean;
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = ({
  sentiment,
  size = 'md',
  showBreakdown = false,
  showTrending = false
}) => {
  const sizeClasses = {
    sm: 'p-3 text-xs',
    md: 'p-4 text-sm',
    lg: 'p-6 text-base'
  };

  const getSentimentColor = (label: Sentiment['label']) => {
    const colors = {
      'highly-regarded': 'bg-emerald-50 border-emerald-200 text-emerald-700',
      'well-regarded': 'bg-green-50 border-green-200 text-green-700',
      'mixed-reviews': 'bg-yellow-50 border-yellow-200 text-yellow-700',
      'poorly-regarded': 'bg-orange-50 border-orange-200 text-orange-700',
      'highly-criticized': 'bg-red-50 border-red-200 text-red-700',
      'insufficient-data': 'bg-gray-50 border-gray-200 text-gray-700',
    };
    return colors[label] || colors['insufficient-data'];
  };

  const getTrendingIcon = (trending: Sentiment['trending']) => {
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

  const getBreakdownColor = (label: Sentiment['label']) => {
    const colors = {
      'highly-regarded': '#10b981',
      'well-regarded': '#22c55e',
      'mixed-reviews': '#eab308',
      'poorly-regarded': '#f97316',
      'highly-criticized': '#ef4444',
      'insufficient-data': '#9ca3af',
    };
    return colors[label] || colors['insufficient-data'];
  };

  const formatMentionCount = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  return (
    <motion.div
      className={`
        ${getSentimentColor(sentiment.label)} 
        ${sizeClasses[size]} 
        border rounded-xl
      `}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{sentiment.emoji}</span>
          <div>
            <div className="font-semibold">{sentiment.text}</div>
            <div className="opacity-80 text-xs">{sentiment.description}</div>
          </div>
        </div>
        
        {showTrending && (
          <div className="flex items-center space-x-2 text-xs opacity-80">
            {getTrendingIcon(sentiment.trending)}
            <span>{formatMentionCount(sentiment.mentionCount)} mentions</span>
          </div>
        )}
      </div>

      {/* Breakdown Bars */}
      {showBreakdown && (
        <div className="space-y-2 mt-3">
          {Object.entries(sentiment.breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs opacity-80 capitalize w-16">{key}</span>
              <div className="flex-1 mx-2 h-1 bg-black/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: getBreakdownColor(sentiment.label) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${((value + 1) / 2) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
              <span className="text-xs opacity-80 w-8 text-right">
                {value > 0 ? '+' : ''}{Math.round(value * 100)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Confidence */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-current/20 text-xs opacity-70">
        <span>Community confidence: {Math.round(sentiment.confidence * 100)}%</span>
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>Updated today</span>
        </div>
      </div>
    </motion.div>
  );
};