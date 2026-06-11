import os
import re
import tempfile
import base64
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

router = APIRouter()

class UploadRequest(BaseModel):
    file_name: str
    file_data: str  # Base64 encoded string

def sanitize_collection_name(filename: str) -> str:
    name, _ = os.path.splitext(filename)
    name = name.lower()
    sanitized = re.sub(r'[^a-z0-9]', '', name)
    if not sanitized:
        sanitized = "document"
    return sanitized

def split_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            space_idx = text.rfind(' ', start, end)
            if space_idx > start + (chunk_size // 2):
                end = space_idx
        chunks.append(text[start:end].strip())
        start = end - chunk_overlap
    return chunks

def get_huggingface_embeddings(texts: list[str]) -> list[list[float]]:
    hf_token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
    if not hf_token:
        raise HTTPException(
            status_code=500,
            detail="HUGGINGFACE_API_KEY environment variable is missing. "
                   "Please generate a free API token at https://huggingface.co/settings/tokens "
                   "and add it to your environment variables."
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

@router.post("/api/upload")
async def upload_pdf(request: UploadRequest):
    if not request.file_name.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    try:
        # Decode base64 contents
        contents = base64.b64decode(request.file_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 file data.")
        
    MAX_SIZE = 10 * 1024 * 1024
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")
    
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, request.file_name)
    
    try:
        with open(temp_file_path, "wb") as f:
            f.write(contents)
        
        reader = PdfReader(temp_file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
            
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF file.")
            
        chunks = split_text(text, chunk_size=500, chunk_overlap=50)
        
        # Embed in batches of 32
        vectors = []
        batch_size = 32
        for i in range(0, len(chunks), batch_size):
            batch_chunks = chunks[i:i+batch_size]
            batch_vectors = get_huggingface_embeddings(batch_chunks)
            vectors.extend(batch_vectors)
            
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        if not qdrant_url or not qdrant_api_key:
            raise HTTPException(status_code=500, detail="Qdrant environment variables must be set.")
            
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        collection_name = sanitize_collection_name(request.file_name)
        
        try:
            client.delete_collection(collection_name)
        except Exception:
            pass
            
        client.recreate_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE)
        )
        
        points = [
            PointStruct(
                id=idx,
                vector=vector,
                payload={"page_content": chunk, "metadata": {"source": collection_name}}
            )
            for idx, (chunk, vector) in enumerate(zip(chunks, vectors))
        ]
        
        client.upsert(
            collection_name=collection_name,
            points=points,
            wait=True
        )
        
        return {
            "message": "uploaded",
            "chunks": len(chunks),
            "doc_id": collection_name
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
        
    finally:
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
