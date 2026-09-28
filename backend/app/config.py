import os

class Settings:
    PROJECT_NAME: str = "NCCT Ecosystem Auth Service"
    
    # Security & JWT Secrets (reads from JWT_SECRET_KEY or legacy SECRET_KEY)
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "ncct-super-secret-jwt-key-2026-production-ready"))
    JWT_REFRESH_SECRET_KEY: str = os.getenv("JWT_REFRESH_SECRET_KEY", os.getenv("SECRET_KEY", "ncct-super-secret-jwt-refresh-key-2026"))
    SECRET_KEY: str = JWT_SECRET_KEY
    
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ncct_auth.db")
    DB_SSL_MODE: str = os.getenv("DB_SSL_MODE", "require" if os.getenv("ENVIRONMENT") == "production" else "")
    
    # Database connection pool settings (for managed PostgreSQL / Neon)
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    
    # External APIs
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "AIzaSyDemoNCCTAssistantKey2026Secure")
    
    # CORS & Deployment configuration
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Cloudinary File Storage Configuration
    CLOUDINARY_URL: str = os.getenv("CLOUDINARY_URL", "")

settings = Settings()

