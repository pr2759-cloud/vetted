/**
 * Product Service
 * Handles product data, recommendations, and product-related operations
 */

const cacheService = require('./cacheService');
const { logger } = require('../utils/logger');
const { 
  CACHE_KEYS, 
  CACHE_TTL, 
  PRODUCT_CATEGORIES,
  TRENDING_CONFIG 
} = require('../config/constants');

class ProductService {
  constructor() {
    this.products = new Map();
    this.productViews = new Map();
    this.wishlistData = new Map();
    this.initializeSampleData();
  }

  /**
   * Initialize with sample product data
   */
  initializeSampleData() {
    const sampleProducts = [
      {
        id: '1',
        name: 'Hyaluronic Acid Face Serum',
        description: 'Intensive hydrating serum with hyaluronic acid for all skin types. Helps retain moisture and improve skin texture.',
        price: '$28–$35',
        priceRange: { min: 28, max: 35 },
        rating: 94,
        reviewCount: 2341,
        tags: ['Hydrating', 'Sensitive-skin', 'Anti-aging', 'Dermatologist-tested'],
        category: 'skincare-beauty',
        brand: 'GlowLab',
        images: ['/images/hyaluronic-serum.jpg'],
        availability: {
          inStock: true,
          retailers: [
            { name: 'Amazon', price: 28.99, url: '#', inStock: true },
            { name: 'Sephora', price: 32.00, url: '#', inStock: true },
            { name: 'Ulta', price: 30.50, url: '#', inStock: false }
          ]
        },
        features: [
          'Multiple molecular weights of hyaluronic acid',
          'Fragrance-free and paraben-free',
          'Suitable for sensitive skin',
          'Cruelty-free and vegan'
        ],
        specifications: {
          size: '30ml',
          ingredients: ['Hyaluronic Acid', 'Vitamin B5', 'Glycerin'],
          skinType: 'All skin types',
          concerns: ['Dehydration', 'Fine lines', 'Dullness']
        }
      },
      {
        id: '2',
        name: 'Wireless Noise-Canceling Earbuds',
        description: 'Premium wireless earbuds with active noise cancellation and superior sound quality.',
        price: '$79–$89',
        priceRange: { min: 79, max: 89 },
        rating: 91,
        reviewCount: 1856,
        tags: ['ANC', 'USB-C', 'Wireless', 'Premium-audio'],
        category: 'tech-accessories',
        brand: 'SoundCore Pro',
        images: ['/images/wireless-earbuds.jpg'],
        availability: {
          inStock: true,
          retailers: [
            { name: 'Amazon', price: 79.99, url: '#', inStock: true },
            { name: 'Best Buy', price: 84.99, url: '#', inStock: true },
            { name: 'Target', price: 82.50, url: '#', inStock: true }
          ]
        },
        features: [
          'Active Noise Cancellation',
          '8-hour battery life + 24-hour case',
          'IPX7 water resistance',
          'Touch controls with voice assistant'
        ],
        specifications: {
          batteryLife: '8 hours + 24 hours case',
          connectivity: 'Bluetooth 5.2',
          waterRating: 'IPX7',
          weight: '5.2g each'
        }
      },
      {
        id: '3',
        name: 'Beard Growth Oil Complex',
        description: 'Natural beard oil blend designed to promote healthy beard growth and soften coarse hair.',
        price: '$24–$32',
        priceRange: { min: 24, max: 32 },
        rating: 87,
        reviewCount: 934,
        tags: ['Natural', 'Jojoba-based', 'Beard-care', 'Essential-oils'],
        category: 'mens-grooming',
        brand: "Gentleman's Choice",
        images: ['/images/beard-oil.jpg'],
        availability: {
          inStock: true,
          retailers: [
            { name: 'Amazon', price: 24.99, url: '#', inStock: true },
            { name: 'Walmart', price: 28.50, url: '#', inStock: true },
            { name: 'CVS', price: 31.99, url: '#', inStock: false }
          ]
        },
        features: [
          'Jojoba and argan oil base',
          'Essential oils for scent',
          'Promotes healthy growth',
          'Reduces itchiness and flakes'
        ],
        specifications: {
          size: '50ml',
          ingredients: ['Jojoba Oil', 'Argan Oil', 'Vitamin E', 'Essential Oils'],
          scent: 'Cedarwood & Bergamot',
          application: 'Daily use'
        }
      },
      {
        id: '4',
        name: 'Resistance Band Set with Handles',
        description: 'Complete resistance band workout set for home fitness with multiple resistance levels.',
        price: '$35–$45',
        priceRange: { min: 35, max: 45 },
        rating: 89,
        reviewCount: 1247,
        tags: ['Home-workout', 'Portable', 'Full-body', 'Resistance-training'],
        category: 'fitness-wellness',
        brand: 'FlexFit Pro',
        images: ['/images/resistance-bands.jpg'],
        availability: {
          inStock: true,
          retailers: [
            { name: 'Amazon', price: 35.99, url: '#', inStock: true },
            { name: 'Dick\'s Sporting Goods', price: 42.99, url: '#', inStock: true },
            { name: 'Walmart', price: 38.50, url: '#', inStock: true }
          ]
        },
        features: [
          '5 resistance levels (10-50 lbs)',
          'Comfortable foam handles',
          'Door anchor included',
          'Workout guide and app access'
        ],
        specifications: {
          resistanceLevels: '5 bands (10-50 lbs)',
          material: 'Natural latex',
          handles: 'Foam-padded',
          warranty: '1 year'
        }
      },
      {
        id: '5',
        name: 'Smart Kitchen Scale with App',
        description: 'Precision kitchen scale with smartphone app for nutrition tracking and recipe scaling.',
        price: '$42–$55',
        priceRange: { min: 42, max: 55 },
        rating: 92,
        reviewCount: 1678,
        tags: ['Bluetooth', 'Nutrition-tracking', 'Smart-kitchen', 'Precision'],
        category: 'home-kitchen',
        brand: 'KitchenTech',
        images: ['/images/smart-scale.jpg'],
        availability: {
          inStock: true,
          retailers: [
            { name: 'Amazon', price: 42.99, url: '#', inStock: true },
            { name: 'Williams Sonoma', price: 54.99, url: '#', inStock: true },
            { name: 'Target', price: 48.50, url: '#', inStock: false }
          ]
        },
        features: [
          'Precision to 1g accuracy',
          'Bluetooth app connectivity',
          'Nutrition database of 200k+ foods',
          'Recipe scaling and meal planning'
        ],
        specifications: {
          capacity: '5kg / 11lbs',
          precision: '1g',
          connectivity: 'Bluetooth 5.0',
          battery: '3 AAA batteries'
        }
      },
      {
        id: '6',
        name: 'Retinol Anti-Aging Night Serum',
        description: 'Advanced retinol serum formulated to reduce fine lines, improve skin texture, and promote cellular turnover.',
        price: '$32–$42',
        priceRange: { min: 32, max: 42 },
        rating: 89,
        reviewCount: 1923,
        tags: ['Retinol', 'Anti-aging', 'Night-treatment', 'Fine-lines', 'Dermatologist-recommended'],
        category: 'skincare-beauty',
        brand: 'SkinCeuticals Pro',
        images: ['/images/retinol-serum.jpg'],
        availability: {
          inStock: true,
          retailers: [
            { name: 'Amazon', price: 32.99, url: '#', inStock: true },
            { name: 'Sephora', price: 39.00, url: '#', inStock: true },
            { name: 'Dermstore', price: 41.50, url: '#', inStock: true }
          ]
        },
        features: [
          '0.5% encapsulated retinol',
          'Gradual release formula',
          'Reduces fine lines and wrinkles',
          'Improves skin texture and tone'
        ],
        specifications: {
          size: '30ml',
          ingredients: ['Retinol', 'Hyaluronic Acid', 'Squalane', 'Niacinamide'],
          skinType: 'All skin types (start slowly)',
          concerns: ['Fine lines', 'Wrinkles', 'Uneven texture', 'Aging']
        }
      },
      {
        id: '7',
        name: 'Broad Spectrum SPF 50 Sunscreen',
        description: 'Lightweight, non-greasy broad spectrum sunscreen with SPF 50 protection. Water-resistant formula for daily use.',
        price: '$18–$25',
        priceRange: { min: 18, max: 25 },
        rating: 91,
        reviewCount: 2847,
        tags: ['SPF50', 'Broad-spectrum', 'Water-resistant', 'Daily-protection', 'Non-greasy'],
        category: 'skincare-beauty',
        brand: 'SunGuard Pro',
        images: ['/images/sunscreen-spf50.jpg'],
        availability: {
          inStock: true,
          retailers: [
            { name: 'Amazon', price: 18.99, url: '#', inStock: true },
            { name: 'CVS', price: 22.50, url: '#', inStock: true },
            { name: 'Walgreens', price: 24.99, url: '#', inStock: true }
          ]
        },
        features: [
          'Broad spectrum UV protection',
          'Water-resistant up to 80 minutes',
          'Lightweight, non-greasy formula',
          'Suitable for face and body'
        ],
        specifications: {
          size: '100ml',
          spf: 'SPF 50',
          ingredients: ['Zinc Oxide', 'Octinoxate', 'Vitamin E', 'Aloe Vera'],
          skinType: 'All skin types',
          concerns: ['Sun protection', 'UV damage', 'Daily care']
        }
      },
      {
        id: '8',
        name: 'Mineral Zinc Oxide Sunscreen SPF 30',
        description: 'Natural mineral sunscreen with zinc oxide. Reef-safe, chemical-free formula perfect for sensitive skin.',
        price: '$22–$28',
        priceRange: { min: 22, max: 28 },
        rating: 88,
        reviewCount: 1654,
        tags: ['Mineral', 'Zinc-oxide', 'SPF30', 'Reef-safe', 'Chemical-free', 'Sensitive-skin'],
        category: 'skincare-beauty',
        brand: 'Natural Shield',
        images: ['/images/mineral-sunscreen.jpg'],
        availability: {
          inStock: true,
          retailers: [
            { name: 'Amazon', price: 22.99, url: '#', inStock: true },
            { name: 'Target', price: 25.50, url: '#', inStock: true },
            { name: 'Whole Foods', price: 27.99, url: '#', inStock: false }
          ]
        },
        features: [
          '100% mineral active ingredients',
          'Reef-safe and ocean-friendly',
          'No chemical UV filters',
          'Gentle for sensitive skin'
        ],
        specifications: {
          size: '75ml',
          spf: 'SPF 30',
          ingredients: ['Zinc Oxide', 'Titanium Dioxide', 'Coconut Oil', 'Shea Butter'],
          skinType: 'Sensitive and all skin types',
          concerns: ['Sun protection', 'Sensitive skin', 'Natural care']
        }
      },
      {
        id: '9',
        name: 'Sport Sunscreen Lotion SPF 45',
        description: 'High-performance sport sunscreen designed for active lifestyles. Sweat and water-resistant formula.',
        price: '$16–$22',
        priceRange: { min: 16, max: 22 },
        rating: 93,
        reviewCount: 3245,
        tags: ['Sport', 'SPF45', 'Sweat-resistant', 'Active-lifestyle', 'Long-lasting'],
        category: 'skincare-beauty',
        brand: 'Athletic Sun',
        images: ['/images/sport-sunscreen.jpg'],
        availability: {
          inStock: true,
          retailers: [
            { name: 'Amazon', price: 16.99, url: '#', inStock: true },
            { name: 'Dick\'s Sporting Goods', price: 19.99, url: '#', inStock: true },
            { name: 'Walmart', price: 21.50, url: '#', inStock: true }
          ]
        },
        features: [
          'Sweat and water-resistant up to 80 minutes',
          'Fast-absorbing, non-sticky formula',
          'Ideal for outdoor sports and activities',
          'Photostable UV filters'
        ],
        specifications: {
          size: '120ml',
          spf: 'SPF 45',
          ingredients: ['Avobenzone', 'Homosalate', 'Octisalate', 'Octocrylene'],
          skinType: 'All skin types',
          concerns: ['Athletic protection', 'Long-lasting coverage', 'Active lifestyle']
        }
      }
    ];

    sampleProducts.forEach(product => {
      this.products.set(product.id, product);
    });

    logger.info(`Initialized ${sampleProducts.length} sample products`);
  }

