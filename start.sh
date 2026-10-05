#!/bin/sh
set -e

echo "================================================================="
echo "🚀 [NCCT Startup] Running Alembic database migrations..."
echo "================================================================="
alembic upgrade head
echo "✅ [NCCT Startup] Migrations up to date."

echo "================================================================="
echo "🌐 [NCCT Startup] Starting Gunicorn multi-worker server..."
echo "================================================================="
exec gunicorn -c gunicorn_conf.py app.main:app
