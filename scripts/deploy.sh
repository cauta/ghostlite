#!/usr/bin/env bash
# Deploys ghostlite to Cloudflare Pages.
#
# Idempotent flow:
#   1. Ensure the Pages project exists (create on first run).
#   2. Ensure JWT_SECRET / EMAIL_KEK exist as Pages secrets (set only if
#      missing — never rotate, since EMAIL_KEK rotation breaks decryption of
#      stored email API keys and JWT_SECRET rotation invalidates sessions).
#   3. Build and deploy.
#
# Source of secret values: .env.local (written by scripts/setup.sh).
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-ghostlite}"
PRODUCTION_BRANCH="${PRODUCTION_BRANCH:-main}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

say()  { printf "\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$*"; }
die()  { printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

command -v wrangler >/dev/null || die "wrangler not found"
command -v jq       >/dev/null || die "jq not found"
wrangler whoami >/dev/null 2>&1 || die "Not logged in. Run: wrangler login"

# --- Load secrets from .env.local ---
[ -f .env.local ] || die ".env.local not found. Run scripts/setup.sh first."
# shellcheck disable=SC1091
set -a; . ./.env.local; set +a
[ -n "${JWT_SECRET:-}" ] || die "JWT_SECRET missing from .env.local"
[ -n "${EMAIL_KEK:-}" ]  || die "EMAIL_KEK missing from .env.local"

# --- 1. Ensure Pages project exists ---
say "Pages project: $PROJECT_NAME"
EXISTS=$(wrangler pages project list 2>/dev/null \
  | jq -r ".[]? | select(.name==\"$PROJECT_NAME\") | .name" 2>/dev/null || echo "")
# `wrangler pages project list` output isn't always JSON across versions; fall
# back to a substring grep when jq finds nothing.
if [ -z "$EXISTS" ]; then
  EXISTS=$(wrangler pages project list 2>/dev/null | grep -E "(^|[[:space:]])${PROJECT_NAME}([[:space:]]|$)" || true)
fi
if [ -z "$EXISTS" ]; then
  wrangler pages project create "$PROJECT_NAME" --production-branch "$PRODUCTION_BRANCH"
  ok "Created Pages project"
else
  ok "Pages project exists"
fi

# --- 2. Ensure secrets exist (set only if missing) ---
say "Syncing Pages secrets"
EXISTING_SECRETS=$(wrangler pages secret list --project-name "$PROJECT_NAME" 2>/dev/null || echo "")

put_if_missing() {
  local name="$1" value="$2"
  if echo "$EXISTING_SECRETS" | grep -q "\"${name}\"\\|^${name}\$\\| ${name} \\| ${name}$"; then
    ok "Secret $name already set (leaving as-is)"
  else
    printf '%s' "$value" | wrangler pages secret put "$name" --project-name "$PROJECT_NAME"
    ok "Set $name"
  fi
}
put_if_missing JWT_SECRET "$JWT_SECRET"
put_if_missing EMAIL_KEK  "$EMAIL_KEK"

# --- 3. Build & deploy ---
say "Building and deploying"
pnpm --filter web pages:build
# Run from apps/web so wrangler reads apps/web/wrangler.toml.
(cd apps/web && wrangler pages deploy .vercel/output/static --project-name "$PROJECT_NAME" --branch "$PRODUCTION_BRANCH")

ok "Deployed to https://${PROJECT_NAME}.pages.dev"
