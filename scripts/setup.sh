#!/usr/bin/env bash
# Ghostlite setup script. Idempotent: re-running it won't create duplicates.
#
# What it does:
#   1. Verifies prerequisites (node, pnpm, wrangler, jq, openssl)
#   2. Creates D1 database, R2 bucket, KV namespace if missing
#   3. Patches wrangler.toml with the resource IDs
#   4. Applies D1 migrations
#   5. Sets JWT_SECRET and EMAIL_KEK as Wrangler secrets
#   6. Seeds the first admin user
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
  DB_ID=$(echo "$CREATE_OUT" | grep -oE '"?database_id"?[: =]+"[a-f0-9-]{36}"' | grep -oE '[a-f0-9-]{36}' | head -1)
  [ -z "$DB_ID" ] && DB_ID=$(echo "$CREATE_OUT" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1)
  ok "Created D1: $DB_ID"
else
  ok "D1 exists: $DB_ID"
fi

# --- R2 ---
say "R2 bucket: $R2_NAME"
if wrangler r2 bucket list 2>/dev/null | grep -q "^${R2_NAME}$\|: ${R2_NAME}$\| ${R2_NAME} "; then
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
  KV_ID=$(echo "$CREATE_OUT" | grep -oE 'id = "[a-f0-9]+"' | sed 's/id = "//;s/"//')
  ok "Created KV: $KV_ID"
else
  ok "KV exists: $KV_ID"
fi

# --- Patch wrangler.toml ---
say "Writing resource IDs to wrangler.toml"
node scripts/patch-wrangler.mjs --d1 "$DB_ID" --kv "$KV_ID"
ok "wrangler.toml updated"

# --- Migrations ---
say "Applying D1 migrations"
wrangler d1 migrations apply "$DB_NAME" --remote
ok "Migrations applied"

# --- Secrets ---
say "Setting Wrangler secrets"
JWT_SECRET=$(openssl rand -hex 32)
EMAIL_KEK=$(openssl rand -base64 32)

# Pages projects need `wrangler pages secret put` once the project exists.
# First time, the project may not be created yet, so we use plain secret put
# against the wrangler.toml. After first deploy, you can rotate via dashboard.
echo "$JWT_SECRET" | wrangler secret put JWT_SECRET 2>/dev/null \
  || warn "Could not set JWT_SECRET via 'wrangler secret put'; set it via dashboard after first deploy"
echo "$EMAIL_KEK"  | wrangler secret put EMAIL_KEK 2>/dev/null \
  || warn "Could not set EMAIL_KEK via 'wrangler secret put'; set it via dashboard after first deploy"

# Save locally too so dev can read them via .env if needed
cat > .env.local <<EOF
JWT_SECRET=$JWT_SECRET
EMAIL_KEK=$EMAIL_KEK
EOF
ok "Secrets saved (also written to .env.local for local dev)"

# --- Seed admin ---
say "Seeding admin user"
node scripts/seed-admin.mjs \
  --db "$DB_NAME" \
  --email "$ADMIN_EMAIL" \
  --password "$ADMIN_PASS"
ok "Admin user created: $ADMIN_EMAIL"

# --- Done ---
cat <<EOF

🎉 Setup complete!

  Local dev:    pnpm dev
  Build:        pnpm build
  Deploy:       pnpm deploy

  Sign in to /admin with:
    Email:      $ADMIN_EMAIL
    Password:   (the one you entered)

Next steps:
  1. Run \`pnpm deploy\` to push to Cloudflare Pages
  2. Visit your site at https://$PROJECT_NAME.pages.dev
  3. Configure email under /admin/settings/email
  4. (Paid plan) Deploy the cron worker:
     cd workers/cron && pnpm install && pnpm deploy

EOF