  /**
   * Get all products (with optional filtering)
   */
  async getAllProducts(filters = {}) {
    try {
      let products = Array.from(this.products.values());

      // Apply filters if provided
      if (filters.category) {
        products = products.filter(p => p.category === filters.category);
      }

      if (filters.minPrice || filters.maxPrice) {
        products = products.filter(p => {
          const price = p.priceRange ? p.priceRange.min : this.extractPrice(p.price);
          const min = filters.minPrice || 0;
          const max = filters.maxPrice || Infinity;
          return price >= min && price <= max;
        });
      }

      // Transform products to frontend format
      return products.map(product => this.transformProductForFrontend(product));

    } catch (error) {
      logger.error('Get all products error:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId) {
    try {
      const cacheKey = `${CACHE_KEYS.PRODUCT_DETAILS}:${productId}`;
      
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Get from data store
      const product = this.products.get(productId);
      if (!product) {
        return null;
      }

      // Transform and enhance product with additional data
      const transformedProduct = this.transformProductForFrontend(product);
      const enhancedProduct = {
        ...transformedProduct,
        viewCount: this.getProductViewCount(productId),
        lastViewed: this.getLastViewed(productId),
        relatedProducts: await this.getRelatedProductIds(productId)
      };

      // Cache for 30 minutes
      await cacheService.set(cacheKey, enhancedProduct, CACHE_TTL.MEDIUM * 6);

      return enhancedProduct;

    } catch (error) {
      logger.error('Get product by ID error:', { productId, error });
      throw error;
    }
  }

  /**
   * Get multiple products by IDs
   */
  async getProductsBatch(productIds, options = {}) {
    try {
      const { includeSentiment = false } = options;
      const products = [];

      for (const id of productIds) {
        const product = await this.getProductById(id);
        if (product) {
          products.push(product);
        }
      }

      return products;

    } catch (error) {
      logger.error('Get products batch error:', error);
      throw error;
    }
  }

  /**
   * Get product recommendations
   */
  async getProductRecommendations(productId, options = {}) {
    try {
      const { 
        limit = 10, 
        type = 'similar',
        userId,
        excludeViewed = false 
      } = options;

      const cacheKey = `recommendations:${productId}:${type}:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const baseProduct = await this.getProductById(productId);
      if (!baseProduct) {
        return [];
      }

      let recommendations = [];

      switch (type) {
        case 'similar':
          recommendations = await this.getSimilarProducts(baseProduct, limit);
          break;
        case 'complementary':
          recommendations = await this.getComplementaryProducts(baseProduct, limit);
          break;
        case 'trending':
          recommendations = await this.getTrendingInCategory(baseProduct.category, limit);
          break;
        case 'collaborative':
          recommendations = await this.getCollaborativeRecommendations(productId, userId, limit);
          break;
        default:
          recommendations = await this.getSimilarProducts(baseProduct, limit);
      }

      // Filter out viewed products if requested
      if (excludeViewed && userId) {
        const viewedProducts = await this.getUserViewedProducts(userId);
        recommendations = recommendations.filter(p => 
          !viewedProducts.includes(p.id)
        );
      }

      // Cache for 1 hour
      await cacheService.set(cacheKey, recommendations, CACHE_TTL.LONG);

      return recommendations;

    } catch (error) {
      logger.error('Get product recommendations error:', { productId, error });
      throw error;
    }
  }

  /**
   * Get similar products based on category, tags, and price range
   */
  async getSimilarProducts(baseProduct, limit) {
    try {
      const allProducts = await this.getAllProducts();
      
      const scored = allProducts
        .filter(p => p.id !== baseProduct.id)
        .map(product => ({
          ...product,
          similarityScore: this.calculateSimilarityScore(baseProduct, product)
        }))
        .filter(p => p.similarityScore > 0.3)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);

      return scored;

    } catch (error) {
      logger.error('Get similar products error:', error);
      return [];
    }
  }

  /**
   * Calculate similarity score between two products
   */
  calculateSimilarityScore(product1, product2) {
    let score = 0;

    // Category match (highest weight)
    if (product1.category === product2.category) {
      score += 0.5;
    }

    // Brand match
    if (product1.brand === product2.brand) {
      score += 0.2;
    }

    // Tag overlap
    const tags1 = product1.tags || [];
    const tags2 = product2.tags || [];
    const commonTags = tags1.filter(tag => tags2.includes(tag));
    const tagScore = commonTags.length / Math.max(tags1.length, tags2.length, 1);
    score += tagScore * 0.2;

    // Price range similarity
    const price1 = product1.priceRange ? product1.priceRange.min : this.extractPrice(product1.price);
    const price2 = product2.priceRange ? product2.priceRange.min : this.extractPrice(product2.price);
    const priceDiff = Math.abs(price1 - price2) / Math.max(price1, price2, 1);
    const priceScore = Math.max(0, 1 - priceDiff);
    score += priceScore * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Get complementary products (products that go well together)
   */
  async getComplementaryProducts(baseProduct, limit) {
    try {
      const allProducts = await this.getAllProducts();
      
      // Define complementary relationships
      const complementaryMap = {
        'skincare-beauty': ['skincare-beauty'],
        'tech-accessories': ['tech-accessories'],
        'mens-grooming': ['mens-grooming'],
        'fitness-wellness': ['fitness-wellness'],
        'home-kitchen': ['home-kitchen']
      };

      const complementaryCategories = complementaryMap[baseProduct.category] || [];
      
      const complementary = allProducts
        .filter(p => p.id !== baseProduct.id)
        .filter(p => complementaryCategories.includes(p.category))
        .map(product => ({
          ...product,
          complementaryScore: this.calculateComplementaryScore(baseProduct, product)
        }))
        .sort((a, b) => b.complementaryScore - a.complementaryScore)
        .slice(0, limit);

      return complementary;

    } catch (error) {
      logger.error('Get complementary products error:', error);
      return [];
    }
  }

  /**
   * Calculate complementary score
   */
  calculateComplementaryScore(product1, product2) {
    // This is a simplified implementation
    // In a real system, this would be based on purchase patterns and user behavior
    let score = 0.5; // Base complementary score

    // Different price ranges might be more complementary
    const price1 = product1.priceRange ? product1.priceRange.min : this.extractPrice(product1.price);
    const price2 = product2.priceRange ? product2.priceRange.min : this.extractPrice(product2.price);
    
    if (Math.abs(price1 - price2) > 20) {
      score += 0.3; // Different price points can be complementary
    }

    // Higher rated products are better complements
    score += (product2.rating || 0) / 100 * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Get trending products in category
   */
  async getTrendingInCategory(category, limit) {
    try {
      const cacheKey = `trending:${category}:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const categoryProducts = await this.getAllProducts({ category });
      
      // Sort by view count and recent activity
      const trending = categoryProducts
        .map(product => ({
          ...product,
          trendingScore: this.calculateTrendingScore(product)
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);

      await cacheService.set(cacheKey, trending, CACHE_TTL.MEDIUM);
      return trending;

    } catch (error) {
      logger.error('Get trending in category error:', error);
      return [];
    }
  }

  /**
   * Calculate trending score based on views and recency
   */
  calculateTrendingScore(product) {
    const viewCount = this.getProductViewCount(product.id);
    const lastViewed = this.getLastViewed(product.id);
    const recency = lastViewed ? (Date.now() - lastViewed) / (24 * 60 * 60 * 1000) : 30; // days ago
    
    // Higher views and more recent activity = higher trending score
    const viewScore = Math.log(viewCount + 1) / 10;
    const recencyScore = Math.max(0, 1 - recency / 7); // Decay over a week
    const ratingScore = (product.rating || 0) / 100;
    
    return viewScore + recencyScore + ratingScore;
  }

  /**
   * Get collaborative filtering recommendations
   */
  async getCollaborativeRecommendations(productId, userId, limit) {
    try {
      // Mock implementation - in a real system, this would use ML algorithms
      // based on user behavior patterns
      const baseProduct = await this.getProductById(productId);
      if (!baseProduct) return [];

      return await this.getSimilarProducts(baseProduct, limit);

    } catch (error) {
      logger.error('Get collaborative recommendations error:', error);
      return [];
    }
  }

  /**
   * Get product reviews
   */
  async getProductReviews(productId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'date',
        sortOrder = 'desc',
        sentiment,
        verified = false
      } = options;

      // Mock reviews data - replace with actual database
      const mockReviews = this.generateMockReviews(productId, 100);
      
      let filtered = [...mockReviews];

      // Apply filters
      if (sentiment) {
        filtered = filtered.filter(review => review.sentiment === sentiment);
      }

      if (verified) {
        filtered = filtered.filter(review => review.verified);
      }

      // Apply sorting
      filtered.sort((a, b) => {
        const direction = sortOrder === 'desc' ? -1 : 1;
        switch (sortBy) {
          case 'date':
            return (new Date(a.date) - new Date(b.date)) * direction;
          case 'rating':
            return (a.rating - b.rating) * direction;
          case 'helpful':
            return (a.helpfulCount - b.helpfulCount) * direction;
          default:
            return 0;
        }
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedReviews = filtered.slice(startIndex, startIndex + limit);

      return {
        reviews: paginatedReviews,
        total: filtered.length,
        page,
        limit
      };

    } catch (error) {
      logger.error('Get product reviews error:', { productId, error });
      throw error;
    }
  }

  /**
   * Generate mock reviews for demo purposes
   */
  generateMockReviews(productId, count) {
    const reviews = [];
    const product = this.products.get(productId);
    
    if (!product) return reviews;

    for (let i = 0; i < count; i++) {
      reviews.push({
        id: `${productId}-review-${i}`,
        productId,
        userId: `user-${Math.floor(Math.random() * 1000)}`,
        userName: `User${Math.floor(Math.random() * 1000)}`,
        rating: Math.floor(Math.random() * 5) + 1,
        title: this.getRandomReviewTitle(),
        content: this.getRandomReviewContent(product.category),
        date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        verified: Math.random() > 0.3,
        helpfulCount: Math.floor(Math.random() * 50),
        sentiment: this.getRandomSentiment()
      });
    }

    return reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Get random review title
   */
  getRandomReviewTitle() {
    const titles = [
      'Great product!',
      'Exceeded expectations',
      'Good value for money',
      'Not what I expected',
      'Amazing quality',
      'Would recommend',
      'Perfect for my needs',
      'Could be better',
      'Excellent purchase',
      'Love this product'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  /**
   * Get random review content based on category
   */
  getRandomReviewContent(category) {
    const contentMap = {
      'skincare-beauty': [
        'This serum has made a noticeable difference in my skin texture.',
        'Great for sensitive skin, no irritation at all.',
        'Absorbed quickly and left my skin feeling hydrated.',
        'I\'ve been using this for 3 months and love the results.'
      ],
      'tech-accessories': [
        'Sound quality is excellent for the price point.',
        'Battery life is as advertised, very convenient.',
        'Easy to pair and stays connected reliably.',
        'Build quality feels premium and durable.'
      ],
      'mens-grooming': [
        'Great scent and makes my beard much softer.',
        'A little goes a long way, good value.',
        'Reduced the itchiness significantly.',
        'High quality ingredients, worth the price.'
      ],
      'fitness-wellness': [
        'Perfect for home workouts, very versatile.',
        'Good resistance levels for all fitness levels.',
        'Compact and easy to store when not in use.',
        'Great build quality, feels like it will last.'
      ],
      'home-kitchen': [
        'Very accurate and the app is user-friendly.',
        'Makes meal prep and portion control much easier.',
        'Sleek design that looks great on the counter.',
        'Battery life is excellent, very convenient.'
      ]
    };

    const contents = contentMap[category] || ['Good product overall.'];
    return contents[Math.floor(Math.random() * contents.length)];
  }

  /**
   * Get random sentiment
   */
  getRandomSentiment() {
    const sentiments = ['positive', 'negative', 'neutral'];
    const weights = [0.7, 0.2, 0.1]; // Most reviews are positive
    
    const random = Math.random();
    let sum = 0;
    
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random <= sum) {
        return sentiments[i];
      }
    }
    
    return 'positive';
  }

  /**
   * Get product price history
   */
  async getProductPriceHistory(productId, options = {}) {
    try {
      const { timeframe = '30d', retailer } = options;
      
      // Mock price history - replace with actual database
      const product = await this.getProductById(productId);
      if (!product) return [];

      const days = this.parseTimeframeToDays(timeframe);
      const history = [];
      const basePrice = product.priceRange ? product.priceRange.min : this.extractPrice(product.price);

      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Add some price variation
        const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
        const price = basePrice * (1 + variation);

        history.push({
          date: date.toISOString().split('T')[0],
          price: Math.round(price * 100) / 100,
          retailer: retailer || 'Average',
          currency: 'USD'
        });
      }

      return history;

    } catch (error) {
      logger.error('Get product price history error:', { productId, error });
      throw error;
    }
  }

  /**
   * Parse timeframe string to days
   */
  parseTimeframeToDays(timeframe) {
    const match = timeframe.match(/(\d+)([dwmy])/);
    if (!match) return 30;

    const [, num, unit] = match;
    const number = parseInt(num);

    switch (unit) {
      case 'd': return number;
      case 'w': return number * 7;
      case 'm': return number * 30;
      case 'y': return number * 365;
      default: return 30;
    }
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(options = {}) {
    try {
      const { category, timeframe = 'daily', limit = 20 } = options;
      
      const cacheKey = `trending:products:${category || 'all'}:${timeframe}:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      let products = await this.getAllProducts(category ? { category } : {});
      
      // Sort by trending score
      const trending = products
        .map(product => ({
          ...product,
          trendingScore: this.calculateTrendingScore(product),
          trendingType: this.getTrendingType(product)
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);

      await cacheService.set(cacheKey, trending, CACHE_TTL.MEDIUM);
      return trending;

    } catch (error) {
      logger.error('Get trending products error:', error);
      throw error;
    }
  }

  /**
   * Get trending type for product
   */
  getTrendingType(product) {
    const viewCount = this.getProductViewCount(product.id);
    const lastViewed = this.getLastViewed(product.id);
    
    if (!lastViewed) return TRENDING_CONFIG.TRENDING_TYPES.NEW;
    
    const daysSinceViewed = (Date.now() - lastViewed) / (24 * 60 * 60 * 1000);
    
    if (daysSinceViewed < 1 && viewCount > 100) {
      return TRENDING_CONFIG.TRENDING_TYPES.UP;
    } else if (daysSinceViewed > 7) {
      return TRENDING_CONFIG.TRENDING_TYPES.DOWN;
    } else {
      return TRENDING_CONFIG.TRENDING_TYPES.STABLE;
    }
  }

  /**
   * Get product availability
   */
  async getProductAvailability(productId, retailer) {
    try {
      const product = await this.getProductById(productId);
      if (!product) return null;

      if (retailer) {
        const retailerInfo = product.availability.retailers.find(r => 
          r.name.toLowerCase() === retailer.toLowerCase()
        );
        return retailerInfo || null;
      }

      return product.availability;

    } catch (error) {
      logger.error('Get product availability error:', { productId, error });
      throw error;
    }
  }

  /**
   * Compare multiple products
   */
  async compareProducts(productIds, compareFields) {
    try {
      const products = await Promise.all(
        productIds.map(id => this.getProductById(id))
      );

      const validProducts = products.filter(Boolean);
      
      if (validProducts.length < 2) {
        throw new Error('At least 2 valid products required for comparison');
      }

      const comparison = {
        products: validProducts,
        comparison: this.generateComparisonMatrix(validProducts, compareFields)
      };

      return comparison;

    } catch (error) {
      logger.error('Compare products error:', { productIds, error });
      throw error;
    }
  }

  /**
   * Generate comparison matrix
   */
  generateComparisonMatrix(products, compareFields) {
    const defaultFields = ['name', 'price', 'rating', 'brand', 'category'];
    const fields = compareFields || defaultFields;
    
    const matrix = {};
    
    fields.forEach(field => {
      matrix[field] = products.map(product => ({
        productId: product.id,
        value: this.getProductFieldValue(product, field),
        displayValue: this.formatFieldValue(product, field)
      }));
    });

    return matrix;
  }

  /**
   * Get product field value
   */
  getProductFieldValue(product, field) {
    switch (field) {
      case 'price':
        return product.priceRange ? product.priceRange.min : this.extractPrice(product.price);
      case 'rating':
        return product.rating || 0;
      default:
        return product[field] || '';
    }
  }

  /**
   * Format field value for display
   */
  formatFieldValue(product, field) {
    switch (field) {
      case 'price':
        return product.price;
      case 'rating':
        return `${product.rating || 0}/100`;
      default:
        return product[field] || 'N/A';
    }
  }

  /**
   * Wishlist operations
   */
  async addToWishlist(userId, productId) {
    try {
      if (!this.wishlistData.has(userId)) {
        this.wishlistData.set(userId, new Set());
      }

      this.wishlistData.get(userId).add(productId);
      
      return {
        userId,
        productId,
        addedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Add to wishlist error:', { userId, productId, error });
      throw error;
    }
  }

  async removeFromWishlist(userId, productId) {
    try {
      if (this.wishlistData.has(userId)) {
        this.wishlistData.get(userId).delete(productId);
      }
      
      return true;

    } catch (error) {
      logger.error('Remove from wishlist error:', { userId, productId, error });
      throw error;
    }
  }

  async getUserWishlist(userId) {
    try {
      const productIds = this.wishlistData.get(userId);
      if (!productIds) return [];

      const products = await Promise.all(
        Array.from(productIds).map(id => this.getProductById(id))
      );

      return products.filter(Boolean);

    } catch (error) {
      logger.error('Get user wishlist error:', { userId, error });
      throw error;
    }
  }

  /**
   * Report product issue
   */
  async reportProduct(productId, reportData) {
    try {
      const report = {
        id: Date.now().toString(),
        productId,
        ...reportData,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // In a real implementation, this would be saved to database
      logger.info('Product report submitted:', report);

      return report;

    } catch (error) {
      logger.error('Report product error:', { productId, error });
      throw error;
    }
  }

  /**
   * Track product view
   */
  trackProductView(productId, userId) {
    try {
      const key = productId;
      const currentViews = this.productViews.get(key) || { count: 0, users: new Set() };
      
      currentViews.count++;
      if (userId) {
        currentViews.users.add(userId);
      }
      currentViews.lastViewed = Date.now();
      
      this.productViews.set(key, currentViews);

    } catch (error) {
      logger.error('Track product view error:', { productId, userId, error });
    }
  }

  /**
   * Get product view count
   */
  getProductViewCount(productId) {
    const views = this.productViews.get(productId);
    return views ? views.count : 0;
  }

  /**
   * Get last viewed timestamp
   */
  getLastViewed(productId) {
    const views = this.productViews.get(productId);
    return views ? views.lastViewed : null;
  }

  /**
   * Get related product IDs
   */
  async getRelatedProductIds(productId) {
    try {
      const product = await this.getProductById(productId);
      if (!product) return [];

      const similar = await this.getSimilarProducts(product, 5);
      return similar.map(p => p.id);

    } catch (error) {
      logger.error('Get related product IDs error:', { productId, error });
      return [];
    }
  }

  /**
   * Get user viewed products
   */
  async getUserViewedProducts(userId) {
    // Mock implementation - in real system, track user views
    return [];
  }

  /**
   * Transform product to frontend format
   */
  transformProductForFrontend(product) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: {
        min: product.priceRange ? product.priceRange.min : this.extractPrice(product.price),
        max: product.priceRange ? product.priceRange.max : this.extractPrice(product.price),
        display: product.price
      },
      rating: product.rating,
      reviews: {
        count: product.reviewCount,
        display: `${product.reviewCount} reviews`
      },
      category: product.category,
      brand: product.brand,
      tags: product.tags || [],
      sentiment: {
        label: 'well-regarded',
        emoji: '👍',
        text: 'Well Regarded',
        description: 'This product has positive community sentiment',
        score: (product.rating || 80) / 100,
        confidence: 0.85,
        mentionCount: product.reviewCount || 100,
        trending: 'stable',
        breakdown: {
          quality: (product.rating || 80) / 100,
          value: 0.8,
          popularity: 0.75,
          reliability: 0.82
        },
        lastUpdated: new Date().toISOString()
      },
      images: product.images || [],
      features: product.features || [],
      availability: product.availability?.inStock ? 'in_stock' : 'out_of_stock',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Extract price from price string
   */
  extractPrice(priceString) {
    if (typeof priceString === 'number') return priceString;
    if (!priceString) return 0;
    
    const match = priceString.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }
}

module.exports = new ProductService();