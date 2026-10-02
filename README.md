# Interior CRM

Lead management for an interior design & construction business. Captures
enquiries from Instagram, the website, WhatsApp and referrals, qualifies them
through a sales pipeline, and converts won leads into projects.

**Status: Phase 1.1 (Foundation) complete.** See [Roadmap](#roadmap).

---

## Quick start

```bash
npm install
cp .env.example .env     # then fill in DATABASE_URL and AUTH_SECRET
npm run dev              # http://localhost:3000
```

Generate an `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run verify` | typecheck → lint → test (run before every commit) |
| `npm run typecheck` | `tsc` over packages, then the web app |
| `npm run lint` | ESLint over packages, then the web app |
| `npm test` | Vitest unit + integration tests |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Seed roles, option values and demo data |
| `npm run db:studio` | Browse the database |
| `npm run db:reset` | Drop, re-migrate and re-seed |

## Architecture

```
UI (React)  →  Server Action / Route Handler  →  service  →  repository  →  Prisma
                       auth · RBAC · Zod         business      the only
                                                  rules      DB access point
```

Four rules hold the structure together, and two of them are enforced by lint
rather than convention:

1. **Prisma is importable only from `lib/modules/*/repository.ts`.** Enforced by
   `no-restricted-imports` in `apps/web/eslint.config.mjs`.
2. **Components may not import domain services.** Also enforced by lint. Data
   arrives as props from a Server Component, or via a Server Action.
3. **Integrations are interfaces first.** Each has a mock/console/local driver
   selected by an env var, so the CRM is fully functional with no credentials
   for WhatsApp, Meta, email or S3.
4. **Notifications are never called from lead code.** Services write an
   `OutboxEvent` row inside the same transaction as the lead; a dispatcher
   drains it. A WhatsApp outage can never fail a form submission.

### Layout

```
apps/web/          Next.js app — app/, components/, lib/, hooks/
packages/
  config/          env parsing (Zod), constants, permissions, scoring rules
  types/           shared DTOs and result envelopes
  validation/      Zod schemas shared by browser form and server
  database/        Prisma schema, migrations, seed
  integrations/
    whatsapp/      provider-agnostic contract + mock driver
    meta/          Lead Ads parser + webhook signature verification
    email/         console driver + Resend driver (fetch, no SDK)
    storage/       FileStorage contract + local disk driver
tests/             unit / integration / e2e
```

## Toolchain constraints

These versions are pinned deliberately. Read this before running any upgrade.

| Package | Pinned | Why not latest |
| --- | --- | --- |
| **Node** | v23.3.0 (installed) | See warning below. |
| **Prisma** | 6.19.3 | Prisma 7 refuses to install on Node 23 — it supports only Node 20.19+, 22.12+ and 24.0+. Odd-numbered Node releases are excluded. |
| **TypeScript** | ~5.9.3 | TypeScript 7 is out, but `typescript-eslint` 8.x declares a peer range of `>=4.8.4 <6.1.0`. Upgrading TS breaks linting. |
| **ESLint** | ^9.39.5 | ESLint 10 removed the legacy `context.getFilename()` API, which `eslint-plugin-react` (vendored inside `eslint-config-next@16.3.7`) still calls. Linting the web app crashes on ESLint 10. |

> [!WARNING]
> **Node v23.3.0 is not an LTS release.** Odd-numbered Node versions receive no
> long-term support and are already being dropped by major dependencies —
> Prisma 7 among them. Moving to Node 22 LTS or 24 LTS is recommended before
> production, after which Prisma can go to 7.x. Nothing in the codebase depends
> on staying on 23.

### Known advisory

`npm audit` reports 3 high-severity findings, all one issue: `deepmerge-ts <8`
reached through `@prisma/config` → `prisma`. It affects the **Prisma CLI only**
(a dev dependency), not `@prisma/client` or anything that runs in production.
`npm audit fix --force` "resolves" it by downgrading Prisma to 6.12.0, which is
older and worse. Left as-is deliberately; revisit at the Prisma 7 upgrade.

## Next.js 16 notes

This project runs Next.js 16, which differs from older App Router material:

- `middleware.ts` is now **`proxy.ts`**, exporting a function named `proxy`.
  Its runtime is Node.js and cannot be set to edge.
- `cookies()`, `headers()`, `params` and `searchParams` are **async-only**.
- `revalidateTag(tag)` now requires a cache-profile argument; `updateTag()`
  gives read-your-writes semantics inside Server Actions.
- `next lint` is removed — ESLint runs directly.
- Turbopack is the default for both `dev` and `build`.

Version-matched documentation ships inside the repo at
`apps/web/node_modules/next/dist/docs/`. Prefer it over anything online.

## Roadmap

**Phase 1 is complete.**

| Phase | Scope | Status |
| --- | --- | --- |
| 1.1 | Workspace, TS, lint boundaries, env contract, errors, logger, tests | ✅ |
| 1.2 | Prisma schema, seed + demo data, shared Zod validation | ✅ |
| 1.3 | Auth.js login, password reset, RBAC, audit log, CRM shell | ✅ |
| 1.4 | Landing page, 6-step consultation form, thank-you | ✅ |
| 1.5 | Dedupe, scoring, assignment, outbox dispatcher, uploads, anti-spam | ✅ |
| 1.6 | Dashboard, leads list, lead detail with actions | ✅ |
| 2 | Kanban pipeline, follow-ups, customer profiles, documents | ✅ |
| 1.7 | Users & roles admin, settings editor | Planned |
| 3 | Campaigns, analytics | Planned |
| 4 | Live WhatsApp, Meta Lead Ads, email | Planned |
| 5 | Projects, quotations, customer portal | Planned |

Screens for phases 1.7–5 exist as honest placeholders that state what they
will do, so no navigation link 404s. The schema already supports all of them
without a further migration.

### Sign-in accounts after seeding

One user per role, all sharing `SEED_SUPER_ADMIN_PASSWORD`:
`admin@`, `manager@`, `sales1@`, `sales2@`, `designer@`, `viewer@example.com`,
plus the super admin at `SEED_SUPER_ADMIN_EMAIL`.

### Before the app will run

Two steps remain, both environment rather than code:

1. **Set `DATABASE_URL`** in `.env`. PostgreSQL 17 is installed and listening
   on 5432, but the `postgres` role's password is needed. Then
   `npm run db:migrate` and `npm run db:seed -- --demo`.
2. **`npm run db:generate`** currently fails behind the corporate TLS proxy:
   Prisma cannot download its query engine (`self-signed certificate in
   certificate chain`). Point `NODE_EXTRA_CA_CERTS` at the corporate root CA,
   or run the generate step off the corporate network once — the engine is
   then cached.

`npm test` and `npm run lint` pass today without either step. `npm run typecheck`
needs step 2, because the generated Prisma types do not exist yet.

### Verification status

| Check | Result |
| --- | --- |
| `npm test` | ✅ 80 tests, 11 files |
| `npm run lint` (root + web) | ✅ clean |
| `npm run build` | ✅ verified before the database layer landed |
| `npm run typecheck` | ⏳ blocked on `db:generate` |

Every outstanding type error traces to the ungenerated Prisma client —
missing enum exports, and `select:` results typed as `{}`. Running
`npm run db:generate` is expected to clear all of them. Nothing in the
application code is known to be type-broken, but that cannot be *confirmed*
until generate succeeds, so treat the database-touching files as
lint-verified rather than type-verified.
