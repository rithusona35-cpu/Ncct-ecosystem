from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

db_url = settings.DATABASE_URL.strip()

# 1. Normalize postgres:// to postgresql:// (Required by SQLAlchemy 2.0)
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {}
engine_kwargs = {"pool_pre_ping": True}

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    # 2. Managed PostgreSQL / Neon SSL mode handling
    # Neon and cloud PostgreSQL mandate sslmode=require
    is_cloud_postgres = (
        settings.ENVIRONMENT == "production"
        or "neon.tech" in db_url
        or ".render.com" in db_url
        or ".supabase.co" in db_url
        or settings.DB_SSL_MODE == "require"
    )

    if is_cloud_postgres:
        if "sslmode=" not in db_url:
            separator = "&" if "?" in db_url else "?"
            db_url = f"{db_url}{separator}sslmode=require"
            connect_args["sslmode"] = "require"

    # Connection pooling parameters for production database
    engine_kwargs.update({
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_recycle": 1800,  # 30-minute recycle to avoid cloud TCP connection dropouts
    })

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **engine_kwargs
)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
