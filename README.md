# 🛒 Amazon Product Data Automation

A production-ready SaaS web application for collecting, managing, and exporting Amazon product data. Built with a modern full-stack architecture and containerized with Docker.

![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Next.js%20%7C%20PostgreSQL%20%7C%20Celery%20%7C%20Playwright-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🏗️ Architecture

```
┌─────────────────┐     HTTP      ┌─────────────────────┐
│  Next.js 15     │ ◄──────────► │  FastAPI (Port 8000) │
│  (Port 3000)    │              │  Backend API          │
└─────────────────┘              └──────────┬────────────┘
                                            │
                              ┌─────────────▼────────────┐
                              │  PostgreSQL (Port 5432)   │
                              │  Jobs, Products, Exports  │
                              └──────────────────────────┘
                                            │
                              ┌─────────────▼────────────┐
                              │  Redis (Port 6379)         │
                              │  Celery Broker + Cache    │
                              └──────────────────────────┘
                                            │
                              ┌─────────────▼────────────┐
                              │  Celery Worker             │
                              │  Playwright Scraper        │
                              └──────────────────────────┘
```

---

## 🚀 Quick Start (Docker)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
- Ports 3000, 8000, 5432, 6379 available

### 1. Start All Services

```bash
docker compose up --build
```

This will:
- Build the backend image (with Playwright browsers pre-installed)
- Build the frontend image (Next.js dev server)
- Start PostgreSQL, Redis, FastAPI backend, Celery worker, and Next.js

### 2. Create Database Tables

In a new terminal, run:

```bash
docker exec amazon_backend alembic upgrade head
```

### 3. Create Your First User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "StrongPass123"}'
```

### 4. Open the App

Visit **http://localhost:3000** and log in with the credentials you just created.

---

## 📋 Feature Overview

| Feature | Description |
|---------|-------------|
| 🔐 **JWT Auth** | Secure login/register with bcrypt password hashing |
| 📊 **Dashboard** | Real-time analytics: total jobs, products, exports, active jobs |
| 🤖 **Scraper** | Upload Amazon URLs, launch Playwright-based scraping jobs |
| 📦 **Products DB** | Filterable, searchable product database with grid/table views |
| 📜 **Jobs History** | Review past jobs, view logs, retry failed URLs |
| 💾 **CSV/Excel Export** | Download scraped products as CSV or Excel |
| ⚙️ **Settings** | UI preferences for scraper configuration |

---

## 🗂️ Project Structure

```
Amazon Product Data Automation/
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI routers (auth, jobs, products, exports)
│   │   ├── core/              # Config, database, security
│   │   ├── models.py          # SQLAlchemy ORM models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── services/scraper/  # Playwright + parser + exporter
│   │   ├── tasks/             # Celery worker task
│   │   └── main.py            # App entrypoint
│   ├── alembic/               # Database migration scripts
│   ├── alembic.ini            # Alembic config
│   └── requirements.txt       # Python dependencies
│
├── frontend/
│   ├── app/                   # Next.js App Router pages
│   │   ├── dashboard/         # Analytics overview
│   │   ├── scraper/           # Job launcher & monitor
│   │   ├── products/          # Products database viewer
│   │   ├── history/           # Jobs history & logs
│   │   ├── settings/          # User & scraper settings
│   │   ├── login/             # Auth pages
│   │   └── register/
│   ├── components/            # Sidebar, Providers
│   ├── lib/                   # api.ts, store.ts (Zustand)
│   └── next.config.ts         # Next.js config (image domains, API proxy)
│
├── docker/
│   ├── backend.Dockerfile     # FastAPI + Playwright image
│   └── frontend.Dockerfile    # Next.js image
│
├── docker-compose.yml         # Full stack orchestration
└── .env                       # Environment variables
```

---

## 🌐 API Endpoints

All endpoints are prefixed with `/api`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login, returns JWT token |
| `GET` | `/auth/me` | Get current user details |
| `GET` | `/stats` | Dashboard metrics |
| `GET` | `/jobs` | List all jobs for the user |
| `POST` | `/jobs` | Create and queue a new scraping job |
| `GET` | `/jobs/{id}` | Get job details |
| `POST` | `/jobs/{id}/cancel` | Cancel a running job |
| `POST` | `/jobs/{id}/retry` | Retry failed URLs from a job |
| `DELETE` | `/jobs/{id}` | Delete a job and its records |
| `GET` | `/jobs/{id}/logs` | Get job logs |
| `GET` | `/products` | List products (with filters) |
| `GET` | `/export/{job_id}?format=csv` | Download CSV export |
| `GET` | `/export/{job_id}?format=excel` | Download Excel export |

Interactive docs available at: **http://localhost:8000/docs**

---

## ⚙️ Configuration

All configuration is done via `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `JWT_SECRET` | *(generated)* | **Change this in production!** |
| `PLAYWRIGHT_HEADLESS` | `True` | Run browser without GUI |
| `SCRAPE_DELAY_MIN` | `2` | Min delay between pages (sec) |
| `SCRAPE_DELAY_MAX` | `5` | Max delay between pages (sec) |
| `PAGE_TIMEOUT` | `30000` | Page load timeout (ms) |

---

## 🔧 Development

### Run backend locally (without Docker)

```bash
cd backend
pip install -r requirements.txt
playwright install chromium

uvicorn app.main:app --reload --port 8000
celery -A app.tasks.celery_worker.celery_app worker --loglevel=info
```

### Run frontend locally

```bash
cd frontend
npm install
npm run dev
```

---

## 📦 Data Export Format

Exported CSV/Excel files include these columns:

| Column | Description |
|--------|-------------|
| ASIN | Amazon Standard Identification Number |
| Title | Product title |
| Brand | Brand name |
| Category | Product category path |
| Price | Current price |
| Original Price | Pre-discount price |
| Discount (%) | Savings percentage |
| Rating | Star rating (1-5) |
| Reviews Count | Number of reviews |
| Availability | In stock: True/False |
| Is Prime | Prime eligible: True/False |
| Currency | Price currency (e.g., USD) |
| Image URL | Main product image URL |
| Product URL | Full Amazon product URL |
| Scraped Date | Timestamp of data collection |

---

## 🛡️ Security Notes

- Passwords are hashed with **bcrypt** (cost factor 12)
- JWT tokens expire after **24 hours**
- All API routes require authentication (except `/auth/register` and `/auth/login`)
- **Change the `JWT_SECRET` in `.env` before deploying to production**
- CORS is restricted to `http://localhost:3000` by default

---

## 📝 License

MIT License — use freely for personal and commercial projects.
