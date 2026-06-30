# 🏢 IndusMind — AEC Document Intelligence Platform

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://indusmind-aec.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-FF4C00?style=flat-square&logo=qdrant)](https://qdrant.tech)
[![Groq](https://img.shields.io/badge/Groq-Inference-orange?style=flat-square)](https://groq.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**IndusMind** is a high-performance, containerized Retrieval-Augmented Generation (RAG) platform designed specifically for the Architecture, Engineering, and Construction (AEC) industry. It enables engineers, architects, project managers, and field operators to query complex project specifications, building codes, RFIs, submittals, and construction standards.

Built as a Next.js monorepo, IndusMind supports project-isolated document indexing, secure user authentication, source-cited Q&A, and a built-in Model Context Protocol (MCP) server for external AI client integrations.

🔗 **Live URL**: [https://indusmind-aec.vercel.app/](https://indusmind-aec.vercel.app/)

---

## ✨ Key Features

- 📂 **Project-Scoped Document Ingestion**: Organize documents by project. Each project gets a dedicated isolated collection (`project_{projectId}`) in Qdrant Cloud.
- 🔗 **Next.js 15 (React 19) + tRPC + Prisma**: Full-stack type-safety linking React Client Components with your PostgreSQL database via tRPC procedures.
- 🔐 **Secure Authentication**: User sign-up and sign-in powered by NextAuth.js (Auth.js v5) with secure credential hashing (bcrypt).
- 🧠 **Retrieval-Augmented Q&A**: Uses semantic search via Qdrant Cloud's `query_points` API to retrieve contextual chunks, passing them to Groq's Llama 3.1 LLM for accurate, domain-specific AEC answers.
- 📝 **Detailed Citations**: Responses include precise source citations mapping back to specific document names, chunk indexes, and text segments.
- 🔌 **MCP Server Integration**: Standalone Model Context Protocol server exposing `search_aec_documents` and `summarize_document` tools to any MCP-compliant client (such as Claude Desktop).
- 🐳 **Docker Compose Orchestration**: Single-command containerized spin-up of Next.js and PostgreSQL with persistent storage.

---

## 📐 System Architecture

```mermaid
graph TD
    User[Web Client / MCP Client] -->|tRPC / HTTP| NextJS[Next.js App Router]
    NextJS -->|Prisma Client| Postgres[(PostgreSQL)]
    NextJS -->|NextAuth| Session[User Auth Session]
    NextJS -->|Route Handlers| RAG[Internal RAG Service]

    RAG -->|pdf-parse| PDF[PDF Ingestion & Chunking]
    PDF -->|all-MiniLM-L6-v2| HF[Hugging Face Inference API]
    HF -->|384d Vectors| Qdrant[(Qdrant Cloud)]

    NextJS -->|Query Request| RAG
    RAG -->|Query Embeddings| HF
    HF -->|Search Query| Qdrant
    Qdrant -->|Context Chunks| RAG
    RAG -->|Context + Prompt| Groq[Groq Llama 3.1 LLM]
    Groq -->|Answer + Citations| NextJS
```

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend & API** | Next.js 15 (React 19) | React framework with Server Actions, tRPC API routing |
| **Database** | Prisma ORM & PostgreSQL | Schema management, type-safe queries, migration flows |
| **Auth** | NextAuth.js (Auth.js v5) | Credentials provider for secure email/password auth |
| **RAG Backend** | Next.js Route Handlers (TypeScript) | Server-side PDF extraction, vector indexing, retrieval, and answer generation |
| **Vector DB** | Qdrant Cloud | Cloud-native vector search engine with payload filtering |
| **Embeddings** | Hugging Face Inference API | `sentence-transformers/all-MiniLM-L6-v2` (384d) |
| **LLM Inference** | Groq Cloud | `llama-3.1-8b-instant` for low-latency reasoning |
| **MCP Server** | Model Context Protocol SDK | Standalone Node.js stdio-based MCP server |
| **Deployment** | Docker Compose / Vercel | Local containerization and production hosting configurations |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Docker & Docker Compose
- Accounts: [Groq Console](https://console.groq.com/), [Qdrant Cloud](https://cloud.qdrant.io/), [Hugging Face](https://huggingface.co/)

---

### Local Development Setup (Manual)

#### 1. Setup Next.js App
Create a `.env` file in the root directory (see [`.env.example`](file:///e:/Projects/RAG%20Industrial%20Document%20Q&A/.env.example)):
```env
DATABASE_URL=postgresql://username:password@localhost:5432/indusmind?schema=public
NEXTAUTH_SECRET=generate-a-32-byte-secret-key-here
NEXTAUTH_URL=http://localhost:3000
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
# (If your project folder name contains spaces or special characters, use the node wrapper path below)
node node_modules/prisma/build/index.js generate

# Push Prisma schema to database (creates tables)
node node_modules/prisma/build/index.js db push

# Start Next.js development server
npm run dev
```
*The web app runs at `http://localhost:3000`.*

---

### Docker Compose Setup (Recommended)

To spin up the entire stack (Next.js web app and a PostgreSQL database) with a single command:

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
1. Navigate to the `mcp-server` directory and build the typescript code:
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
           "INDUSMIND_URL": "http://localhost:3000"
         }
       }
     }
   }
   ```
3. Restart Claude Desktop. The following tools will become available:
   - `search_aec_documents`: Search AEC documents within a project.
   - `summarize_document`: Summarize a specific document.

---

## 📂 Project Structure

```text
├── prisma/
│   └── schema.prisma        # Prisma database schema definition
├── src/
│   ├── app/
│   │   ├── (auth)/          # Authentication flow pages (login, register)
│   │   ├── api/             # NextAuth, tRPC, and RAG route handlers
│   │   ├── dashboard/       # Project view, Chat sessions, & Document Management
│   │   └── globals.css      # Core style definitions and custom dark design variables
│   ├── components/          # Reusable UI elements (Sidebar, DocumentManager, Chat, etc.)
│   ├── lib/                 # Prisma, NextAuth, and tRPC client initializations
│   ├── server/              # tRPC routers merging (auth, project, document, chat)
│   └── providers/           # Session, tRPC, & Toast providers wrapper
├── mcp-server/              # Model Context Protocol service source
├── Dockerfile               # Production Next.js builder
├── docker-compose.yml       # Production services configuration
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
