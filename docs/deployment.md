# Production Deployment Guide: NCCT Skill Intelligence Ecosystem

This guide provides end-to-end instructions for deploying the **NCCT Cooperative Skill Intelligence Ecosystem** for judges, mentors, and remote evaluators.

---

## 1. System Architecture & Components

```mermaid
flowchart TD
    Client["Browser / Remote Judge / Mentor"]
    Frontend["Next.js 15 Frontend\n(Docker Standalone / Port 3000)"]
    Backend["FastAPI Backend\n(Gunicorn 4x Uvicorn Workers / Port 8000)"]
    Postgres[("Managed PostgreSQL Database\n(Render / Railway / Supabase)")]
    AIService["Google Gemini 1.5 Flash\n(Career & Skills Guidance)"]

    Client -->|HTTPS :3000| Frontend
    Frontend -->|REST API :8000| Backend
    Backend -->|SQLAlchemy Connection Pool| Postgres
    Backend -->|JSON RPC| AIService
```

| Component | Technology | Production Container / Process |
| :--- | :--- | :--- |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2.0 | Gunicorn with `UvicornWorker` processes (`backend/Dockerfile`) |
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS | Node 20 Alpine Standalone Server (`frontend/Dockerfile`) |
| **Database** | PostgreSQL 15+ | Cloud Managed DB (Render / Railway / Supabase / Neon) |
| **Health Check** | `/api/health` | Verifies service state + live DB connection ping |

---

## 2. Environment Variables Specification

Ensure these variables are configured in your deployment platform:

### Backend Service Variables
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URI | `postgresql://user:pass@host:5432/ncct_prod` |
| `SECRET_KEY` | JWT signing secret | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `CORS_ORIGINS` | Comma-separated allowed frontend domains | `https://ncct-frontend.onrender.com,https://localhost:3000` |
| `ENVIRONMENT` | Environment flag | `production` |
| `WEB_CONCURRENCY` | Number of Gunicorn worker processes | `2` (free tier) or `4` (standard) |
| `TIMEOUT` | Request timeout for AI generation (seconds) | `120` |
| `GEMINI_API_KEY` | Gemini API Key for chatbot assistant | `AIzaSy...` |
| `PORT` | Listening port for web server | `8000` |

### Frontend Service Variables
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Public HTTPS URL of the deployed FastAPI backend | `https://ncct-backend.onrender.com` |
| `NODE_ENV` | Node environment | `production` |
| `PORT` | Listening port | `3000` |

---

## 3. Frontend Deployment to Vercel & Netlify

### Option A1: Vercel Deployment (Recommended for Next.js)

