#!/bin/sh
set -e

# ── Auth Secret ──────────────────────────────────────────────
# AUTH_SECRET is required by Auth.js to sign session cookies.
# If not provided via environment, auto-generate one and persist
# it to the data volume so it survives container restarts.
SECRET_FILE="/data/.auth_secret"

if [ -z "$AUTH_SECRET" ]; then
  if [ -f "$SECRET_FILE" ]; then
    export AUTH_SECRET
    AUTH_SECRET=$(cat "$SECRET_FILE")
  else
    mkdir -p /data
    export AUTH_SECRET
    AUTH_SECRET=$(head -c 33 /dev/urandom | base64)
    printf '%s' "$AUTH_SECRET" > "$SECRET_FILE"
    chmod 600 "$SECRET_FILE"
  fi
fi

# ── Startup Banner ───────────────────────────────────────────
echo "┌─────────────────────────────────────────┐"
echo "│  OpenPentacle Character Creator          │"
echo "├─────────────────────────────────────────┤"
echo "│  Port:       ${PORT:-3000}                         │"
echo "│  Database:   ${DATABASE_URL:-/data/openpentacle.db}   │"

if [ -n "$AUTH_GOOGLE_ID" ]; then
  echo "│  OAuth:      Google ✓                   │"
else
  echo "│  OAuth:      Google ✗                   │"
fi

if [ -n "$AUTH_DISCORD_ID" ]; then
  echo "│  OAuth:      Discord ✓                  │"
else
  echo "│  OAuth:      Discord ✗                  │"
fi

echo "└─────────────────────────────────────────┘"

# ── Start App ────────────────────────────────────────────────
exec node build
