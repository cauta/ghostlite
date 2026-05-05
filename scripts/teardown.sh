#!/usr/bin/env bash
# Tears down all Cloudflare resources created by setup.sh and resets the repo
# to its pre-setup state (wrangler.toml placeholders, no local .wrangler cache,
# no .env.local). Destructive — confirm before running.
set -e

PROJECT_NAME="${PROJECT_NAME:-ghostlite}"
DB_NAME="${DB_NAME:-${PROJECT_NAME}-db}"
R2_NAME="${R2_NAME:-${PROJECT_NAME}-content}"
KV_NAME="${KV_NAME:-${PROJECT_NAME}-cache}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "This will permanently delete:"
echo "  - D1 database:    $DB_NAME"
echo "  - R2 bucket:      $R2_NAME (and all objects)"
echo "  - KV namespace:   $KV_NAME"
echo "  - Local state:    .wrangler/, apps/web/.wrangler/, .env.local"
echo "  - Generated:      apps/web/wrangler.toml, workers/cron/wrangler.toml"
echo
read -p "Type DELETE to confirm: " CONFIRM
[ "$CONFIRM" = "DELETE" ] || { echo "Aborted."; exit 1; }

# --- D1 ---
wrangler d1 delete "$DB_NAME" -y 2>/dev/null || echo "  (D1 not found or already deleted)"

# --- R2: must empty before bucket delete ---
echo "Emptying R2 bucket..."
KEYS=$(wrangler r2 object list "$R2_NAME" --json 2>/dev/null | jq -r '.[].key' || true)
if [ -n "$KEYS" ]; then
  echo "$KEYS" | while read -r k; do
    [ -n "$k" ] && wrangler r2 object delete "$R2_NAME/$k" 2>/dev/null || true
  done
fi
wrangler r2 bucket delete "$R2_NAME" 2>/dev/null || echo "  (R2 not found or already deleted)"

# --- KV ---
KV_ID=$(wrangler kv namespace list 2>/dev/null | jq -r ".[] | select(.title==\"$KV_NAME\") | .id" 2>/dev/null || echo "")
if [ -n "$KV_ID" ] && [ "$KV_ID" != "null" ]; then
  wrangler kv namespace delete --namespace-id "$KV_ID" 2>/dev/null || true
fi

# --- Remove generated wrangler.toml files (templates remain in git) ---
echo "Removing generated wrangler.toml files..."
rm -f "$REPO_ROOT/apps/web/wrangler.toml" "$REPO_ROOT/workers/cron/wrangler.toml"

# --- Local caches & generated secrets ---
echo "Removing local state..."
rm -rf "$REPO_ROOT/.wrangler" "$REPO_ROOT/apps/web/.wrangler" "$REPO_ROOT/.env.local"

# --- Wait for D1 deletion to propagate so an immediate re-setup doesn't see
#     the old UUID via `wrangler d1 list`. ---
echo "Waiting for D1 deletion to propagate..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  STILL=$(wrangler d1 list --json 2>/dev/null | jq -r ".[] | select(.name==\"$DB_NAME\") | .uuid" 2>/dev/null || echo "")
  [ -z "$STILL" ] && break
  sleep 2
done

echo
echo "Resources removed and repo reset to defaults."
echo "Note: the Cloudflare Pages project itself must be deleted from the dashboard."
