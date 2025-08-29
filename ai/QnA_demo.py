
import streamlit as st
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from RAG import retrieval_rerank as RR  # your class

st.set_page_config(page_title="GeoLift Assistant", layout="wide")

# Initialize RAG pipeline
if "rag" not in st.session_state:
    st.session_state.rag = RR.RAGPipeline()

# Chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

st.title("📊 GeoLift Assistant")

# Display chat history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# Suggested quick questions
suggested = ["What is lookback window?", 
             "How do I set effect_size?", 
             "What does holdout mean?"]

cols = st.columns(len(suggested))
for i, q in enumerate(suggested):
    if cols[i].button(q):
        st.session_state.user_input = q

# Free-form user input
user_query = st.chat_input("Ask me anything about GeoLift...")
if user_query or "user_input" in st.session_state:
    if not user_query:
        user_query = st.session_state.pop("user_input")
    
    st.session_state.messages.append({"role": "user", "content": user_query})
    with st.chat_message("user"):
        st.markdown(user_query)

    # Generate response
    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            response = st.session_state.rag.synthesize(user_query, stream = True)
            st.markdown(response)

    st.session_state.messages.append({"role": "assistant", "content": response})
