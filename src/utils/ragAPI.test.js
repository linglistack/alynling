/**
 * Simple test utility for RAG API integration
 * Run this in the browser console to test the RAG API connection
 */

import { ragAPI } from './ragAPI';

// Test questions
const testQuestions = [
  "What is holdout?",
  "How should I set effect size?",
  "What is power analysis?",
  "Explain synthetic control method",
  "What is the difference between treatment and control markets?"
];

/**
 * Test RAG API connectivity
 */
export const testRAGConnection = async () => {
  console.log('🧪 Testing RAG API connection...');
  
  try {
    await ragAPI.healthCheck();
    console.log('✅ RAG API is healthy');
    return true;
  } catch (error) {
    console.error('❌ RAG API health check failed:', error.message);
    return false;
  }
};

/**
 * Test RAG API with sample questions
 */
export const testRAGQuestions = async () => {
  console.log('🧪 Testing RAG API with sample questions...');
  
  const results = [];
  
  for (const question of testQuestions) {
    console.log(`\n📝 Testing question: "${question}"`);
    
    try {
      const startTime = Date.now();
      const response = await ragAPI.askQuestion(question);
      const endTime = Date.now();
      
      console.log(`✅ Response (${endTime - startTime}ms):`, response.answer.substring(0, 100) + '...');
      
      results.push({
        question,
        success: true,
        responseTime: endTime - startTime,
        answer: response.answer
      });
      
    } catch (error) {
      console.error(`❌ Failed for question "${question}":`, error.message);
      
      results.push({
        question,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * Run all tests
 */
export const runAllTests = async () => {
  console.log('🚀 Starting RAG API integration tests...\n');
  
  // Test 1: Health check
  const isHealthy = await testRAGConnection();
  
  if (!isHealthy) {
    console.log('❌ Stopping tests - RAG API is not healthy');
    return { healthy: false, results: [] };
  }
  
  // Test 2: Sample questions
  const results = await testRAGQuestions();
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\n📊 Test Summary:`);
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('🎉 All tests passed! RAG integration is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the errors above.');
  }
  
  return {
    healthy: true,
    results,
    summary: {
      total,
      successful,
      failed: total - successful
    }
  };
};

// Auto-run tests if in development mode
if (process.env.NODE_ENV === 'development') {
  // Export to window for manual testing
  window.testRAG = {
    testRAGConnection,
    testRAGQuestions,
    runAllTests
  };
  
  console.log('🧪 RAG API test utilities loaded. Run window.testRAG.runAllTests() to test.');
}
