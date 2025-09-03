#!/usr/bin/env python3
"""
Hybrid RAG API with Gemini fallback
Uses RAG for GeoLift-specific queries and Gemini for general questions
Confidence-based routing determines when to use each system
"""

import os
import sqlite3
import yaml
import torch
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    import os
    # Try to load .env from current directory and parent directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    env_paths = [
        os.path.join(current_dir, '.env'),
        os.path.join(os.path.dirname(current_dir), '.env')
    ]
    
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            print(f"✅ Loaded environment variables from {env_path}")
            break
    else:
        print("⚠️  No .env file found")
        
except ImportError:
    print("⚠️  python-dotenv not available. Install with: pip install python-dotenv")

# Google Gemini integration
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️  Google Gemini not available. Install with: pip install google-generativeai")

# Change to the ai directory for correct relative imports
current_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(current_dir)

app = FastAPI(
    title="Hybrid RAG API for GeoLift",
    description="Smart routing between RAG (GeoLift knowledge) and Gemini (general AI)",
    version="2.0.0"
)

# Add CORS middleware for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "https://*.vercel.app",
        "https://vercel.app",
        "*"  # Allow all origins for production (you can restrict this later)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[str] = []
    method: str = "rag"  # "rag", "gemini", "rag_enhanced", "hybrid", or "fallback"
    confidence: float = 0.0
    debug_info: Dict[str, Any] = {}  # Additional debug information

# Load configuration
with open("config/settings.yaml", "r") as f:
    config = yaml.safe_load(f)

# Database and vector store paths
DB_PATH = Path(config["paths"]["params_db"])
STORE_PATH = Path(config["paths"]["rag_store"])
EMBEDDING_MODEL = config["retrieval"]["embedding_model"]

# Initialize Gemini
gemini_model = None
if GEMINI_AVAILABLE:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    print(f"🔍 Debug: GEMINI_API_KEY = {gemini_api_key[:15] + '...' if gemini_api_key else 'None'}")
    if gemini_api_key and len(gemini_api_key.strip()) > 10:
        try:
            genai.configure(api_key=gemini_api_key.strip())
            gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            print(f"✅ Gemini API initialized successfully")
        except Exception as e:
            print(f"❌ Gemini initialization failed: {e}")
    else:
        print("⚠️  GEMINI_API_KEY not found or invalid in environment variables")

# Initialize embeddings and vector store
device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
print(f"🔧 Using device: {device}")

try:
    embedding_model = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL, 
        model_kwargs={"device": device}
    )
    print(f"✅ Loaded embedding model: {EMBEDDING_MODEL}")
    
    vector_store = FAISS.load_local(
        str(STORE_PATH), 
        embedding_model, 
        allow_dangerous_deserialization=True
    )
    print(f"✅ Loaded FAISS vector store from: {STORE_PATH}")
    
except Exception as e:
    print(f"❌ Error loading vector store: {e}")
    print("📝 Make sure to run: cd ai && python RAG/build_index.py")
    vector_store = None
    embedding_model = None

# Configuration thresholds
RAG_CONFIDENCE_THRESHOLD = 0.7  # If best RAG result score < 0.7, consider it good
GEMINI_FALLBACK_THRESHOLD = 1.2  # If best RAG result score > 1.2, use Gemini

def is_geolift_question(query: str) -> bool:
    """Determine if a question is likely about GeoLift/experimentation"""
    geolift_indicators = [
        'geolift', 'holdout', 'effect size', 'power analysis', 'synthetic control',
        'treatment', 'control', 'market selection', 'lookback window', 'alpha',
        'statistical significance', 'lift', 'incrementality', 'cpic', 'mde',
        'minimum detectable effect', 'fixed effects', 'correlation',
        'exclude', 'include', 'market', 'location', 'budget', 'investment',
        'experiment', 'test', 'analysis', 'parameter', 'setting'
    ]
    
    query_lower = query.lower()
    return any(indicator in query_lower for indicator in geolift_indicators)

