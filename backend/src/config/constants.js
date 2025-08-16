/**
 * Application Constants
 * Centralized configuration and constant values
 */

// API Configuration
const API_VERSION = '1.0.0';
const API_PREFIX = '/api';

// Rate Limiting Configuration
const RATE_LIMITS = {
  API_WINDOW: 15 * 60 * 1000, // 15 minutes
  API_MAX: 100, // requests per window
  
  SEARCH_WINDOW: 15 * 60 * 1000, // 15 minutes
  SEARCH_MAX: 10000, // search requests per window - increased for development
  
  ANALYTICS_WINDOW: 60 * 60 * 1000, // 1 hour
  ANALYTICS_MAX: 200, // analytics requests per window
  
  SENTIMENT_WINDOW: 10 * 60 * 1000, // 10 minutes
  SENTIMENT_MAX: 30, // sentiment requests per window
};

// Cache Configuration
const CACHE_KEYS = {
  SEARCH_RESULTS: 'search:results',
  PRODUCT_DETAILS: 'product:details',
  SENTIMENT_DATA: 'sentiment:data',
  TRENDING_SEARCHES: 'trending:searches',
  POPULAR_CATEGORIES: 'popular:categories',
  USER_PREFERENCES: 'user:preferences',
  ANALYTICS_DATA: 'analytics:data'
};

const CACHE_TTL = {
  SEARCH_RESULTS: 5 * 60, // 5 minutes
  PRODUCT_DETAILS: 30 * 60, // 30 minutes
  SENTIMENT_DATA: 15 * 60, // 15 minutes
  TRENDING_SEARCHES: 60 * 60, // 1 hour
  POPULAR_CATEGORIES: 2 * 60 * 60, // 2 hours
  USER_PREFERENCES: 24 * 60 * 60, // 24 hours
  ANALYTICS_DATA: 10 * 60, // 10 minutes
  SHORT: 60, // 1 minute
  MEDIUM: 5 * 60, // 5 minutes
  LONG: 60 * 60, // 1 hour
  VERY_LONG: 24 * 60 * 60 // 24 hours
};

// Product Categories
const PRODUCT_CATEGORIES = {
  SKINCARE_BEAUTY: {
    id: 'skincare-beauty',
    name: 'Skincare & Beauty',
    keywords: ['skincare', 'beauty', 'cosmetics', 'makeup', 'serum', 'cream', 'moisturizer'],
    subcategories: [
      'Anti-aging',
      'Acne Treatment',
      'Sensitive Skin',
      'Natural/Organic',
      'K-beauty',
      'Makeup',
      'Hair Care'
    ]
  },
  TECH_ACCESSORIES: {
    id: 'tech-accessories',
    name: 'Tech Accessories',
    keywords: ['tech', 'technology', 'wireless', 'bluetooth', 'charger', 'cable', 'case'],
    subcategories: [
      'Phone Accessories',
      'Audio Equipment',
      'Charging Solutions',
      'Computer Accessories',
      'Gaming Gear',
      'Smart Home',
      'Wearables'
    ]
  },
  MENS_GROOMING: {
    id: 'mens-grooming',
    name: "Men's Grooming",
    keywords: ['mens', 'grooming', 'beard', 'shaving', 'cologne', 'hair'],
    subcategories: [
      'Beard Care',
      'Shaving',
      'Hair Styling',
      'Skin Care',
      'Fragrances',
      'Body Care',
      'Tools & Accessories'
    ]
  },
  FITNESS_WELLNESS: {
    id: 'fitness-wellness',
    name: 'Fitness & Wellness',
    keywords: ['fitness', 'workout', 'exercise', 'health', 'wellness', 'nutrition'],
    subcategories: [
      'Home Gym',
      'Cardio Equipment',
      'Strength Training',
      'Yoga & Pilates',
      'Sports Accessories',
      'Recovery Tools',
      'Supplements'
    ]
  },
  HOME_KITCHEN: {
    id: 'home-kitchen',
    name: 'Home & Kitchen',
    keywords: ['home', 'kitchen', 'cooking', 'appliance', 'gadget', 'utensil'],
    subcategories: [
      'Smart Kitchen',
      'Cooking Tools',
      'Storage & Organization',
      'Small Appliances',
      'Coffee & Tea',
      'Cleaning Supplies',
      'Home Decor'
    ]
  }
};

