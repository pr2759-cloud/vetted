import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { searchApi } from '../services/api';
import { SearchQuery, SearchResult } from '../types';

export const useSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMutation = useMutation({
    mutationFn: (searchQuery: SearchQuery) => searchApi.searchProducts(searchQuery),
    onMutate: () => {
      setIsLoading(true);
      setError(null);
    },
    onSuccess: () => {
      setIsLoading(false);
    },
    onError: (err: any) => {
      setIsLoading(false);
      setError(err.response?.data?.error || 'Search failed. Please try again.');
    }
  });

  const searchProducts = async (query: SearchQuery): Promise<SearchResult> => {
    const result = await searchMutation.mutateAsync(query);
    return result;
  };

  const chatMutation = useMutation({
    mutationFn: ({ query, conversationContext }: { query: string, conversationContext?: any }) => 
      searchApi.chatWithAI(query, conversationContext),
    onMutate: () => {
      setIsLoading(true);
      setError(null);
    },
    onSuccess: () => {
      setIsLoading(false);
    },
    onError: (err: any) => {
      setIsLoading(false);
      setError(err.response?.data?.error || 'Chat failed. Please try again.');
    }
  });

  const chatWithAI = async (query: string, conversationContext?: any): Promise<any> => {
    const result = await chatMutation.mutateAsync({ query, conversationContext });
    return result;
  };

  // Get search suggestions - disabled to prevent errors
  const suggestions: string[] = [];

  // Get trending searches
  const { data: trendingData } = useQuery({
    queryKey: ['trending-searches'],
    queryFn: () => searchApi.getTrendingSearches(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1
  });
  
  // Extract trending data safely
  const trending = trendingData?.map(item => item.query) || [];

  return {
    searchProducts,
    chatWithAI,
    isLoading,
    error,
    suggestions,
    trending
  };
};