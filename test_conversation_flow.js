#!/usr/bin/env node

/**
 * Test script to verify conversation context preservation
 * Tests the sunscreen -> cheaper alternatives -> price questions flow
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
let sessionId = `test-session-${Date.now()}`;

async function testConversationFlow() {
  console.log('🧪 Testing conversation context preservation...\n');
  
  try {
    // Step 1: Search for sunscreen
    console.log('1️⃣ Step 1: Searching for "sunscreen"...');
    const searchResponse = await axios.post(`${BASE_URL}/search`, {
      query: 'sunscreen',
      sessionId: sessionId
    });
    
    console.log('✅ Search successful');
    console.log(`📊 Found ${searchResponse.data.data.products.length} products`);
    console.log(`🤖 AI Response: ${searchResponse.data.data.aiResponse.substring(0, 100)}...`);
    
    if (searchResponse.data.data.products.length === 0) {
      console.log('❌ No sunscreen products found - cannot test conversation flow');
      return;
    }
    
    // Store products for later reference
    const sunscreenProducts = searchResponse.data.data.products;
    console.log(`📦 Sunscreen products: ${sunscreenProducts.map(p => p.name).join(', ')}\n`);
    
    // Step 2: Ask for cheaper alternatives
    console.log('2️⃣ Step 2: Asking for "cheaper alternatives"...');
    const alternativesResponse = await axios.post(`${BASE_URL}/search/chat`, {
      query: 'any cheaper alternatives?',
      conversationContext: {
        previousProducts: sunscreenProducts,
        previousQuery: 'sunscreen',
        currentTopic: sunscreenProducts[0]?.category || 'skincare',
        searchResults: {
          hasDbResults: true,
          totalProducts: sunscreenProducts.length
        }
      }
    });
    
    console.log('✅ Alternatives request successful');
    console.log(`🤖 AI Response: ${alternativesResponse.data.data.aiResponse.substring(0, 200)}...`);
    
    // Step 3: Ask about prices (this was the problematic query)
    console.log('\n3️⃣ Step 3: Asking about "price of these products"...');
    const priceResponse = await axios.post(`${BASE_URL}/search/chat`, {
      query: 'price of these products',
      conversationContext: {
        previousProducts: sunscreenProducts,
        previousQuery: 'sunscreen',
        currentTopic: sunscreenProducts[0]?.category || 'skincare',
        searchResults: {
          hasDbResults: true,
          totalProducts: sunscreenProducts.length
        }
      }
    });
    
    console.log('✅ Price request successful');
    console.log(`🤖 AI Response: ${priceResponse.data.data.aiResponse}`);
    
    // Analyze the response for context preservation
    const priceResponseText = priceResponse.data.data.aiResponse.toLowerCase();
    const containsIrrelevantProducts = priceResponseText.includes('iphone') || 
                                      priceResponseText.includes('sony') ||
                                      priceResponseText.includes('headphones') ||
                                      priceResponseText.includes('earbuds');
    
    const containsSunscreenContext = priceResponseText.includes('sunscreen') ||
                                   sunscreenProducts.some(p => 
                                     priceResponseText.includes(p.name.toLowerCase()) ||
                                     priceResponseText.includes(p.brand.toLowerCase())
                                   );
    
    console.log('\n📋 Context Preservation Analysis:');
    console.log(`❌ Contains irrelevant products: ${containsIrrelevantProducts}`);
    console.log(`✅ Maintains sunscreen context: ${containsSunscreenContext}`);
    
    if (!containsIrrelevantProducts && containsSunscreenContext) {
      console.log('\n🎉 SUCCESS: Conversation context is properly preserved!');
      console.log('✅ The AI stayed focused on sunscreen products');
      console.log('✅ No irrelevant products (iPhone, Sony) mentioned');
    } else {
      console.log('\n❌ FAILURE: Conversation context was lost');
      if (containsIrrelevantProducts) {
        console.log('❌ AI mentioned irrelevant products');
      }
      if (!containsSunscreenContext) {
        console.log('❌ AI lost sunscreen context');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testConversationFlow();