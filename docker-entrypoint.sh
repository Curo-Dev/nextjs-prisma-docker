#!/bin/sh

set -e

echo "▶ Running Prisma migration..."
pnpm db:deploy

echo "▶ Starting Next.js app..."
pnpm start
