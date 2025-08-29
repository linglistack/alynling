# GeoLift Agent Backend (Proof of Concept)
This project provides a backend + demo interface for experimenting with RAG-powered Q&A on GeoLift.


## Installation

Clone the repo and install dependencies:

```bash
pip install -r requirements.txt
```

## Install Ollama

This project uses [Ollama](https://ollama.com/) to run local LLMs.  
Download and install Ollama for your OS:  
https://ollama.com/download  

After installation, pull one of the supported models (for example `qwen3:8b`):  

```bash
ollama pull qwen3:8b
```

## Run the Streamlit Demo

From the root of the project:
```bash
streamlit run QnA_demo.py
```

## Run the Barebone FastAPI Backend

Endpoints for a frontend can be exposed by starting the FastAPI server using Uvicorn:
```bash
uvicorn agent.QnA:app --reload
```
The backend will be available at http://127.0.0.1:8000