def semantic_search(query: str, k: int = 5) -> List[Dict[str, Any]]:
    """Perform semantic search using FAISS vector similarity"""
    if not vector_store:
        return []
    
    try:
        docs = vector_store.similarity_search_with_score(query, k=k)
        
        results = []
        for doc, score in docs:
            metadata = doc.metadata
            content = doc.page_content
            
            result = {
                'content': content,
                'score': float(score),
                'metadata': metadata,
                'type': metadata.get('section', 'unknown'),
                'source': metadata.get('source', 'unknown')
            }
            results.append(result)
        
        results.sort(key=lambda x: x['score'])
        return results
        
    except Exception as e:
        print(f"❌ Error in semantic search: {e}")
        return []

def query_gemini_with_context(query: str, rag_context: str = None) -> Optional[str]:
    """Query Gemini with RAG context for enhanced responses"""
    if not gemini_model:
        return None
    
    try:
        if rag_context:
            # RAG-enhanced response: Use retrieved knowledge + LLM generation
            context_prompt = f"""Based on this GeoLift knowledge:

{rag_context}

Answer the user's question: "{query}"

Guidelines:
- Be concise and direct
- Use only the provided information
- Explain clearly but avoid unnecessary elaboration
- If information is incomplete, say so briefly
- Focus on practical, actionable guidance

Provide a clear, focused response:"""
        else:
            # General question without RAG context
            context_prompt = f"""You are an AI assistant helping with marketing experimentation and data analysis. 
            Please provide a helpful, concise answer to the following question. Keep your response practical and actionable.
            
            Question: {query}"""
        
        response = gemini_model.generate_content(context_prompt)
        return response.text
        
    except Exception as e:
        print(f"❌ Error querying Gemini: {e}")
        return None

def query_gemini(query: str) -> Optional[str]:
    """Legacy method for backward compatibility"""
    return query_gemini_with_context(query)

