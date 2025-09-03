/**
 * RAG AI API Client
 * Provides methods to communicate with the RAG Q&A backend
 */

const RAG_API_BASE_URL = process.env.REACT_APP_RAG_API_URL || 'http://localhost:5000';

class RAGAPIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'RAGAPIError';
    this.status = status;
    this.data = data;
  }
}

const ragApiRequest = async (endpoint, options = {}) => {
  const url = `${RAG_API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new RAGAPIError(
        data.error || data.detail || `HTTP ${response.status}`,
        response.status,
        data
      );
    }
    
    return data;
  } catch (error) {
    if (error instanceof RAGAPIError) {
      throw error;
    }
    
    // Handle network errors
    throw new RAGAPIError(
      `Network error: ${error.message}`,
      0,
      null
    );
  }
};

export const ragAPI = {
  /**
   * Ask a question to the RAG AI system with detailed logging
   * @param {string} query - The user's question
   * @returns {Promise<{answer: string, method: string, confidence: number, sources: array}>} - The AI's response
   */
  async askQuestion(query) {
    const startTime = performance.now();
    
    console.group('🧠 RAG API Request Process');
    console.log('📝 Query:', query);
    console.log('⏰ Started at:', new Date().toLocaleTimeString());
    
    try {
      const response = await ragApiRequest('/ask', {
        method: 'POST',
        body: JSON.stringify({ query })
      });
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      // Log the complete response analysis
      this._logResponseAnalysis(query, response, duration);
      
      console.groupEnd();
      return response;
      
    } catch (error) {
      console.error('❌ RAG API Error:', error);
      console.groupEnd();
      throw error;
    }
  },

  /**
   * Streamlined logging focusing on key decision points
   */
  _logResponseAnalysis(query, response, duration) {
    const { method, confidence, sources, answer, debug_info } = response;
    
    // Main response summary
    const methodEmojis = { 'rag': '📊', 'rag_enhanced': '🧠', 'gemini': '🤖', 'hybrid': '🔄', 'fallback': '⚠️' };
    console.log(`${methodEmojis[method] || '❓'} ${method.toUpperCase()} | ${(confidence * 100).toFixed(0)}% confidence | ${duration}ms`);
    
    // Key decision factors
    if (debug_info) {
      this._logKeyDecisionFactors(method, debug_info, confidence);
    }
    
    // LLM enhancement details (only for enhanced responses)
    if (method === 'rag_enhanced' && debug_info) {
      this._logLLMEnhancementProcess(debug_info);
    }
  },

  /**
   * Log key factors that determined the response method and confidence
   */
  _logKeyDecisionFactors(method, debug_info, finalConfidence) {
    // Confidence calculation breakdown with detailed explanations
    if (debug_info.rag_confidence !== undefined && debug_info.best_similarity_score !== undefined) {
      const ragConf = debug_info.rag_confidence;
      const finalConf = finalConfidence;
      const simScore = debug_info.best_similarity_score;
      
      // Show confidence with explanations
      if (method === 'rag' || ragConf === finalConf) {
        console.log(`📊 Confidence: ${(finalConf * 100).toFixed(0)}% (similarity=${simScore.toFixed(3)})`);
      } else {
        console.log(`📊 Confidence: RAG=${(ragConf * 100).toFixed(0)}% → Final=${(finalConf * 100).toFixed(0)}% (similarity=${simScore.toFixed(3)})`);
      }
      
      // Explain what these numbers mean with guidelines
      console.log(`   📖 RAG=${(ragConf * 100).toFixed(0)}%: Base confidence from vector similarity`);
      console.log(`      📋 Guidelines: 80%+ = High confidence, 60-79% = Good, 40-59% = Medium, <40% = Low`);
      
      if (method !== 'rag' && ragConf !== finalConf) {
        console.log(`   📖 Final=${(finalConf * 100).toFixed(0)}%: Boosted confidence after LLM enhancement (+10% typical boost)`);
      }
      
      console.log(`   📖 similarity=${simScore.toFixed(3)}: Vector distance (lower = more similar)`);
      console.log(`      📋 Guidelines: <0.5 = Excellent (use Direct RAG), 0.5-0.8 = Good (use RAG+LLM), 0.8-1.2 = Moderate (enhanced), >1.2 = Poor (fallback)`);
      
      // Decision logic explanation with thresholds
      if (simScore < 0.5) {
        if (method === 'rag') {
          console.log(`✅ EXCELLENT MATCH (${simScore.toFixed(3)} < 0.5) → Direct RAG`);
        } else {
          console.log(`⚠️  LOGIC ERROR: Excellent match (${simScore.toFixed(3)} < 0.5) should use Direct RAG, not ${method.toUpperCase()}`);
        }
      } else if (simScore < 0.8) {
        console.log(`👍 GOOD MATCH (${simScore.toFixed(3)} in 0.5-0.8 range) → RAG + LLM Enhancement`);  
      } else if (simScore < 1.2) {
        console.log(`⚠️  MODERATE MATCH (${simScore.toFixed(3)} in 0.8-1.2 range) → Enhanced Response`);
      } else {
        console.log(`❌ POOR MATCH (${simScore.toFixed(3)} > 1.2) → Low Confidence`);
      }
      
  
    }

    // Show documents actually used vs all found (with detailed explanation)
    if (debug_info.rag_documents && debug_info.rag_documents.length > 0) {
      const docsUsed = debug_info.documents_used_for_context || debug_info.rag_documents.length;
      const totalFound = debug_info.total_documents_searched || debug_info.rag_documents.length;
      
      // Show documents actually used
      const usedDocs = debug_info.rag_documents.slice(0, docsUsed);
      const usedNames = usedDocs.map(doc => `"${doc.document}" (${doc.score.toFixed(3)})`).join(', ');
      console.log(`📚 Documents Used: ${usedNames}`);
      
      // Explain the [X/Y found] notation with guidelines
      console.log(`   📖 [${docsUsed}/${totalFound} found]: Used ${docsUsed} documents out of ${totalFound} total found`);
      
      // Show document quality assessment
      const topDoc = debug_info.rag_documents[0];
      if (topDoc) {
        const topScore = topDoc.score;
        if (topScore < 0.5) {
          console.log(`   🎯 Top Document Quality: EXCELLENT (${topScore.toFixed(3)} < 0.5) - Perfect match for query`);
        } else if (topScore < 0.8) {
          console.log(`   🎯 Top Document Quality: GOOD (${topScore.toFixed(3)} = 0.5-0.8) - Relevant match`);
        } else if (topScore < 1.2) {
          console.log(`   🎯 Top Document Quality: MODERATE (${topScore.toFixed(3)} = 0.8-1.2) - Somewhat relevant`);
        } else {
          console.log(`   🎯 Top Document Quality: POOR (${topScore.toFixed(3)} > 1.2) - Low relevance`);
        }
      }
      
      // Show all found documents if there are more than used
      if (debug_info.rag_documents.length > docsUsed) {
        const unusedDocs = debug_info.rag_documents.slice(docsUsed);
        const unusedNames = unusedDocs.map(doc => `"${doc.document}" (${doc.score.toFixed(3)})`).join(', ');
        console.log(`   📋 Other documents found: ${unusedNames}`);
        console.log(`   💡 Why not used: ${method === 'rag' ? 'Direct RAG strategy: Use only the best match to avoid dilution' : 'Enhancement strategy: Limit to 2 docs to prevent verbose responses'}`);
      }
    }
  },

  /**
   * Log LLM enhancement process details (only for enhanced responses)
   */
  _logLLMEnhancementProcess(debug_info) {
    if (!debug_info.enhancement_applied) return;
    
    console.log('✅ Result: Concise + Natural (RAG accuracy + LLM style)');
  },

  /**
   * Analyze if query seems GeoLift-related (simplified version of backend logic)
   */
  _analyzeQueryType(query) {
    const geoLiftKeywords = [
      'geolift', 'holdout', 'effect size', 'power analysis', 'synthetic control',
      'treatment', 'control', 'market selection', 'lookback window', 'alpha',
      'statistical significance', 'lift', 'incrementality', 'cpic', 'mde',
      'exclude', 'include', 'market', 'location', 'budget', 'experiment'
    ];
    
    const queryLower = query.toLowerCase();
    return geoLiftKeywords.some(keyword => queryLower.includes(keyword));
  },

  /**
   * Health check to verify RAG API is running
   */
  async healthCheck() {
    try {
      return await ragApiRequest('/health');
    } catch (error) {
      // If health endpoint doesn't exist, try a simple question
      return await this.askQuestion('test');
    }
  }
};

export { RAGAPIError };
