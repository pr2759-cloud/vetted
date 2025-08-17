import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles, Bot } from 'lucide-react';

import { ChatInterface } from '../components/chat/ChatInterface';
import { useChatBot } from '../hooks/useChatBot';
import { Product } from '../types';

export const ChatBot: React.FC = () => {
  const navigate = useNavigate();
  const {
    messages,
    loading,
    conversationId,
    sendMessage,
    startNewConversation
  } = useChatBot();

  // Initialize chat with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      startNewConversation();
    }
  }, [messages.length, startNewConversation]);

  const handleProductClick = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  const handleSampleQuery = (query: string) => {
    sendMessage(query);
  };

  const sampleQueries = [
    "Show me skincare products for dry skin",
    "What are the best tech accessories under $50?",
    "Find highly rated fitness equipment",
    "Recommend men's grooming products",
    "Show me trending home and kitchen items"
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">AI Shopping Assistant</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ask me anything about products! I can search our database and provide recommendations 
            based on your needs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sample Queries Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900">Try asking:</h3>
              </div>
              <div className="space-y-3">
                {sampleQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleSampleQuery(query)}
                    className="w-full text-left p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 transition-colors"
                    disabled={loading}
                  >
                    {query}
                  </button>
                ))}
              </div>

              {/* Chat Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Smart Search Features</span>
                </div>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Database product search</li>
                  <li>• AI-powered recommendations</li>
                  <li>• Category filtering</li>
                  <li>• Price range suggestions</li>
                  <li>• Product comparisons</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Chat Interface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-16rem)]">
              <div className="h-full p-6">
                <ChatInterface
                  messages={messages}
                  onProductClick={handleProductClick}
                  loading={loading}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500">
            {conversationId && (
              <span>Conversation ID: {conversationId.slice(-8)} • </span>
            )}
            Powered by AI • Search our product database • Get personalized recommendations
          </p>
        </motion.div>
      </div>
    </div>
  );
};