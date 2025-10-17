#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="$SCRIPT_DIR/reset.sql"

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "Schema file not found: $SCHEMA_FILE" >&2
  exit 1
fi

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  cat >&2 <<'MSG'
Error: DATABASE_URL (or SUPABASE_DB_URL) environment variable is not set.
Provide a PostgreSQL connection string for your Supabase project, for example:
  export DATABASE_URL="postgres://postgres:password@db.supabase.co:5432/postgres"
MSG
  exit 1
fi

psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"

echo "Database reset and schema applied successfully."
