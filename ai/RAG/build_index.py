# build_index.py
import json
import yaml
import sqlite3
import torch
from pathlib import Path
from langchain.schema import Document
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")


# --------------------
# Load config
# --------------------
with open("config/settings.yaml", "r") as f:
    config = yaml.safe_load(f)

DB_PATH = Path(config["paths"]['params_db'])
hf_retrieval_model = config["retrieval"]["embedding_model"]

STORE_PATH = Path(config["paths"]["rag_store"])
STORE_PATH.mkdir(parents=True, exist_ok=True)


def fetch_and_build(cur, query, section, row_parser):
    """Run a query, parse rows, and return list[Document]."""
    cur.execute(query)
    docs = []
    for row in cur.fetchall():
        semantic_text, metadata = row_parser(row, section)
        if semantic_text:  # skip empty docs
            docs.append(Document(page_content=semantic_text, metadata=metadata))
    return docs


# ----------------------
# Row Parsers
# ----------------------

def parse_input_row(row, section):
    function_name, package_name, param_name, explanation, example, default_value, omit = row
    if omit:
        return None, None

    semantic_text = "\n".join(filter(None, [param_name, explanation, example]))

    metadata = {
        "section": section,
        "function": function_name,
        "package": package_name,
        "param": param_name,
        "default": default_value,
        "source": package_name,   
    }
    return semantic_text, metadata


def parse_output_row(row, section):
    function_name, package_name, param_name, explanation, example, importance, omit = row
    if omit:
        return None, None

    semantic_text = "\n".join(filter(None, [param_name, explanation, example, importance]))

    metadata = {
        "section": section,
        "function": function_name,
        "package": package_name,
        "param": param_name,
        "source": package_name,  
    }
    return semantic_text, metadata


def parse_generic_row(row, section):
    term_name, explanation, example, package_name = row

    semantic_text = "\n".join(filter(None, [term_name, explanation, example]))

    metadata = {
        "section": section,
        "term": term_name,
        "package": package_name,
        "source": package_name,   # will be "GENERIC" or "__GLOBAL__"
    }
    return semantic_text, metadata


# ----------------------
# Loader
# ----------------------

def load_sql_as_docs(db_path: str):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    docs = []

    # Inputs
    docs += fetch_and_build(
        cur,
        """
        SELECT f.function_name, f.package_name, i.param_name, 
               i.explanation, i.example, i.default_value, i.omit
        FROM inputs i
        JOIN functions f ON i.function_id = f.function_id
        """,
        "input",
        parse_input_row,
    )

    # Outputs
    docs += fetch_and_build(
        cur,
        """
        SELECT f.function_name, f.package_name, o.param_name,
               o.explanation, o.example, o.importance, o.omit
        FROM outputs o
        JOIN functions f ON o.function_id = f.function_id
        """,
        "output",
        parse_output_row,
    )

    # Generic terms
    docs += fetch_and_build(
        cur,
        """
        SELECT term_name, explanation, example, package_name
        FROM generic_terms
        """,
        "generic",
        parse_generic_row,
    )

    conn.close()
    return docs


if __name__ == "__main__":
    # --------------------
    # Load both input and output docs
    # --------------------
    params_docs = load_sql_as_docs(DB_PATH)
    print(f"Loaded {len(params_docs)} documents for indexing.")

    # --------------------
    # Create embeddings & save FAISS index
    # --------------------
    embedding_model = HuggingFaceEmbeddings(model_name=hf_retrieval_model, model_kwargs={"device": device})

    vector_store = FAISS.from_documents(params_docs, embedding_model)
    vector_store.save_local(str(STORE_PATH))

    print(f"Vector store saved to {STORE_PATH}")