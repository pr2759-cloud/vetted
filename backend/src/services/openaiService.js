/**
 * OpenAI Service
 * Handles chat interactions with OpenAI GPT models
 */

const OpenAI = require('openai');
const { logger } = require('../utils/logger');

class OpenAIService {
  constructor() {
    this.client = null;
    this.initialize();
  }

  initialize() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        logger.warn('OpenAI API key not configured. Chat features will be disabled.');
        return;
      }

      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      logger.info('OpenAI service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OpenAI service:', error);
    }
  }

  isAvailable() {
    return this.client !== null;
  }

  /**
   * Wrapper for OpenAI API calls with timeout protection
   */
  async callWithTimeout(apiCall, timeoutMs = 30000, operationName = 'OpenAI API call') {
    logger.info(`${operationName} started`);
    
    try {
      const result = await Promise.race([
        apiCall,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      
      logger.info(`${operationName} completed successfully`);
      return result;
    } catch (error) {
      logger.error(`${operationName} failed:`, error);
      throw error;
    }
  }

  async generateProductRecommendation(query, dbProducts = []) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service is not available');
    }

    // Mock response for development/demo when using placeholder key
    if (process.env.OPENAI_API_KEY === 'sk-test-key-placeholder-for-development') {
      return this.generateMockResponse(query, dbProducts);
    }

    try {
      // Prepare context with database products
      let systemPrompt;
      
      if (dbProducts.length > 0) {
        // When database products are found
        systemPrompt = `You are an expert product recommendation assistant. You have found ${dbProducts.length} relevant product(s) in the user's database.

Database Products Found:
${dbProducts.map(product => 
  `- ${product.name} (${product.brand}) - ${product.category} - ${product.price.display} - Rating: ${product.rating}/100`
).join('\n')}

Instructions:
1. Present these database products as the primary recommendations
2. Highlight key features and benefits of each product
3. Explain why these products match the user's query
4. Be enthusiastic and helpful in your recommendations
5. Mention specific details like price, rating, and brand`;
      } else {
        // When no database products are found - use skincare knowledge
        systemPrompt = `You are an expert skincare recommendation assistant. The user searched for skincare products but no matches were found in the current database.

Your task is to provide helpful skincare product recommendations based on your knowledge of popular, well-reviewed skincare products available online.

Instructions:
1. Recommend 8-10 specific, real skincare products that match the user's query
2. Include product names, estimated price ranges, and key skincare benefits
3. Focus on popular, well-reviewed skincare products from reputable brands
4. Explain why each product is good for specific skin types or concerns
5. Mention where these products are typically available (e.g., "commonly available at Sephora, Ulta, Amazon, etc.")
6. Be specific about product formulations and ingredients when possible
7. Start your response by acknowledging that these are recommendations from your knowledge since the database didn't have matching products

Example format:
"I didn't find matching skincare products in our database, but I can recommend some excellent options based on my knowledge:

1. [Product Name] by [Brand] - $X-Y
   - [Key skincare benefits]
   - [Suitable for skin type/concern]

2. [Product Name] by [Brand] - $X-Y
   - [Key ingredients and benefits]
   - [Why it's effective]"`;
      }

      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw new Error('Failed to generate product recommendation');
    }
  }

  async generateProductCards(query, dbProducts = [], conversationContext = {}) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service is not available');
    }

    // Mock response for development/demo when using placeholder key
    if (process.env.OPENAI_API_KEY === 'sk-test-key-placeholder-for-development') {
      return this.generateMockProductCards(query, dbProducts);
    }

    // Try to use actual OpenAI API for product recommendations
    try {
      const productRecommendation = await this.generateProductRecommendation(query, dbProducts);
      // For now, we'll parse the text response and create basic product cards
      // This is a simplified implementation - in production, you'd want more structured data
      return {
        message: productRecommendation,
        products: this.generateGenericProductCards(query) // Generate some basic product cards
      };
    } catch (error) {
      logger.error('Failed to use OpenAI API, falling back to mock response:', error);
      return this.generateMockProductCards(query, dbProducts);
    }
  }


  generateMockConversationalResponse(query, previousProducts, previousQuery) {
    if (previousProducts.length === 0) {
      return "I don't see any previous products to analyze. Please search for products first, then ask me about them.";
    }

    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('pros') && queryLower.includes('cons')) {
      return `Here's my analysis of the ${previousProducts.length} products from your "${previousQuery}" search:

**Pros and Cons Analysis:**

${previousProducts.map((product, index) => 
  `**${index + 1}. ${product.name}** (${product.price.display})
  
  ✅ **Pros:**
  - High rating of ${product.rating}/100 from ${product.reviews?.count || 0} reviews
  - ${product.features?.slice(0, 2).join('\n  - ') || 'Quality features'}
  - Good value in the ${product.category} category
  
  ❌ **Cons:**
  - Price point may be higher than budget alternatives
  - Limited availability in some regions
  - May require additional accessories
`).join('\n')}

Overall, these products offer solid performance in the ${previousProducts[0]?.category || 'selected'} category. The highest-rated option is ${previousProducts.sort((a, b) => b.rating - a.rating)[0]?.name} with ${previousProducts.sort((a, b) => b.rating - a.rating)[0]?.rating}/100 rating.`;
    }
    
    if (queryLower.includes('compare')) {
      return `Here's a comparison of the ${previousProducts.length} products from your "${previousQuery}" search:

**Product Comparison:**

${previousProducts.map((product, index) => 
  `**${product.name}** - ${product.price.display}
  - Rating: ${product.rating}/100 (${product.reviews?.count || 0} reviews)
  - Brand: ${product.brand}
  - Key Features: ${product.features?.slice(0, 3).join(', ') || 'Standard features'}`
).join('\n\n')}

**Best Value:** ${previousProducts.sort((a, b) => (b.rating/b.price.max) - (a.rating/a.price.max))[0]?.name}
**Highest Rated:** ${previousProducts.sort((a, b) => b.rating - a.rating)[0]?.name}
**Most Affordable:** ${previousProducts.sort((a, b) => a.price.min - b.price.min)[0]?.name}

Choose based on your priorities: performance, budget, or brand preference.`;
    }
    
    return `I'd be happy to provide more details about the ${previousProducts.length} products from your "${previousQuery}" search:

${previousProducts.map((product, index) => 
  `**${index + 1}. ${product.name}** by ${product.brand}
  - Price: ${product.price.display}
  - Rating: ${product.rating}/100 from ${product.reviews?.count || 0} reviews
  - Description: ${product.description || 'Quality product in the ' + product.category + ' category'}
  - Key Features: ${product.features?.slice(0, 3).join(', ') || 'Standard features for this category'}`
).join('\n\n')}

Would you like me to dive deeper into any specific aspect like pricing, features, or user reviews?`;
  }

  generateMockResponse(query, dbProducts = []) {
    // Mock responses for development/demo purposes
    if (dbProducts.length > 0) {
      return `Great! I found ${dbProducts.length} product(s) in our database that match your search. Here are my recommendations based on what we have available:

${dbProducts.map((product, index) => 
  `${index + 1}. **${product.name}** by ${product.brand}
   - Price: ${product.price.display}
   - Rating: ${product.rating}/100
   - Category: ${product.category}
   ${product.description ? `- ${product.description}` : ''}`
).join('\n\n')}

These products from our database are carefully curated and should meet your needs!`;
    } else {
      // Generate mock recommendations based on common product queries
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('wireless earbuds') || lowerQuery.includes('earbuds')) {
        return `I didn't find any wireless earbuds in our database, but I can recommend some excellent options based on my knowledge:

**Top Wireless Earbuds Under $100:**

1. **Apple AirPods (3rd Generation)** - $169-179
   - Spatial Audio, Adaptive EQ, water resistance
   - Great for iPhone users, excellent battery life
   - Available at Apple Store, Amazon, Best Buy

2. **Sony WF-1000XM4** - $180-200  
   - Industry-leading noise cancellation
   - 8-hour battery + 16 hours with case
   - Premium sound quality, available at major retailers

3. **Jabra Elite 75t** - $120-150
   - Customizable sound, secure fit
   - 7.5-hour battery + 20.5 hours with case  
   - Great for workouts, widely available

4. **Anker Soundcore Liberty Air 2 Pro** - $80-100
   - Active noise cancellation, customizable EQ
   - 7-hour battery + 26 hours with case
   - Excellent value, available on Amazon

5. **Samsung Galaxy Buds2** - $100-130
   - Active noise cancellation, comfortable fit
   - 5-hour battery + 15 hours with case
   - Great for Android users, available at Samsung and major retailers

These are all highly-rated options that you can find online at retailers like Amazon, Best Buy, Target, and directly from the manufacturers!`;
      } else if (lowerQuery.includes('skincare') || lowerQuery.includes('serum') || lowerQuery.includes('moisturizer')) {
        return `I didn't find matching skincare products in our database, but here are some excellent recommendations:

**Popular Skincare Products:**

1. **CeraVe Daily Moisturizing Lotion** - $12-16
   - Hyaluronic acid, ceramides, non-comedogenic
   - Great for daily use, available at drugstores and Amazon

2. **The Ordinary Hyaluronic Acid 2% + B5** - $8-12
   - Intense hydration, lightweight serum
   - Popular choice, available at Sephora and online

3. **Neutrogena Hydro Boost Water Gel** - $15-20
   - Oil-free, hyaluronic acid formula
   - Suitable for all skin types, widely available

These are well-reviewed options available at most beauty retailers!`;
      } else if (lowerQuery.includes('tech') || lowerQuery.includes('accessory') || lowerQuery.includes('phone') || lowerQuery.includes('laptop')) {
        return `I didn't find matching tech accessories in our database, but here are some popular recommendations:

**Popular Tech Accessories:**

1. **Anker PowerCore 10000 Portable Charger** - $25-35
   - 10,000mAh capacity, compact design
   - Fast charging, available on Amazon

2. **Logitech MX Master 3 Mouse** - $80-100
   - Wireless, ergonomic, precision scrolling
   - Great for productivity, available at major retailers

3. **Apple MagSafe Charger** - $35-40
   - Wireless charging for iPhone 12+
   - Available at Apple Store and electronics retailers

These are highly-rated accessories available online and in stores!`;
      } else {
        return `I didn't find matching products in our database, but I'd be happy to help you find what you're looking for! 

Based on your search "${query}", here are some suggestions:

- Try more specific search terms (brand names, product types, etc.)
- Browse our available categories 
- Let me know more details about what you're looking for

I can provide recommendations for popular products in categories like electronics, skincare, fitness equipment, and more. What specific type of product are you most interested in?`;
      }
    }
  }

  generateMockProductCards(query, dbProducts = []) {
    if (dbProducts.length > 0) {
      return {
        message: `Great! I found ${dbProducts.length} product(s) in our database that match your search.`,
        products: dbProducts
      };
    }

    // Generate mock product cards based on query - create 8-10 products
    const lowerQuery = query.toLowerCase();
    
    // Generate basic products for any query
    return this.generateUniversalProductSet(query);
  }

  /**
   * Generate a universal set of 8-10 products for any query
   */
  generateUniversalProductSet(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('wireless earbuds') || lowerQuery.includes('earbuods') || lowerQuery.includes('headphones')) {
      return {
        message: `I didn't find any wireless earbuds in our database, but I can recommend some excellent options based on my knowledge:`,
        products: [
          {
            id: 'ai-rec-1',
            name: 'Apple AirPods (3rd Generation)',
            brand: 'Apple',
            category: 'Audio',
            price: {
              min: 169,
              max: 179,
              display: '$169-179'
            },
            rating: 85,
            reviews: {
              count: 25000,
              display: '25,000 reviews'
            },
            description: 'Spatial Audio, Adaptive EQ, water resistance. Great for iPhone users with excellent battery life.',
            tags: ['wireless', 'apple', 'spatial-audio', 'water-resistant'],
            features: ['Spatial Audio', 'Adaptive EQ', 'Water Resistance', 'H1 Chip'],
            images: ['https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=500'],
            sentiment: {
              label: 'well-regarded',
              emoji: '👍',
              text: 'Well Regarded',
              description: 'Popular Apple product',
              score: 0.85,
              confidence: 0.9,
              mentionCount: 25000,
              trending: 'stable',
              breakdown: {
                quality: 0.85,
                value: 0.75,
                popularity: 0.95,
                reliability: 0.9
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ai-rec-2',
            name: 'Anker Soundcore Liberty Air 2 Pro',
            brand: 'Anker',
            category: 'Audio',
            price: {
              min: 80,
              max: 100,
              display: '$80-100'
            },
            rating: 82,
            reviews: {
              count: 15000,
              display: '15,000 reviews'
            },
            description: 'Active noise cancellation, customizable EQ. Excellent value with 7-hour battery + 26 hours with case.',
            tags: ['wireless', 'anc', 'budget-friendly', 'long-battery'],
            features: ['Active Noise Cancellation', 'Customizable EQ', '7hr Battery', '26hr Case'],
            images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500'],
            sentiment: {
              label: 'well-regarded',
              emoji: '👍',
              text: 'Well Regarded',
              description: 'Great value option',
              score: 0.82,
              confidence: 0.85,
              mentionCount: 15000,
              trending: 'up',
              breakdown: {
                quality: 0.8,
                value: 0.9,
                popularity: 0.75,
                reliability: 0.85
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ai-rec-3',
            name: 'Sony WF-1000XM4',
            brand: 'Sony',
            category: 'Audio',
            price: {
              min: 180,
              max: 200,
              display: '$180-200'
            },
            rating: 88,
            reviews: {
              count: 18000,
              display: '18,000 reviews'
            },
            description: 'Industry-leading noise cancellation with 8-hour battery + 16 hours with case. Premium sound quality.',
            tags: ['wireless', 'premium-anc', 'sony', 'audiophile'],
            features: ['Industry-leading ANC', '8hr Battery', 'Premium Sound', 'LDAC Support'],
            images: ['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500'],
            sentiment: {
              label: 'highly-regarded',
              emoji: '⭐',
              text: 'Highly Regarded',
              description: 'Premium audio choice',
              score: 0.88,
              confidence: 0.92,
              mentionCount: 18000,
              trending: 'stable',
              breakdown: {
                quality: 0.92,
                value: 0.8,
                popularity: 0.85,
                reliability: 0.9
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ai-rec-4',
            name: 'Samsung Galaxy Buds2 Pro',
            brand: 'Samsung',
            category: 'Audio',
            price: {
              min: 150,
              max: 200,
              display: '$150-200'
            },
            rating: 86,
            reviews: {
              count: 12000,
              display: '12,000 reviews'
            },
            description: 'Intelligent ANC, 360 Audio, and seamless Galaxy device integration. Perfect for Samsung ecosystem users.',
            tags: ['wireless', 'samsung', '360-audio', 'anc'],
            features: ['Intelligent ANC', '360 Audio', 'Galaxy Integration', 'Touch Controls'],
            images: ['https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=500'],
            sentiment: {
              label: 'well-regarded',
              emoji: '👍',
              text: 'Well Regarded',
              description: 'Great for Samsung users',
              score: 0.86,
              confidence: 0.88,
              mentionCount: 12000,
              trending: 'up',
              breakdown: {
                quality: 0.88,
                value: 0.82,
                popularity: 0.85,
                reliability: 0.87
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ai-rec-5',
            name: 'Jabra Elite 75t',
            brand: 'Jabra',
            category: 'Audio',
            price: {
              min: 120,
              max: 150,
              display: '$120-150'
            },
            rating: 84,
            reviews: {
              count: 9500,
              display: '9,500 reviews'
            },
            description: 'Compact design with exceptional call quality and secure fit. Great for calls and music.',
            tags: ['wireless', 'compact', 'call-quality', 'secure-fit'],
            features: ['Compact Design', 'Call Quality', 'Secure Fit', '7.5hr Battery'],
            images: ['https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500'],
            sentiment: {
              label: 'well-regarded',
              emoji: '👍',
              text: 'Well Regarded',
              description: 'Professional choice',
              score: 0.84,
              confidence: 0.87,
              mentionCount: 9500,
              trending: 'stable',
              breakdown: {
                quality: 0.86,
                value: 0.83,
                popularity: 0.82,
                reliability: 0.85
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ai-rec-6',
            name: 'Google Pixel Buds Pro',
            brand: 'Google',
            category: 'Audio',
            price: {
              min: 140,
              max: 180,
              display: '$140-180'
            },
            rating: 83,
            reviews: {
              count: 8200,
              display: '8,200 reviews'
            },
            description: 'Active noise cancellation with Google Assistant integration. Excellent for Android users.',
            tags: ['wireless', 'google-assistant', 'anc', 'android'],
            features: ['Google Assistant', 'Active ANC', 'Android Integration', '7hr Battery'],
            images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500'],
            sentiment: {
              label: 'well-regarded',
              emoji: '👍',
              text: 'Well Regarded',
              description: 'Smart integration',
              score: 0.83,
              confidence: 0.85,
              mentionCount: 8200,
              trending: 'up',
              breakdown: {
                quality: 0.84,
                value: 0.81,
                popularity: 0.83,
                reliability: 0.84
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ai-rec-7',
            name: 'Beats Studio Buds',
            brand: 'Beats',
            category: 'Audio',
            price: {
              min: 100,
              max: 130,
              display: '$100-130'
            },
            rating: 81,
            reviews: {
              count: 11000,
              display: '11,000 reviews'
            },
            description: 'Powerful, balanced sound with Active Noise Cancelling. Works with both iOS and Android.',
            tags: ['wireless', 'beats', 'anc', 'cross-platform'],
            features: ['Powerful Sound', 'Active ANC', 'Cross Platform', '8hr Battery'],
            images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'],
            sentiment: {
              label: 'well-regarded',
              emoji: '👍',
              text: 'Well Regarded',
              description: 'Bass-heavy option',
              score: 0.81,
              confidence: 0.84,
              mentionCount: 11000,
              trending: 'stable',
              breakdown: {
                quality: 0.82,
                value: 0.79,
                popularity: 0.85,
                reliability: 0.78
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ai-rec-8',
            name: 'Nothing Ear (2)',
            brand: 'Nothing',
            category: 'Audio',
            price: {
              min: 90,
              max: 120,
              display: '$90-120'
            },
            rating: 82,
            reviews: {
              count: 6800,
              display: '6,800 reviews'
            },
            description: 'Transparent design with Hi-Res Audio certification and personalized ANC. Unique aesthetic choice.',
            tags: ['wireless', 'transparent', 'hi-res', 'design'],
            features: ['Transparent Design', 'Hi-Res Audio', 'Personalized ANC', '6.3hr Battery'],
            images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500'],
            sentiment: {
              label: 'well-regarded',
              emoji: '👍',
              text: 'Well Regarded',
              description: 'Unique design',
              score: 0.82,
              confidence: 0.86,
              mentionCount: 6800,
              trending: 'up',
              breakdown: {
                quality: 0.83,
                value: 0.84,
                popularity: 0.78,
                reliability: 0.83
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
    }

    // Handle laptops
    if (lowerQuery.includes('laptop') || lowerQuery.includes('computer') || lowerQuery.includes('macbook')) {
      return {
        message: `I didn't find any laptops in our database, but I can recommend some excellent options based on my knowledge:`,
        products: [
          {
            id: 'ai-rec-laptop-1',
            name: 'MacBook Air M2',
            brand: 'Apple',
            category: 'Computers',
            price: {
              min: 1099,
              max: 1499,
              display: '$1099-1499'
            },
            rating: 92,
            reviews: {
              count: 32000,
              display: '32,000 reviews'
            },
            description: 'Lightweight laptop with M2 chip, 13.6-inch Liquid Retina display, and up to 18 hours of battery life.',
            tags: ['apple', 'm2-chip', 'lightweight', 'long-battery'],
            features: ['M2 Chip', '13.6" Retina Display', '18hr Battery', 'Ultra-thin Design'],
            images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'],
            sentiment: {
              label: 'highly-regarded',
              emoji: '⭐',
              text: 'Highly Regarded',
              description: 'Top-rated laptop',
              score: 0.92,
              confidence: 0.95,
              mentionCount: 32000,
              trending: 'stable',
              breakdown: {
                quality: 0.95,
                value: 0.85,
                popularity: 0.95,
                reliability: 0.95
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ai-rec-laptop-2',
            name: 'Dell XPS 13',
            brand: 'Dell',
            category: 'Computers',
            price: {
              min: 999,
              max: 1399,
              display: '$999-1399'
            },
            rating: 88,
            reviews: {
              count: 28000,
              display: '28,000 reviews'
            },
            description: 'Premium Windows laptop with 13.4-inch InfinityEdge display and 11th Gen Intel processors.',
            tags: ['windows', 'premium', 'compact', 'intel'],
            features: ['11th Gen Intel Core', 'InfinityEdge Display', 'Premium Build', 'Windows 11'],
            images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500'],
            sentiment: {
              label: 'well-regarded',
              emoji: '👍',
              text: 'Well Regarded',
              description: 'Popular Windows laptop',
              score: 0.88,
              confidence: 0.9,
              mentionCount: 28000,
              trending: 'stable',
              breakdown: {
                quality: 0.9,
                value: 0.85,
                popularity: 0.85,
                reliability: 0.88
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
    }

    // Handle smartphones
    if (lowerQuery.includes('phone') || lowerQuery.includes('smartphone') || lowerQuery.includes('iphone') || lowerQuery.includes('android')) {
      return {
        message: `I didn't find any smartphones in our database, but I can recommend some excellent options based on my knowledge:`,
        products: [
          {
            id: 'ai-rec-phone-1',
            name: 'iPhone 15 Pro',
            brand: 'Apple',
            category: 'Smartphones',
            price: {
              min: 999,
              max: 1199,
              display: '$999-1199'
            },
            rating: 90,
            reviews: {
              count: 45000,
              display: '45,000 reviews'
            },
            description: 'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system.',
            tags: ['apple', 'a17-pro', 'titanium', 'premium-camera'],
            features: ['A17 Pro Chip', 'Titanium Build', 'Pro Camera System', '120Hz Display'],
            images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500'],
            sentiment: {
              label: 'highly-regarded',
              emoji: '⭐',
              text: 'Highly Regarded',
              description: 'Latest iPhone',
              score: 0.9,
              confidence: 0.92,
              mentionCount: 45000,
              trending: 'up',
              breakdown: {
                quality: 0.92,
                value: 0.8,
                popularity: 0.95,
                reliability: 0.9
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'ai-rec-phone-2',
            name: 'Samsung Galaxy S24',
            brand: 'Samsung',
            category: 'Smartphones',
            price: {
              min: 799,
              max: 999,
              display: '$799-999'
            },
            rating: 87,
            reviews: {
              count: 38000,
              display: '38,000 reviews'
            },
            description: 'Flagship Android phone with advanced AI features, excellent camera, and long-lasting battery.',
            tags: ['samsung', 'android', 'ai-features', 'flagship'],
            features: ['Galaxy AI', 'Pro Camera', '120Hz AMOLED', 'Long Battery Life'],
            images: ['https://images.unsplash.com/photo-1610792516307-5ca265fa826c?w=500'],
            sentiment: {
              label: 'well-regarded',
              emoji: '👍',
              text: 'Well Regarded',
              description: 'Top Android flagship',
              score: 0.87,
              confidence: 0.88,
              mentionCount: 38000,
              trending: 'stable',
              breakdown: {
                quality: 0.88,
                value: 0.85,
                popularity: 0.87,
                reliability: 0.85
              }
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
    }

    // Default fallback - use intelligent generic product generation
    return this.generateGenericProductCards(query);
  }

  /**
   * Generate generic product cards based on query analysis
   */
  generateGenericProductCards(query) {
    const lowerQuery = query.toLowerCase();
    
    // Try to infer product type from query
    let productType = 'product';
    let category = 'General';
    let suggestions = [];

    // Common product categories and their variations
    const categoryMap = {
      'electronics': ['electronic', 'device', 'gadget', 'tech'],
      'clothing': ['cloth', 'shirt', 'pant', 'dress', 'jacket', 'shoe'],
      'home': ['home', 'house', 'kitchen', 'furniture', 'decor'],
      'health': ['health', 'vitamin', 'supplement', 'medical', 'wellness'],
      'beauty': ['beauty', 'makeup', 'cosmetic', 'skin', 'hair'],
      'sports': ['sport', 'fitness', 'exercise', 'workout', 'gym'],
      'food': ['food', 'snack', 'drink', 'beverage', 'eat'],
      'books': ['book', 'read', 'novel', 'guide'],
      'toys': ['toy', 'game', 'play', 'kid', 'child'],
      'automotive': ['car', 'auto', 'vehicle', 'motor']
    };

    // Find best matching category
    let bestMatch = 'general';
    let maxMatches = 0;
    
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      const matches = keywords.filter(keyword => lowerQuery.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = cat;
        category = cat.charAt(0).toUpperCase() + cat.slice(1);
      }
    }

    // Generate 8-10 generic products based on the query
    const numProducts = 8 + Math.floor(Math.random() * 3); // Generate 8-10 products
    const genericProducts = [];
    
    for (let i = 1; i <= numProducts; i++) {
      const isPremium = i <= 3; // First 3 are premium
      const timestamp = Date.now() + i; // Ensure unique IDs
      
      genericProducts.push({
        id: `ai-rec-${timestamp}-${i}`,
        name: this.generateProductName(query, bestMatch, i),
        brand: this.generateBrandName(bestMatch, isPremium),
        category: category,
        price: this.generatePrice(bestMatch, isPremium),
        rating: Math.floor(Math.random() * (isPremium ? 15 : 20)) + (isPremium ? 80 : 75), // Premium: 80-95, Regular: 75-95
        reviews: {
          count: Math.floor(Math.random() * (isPremium ? 15000 : 20000)) + (isPremium ? 8000 : 5000),
          display: `${Math.floor(Math.random() * (isPremium ? 15000 : 20000)) + (isPremium ? 8000 : 5000)} reviews`
        },
        description: `${isPremium ? 'Premium' : 'High-quality'} ${query} with ${isPremium ? 'advanced features and superior build quality' : 'excellent features and customer satisfaction'}. ${isPremium ? 'Highly recommended by experts' : 'Popular choice among users'}.`,
        tags: this.generateTags(query, bestMatch, isPremium),
        features: this.generateFeatures(query, bestMatch, isPremium),
        images: [`https://images.unsplash.com/photo-${1556742049000 + (i * 1000)}-0cfed4f6a45d?w=500`],
        sentiment: {
          label: isPremium && Math.random() > 0.5 ? 'highly-regarded' : 'well-regarded',
          emoji: isPremium && Math.random() > 0.5 ? '⭐' : '👍',
          text: isPremium && Math.random() > 0.5 ? 'Highly Regarded' : 'Well Regarded',
          description: isPremium ? 'Premium choice' : 'Popular choice',
          score: (isPremium ? 0.85 : 0.8) + Math.random() * 0.1,
          confidence: (isPremium ? 0.85 : 0.8) + Math.random() * 0.1,
          mentionCount: Math.floor(Math.random() * (isPremium ? 18000 : 15000)) + (isPremium ? 8000 : 5000),
          trending: ['stable', 'up', 'new'][Math.floor(Math.random() * 3)],
          breakdown: {
            quality: (isPremium ? 0.85 : 0.75) + Math.random() * 0.1,
            value: 0.75 + Math.random() * 0.2,
            popularity: (isPremium ? 0.8 : 0.7) + Math.random() * 0.15,
            reliability: (isPremium ? 0.85 : 0.8) + Math.random() * 0.1
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return {
      message: `I didn't find any ${query} in our database, but I can recommend some popular options based on my knowledge:`,
      products: genericProducts
    };
  }

  generateProductName(query, category, variant) {
    const prefixes = {
      electronics: ['Smart', 'Pro', 'Ultra', 'Premium', 'Advanced'],
      clothing: ['Classic', 'Premium', 'Essential', 'Comfort', 'Style'],
      home: ['Premium', 'Essential', 'Modern', 'Classic', 'Smart'],
      health: ['Advanced', 'Premium', 'Natural', 'Pro', 'Complete'],
      beauty: ['Premium', 'Pro', 'Natural', 'Advanced', 'Essential'],
      sports: ['Pro', 'Elite', 'Performance', 'Training', 'Premium'],
      general: ['Premium', 'Pro', 'Advanced', 'Essential', 'Quality']
    };

    const prefix = (prefixes[category] || prefixes.general)[Math.floor(Math.random() * 5)];
    const queryCapitalized = query.charAt(0).toUpperCase() + query.slice(1);
    
    return `${prefix} ${queryCapitalized} ${variant === 1 ? 'Series' : 'Pro'}`;
  }

  generateBrandName(category, isPremium = false) {
    const brands = {
      electronics: isPremium ? ['Apple', 'Samsung', 'Sony', 'Microsoft'] : ['Anker', 'TechCore', 'SmartTech', 'ProElectronics'],
      clothing: isPremium ? ['Nike', 'Adidas', 'Under Armour', 'Levi\'s'] : ['ComfortWear', 'StylePlus', 'EssentialClothing', 'QualityApparel'],
      home: isPremium ? ['KitchenAid', 'Dyson', 'Cuisinart', 'Ninja'] : ['HomeEssentials', 'ModernLiving', 'QualityHome', 'SmartHome'],
      health: isPremium ? ['Nature Made', 'Optimum Nutrition', 'Garden of Life'] : ['HealthPlus', 'WellnessCore', 'VitalHealth', 'NaturalChoice'],
      beauty: isPremium ? ['L\'Oreal', 'Clinique', 'MAC', 'Urban Decay'] : ['BeautyCore', 'GlowLab', 'NaturalBeauty', 'SkinEssentials'],
      sports: isPremium ? ['Nike', 'Adidas', 'Under Armour', 'Reebok'] : ['FitnessPro', 'SportCore', 'ActiveLife', 'TrainingGear'],
      general: isPremium ? ['Premium Brand', 'Pro Series', 'Elite Choice'] : ['QualityChoice', 'EssentialBrand', 'ValueCore', 'ReliableBrand']
    };

    const brandList = brands[category] || brands.general;
    return brandList[Math.floor(Math.random() * brandList.length)];
  }

  generatePrice(category, isPremium = false) {
    const priceRanges = {
      electronics: isPremium ? [200, 500] : [50, 200],
      clothing: isPremium ? [80, 200] : [20, 80],
      home: isPremium ? [100, 300] : [30, 100],
      health: isPremium ? [40, 100] : [15, 40],
      beauty: isPremium ? [50, 150] : [15, 50],
      sports: isPremium ? [100, 250] : [30, 100],
      general: isPremium ? [75, 200] : [25, 75]
    };

    const [min, max] = priceRanges[category] || priceRanges.general;
    const minPrice = Math.floor(Math.random() * (max - min) / 2) + min;
    const maxPrice = minPrice + Math.floor(Math.random() * (max - minPrice)) + 10;
    
    return {
      min: minPrice,
      max: maxPrice,
      display: `$${minPrice}-${maxPrice}`
    };
  }

  generateTags(query, category, isPremium = false) {
    const baseTags = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const categoryTags = {
      electronics: ['wireless', 'bluetooth', 'smart', 'portable', 'rechargeable'],
      clothing: ['comfortable', 'stylish', 'durable', 'breathable', 'classic'],
      home: ['modern', 'functional', 'space-saving', 'easy-clean', 'durable'],
      health: ['natural', 'organic', 'effective', 'safe', 'doctor-recommended'],
      beauty: ['natural', 'gentle', 'effective', 'paraben-free', 'dermatologist-tested'],
      sports: ['durable', 'lightweight', 'performance', 'professional', 'training'],
      general: ['quality', 'reliable', 'popular', 'recommended', 'value']
    };

    const extraTags = categoryTags[category] || categoryTags.general;
    const selectedTags = extraTags.slice(0, 3 + Math.floor(Math.random() * 2));
    
    if (isPremium) {
      selectedTags.push('premium', 'pro');
    }

    return [...baseTags, ...selectedTags];
  }

  generateFeatures(query, category, isPremium = false) {
    const baseFeatures = [
      `High-quality ${query}`,
      'Excellent customer reviews',
      'Fast shipping available',
      'Money-back guarantee'
    ];

    const categoryFeatures = {
      electronics: ['Long battery life', 'Easy setup', 'Compatible with most devices', 'Wireless connectivity'],
      clothing: ['Machine washable', 'Comfortable fit', 'Durable material', 'Style versatile'],
      home: ['Easy to use', 'Space efficient', 'Easy maintenance', 'Modern design'],
      health: ['Clinically tested', 'Natural ingredients', 'No side effects', 'Doctor recommended'],
      beauty: ['Dermatologist tested', 'Suitable for all skin types', 'Long-lasting results', 'Natural ingredients'],
      sports: ['Professional grade', 'Lightweight design', 'Sweat resistant', 'Performance optimized'],
      general: ['High quality materials', 'Reliable performance', 'Great value', 'Popular choice']
    };

    const extraFeatures = categoryFeatures[category] || categoryFeatures.general;
    return baseFeatures.concat(extraFeatures.slice(0, 2));
  }

  async generateSearchEnhancement(originalQuery, searchResults) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const systemPrompt = `You are a search enhancement AI. Your job is to analyze search queries and results to provide better search suggestions or explain why certain results were returned.

Original Query: "${originalQuery}"
Search Results Count: ${searchResults.length}

If the search returned results, provide a brief explanation of why these products match the query.
If the search returned no results, suggest alternative search terms or related products the user might be interested in.

Keep responses concise and helpful.`;

      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please analyze this search and provide insights.`
          }
        ],
        max_tokens: 200,
        temperature: 0.5
      });

      return response.choices[0]?.message?.content;
    } catch (error) {
      logger.error('OpenAI search enhancement error:', error);
      return null;
    }
  }

  async generateProductDescription(productData) {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const prompt = `Create an engaging product description for:
Name: ${productData.name}
Brand: ${productData.brand}
Category: ${productData.category}
Price: ${productData.price}
Features: ${productData.features?.join(', ') || 'Not specified'}

Write a compelling, informative description that highlights key benefits and features.`;

      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content;
    } catch (error) {
      logger.error('OpenAI product description error:', error);
      return null;
    }
  }

  /**
   * Use AI to intelligently match user queries to products from database with search context
   */
  async contextualProductSearch(query, allProducts, searchContext = null, conversationContext = {}) {
    if (!this.isAvailable()) {
      return this.fallbackToKeywordSearch(query, allProducts);
    }

    // Mock response for development/demo when using placeholder key
    if (process.env.OPENAI_API_KEY === 'sk-test-key-placeholder-for-development') {
      return this.fallbackToKeywordSearch(query, allProducts);
    }

    try {
      // Create a simplified product list for the AI to analyze
      const productSummaries = allProducts.map(product => ({
        id: product.id,
        name: product.name,
        brand: product.brand || 'Unknown',
        category: product.category || 'General',
        description: (product.description || '').substring(0, 200),
        tags: product.tags || [],
        price: product.price?.display || 'N/A'
      }));

      // Check if this is a conversational query about previous products
      const { previousProducts = [], previousQuery = '', chatHistory = [] } = conversationContext;
      const isConversationalQuery = previousProducts.length > 0 && (
        query.toLowerCase().includes('pros') ||
        query.toLowerCase().includes('cons') ||
        query.toLowerCase().includes('compare') ||
        query.toLowerCase().includes('tell me more') ||
        query.toLowerCase().includes('what about') ||
        query.toLowerCase().includes('these products') ||
        query.toLowerCase().includes('these items') ||
        query.toLowerCase().includes('advantages') ||
        query.toLowerCase().includes('disadvantages') ||
        query.toLowerCase().includes('benefits') ||
        query.toLowerCase().includes('drawbacks')
      );

      if (isConversationalQuery) {
        // Handle conversational queries by returning previous products for analysis
        logger.info('Conversational query detected, returning previous products for analysis');
        
        return {
          hasDbResults: false, // This is conversational, not a DB search
          dbProducts: previousProducts, // Return previous products for analysis
          aiProducts: {
            message: await this.generateConversationalResponse(query, {
              previousProducts,
              previousQuery,
              chatHistory,
              currentTopic: previousQuery
            }),
            products: []
          }
        };
      }

      // Build context-aware system prompt
      let contextInfo = '';
      if (searchContext) {
        contextInfo = `\n\nSearch Context: ${searchContext}

This context should influence your product matching decisions. Consider:
- If the user has searched for similar products before
- Their apparent price preferences and brand interests
- Whether this might be a follow-up or refinement of a previous search
- Their search intent (comparison, alternatives, budget options, etc.)`;
      }

      const systemPrompt = `You are an expert product matching AI with conversation memory. Given a user's search query and their search context, analyze it contextually and match it to the most relevant products from the provided database.

User Query: "${query}"${contextInfo}

Available Products:
${productSummaries.map((product, index) => 
  `${index + 1}. ID: ${product.id}
   Name: ${product.name}
   Brand: ${product.brand}
   Category: ${product.category}
   Description: ${product.description}
   Tags: ${product.tags.join(', ')}
   Price: ${product.price}`
).join('\n\n')}

Instructions:
1. Analyze the user's query for intent, context, and specific needs
2. Use the search context to understand their preferences and previous interests
3. Consider synonyms, related terms, and contextual meaning
4. Match products based on:
   - Primary function/purpose and search context
   - Category relevance and user's previous interests
   - Brand reputation and user's brand preferences
   - Feature alignment with user's apparent needs
   - Price context and user's typical price range
5. Return ONLY a JSON array of product IDs in order of relevance (most relevant first)
6. Include only products that are genuinely relevant to the query and context
7. If no products are relevant, return an empty array []

Example response format: ["product-id-1", "product-id-2", "product-id-3"]

Return only the JSON array, no other text.`;

      const response = await this.callWithTimeout(
        this.client.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: `Find products that match: ${query}`
            }
          ],
          max_tokens: 500,
          temperature: 0.3,  // Lower temperature for more consistent matching
          top_p: 0.9
        }),
        30000,
        `AI contextual search for: "${query}"`
      );

      const aiResponse = response.choices[0]?.message?.content?.trim();
      
      try {
        const matchedIds = JSON.parse(aiResponse);
        if (Array.isArray(matchedIds) && matchedIds.length > 0) {
          // Filter products to only include matched ones in the order specified by AI
          const matchedProducts = matchedIds
            .map(id => allProducts.find(product => product.id === id))
            .filter(Boolean)
            .map(product => {
              // Add high relevance score for AI-matched products
              product.relevanceScore = 0.95 - (matchedIds.indexOf(product.id) * 0.1);
              return product;
            });

          if (matchedProducts.length > 0) {
            logger.info(`AI contextual search found ${matchedProducts.length} products for: "${query}" (with context)`);
            return { dbProducts: matchedProducts, hasDbResults: true };
          }
        }
      } catch (parseError) {
        logger.warn('Failed to parse AI response:', parseError);
      }

      // No database matches found - generate AI product recommendations with context
      logger.info(`No database matches for "${query}", generating AI recommendations with context`);
      const aiProductCards = await this.generateInternetProductRecommendations(query, searchContext);
      return { dbProducts: [], hasDbResults: false, aiProducts: aiProductCards };

    } catch (error) {
      logger.error('OpenAI contextual search error:', error);
      return this.fallbackToKeywordSearch(query, allProducts);
    }
  }

  /**
   * Generate internet-based product recommendations in card format with search context
   */
  async generateInternetProductRecommendations(query, searchContext = null) {
    if (!this.isAvailable()) {
      return this.generateMockProductCards(query, []);
    }

    try {
      // Build context-aware prompt
      let contextInfo = '';
      if (searchContext) {
        contextInfo = `\n\nSearch Context: ${searchContext}

Consider this context when making recommendations:
- Align with user's previous interests and price preferences
- If they've searched for alternatives, suggest different brands/types
- If they're budget-conscious, focus on value options
- If they prefer premium products, suggest higher-end options`;
      }

      const systemPrompt = `You are an expert product recommendation AI with access to current market knowledge and conversation memory. When no products are found in a database, recommend real, popular products available online that match the user's query and search history.

User Query: "${query}"${contextInfo}

Instructions:
1. Recommend 8-10 real, popular products that match the query and context
2. Focus on well-known brands and highly-rated products
3. Include realistic price ranges based on current market prices
4. Consider the user's search context and preferences
5. Provide detailed features and benefits for each product
6. Return ONLY a JSON object with this exact structure:

{
  "message": "I didn't find matching products in our database, but I can recommend some excellent options based on current market leaders:",
  "products": [
    {
      "id": "ai-rec-[timestamp]-[index]",
      "name": "[Product Name]",
      "brand": "[Brand Name]",
      "category": "[Category]",
      "price": {
        "min": [min_price_number],
        "max": [max_price_number],
        "display": "$[min]-[max]"
      },
      "rating": [rating_between_80_and_95],
      "reviews": {
        "count": [realistic_review_count],
        "display": "[count] reviews"
      },
      "description": "[Detailed product description highlighting key benefits]",
      "tags": ["[relevant]", "[tags]", "[here]"],
      "features": [
        "[Feature 1]",
        "[Feature 2]",
        "[Feature 3]",
        "[Feature 4]"
      ],
      "images": ["https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=500"],
      "sentiment": {
        "label": "well-regarded",
        "emoji": "👍",
        "text": "Well Regarded",
        "description": "Popular market choice",
        "score": [0.8_to_0.95],
        "confidence": [0.85_to_0.95],
        "mentionCount": [realistic_mention_count],
        "trending": "[stable/up/new]",
        "breakdown": {
          "quality": [0.8_to_0.95],
          "value": [0.75_to_0.9],
          "popularity": [0.7_to_0.9],
          "reliability": [0.8_to_0.95]
        }
      },
      "availability": "available_online",
      "createdAt": "[current_iso_timestamp]",
      "updatedAt": "[current_iso_timestamp]"
    }
  ]
}

Important:
- Use realistic product names and brands that exist in the market
- Make prices accurate to current market conditions
- Ensure all numeric fields are numbers, not strings
- Include specific, useful features for each product
- Make descriptions compelling and informative
- Use appropriate categories (e.g., "Electronics", "Beauty", "Health", "Sports", "Home")`;

      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 1
      });

      const aiResponse = response.choices[0]?.message?.content?.trim();
      
      try {
        const productData = JSON.parse(aiResponse);
        if (productData && productData.products && Array.isArray(productData.products)) {
          // Add timestamps and IDs to products
          const now = new Date().toISOString();
          const timestamp = Date.now();
          
          productData.products = productData.products.map((product, index) => ({
            ...product,
            id: `ai-rec-${timestamp}-${index + 1}`,
            createdAt: now,
            updatedAt: now,
            relevanceScore: 0.9 - (index * 0.1) // Decreasing relevance
          }));

          logger.info(`Generated ${productData.products.length} AI product recommendations for: "${query}"`);
          return productData;
        }
      } catch (parseError) {
        logger.warn('Failed to parse AI product recommendations, using fallback:', parseError);
      }

      // Fallback to mock product generation
      return this.generateMockProductCards(query, []);

    } catch (error) {
      logger.error('AI product recommendation generation error:', error);
      return this.generateMockProductCards(query, []);
    }
  }

  /**
   * Fallback keyword search when AI is unavailable
   */
  fallbackToKeywordSearch(query, allProducts) {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);
    
    const filteredProducts = allProducts.filter(product => {
      // Basic text matching as fallback
      const titleMatch = this.calculateBasicRelevance(product.name?.toLowerCase() || '', searchTerms);
      const descriptionMatch = product.description ? 
        this.calculateBasicRelevance(product.description.toLowerCase(), searchTerms) : 0;
      const categoryMatch = product.category ? 
        this.calculateBasicRelevance(product.category.toLowerCase(), searchTerms) : 0;
      const brandMatch = product.brand ? 
        this.calculateBasicRelevance(product.brand.toLowerCase(), searchTerms) : 0;
      const tagMatch = product.tags ? 
        this.calculateTagRelevance(product.tags, searchTerms) : 0;

      const relevanceScore = Math.max(titleMatch, descriptionMatch, categoryMatch, brandMatch, tagMatch);
      product.relevanceScore = relevanceScore;
      
      return relevanceScore > 0.3; // Only include products with reasonable relevance
    }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    if (filteredProducts.length > 0) {
      return { dbProducts: filteredProducts, hasDbResults: true };
    } else {
      // Generate fallback AI products when keyword search also fails
      const mockProductCards = this.generateMockProductCards(query, []);
      return { 
        dbProducts: [], 
        hasDbResults: false, 
        aiProducts: mockProductCards 
      };
    }
  }

  /**
   * Calculate basic text relevance for fallback
   */
  calculateBasicRelevance(text, searchTerms) {
    let score = 0;
    
    searchTerms.forEach(term => {
      if (text.includes(term)) {
        if (text === term) {
          score += 1.0;
        } else if (text.startsWith(term)) {
          score += 0.8;
        } else if (text.includes(` ${term} `) || text.includes(` ${term}`)) {
          score += 0.6;
        } else {
          score += 0.4;
        }
      }
    });

    return Math.min(score / searchTerms.length, 1.0);
  }

  /**
   * Calculate tag relevance for fallback
   */
  calculateTagRelevance(tags, searchTerms) {
    let score = 0;
    
    if (!Array.isArray(tags)) return 0;
    
    tags.forEach(tag => {
      const tagLower = tag.toLowerCase();
      searchTerms.forEach(term => {
        if (tagLower.includes(term) || term.includes(tagLower)) {
          score += 0.5;
        }
      });
    });
    
    return Math.min(score / searchTerms.length, 1.0);
  }

  /**
   * Generate structured pros/cons response for card display
   */
  async generateStructuredProsConsResponse(query, conversationContext = {}) {
    if (!this.isAvailable()) {
      return this.generateMockProsConsResponse(query, conversationContext);
    }

    // Mock response for development/demo when using placeholder key
    if (process.env.OPENAI_API_KEY === 'sk-test-key-placeholder-for-development') {
      return this.generateMockProsConsResponse(query, conversationContext);
    }

    try {
      const { 
        previousProducts = [], 
        previousQuery = '', 
        chatHistory = [],
        currentTopic = null
      } = conversationContext;

      const systemPrompt = `You are a product analysis expert. Generate a structured pros and cons analysis for the specific products provided.

PRODUCTS TO ANALYZE:
${previousProducts.map(p => `- ${p.name} by ${p.brand} (${p.price?.display || 'Price varies'}) - Rating: ${p.rating || 'N/A'}/100`).join('\n')}

RESPONSE FORMAT - Return ONLY a JSON structure with this exact format:
{
  "summary": "Brief 1-2 sentence overview of the analysis",
  "products": [
    {
      "productId": "product_id_here",
      "productName": "Product Name",
      "pros": [
        "Specific positive point 1",
        "Specific positive point 2", 
        "Specific positive point 3"
      ],
      "cons": [
        "Specific negative point 1",
        "Specific negative point 2",
        "Specific negative point 3"
      ]
    }
  ]
}

REQUIREMENTS:
- Analyze EACH product listed above
- Be specific about actual features, pricing, and ratings
- Base pros/cons on the product data provided
- Keep pros/cons concise (1-2 lines each)
- Focus on practical benefits and limitations
- Do NOT include generic marketing language
- Return ONLY the JSON, no other text`;

      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 800,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const analysisResult = JSON.parse(response.choices[0].message.content);
      return analysisResult;

    } catch (error) {
      logger.error('OpenAI structured pros/cons error:', error);
      return this.generateMockProsConsResponse(query, conversationContext);
    }
  }

  /**
   * Generate mock pros/cons response
   */
  generateMockProsConsResponse(query, conversationContext = {}) {
    const { previousProducts = [] } = conversationContext;
    
    return {
      summary: `Here's a detailed pros and cons analysis of the ${previousProducts.length} product(s) from your search.`,
      products: previousProducts.map(product => ({
        productId: product.id,
        productName: product.name,
        pros: [
          `High user rating (${product.rating || 'N/A'}/100)`,
          `Competitive pricing at ${product.price?.display || 'reasonable cost'}`,
          `Well-regarded by users with positive sentiment`
        ],
        cons: [
          `May be more expensive than some alternatives`,
          `Specific features might not suit all users`,
          `Limited availability in some regions`
        ]
      }))
    };
  }

  /**
   * Generate conversational responses for follow-up questions
   */
  async generateConversationalResponse(query, conversationContext = {}) {
    if (!this.isAvailable()) {
      return this.generateMockConversationalResponse(query, conversationContext);
    }

    // Mock response for development/demo when using placeholder key
    if (process.env.OPENAI_API_KEY === 'sk-test-key-placeholder-for-development') {
      return this.generateMockConversationalResponse(query, conversationContext);
    }

    try {
      const { 
        previousProducts = [], 
        previousQuery = '', 
        chatHistory = [],
        currentTopic = null,
        searchResults = {}
      } = conversationContext;
      
      // Debug logging for actual OpenAI calls
      console.log('🔍 OpenAI conversational response debug:', {
        query,
        previousProductsCount: previousProducts.length,
        previousQuery,
        currentTopic,
        productNames: previousProducts.slice(0, 3).map(p => p.name)
      });
      
      // Analyze the query to determine response type
      const queryLower = query.toLowerCase();
      const isProsConsQuery = queryLower.includes('pros') || queryLower.includes('cons') || 
                             queryLower.includes('advantages') || queryLower.includes('disadvantages') ||
                             queryLower.includes('benefits') || queryLower.includes('drawbacks');
      const isComparisonQuery = queryLower.includes('compare') || queryLower.includes('difference') ||
                                queryLower.includes('better') || queryLower.includes('versus') || 
                                queryLower.includes('vs') || queryLower.includes('which');
      const isFeaturesQuery = queryLower.includes('features') || queryLower.includes('specs') ||
                             queryLower.includes('capabilities') || queryLower.includes('specifications');
      const isPricingQuery = queryLower.includes('price') || queryLower.includes('cost') ||
                            queryLower.includes('expensive') || queryLower.includes('cheap');

      let systemPrompt = `You are a knowledgeable skincare expert and beauty assistant. You help users discover and learn about skincare products with detailed, contextual responses.

CURRENT CONVERSATION CONTEXT:
- User's previous search: "${previousQuery}"
- Current topic/category: ${currentTopic || 'general products'}
- Products being discussed: ${previousProducts.length} items
- Specific products: ${previousProducts.map(p => `• ${p.name} by ${p.brand} (${p.price?.display || 'Price varies'}) - Rating: ${p.rating || 'N/A'}/100`).join('\n')}

USER QUERY ANALYSIS:
- Query type: ${isProsConsQuery ? 'Pros/Cons Analysis' : isComparisonQuery ? 'Product Comparison' : isFeaturesQuery ? 'Feature Details' : isPricingQuery ? 'Pricing Information' : 'General Information'}

RESPONSE GUIDELINES BASED ON QUERY TYPE:

${isProsConsQuery ? `
FOR PROS/CONS QUERIES:
- Provide detailed pros and cons for EACH product listed above
- Use actual product names, brands, and specific features
- Base analysis on ratings, price points, and known characteristics
- Format with clear structure:
  **Product Name by Brand**
  
  **Pros:**
  • Specific positive point 1
  • Specific positive point 2
  • Specific positive point 3
  
  **Cons:**
  • Specific negative point 1
  • Specific negative point 2
  • Specific negative point 3
- Be specific about actual features and limitations
- No generic responses - reference actual products shown
- Do NOT suggest viewing products or clicking anything - just provide the analysis
` : ''}

${isComparisonQuery ? `
FOR COMPARISON QUERIES:
- Compare ALL products shown above side-by-side
- Highlight key differences in features, pricing, ratings
- Use specific product names and brands
- Format as structured comparison with categories
- Help user choose based on their likely priorities
` : ''}

${isFeaturesQuery ? `
FOR FEATURE QUERIES:
- Detail specific features of EACH product shown
- Reference actual product specifications and capabilities
- Use bullet points for clarity
- Group similar features across products
- Mention unique features that set each apart
` : ''}

${isPricingQuery ? `
FOR PRICING QUERIES:
- Discuss pricing of ALL products shown above
- Include value analysis (price vs features vs rating)
- Mention if alternatives exist in different price ranges
- Reference specific prices from the products listed
` : ''}

CRITICAL CONTEXT RULES:
1. Always reference the SPECIFIC products listed above by name and brand
2. Use actual ratings, prices, and features from the product data
3. Never provide generic advice - make it specific to these products
4. If asked about "them", "these", "it" - refer to the products shown
5. Do not suggest new products unless specifically asked for alternatives
6. Keep responses focused, detailed, and directly answering the question asked

RESPONSE FORMAT:
- Use product names and brands explicitly
- Provide actionable, specific information
- Structure with clear headings when analyzing multiple products
- End with a helpful summary or recommendation if appropriate`;

      // Build conversation messages
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      // Add previous context with detailed product information
      if (previousQuery && previousProducts.length > 0) {
        const detailedProductInfo = previousProducts.map((p, index) => {
          const features = p.features && p.features.length > 0 ? p.features.slice(0, 3).join(', ') : 'Standard features';
          const sentiment = p.sentiment ? `${p.sentiment.text} (${Math.round(p.sentiment.score * 100)}% positive)` : 'No sentiment data';
          
          return `${index + 1}. **${p.name}** by ${p.brand}
   - Price: ${p.price?.display || 'Price varies'}
   - Rating: ${p.rating || 'N/A'}/100
   - Reviews: ${p.reviews?.display || 'No reviews'}
   - Key Features: ${features}
   - User Sentiment: ${sentiment}
   - Category: ${p.category || 'General'}`;
        }).join('\n\n');
        
        messages.push({
          role: 'assistant',
          content: `Here are the ${previousProducts.length} specific products I showed you for "${previousQuery}":\n\n${detailedProductInfo}\n\nThese are the exact products we're discussing. All my responses will reference these specific items unless you ask for something completely different.`
        });
      }

      // Add chat history (last 6 messages to maintain context but not exceed token limits)
      const recentHistory = chatHistory.slice(-6);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });

      // Add current question
      messages.push({
        role: 'user',
        content: query
      });

      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 800,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      });

      return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
    } catch (error) {
      logger.error('OpenAI conversational response error:', error);
      return this.generateMockConversationalResponse(query, conversationContext);
    }
  }

  /**
   * Generate mock conversational responses for development
   */
  generateMockConversationalResponse(query, conversationContext = {}) {
    const { 
      previousProducts = [], 
      previousQuery = '',
      currentTopic = null
    } = conversationContext;
    const lowerQuery = query.toLowerCase();
    
    // Debug logging
    console.log('🔍 Mock conversational response debug:', {
      query,
      previousProductsCount: previousProducts.length,
      previousQuery,
      currentTopic,
      productNames: previousProducts.map(p => p.name)
    });

    // Handle price-related questions first (critical for context preservation)
    if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('how much')) {
      if (previousProducts.length > 0) {
        const productList = previousProducts.slice(0, 5).map(p => 
          `• **${p.name}** by ${p.brand}: ${p.price?.display || 'Price varies'}`
        ).join('\n');
        
        return `Here are the prices for the ${currentTopic || previousQuery} products I showed you:

${productList}

${previousProducts.length > 5 ? `\n...and ${previousProducts.length - 5} more products` : ''}

These prices may vary depending on the retailer and current promotions. Would you like me to help you find the best deals or suggest more budget-friendly alternatives in the ${currentTopic || previousQuery} category?`;
      } else {
        return "I'd be happy to help with pricing information! Could you specify which products you're asking about?";
      }
    }

    // Handle common follow-up questions
    if (lowerQuery.includes('compare') || lowerQuery.includes('difference')) {
      if (previousProducts.length >= 2) {
        const product1 = previousProducts[0];
        const product2 = previousProducts[1];
        return `Great question! Let me compare ${product1.name} and ${product2.name}:

**${product1.name}** (${product1.price?.display || 'N/A'}):
- Rating: ${product1.rating}/100
- Brand: ${product1.brand}
- Best for: ${product1.category} enthusiasts

**${product2.name}** (${product2.price?.display || 'N/A'}):
- Rating: ${product2.rating}/100  
- Brand: ${product2.brand}
- Best for: Budget-conscious buyers

The main differences are in price point and specific features. Would you like me to dive deeper into any particular aspect?`;
      } else {
        return "I'd be happy to help you compare products! Could you be more specific about which products you'd like me to compare from the ones I showed you earlier?";
      }
    }

    if (lowerQuery.includes('top') || lowerQuery.includes('best') || lowerQuery.includes('recommend')) {
      if (previousProducts.length > 0) {
        const topProduct = previousProducts[0]; // Assuming first is highest rated
        return `Based on the products I showed you, I'd recommend the **${topProduct.name}** as the top choice. Here's why:

✅ **High rating**: ${topProduct.rating}/100 - shows strong user satisfaction
✅ **Good value**: Priced at ${topProduct.price?.display || 'competitive pricing'}
✅ **Quality brand**: ${topProduct.brand} is well-regarded in this category
✅ **Popular choice**: Has ${topProduct.reviews?.count || 'many'} positive reviews

This product strikes a great balance between quality, features, and price. Would you like to know more about its specific features or see alternatives?`;
      } else {
        return "I'd be happy to make a recommendation! Could you let me know what type of product you're looking for?";
      }
    }

    if (lowerQuery.includes('cheaper') || lowerQuery.includes('budget') || lowerQuery.includes('alternative')) {
      if (previousProducts.length > 0) {
        const topicName = currentTopic || previousQuery || 'products';
        const avgPrice = previousProducts.reduce((sum, p) => {
          const price = p.price?.min || parseFloat(p.price?.display?.replace(/[^0-9.]/g, '')) || 0;
          return sum + price;
        }, 0) / previousProducts.length;
        
        return `Looking for more budget-friendly ${topicName} options? Based on the products I showed you (average price: $${Math.round(avgPrice)}), here are some strategies:

💡 **Budget-friendly ${topicName} alternatives:**
- Look for older model versions of similar ${topicName}
- Check for seasonal sales and bundle deals on ${topicName}
- Consider refurbished or open-box ${topicName} items
- Look at lesser-known but well-reviewed ${topicName} brands
- Compare prices across different retailers

**Specific suggestions for ${topicName}:**
- Target budget: Under $${Math.round(avgPrice * 0.7)} (30% less than current options)
- Consider store brands or generic versions
- Look for products with fewer premium features but same core functionality

Would you like me to search for more budget-friendly alternatives in the ${topicName} category?`;
      } else {
        return `Looking for more budget-friendly options? Here are some strategies:

💡 **Consider these alternatives:**
- Look for older model versions of the same products
- Check for seasonal sales or bundle deals
- Consider refurbished or open-box items
- Look at lesser-known but well-reviewed brands

Would you like me to search for more budget-friendly alternatives in the same category?`;
      }
    }

    if (lowerQuery.includes('pros') || lowerQuery.includes('cons') || lowerQuery.includes('disadvantage') || lowerQuery.includes('problem')) {
      if (previousProducts.length > 0) {
        const product = previousProducts[0];
        return `Great question about the pros and cons! Based on user feedback for products like the **${product.name}**:

**Pros:**
- High user satisfaction (${product.rating}/100 rating)
- Quality build from ${product.brand}
- Good value at ${product.price?.display}
- Popular choice with many reviews

**Potential Cons:**
- Price might be higher than some alternatives
- May have a learning curve for new users
- Specific features might not suit everyone's needs

For more detailed pros and cons, I'd recommend reading recent user reviews. Would you like me to help you find similar products with different trade-offs?`;
      } else {
        return "I'd be happy to discuss the pros and cons of specific products! Which product from our previous search would you like me to analyze?";
      }
    }

    if (lowerQuery.includes('tell me more') || lowerQuery.includes('details') || lowerQuery.includes('features')) {
      if (previousProducts.length > 0) {
        const product = previousProducts[0];
        return `I'd be happy to tell you more about the **${product.name}**!

**Key Details:**
- **Brand**: ${product.brand}
- **Price Range**: ${product.price?.display || 'Check retailer for current pricing'}
- **User Rating**: ${product.rating}/100 based on ${product.reviews?.count || 'user reviews'}
- **Category**: ${product.category}

**Popular Features:**
${product.features ? product.features.slice(0, 4).map(f => `• ${f}`).join('\n') : '• High-quality construction\n• User-friendly design\n• Good value for money'}

This product is well-regarded for its quality and reliability. Is there a specific aspect you'd like me to elaborate on?`;
      } else {
        return "I'd be happy to provide more details! Which specific product from our conversation would you like to learn more about?";
      }
    }

    // Default conversational response
    return `That's a great question! I'm here to help you learn more about skincare products and make informed decisions. 

Based on our conversation${previousQuery ? ` about "${previousQuery}"` : ''}, I can help you with:
- Detailed product comparisons
- Pros and cons analysis  
- Budget-friendly alternatives
- Feature explanations
- Purchase recommendations

What specific aspect would you like to explore further?`;
  }
}

module.exports = new OpenAIService();