# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev        # Start with watch mode (uses .env.dev)
npm run migrate:dev      # Run Prisma migrations (uses .env.dev)
npm run seed             # Seed the database (uses .env.dev)
npm run studio:dev       # Open Prisma Studio

# Build & Lint
npm run build
npm run lint

# Tests
npm test                 # Run all unit tests
npm run test:e2e         # Run e2e tests
npm run test:watch       # Watch mode
```

All dev commands require `NODE_ENV=dev` — env file is `.env.dev` (not `.env`).

## Architecture

**NestJS + Prisma (PostgreSQL).** Online lesson platform with role-based access.

### Env files
- `.env.dev` — local development (DATABASE_URL, JWT_SECRET, etc.)
- `prisma.config.ts` — reads env based on `NODE_ENV`, used by Prisma CLI

### Auth flow
- `POST /auth/register` and `POST /auth/login` are public.
- All other routes go through `AuthMiddleware` (JWT Bearer token validation), which attaches `req.user` (payload: `{ sub, email, role }`).
- Role-based access uses `@Roles(Role.X)` decorator + `RolesGuard` applied per route. Guards read `req.user` set by the middleware.

### Prisma client
- Generated to `prisma/generated/prisma/` (non-standard output path).
- Import enums from `prisma/generated/prisma/enums`, not from `@prisma/client`.
- `PrismaModule` is global — inject `PrismaService` anywhere without re-importing the module.

### Roles
`OWNER` → `ADMINISTRATOR` → `REVISIONER` → `TEACHER` → `STUDENT`

- OWNER: creates users with any role via `POST /user/create`
- ADMINISTRATOR + REVISIONER: manage lesson content (planned)
- TEACHER: conducts live lessons (planned)
- STUDENT: joins lessons via WebSocket (planned)

### Planned modules (not yet implemented)
- `lesson` — Lesson + Slide models, CRUD for ADMIN/REVISIONER
- `session` — Live lesson sessions, WebSocket gateway (teacher controls slides, students receive updates)
- `organization` — Multi-tenancy for franchisees
