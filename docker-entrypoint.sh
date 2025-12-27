#!/bin/sh
set -e

# Sync dependencies if package.json changed (node_modules is a named volume)
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "Installing dependencies..."
  npm install
elif ! cmp -s package-lock.json node_modules/.package-lock.json 2>/dev/null; then
  echo "package-lock.json changed, syncing dependencies..."
  npm install
  cp package-lock.json node_modules/.package-lock.json
fi

exec "$@"
