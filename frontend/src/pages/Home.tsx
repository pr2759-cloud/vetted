import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, CheckCircle, Sparkles } from 'lucide-react';

import { SearchInput } from '../components/search/SearchInput';
import { CategoryTabs } from '../components/common/CategoryTabs';
import { SuggestedSearches } from '../components/search/SuggestedSearches';

const suggestedSearches = [
  'vitamin C serums for dark spots',
  'wireless earbuds under $100', 
  'beard oils for coarse hair',
  'resistance bands for home workouts'
];

const categories = [
  'Skincare & Beauty',
  'Fitness & Wellness',
  'Men\'s Grooming',
  'Tech Accessories',
  'Home & Kitchen'
];

export const Home: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSuggestedSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl w-full text-center">
          <motion.div 
            className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-3xl p-8 sm:p-12 lg:p-16 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-primary-600 font-medium text-sm mb-6 border border-primary-100"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Discover amazing products across the internet</span>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-6 leading-tight"
            >
              Discover products you'll{' '}
              <span className="text-gradient bg-gradient-to-r from-primary-500 to-blue-500 bg-clip-text text-transparent">
                actually love
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              Explore thousands of products with intelligent discovery. Find hidden gems, 
              trending items, and authentic user experiences from across the web.
            </motion.p>

            {/* Search Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mb-6"
            >
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                placeholder="Discover products, e.g. 'wireless chargers for iPhone' or 'retinol creams for beginners'"
                autoFocus
              />
            </motion.div>

            {/* Suggested Searches */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <SuggestedSearches 
                suggestions={suggestedSearches}
                onSelectSuggestion={handleSuggestedSearch}
              />
            </motion.div>
          </motion.div>

          {/* Category Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <CategoryTabs
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="bg-white border-t border-gray-100 py-12"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="text-center group">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Intelligent Discovery
              </h3>
              <p className="text-gray-600 text-sm">
                AI-powered search finds products you never knew existed but will absolutely love.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sentiment Analysis
              </h3>
              <p className="text-gray-600 text-sm">
                Real-time sentiment analysis from thousands of reviews and social mentions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center group">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Vetted Quality
              </h3>
              <p className="text-gray-600 text-sm">
                Every product recommendation is carefully analyzed for quality and authenticity.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};