def format_rag_answer(query: str, search_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Format RAG search results into an answer"""
    if not search_results:
        return {
            "answer": "I don't have specific information about that in my GeoLift knowledge base.",
            "sources": [],
            "confidence": 0.0
        }
    
    best_match = search_results[0]
    confidence = max(0.0, min(1.0, (2.0 - best_match['score']) / 2.0))  # Convert score to 0-1 confidence
    
    answer_parts = []
    sources = []
    
    # Add the primary answer
    metadata = best_match['metadata']
    content = best_match['content']
    
    if best_match['type'] == 'generic':
        term_name = metadata.get('term', 'Unknown')
        answer_parts.append(f"**{term_name}**: {content}")
        sources.append(f"Generic concept: {term_name}")
        
    elif best_match['type'] in ['input', 'output']:
        param_name = metadata.get('param', 'Unknown')
        function_name = metadata.get('function', 'Unknown')
        package_name = metadata.get('package', 'Unknown')
        
        lines = content.split('\n')
        param_title = lines[0] if lines else param_name
        explanation = '\n'.join(lines[1:]) if len(lines) > 1 else content
        
        answer_parts.append(f"**{param_title}**: {explanation}")
        sources.append(f"{package_name}.{function_name}.{param_name}")
    
    # Add related concepts if confidence is reasonable
    if confidence > 0.3:
        related_items = []
        for result in search_results[1:3]:
            if result['score'] < 1.5:  # Only reasonably similar items
                meta = result['metadata']
                if result['type'] == 'generic':
                    term = meta.get('term', 'Unknown')
                    related_items.append(f"**{term}**: {result['content'][:100]}...")
                elif result['type'] in ['input', 'output']:
                    param = meta.get('param', 'Unknown')
                    lines = result['content'].split('\n')
                    desc = lines[1] if len(lines) > 1 else lines[0] if lines else ""
                    related_items.append(f"**{param}**: {desc[:100]}...")
        
        if related_items:
            answer_parts.append("\n**Related concepts**:")
            for item in related_items[:2]:
                answer_parts.append(f"• {item}")
    
    return {
        "answer": "\n\n".join(answer_parts),
        "sources": sources,
        "confidence": confidence
    }

@app.get("/")
async def root():
    return {
        "message": "Hybrid RAG API - Smart routing between GeoLift knowledge and Gemini AI",
        "status": "running",
        "rag_available": vector_store is not None,
        "gemini_available": gemini_model is not None
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "vector_store_loaded": vector_store is not None,
        "gemini_available": gemini_model is not None,
        "embedding_model": EMBEDDING_MODEL,
        "device": device
    }

@app.post("/ask", response_model=QueryResponse)
async def ask_question(request: QueryRequest):
    """
    RAG-first approach: Always retrieve knowledge, then enhance with LLM
    """
    try:
        query = request.query.strip()
        print(f"🔍 Processing query: '{query}'")
        
        # Step 1: Always try RAG search first to get relevant knowledge
        search_results = semantic_search(query, k=5)
        rag_response = format_rag_answer(query, search_results)
        
        # Determine question characteristics
        is_geolift_related = is_geolift_question(query)
        rag_confidence = rag_response['confidence']
        best_score = search_results[0]['score'] if search_results else 999
        
        print(f"📊 RAG confidence: {rag_confidence:.3f}, Best score: {best_score:.3f}")
        print(f"🏷️  GeoLift related: {is_geolift_related}")
        
        # Step 2: Decide between pure RAG and RAG + LLM enhancement
        # For excellent matches (< 0.5), use pure RAG to avoid verbosity/hallucination
        if is_geolift_related and best_score < 0.5:
            # Excellent match -> Use pure RAG (more concise, accurate)
            print("✅ Using RAG only (excellent match, high confidence)")
            debug_info = {
                'rag_documents': [],  # Will be populated below
                'best_similarity_score': best_score,
                'rag_confidence': rag_confidence,
                'enhancement_applied': False,
                'decision_reason': f"Excellent similarity score {best_score:.3f} < 0.5 threshold, using direct RAG",
                'total_documents_searched': len(search_results)
            }
            
            # Populate rag_documents for consistency
            if search_results:
                for i, result in enumerate(search_results[:1]):  # Show top 1 for pure RAG
                    metadata = result['metadata']
                    doc_info = {
                        'rank': i + 1,
                        'score': round(result['score'], 3),
                        'type': result['type'],
                        'similarity_reason': f"Vector similarity score: {result['score']:.3f} (excellent match)"
                    }
                    
                    if result['type'] == 'generic':
                        term_name = metadata.get('term', 'Unknown')
                        doc_info.update({
                            'document': term_name,
                            'category': 'Generic Concept',
                            'source': metadata.get('package', 'Generic')
                        })
                    elif result['type'] in ['input', 'output']:
                        param_name = metadata.get('param', 'Unknown')
                        function_name = metadata.get('function', 'Unknown')
                        package_name = metadata.get('package', 'Unknown')
                        doc_info.update({
                            'document': param_name,
                            'category': f'{result["type"].title()} Parameter',
                            'function': function_name,
                            'package': package_name,
                            'source': f"{package_name}.{function_name}"
                        })
                    
                    debug_info['rag_documents'].append(doc_info)
            
            return QueryResponse(
                answer=rag_response["answer"],
                sources=rag_response["sources"],
                method="rag",
                confidence=rag_confidence,
                debug_info=debug_info
            )
        
        # Step 3: Good matches that benefit from LLM enhancement
        elif gemini_model and search_results and best_score < 1.2:
            # Good RAG results available -> Use RAG + Gemini enhancement
            print("🧠 Using RAG + Gemini enhancement")
            
            # Build context from RAG results and collect debug info
            rag_context = ""
            rag_documents = []
            
            # Use fewer documents for enhancement to keep it concise
            docs_to_use = min(2, len(search_results))  # Use top 2 documents max
            
            for i, result in enumerate(search_results[:docs_to_use]):
                metadata = result['metadata']
                content = result['content']
                score = result['score']
                
                # Collect debug information
                doc_info = {
                    'rank': i + 1,
                    'score': round(score, 3),
                    'type': result['type'],
                    'similarity_reason': f"Vector similarity score: {score:.3f} (good match for enhancement)"
                }
                
                if result['type'] == 'generic':
                    term_name = metadata.get('term', 'Unknown')
                    rag_context += f"**{term_name}**: {content}\n\n"
                    doc_info.update({
                        'document': term_name,
                        'category': 'Generic Concept',
                        'source': metadata.get('package', 'Generic')
                    })
                elif result['type'] in ['input', 'output']:
                    param_name = metadata.get('param', 'Unknown')
                    function_name = metadata.get('function', 'Unknown')
                    package_name = metadata.get('package', 'Unknown')
                    rag_context += f"**{param_name}** (from {function_name}): {content}\n\n"
                    doc_info.update({
                        'document': param_name,
                        'category': f'{result["type"].title()} Parameter',
                        'function': function_name,
                        'package': package_name,
                        'source': f"{package_name}.{function_name}"
                    })
                
                rag_documents.append(doc_info)
            
            # Get enhanced response from Gemini using RAG context
            enhanced_answer = query_gemini_with_context(query, rag_context)
            
            if enhanced_answer:
                # Calculate consistent confidence (don't artificially boost)
                final_confidence = min(0.9, rag_confidence + 0.1)  # Modest boost for enhancement
                
                debug_info = {
                    'rag_documents': rag_documents,
                    'best_similarity_score': best_score,
                    'rag_confidence': rag_confidence,
                    'enhancement_applied': True,
                    'decision_reason': f"Good similarity score {best_score:.3f}, enhanced with LLM for natural response",
                    'context_length': len(rag_context),
                    'total_documents_searched': len(search_results),
                    'documents_used_for_context': docs_to_use
                }
                
                return QueryResponse(
                    answer=enhanced_answer,
                    sources=rag_response["sources"] + ["Enhanced by Gemini AI"],
                    method="rag_enhanced",
                    confidence=final_confidence,
                    debug_info=debug_info
                )
        
        # Step 3: Handle cases where RAG + Gemini enhancement isn't suitable
        if is_geolift_related and best_score < RAG_CONFIDENCE_THRESHOLD:
            # High-confidence GeoLift question -> Use pure RAG
            print("✅ Using RAG only (high confidence)")
            return QueryResponse(
                answer=rag_response["answer"],
                sources=rag_response["sources"],
                method="rag",
                confidence=rag_confidence
            )
            
        elif gemini_model and not is_geolift_related and best_score > 1.2:
            # General question with poor RAG match -> Use Gemini only
            print("🤖 Using Gemini only (general question)")
            gemini_answer = query_gemini(query)
            if gemini_answer:
                return QueryResponse(
                    answer=gemini_answer,
                    sources=["Gemini AI"],
                    method="gemini",
                    confidence=0.8
                )
        
        elif is_geolift_related and search_results:
            # Medium-confidence GeoLift question -> RAG with disclaimer
            print("⚠️  Using RAG with disclaimer (medium confidence)")
            disclaimer = "Based on my GeoLift knowledge base:\n\n"
            return QueryResponse(
                answer=disclaimer + rag_response["answer"],
                sources=rag_response["sources"],
                method="rag",
                confidence=rag_confidence
            )
        
        # Step 4: Fallbacks
        if search_results:
            print("🔄 Fallback to RAG")
            return QueryResponse(
                answer=rag_response["answer"],
                sources=rag_response["sources"],
                method="rag",
                confidence=rag_confidence
            )
        
        # Last resort
        return QueryResponse(
            answer="I'm not sure how to help with that. Could you ask about specific GeoLift parameters or rephrase your question?",
            sources=[],
            method="fallback",
            confidence=0.0
        )
        
    except Exception as e:
        print(f"❌ Error processing query: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Hybrid RAG API server...")
    print("🧠 RAG for GeoLift knowledge, Gemini for general questions")
    print("🌐 Server will run on http://localhost:5000")
    print("📖 API documentation: http://localhost:5000/docs")
    
    if not vector_store:
        print("\n⚠️  WARNING: Vector store not loaded!")
        print("📝 Run this first: cd ai && python RAG/build_index.py")
    
    if not gemini_model:
        print("\n⚠️  WARNING: Gemini not available!")
        print("📝 Set GEMINI_API_KEY environment variable")
    
    uvicorn.run(app, host="0.0.0.0", port=5000, log_level="info")
