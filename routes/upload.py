import os
import uuid
import tempfile
import base64

from fastapi import APIRouter, HTTPException, Request
from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from routes.embeddings import get_huggingface_embeddings

router = APIRouter()


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


@router.post("/api/py/upload")
async def upload_pdf(request: Request):
    content_type = request.headers.get("content-type", "")

    filename = ""
    contents = b""
    project_id = ""
    document_id = ""

    if "multipart/form-data" in content_type:
        try:
            form = await request.form()
            file = form.get("file")
            if not file:
                raise HTTPException(status_code=400, detail="No file found in the multipart form upload.")
            filename = file.filename
            contents = await file.read()
            project_id = form.get("project_id", "")
            document_id = form.get("document_id", "")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse multipart form data: {str(e)}")
    else:
        try:
            body = await request.json()
            filename = body.get("file_name", "")
            file_data = body.get("file_data", "")
            project_id = body.get("project_id", "")
            document_id = body.get("document_id", "")
            if not filename or not file_data:
                raise HTTPException(status_code=400, detail="JSON payload must contain file_name and file_data.")
            contents = base64.b64decode(file_data)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Base64 JSON payload: {str(e)}")

    if not project_id:
        raise HTTPException(status_code=400, detail="project_id is required.")
    if not document_id:
        raise HTTPException(status_code=400, detail="document_id is required.")

    if not filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    MAX_SIZE = 10 * 1024 * 1024
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")

    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, filename)

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

        if qdrant_url == "local" or not qdrant_url:
            client = QdrantClient(path="local_qdrant.db")
        else:
            if not qdrant_api_key:
                raise HTTPException(status_code=500, detail="Qdrant API key must be set when QDRANT_URL is provided.")
            client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        collection_name = f"project_{project_id}"

        # Only create the collection if it doesn't already exist
        existing_collections = [c.name for c in client.get_collections().collections]
        if collection_name not in existing_collections:
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )

        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "document_id": document_id,
                    "document_name": filename,
                    "chunk_index": idx,
                    "page_content": chunk,
                },
            )
            for idx, (chunk, vector) in enumerate(zip(chunks, vectors))
        ]

        client.upsert(
            collection_name=collection_name,
            points=points,
            wait=True,
        )

        return {
            "message": "uploaded",
            "chunks": len(chunks),
            "document_id": document_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    finally:
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
