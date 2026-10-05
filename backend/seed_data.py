import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import engine, Base
from app import models  # ensure all models registered
Base.metadata.create_all(bind=engine)

# Ensure columns exist on SQLite certificates and assessment_results table
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
            
            res_cols = [col[1] for col in c.execute("PRAGMA table_info(assessment_results)").fetchall()]
            if "is_current" not in res_cols:
                c.execute("ALTER TABLE assessment_results ADD COLUMN is_current BOOLEAN DEFAULT 1")
            raw_conn.commit()
    except Exception as e:
        print("Migration note:", e)

from scripts.seed_data import seed_all
from scripts.demo_seed import seed_demo_accounts

if __name__ == "__main__":
    print("Executing NCCT master seed pipeline...")
    seed_all()
    seed_demo_accounts()
    print("Master seed pipeline completed successfully.")
