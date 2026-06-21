import os

from fastapi import APIRouter, HTTPException
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

router = APIRouter()


def _get_qdrant_client() -> QdrantClient:
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    if qdrant_url == "local" or not qdrant_url:
        return QdrantClient(path="local_qdrant.db")
    else:
        if not qdrant_api_key:
            raise HTTPException(status_code=500, detail="Qdrant API key must be set when QDRANT_URL is provided.")
        return QdrantClient(url=qdrant_url, api_key=qdrant_api_key)


@router.delete("/api/py/documents/{project_id}/{document_id}")
async def delete_document(project_id: str, document_id: str):
    collection_name = f"project_{project_id}"
    client = _get_qdrant_client()

    try:
        client.get_collection(collection_name)
    except Exception:
        raise HTTPException(
            status_code=404,
            detail=f"Collection '{collection_name}' not found.",
        )

    try:
        doc_filter = Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=document_id),
                )
            ]
        )

        client.delete(
            collection_name=collection_name,
            points_selector=doc_filter,
            wait=True,
        )

        return {
            "message": "deleted",
            "project_id": project_id,
            "document_id": document_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.delete("/api/py/collections/{project_id}")
async def delete_collection(project_id: str):
    collection_name = f"project_{project_id}"
    client = _get_qdrant_client()

    try:
        client.get_collection(collection_name)
    except Exception:
        raise HTTPException(
            status_code=404,
            detail=f"Collection '{collection_name}' not found.",
        )

    try:
        client.delete_collection(collection_name)
        return {
            "message": "collection_deleted",
            "project_id": project_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete collection: {str(e)}")
