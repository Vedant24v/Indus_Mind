# IndusMind — AEC Document Intelligence Platform

IndusMind is a high-performance, containerized Retrieval-Augmented Generation (RAG) platform designed specifically for the Architecture, Engineering, and Construction (AEC) industry. It enables engineers, architects, project managers, and field operators to query complex project specifications, building codes, RFIs, submittals, and construction standards.

Built as a Next.js monorepo with a FastAPI Python microservice, IndusMind supports project-isolated document indexing, secure user authentication, source-cited Q&A, and a built-in Model Context Protocol (MCP) server for external AI client integrations.

LIVE: https://indusmind.vercel.app/
---

## Key Features

- **Project-Scoped Document Ingestion**: Organize documents by project. Each project gets a dedicated isolated collection (`project_{projectId}`) in Qdrant.
- **Next.js 15 + tRPC + Prisma**: A fully typed API layer linking React Server and Client Components with PostgreSQL database.
- **Secure Authentication**: User sign-up and sign-in powered by NextAuth.js (Auth.js v5) with hashed passwords (bcrypt).
- **Interactive Retrieval-Augmented Q&A**: Uses state-of-the-art semantic search via Qdrant Cloud's `query_points` API to retrieve contextual chunks, passing them to Groq's Llama 3.1 LLM for accurate AEC Q&A.
- **Detailed Citations**: Responses include precise source citations mapping back to specific document names, chunk indexes, and text segments.
- **MCP Server Integration**: Standalone Model Context Protocol server exposing `search_aec_documents` and `summarize_document` tools to any MCP-compliant client (like Claude Desktop).
- **Docker Compose Orchestration**: Single-command containerized spin-up of Next.js, Python FastAPI, and PostgreSQL with persistent storage.

---

## System Architecture

```mermaid
graph TD
    User[Web Client / MCP Client] -->|tRPC / HTTP| NextJS[Next.js App Router]
    NextJS -->|Prisma Client| Postgres[(PostgreSQL)]
    NextJS -->|NextAuth| Session[User Auth Session]
    NextJS -->|Server HTTP Requests| PyService[Python FastAPI RAG Service]
    
    PyService -->|pypdf.PdfReader| PDF[PDF Ingestion & Chunking]
    PDF -->|all-MiniLM-L6-v2| HF[Hugging Face Inference API]
    HF -->|384d Vectors| Qdrant[(Qdrant Cloud)]
    
    NextJS -->|Query Request| PyService
    PyService -->|Query Embeddings| HF
    HF -->|Search Query| Qdrant
    Qdrant -->|Context Chunks| PyService
    PyService -->|Context + Prompt| Groq[Groq Llama 3.1 LLM]
    Groq -->|Answer + Citations| NextJS
```

---

## Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend & API** | Next.js 15 (App Router) | React framework with Server Actions, tRPC API routing |
| **Database** | Prisma ORM & PostgreSQL | Schema management, type-safe queries, migration flows |
| **Auth** | NextAuth.js (Auth.js v5) | Credentials provider for secure email/password auth |
| **RAG Backend** | FastAPI (Python 3.12) | Asynchronous microservice handling heavy PDF extraction & similarity search |
| **Vector DB** | Qdrant Cloud | Cloud-native vector search engine with payload filtering |
| **Embeddings** | Hugging Face Inference API | `sentence-transformers/all-MiniLM-L6-v2` (384d) |
| **LLM Inference** | Groq Cloud | `llama-3.1-8b-instant` for low-latency reasoning |
| **MCP Server** | Model Context Protocol SDK | Standalone Node.js stdio-based MCP server |
| **Deployment** | Docker Compose / Vercel | Local containerization and production hosting configurations |

---

## Getting Started

