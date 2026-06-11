# IndusMind — Industrial RAG Document Q&A System

IndusMind is a Retrieval-Augmented Generation (RAG) powered web application designed to help engineers and operators query complex industrial manuals, standard operating procedures (SOPs), and equipment datasheets. 

The application is deployed as a **full-stack monorepo on Vercel** (with React on the frontend and FastAPI on Python Serverless Functions in the backend), integrated with Qdrant Cloud (vector storage) and Groq Cloud (Llama 3.1 LLM inference).

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Python, FastAPI, native `qdrant-client`
- **Embeddings**: Hugging Face Serverless Inference API (`sentence-transformers/all-MiniLM-L6-v2`)
- **LLM**: Groq Cloud (Llama 3.1 8B)
- **Vector DB**: Qdrant Cloud
- **Deployment**: Vercel (unified hosting)

---

## Local Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Qdrant Cloud account & cluster (free tier)
- Groq Cloud API Key
- Hugging Face API Token (free tier)

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
   HUGGINGFACE_API_KEY=your_huggingface_api_token
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
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser. *(Requests to `/api/*` are automatically routed to the local backend during development).*

---

## Deployment to Vercel (Full-Stack Monorepo)

Vercel hosts the React frontend and compiles the Python serverless functions (located in the `api/` directory) in a single deployment.

### 1. Vector Database Setup (Qdrant Cloud)
1. Sign up at [cloud.qdrant.io](https://cloud.qdrant.io) (free tier).
2. Create a free cluster, copy the **Cluster URL** and create/copy an **API Key**.

### 2. Hugging Face Access Token
1. Generate a free API token (with standard Read permissions) at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).

### 3. Deploying to Vercel
1. Push the code repository to GitHub.
2. Link your GitHub repository in your Vercel Dashboard.
3. In Vercel Project Settings, add the following **Environment Variables**:
   - `GROQ_API_KEY` (Your Groq API key)
   - `QDRANT_URL` (Your Qdrant cluster URL)
   - `QDRANT_API_KEY` (Your Qdrant API key)
   - `HUGGINGFACE_API_KEY` (Your Hugging Face API token)
4. Deploy the project. Vercel compiles the Vite frontend and deploys the backend Python routes at `/api/upload` and `/api/query` automatically.
