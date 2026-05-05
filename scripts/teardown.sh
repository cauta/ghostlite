#!/usr/bin/env bash
# Tears down all Cloudflare resources created by setup.sh.
# Useful when iterating; destructive otherwise.
set -e

PROJECT_NAME="${PROJECT_NAME:-ghostlite}"
DB_NAME="${DB_NAME:-${PROJECT_NAME}-db}"
R2_NAME="${R2_NAME:-${PROJECT_NAME}-content}"
KV_NAME="${KV_NAME:-${PROJECT_NAME}-cache}"

echo "This will permanently delete:"
echo "  - D1 database:   $DB_NAME"
echo "  - R2 bucket:     $R2_NAME (and all objects)"
echo "  - KV namespace:  $KV_NAME"
echo
read -p "Type DELETE to confirm: " CONFIRM
[ "$CONFIRM" = "DELETE" ] || { echo "Aborted."; exit 1; }

# D1
wrangler d1 delete "$DB_NAME" --skip-confirmation 2>/dev/null || echo "  (D1 not found or already deleted)"

# R2: must empty first
echo "Emptying R2 bucket..."
KEYS=$(wrangler r2 object list "$R2_NAME" --json 2>/dev/null | jq -r '.[].key' || true)
if [ -n "$KEYS" ]; then
  echo "$KEYS" | while read -r k; do
    [ -n "$k" ] && wrangler r2 object delete "$R2_NAME/$k" 2>/dev/null || true
  done
fi
wrangler r2 bucket delete "$R2_NAME" 2>/dev/null || echo "  (R2 not found or already deleted)"

# KV
KV_ID=$(wrangler kv namespace list 2>/dev/null | jq -r ".[] | select(.title==\"$KV_NAME\") | .id" 2>/dev/null || echo "")
if [ -n "$KV_ID" ] && [ "$KV_ID" != "null" ]; then
  wrangler kv namespace delete --namespace-id "$KV_ID" 2>/dev/null || true
fi

echo
echo "Resources removed."
echo "Note: the Cloudflare Pages project itself must be deleted from the dashboard."
