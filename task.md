# IndusMind AEC — Build Tasks

## Phase 1: Project Scaffolding & Prisma Schema
- [x] Initialize Next.js 14 App Router (replace Vite config)
- [x] Configure TypeScript strict mode + path aliases
- [x] Set up Tailwind CSS v3 + shadcn/ui
- [x] Create Prisma schema (User, Project, Document, ChatSession, Message)
- [x] Create Prisma client singleton
- [x] Update package.json with all dependencies
- [x] Update .gitignore

## Phase 2: Auth & tRPC Setup
- [x] Configure NextAuth v5 with Credentials provider
- [x] Set up tRPC with context (session, prisma)
- [x] Auth router (register, getSession)
- [x] Project router (CRUD)
- [x] Document router (list, upload proxy, delete, reindex)
- [x] Chat router (sessions CRUD, sendMessage)
- [x] tRPC API route handler
- [x] tRPC React client + provider

## Phase 3: RAG Service Refactoring
- [x] Update routes to /api/py/ prefix
- [x] Refactor upload.py for project-scoped collections
- [x] Refactor query.py for project-scoped queries with AEC prompt
- [x] Add document deletion endpoint
- [x] Add collection deletion endpoint
- [x] Remove old external service entry points

## Phase 4: Next.js Frontend
- [x] Root layout with providers
- [x] Global CSS / design system
- [x] Auth pages (login, register)
- [x] Dashboard layout with sidebar
- [x] Dashboard overview page
- [x] Create project page
- [x] Project detail page (documents tab)
- [x] Document management (upload, list, delete)
- [x] Chat interface (session list, message view, input)
- [x] Chat message component with source citations
- [x] Empty states, loading skeletons, error boundary
- [x] AEC-specific copy and quick prompts

## Phase 5: Docker & Containerization
- [x] Next.js Dockerfile (multi-stage)
- [x] Old service Dockerfile cleanup
- [x] docker-compose.yml with Postgres

## Phase 6: MCP Server
- [x] MCP server with search_aec_documents tool
- [x] MCP server package.json + tsconfig

## Phase 7: Cleanup & Documentation
- [x] .env.example (complete)
- [x] vercel.json (updated rewrites)
- [x] Remove old Vite frontend files
- [x] README.md (full rewrite)
- [x] Self-review pass for code quality
