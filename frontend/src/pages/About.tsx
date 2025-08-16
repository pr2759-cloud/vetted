import React from 'react';
import { motion } from 'framer-motion';
import { Search, Brain, TrendingUp, Shield, Zap, Users } from 'lucide-react';

export const About: React.FC = () => {
  const features = [
    {
      icon: Search,
      title: 'Intelligent Discovery',
      description: 'AI-powered search that understands context and finds products you never knew existed.',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Brain,
      title: 'Sentiment Analysis',
      description: 'Real-time analysis of thousands of reviews and social mentions to gauge true product quality.',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: TrendingUp,
      title: 'Trending Insights',
      description: 'Track product momentum and discover what\'s gaining popularity before it hits mainstream.',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: Shield,
      title: 'Quality Assurance',
      description: 'Every recommendation is vetted through multiple data sources and quality checks.',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: Zap,
      title: 'Real-time Updates',
      description: 'Product sentiment and trending data updated continuously for the most current insights.',
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Leverage collective intelligence from millions of reviews and social interactions.',
      gradient: 'from-indigo-500 to-purple-500'
    }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            How <span className="text-gradient bg-gradient-to-r from-primary-500 to-blue-500 bg-clip-text text-transparent">Vetted</span> Works
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We combine artificial intelligence, sentiment analysis, and real-time data to help you discover 
            products that are not just popular, but truly worth your time and money.
          </p>
        </motion.div>

        {/* Process Steps */}
        <div className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Search with Intent</h3>
              <p className="text-gray-600">
                Tell us what you're looking for in natural language. Our AI understands context, 
                preferences, and nuanced requirements.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Analysis</h3>
              <p className="text-gray-600">
                Our system analyzes millions of reviews, social mentions, and product data 
                to understand real sentiment and quality.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Curated Results</h3>
              <p className="text-gray-600">
                Get personalized recommendations with detailed sentiment insights, 
                trending data, and quality scores.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-20"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Powerful Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-white rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 group"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-primary-500 to-blue-500 rounded-2xl p-8 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">
            Ready to Discover Amazing Products?
          </h2>
          
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of smart shoppers who use Vetted to find products they actually love.
          </p>
          
          <motion.button
            onClick={() => window.location.href = '/'}
            className="bg-white text-primary-600 font-semibold py-3 px-8 rounded-full hover:bg-gray-50 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Discovering
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};