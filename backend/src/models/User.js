/**
 * User Model
 * MongoDB schema for user accounts, preferences, and activity tracking
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { PRODUCT_CATEGORIES } = require('../config/constants');

// User preferences subdocument
const preferencesSchema = new mongoose.Schema({
  categories: [{
    type: String,
    enum: Object.keys(PRODUCT_CATEGORIES)
  }],
  priceRange: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    }
  },
  brands: [{
    type: String,
    trim: true
  }],
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly', 'never'],
      default: 'weekly'
    }
  },
  privacy: {
    shareActivity: {
      type: Boolean,
      default: false
    },
    allowAnalytics: {
      type: Boolean,
      default: true
    },
    publicProfile: {
      type: Boolean,
      default: false
    }
  },
  language: {
    type: String,
    enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'],
    default: 'en'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
    default: 'USD'
  }
}, { _id: false });

// Activity tracking subdocument
const activitySchema = new mongoose.Schema({
  totalSearches: {
    type: Number,
    default: 0,
    min: 0
  },
  totalProductViews: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWishlistItems: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSessions: {
    type: Number,
    default: 0,
    min: 0
  },
  totalTimeSpent: {
    type: Number,
    default: 0,
    min: 0 // in minutes
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  loginStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

// Social profile subdocument
const socialProfileSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['google', 'facebook', 'twitter', 'apple', 'github'],
    required: true
  },
  platformId: {
    type: String,
    required: true
  },
  username: String,
  profileUrl: String
}, { _id: false });

// Main User Schema
const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    },
    index: true
  },
  
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    validate: {
      validator: function(v) {
        return !v || /^[a-zA-Z0-9_-]+$/.test(v);
      },
      message: 'Username can only contain letters, numbers, underscores, and hyphens'
    },
    index: true
  },
  
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  // Authentication
  password: {
    type: String,
    required: function() {
      return !this.socialProfiles || this.socialProfiles.length === 0;
    },
    minlength: [8, 'Password must be at least 8 characters'],
    validate: {
      validator: function(v) {
        if (!v && (!this.socialProfiles || this.socialProfiles.length === 0)) {
          return false;
        }
        if (v && v.length < 8) return false;
        // Password strength: at least one letter and one number
        return !v || /^(?=.*[A-Za-z])(?=.*\d)/.test(v);
      },
      message: 'Password must contain at least one letter and one number'
    }
  },
  
  socialProfiles: [socialProfileSchema],
  
  // Account Status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'deactivated'],
    default: 'pending',
    index: true
  },
  
  emailVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  
  emailVerificationToken: String,
  
  emailVerificationExpires: Date,
  
  // Password Reset
  passwordResetToken: String,
  
  passwordResetExpires: Date,
  
  // Profile Information
  avatar: {
    url: String,
    cloudinaryId: String
  },
  
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // User Preferences
  preferences: {
    type: preferencesSchema,
    default: () => ({})
  },
  
  // Activity Tracking
  activity: {
    type: activitySchema,
    default: () => ({})
  },
  
  // Wishlist
  wishlist: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: [200, 'Notes cannot exceed 200 characters']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    notifyOnPriceDrop: {
      type: Boolean,
      default: false
    },
    targetPrice: {
      type: Number,
      min: 0
    }
  }],
  
  // Search History (last 100 searches)
  searchHistory: [{
    query: {
      type: String,
      required: true
    },
    filters: mongoose.Schema.Types.Mixed,
    searchedAt: {
      type: Date,
      default: Date.now
    },
    resultCount: {
      type: Number,
      default: 0
    }
  }],
  
  // Recently Viewed Products (last 50)
  recentlyViewed: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    },
    viewDuration: {
      type: Number, // in seconds
      min: 0
    }
  }],
  
  // Saved Searches
  savedSearches: [{
    name: {
      type: String,
      required: true,
      maxlength: [100, 'Search name cannot exceed 100 characters']
    },
    query: {
      type: String,
      required: true
    },
    filters: mongoose.Schema.Types.Mixed,
    alertsEnabled: {
      type: Boolean,
      default: false
    },
    lastChecked: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Subscription and Billing
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'trial'],
      default: 'active'
    },
    startDate: Date,
    endDate: Date,
    customerId: String, // Stripe customer ID
    subscriptionId: String // Stripe subscription ID
  },
  
  // Security and Sessions
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: Date,
  
  lastLogin: Date,
  
  lastLoginIP: String,
  
  activeSessions: [{
    sessionId: String,
    deviceInfo: String,
    ipAddress: String,
    userAgent: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Roles and Permissions
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user',
    index: true
  },
  
  permissions: [{
    type: String,
    enum: [
      'manage_products',
      'manage_users',
      'view_analytics',
      'manage_content',
      'moderate_reviews',
      'manage_sentiment'
    ]
  }],
  
  // GDPR and Privacy
  gdprConsent: {
    given: {
      type: Boolean,
      default: false
    },
    date: Date,
    version: String
  },
  
  dataRetentionOptOut: {
    type: Boolean,
    default: false
  },
  
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
  
  deletedAt: Date // Soft delete
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.emailVerificationToken;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1, status: 1 });
userSchema.index({ username: 1, status: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'activity.lastActive': -1 });
userSchema.index({ emailVerified: 1, status: 1 });

// Compound indexes
userSchema.index({ 'preferences.categories': 1, status: 1 });
userSchema.index({ 'location.country': 1, 'location.region': 1 });

// Virtual fields
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.emailVerified;
});

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('isTrialUser').get(function() {
  return this.subscription && this.subscription.status === 'trial';
});

userSchema.virtual('isPremiumUser').get(function() {
  return this.subscription && 
         this.subscription.plan !== 'free' && 
         this.subscription.status === 'active';
});

userSchema.virtual('wishlistCount').get(function() {
  return this.wishlist ? this.wishlist.length : 0;
});

userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

userSchema.virtual('isModerator').get(function() {
  return this.role === 'moderator' || this.role === 'admin';
});

userSchema.virtual('accountAge').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password') && this.password) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  
  // Update timestamp
  this.updatedAt = new Date();
  
  // Generate username if not provided
  if (!this.username && this.email) {
    this.username = this.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Ensure uniqueness
    let counter = 1;
    let originalUsername = this.username;
    while (await this.constructor.findOne({ username: this.username, _id: { $ne: this._id } })) {
      this.username = `${originalUsername}${counter}`;
      counter++;
    }
  }
  
  // Limit array sizes
  if (this.searchHistory && this.searchHistory.length > 100) {
    this.searchHistory = this.searchHistory.slice(-100);
  }
  
  if (this.recentlyViewed && this.recentlyViewed.length > 50) {
    this.recentlyViewed = this.recentlyViewed.slice(-50);
  }
  
  if (this.activeSessions && this.activeSessions.length > 5) {
    this.activeSessions = this.activeSessions.slice(-5);
  }
  
  next();
});

// Instance Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = token;
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return token;
};

userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  return token;
};

userSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock after 5 attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

userSchema.methods.addToWishlist = function(productId, options = {}) {
  const existingItem = this.wishlist.find(item => 
    item.productId.toString() === productId.toString()
  );
  
  if (existingItem) {
    // Update existing item
    Object.assign(existingItem, options);
  } else {
    // Add new item
    this.wishlist.push({
      productId,
      ...options
    });
  }
  
  this.activity.totalWishlistItems = this.wishlist.length;
  return this.save();
};

userSchema.methods.removeFromWishlist = function(productId) {
  this.wishlist = this.wishlist.filter(item => 
    item.productId.toString() !== productId.toString()
  );
  
  this.activity.totalWishlistItems = this.wishlist.length;
  return this.save();
};

userSchema.methods.addToRecentlyViewed = function(productId, viewDuration = 0) {
  // Remove if already exists
  this.recentlyViewed = this.recentlyViewed.filter(item => 
    item.productId.toString() !== productId.toString()
  );
  
  // Add to beginning
  this.recentlyViewed.unshift({
    productId,
    viewDuration,
    viewedAt: new Date()
  });
  
  // Keep only last 50
  if (this.recentlyViewed.length > 50) {
    this.recentlyViewed = this.recentlyViewed.slice(0, 50);
  }
  
  this.activity.totalProductViews += 1;
  return this.save();
};

userSchema.methods.addSearchToHistory = function(query, filters = {}, resultCount = 0) {
  // Remove duplicate if exists
  this.searchHistory = this.searchHistory.filter(search => 
    search.query !== query
  );
  
  // Add to beginning
  this.searchHistory.unshift({
    query,
    filters,
    resultCount,
    searchedAt: new Date()
  });
  
  // Keep only last 100
  if (this.searchHistory.length > 100) {
    this.searchHistory = this.searchHistory.slice(0, 100);
  }
  
  this.activity.totalSearches += 1;
  return this.save();
};

userSchema.methods.saveSearch = function(name, query, filters = {}, alertsEnabled = false) {
  // Check if search with same name exists
  const existingIndex = this.savedSearches.findIndex(search => search.name === name);
  
  if (existingIndex >= 0) {
    // Update existing
    this.savedSearches[existingIndex] = {
      name,
      query,
      filters,
      alertsEnabled,
      lastChecked: new Date(),
      createdAt: this.savedSearches[existingIndex].createdAt
    };
  } else {
    // Add new
    this.savedSearches.push({
      name,
      query,
      filters,
      alertsEnabled,
      createdAt: new Date()
    });
  }
  
  return this.save();
};

userSchema.methods.removeSavedSearch = function(searchId) {
  this.savedSearches = this.savedSearches.filter(search => 
    search._id.toString() !== searchId.toString()
  );
  return this.save();
};

userSchema.methods.updateActivity = function(activityData) {
  Object.assign(this.activity, activityData, {
    lastActive: new Date()
  });
  
  // Update login streak if logging in
  if (activityData.newLogin) {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (this.activity.lastActive && this.activity.lastActive >= yesterday) {
      this.activity.loginStreak += 1;
    } else {
      this.activity.loginStreak = 1;
    }
    
    if (this.activity.loginStreak > this.activity.longestStreak) {
      this.activity.longestStreak = this.activity.loginStreak;
    }
  }
  
  return this.save();
};

userSchema.methods.addSession = function(sessionId, deviceInfo, ipAddress, userAgent) {
  // Remove old sessions with same sessionId
  this.activeSessions = this.activeSessions.filter(session => 
    session.sessionId !== sessionId
  );
  
  // Add new session
  this.activeSessions.push({
    sessionId,
    deviceInfo,
    ipAddress,
    userAgent,
    createdAt: new Date(),
    lastAccessed: new Date()
  });
  
  // Keep only last 5 sessions
  if (this.activeSessions.length > 5) {
    this.activeSessions = this.activeSessions.slice(-5);
  }
  
  this.lastLogin = new Date();
  this.lastLoginIP = ipAddress;
  
  return this.save();
};

userSchema.methods.updateSessionActivity = function(sessionId) {
  const session = this.activeSessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.lastAccessed = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

userSchema.methods.removeSession = function(sessionId) {
  this.activeSessions = this.activeSessions.filter(session => 
    session.sessionId !== sessionId
  );
  return this.save();
};

userSchema.methods.hasPermission = function(permission) {
  if (this.role === 'admin') return true;
  return this.permissions.includes(permission);
};

userSchema.methods.updatePreferences = function(newPreferences) {
  Object.assign(this.preferences, newPreferences);
  return this.save();
};

userSchema.methods.getRecommendedCategories = function() {
  // Based on search history and wishlist
  const categoryFrequency = {};
  
  // Count from search history
  this.searchHistory.forEach(search => {
    if (search.filters && search.filters.category) {
      categoryFrequency[search.filters.category] = 
        (categoryFrequency[search.filters.category] || 0) + 1;
    }
  });
  
  // Count from preferences
  if (this.preferences.categories) {
    this.preferences.categories.forEach(category => {
      categoryFrequency[category] = 
        (categoryFrequency[category] || 0) + 3; // Weight preferences higher
    });
  }
  
  return Object.entries(categoryFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category]) => category);
};

userSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.status = 'deactivated';
  this.email = `deleted_${this._id}@deleted.com`;
  return this.save();
};

// Static Methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(),
    deletedAt: { $exists: false }
  });
};

userSchema.statics.findByUsername = function(username) {
  return this.findOne({ 
    username: username.toLowerCase(),
    deletedAt: { $exists: false }
  });
};

userSchema.statics.findActiveUsers = function(options = {}) {
  return this.find({ 
    status: 'active',
    emailVerified: true,
    deletedAt: { $exists: false }
  }, null, options);
};

userSchema.statics.getUserStats = function(timeframe = '30d') {
  const timeAgo = new Date();
  timeAgo.setDate(timeAgo.getDate() - (timeframe === '7d' ? 7 : 30));
  
  return this.aggregate([
    {
      $match: {
        deletedAt: { $exists: false }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        newUsers: {
          $sum: {
            $cond: [{ $gte: ['$createdAt', timeAgo] }, 1, 0]
          }
        },
        activeUsers: {
          $sum: {
            $cond: [{ $gte: ['$activity.lastActive', timeAgo] }, 1, 0]
          }
        }
      }
    }
  ]);
};

userSchema.statics.getSubscriptionStats = function() {
  return this.aggregate([
    {
      $match: {
        deletedAt: { $exists: false }
      }
    },
    {
      $group: {
        _id: {
          plan: '$subscription.plan',
          status: '$subscription.status'
        },
        count: { $sum: 1 },
        revenue: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ['$subscription.plan', 'pro'] }, then: 9.99 },
                { case: { $eq: ['$subscription.plan', 'premium'] }, then: 19.99 }
              ],
              default: 0
            }
          }
        }
      }
    }
  ]);
};

userSchema.statics.getEngagementStats = function(timeframe = '30d') {
  const timeAgo = new Date();
  timeAgo.setDate(timeAgo.getDate() - 30);
  
  return this.aggregate([
    {
      $match: {
        deletedAt: { $exists: false },
        'activity.lastActive': { $gte: timeAgo }
      }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        avgSearches: { $avg: '$activity.totalSearches' },
        avgProductViews: { $avg: '$activity.totalProductViews' },
        avgWishlistItems: { $avg: '$activity.totalWishlistItems' },
        avgTimeSpent: { $avg: '$activity.totalTimeSpent' }
      }
    }
  ]);
};

userSchema.statics.findUsersWithExpiringSessions = function() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  return this.find({
    'activeSessions.lastAccessed': { $lt: threeDaysAgo },
    deletedAt: { $exists: false }
  });
};

userSchema.statics.findInactiveUsers = function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    'activity.lastActive': { $lt: cutoffDate },
    status: 'active',
    deletedAt: { $exists: false }
  });
};

userSchema.statics.getUsersByLocation = function(country, region = null) {
  const query = {
    'location.country': country,
    deletedAt: { $exists: false }
  };
  
  if (region) {
    query['location.region'] = region;
  }
  
  return this.find(query);
};

userSchema.statics.findSimilarUsers = function(userId, limit = 10) {
  return this.findById(userId)
    .then(user => {
      if (!user) return [];
      
      const pipeline = [
        {
          $match: {
            _id: { $ne: user._id },
            deletedAt: { $exists: false },
            status: 'active'
          }
        },
        {
          $addFields: {
            similarity: {
              $add: [
                // Category preference similarity
                {
                  $size: {
                    $setIntersection: [
                      { $ifNull: ['$preferences.categories', []] },
                      user.preferences.categories || []
                    ]
                  }
                },
                // Location similarity
                {
                  $cond: [
                    { $eq: ['$location.country', user.location?.country] },
                    2,
                    0
                  ]
                },
                // Age group similarity (based on account age)
                {
                  $cond: [
                    {
                      $and: [
                        { $gte: ['$createdAt', new Date(user.createdAt.getTime() - 365 * 24 * 60 * 60 * 1000)] },
                        { $lte: ['$createdAt', new Date(user.createdAt.getTime() + 365 * 24 * 60 * 60 * 1000)] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              ]
            }
          }
        },
        {
          $match: {
            similarity: { $gt: 0 }
          }
        },
        {
          $sort: { similarity: -1 }
        },
        {
          $limit: limit
        }
      ];
      
      return this.aggregate(pipeline);
    });
};

// Query helpers
userSchema.query.active = function() {
  return this.where({ 
    status: 'active', 
    emailVerified: true,
    deletedAt: { $exists: false }
  });
};

userSchema.query.premium = function() {
  return this.where({ 
    'subscription.plan': { $in: ['pro', 'premium'] },
    'subscription.status': 'active'
  });
};

userSchema.query.recentlyActive = function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return this.where({ 'activity.lastActive': { $gte: cutoffDate } });
};

userSchema.query.byRole = function(role) {
  return this.where({ role });
};

userSchema.query.verified = function() {
  return this.where({ emailVerified: true });
};

userSchema.query.withWishlist = function() {
  return this.where({ 'wishlist.0': { $exists: true } });
};

// Export the model
module.exports = mongoose.model('User', userSchema);
