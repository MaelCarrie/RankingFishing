#!/usr/bin/env bash
# Déclenche le recalcul des classements (Edge Function recalculate-rankings).
# Usage : npm run recalc-rankings
set -euo pipefail

SUPABASE_URL="https://flhqlktregfwvomzprlo.supabase.co"
# Clé anon (publique) — suffisante pour franchir la passerelle de l'Edge Function.
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaHFsa3RyZWdmd3ZvbXpwcmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNTczMDksImV4cCI6MjA5NDgzMzMwOX0.sgpXg7Woed9NNnw02pWQAn-tWlZKYKLzCLJoWA52zPA"

echo "→ Recalcul des classements..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/recalculate-rankings" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json"
echo
