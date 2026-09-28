"""
Production Gunicorn configuration with Uvicorn worker class for FastAPI.
Optimized for high-concurrency containerized environments (Render, Railway, AWS ECS/EC2, Fly.io).
"""
import multiprocessing
import os

# Server socket
bind_port = os.getenv("PORT", "8000")
bind = f"0.0.0.0:{bind_port}"
backlog = 2048

# Worker processes
# For free-tier containers (512MB RAM), default to 2-4 workers to prevent OOM
cores = multiprocessing.cpu_count()
default_workers = max(2, min(cores * 2 + 1, 4))
workers = int(os.getenv("WEB_CONCURRENCY", os.getenv("WORKERS", str(default_workers))))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000

# Timeout & lifecycle
timeout = int(os.getenv("TIMEOUT", "120"))
keepalive = 5
graceful_timeout = 30
max_requests = 1000
max_requests_jitter = 50

# Logging
loglevel = os.getenv("LOG_LEVEL", "info")
accesslog = "-"  # stdout
errorlog = "-"   # stderr
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)sµs'

# Process naming
proc_name = "ncct-fastapi-backend"
