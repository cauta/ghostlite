# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ghostlite is a Ghost-flavored CMS that runs entirely on Cloudflare's free tier: **Pages** (hosting), **D1** (metadata), **R2** (post bodies + media), **KV** (rendered HTML cache). It is a pnpm monorepo with two packages: `apps/web` (Next.js App Router, edge runtime) and `workers/cron` (a paid-tier Cloudflare Worker stub for scheduled publishing).

## Commands

All commands run from the repo root unless noted.

```bash
pnpm dev            # Next.js dev server with local D1/R2/KV emulation
pnpm preview        # Full Workers runtime locally (slower, catches Workers-specific bugs)
pnpm build          # next build + @cloudflare/next-on-pages
pnpm typecheck      # tsc --noEmit (run before committing)
pnpm lint           # eslint (run before committing)
pnpm deploy         # build + wrangler pages deploy (requires wrangler login)

# Database
pnpm db:migrate         # apply migrations to remote D1
pnpm db:migrate:local   # apply migrations to local .wrangler sqlite

# One-time provisioning
pnpm setup          # create D1/R2/KV, apply migrations, seed admin, write .env.local
pnpm teardown       # delete all CF resources, reset repo to pre-setup state
pnpm admin:create   # re-seed admin user (node scripts/seed-admin.mjs)
```

There is no test suite yet — `pnpm typecheck` and `pnpm lint` are the automated checks. CI runs lint, typecheck, and build on every PR.

## Architecture

### Data flow

```
[Reader] -> Pages Function -> D1 (metadata) + R2 (body)
                            \-> KV cache (rendered HTML, busted on edit)
[Author] -> /admin --(API)--> D1 / R2
[Cron]   -> workers/cron  --> D1 (promote scheduled posts)
[Email]  -> sendEmail()   --> Provider HTTP API
```

### Cloudflare bindings

All bindings (`DB`, `R2`, `KV`) and secrets (`JWT_SECRET`, `EMAIL_KEK`) are typed in `apps/web/lib/env.ts` as `CloudflareEnv`. **Never access `process.env` for bindings in route handlers or server components** — use `getEnv()` from `apps/web/lib/cf.ts`, which calls `getRequestContext().env`. In local dev, `next.config.mjs` calls `setupDevPlatform()` to wire the emulator.

### Database layer (`apps/web/lib/db.ts`)

All SQL lives in this single file — no inline queries in route handlers. It wraps D1's prepared statement API with typed functions. There is intentionally no ORM; if the query surface grows large enough, switching to Drizzle is the documented next step.

**Schema summary** (`migrations/0001_init.sql`):
- `users` — email/password, roles (`admin | editor | author`)
- `posts` — metadata only; body (Markdown) lives in R2 at key `posts/<id>.md`
- `tags` + `post_tags` — many-to-many
- `sessions` — opaque server-side tokens (not JWTs)
- `settings` — key/value JSON store (keys: `site`, `theme`, `email`)

Post bodies are stored in R2 (`posts/<id>.md`) and their rendered HTML is cached in KV (key = post slug). The KV cache is invalidated whenever a post is edited or published.

### Auth

Sessions are opaque random tokens stored in D1, sent as `gl_session` HttpOnly cookie (30-day TTL). `JWT_SECRET` is reserved for future password-reset tokens.

Use `requireUser()` / `requireAdmin()` from `apps/web/lib/auth.ts` at the top of admin server components. API route handlers call `getCurrentUser()` and return 401 manually.

### Email

`apps/web/lib/email/index.ts` exposes `sendEmail(env, args)`. Provider config (including the API key) is stored encrypted in D1 settings under key `"email"`. API keys are AES-GCM encrypted at rest using `EMAIL_KEK` via `apps/web/lib/crypto.ts`. Cloudflare Workers cannot use SMTP — all providers use HTTP APIs.

### Themes

Themes are modules that export a `Theme` object (contract in `apps/web/themes/theme.types.ts`). They receive only typed page props (`ThemeContext` + page data) — no env access, no DB, no internal APIs. Registered statically in `apps/web/themes/loader.ts`.

### R2 storage layout

```
posts/<post_id>.md    — Markdown source for each post
media/<ulid>.<ext>    — uploaded images and attachments
```

Media is served via the Next.js route handler at `/api/media/[...key]`.

## Key conventions

- **All new SQL queries go in `lib/db.ts`**, never inline in route handlers.
- **New email providers** implement `EmailProvider` (`lib/email/types.ts`), register in `lib/email/index.ts`, and add a UI entry in `app/admin/settings/email/EmailSettingsForm.tsx`.
- **New themes** go in `apps/web/themes/<name>/`, export a `Theme` default, register in `themes/loader.ts`. Themes must not import from `lib/`.
- **New Workers** (cron jobs, queue consumers) go in `workers/` as separate packages with their own `wrangler.toml`.
- The `workers/cron` package requires the Cloudflare Workers Paid plan; the web app itself runs on the free tier.
- `wrangler.toml` files in the repo use `REPLACE_ME_*` placeholders; `pnpm setup` fills them in with real IDs.
- Timestamps throughout are **Unix epoch integers** (seconds), not ISO strings.
- IDs are **ULIDs** (from `lib/ulid.ts` / the `ulid` package) — sortable, no collisions.
