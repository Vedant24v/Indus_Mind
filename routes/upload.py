import os
import re
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient

router = APIRouter()

def sanitize_collection_name(filename: str) -> str:
    # Extract filename without extension
    name, _ = os.path.splitext(filename)
    # Convert to lowercase
    name = name.lower()
    # Remove spaces and special characters (keep only a-z and 0-9)
    sanitized = re.sub(r'[^a-z0-9]', '', name)
    if not sanitized:
        sanitized = "document"
    return sanitized

@router.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    # Verify file type is PDF
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    # Restrict file size to 10MB
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    contents = await file.read(MAX_SIZE + 1)
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")
    
    # Reset upload file pointer
    await file.seek(0)
    
    # Save the upload file to a temporary file
    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(temp_file_path, "wb") as f:
            f.write(contents[:MAX_SIZE])
        
        # Load and parse document
        loader = PyPDFLoader(temp_file_path)
        documents = loader.load()
        
        if not documents:
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF file.")
            
        # Chunk text
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = text_splitter.split_documents(documents)
        
        # Initialize embeddings using all-MiniLM-L6-v2
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        
        # Load Qdrant credentials
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        if not qdrant_url or not qdrant_api_key:
            raise HTTPException(status_code=500, detail="Qdrant environment variables QDRANT_URL and QDRANT_API_KEY must be set.")
        
        # Connect Qdrant Client
        client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        
        # Sanitize collection name
        collection_name = sanitize_collection_name(file.filename)
        
        # Delete the collection if it exists to overwrite/re-upload clean data
        try:
            client.delete_collection(collection_name)
        except Exception:
            pass
        
        # Create and store vectors in Qdrant
        QdrantVectorStore.from_documents(
            documents=chunks,
            embedding=embeddings,
            url=qdrant_url,
            api_key=qdrant_api_key,
            collection_name=collection_name
        )
        
        return {
            "message": "uploaded",
            "chunks": len(chunks),
            "doc_id": collection_name
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
        
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
