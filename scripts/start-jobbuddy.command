#!/bin/zsh
set -e

cd "$(dirname "$0")/.."

PORT="${JOBBUDDY_PORT:-4173}"
URL="http://127.0.0.1:${PORT}/"

echo "Building JobBuddy..."
npm run build

echo "Starting JobBuddy at ${URL}"
echo "Keep this window open while using the app."

(sleep 1 && open "${URL}") &
npm run local:serve -- --port "${PORT}" --strictPort
