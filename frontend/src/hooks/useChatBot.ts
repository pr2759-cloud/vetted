import { useState, useCallback } from 'react';
import { ChatMessage, ChatResponse } from '../types';
import { chatApi } from '../services/api';
import toast from 'react-hot-toast';

export const useChatBot = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationContext, setConversationContext] = useState<{
    previousProducts: any[];
    previousQuery: string;
    chatHistory: any[];
  }>({
    previousProducts: [],
    previousQuery: '',
    chatHistory: []
  });

  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loading) return;

    setLoading(true);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Call the chat API with conversation context
      const response: ChatResponse = await chatApi.sendMessage(content.trim(), conversationId || undefined);

      // Update conversation ID if this is the first message
      if (!conversationId && response.conversationId) {
        setConversationId(response.conversationId);
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'assistant',
        content: response.message,
        timestamp: new Date(response.timestamp),
        products: response.products || [],
        hasDbResults: response.hasDbResults,
        isAiRecommendation: response.isAiRecommendation,
        conversationId: response.conversationId
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update conversation context for next message
      setConversationContext({
        previousProducts: response.products || [],
        previousQuery: content.trim(),
        chatHistory: [...conversationContext.chatHistory, 
          { type: 'user', content: content.trim(), timestamp: new Date().toISOString() },
          { 
            type: 'assistant', 
            content: response.message, 
            timestamp: response.timestamp,
            products: response.products || [],
            hasDbResults: response.hasDbResults,
            isAiRecommendation: response.isAiRecommendation
          }
        ].slice(-10) // Keep last 10 messages
      });

    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to send message. Please try again.');

    } finally {
      setLoading(false);
    }
  }, [loading, conversationId, conversationContext]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setConversationContext({
      previousProducts: [],
      previousQuery: '',
      chatHistory: []
    });
  }, []);

  const startNewConversation = useCallback(() => {
    clearChat();
    
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: generateMessageId(),
      type: 'assistant',
      content: 'Hello! I\'m your AI shopping assistant. I can help you find products, compare items, and answer questions about our inventory. What are you looking for today?',
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
  }, [clearChat]);

  return {
    messages,
    loading,
    conversationId,
    sendMessage,
    clearChat,
    startNewConversation
  };
};