import os

import requests
from fastapi import HTTPException


HF_API_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"
)


def _mean_pool(token_embeddings: list) -> list[float]:
    """Mean-pool token-level embeddings into a single sentence vector."""
    if not token_embeddings:
        return []
    if isinstance(token_embeddings[0], (int, float)):
        return token_embeddings
    dim = len(token_embeddings[0])
    summed = [0.0] * dim
    for token_vec in token_embeddings:
        for i, val in enumerate(token_vec):
            summed[i] += val
    count = len(token_embeddings)
    return [v / count for v in summed]


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

    raw = response.json()
    if not isinstance(raw, list):
        raise HTTPException(
            status_code=502,
            detail="Unexpected HuggingFace response format.",
        )

    return [_mean_pool(item) for item in raw]
