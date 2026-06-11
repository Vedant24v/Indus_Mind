import os
import re
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from fastembed import TextEmbedding

router = APIRouter()

cache_dir = "/tmp/fastembed_cache"

# Initialize embedding model locally in Vercel's /tmp directory
embedding_model = TextEmbedding(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    cache_dir=cache_dir
)

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

@router.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    MAX_SIZE = 10 * 1024 * 1024
    contents = await file.read(MAX_SIZE + 1)
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")
    
    await file.seek(0)
    
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(temp_file_path, "wb") as f:
            f.write(contents[:MAX_SIZE])
        
        reader = PdfReader(temp_file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
            
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF file.")
            
        chunks = split_text(text, chunk_size=500, chunk_overlap=50)
        
        # Run local embeddings generation via fastembed
        vectors_gen = embedding_model.embed(chunks)
        vectors = [v.tolist() for v in vectors_gen]
            
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        if not qdrant_url or not qdrant_api_key:
            raise HTTPException(status_code=500, detail="Qdrant environment variables must be set.")
            
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        collection_name = sanitize_collection_name(file.filename)
        
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
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
        
    finally:
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
