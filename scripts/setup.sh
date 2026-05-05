#!/usr/bin/env bash
# Ghostlite setup script. Idempotent: re-running it won't create duplicates.
#
# What it does:
#   1. Verifies prerequisites (node, pnpm, wrangler, jq, openssl)
#   2. Creates D1 database, R2 bucket, KV namespace if missing
#   3. Patches wrangler.toml + workers/cron/wrangler.toml with the IDs
#   4. Applies D1 migrations to BOTH remote and local
#   5. Writes JWT_SECRET / EMAIL_KEK to .env.local for local dev
#      (reuses existing values if .env.local already has them — never rotates)
#   6. Seeds the first admin user into BOTH remote and local D1
#
# Remote (Pages) deploy + secret push lives in scripts/deploy.sh.
set -euo pipefail

# --- Output helpers ---
say()  { printf "\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$*"; }
die()  { printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

# --- Prerequisites ---
say "Checking prerequisites"
command -v node     >/dev/null || die "node not found (need v20+)"
command -v pnpm     >/dev/null || die "pnpm not found (npm i -g pnpm)"
command -v wrangler >/dev/null || die "wrangler not found (npm i -g wrangler)"
command -v jq       >/dev/null || die "jq not found (brew install jq / apt install jq)"
command -v openssl  >/dev/null || die "openssl not found"

NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
[ "$NODE_MAJOR" -ge 20 ] || die "node v20+ required (have v$NODE_MAJOR)"

wrangler whoami >/dev/null 2>&1 || die "Not logged in. Run: wrangler login"
ok "Prerequisites OK"

# --- Inputs ---
PROJECT_NAME="${PROJECT_NAME:-ghostlite}"
DB_NAME="${DB_NAME:-${PROJECT_NAME}-db}"
R2_NAME="${R2_NAME:-${PROJECT_NAME}-content}"
KV_NAME="${KV_NAME:-${PROJECT_NAME}-cache}"
SITE_NAME="${SITE_NAME:-Ghostlite}"

if [ -z "${ADMIN_EMAIL:-}" ]; then
  read -p "Admin email: " ADMIN_EMAIL
fi
if [ -z "${ADMIN_PASS:-}" ]; then
  read -s -p "Admin password (min 12 chars): " ADMIN_PASS; echo
fi

[ -n "$ADMIN_EMAIL" ] || die "Admin email required"
[ ${#ADMIN_PASS} -ge 12 ] || die "Password must be at least 12 chars"

# --- Install deps ---
say "Installing dependencies"
pnpm install
ok "Dependencies installed"

# --- D1 ---
say "D1 database: $DB_NAME"
DB_ID=$(wrangler d1 list --json 2>/dev/null | jq -r ".[] | select(.name==\"$DB_NAME\") | .uuid" || echo "")
if [ -z "$DB_ID" ] || [ "$DB_ID" = "null" ]; then
  CREATE_OUT=$(wrangler d1 create "$DB_NAME")
  DB_ID=$(echo "$CREATE_OUT" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1 || true)
  ok "Created D1: $DB_ID"
else
  ok "D1 exists: $DB_ID"
fi

# --- R2 ---
say "R2 bucket: $R2_NAME"
if wrangler r2 bucket list 2>/dev/null | awk '{for(i=1;i<=NF;i++)print $i}' | grep -qx "$R2_NAME"; then
  ok "R2 exists"
else
  wrangler r2 bucket create "$R2_NAME" || warn "R2 create returned non-zero (may already exist)"
  ok "R2 ready"
fi

# --- KV ---
say "KV namespace: $KV_NAME"
KV_ID=$(wrangler kv namespace list 2>/dev/null | jq -r ".[] | select(.title==\"$KV_NAME\") | .id" 2>/dev/null || echo "")
if [ -z "$KV_ID" ] || [ "$KV_ID" = "null" ]; then
  CREATE_OUT=$(wrangler kv namespace create "$KV_NAME")
  # Wrangler 3.x prints `id = "..."` (TOML); 4.x prints `"id": "..."` (JSON). Accept both.
  KV_ID=$(echo "$CREATE_OUT" | grep -oE '[a-f0-9]{32}' | head -1 || true)
  ok "Created KV: $KV_ID"
else
  ok "KV exists: $KV_ID"
fi

# --- Render wrangler.toml from templates ---
say "Rendering wrangler.toml from templates"
PROJECT_NAME="$PROJECT_NAME" DB_NAME="$DB_NAME" R2_NAME="$R2_NAME" KV_NAME="$KV_NAME" \
  D1_ID="$DB_ID" KV_ID="$KV_ID" SITE_NAME="$SITE_NAME" \
  node scripts/render-wrangler.mjs
ok "wrangler.toml files generated"

# --- Migrations ---
# Run from apps/web so wrangler resolves a single config + state dir there.
# `next dev` also runs from apps/web, so it reads the same local SQLite file.
say "Applying D1 migrations (remote + local)"
(cd apps/web && wrangler d1 migrations apply "$DB_NAME" --remote)
(cd apps/web && wrangler d1 migrations apply "$DB_NAME" --local)
ok "Migrations applied"

# --- Secrets ---
# IMPORTANT: reuse existing secrets if .env.local already has them. Rotating
# EMAIL_KEK would render any encrypted email API key in D1 unreadable, and
# rotating JWT_SECRET would invalidate all sessions. Only generate on first run.
say "Provisioning local secrets"
JWT_SECRET=""
EMAIL_KEK=""
if [ -f .env.local ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env.local; set +a
fi
if [ -z "${JWT_SECRET:-}" ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  ok "Generated new JWT_SECRET"
else
  ok "Reusing existing JWT_SECRET from .env.local"
fi
if [ -z "${EMAIL_KEK:-}" ]; then
  EMAIL_KEK=$(openssl rand -base64 32)
  ok "Generated new EMAIL_KEK"
else
  ok "Reusing existing EMAIL_KEK from .env.local"
fi

cat > .env.local <<EOF
JWT_SECRET=$JWT_SECRET
EMAIL_KEK=$EMAIL_KEK
EOF
ok "Secrets written to .env.local (for local dev)"
warn "Remote (Pages) secrets are pushed by scripts/deploy.sh, not here."

# --- Seed admin ---
say "Seeding admin user"
node scripts/seed-admin.mjs \
  --db "$DB_NAME" \
  --email "$ADMIN_EMAIL" \
  --password "$ADMIN_PASS" \
  --target both
ok "Admin user created in remote + local D1: $ADMIN_EMAIL"

# --- Done ---
cat <<EOF

🎉 Setup complete!

  Local dev:    pnpm dev
  Build:        pnpm build
  Deploy:       pnpm deploy   (creates Pages project, syncs secrets, deploys)

  Sign in to /admin with:
    Email:      $ADMIN_EMAIL
    Password:   (the one you entered)

Next steps:
  1. Run \`pnpm deploy\` to create the Pages project, push secrets, and deploy
  2. Visit your site at https://$PROJECT_NAME.pages.dev
  3. Configure email under /admin/settings/email
  4. (Paid plan) Deploy the cron worker:
     cd workers/cron && pnpm install && pnpm deploy

EOF
