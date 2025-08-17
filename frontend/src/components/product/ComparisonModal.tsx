import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Droplets, Leaf, Shield, DollarSign, Heart, Package, Sun, Users } from 'lucide-react';
import { Product } from '../../types';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  products
}) => {
  if (!isOpen || products.length === 0) return null;

  const comparisonFactors = [
    {
      id: 'skinType',
      title: 'Skin Type Suitability',
      icon: <Droplets className="w-5 h-5" />,
      description: 'Works for oily, dry, combination, sensitive, or acne-prone skin',
      getValue: (product: Product) => product.tags?.filter(tag => 
        ['oily skin', 'dry skin', 'sensitive skin', 'combination skin', 'acne-prone'].some(type => 
          tag.toLowerCase().includes(type)
        )
      ).join(', ') || 'All skin types'
    },
    {
      id: 'ingredients',
      title: 'Key Ingredients & Actives',
      icon: <Leaf className="w-5 h-5" />,
      description: 'Vitamin C, Retinol, Hyaluronic Acid, Niacinamide, Salicylic Acid, SPF filters, etc.',
      getValue: (product: Product) => product.features?.slice(0, 3).join(', ') || 'Standard formulation'
    },
    {
      id: 'effectiveness',
      title: 'Effectiveness (Claims vs. Results)',
      icon: <Star className="w-5 h-5" />,
      description: 'What it does vs. what reviews say',
      getValue: (product: Product) => {
        const rating = product.rating || 0;
        if (rating >= 4.5) return 'Highly effective - Claims well supported';
        if (rating >= 4.0) return 'Very effective - Good user satisfaction';
        if (rating >= 3.5) return 'Moderately effective - Mixed results';
        return 'Limited effectiveness - Users report issues';
      }
    },
    {
      id: 'texture',
      title: 'Texture & Finish / User Experience',
      icon: <Package className="w-5 h-5" />,
      description: 'Lightweight vs heavy, greasy vs matte, fast-absorbing vs sticky',
      getValue: (product: Product) => {
        const textureKeywords = product.tags?.filter(tag => 
          ['lightweight', 'heavy', 'matte', 'greasy', 'fast-absorbing', 'sticky', 'creamy', 'gel'].some(texture => 
            tag.toLowerCase().includes(texture)
          )
        );
        return textureKeywords?.join(', ') || 'Standard texture';
      }
    },
    {
      id: 'price',
      title: 'Price & Value',
      icon: <DollarSign className="w-5 h-5" />,
      description: 'Price per unit and perceived value',
      getValue: (product: Product) => {
        const price = product.price?.display || 'Price not available';
        const rating = product.rating || 0;
        const value = rating >= 4.0 ? 'Excellent value' : rating >= 3.5 ? 'Good value' : 'Fair value';
        return `${price} - ${value}`;
      }
    },
    {
      id: 'brand',
      title: 'Brand Reputation & Trust',
      icon: <Shield className="w-5 h-5" />,
      description: 'Known dermatologist-backed vs indie DTC brand',
      getValue: (product: Product) => {
        const trustedBrands = ['cerave', 'neutrogena', 'la roche posay', 'the ordinary', 'paula\'s choice'];
        const brand = product.brand?.toLowerCase() || '';
        const isTrusted = trustedBrands.some(trusted => brand.includes(trusted));
        return isTrusted ? `${product.brand} - Trusted brand` : `${product.brand} - Emerging brand`;
      }
    },
    {
      id: 'packaging',
      title: 'Packaging & Sustainability',
      icon: <Package className="w-5 h-5" />,
      description: 'Pump vs jar, eco-friendly, travel-friendly packaging',
      getValue: (product: Product) => {
        const sustainableFeatures = product.tags?.filter(tag => 
          ['eco-friendly', 'recyclable', 'travel-friendly', 'pump', 'jar', 'sustainable'].some(feature => 
            tag.toLowerCase().includes(feature)
          )
        );
        return sustainableFeatures?.length ? sustainableFeatures.join(', ') : 'Standard packaging';
      }
    },
    {
      id: 'sideEffects',
      title: 'Side Effects / Common Complaints',
      icon: <Heart className="w-5 h-5" />,
      description: 'Breakouts, irritation, pilling under makeup',
      getValue: (product: Product) => {
        const rating = product.rating || 0;
        if (rating >= 4.5) return 'Minimal side effects reported';
        if (rating >= 4.0) return 'Few mild side effects';
        if (rating >= 3.5) return 'Some users report issues';
        return 'Multiple concerns reported';
      }
    },
    {
      id: 'spf',
      title: 'SPF (for Sunscreens)',
      icon: <Sun className="w-5 h-5" />,
      description: 'Broad spectrum, SPF rating, white cast concerns',
      getValue: (product: Product) => {
        if (product.category?.toLowerCase().includes('sun') || 
            product.name?.toLowerCase().includes('spf') || 
            product.name?.toLowerCase().includes('sunscreen')) {
          return product.tags?.find(tag => tag.toLowerCase().includes('spf')) || 'SPF protection included';
        }
        return 'Not applicable';
      }
    },
    {
      id: 'sentiment',
      title: 'Community Sentiment (Social Proof)',
      icon: <Users className="w-5 h-5" />,
      description: 'TikTok virality, Reddit upvotes, real user love',
      getValue: (product: Product) => {
        const sentiment = product.sentiment;
        const mentions = sentiment?.mentionCount || 0;
        const label = sentiment?.text || 'Mixed reception';
        return `${label} - ${mentions.toLocaleString()} mentions`;
      }
    }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Product Comparison</h2>
                <p className="text-gray-600 mt-1">Compare {products.length} skincare products side by side</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-auto max-h-[calc(90vh-120px)]">
            {/* Product Headers */}
            <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
              <div className="grid grid-cols-4 gap-4 p-6">
                <div className="font-semibold text-gray-900">Comparison Factors</div>
                {products.map((product) => (
                  <div key={product.id} className="text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={`http://localhost:3001${product.images[0]}`}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-xl"
                          onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{product.brand}</p>
                    <p className="text-sm font-semibold text-blue-600 mt-1">{product.price?.display}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison Rows */}
            <div className="p-6 space-y-1">
              {comparisonFactors.map((factor, index) => (
                <motion.div
                  key={factor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="grid grid-cols-4 gap-4 py-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mt-1">
                      {factor.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{factor.title}</h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{factor.description}</p>
                    </div>
                  </div>
                  {products.map((product) => (
                    <div key={product.id} className="px-3 py-2 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {factor.getValue(product)}
                      </p>
                    </div>
                  ))}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};