// Sentiment Analysis Configuration
const SENTIMENT_LABELS = {
  HIGHLY_REGARDED: {
    id: 'highly-regarded',
    name: 'Highly Beloved',
    description: 'Passionate community favorite',
    color: '#166534',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    emoji: '✨',
    scoreRange: [0.7, 1.0]
  },
  WELL_REGARDED: {
    id: 'well-regarded',
    name: 'Well Liked',
    description: 'Strong positive sentiment',
    color: '#15803d',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    emoji: '👍',
    scoreRange: [0.3, 0.69]
  },
  MIXED_REVIEWS: {
    id: 'mixed-reviews',
    name: 'Mixed Reception',
    description: 'Varied opinions and experiences',
    color: '#a16207',
    backgroundColor: '#fefce8',
    borderColor: '#fde047',
    emoji: '🤔',
    scoreRange: [-0.29, 0.29]
  },
  POORLY_REGARDED: {
    id: 'poorly-regarded',
    name: 'Concerning',
    description: 'Notable negative feedback',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    emoji: '⚠️',
    scoreRange: [-0.69, -0.3]
  },
  HIGHLY_CRITICIZED: {
    id: 'highly-criticized',
    name: 'Widely Criticized',
    description: 'Strong negative sentiment',
    color: '#991b1b',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    emoji: '❌',
    scoreRange: [-1.0, -0.7]
  },
  INSUFFICIENT_DATA: {
    id: 'insufficient-data',
    name: 'Insufficient Data',
    description: 'Not enough reviews for analysis',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    emoji: '📊',
    scoreRange: null
  }
};

// Search Configuration
const SEARCH_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_SEARCH_RESULTS: 1000,
  SUGGESTION_LIMIT: 10,
  TRENDING_LIMIT: 50,
  POPULAR_CATEGORIES_LIMIT: 20,
  
  // Search weights for relevance scoring
  RELEVANCE_WEIGHTS: {
    TITLE_MATCH: 3.0,
    DESCRIPTION_MATCH: 2.0,
    CATEGORY_MATCH: 1.5,
    TAG_MATCH: 1.0,
    BRAND_MATCH: 2.5,
    SENTIMENT_BOOST: 0.5
  },
  
  // Minimum search query length
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 200
};

// Error Codes
const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  
  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Search
  SEARCH_ERROR: 'SEARCH_ERROR',
  INVALID_SEARCH_QUERY: 'INVALID_SEARCH_QUERY',
  
  // Cache
  CACHE_ERROR: 'CACHE_ERROR',
  
  // General
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// Performance Thresholds
const PERFORMANCE_THRESHOLDS = {
  SLOW_REQUEST_THRESHOLD: 2000, // 2 seconds
  VERY_SLOW_REQUEST_THRESHOLD: 5000, // 5 seconds
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_RESPONSE_SIZE: 50 * 1024 * 1024, // 50MB
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  REQUEST_TIMEOUT: 30000 // 30 seconds
};

// Feature Flags
const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === 'true',
  ENABLE_CACHING: process.env.ENABLE_CACHING === 'true',
  ENABLE_SENTIMENT_ANALYSIS: process.env.ENABLE_SENTIMENT_ANALYSIS === 'true',
  ENABLE_RECOMMENDATIONS: process.env.ENABLE_RECOMMENDATIONS === 'true',
  ENABLE_USER_ACCOUNTS: process.env.ENABLE_USER_ACCOUNTS === 'true',
  ENABLE_WISHLIST: process.env.ENABLE_WISHLIST === 'true',
  ENABLE_PRICE_TRACKING: process.env.ENABLE_PRICE_TRACKING === 'true',
  ENABLE_REVIEWS_SCRAPING: process.env.ENABLE_REVIEWS_SCRAPING === 'true'
};

