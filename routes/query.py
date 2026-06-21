import os
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchAny

from routes.embeddings import get_huggingface_embeddings

router = APIRouter()

AEC_SYSTEM_PROMPT = (
    "You are an AEC document assistant. Answer using ONLY the provided context chunks from project documents (specs, RFIs, codes, submittals).\n\n"
    "Rules:\n"
    "1. If the answer is in the context, state it directly and confidently in 1-3 sentences. No hedging, no disclaimers, no \"according to the provided context\" more than once.\n"
    "2. Synthesize across ALL provided chunks before answering — the full answer may require combining facts from more than one chunk. Don't treat each chunk as needing to independently contain the whole answer.\n"
    "3. If the context does not contain the answer, respond with exactly: \"This isn't covered in the provided documents.\" Do not guess, infer, or partially answer with caveats. Never say \"not found\" and then answer anyway in the same response — pick one.\n"
    "4. When a question covers multiple categories (e.g., strength values for different building elements), list each value clearly against its category, not merged into one ambiguous sentence.\n"
    "5. Bridge close synonyms in the source text (e.g., \"exterior slabs\" and \"exterior flatwork\" refer to the same scope) — don't fail to connect an answer just because the question's wording doesn't exactly match the document's wording.\n"
    "6. Do not restate the question. Do not repeat the same fact twice in one answer."
)


class QueryRequest(BaseModel):
    question: str
    project_id: str
    document_ids: Optional[list[str]] = None


def call_groq(prompt: str, groq_api_key: str) -> str:
    headers = {
        "Authorization": f"Bearer {groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": AEC_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0,
    }
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers=headers,
        json=payload,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Groq API error: {response.text}")
    return response.json()["choices"][0]["message"]["content"]


@router.post("/api/py/query")
async def query_document(request: QueryRequest):
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    groq_api_key = os.getenv("GROQ_API_KEY")

    if not groq_api_key:
        raise HTTPException(status_code=500, detail="Groq environment variable GROQ_API_KEY must be set.")

    collection_name = f"project_{request.project_id}"

    try:
        if qdrant_url == "local" or not qdrant_url:
            client = QdrantClient(path="local_qdrant.db")
        else:
            if not qdrant_api_key:
                raise HTTPException(status_code=500, detail="Qdrant API key must be set when QDRANT_URL is provided.")
            client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        try:
            client.get_collection(collection_name)
        except Exception:
            raise HTTPException(
                status_code=404,
                detail=f"Project collection '{collection_name}' not found. Please upload documents first.",
            )

        query_vector = get_huggingface_embeddings([request.question])[0]

        search_kwargs: dict = {
            "collection_name": collection_name,
            "query": query_vector,
            "limit": 4,
        }

        if request.document_ids:
            search_kwargs["query_filter"] = Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchAny(any=request.document_ids),
                    )
                ]
            )

        search_result = client.query_points(**search_kwargs)

        if not search_result.points:
            return {
                "answer": "This isn't covered in the provided documents.",
                "sources": [],
            }

        sources = [
            {
                "document_name": point.payload.get("document_name", ""),
                "chunk_text": point.payload.get("page_content", ""),
                "chunk_index": point.payload.get("chunk_index", 0),
            }
            for point in search_result.points
        ]

        context = "\n\n".join(s["chunk_text"] for s in sources)
        prompt_text = f"Context:\n{context}\n\nQuestion: {request.question}"

        answer = call_groq(prompt_text, groq_api_key)

        return {
            "answer": answer,
            "sources": sources,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