### Prerequisites
- Node.js (v20+)
- Python (v3.12+)
- Docker & Docker Compose
- Accounts: [Groq Console](https://console.groq.com/), [Qdrant Cloud](https://cloud.qdrant.io/), [Hugging Face](https://huggingface.co/)

---

### Local Development Setup (Manual)

#### 1. Setup Python RAG Service
Navigate to the root folder:
```bash
# Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py
```
*The service runs at `http://localhost:8000`.*

#### 2. Setup Next.js App
Create a `.env` file in the root directory (see [`.env.example`](file:///e:/Projects/RAG%20Industrial%20Document%20Q&A/.env.example)):
```env
DATABASE_URL=postgresql://username:password@localhost:5432/indusmind?schema=public
NEXTAUTH_SECRET=generate-a-32-byte-secret-key-here
NEXTAUTH_URL=http://localhost:3000
PYTHON_SERVICE_URL=http://localhost:8000
GROQ_API_KEY=gsk_...
QDRANT_URL=https://...cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
HUGGINGFACE_API_KEY=hf_...
```

Open a new terminal window:
```bash
# Install node packages
npm install --ignore-scripts --legacy-peer-deps

# Generate Prisma client
node node_modules/prisma/build/index.js generate

# Push Prisma schema to database (creates tables)
node node_modules/prisma/build/index.js db push

# Start Next.js development server
npm run dev
```
*The web app runs at `http://localhost:3000`.*

---

### Docker Compose Setup (Recommended)

To spin up the entire stack (Next.js web app, FastAPI RAG service, and a PostgreSQL database) with single command:

1. Configure the `.env` file in the root directory. Ensure `DATABASE_URL` is set to point to the postgres container:
   ```env
   DATABASE_URL=postgresql://indusmind:indusmind_dev@postgres:5432/indusmind?schema=public
   ```
2. Build and run containers:
   ```bash
   docker compose up --build
   ```
3. Run Prisma migrations inside the running container (or run `node node_modules/prisma/build/index.js db push` locally mapping to `localhost:5432`).

---

### Model Context Protocol (MCP) Server

IndusMind comes with an MCP server to connect your RAG database directly to AI assistants like Claude Desktop.

#### Setup MCP Server
1. Navigate to the `mcp-server` directory:
   ```bash
   cd mcp-server
   npm install --ignore-scripts --legacy-peer-deps
   node ../node_modules/typescript/bin/tsc
   ```
2. Configure the server in your Claude Desktop configuration file (`%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
   ```json
   {
     "mcpServers": {
       "indusmind-aec": {
         "command": "node",
         "args": ["E:/Projects/RAG Industrial Document Q&A/mcp-server/dist/index.js"],
         "env": {
           "PYTHON_SERVICE_URL": "http://localhost:8000"
         }
       }
     }
   }
   ```
3. Restart Claude Desktop. The following tools will become available:
   - `search_aec_documents`: Search AEC documents within a project.
   - `summarize_document`: Summarize a specific document.

---

## Project Structure

```text
├── prisma/
│   └── schema.prisma        # Prisma database schema definition
├── routes/
│   ├── upload.py            # PDF text chunking and Qdrant ingestion
│   ├── query.py             # Semantic vector similarity search + Groq LLM
│   └── documents.py         # Document and collection deletion management
├── src/
│   ├── app/
│   │   ├── (auth)/          # Authentication flow pages (login, register)
│   │   ├── api/             # NextAuth and tRPC route handlers
│   │   ├── dashboard/       # Project view, Chat sessions, & Document Management
│   │   └── globals.css      # Core style definitions and custom dark design variables
│   ├── components/          # Reusable UI elements (Sidebar, DocumentManager, Chat, etc.)
│   ├── lib/                 # Prisma, NextAuth, and tRPC client initializations
│   ├── server/              # tRPC routers merging (auth, project, document, chat)
│   └── providers/           # Session, tRPC, & Toast providers wrapper
├── mcp-server/              # Model Context Protocol service source
├── Dockerfile               # Production Next.js builder
├── docker-compose.yml       # Production services configuration
└── vercel.json              # Vercel serverless monorepo configuration
```

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
