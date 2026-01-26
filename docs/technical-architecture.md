---
name: Technical Architecture Document
overview: Create a comprehensive technical architecture document for Regula that covers the Next.js full-stack architecture on Vercel, Crawl4AI integration, monorepo structure, and all technical implementation details discussed.
todos:
  - id: create-architecture-doc
    content: Create technical-architecture.md file with comprehensive architecture documentation covering Next.js, Vercel, Crawl4AI, monorepo structure, and all technical details
    status: pending
  - id: add-diagrams
    content: Add mermaid diagrams for system architecture, data flows, and monorepo structure
    status: pending
  - id: include-code-examples
    content: Add code examples for Crawl4AI integration, Next.js API routes, Server Actions, and worker services
    status: pending
  - id: document-data-models
    content: Document complete database schema with Drizzle ORM examples and multi-tenancy patterns
    status: pending
  - id: add-deployment-guide
    content: Include deployment configuration for Vercel, environment variables, and CI/CD setup
    status: pending
---

# Technical Architecture Document Plan

## Document Structure

Create `docs/technical-architecture.md` following the existing documentation format with:

### 1. Executive Summary

- Architecture decisions (Next.js, Vercel, Crawl4AI, monorepo)
- Recommended architecture vs alternatives
- Key principles

### 2. High-Level Architecture

- System diagram showing all components
- Flow from client → Vercel → Workers → External Services → Data Layer
- Mermaid diagrams for:
- Overall system architecture
- Data flow for crawl → alert pipeline
- Monorepo structure

### 3. Technology Stack

- Frontend: Next.js 14+, TypeScript, Tailwind CSS, React Query
- Backend: Next.js API Routes, Server Actions
- Database: PostgreSQL (Neon/Vercel Postgres), Drizzle ORM
- Storage: Vercel Blob or S3, Upstash Redis
- External Services: Crawl4AI, Google Gemini, Stripe
- Background Workers: Inngest/Trigger.dev or separate Node.js service
- Deployment: Vercel for Next.js app

### 4. Monorepo Structure

- Detailed folder structure (`apps/web`, `packages/shared`, `packages/db`, etc.)
- Workspace configuration
- Package dependencies

### 5. Component Architecture

- Next.js Application (API routes, server actions, pages)
- Crawl4AI Integration Service
- Change Detection Engine
- NLP Pipeline (LLM integration)
- Alerting System
- Background Workers
- Vercel Cron Jobs

### 6. Data Models

- Database schema (Drizzle ORM definitions)
- Multi-tenancy strategy
- Indexing strategy
- Data retention policies

### 7. Security & Multi-Tenancy

- Row-level security implementation
- Authentication/Authorization (NextAuth.js)
- Data isolation strategies
- Audit logging

### 8. Background Processing

- Why external workers needed (Vercel limitations)
- Options: Inngest, Trigger.dev, Railway, Fly.io
- Job queue architecture
- Retry and error handling

### 9. API Design

- REST API endpoints structure
- Server Actions for mutations
- Authentication flow
- Rate limiting

### 10. Deployment & Infrastructure

- Vercel configuration
- Environment variables
- CI/CD pipeline
- Database migrations
- Monitoring and observability

### 11. Alternative Architecture

- React Frontend + Python/Go Backend option
- When to consider migration
- Trade-offs

### 12. Cost Estimates

- Vercel pricing tiers
- External service costs
- Estimated monthly costs for MVP

### 13. Development Workflow

- Local development setup
- Testing strategy
- Code quality tools
- Git workflow

### 14. Migration Path

- From MVP to scale
- When to introduce separate backend
- Scaling considerations

## Key Sections to Include

1. **Crawl4AI Integration Details**

- Code examples for scraping
- Error handling
- Rate limiting considerations

2. **Next.js Implementation**

- App Router structure
- API routes examples
- Server Actions examples
- Middleware for multi-tenancy

3. **Worker Service Architecture**

- Job processing flow
- Queue management
- Retry logic

4. **Database Schema**

- Complete schema definitions
- Relationships
- Indexes for performance

## Formatting Requirements

- Follow existing doc format with page markers
- Use emoji prefix for main title (🏗️ for Technical Architecture)
- Numbered sections
- Include code examples where relevant