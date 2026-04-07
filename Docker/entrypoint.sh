#!/bin/sh
set -e

echo "Running database migrations..."
packages/db/node_modules/.bin/prisma migrate deploy --schema packages/db/prisma/schema.prisma

echo "Seeding languages..."
bun packages/db/src/seedLanguage.ts || echo "Language seeding failed"

echo "Seeding problems..."
bun packages/db/src/seedProblem.ts || echo "Problem seeding failed"

echo "Starting application..."
exec bun dist/index.js
