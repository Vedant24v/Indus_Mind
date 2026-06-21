import os

import requests
from fastapi import HTTPException


HF_API_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"
)


def get_huggingface_embeddings(texts: list[str]) -> list[list[float]]:
    hf_token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
    if not hf_token:
        raise HTTPException(
            status_code=500,
            detail="HUGGINGFACE_API_KEY environment variable is missing. "
                   "Please generate a free API token at https://huggingface.co/settings/tokens "
                   "and add it to your environment variables.",
        )

    response = requests.post(
        HF_API_URL,
        headers={"Authorization": f"Bearer {hf_token}"},
        json={"inputs": texts, "options": {"wait_for_model": True}},
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"HuggingFace embedding failed (HTTP {response.status_code}): {response.text}",
        )

    return response.json()
