# Ghostlite

A small, Ghost-flavored CMS that runs entirely on Cloudflare's free tier:
**Pages** for hosting, **D1** for metadata, **R2** for post bodies and media,
**KV** for caching. Pluggable email providers (Resend, Mailgun, SendGrid).
Pluggable themes.

Designed to be cloned, set up, and deployed in a few minutes. Designed to be
read and modified — no megabyte dependencies, no clever abstractions you have
to keep in your head.

## What works in v1

- Public blog: list, single post (Markdown rendered), tag pages
- Admin: login, dashboard, post CRUD, publish/unpublish, settings
- Media uploads to R2, served via `/api/media/...`
- KV cache for rendered post HTML (busted on edit)
- Pluggable email: pick Resend, Mailgun, or SendGrid in the dashboard
- Default theme; the contract supports adding more

## What's intentionally not in v1

- Scheduled publishing (cron worker stub is in `workers/cron/`, requires Workers Paid)
- Newsletter / subscriber list
- Comments
- Theme upload via UI (the loader is ready; the upload flow isn't built)
- Rich-text editor (Markdown textarea is the v1 editor)
- Multi-language i18n

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Wrangler 3.90+ (`npm i -g wrangler`)
- `jq` and `openssl` (standard on macOS/Linux; install via apt/brew if missing)
- A Cloudflare account (free tier is fine)

## Setup

```bash
git clone <your-fork> ghostlite
cd ghostlite
wrangler login            # opens browser, OAuth to your CF account
pnpm run setup            # provisions resources, migrates, seeds admin
pnpm run deploy           # creates Pages project, pushes secrets, deploys
```

### What `pnpm setup` does

1. Creates the **D1 database**, **R2 bucket**, and **KV namespace** if they
   don't already exist on your Cloudflare account.
2. Writes the resulting IDs into [wrangler.toml](wrangler.toml) and
   [workers/cron/wrangler.toml](workers/cron/wrangler.toml) (replaces the
   `REPLACE_ME_*` placeholders).
3. Applies D1 migrations to **both** the remote database and the local
   `apps/web/.wrangler/state` SQLite file used by `pnpm dev`.
4. Generates `JWT_SECRET` and `EMAIL_KEK` and writes them to `.env.local`
   for local dev. **Reused on re-run** — never rotated, because rotating
   `EMAIL_KEK` would make any encrypted email API key already in D1
   unreadable, and rotating `JWT_SECRET` would invalidate every active
   session.
5. Seeds the admin user into **both** remote and local D1, so you can log
   in immediately at `pnpm dev` _or_ on the deployed site.

The setup script is idempotent: re-running it won't create duplicates and
won't rotate secrets.

### What `pnpm deploy` does

[scripts/deploy.sh](scripts/deploy.sh) handles the remote-only steps:

1. Creates the Cloudflare **Pages project** (`ghostlite`) on first run.
2. Pushes `JWT_SECRET` and `EMAIL_KEK` from `.env.local` as Pages secrets,
   **only if they aren't already set** (same no-rotate policy).
3. Builds the Next.js app and runs `wrangler pages deploy`.

### Tearing it all down

```bash
pnpm run teardown
```

[scripts/teardown.sh](scripts/teardown.sh) deletes the D1 database, R2
bucket (and contents), and KV namespace, then resets the repo to its
pre-setup state: `wrangler.toml` IDs go back to `REPLACE_ME_*`,
`.wrangler/` and `apps/web/.wrangler/` caches are removed, and `.env.local`
is deleted. The Cloudflare Pages project itself must be removed from the
dashboard manually.

## Local development

Two modes, depending on what you're working on:

```bash
# Fast UI iteration. Uses local D1/R2/KV emulation via @cloudflare/next-on-pages.
pnpm dev

# Full Workers runtime locally. Slower startup, catches Workers-specific bugs.
pnpm preview
```

`pnpm dev` reads `JWT_SECRET` and `EMAIL_KEK` from `.env.local` and uses
the local D1 SQLite file at `apps/web/.wrangler/state/`. Both are populated
by `pnpm setup`.

## Project layout

```
apps/web/              # Next.js app (App Router, edge runtime)
  app/
    (public)/          # Public blog routes
    admin/             # CMS dashboard (auth-gated)
    api/               # Route handlers = Pages Functions
  lib/
    auth.ts            # getCurrentUser, requireUser
    cf.ts              # getEnv() for binding access
    db.ts              # All SQL — typed, single file
    email/             # Pluggable email providers
    storage.ts         # R2 helpers
    password.ts        # PBKDF2 via Web Crypto
    session.ts         # Server-side opaque tokens
    crypto.ts          # AES-GCM for at-rest secret encryption
    markdown.ts        # Tiny zero-dep MD renderer
  themes/
    theme.types.ts     # The theme contract
    loader.ts          # Theme registry + dynamic import
    default/           # Built-in default theme
  middleware.ts        # Sets x-pathname header
workers/cron/          # Paid-tier scheduled-post worker (stub)
migrations/            # D1 SQL migrations
scripts/               # setup.sh, deploy.sh, teardown.sh, seed-admin.mjs, patch-wrangler.mjs
wrangler.toml          # Bindings for the web app
```

## Architecture quickref

```
[Reader] -> Pages Function -> D1 (metadata) + R2 (body)
                            \-> KV cache (rendered HTML)
[Author] -> /admin --(API)--> D1 / R2 (writes)
[Cron]   -> separate Worker --> D1 (promote scheduled posts)
[Email]  -> sendEmail() -> Provider HTTP API (Resend/Mailgun/SendGrid)
```

## Adding a theme

A theme is any module that default-exports an object conforming to `Theme`
(see `apps/web/themes/theme.types.ts`). To add one:

1. Create `apps/web/themes/<name>/index.ts` and component files.
2. Default-export a `Theme` value with `manifest`, `pages`, optionally `Layout`.
3. Register it in `apps/web/themes/loader.ts`.
4. In the admin, set `settings.theme.active = "<name>"` (CLI for now).

The contract gives themes:

- `site` — title, description, logo URL
- `theme.config` — theme-specific settings
- Page-shaped data (posts, tags, etc.)

Themes **cannot** read env, query the DB, or call internal APIs. This is the
isolation that will eventually make user-uploaded themes safe.

## Adding an email provider

`apps/web/lib/email/providers/<name>.ts` — implement `EmailProvider`:

```ts
export class MyProvider implements EmailProvider {
  name = "myprovider";
  constructor(private apiKey: string) {}
  async send(args: SendArgs) { /* fetch() to provider's HTTP API */ }
  async verifyConfig() { /* cheap auth-check call */ }
}
```

Then register it in `apps/web/lib/email/index.ts` (factory) and
`apps/web/app/admin/settings/email/EmailSettingsForm.tsx` (UI dropdown).
About 30–80 LOC per provider.

> **Note:** Cloudflare Workers cannot make raw outbound TCP connections on
> SMTP ports easily, so we don't ship SMTP support. All providers we support
> have HTTP APIs that work fine from the edge.

## Cloudflare Free vs Paid

Everything in v1 works on Cloudflare's free tier. The Paid plan ($5/mo for
Workers Paid) unlocks:

- Reliable Cron Triggers for scheduled publishing (`workers/cron/`)
- Cloudflare Queues for async fan-out (newsletter, etc.)
- Higher request and CPU ceilings

The web app reads no flag for this — paid features are simply absent until
you deploy the cron worker or wire up Queues.

## Security notes

- Passwords: PBKDF2-SHA256, 100k iterations, per-user salt, constant-time compare.
- Sessions: opaque random tokens stored server-side in D1; HttpOnly + Secure cookie.
- Email API keys: AES-GCM encrypted at rest in D1 with `EMAIL_KEK` from Wrangler secrets.
- All admin routes require an authenticated session; admin-only routes additionally check role.

If you find a security issue, please open a GitHub issue marked `security` or
email the maintainers privately.

## Contributing

The codebase is intentionally small and readable. New features should:

- Stay in `apps/web/` unless they need a separate Worker (cron, queue consumers)
- Add new SQL queries to `lib/db.ts`, never inline in route handlers
- Add new email providers behind the existing interface
- Add new themes behind the existing contract

Run `pnpm typecheck` before committing.

## License

MIT.
