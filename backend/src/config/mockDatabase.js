/**
 * Mock Database for Development without MongoDB
 */

const { logger } = require('../utils/logger');

class MockDatabase {
  constructor() {
    this.isConnected = true;
    this.products = [
      {
        id: '1',
        name: 'CeraVe Foaming Facial Cleanser',
        category: 'Face Cleansers',
        brand: 'CeraVe',
        rating: 4.5,
        sentiment: 'highly-regarded',
        trending: 'up'
      },
      {
        id: '2', 
        name: 'The Ordinary Niacinamide 10% + Zinc 1%',
        category: 'Serums & Treatments',
        brand: 'The Ordinary',
        rating: 4.3,
        sentiment: 'well-regarded',
        trending: 'stable'
      },
      {
        id: '3',
        name: 'Neutrogena Hydrating Foaming Cleanser',
        category: 'Face Cleansers',
        brand: 'Neutrogena',
        rating: 4.2,
        sentiment: 'well-regarded',
        trending: 'stable'
      },
      {
        id: '4',
        name: 'Olay Regenerist Micro-Sculpting Cream',
        category: 'Moisturizers',
        brand: 'Olay',
        rating: 4.4,
        sentiment: 'highly-regarded',
        trending: 'up'
      }
    ];
  }

  async connect() {
    logger.info('Using mock database for development');
    return Promise.resolve();
  }

  async healthCheck() {
    return {
      status: 'healthy',
      message: 'Mock database is operational',
      timestamp: new Date().toISOString()
    };
  }

  getConnectionStatus() {
    return {
      status: 'connected',
      readyState: 1,
      host: 'mock',
      port: null,
      database: 'mock_vetted',
      isConnected: true
    };
  }

  async searchProducts(query) {
    // Simple mock search
    const results = this.products.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
    );

    return {
      products: results,
      total: results.length,
      query,
      searchTime: 45
    };
  }
}

const mockDb = new MockDatabase();

module.exports = {
  connectDatabase: () => mockDb.connect(),
  getDatabaseStatus: () => mockDb.getConnectionStatus(),
  healthCheck: () => mockDb.healthCheck(),
  mockDb
};