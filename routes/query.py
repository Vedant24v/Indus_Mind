import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from qdrant_client import QdrantClient

router = APIRouter()

class QueryRequest(BaseModel):
    question: str
    doc_id: str

def get_huggingface_embeddings(texts: list[str]) -> list[list[float]]:
    hf_token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
    if not hf_token:
        raise HTTPException(
            status_code=500,
            detail="HUGGINGFACE_API_KEY environment variable is missing. "
                   "Please generate a free API token at https://huggingface.co/settings/tokens "
                   "and add it to your environment variables (Vercel Dashboard & local .env)."
        )
        
    api_url = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"
    headers = {"Authorization": f"Bearer {hf_token}"}
    
    response = requests.post(
        api_url,
        headers=headers,
        json={"inputs": texts, "options": {"wait_for_model": True}}
    )
    
    if response.status_code != 200:
        raise Exception(f"HuggingFace embedding failed (HTTP {response.status_code}): {response.text}")
        
    return response.json()

def call_groq(prompt: str, groq_api_key: str) -> str:
    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0
    }
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers,
        json=payload
    )
    if response.status_code != 200:
        raise Exception(f"Groq API error: {response.text}")
    return response.json()["choices"][0]["message"]["content"]

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
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        try:
            client.get_collection(request.doc_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Document index not found. Please upload the document again.")
        
        # Get query embedding
        query_vector = get_huggingface_embeddings([request.question])[0]
        
        # Search Qdrant
        search_result = client.query_points(
            collection_name=request.doc_id,
            query=query_vector,
            limit=4
        )
        
        retrieved_texts = [point.payload["page_content"] for point in search_result.points]
        
        if not retrieved_texts:
            return {
                "answer": "Not found in document",
                "sources": []
            }
            
        context = "\n\n".join(retrieved_texts)
        prompt_text = (
            f"You are an industrial document assistant. Use ONLY the following context to answer. "
            f"If the answer is not in the context, say 'Not found in document'.\n\n"
            f"Context: {context}\n\n"
            f"Question: {request.question}"
        )
        
        answer = call_groq(prompt_text, groq_api_key)
        
        return {
            "answer": answer,
            "sources": retrieved_texts
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