// Trending Analysis
const TRENDING_CONFIG = {
  TIME_WINDOWS: {
    HOURLY: 60 * 60 * 1000,
    DAILY: 24 * 60 * 60 * 1000,
    WEEKLY: 7 * 24 * 60 * 60 * 1000,
    MONTHLY: 30 * 24 * 60 * 60 * 1000
  },
  
  TRENDING_TYPES: {
    UP: 'up',
    DOWN: 'down',
    STABLE: 'stable',
    NEW: 'new'
  },
  
  // Minimum thresholds for trending analysis
  MIN_MENTIONS: 10,
  MIN_SEARCHES: 5,
  TRENDING_THRESHOLD: 0.2 // 20% change
};

// External API Configuration
const EXTERNAL_APIS = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Rate limits for external APIs
  RATE_LIMITS: {
    AMAZON: 100, // per hour
    SHOPIFY: 200, // per hour
    GOOGLE: 1000, // per day
    TWITTER: 300, // per 15 minutes
    REDDIT: 60 // per minute
  }
};

// Logging Configuration
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// Database Configuration
const DATABASE_CONFIG = {
  MAX_POOL_SIZE: 10,
  MIN_POOL_SIZE: 2,
  CONNECT_TIMEOUT: 30000,
  SOCKET_TIMEOUT: 30000,
  SELECTION_TIMEOUT: 30000,
  
  // Collection names
  COLLECTIONS: {
    PRODUCTS: 'products',
    SEARCHES: 'searches',
    SENTIMENT: 'sentiment',
    ANALYTICS: 'analytics',
    USERS: 'users',
    SESSIONS: 'sessions'
  }
};

// Suggested Searches by Category
const SUGGESTED_SEARCHES = {
  DEFAULT: [
    'vitamin C serums for dark spots',
    'wireless earbuds under $100',
    'beard oils for coarse hair',
    'resistance bands for home workouts',
    'smart kitchen gadgets under $50',
    'natural skincare for sensitive skin'
  ],
  
  SKINCARE_BEAUTY: [
    'anti-aging serums',
    'acne treatment products',
    'natural moisturizers',
    'K-beauty essentials',
    'sensitive skin products',
    'vitamin C serums'
  ],
  
  TECH_ACCESSORIES: [
    'iPhone accessories',
    'wireless charging pads',
    'bluetooth speakers',
    'gaming headsets',
    'USB-C cables',
    'phone cases'
  ],
  
  MENS_GROOMING: [
    'beard growth oils',
    'electric shavers',
    'mens moisturizers',
    'hair styling products',
    'cologne recommendations',
    'grooming kits'
  ],
  
  FITNESS_WELLNESS: [
    'home gym equipment',
    'yoga accessories',
    'protein shakers',
    'resistance bands',
    'fitness trackers',
    'recovery tools'
  ],
  
  HOME_KITCHEN: [
    'smart kitchen gadgets',
    'coffee accessories',
    'storage containers',
    'cooking utensils',
    'small appliances',
    'organization tools'
  ]
};

module.exports = {
  API_VERSION,
  API_PREFIX,
  RATE_LIMITS,
  CACHE_KEYS,
  CACHE_TTL,
  PRODUCT_CATEGORIES,
  SENTIMENT_LABELS,
  SEARCH_CONFIG,
  ERROR_CODES,
  HTTP_STATUS,
  PERFORMANCE_THRESHOLDS,
  FEATURE_FLAGS,
  TRENDING_CONFIG,
  EXTERNAL_APIS,
  LOG_LEVELS,
  DATABASE_CONFIG,
  SUGGESTED_SEARCHES
};
