import re
import yaml
import torch
from openai import OpenAI
from pathlib import Path
from transformers import AutoModelForCausalLM, AutoTokenizer
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

class RAG_settings: 
    def __init__(self, settings_path):
        
        self.device = "cuda" if torch.cuda.is_available() else (
            "mps" if torch.backends.mps.is_available() else "cpu"
        )
        
        with open(settings_path, "r") as f:
            self.config = yaml.safe_load(f)
        self.LLM_model = self.config['LLM']['MODEL_NAME']
        self.LLM_temp = self.config['LLM']['TEMPERATURE']
        self.LLM_MAX_TOKENS = self.config['LLM']['MAX_TOKENS']
        
        self.USE_ChatGPT = self.config['OpenAI']['USE_ChatGPT']
        self.Ollama_local_url = self.config['OpenAI']['Ollama_local_url']
        
        self.Retrieval_Model = self.config['retrieval']['embedding_model']
        self.Rerank_Model = self.config['rerank']['rerank_model']
        self.rag_path = Path(self.config["paths"]["rag_store"])
    
        



class RAGPipeline:
    def __init__(self, config_path="config/settings.yaml"):

        self.settings = RAG_settings(config_path)


        self.embedding_model = HuggingFaceEmbeddings(
            model_name=self.settings.Retrieval_Model, 
            model_kwargs={"device": self.settings.device}
        )
        self.vector_store = FAISS.load_local(
            self.settings.rag_path, 
            self.embedding_model, 
            allow_dangerous_deserialization=True
        )

        # --- Rerank model ---
        # rerank_model_name = self.config["rerank"]["rerank_model"]
        self.tokenizer_rerank = AutoTokenizer.from_pretrained(self.settings.Rerank_Model, padding_side="left")
        self.model_rerank = AutoModelForCausalLM.from_pretrained(
            self.settings.Rerank_Model, 
            device_map="auto"
        ).eval()
        

        self.client = (
        OpenAI() if self.settings.USE_ChatGPT else OpenAI(base_url=self.settings.Ollama_local_url, api_key="ollama")
        )
        

    def rerank(self, query, docs, instruction=None, max_length=1024):
        """
        Rerank documents using Qwen reranker.
        Returns a list of (doc, score) sorted by score.
        """
        if instruction is None:
            instruction = "Given a web search query, retrieve relevant passages that answer the query"

        # Format pairs
        pairs = [
            f"<Instruct>: {instruction}\n<Query>: {query}\n<Document>: {doc}"
            for doc in docs
        ]

        # Tokenize
        inputs = self.tokenizer_rerank(
            pairs,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt"
        ).to(self.model_rerank.device)

        with torch.no_grad():
            outputs = self.model_rerank(**inputs).logits[:, -1, :]

        # "yes"/"no" token ids
        token_false_id = self.tokenizer_rerank.convert_tokens_to_ids("no")
        token_true_id = self.tokenizer_rerank.convert_tokens_to_ids("yes")

        true_vector = outputs[:, token_true_id]
        false_vector = outputs[:, token_false_id]
        batch_scores = torch.stack([false_vector, true_vector], dim=1)
        probs = torch.nn.functional.log_softmax(batch_scores, dim=1)[:, 1].exp().tolist()

        scored = list(zip(docs, probs))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored

    def retrieve(self, query, k=10):
        """
        Retrieve top-k documents from FAISS via similarity search.
        Returns a list of Documents (langchain Document objects).
        """
        return self.vector_store.similarity_search(query, k=k)

    def rerank_with_qwen(self, query, docs = None, top_n=5):
        """
        Rerank FAISS results with Qwen reranker.
        Returns top_n docs sorted by reranker score.
        """
        
        if docs is None:
            docs = self.retrieve(query, k=10)
        
        doc_texts = [doc.page_content for doc in docs]
        
        ranked = self.rerank(query, doc_texts)

        # Match texts back to docs
        ranked_docs = []
        for text, score in ranked:
            for doc in docs:
                if doc.page_content == text:
                    ranked_docs.append((doc, score))
                    break

        return ranked_docs[:top_n]
    
     # --- Step 1: pick doc + context ---
     
    def select_context(self, query, reranked_docs=None, threshold=0.5):
        if reranked_docs is None:
            reranked_docs = self.rerank_with_qwen(query)

        if not reranked_docs:
            return None

        top_doc, score = reranked_docs[0]
        if score < threshold:
            return None

        return top_doc.page_content if hasattr(top_doc, "page_content") else str(top_doc)
    
    # --- Step 2: build prompt ---
    def build_prompt(self, query, context):
        return f"""
You are a helpful assistant with statistical knowledge and expertise in advertisement. 
Answer the query based on the given document. 
If the document is irrelevant, respond with "I don't know."

Document: {context}

Query: {query}

You must provide exactly one answer in the following format.
---
<clear and concise answer, grounded only in the document>
---
"""

    # --- Step 3a: non-stream LLM call ---
    def call_llm(self, prompt):
        response = self.client.chat.completions.create(
            model=self.settings.LLM_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=self.settings.LLM_temp,
            max_tokens=self.settings.LLM_MAX_TOKENS,
        )
        return response.choices[0].message.content.strip()

    # --- Step 3b: streaming LLM call ---
    def call_llm_stream(self, prompt):
        response = self.client.chat.completions.create(
            model=self.settings.LLM_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=self.settings.LLM_temp,
            max_tokens=self.settings.LLM_MAX_TOKENS,
            stream=True,
        )
        full_answer = ""
        for chunk in response:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                text = delta.content
                print(text, end="", flush=True)  # live stream
                full_answer += text
        print()
        return full_answer.strip()
    
    @staticmethod
    def extract_answer(llm_output: str) -> str:
        """
        Extract final answer wrapped in --- delimiters.
        Example:
        ---
        This is the answer.
        ---
        """
        # Find text between first and last ---
        parts = re.findall(r"---(.*?)---", llm_output, re.DOTALL)
        if parts:
            return parts[-1].strip()  # last block in case multiple
        return llm_output.strip()
    # --- High-level orchestration ---
    def synthesize(self, query, reranked_docs=None, threshold=0.5, stream=False):
        context = self.select_context(query, reranked_docs, threshold)
        if not context:
            return "I don't know."

        prompt = self.build_prompt(query, context)
        return self.extract_answer(self.call_llm_stream(prompt) if stream else self.call_llm(prompt))
    



if __name__ == "__main__":
    
    RAG = RAGPipeline("config/settings.yaml")

    query = "What is lookback window and how should I set it?"

    ans = RAG.synthesize(query, stream = False)

    print(ans)
