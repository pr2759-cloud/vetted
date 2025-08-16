import axios, { AxiosResponse } from 'axios';
import { SearchQuery, SearchResult, Product, ApiResponse } from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Search API
export const searchApi = {
  async searchProducts(query: SearchQuery): Promise<SearchResult> {
    const response: AxiosResponse<ApiResponse<SearchResult>> = await api.post('/search', query);
    return response.data.data;
  },

  async getSearchSuggestions(partialQuery: string): Promise<string[]> {
    const response: AxiosResponse<ApiResponse<{ suggestions: string[] }>> = await api.get(
      `/search/suggestions?q=${encodeURIComponent(partialQuery)}`
    );
    return response.data.data.suggestions;
  },

  async getTrendingSearches(): Promise<any[]> {
    const response: AxiosResponse<ApiResponse<any[]>> = await api.get('/search/trending');
    return response.data.data || [];
  },

  async getSearchHistory(): Promise<any[]> {
    const response: AxiosResponse<ApiResponse<{ history: any[] }>> = await api.get('/search/history');
    return response.data.data.history;
  },

  async getSearchById(searchId: string): Promise<SearchResult> {
    const response: AxiosResponse<ApiResponse<SearchResult>> = await api.get(`/search/${searchId}`);
    return response.data.data;
  },

  async chatWithAI(query: string, conversationContext?: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await api.post('/search/chat', {
      query,
      conversationContext
    });
    return response.data.data;
  }
};

// Products API
export const productsApi = {
  async getProducts(params?: {
    category?: string;
    brand?: string;
    minRating?: number;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    const response: AxiosResponse<ApiResponse<{ products: Product[]; total: number }>> = 
      await api.get('/products', { params });
    return response.data.data;
  },

  async getProductById(productId: string): Promise<Product> {
    const response: AxiosResponse<ApiResponse<Product>> = await api.get(`/products/${productId}`);
    return response.data.data;
  },

  async getCategories(): Promise<string[]> {
    const response: AxiosResponse<ApiResponse<{ categories: string[] }>> = await api.get('/products/categories');
    return response.data.data.categories;
  },

  async getTrendingProducts(params?: {
    category?: string;
    timeframe?: 'day' | 'week' | 'month';
  }): Promise<Product[]> {
    const response: AxiosResponse<ApiResponse<{ products: Product[] }>> = 
      await api.get('/products/trending', { params });
    return response.data.data.products;
  },

  async getSimilarProducts(productId: string): Promise<Product[]> {
    const response: AxiosResponse<ApiResponse<{ products: Product[] }>> = 
      await api.get(`/products/${productId}/similar`);
    return response.data.data.products;
  }
};

// Sentiment API
export const sentimentApi = {
  async getProductSentiment(productId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await api.get(`/sentiment/${productId}`);
    return response.data.data;
  },

  async getSentimentTrends(params?: {
    category?: string;
    timeframe?: string;
  }): Promise<any[]> {
    const response: AxiosResponse<ApiResponse<{ trends: any[] }>> = 
      await api.get('/sentiment/trends', { params });
    return response.data.data.trends;
  }
};

// Analytics API
export const analyticsApi = {
  async trackSearch(searchData: any): Promise<void> {
    await api.post('/analytics/search', searchData);
  },

  async trackProductView(productId: string): Promise<void> {
    await api.post('/analytics/product-view', { productId });
  },

  async trackProductClick(productId: string, searchId?: string): Promise<void> {
    await api.post('/analytics/product-click', { productId, searchId });
  }
};

// Admin API
export const adminApi = {
  async getAllProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<{ products: Product[]; pagination: any }> {
    const response: AxiosResponse<ApiResponse<{ products: Product[]; pagination: any }>> = 
      await api.get('/admin/products', { params });
    return response.data.data;
  },

  async createProduct(productData: FormData | any): Promise<Product> {
    const config = productData instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    
    const response: AxiosResponse<ApiResponse<Product>> = 
      await api.post('/admin/products', productData, config);
    return response.data.data;
  },

  async updateProduct(productId: string, productData: FormData | any): Promise<Product> {
    const config = productData instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    
    const response: AxiosResponse<ApiResponse<Product>> = 
      await api.put(`/admin/products/${productId}`, productData, config);
    return response.data.data;
  },

  async deleteProduct(productId: string): Promise<void> {
    await api.delete(`/admin/products/${productId}`);
  },

  async getDashboardStats(): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = 
      await api.get('/admin/analytics/dashboard');
    return response.data.data;
  },

  async bulkImportProducts(csvFile: File): Promise<any> {
    const formData = new FormData();
    formData.append('csvFile', csvFile);
    
    const response: AxiosResponse<ApiResponse<any>> = 
      await api.post('/admin/products/bulk/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    return response.data.data;
  },

  async exportProducts(): Promise<Blob> {
    const response = await api.get('/admin/products/bulk/export', {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Chat API
export const chatApi = {
  async sendMessage(message: string, conversationId?: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await api.post('/chat/message', {
      message,
      conversationId
    });
    return response.data.data;
  },

  async getConversationHistory(conversationId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await api.get(`/chat/conversation/${conversationId}`);
    return response.data.data;
  },

  async getChatSuggestions(): Promise<string[]> {
    const response: AxiosResponse<ApiResponse<{ suggestions: string[] }>> = await api.get('/chat/suggestions');
    return response.data.data.suggestions;
  },

  async getChatHealth(): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/chat/health');
    return response.data.data;
  }
};

export default api;