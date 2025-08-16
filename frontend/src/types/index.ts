// Core Types
export interface Product {
  id: string;
  name: string;
  price: {
    min: number;
    max: number;
    display: string;
  };
  rating: number;
  reviews: {
    count: number;
    display: string;
  };
  category: string;
  brand: string;
  tags: string[];
  sentiment: Sentiment;
  images?: string[];
  description?: string;
  features?: string[];
  availability?: 'in_stock' | 'out_of_stock' | 'limited';
  createdAt: string;
  updatedAt: string;
  
  // Optional fields for special card types
  type?: 'product' | 'pros-cons';
  prosConsData?: {
    pros: string[];
    cons: string[];
  };
}

export interface Sentiment {
  label: 'highly-regarded' | 'well-regarded' | 'mixed-reviews' | 'poorly-regarded' | 'highly-criticized' | 'insufficient-data';
  emoji: string;
  text: string;
  description: string;
  score: number;
  confidence: number;
  mentionCount: number;
  trending: 'up' | 'down' | 'stable' | 'new';
  breakdown: {
    quality: number;
    value: number;
    popularity: number;
    reliability: number;
  };
  lastUpdated?: string;
}

// Search Types
export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  conversationContext?: {
    previousProducts?: Product[];
    previousQuery?: string;
    chatHistory?: ChatMessage[];
  };
}

export interface SearchFilters {
  categories?: string[];
  priceRanges?: string[];
  ratings?: string[];
  sentiments?: string[];
  trending?: string[];
  features?: string[];
}

export interface SearchResult {
  query: string;
  aiResponse: string;
  products: Product[];
  total: number;
  hasMore: boolean;
  suggestions: SearchSuggestion[];
  searchId: string;
  responseTime?: number;
  hasDbResults?: boolean;
  isAiRecommendation?: boolean;
}

export interface SearchSuggestion {
  text: string;
  icon: string;
  query: string;
  category?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  createdAt: string;
}

export interface UserPreferences {
  categories: string[];
  priceRange: {
    min: number;
    max: number;
  };
  brands: string[];
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  requestId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// Chat Types
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  searchResult?: SearchResult;
  products?: Product[];
  hasDbResults?: boolean;
  isAiRecommendation?: boolean;
  conversationId?: string;
  conversational?: boolean;
  analysisType?: 'pros-cons' | 'general';
}

export interface ChatResponse {
  message: string;
  products: Product[];
  hasDbResults: boolean;
  isAiRecommendation?: boolean;
  conversationId: string;
  timestamp: string;
  searchPerformed: boolean;
  responseTime?: number;
  analysisType?: 'pros-cons' | 'general';
}

// Analytics Types
export interface SearchAnalytics {
  searchId: string;
  query: string;
  resultsCount: number;
  clickedProducts: string[];
  timestamp: Date;
  userId?: string;
}

// Component Props Types
export interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
  showSentiment?: boolean;
  compact?: boolean;
  loading?: boolean;
}

export interface SentimentBadgeProps {
  sentiment: Sentiment;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  showTrending?: boolean;
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  placeholder?: string;
  loading?: boolean;
  suggestions?: string[];
  autoFocus?: boolean;
}

// Store Types (Zustand)
export interface AppStore {
  // Search state
  currentSearch: SearchResult | null;
  searchHistory: string[];
  isSearching: boolean;
  
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // UI state
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  
  // Actions
  setCurrentSearch: (search: SearchResult | null) => void;
  addToSearchHistory: (query: string) => void;
  setSearching: (loading: boolean) => void;
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
}

// Utility Types
export type SortOption = 'relevance' | 'rating' | 'price_low' | 'price_high' | 'newest' | 'popularity';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
  icon?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  productCount?: number;
  featured?: boolean;
}

// Error Types
export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
}

// Feature Flags
export interface FeatureFlags {
  enableSentimentAnalysis: boolean;
  enableRealTimeUpdates: boolean;
  enablePersonalization: boolean;
  enableAnalytics: boolean;
  enableChatInterface: boolean;
  enableProductComparison: boolean;
  betaFeatures: string[];
}

// Constants
export const SENTIMENT_LABELS = {
  'highly-regarded': 'Highly Regarded',
  'well-regarded': 'Well Regarded',
  'mixed-reviews': 'Mixed Reviews',
  'poorly-regarded': 'Poorly Regarded',
  'highly-criticized': 'Highly Criticized',
  'insufficient-data': 'Insufficient Data',
} as const;

export const TRENDING_LABELS = {
  up: 'Trending Up',
  down: 'Trending Down',
  stable: 'Stable',
  new: 'New & Popular',
} as const;