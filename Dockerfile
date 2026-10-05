# ==============================================================================
# NCCT Ecosystem - Production FastAPI Backend Dockerfile
# Optimized for Railway, Render, Docker Compose, and Containerized Cloud Deployments
# Multi-stage build based on python:3.11-slim with Gunicorn + Uvicorn workers
# ==============================================================================

# Stage 1: Build stage for compiling dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies for compiled packages (psycopg2, bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency specification and install to user path
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ==============================================================================
# Stage 2: Lean Production Runtime Stage
# ==============================================================================
FROM python:3.11-slim AS runner

WORKDIR /app

# Install minimal runtime dependencies: libpq5 for PostgreSQL, curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built Python packages from builder stage
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Python runtime configuration
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    ENVIRONMENT=production

# Copy application source code
COPY . .

# Ensure storage directories exist
RUN mkdir -p uploads static/uploads

# Non-root user for cloud security standards
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --gid 1001 appuser && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Docker healthcheck endpoint verifying server + DB connectivity
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start command: runs alembic migrations automatically, then starts Gunicorn wrapping Uvicorn workers
# Supports Railway dynamic $PORT injection with fallback to 8000
CMD ["sh", "-c", "alembic upgrade head && gunicorn -k uvicorn.workers.UvicornWorker -c gunicorn_conf.py -b 0.0.0.0:${PORT:-8000} app.main:app"]
