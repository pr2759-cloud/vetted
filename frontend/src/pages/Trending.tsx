import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Star } from 'lucide-react';

export const Trending: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-red-50 px-4 py-2 rounded-full text-orange-600 font-medium text-sm mb-6">
            <TrendingUp className="w-4 h-4" />
            <span>What's Hot Right Now</span>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Trending Products
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover the products that are creating buzz across the internet. 
            Updated in real-time based on social sentiment and user engagement.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Real-time Trending
            </h3>
            <p className="text-gray-600 text-sm">
              Products that are experiencing rapid growth in mentions and positive sentiment.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Weekly Leaders
            </h3>
            <p className="text-gray-600 text-sm">
              Products that have maintained strong sentiment and engagement over the past week.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-4">
              <Star className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Hidden Gems
            </h3>
            <p className="text-gray-600 text-sm">
              Lesser-known products with exceptional quality that are starting to gain recognition.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-8 text-center shadow-card"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Coming Soon
          </h2>
          
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            We're building an amazing trending products feature that will show you the hottest items 
            across all categories, updated in real-time based on sentiment analysis and user engagement.
          </p>
          
          <div className="inline-flex items-center text-primary-600 font-medium">
            <Clock className="w-4 h-4 mr-2" />
            <span>Coming in the next update</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};