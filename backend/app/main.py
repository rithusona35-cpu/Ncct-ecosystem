from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
import os
from fastapi.staticfiles import StaticFiles
from app.routers import auth, protected, trainee, trainer, courses, lms, attendance, assessment, skill_gap, skill_passport, certificates, employer, admin, chatbot
import sqlite3

# Create tables in the database
Base.metadata.create_all(bind=engine)

# Ensure columns exist on SQLite certificates table (only runs on SQLite)
if engine.name == "sqlite":
    try:
        with engine.connect() as connection:
            raw_conn = connection.connection
            c = raw_conn.cursor()
            cols = [col[1] for col in c.execute("PRAGMA table_info(certificates)").fetchall()]
            add_cols = [
                ("certificate_id", "VARCHAR(100)"),
                ("course_id", "INTEGER"),
                ("institution_id", "INTEGER"),
                ("completion_date", "DATETIME"),
                ("assessment_status", "VARCHAR(50) DEFAULT 'PASSED'"),
                ("issued_by", "VARCHAR(255) DEFAULT 'National Council for Cooperative Training (NCCT)'"),
                ("is_verified", "BOOLEAN DEFAULT 1")
            ]
            for col_name, col_def in add_cols:
                if col_name not in cols:
                    c.execute(f"ALTER TABLE certificates ADD COLUMN {col_name} {col_def}")
            c.execute("UPDATE certificates SET certificate_id = certificate_code WHERE certificate_id IS NULL")
            c.execute("UPDATE certificates SET course_id = programme_id WHERE course_id IS NULL")
            c.execute("UPDATE certificates SET completion_date = issued_date WHERE completion_date IS NULL")
            # Ensure is_current column exists on assessment_results table
            res_cols = [col[1] for col in c.execute("PRAGMA table_info(assessment_results)").fetchall()]
            if "is_current" not in res_cols:
                c.execute("ALTER TABLE assessment_results ADD COLUMN is_current BOOLEAN DEFAULT 1")
            raw_conn.commit()
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="NCCT Ecosystem Authentication, RBAC, and Training Programme Management API",
    version="1.0.0"
)

# Static file serving for course uploads (PDFs, materials)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS configuration supporting deployed frontend domains & dev environments
raw_cors = settings.CORS_ORIGINS.strip()
if raw_cors == "*":
    # In development or open mode, allow any origin with credentials via regex
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    origins = [orig.strip() for orig in raw_cors.split(",") if orig.strip()]
    for def_origin in ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"]:
        if def_origin not in origins:
            origins.append(def_origin)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router)
app.include_router(protected.router)
app.include_router(trainee.router)
app.include_router(trainer.router)
app.include_router(trainer.public_router)
app.include_router(courses.router)
app.include_router(lms.router)
app.include_router(attendance.router)
app.include_router(assessment.router)
app.include_router(assessment.router_plural)
app.include_router(assessment.skills_router)
app.include_router(skill_gap.router)
app.include_router(skill_passport.router)
app.include_router(certificates.router)
app.include_router(employer.router)
app.include_router(admin.router)
app.include_router(chatbot.router)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "status": "operational",
        "docs": "/docs",
        "health": "/api/health",
        "roles_supported": ["TRAINEE", "TRAINER", "ADMIN", "EMPLOYER"],
        "environment": settings.ENVIRONMENT
    }

@app.get("/api/health")
@app.get("/health")
def health_check(response: Response):
    db_status = "connected"
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    
    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "database": db_status,
        "environment": settings.ENVIRONMENT
    }

