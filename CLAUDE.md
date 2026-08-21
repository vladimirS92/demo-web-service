# CLAUDE.md — SecureScan project guide

SecureScan is a demo corporate security-scanning web service. Monorepo layout:

- `backend/` — NestJS 11 + Prisma 6 + PostgreSQL 16 (Docker). REST API under `/api`, Swagger at `/api/docs`.
- `frontend/` — Angular 22 standalone components + PrimeNG 22 (`@primeuix/themes` Aura preset) + primeflex + Chart.js via `p-chart`. SCSS, corporate light theme.
- `docker-compose.yml` — PostgreSQL only (user/pass/db all `securescan`, port 5432).

## Commands

Backend (run in `backend/`):
- `npm run start:dev` — dev server on http://localhost:3000
- `npx prisma migrate dev --name <name>` — after ANY change to `prisma/schema.prisma`
- `npm run seed` — reseed demo data (`prisma/seed.ts`, deterministic RNG)
- `npx tsc --noEmit` — typecheck (run before finishing a task)

Frontend (run in `frontend/`):
- `npm start` — dev server on http://localhost:4200
- `npx ng build` — verify compilation (run before finishing a task)

Requires Node 24 LTS. Database must be up first: `docker compose up -d`.

## Architecture rules

- **Auth:** global `JwtAuthGuard` (APP_GUARD) protects every route; use the `@Public()` decorator to opt out. Demo user `admin/admin` is created by the seed. The Angular `authInterceptor` attaches the JWT; 401 triggers logout.
- **Backend modules:** one folder per feature (`projects`, `scans`, `findings`, `stats`, `ai`) with `*.module.ts`, `*.controller.ts`, `*.service.ts`. DTOs use class-validator; the global ValidationPipe runs with `whitelist: true, transform: true` — new body fields MUST be declared in a DTO or they are stripped.
- **Database access:** only through `PrismaService` (global module). Schema lives in `prisma/schema.prisma`; never write raw SQL. Multi-write operations use `prisma.$transaction`. Note: `groupBy` calls go OUTSIDE `$transaction` arrays (typing issue) and use `_count: true`.
- **Scan simulation:** `ScansService.simulate()` is a fire-and-forget async job (QUEUED → 3s → RUNNING → ~5s → COMPLETED + generated findings from `scans/finding-generator.ts`). The frontend polls every 2 s while a scan is QUEUED/RUNNING and stops when none are active — keep that pattern unless explicitly replacing polling.
- **Findings workflow:** status changes must go through `FindingsService.updateStatus()` so a `FindingStatusChange` audit row is written in the same transaction. Never update `finding.status` directly elsewhere.
- **AI agent:** `ai/ai.service.ts` holds the OpenAI function-calling loop (raw `fetch`, max 6 steps) and a rule-based demo fallback when `OPENAI_API_KEY` is empty. New agent capabilities = add a tool definition in `ai/ai-tools.ts` + a case in `executeTool()` + (for mutations) push a human-readable `🔧 ...` string into `actions`. The demo fallback should get a matching canned pattern when reasonable. The OpenAI key lives ONLY in `backend/.env`; never expose it to the frontend.
- **Frontend:** standalone components with inline templates/styles, feature folders under `src/app/pages/`, shared types in `src/app/core/models.ts` (keep them mirroring the Prisma models/DTOs 1:1 — update both sides together). All HTTP goes through `core/api.service.ts` (base URL `http://localhost:3000/api`). Use signals for component state. Use PrimeNG components (v20+ names: `p-select` not `p-dropdown`, `pTextarea`, `#header`/`#body` table templates). Severity/status → tag colors via helpers in `models.ts`.
- **Styling:** global CSS variables in `src/styles.scss` (`--ss-brand`, `--ss-sidebar`, `--ss-border`, ...). Severity colors: CRITICAL #b91c1c, HIGH #ea580c, MEDIUM #d97706, LOW #2563eb, INFO #64748b. Keep the corporate light theme; use `.ss-card` for panels and primeflex utilities for layout.

## Conventions

- TypeScript strict on both sides; no `any` in new code unless interfacing with Chart.js options.
- New endpoints: add Swagger tags (`@ApiTags`, `@ApiBearerAuth`) and a DTO with validation.
- When changing the schema: update `schema.prisma` → run migration → update seed if the demo data should show the feature → update `core/models.ts` → update UI.
- Verify before finishing: backend `npx tsc --noEmit` passes and frontend `npx ng build` passes.
- Docs: any new setup step, env variable, or command belongs in `README.md` (it targets absolute beginners — keep the exact-commands + verify style).
