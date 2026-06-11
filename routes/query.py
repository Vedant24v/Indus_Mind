import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_groq import ChatGroq
from qdrant_client import QdrantClient

router = APIRouter()

class QueryRequest(BaseModel):
    question: str
    doc_id: str

@router.post("/api/query")
async def query_document(request: QueryRequest):
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    groq_api_key = os.getenv("GROQ_API_KEY")
    
    if not qdrant_url or not qdrant_api_key:
        raise HTTPException(status_code=500, detail="Qdrant environment variables must be set.")
    
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="Groq environment variable GROQ_API_KEY must be set.")
        
    try:
        # Connect to Qdrant and check if collection exists
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        try:
            client.get_collection(request.doc_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Document index not found. Please upload the document again.")
        
        # Load embedding model
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Load vector store
        vector_store = QdrantVectorStore(
            client=client,
            collection_name=request.doc_id,
            embedding=embeddings
        )
        
        # Retrieve top 4 relevant chunks
        docs = vector_store.similarity_search(request.question, k=4)
        
        # Build prompt
        context = "\n\n".join([doc.page_content for doc in docs])
        prompt_text = (
            f"You are an industrial document assistant. Use ONLY the following context to answer. "
            f"If the answer is not in the context, say 'Not found in document'.\n\n"
            f"Context: {context}\n\n"
            f"Question: {request.question}"
        )
        
        # Initialize Groq LLM
        # Fall back to llama-3.1-8b-instant if the decommissioned llama3-8b-8192 is requested
        try:
            llm = ChatGroq(
                temperature=0,
                model_name="llama3-8b-8192",
                groq_api_key=groq_api_key
            )
            response = llm.invoke(prompt_text)
        except Exception as e:
            if "decommissioned" in str(e) or "not found" in str(e).lower() or "400" in str(e):
                llm = ChatGroq(
                    temperature=0,
                    model_name="llama-3.1-8b-instant",
                    groq_api_key=groq_api_key
                )
                response = llm.invoke(prompt_text)
            else:
                raise e
        
        answer = response.content
        
        # Collect source texts
        sources = [doc.page_content for doc in docs]
        
        return {
            "answer": answer,
            "sources": sources
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
