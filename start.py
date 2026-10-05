"""
NCCT Production Startup Script
1. Runs Alembic migrations ('alembic upgrade head') automatically
2. Starts Gunicorn / Uvicorn ASGI server
"""
import os
import sys
import subprocess
from alembic.config import Config
from alembic import command

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def run_migrations():
    print("=" * 65)
    print("[NCCT Startup] Running database migrations (alembic upgrade head)...")
    print("=" * 65)
    try:
        alembic_ini_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alembic.ini")
        alembic_cfg = Config(alembic_ini_path)
        command.upgrade(alembic_cfg, "head")
        print("[NCCT Startup] Database migrations completed successfully.")
    except Exception as e:
        print(f"[NCCT Startup] Alembic programmatic migration warning: {e}", file=sys.stderr)
        try:
            subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
            print("[NCCT Startup] Database migrations completed via CLI fallback.")
        except Exception as cli_err:
            print(f"[NCCT Startup] CLI migration error: {cli_err}", file=sys.stderr)

def start_server():
    print("=" * 65)
    print("[NCCT Startup] Launching application server...")
    print("=" * 65)
    port = os.getenv("PORT", "8000")
    
    # On Windows or when gunicorn is unavailable, run uvicorn
    is_windows = sys.platform.startswith("win")
    has_gunicorn = False
    try:
        import gunicorn
        has_gunicorn = True
    except ImportError:
        pass

    if has_gunicorn and not is_windows:
        cmd = ["gunicorn", "-c", "gunicorn_conf.py", "app.main:app"]
    else:
        cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(port)]
        
    print(f"Executing: {' '.join(cmd)}")
    sys.stdout.flush()
    if hasattr(os, "execvp"):
        os.execvp(cmd[0], cmd)
    else:
        subprocess.run(cmd)

if __name__ == "__main__":
    run_migrations()
    start_server()
