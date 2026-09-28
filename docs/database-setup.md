# Production Database Setup Guide: Neon Serverless PostgreSQL
## NCCT Cooperative Skill Intelligence Ecosystem

This guide provides step-by-step instructions for provisioning, configuring, and migrating to a managed **Neon Serverless PostgreSQL** database for production deployment.

---

## 1. Why Neon PostgreSQL for NCCT?

[Neon](https://neon.tech) is a modern, serverless PostgreSQL service designed for cloud-native applications:
- **Free Tier**: 0.5 GB storage, autoscaling compute, and branchable databases.
- **Strict SSL Security**: Mandates `sslmode=require` for end-to-end encryption in transit.
- **Connection Pooling**: Integrated PgBouncer connection pooling for high-concurrency workloads.
- **Zero Cold-Start Penalties**: Instant wake-up with serverless scaling.

---

## 2. Step 1: Provision a Neon PostgreSQL Database

1. Sign up or log in to the [Neon Console](https://console.neon.tech).
2. Click **Create Project**:
   - **Project Name**: `ncct-ecosystem-prod`
   - **Postgres Version**: `PostgreSQL 16` (or `15`)
   - **Region**: Select the closest region (e.g., `AWS us-east-2`, `AWS eu-central-1`, or `AWS ap-southeast-1`).
3. Once created, navigate to **Dashboard** -> **Connection Details**.
4. In the connection string dropdown:
   - Select **Pooled connection** (recommended for production multi-worker servers) or **Direct connection**.
   - Copy the connection string. It will look like:
     ```
     postgresql://neondb_owner:npg_aB1cDeF2GhIj@ep-solitary-brook-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

---

## 3. Step 2: Configure Environment Variables

Create or update your production `.env` (or `.env.production`):

```bash
# In backend/.env or your cloud environment variables:
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-solitary-brook-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
ENVIRONMENT=production
DB_SSL_MODE=require

# Security Secrets
JWT_SECRET_KEY=your-secure-random-access-token-secret-key-2026
JWT_REFRESH_SECRET_KEY=your-secure-random-refresh-token-secret-key-2026

# External APIs & CORS
GEMINI_API_KEY=AIzaSy...
CORS_ORIGINS=https://ncct-frontend.vercel.app,http://localhost:3000
```

> **Automated URL Handling**:
> The backend automatically detects:
> 1. Legacy `postgres://` prefixes and converts them to `postgresql://` (required by SQLAlchemy 2.0).
> 2. Automatically appends `sslmode=require` and sets `connect_args["sslmode"] = "require"` whenever Neon or production mode is detected.

---

## 4. Step 3: Run Database Migrations

You can run migrations either automatically (recommended) or manually:

### Method A: Automated Migration on Startup (Recommended)
The production container and startup script execute `alembic upgrade head` automatically before launching the server:

```bash
cd backend
python start.py
```

*Output:*
```
=================================================================
🚀 [NCCT Startup] Running database migrations (alembic upgrade head)...
=================================================================
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade -> b4a8621ec456, create_job_postings_table
INFO  [alembic.runtime.migration] Running upgrade b4a8621ec456 -> e5c21980ab12, create_employment_records_and_feedback
✅ [NCCT Startup] Database migrations completed successfully.
=================================================================
🌐 [NCCT Startup] Launching application server...
=================================================================
```

### Method B: Manual CLI Migration
To apply migrations manually from your local terminal or CI/CD pipeline:

```bash
cd backend

# Point to Neon DB
$env:DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Check current revision
python -m alembic current

# Run migrations to head
python -m alembic upgrade head
```

---

## 5. Step 4: Populate Seed Data into Neon DB

Once migrations have created all tables, seed the database with the full 4-role demo data (Ravi Kumar's completed course, assessments, skill gaps, verified certificate, and employer job matching):

```bash
cd backend
$env:DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
python -m scripts.demo_seed
```

*Expected output:*
```
🌱 Seeding initial demo roles and accounts...
✅ Seed completed: 4 demo accounts, Ravi Kumar journey, and Apex Bank job postings active.
🎉 DEMO CREDENTIALS READY FOR LIVE STAGE PRESENTATION
```

---

## 6. Verification Checklist

To confirm Neon PostgreSQL is fully operational:

### 1. Test Health Endpoint
```bash
curl -i http://localhost:8000/api/health
```
**Expected Response (HTTP 200 OK):**
```json
{
  "status": "ok",
  "service": "NCCT Ecosystem Auth Service",
  "version": "1.0.0",
  "database": "connected",
  "environment": "production"
}
```

### 2. Verify Tables in Neon Console
In the [Neon Dashboard](https://console.neon.tech) -> **Tables**, verify the following 12 tables exist:
1. `users`
2. `institutions`
3. `training_programmes`
4. `modules`
5. `enrollments`
6. `attendance`
7. `skills`
8. `job_roles`
9. `assessments`
10. `certificates`
11. `job_postings`
12. `employment_records`
13. `employer_feedback`
14. `alembic_version`

---

## 7. Troubleshooting & Gotchas

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `sqlalchemy.exc.NoSuchModuleError: Can't load plugin: sqlalchemy.dialects:postgres` | Neon connection string starts with `postgres://` | Handled automatically by `backend/app/database.py` (normalizes to `postgresql://`). |
| `psycopg2.OperationalError: server closed the connection unexpectedly` | Neon serverless compute suspended after 5 minutes of inactivity | Handled automatically by `pool_pre_ping=True` and `pool_recycle=1800` in `app/database.py`. |
| `psycopg2.OperationalError: no pg_hba.conf entry for host ... SSL off` | Connection URL missing SSL parameter | Handled automatically: `app/database.py` enforces `sslmode=require` for Neon and production. |
| `psycopg2.errors.UndefinedTable: relation "users" does not exist` | Running incremental migration before base tables | Handled automatically: `backend/alembic/env.py` calls `Base.metadata.create_all(bind=connection)` before running incremental migrations. |
