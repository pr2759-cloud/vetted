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
        name: 'Apple iPhone 15',
        category: 'Electronics',
        brand: 'Apple',
        rating: 4.5,
        sentiment: 'highly-regarded',
        trending: 'up'
      },
      {
        id: '2', 
        name: 'Samsung Galaxy S24',
        category: 'Electronics',
        brand: 'Samsung',
        rating: 4.3,
        sentiment: 'well-regarded',
        trending: 'stable'
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