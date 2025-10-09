# Architecture Overview

## High-Level System Diagram
```
Browser (React/Next.js)
        |
        | HTTPS / REST + WebSockets (future)
        v
API Gateway (Express.js + Node)
        |
        v
Service Layer (TypeScript)
        |
        +--> PostgreSQL (Supabase / RDS)
        |
        +--> Redis (optional for caching sessions & settlements)
        |
        +--> Firebase / Google OAuth
```

## Frontend
- **Framework:** Next.js (React + TypeScript) for SSR and API routes where applicable.
- **State Management:** React Query for server state, Context for auth session.
- **UI Library:** Tailwind CSS for rapid styling.
- **Auth Handling:** Use NextAuth.js for seamless Google OAuth integration.

## Backend
- **Runtime:** Node.js 20 LTS with TypeScript.
- **Framework:** Express.js served through Next.js API routes or standalone service.
- **Auth:** NextAuth + JWT-based session tokens; refresh logic handled by provider.
- **Business Logic:** Service layer orchestrates group management, expense handling, settlement generation.
- **Debt Simplification:** Directed graph reduction; apply min-cost flow or greedy cycle cancellation depending on complexity.

## Persistence
- **Primary DB:** PostgreSQL (production) / SQLite (local dev) with schemas for users, groups, memberships, expenses, payments, weightings, settlements.
- **ORM:** Prisma for schema migrations and type-safe queries.
- **Caching:** Redis (optional) for session store and precomputed settlement suggestions.

## Integrations
- **Google OAuth:** Primary login provider via NextAuth adapter.
- **Cloud Storage (optional):** S3-compatible service for receipt uploads.

## Deployment Strategy
- **Environment:** Vercel for frontend (Next.js) + Railway/Render/Fly.io for backend + managed Postgres.
- **CI/CD:** GitHub Actions pipeline for linting, tests, and deployments.
- **Observability:** Log aggregation (Logtail), metrics (Prometheus-compatible), and error tracking (Sentry).

## Security Considerations
- Enforce HTTPS and secure cookies.
- Store secrets via environment variables managed by deployment platform.
- Validate user membership per request to prevent cross-group data leaks.
- Audit logging for sensitive actions (expense edits, settlements).

## Testing Strategy
- **Unit Tests:** Jest/Testing Library for UI and logic.
- **Integration Tests:** Playwright for key user flows; Supertest for API endpoints.
- **Static Analysis:** ESLint, Prettier, TypeScript strict mode.
