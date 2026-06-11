# IndusMind — Industrial RAG Document Q&A System

IndusMind is a Retrieval-Augmented Generation (RAG) powered web application designed to help engineers and operators query complex industrial manuals, standard operating procedures (SOPs), and equipment datasheets. Users upload PDF files which are instantly chunked, vectorized using HuggingFace sentence-transformers, stored in Qdrant Cloud, and made queryable via natural language using Groq's Llama 3 models.

## Tech Stack

[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangChain](https://img.shields.io/badge/LangChain-0.3-orange?style=flat)](https://langchain.com)
[![Qdrant](https://img.shields.io/badge/Qdrant-Cloud_VectorStore-red?style=flat)](https://qdrant.tech)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5+-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3+-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

---

## Local Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Qdrant Cloud account & cluster (free tier)
- Groq Cloud API Key (free tier)

### Backend Configuration
1. Clone the repository and navigate to the directory.
2. Create a Python virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate the virtual environment:
   - **Windows (PowerShell)**: `.\.venv\Scripts\Activate.ps1`
   - **macOS / Linux**: `source .venv/bin/activate`
4. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Create a `.env` file in the root directory with the following variables:
   ```env
   GROQ_API_KEY=your_groq_api_key
   QDRANT_URL=your_qdrant_cluster_url
   QDRANT_API_KEY=your_qdrant_api_key
   FRONTEND_URL=http://localhost:5173
   ```
6. Run the local backend server:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

### Frontend Configuration
1. Install node dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.development` file in the root directory with the API endpoint:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
3. Start the Vite development server:
   ```bash
   node node_modules/vite/bin/vite.js
   ```
   *(Or run `npm run dev` if your system does not hit node wrapper parsing issues)*

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Deployment Instructions

### 1. Vector Database (Qdrant Cloud)
1. Sign up at [cloud.qdrant.io](https://cloud.qdrant.io) (free tier, no credit card required).
2. Create a free cluster.
3. Once active, copy the **Cluster URL** and create/copy an **API Key**.

### 2. Backend (Render)
1. Push the code repository to GitHub.
2. Sign up/log in on [render.com](https://render.com) and click **New** → **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `rag-qa-backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add the following keys (without syncing):
   - `GROQ_API_KEY`
   - `QDRANT_URL`
   - `QDRANT_API_KEY`
   - `FRONTEND_URL` (Set this to your production Vercel frontend URL after deploying it)
6. Click **Deploy Web Service**.

### 3. Frontend (Vercel)
1. Push the code repository to GitHub (shared repo with backend is supported, Vercel will auto-detect Vite frontend).
2. Sign up/log in on [vercel.com](https://vercel.com) and click **Add New** → **Project**.
3. Import your GitHub repository.
4. Set the **Framework Preset** to `Vite`.
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: Set this to your deployed Render backend URL (e.g. `https://rag-qa-backend.onrender.com`).
6. Click **Deploy**.
7. Copy the deployed Vercel URL and add it back to your Render backend `FRONTEND_URL` environment variable.
