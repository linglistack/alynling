# agent/server.py
from fastapi import FastAPI
from pydantic import BaseModel
from RAG.retrieval_rerank import RAGPipeline  # import your class



# Init pipeline
pipeline = RAGPipeline("config/settings.yaml")

# FastAPI app
app = FastAPI(
    title="GeoLift Q&A Backend",
    description=(
        "Backend service that answers questions about GeoLift parameters using "
        "a RAG pipeline with embeddings, FAISS, and reranking."
    ),
    version="0.1.0"
)

# Request schema
class QueryRequest(BaseModel):
    query: str

# Response schema
class QueryResponse(BaseModel):
    answer: str

@app.post(
    "/ask",
    tags=["Q&A"],
    summary="Ask a GeoLift-related question",
    description="Send a natural language query. Returns a synthesized answer based on retrieved documentation."
)

def ask_question(request: QueryRequest):
    """
    Accepts a natural language query, runs through RAG pipeline,
    and returns synthesized answer.
    """
    answer = pipeline.synthesize(request.query)
    return QueryResponse(answer=answer)
