#!/usr/bin/env bash
set -euo pipefail

DB_URL="${1:-postgresql://chip:chip@localhost:5432/chipdb}"

echo "Applying migrations..."
for f in db/migrations/*.sql; do
  echo " - $f"
  psql "$DB_URL" -f "$f"
done
