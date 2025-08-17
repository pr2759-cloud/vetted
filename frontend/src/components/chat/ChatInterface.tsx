import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Star, Loader2, TrendingUp, DollarSign, Heart, Shield } from 'lucide-react';
import { ChatMessage, Product } from '../../types';
import { ProductCard } from '../product/ProductCard';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onProductClick?: (product: Product) => void;
  onProductCompare?: (product: Product) => void;
  isProductInCompare?: (productId: string) => boolean;
  onFeatureAction?: (action: string) => void;
  loading?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onProductClick,
  onProductCompare,
  isProductInCompare,
  onFeatureAction,
  loading = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`flex gap-4 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-medium
                ${message.type === 'user' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-br from-primary-500 to-primary-600'
                }
              `}>
                {message.type === 'user' ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </div>

              {/* Message Content */}
              <div className={`flex-1 max-w-3xl ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`
                  inline-block px-6 py-4 rounded-2xl shadow-sm
                  ${message.type === 'user'
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                  }
                `}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {typeof message.content === 'string' ? message.content : 'Unable to display message content'}
                  </p>
                </div>

                {/* Pros/cons analysis indicator */}
                {message.type === 'assistant' && message.analysisType === 'pros-cons' && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <Bot className="w-4 h-4" />
                      <span>Analysis Complete</span>
                    </div>
                  </div>
                )}

                {/* Products Grid (only for non-analysis messages) */}
                {message.type === 'assistant' && 
                 message.analysisType !== 'pros-cons' && 
                 message.products && 
                 message.products.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      {message.hasDbResults && (
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <Star className="w-4 h-4 fill-current" />
                          <span>Found {message.products.length} products in our database</span>
                        </div>
                      )}
                      {message.isAiRecommendation && (
                        <div className="flex items-center space-x-2 text-sm text-blue-600">
                          <Bot className="w-4 h-4" />
                          <span>AI recommendations from my knowledge</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                      {message.products
                        .filter(product => product && product.id)
                        .map((product) => (
                        <div key={product.id} className="transform hover:scale-105 transition-transform">
                          <ProductCard 
                            product={product} 
                            onClick={onProductClick}
                            onCompare={onProductCompare}
                            isInCompare={isProductInCompare ? isProductInCompare(product.id) : false}
                            compact={true}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Modern Features Actions */}
                    {onFeatureAction && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border border-slate-200/60 backdrop-blur-sm"
                      >
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <h4 className="text-base font-semibold text-slate-800">Explore More</h4>
                        </div>
                        <p className="text-sm text-slate-600 mb-6">Get deeper insights about these products</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          {[
                            { 
                              action: 'community favorites', 
                              icon: <Heart className="w-5 h-5" />, 
                              label: 'Community Buzz',
                              description: 'Trending & loved',
                              gradient: 'from-pink-500 to-rose-600'
                            },
                            { 
                              action: 'dermatologist recommended', 
                              icon: <Shield className="w-5 h-5" />, 
                              label: 'Derm Approved',
                              description: 'Expert endorsed',
                              gradient: 'from-emerald-500 to-teal-600'
                            },
                            { 
                              action: 'alternatives', 
                              icon: <TrendingUp className="w-5 h-5" />, 
                              label: 'Alternatives',
                              description: 'Similar products',
                              gradient: 'from-violet-500 to-purple-600'
                            },
                            { 
                              action: 'dupe suggestions', 
                              icon: <DollarSign className="w-5 h-5" />, 
                              label: 'Dupes',
                              description: 'Cheaper alternatives',
                              gradient: 'from-orange-500 to-red-600'
                            }
                          ].map((item, index) => (
                            <motion.button
                              key={item.action}
                              onClick={() => onFeatureAction(item.action)}
                              disabled={loading}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 + index * 0.1 }}
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              className="group relative p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/50 hover:border-white shadow-sm hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                            >
                              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                              
                              <div className="relative flex flex-col items-center text-center space-y-2">
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${item.gradient} text-white shadow-sm`}>
                                  {item.icon}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-800 text-sm">{item.label}</div>
                                  <div className="text-xs text-slate-500">{item.description}</div>
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
                
                {/* Timestamp */}
                <p className={`
                  text-xs text-gray-500 mt-2 
                  ${message.type === 'user' ? 'text-right' : 'text-left'}
                `}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="inline-block px-6 py-4 rounded-2xl rounded-bl-md bg-white border border-gray-200">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  <span className="text-sm text-gray-600">Searching for the best products...</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

    </div>
  );
};