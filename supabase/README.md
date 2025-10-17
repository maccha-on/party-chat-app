# Supabase database reset

This directory contains helper scripts for recreating the Supabase database schema
used by the party chat application.

## Files

- `reset.sql` – Drops the existing tables and recreates the schema required by the app.
- `reset.sh` – Convenience script that applies `reset.sql` to the database specified by
  the `DATABASE_URL` (or `SUPABASE_DB_URL`) environment variable.

## Usage

```bash
export DATABASE_URL="postgres://postgres:password@db.supabase.co:5432/postgres"
./supabase/reset.sh
```

The script will stop immediately if the SQL encounters an error, ensuring the
schema is only applied when every statement succeeds.