1. **Via Vercel Web Dashboard (1-Click)**:
   - Go to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
   - Import your GitHub repository.
   - Set **Root Directory** to `frontend`.
   - In **Environment Variables**, add:
     - `NEXT_PUBLIC_API_URL`: Your deployed backend URL (e.g. `https://really-duncan-dried-cute.trycloudflare.com` or `https://ncct-backend.onrender.com`).
   - Click **Deploy**. Vercel will detect [`frontend/vercel.json`](file:///C:/Users/AnbuRithu/.gemini/antigravity-ide/scratch/ncct-auth/frontend/vercel.json) and compile Next.js in ~60 seconds.

2. **Via Vercel CLI**:
   ```bash
   cd frontend
   npx vercel
   # When prompted for environment variables:
   # Set NEXT_PUBLIC_API_URL = <your-deployed-backend-url>
   npx vercel --prod
   ```

### Option A2: Netlify Deployment

1. **Via Netlify Web Dashboard**:
   - Go to [app.netlify.com](https://app.netlify.com) and click **Add new site** -> **Import an existing project**.
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/.next`
   - Set environment variable: `NEXT_PUBLIC_API_URL = <your-deployed-backend-url>`.
   - Click **Deploy Site** (Netlify will use [`frontend/netlify.toml`](file:///C:/Users/AnbuRithu/.gemini/antigravity-ide/scratch/ncct-auth/frontend/netlify.toml)).

---

## 4. Option B: Render.com Deployment (Free-Tier Friendly)

### Method 1: Automated 1-Click Blueprint (Recommended)
1. Fork or push this repository to GitHub.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository.
5. Render detects [`render.yaml`](file:///C:/Users/AnbuRithu/.gemini/antigravity-ide/scratch/ncct-auth/render.yaml) and automatically provisions:
   - Managed PostgreSQL database (`ncct-postgres`)
   - FastAPI Backend service with healthcheck on `/api/health`
   - Next.js Frontend service
6. Click **Apply**.
7. Once deployed, update the `CORS_ORIGINS` and `NEXT_PUBLIC_API_URL` with your actual generated `*.onrender.com` subdomains.

---

### Method 2: Manual Setup on Render

#### Step 1: Create Free PostgreSQL Database
1. Go to **Dashboard** -> **New +** -> **PostgreSQL**.
2. **Name**: `ncct-db`
3. **Database**: `ncct_prod`
4. **User**: `ncct_user`
5. **Region**: Oregon (or closest to you)
6. **Plan**: Free
7. Click **Create Database**.
8. Copy the **Internal Database URL** (for backend running on Render) or **External Database URL** (for remote scripts/migrations).

#### Step 2: Deploy Backend Web Service
1. Click **New +** -> **Web Service**.
2. Connect your repository.
3. Select **Docker** environment.
   - **Root Directory**: `backend`
   - **Dockerfile Path**: `Dockerfile` (or `backend/Dockerfile` if root is repo root)
4. Set Environment Variables:
   ```env
   DATABASE_URL = <paste Internal Database URL from Step 1>
   SECRET_KEY = <generate random string>
   CORS_ORIGINS = https://ncct-frontend.onrender.com
   ENVIRONMENT = production
   WEB_CONCURRENCY = 2
   GEMINI_API_KEY = AIzaSyDemoNCCTAssistantKey2026Secure
   PORT = 8000
   ```
5. **Health Check Path**: `/api/health`
6. Click **Deploy Web Service**.
7. Note down your backend URL: `https://ncct-backend.onrender.com`.

#### Step 3: Run Database Seed Script
To populate the 4 demo accounts and Ravi Kumar's journey data into the cloud PostgreSQL:
From your local terminal, run:
```bash
# Point DATABASE_URL to Render's External Connection URL
$env:DATABASE_URL="postgresql://ncct_user:<PASSWORD>@<EXTERNAL_HOST>.render.com/ncct_prod"
python -m scripts.demo_seed
```
*(All 4 demo logins and verified sample credentials will be populated in ~3 seconds).*

#### Step 4: Deploy Frontend Web Service
1. Click **New +** -> **Web Service**.
2. Connect your repository.
3. Select **Docker** environment:
   - **Root Directory**: `frontend`
   - **Dockerfile Path**: `Dockerfile`
4. In **Docker Build Args** or **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL = https://ncct-backend.onrender.com
   ```
5. Click **Deploy Web Service**.

---

## 4. Option B: Railway.app Deployment

1. Go to [Railway.app](https://railway.app) and click **New Project**.
2. Select **Provision PostgreSQL**.
3. Click **Add Service** -> **GitHub Repo** -> select the repository.
   - Set **Root Directory** to `backend`.
   - Railway will detect `backend/Dockerfile` and deploy using Gunicorn.
   - Under **Variables**, add:
     - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (Railway references it automatically)
     - `CORS_ORIGINS`: `https://frontend.railway.app`
     - `ENVIRONMENT`: `production`
4. Click **Add Service** -> **GitHub Repo** -> select `frontend`.
   - Set **Root Directory** to `frontend`.
   - Add variable: `NEXT_PUBLIC_API_URL = https://<your-backend>.railway.app`.
5. Under Railway Settings, generate public domains for both services.

---

## 5. Option C: Supabase Managed Postgres + Docker Deployment

If you prefer using [Supabase](https://supabase.com) as the managed PostgreSQL provider:
1. Create a free project on Supabase.
2. In **Project Settings** -> **Database** -> **Connection string**, select **URI (Transaction pooler or Direct)**.
   Format:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
3. Pass this URI as `DATABASE_URL` in your `.env.production` or cloud service provider.
4. Run the seed script:
   ```bash
   DATABASE_URL="postgresql://postgres.[ref]:[password]@..." python -m scripts.demo_seed
   ```

---

## 6. Option D: Docker Compose on VPS / AWS EC2 Free Tier

To deploy the entire production stack on an Ubuntu / Debian VPS (e.g. AWS EC2 `t3.micro` / `t4g.small` free tier, Lightsail, or DigitalOcean):

### Step 1: Install Docker & Docker Compose
```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### Step 2: Clone Repository & Configure Environment
```bash
git clone https://github.com/<your-org>/ncct-auth.git /opt/ncct
cd /opt/ncct

cp .env.production.example .env.production
nano .env.production
```
Fill in your `DATABASE_URL` (or leave it pointing to SQLite or the local PostgreSQL profile).

### Step 3: Build and Run Services
```bash
# Build and launch backend and frontend
docker compose -f docker-compose.prod.yml up -d --build

# Or if you want the local PostgreSQL container included:
docker compose -f docker-compose.prod.yml --profile with-local-db up -d --build
```

### Step 4: Seed Demo Data in Container
```bash
docker exec -it ncct_backend_prod python -m scripts.demo_seed
```

---

## 7. Verifying Deployment (Definition of Done)

Once deployed, verify backend health using `curl` or any browser:

### 1. Test Backend Health Endpoint
```bash
curl -i https://<your-backend-url>/api/health
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

### 2. Test Root Endpoint
```bash
curl -i https://<your-backend-url>/
```
```json
{
  "service": "NCCT Ecosystem Auth Service",
  "status": "operational",
  "docs": "/docs",
  "health": "/api/health",
  "roles_supported": ["TRAINEE", "TRAINER", "ADMIN", "EMPLOYER"],
  "environment": "production"
}
```

### 3. Verify CORS Access
From browser dev tools console on your deployed frontend domain:
```javascript
fetch("https://<your-backend-url>/api/health")
  .then(res => res.json())
  .then(console.log);
```
Should output `{status: "ok", database: "connected", ...}` without CORS warnings.

---

## 8. Demo Credentials for Judges

After seeding the database, test the 4 stakeholder login flows:

| Role | Email | Password | Primary Feature to Show |
| :--- | :--- | :--- | :--- |
| **Trainee** | `demo.trainee@ncct.gov.in` | `Demo@123` | Ravi Kumar's profile, skill passport, radar chart, verified certificate |
| **Trainer** | `demo.trainer@ncct.gov.in` | `Demo@123` | Class roster, QR attendance, assessment grading |
| **Employer**| `demo.employer@ncct.gov.in` | `Demo@123` | Job postings, AI candidate skill matching (Ravi 91% match), verified hiring |
| **Admin**   | `demo.admin@ncct.gov.in` | `Demo@123` | Ecosystem intelligence dashboard, placement rates, institute metrics |

---

## 9. Production Maintenance & Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `postgres://` connection string rejected by SQLAlchemy | Render/Supabase legacy URI prefix | Handled automatically by `app/database.py` (normalizes `postgres://` to `postgresql://`). |
| Render Free-Tier Sleep / Cold Start | Instance spins down after 15 mins of inactivity | First request takes ~30 seconds to wake up. Use a free uptime monitor (e.g. UptimeRobot or Cron-job.org) pinging `/api/health` every 10 minutes to prevent sleep. |
| CORS Preflight Error | Backend `CORS_ORIGINS` does not match the frontend exact protocol/domain | Update `CORS_ORIGINS` in backend environment variables to include the frontend HTTPS URL without trailing slashes. |
| Database connection pool timeout | Cloud PostgreSQL dropped idle TCP connections | Handled automatically by `pool_pre_ping=True` and `pool_recycle=1800` in `app/database.py`. |
