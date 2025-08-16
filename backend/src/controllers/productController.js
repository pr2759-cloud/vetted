/**
 * Product Controller
 * Handles product-related operations
 */

const { logger } = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const Product = require('../models/Product');
const { PRODUCT_CATEGORIES } = require('../config/constants');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

/**
 * Map user-friendly category names to database keys
 */
function mapCategoryNameToKey(categoryName) {
  // Create reverse mapping from display names to keys
  const nameToKeyMap = {};
  Object.entries(PRODUCT_CATEGORIES).forEach(([key, value]) => {
    nameToKeyMap[value.name.toLowerCase()] = key;
    nameToKeyMap[key.toLowerCase()] = key; // Also accept the key itself
  });
  
  const normalizedName = categoryName.toLowerCase();
  return nameToKeyMap[normalizedName] || categoryName; // Return original if no mapping found
}

class ProductController {

  /**
   * Get products with optional filtering and pagination
   */
  async getProducts(req, res) {
    try {
      const { 
        category, 
        brand, 
        minRating, 
        sortBy = 'rating', 
        limit = 20, 
        offset = 0 
      } = req.query;

      logger.info('Getting products', {
        requestId: req.id,
        filters: { category, brand, minRating, sortBy },
        pagination: { limit, offset }
      });

      // Build database query
      const query = { status: 'active' };
      
      if (category) {
        query.category = { $regex: category, $options: 'i' };
      }
      if (brand) {
        query.brand = { $regex: brand, $options: 'i' };
      }
      if (minRating) {
        query.rating = { $gte: parseFloat(minRating) };
      }

      // Build sort criteria
      let sortCriteria = {};
      switch (sortBy) {
        case 'price':
          sortCriteria = { 'priceRange.min': 1 };
          break;
        case 'popularity':
          sortCriteria = { 'analytics.views': -1 };
          break;
        case 'newest':
          sortCriteria = { createdAt: -1 };
          break;
        default: // rating
          sortCriteria = { rating: -1 };
      }

      // Get total count and products
      const total = await Product.countDocuments(query);
      const products = await Product.find(query)
        .sort(sortCriteria)
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .select('-moderationFlags -externalIds')
        .lean();

      // Transform products to match frontend format
      const transformedProducts = products.map(product => ({
        id: product._id.toString(),
        name: product.name,
        price: {
          min: product.priceRange.min,
          max: product.priceRange.max,
          display: product.price || `$${product.priceRange.min}–$${product.priceRange.max}`
        },
        rating: product.rating,
        reviews: {
          count: product.reviewCount,
          display: `${product.reviewCount?.toLocaleString() || 0} reviews`
        },
        tags: product.tags || [],
        category: product.category,
        brand: product.brand,
        sentiment: {
          label: 'well-regarded',
          emoji: '👍',
          text: 'Well Regarded',
          description: 'Popular choice',
          score: Math.min(1, product.rating / 100),
          confidence: 0.85,
          mentionCount: product.reviewCount || 0,
          trending: 'stable',
          breakdown: {
            quality: Math.min(1, product.rating / 100),
            value: 0.8,
            popularity: Math.min(1, (product.analytics?.views || 0) / 1000),
            reliability: Math.min(1, product.rating / 100)
          }
        },
        images: product.images,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }));

      res.json({
        success: true,
        data: {
          products,
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (offset + limit) < total
        }
      });

    } catch (error) {
      logger.error('Failed to get products', {
        requestId: req.id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve products',
        requestId: req.id
      });
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(req, res) {
    try {
      const { productId } = req.params;

      logger.info('Getting product by ID', {
        requestId: req.id,
        productId
      });

      const product = await Product.findById(productId)
        .select('-moderationFlags -externalIds')
        .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
          requestId: req.id
        });
      }

      // Transform to match frontend format
      const transformedProduct = {
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: {
          min: product.priceRange.min,
          max: product.priceRange.max,
          display: product.price || `$${product.priceRange.min}–$${product.priceRange.max}`
        },
        rating: product.rating,
        reviews: {
          count: product.reviewCount,
          display: `${product.reviewCount?.toLocaleString() || 0} reviews`
        },
        tags: product.tags || [],
        features: product.features || [],
        category: product.category,
        brand: product.brand,
        images: product.images || [],
        availability: product.availability?.inStock ? 'in_stock' : 'out_of_stock',
        sentiment: {
          label: 'well-regarded',
          emoji: '👍',
          text: 'Well Regarded',
          description: 'Popular choice',
          score: Math.min(1, product.rating / 100),
          confidence: 0.85,
          mentionCount: product.reviewCount || 0,
          trending: 'stable',
          breakdown: {
            quality: Math.min(1, product.rating / 100),
            value: 0.8,
            popularity: Math.min(1, (product.analytics?.views || 0) / 1000),
            reliability: Math.min(1, product.rating / 100)
          }
        },
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      };

      res.json({
        success: true,
        data: transformedProduct
      });

    } catch (error) {
      logger.error('Failed to get product', {
        requestId: req.id,
        productId: req.params.productId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve product',
        requestId: req.id
      });
    }
  }

  /**
   * Get product categories
   */
  async getCategories(req, res) {
    try {
      logger.info('Getting product categories', { requestId: req.id });

      // Get categories from actual products in database
      const categories = await Product.distinct('category', { status: 'active' });

      res.json({
        success: true,
        data: {
          categories
        }
      });

    } catch (error) {
      logger.error('Failed to get categories', {
        requestId: req.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve categories',
        requestId: req.id
      });
    }
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(req, res) {
    try {
      const { category, timeframe = 'week' } = req.query;

      logger.info('Getting trending products', {
        requestId: req.id,
        category,
        timeframe
      });

      // Build query for trending products (high views recently)
      const query = { status: 'active' };
      
      if (category) {
        query.category = { $regex: category, $options: 'i' };
      }

      // Get products sorted by views and rating for trending
      const products = await Product.find(query)
        .sort({ 'analytics.views': -1, rating: -1 })
        .limit(20)
        .select('-moderationFlags -externalIds')
        .lean();

      // Transform to match frontend format
      const transformedProducts = products.map(product => ({
        id: product._id.toString(),
        name: product.name,
        price: {
          min: product.priceRange.min,
          max: product.priceRange.max,
          display: product.price || `$${product.priceRange.min}–$${product.priceRange.max}`
        },
        rating: product.rating,
        reviews: {
          count: product.reviewCount,
          display: `${product.reviewCount?.toLocaleString() || 0} reviews`
        },
        tags: product.tags || [],
        category: product.category,
        brand: product.brand,
        sentiment: {
          label: 'well-regarded',
          emoji: '👍',
          text: 'Trending',
          description: 'Popular choice',
          score: Math.min(1, product.rating / 100),
          confidence: 0.85,
          mentionCount: product.reviewCount || 0,
          trending: 'up',
          breakdown: {
            quality: Math.min(1, product.rating / 100),
            value: 0.8,
            popularity: Math.min(1, (product.analytics?.views || 0) / 1000),
            reliability: Math.min(1, product.rating / 100)
          }
        },
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }));

      res.json({
        success: true,
        data: {
          products: transformedProducts,
          timeframe,
          category
        }
      });

    } catch (error) {
      logger.error('Failed to get trending products', {
        requestId: req.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve trending products',
        requestId: req.id
      });
    }
  }

  /**
   * Get similar products
   */
  async getSimilarProducts(req, res) {
    try {
      const { productId } = req.params;

      logger.info('Getting similar products', {
        requestId: req.id,
        productId
      });

      // Find the product first
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
          requestId: req.id
        });
      }

      // Find similar products in same category
      const similarProducts = await Product.find({
        _id: { $ne: productId },
        category: product.category,
        status: 'active'
      })
      .sort({ rating: -1 })
      .limit(10)
      .select('-moderationFlags -externalIds')
      .lean();

      // Transform to match frontend format
      const transformedProducts = similarProducts.map(prod => ({
        id: prod._id.toString(),
        name: prod.name,
        price: {
          min: prod.priceRange.min,
          max: prod.priceRange.max,
          display: prod.price || `$${prod.priceRange.min}–$${prod.priceRange.max}`
        },
        rating: prod.rating,
        reviews: {
          count: prod.reviewCount,
          display: `${prod.reviewCount?.toLocaleString() || 0} reviews`
        },
        tags: prod.tags || [],
        category: prod.category,
        brand: prod.brand,
        sentiment: {
          label: 'well-regarded',
          emoji: '👍',
          text: 'Similar Product',
          description: 'Related choice',
          score: Math.min(1, prod.rating / 100),
          confidence: 0.85,
          mentionCount: prod.reviewCount || 0,
          trending: 'stable',
          breakdown: {
            quality: Math.min(1, prod.rating / 100),
            value: 0.8,
            popularity: Math.min(1, (prod.analytics?.views || 0) / 1000),
            reliability: Math.min(1, prod.rating / 100)
          }
        },
        createdAt: prod.createdAt,
        updatedAt: prod.updatedAt
      }));

      res.json({
        success: true,
        data: {
          products: transformedProducts
        }
      });

    } catch (error) {
      logger.error('Failed to get similar products', {
        requestId: req.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve similar products',
        requestId: req.id
      });
    }
  }

  /**
   * Get product reviews summary
   */
  async getProductReviews(req, res) {
    try {
      const { productId } = req.params;

      logger.info('Getting product reviews', {
        requestId: req.id,
        productId
      });

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
          requestId: req.id
        });
      }

      const reviewsSummary = {
        total: product.reviewCount || 0,
        average: product.rating ? product.rating / 20 : 0, // Convert to 5-star scale
        distribution: {
          5: 0.6,
          4: 0.25,
          3: 0.1,
          2: 0.03,
          1: 0.02
        },
        highlights: product.features || [
          'Great value for money',
          'Easy to use',
          'Effective results'
        ]
      };

      res.json({
        success: true,
        data: reviewsSummary
      });

    } catch (error) {
      logger.error('Failed to get product reviews', {
        requestId: req.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve product reviews',
        requestId: req.id
      });
    }
  }

  // ===== ADMIN METHODS =====

  /**
   * Get all products for admin (with full details)
   */
  async getAllProducts(req, res) {
    try {
      const { page = 1, limit = 20, search = '', category = '' } = req.query;
      const offset = (page - 1) * limit;

      logger.info('Getting all products for admin', {
        requestId: req.id,
        page,
        limit,
        search,
        category
      });

      // Build database query
      const query = {};
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (category) {
        query.category = { $regex: category, $options: 'i' };
      }

      // Get total count and products
      const total = await Product.countDocuments(query);
      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit))
        .select('-moderationFlags -externalIds')
        .lean();

      // Transform to match admin format
      const paginatedProducts = products.map(product => ({
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        brand: product.brand,
        category: product.category,
        price: {
          min: product.priceRange.min,
          max: product.priceRange.max,
          display: product.price || `$${product.priceRange.min}–$${product.priceRange.max}`
        },
        rating: product.rating,
        reviews: {
          count: product.reviewCount,
          display: `${product.reviewCount?.toLocaleString() || 0} reviews`
        },
        tags: product.tags || [],
        features: product.features || [],
        images: product.images || [],
        availability: product.availability?.inStock ? 'in_stock' : 'out_of_stock',
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }));

      res.json({
        success: true,
        data: {
          products: paginatedProducts,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get all products', {
        requestId: req.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve products',
        requestId: req.id
      });
    }
  }

  /**
   * Create a new product
   */
  async createProduct(req, res) {
    try {
      const {
        name,
        description = '',
        brand = '',
        category,
        priceMin,
        priceMax,
        rating = 0,
        reviewCount = 0,
        tags = '',
        features = '',
        availability = 'in_stock',
        customerReviews = '[]'
      } = req.body;

      // Map user-friendly category name to database key
      const mappedCategory = mapCategoryNameToKey(category);
      
      logger.info('Creating new product', {
        requestId: req.id,
        name,
        category,
        mappedCategory,
        brand
      });

      // Validate price range
      if (parseFloat(priceMin) > parseFloat(priceMax)) {
        return res.status(400).json({
          success: false,
          error: 'Minimum price cannot be greater than maximum price',
          requestId: req.id
        });
      }

      // Process uploaded images
      const imagePaths = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

      // Parse tags, features, and customer reviews
      const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
      const featureArray = features ? features.split(',').map(feature => feature.trim()).filter(feature => feature) : [];
      let reviewsArray = [];
      try {
        reviewsArray = typeof customerReviews === 'string' ? JSON.parse(customerReviews) : customerReviews || [];
      } catch (e) {
        logger.warn('Failed to parse customer reviews, using empty array', { customerReviews });
        reviewsArray = [];
      }

      // Generate sentiment from reviews
      const sentiment = this.generateSentimentFromReviews ? 
        this.generateSentimentFromReviews(reviewsArray) : 
        {
          label: 'well-regarded',
          emoji: '👍',
          text: 'New Product',
          description: 'Recently added',
          score: 0.8,
          confidence: 0.8,
          mentionCount: 0,
          trending: 'new',
          breakdown: {
            quality: 0.8,
            value: 0.8,
            popularity: 0.5,
            reliability: 0.8
          }
        };

      // Create MongoDB document
      const productDoc = new Product({
        name: name.trim(),
        description: description.trim(),
        brand: brand.trim(),
        category: mappedCategory,
        priceRange: {
          min: parseFloat(priceMin),
          max: parseFloat(priceMax),
          currency: 'USD'
        },
        price: `$${priceMin}–$${priceMax}`,
        rating: parseInt(rating),
        reviewCount: parseInt(reviewCount),
        tags: tagArray,
        features: featureArray,
        images: imagePaths.map(path => ({
          url: path,
          alt: `${name} image`,
          isPrimary: false
        })),
        availability: {
          inStock: availability === 'in_stock',
          retailers: []
        },
        status: 'active',
        analytics: {
          views: 0,
          uniqueVisitors: 0,
          wishlistAdds: 0,
          shares: 0,
          clickThroughs: 0
        }
      });

      // Set first image as primary if images exist
      if (productDoc.images && productDoc.images.length > 0) {
        productDoc.images[0].isPrimary = true;
      }

      const savedProduct = await productDoc.save();
      
      // Transform to match frontend format
      const responseProduct = {
        id: savedProduct._id.toString(),
        name: savedProduct.name,
        description: savedProduct.description,
        brand: savedProduct.brand,
        category: savedProduct.category,
        price: {
          min: savedProduct.priceRange.min,
          max: savedProduct.priceRange.max,
          display: savedProduct.price
        },
        rating: savedProduct.rating,
        reviews: {
          count: savedProduct.reviewCount,
          display: `${savedProduct.reviewCount.toLocaleString()} reviews`
        },
        tags: savedProduct.tags,
        features: savedProduct.features,
        images: savedProduct.images ? savedProduct.images.map(img => img.url || img) : [],
        availability,
        sentiment: {
          label: 'well-regarded',
          emoji: '👍',
          text: 'New Product',
          description: 'Recently added',
          score: Math.min(1, (savedProduct.rating || 0) / 100),
          confidence: 0.8,
          mentionCount: savedProduct.reviewCount || 0,
          trending: 'new',
          breakdown: {
            quality: Math.min(1, (savedProduct.rating || 0) / 100),
            value: 0.8,
            popularity: 0.5,
            reliability: Math.min(1, (savedProduct.rating || 0) / 100)
          }
        },
        createdAt: savedProduct.createdAt.toISOString(),
        updatedAt: savedProduct.updatedAt.toISOString()
      };

      res.status(201).json({
        success: true,
        data: responseProduct,
        message: 'Product created successfully'
      });

    } catch (error) {
      console.error('Product creation error:', error);
      logger.error('Failed to create product', {
        requestId: req.id,
        error: error.message,
        stack: error.stack,
        requestBody: req.body,
        files: req.files ? req.files.map(f => f.filename) : 'none'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create product',
        requestId: req.id
      });
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      logger.info('Updating product', {
        requestId: req.id,
        productId: id
      });

      const existingProduct = await Product.findById(id);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
          requestId: req.id
        });
      }

      // Process uploaded images if any
      const imagePaths = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];
      
      // Prepare update data
      const updateFields = { ...updateData };
      
      // Handle images - append new ones to existing
      if (imagePaths.length > 0) {
        const newImages = imagePaths.map(path => ({
          url: path,
          alt: `${existingProduct.name} image`,
          isPrimary: false
        }));
        updateFields.images = [...(existingProduct.images || []), ...newImages];
      }

      // Update the product
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).lean();

      // Transform to match frontend format
      const transformedProduct = {
        id: updatedProduct._id.toString(),
        name: updatedProduct.name,
        description: updatedProduct.description,
        brand: updatedProduct.brand,
        category: updatedProduct.category,
        price: {
          min: updatedProduct.priceRange.min,
          max: updatedProduct.priceRange.max,
          display: updatedProduct.price
        },
        rating: updatedProduct.rating,
        reviews: {
          count: updatedProduct.reviewCount,
          display: `${updatedProduct.reviewCount?.toLocaleString() || 0} reviews`
        },
        tags: updatedProduct.tags || [],
        features: updatedProduct.features || [],
        images: updatedProduct.images?.map(img => img.url) || [],
        availability: updatedProduct.availability?.inStock ? 'in_stock' : 'out_of_stock',
        createdAt: updatedProduct.createdAt.toISOString(),
        updatedAt: updatedProduct.updatedAt.toISOString()
      };

      res.json({
        success: true,
        data: transformedProduct,
        message: 'Product updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update product', {
        requestId: req.id,
        productId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update product',
        requestId: req.id
      });
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      logger.info('Deleting product', {
        requestId: req.id,
        productId: id
      });

      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
          requestId: req.id
        });
      }

      // Delete the product from database
      await Product.findByIdAndDelete(id);

      // TODO: Delete associated files (images) if needed
      // Clean up uploaded image files
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          if (image.url && image.url.startsWith('/uploads/')) {
            try {
              const imagePath = path.join(__dirname, '../../', image.url);
              await fs.unlink(imagePath);
            } catch (err) {
              logger.warn(`Failed to delete image file: ${image.url}`, err);
            }
          }
        }
      }

      res.json({
        success: true,
        message: 'Product deleted successfully',
        data: { id }
      });

    } catch (error) {
      logger.error('Failed to delete product', {
        requestId: req.id,
        productId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to delete product',
        requestId: req.id
      });
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(req, res) {
    try {
      logger.info('Getting dashboard stats', { requestId: req.id });

      // Get statistics from actual database
      const totalProducts = await Product.countDocuments({ status: 'active' });
      const categories = await Product.distinct('category', { status: 'active' });
      const totalCategories = categories.length;
      
      // Get aggregated stats
      const productStats = await Product.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: '$reviewCount' },
            avgRating: { $avg: '$rating' },
            totalValue: { $sum: '$priceRange.max' }
          }
        }
      ]);
      
      const statsData = productStats[0] || {
        totalReviews: 0,
        avgRating: 0,
        totalValue: 0
      };
      
      // Get recent products
      const recentProducts = await Product.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name brand category rating createdAt')
        .lean();
      
      // Get top categories
      const topCategories = await Product.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { category: '$_id', count: 1, _id: 0 } }
      ]);
      
      const stats = {
        totalProducts,
        totalCategories,
        totalReviews: statsData.totalReviews,
        avgReviewsPerProduct: totalProducts > 0 ? statsData.totalReviews / totalProducts : 0,
        avgRating: statsData.avgRating || 0,
        totalValue: statsData.totalValue || 0,
        recentProducts: recentProducts.map(p => ({
          id: p._id.toString(),
          name: p.name,
          brand: p.brand,
          category: p.category,
          rating: p.rating,
          createdAt: p.createdAt
        })),
        topCategories,
        sentimentBreakdown: {
          'well-regarded': Math.floor(totalProducts * 0.6),
          'highly-regarded': Math.floor(totalProducts * 0.3),
          'mixed-reviews': Math.floor(totalProducts * 0.1)
        }
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Failed to get dashboard stats', {
        requestId: req.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard statistics',
        requestId: req.id
      });
    }
  }

  /**
   * Bulk import products from CSV
   */
  async bulkImportProducts(req, res) {
    try {
      logger.info('Starting bulk import', { requestId: req.id });

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No CSV file provided'
        });
      }

      const results = [];
      const errors = [];

      // TODO: Implement CSV parsing and product creation
      // This is a placeholder implementation
      
      res.json({
        success: true,
        data: {
          imported: results.length,
          errors: errors.length,
          results,
          errors
        },
        message: `Successfully imported ${results.length} products`
      });

    } catch (error) {
      logger.error('Bulk import failed', {
        requestId: req.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Bulk import failed',
        requestId: req.id
      });
    }
  }

  /**
   * Export products to CSV
   */
  async exportProducts(req, res) {
    try {
      logger.info('Exporting products to CSV', { requestId: req.id });

      // Get products from database
      const products = await Product.find({ status: 'active' })
        .select('name description brand category priceRange rating reviewCount tags createdAt')
        .lean();
        
      const csvData = products.map(product => ({
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        brand: product.brand,
        category: product.category,
        priceMin: product.priceRange.min,
        priceMax: product.priceRange.max,
        rating: product.rating,
        reviewCount: product.reviewCount || 0,
        tags: (product.tags || []).join(','),
        createdAt: product.createdAt
      }));

      const csvContent = this.arrayToCSV(csvData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
      res.send(csvContent);

    } catch (error) {
      logger.error('Failed to export products', {
        requestId: req.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: 'Failed to export products',
        requestId: req.id
      });
    }
  }

  // Helper methods
  getSentimentEmoji(label) {
    const emojiMap = {
      'highly-regarded': '✨',
      'well-regarded': '👍',
      'mixed-reviews': '🤔',
      'poorly-regarded': '👎',
      'highly-criticized': '❌',
      'insufficient-data': '❓'
    };
    return emojiMap[label] || '📦';
  }

  // These helper methods are no longer needed as we're using database aggregation
  // But keeping them for backward compatibility if needed elsewhere
  async getTopCategories() {
    return await Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { category: '$_id', count: 1, _id: 0 } }
    ]);
  }

  async getSentimentBreakdown() {
    const totalProducts = await Product.countDocuments({ status: 'active' });
    return {
      'well-regarded': Math.floor(totalProducts * 0.6),
      'highly-regarded': Math.floor(totalProducts * 0.3),
      'mixed-reviews': Math.floor(totalProducts * 0.1)
    };
  }

  async getAverageReviewsPerProduct() {
    const result = await Product.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: '$reviewCount' },
          totalProducts: { $sum: 1 }
        }
      }
    ]);
    
    if (result.length === 0) return 0;
    return result[0].totalProducts > 0 ? result[0].totalReviews / result[0].totalProducts : 0;
  }

  arrayToCSV(array) {
    if (!array.length) return '';

    const headers = Object.keys(array[0]);
    const csvContent = [
      headers.join(','),
      ...array.map(obj => 
        headers.map(header => {
          const value = obj[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  /**
   * Generate sentiment analysis from customer reviews
   */
  generateSentimentFromReviews(reviews) {
    if (!reviews || reviews.length === 0) {
      return {
        label: 'insufficient-data',
        emoji: '❓',
        text: 'Insufficient Data',
        description: 'Not enough reviews to determine sentiment',
        score: 0,
        confidence: 0,
        mentionCount: 0,
        trending: 'stable',
        breakdown: {
          quality: 0,
          value: 0,
          popularity: 0,
          reliability: 0
        }
      };
    }

    // Calculate average rating
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    // Determine sentiment based on average rating and review count
    let sentimentLabel, emoji, text, description;
    
    if (avgRating >= 4.5) {
      sentimentLabel = 'highly-regarded';
      emoji = '✨';
      text = 'Highly Beloved';
      description = 'Exceptional customer satisfaction';
    } else if (avgRating >= 4.0) {
      sentimentLabel = 'well-regarded';
      emoji = '👍';
      text = 'Well Liked';
      description = 'Strong positive feedback';
    } else if (avgRating >= 3.0) {
      sentimentLabel = 'mixed-reviews';
      emoji = '🤔';
      text = 'Mixed Reviews';
      description = 'Varied customer experiences';
    } else if (avgRating >= 2.0) {
      sentimentLabel = 'poorly-regarded';
      emoji = '👎';
      text = 'Poor Reception';
      description = 'Mostly negative feedback';
    } else {
      sentimentLabel = 'highly-criticized';
      emoji = '❌';
      text = 'Highly Criticized';
      description = 'Significant customer concerns';
    }

    // Calculate sentiment score (0-1)
    const score = Math.max(0, Math.min(1, (avgRating - 1) / 4));
    
    return {
      label: sentimentLabel,
      emoji,
      text,
      description,
      score,
      confidence: Math.min(0.95, 0.5 + (reviews.length * 0.05)), // Higher confidence with more reviews
      mentionCount: reviews.length,
      trending: reviews.length > 10 ? 'up' : 'stable',
      breakdown: {
        quality: Math.min(1, score + 0.1),
        value: Math.max(0, score - 0.1),
        popularity: Math.min(1, reviews.length / 100),
        reliability: score
      }
    };
  }
}

module.exports = new ProductController();