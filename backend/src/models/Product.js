/**
 * Product Model
 * MongoDB schema for product data with validation and business logic
 */

const mongoose = require('mongoose');
const { PRODUCT_CATEGORIES } = require('../config/constants');

// Retailer availability subdocument
const retailerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\//.test(v);
      },
      message: 'URL must be a valid HTTP/HTTPS URL'
    }
  },
  inStock: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Price history subdocument
const priceHistorySchema = new mongoose.Schema({
  retailer: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Product specifications subdocument
const specificationsSchema = new mongoose.Schema({}, { strict: false, _id: false });

// Main Product Schema
const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
    index: 'text'
  },
  
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    index: 'text'
  },
  
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  // Category and Classification
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: {
      values: Object.keys(PRODUCT_CATEGORIES),
      message: 'Invalid category selected'
    },
    index: true
  },
  
  subcategory: {
    type: String,
    trim: true
  },
  
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters'],
    index: true
  },
  
  // Pricing
  price: {
    type: String,
    required: [true, 'Price is required']
  },
  
  priceRange: {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  
  priceHistory: [priceHistorySchema],
  
  // Ratings and Reviews
  rating: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
    index: true
  },
  
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Product Details
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  features: [{
    type: String,
    trim: true,
    maxlength: [200, 'Feature description cannot exceed 200 characters']
  }],
  
  specifications: specificationsSchema,
  
  // Media
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  videos: [{
    url: String,
    title: String,
    duration: Number // in seconds
  }],
  
  // Availability
  availability: {
    inStock: {
      type: Boolean,
      default: true,
      index: true
    },
    totalStock: {
      type: Number,
      min: 0
    },
    retailers: [retailerSchema],
    lastStockCheck: {
      type: Date,
      default: Date.now
    }
  },
  
  // SEO and Marketing
  seoTitle: {
    type: String,
    maxlength: [60, 'SEO title cannot exceed 60 characters']
  },
  
  seoDescription: {
    type: String,
    maxlength: [160, 'SEO description cannot exceed 160 characters']
  },
  
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Analytics and Tracking
  analytics: {
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
      min: 0
    },
    wishlistAdds: {
      type: Number,
      default: 0,
      min: 0
    },
    shares: {
      type: Number,
      default: 0,
      min: 0
    },
    clickThroughs: {
      type: Number,
      default: 0,
      min: 0
    },
    lastViewed: Date
  },
  
  // Status and Moderation
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'rejected'],
    default: 'active',
    index: true
  },
  
  moderationFlags: [{
    type: {
      type: String,
      enum: ['spam', 'inappropriate', 'duplicate', 'outdated', 'other']
    },
    reason: String,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // External References
  externalIds: {
    amazon: String,
    shopify: String,
    ebay: String,
    manufacturer: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
productSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ brand: 1, category: 1 });
productSchema.index({ rating: -1, reviewCount: -1 });
productSchema.index({ 'priceRange.min': 1, 'priceRange.max': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'analytics.views': -1 });
productSchema.index({ 'availability.inStock': 1 });

// Compound indexes for common queries
productSchema.index({ category: 1, rating: -1, status: 1 });
productSchema.index({ brand: 1, rating: -1, status: 1 });
productSchema.index({ tags: 1, category: 1, status: 1 });

// Virtual fields
productSchema.virtual('averagePrice').get(function() {
  if (this.priceRange && this.priceRange.min && this.priceRange.max) {
    return (this.priceRange.min + this.priceRange.max) / 2;
  }
  return 0;
});

productSchema.virtual('primaryImage').get(function() {
  if (this.images && this.images.length > 0) {
    const primaryImage = this.images.find(img => img.isPrimary);
    return primaryImage || this.images[0];
  }
  return null;
});

productSchema.virtual('isInStock').get(function() {
  return this.availability && this.availability.inStock;
});

productSchema.virtual('categoryInfo').get(function() {
  return PRODUCT_CATEGORIES[this.category] || null;
});

// Pre-save middleware
productSchema.pre('save', function(next) {
  // Generate slug if not provided
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Update timestamps
  this.updatedAt = new Date();
  
  // Validate price range
  if (this.priceRange && this.priceRange.min > this.priceRange.max) {
    next(new Error('Minimum price cannot be greater than maximum price'));
    return;
  }
  
  // Ensure only one primary image
  if (this.images && this.images.length > 0) {
    const primaryImages = this.images.filter(img => img.isPrimary);
    if (primaryImages.length > 1) {
      // Keep only the first primary image
      this.images.forEach((img, index) => {
        if (index > 0) img.isPrimary = false;
      });
    } else if (primaryImages.length === 0) {
      // Set first image as primary
      this.images[0].isPrimary = true;
    }
  }
  
  next();
});

// Pre-update middleware
productSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Instance Methods
productSchema.methods.incrementViews = function(userId = null) {
  this.analytics.views += 1;
  this.analytics.lastViewed = new Date();
  
  if (userId) {
    // In a real implementation, you might track unique visitors differently
    this.analytics.uniqueVisitors += 1;
  }
  
  return this.save();
};

productSchema.methods.addToWishlist = function() {
  this.analytics.wishlistAdds += 1;
  return this.save();
};

productSchema.methods.recordShare = function() {
  this.analytics.shares += 1;
  return this.save();
};

productSchema.methods.recordClickThrough = function() {
  this.analytics.clickThroughs += 1;
  return this.save();
};

productSchema.methods.updateRating = function(newRating, newReviewCount) {
  this.rating = newRating;
  this.reviewCount = newReviewCount;
  return this.save();
};

productSchema.methods.addPriceHistory = function(retailer, price, currency = 'USD') {
  this.priceHistory.push({
    retailer,
    price,
    currency,
    date: new Date()
  });
  
  // Keep only last 100 price history entries
  if (this.priceHistory.length > 100) {
    this.priceHistory = this.priceHistory.slice(-100);
  }
  
  return this.save();
};

productSchema.methods.updateAvailability = function(retailerName, inStock, price = null) {
  const retailer = this.availability.retailers.find(r => r.name === retailerName);
  
  if (retailer) {
    retailer.inStock = inStock;
    if (price !== null) {
      retailer.price = price;
    }
    retailer.lastUpdated = new Date();
  } else if (price !== null) {
    // Add new retailer
    this.availability.retailers.push({
      name: retailerName,
      price,
      inStock,
      url: '#', // Should be provided separately
      lastUpdated: new Date()
    });
  }
  
  // Update overall stock status
  this.availability.inStock = this.availability.retailers.some(r => r.inStock);
  this.availability.lastStockCheck = new Date();
  
  return this.save();
};

productSchema.methods.addModerationFlag = function(type, reason, reportedBy) {
  this.moderationFlags.push({
    type,
    reason,
    reportedBy,
    reportedAt: new Date(),
    resolved: false
  });
  
  return this.save();
};

productSchema.methods.resolveModerationFlag = function(flagId) {
  const flag = this.moderationFlags.id(flagId);
  if (flag) {
    flag.resolved = true;
  }
  return this.save();
};

// Static Methods
productSchema.statics.findByCategory = function(category, options = {}) {
  const query = { category, status: 'active' };
  return this.find(query, null, options);
};

productSchema.statics.findByBrand = function(brand, options = {}) {
  const query = { brand: new RegExp(brand, 'i'), status: 'active' };
  return this.find(query, null, options);
};

productSchema.statics.findInPriceRange = function(minPrice, maxPrice, options = {}) {
  const query = {
    'priceRange.min': { $gte: minPrice },
    'priceRange.max': { $lte: maxPrice },
    status: 'active'
  };
  return this.find(query, null, options);
};

productSchema.statics.searchProducts = function(searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    status: 'active'
  };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

productSchema.statics.getTrendingProducts = function(limit = 20) {
  return this.find({ status: 'active' })
    .sort({ 'analytics.views': -1, rating: -1 })
    .limit(limit);
};

productSchema.statics.getTopRated = function(limit = 20) {
  return this.find({ 
    status: 'active',
    reviewCount: { $gte: 10 } // Minimum reviews for credibility
  })
  .sort({ rating: -1, reviewCount: -1 })
  .limit(limit);
};

productSchema.statics.findSimilar = function(productId, limit = 10) {
  return this.findById(productId)
    .then(product => {
      if (!product) return [];
      
      const query = {
        _id: { $ne: productId },
        category: product.category,
        status: 'active'
      };
      
      // Add brand preference (optional)
      const brandQuery = { ...query, brand: product.brand };
      
      return this.find(brandQuery).limit(Math.ceil(limit / 2))
        .then(brandMatches => {
          const remainingLimit = limit - brandMatches.length;
          if (remainingLimit <= 0) return brandMatches;
          
          return this.find({
            ...query,
            brand: { $ne: product.brand }
          }).limit(remainingLimit)
          .then(otherMatches => [...brandMatches, ...otherMatches]);
        });
    });
};

productSchema.statics.getAnalytics = function(timeframe = '30d') {
  // This would normally use aggregation pipeline
  // Simplified for demonstration
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$category',
        totalProducts: { $sum: 1 },
        totalViews: { $sum: '$analytics.views' },
        avgRating: { $avg: '$rating' },
        totalWishlistAdds: { $sum: '$analytics.wishlistAdds' }
      }
    },
    { $sort: { totalViews: -1 } }
  ]);
};

// Query helpers
productSchema.query.active = function() {
  return this.where({ status: 'active' });
};

productSchema.query.inStock = function() {
  return this.where({ 'availability.inStock': true });
};

productSchema.query.byRatingRange = function(min, max) {
  return this.where({ rating: { $gte: min, $lte: max } });
};

// Export the model
module.exports = mongoose.model('Product', productSchema);
