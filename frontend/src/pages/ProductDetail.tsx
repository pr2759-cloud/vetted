import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProductDetail: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <motion.button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to search</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-8 text-center shadow-card"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Product Details
          </h1>
          
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Detailed product pages are coming soon! You'll be able to see comprehensive 
            product information, detailed sentiment analysis, price tracking, and more.
          </p>
          
          <div className="inline-flex items-center text-primary-600 font-medium">
            <Package className="w-4 h-4 mr-2" />
            <span>Feature in development</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};