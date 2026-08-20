# Luminary 🚀

[![Live Demo](https://img.shields.io/badge/Live%20Demo-luminary--web--event--engine.vercel.app-blueviolet?style=for-the-badge&logo=vercel)](https://luminary-web-event-engine.vercel.app)
[![Backend Status](https://img.shields.io/badge/Backend-Render-000000?style=for-the-badge&logo=render)](https://luminary-scalable-web-event-engine.onrender.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![ClickHouse](https://img.shields.io/badge/ClickHouse-FFCC00?style=for-the-badge&logo=clickhouse&logoColor=black)](https://clickhouse.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **High-Throughput Web Event Engine & Real-Time Analytics Platform**  
> Luminary is a production-grade, scalable event ingestion and telemetry analytics platform built for modern web applications. It features high-throughput API collection, Redis Stream buffering, background stream consumers, ClickHouse column-store analytics, custom goal tracking, session telemetry, and multi-tenant site management.

---

## 🖥️ Platform Screenshots

### 🌐 1. Multi-Tenant Sites Overview
Manage website properties, inspect live telemetry status, and view real-time pageviews across all configured properties.

![Sites Overview](docs/screenshots/sites-overview.png)

### 📊 2. Real-Time Analytics Dashboard
Comprehensive analytics dashboard showing live pageviews, unique visitors, active sessions, traffic time-series graphs, and device breakdowns.

![Analytics Dashboard](docs/screenshots/analytics-dashboard.png)

---

## ✨ Core Features

| Feature | Description |
|---|---|
| ⚡ **High-Throughput Event Ingestion** | Asynchronous `/api/v1/collect` endpoint built with FastAPI and Redis Streams for zero-latency event buffering. |
| 📊 **Real-Time Analytics Dashboard** | Interactive Next.js dashboard displaying live pageviews, unique visitors, active sessions, top pages, referrers, and geolocation breakdown. |
| 🎯 **Custom Event & Goal Tracking** | Capture custom user interactions, conversion milestones, and key business events effortlessly. |
| 🔄 **Session Telemetry & Replays** | Track visitor journeys, entry/exit pages, referral sources, user agents, and session duration distributions. |
| 🚀 **ClickHouse Columnar Storage** | High-performance analytical querying via ClickHouse with seamless SQLite / PostgreSQL fallbacks. |
| 🔐 **Multi-Tenant Authentication** | Email OTP verification, JWT authentication, domain CORS protection, and secure account management. |
| 💳 **Stripe Billing & Tier Management** | Usage tracking against tier quotas (Free, Pro, Enterprise) with Stripe portal integration. |
| 📜 **Embeddable Tracking Snippet** | Lightweight, asynchronous JavaScript tracking snippet for 1-minute site setup. |
| 📥 **Data Export & Reporting** | Export aggregated telemetry and raw event logs in CSV format for offline reporting. |

---

## 🏗️ System Architecture

```
                                  ┌─────────────────────────────────────────┐
                                  │            Vercel (Frontend)            │
                                  │       Next.js 14 + React + TS +         │
                                  │      Tailwind CSS + Recharts + Lucide   │
                                  └────────────────────┬────────────────────┘
                                                       │  HTTPS / REST / Auth
                                  ┌────────────────────▼────────────────────┐
                                  │           Render.com (Backend)          │
                                  │  ┌───────────────────────────────────┐  │
                                  │  │  FastAPI (Uvicorn Async API)      │  │
                                  │  │  • JWT Auth & OTP Verification    │  │
                                  │  │  • Ingestion /api/v1/collect      │  │
                                  │  │  • Stats & Analytics Aggregation  │  │
                                  │  │  • CORS & Security Middleware     │  │
                                  │  └─────────────────┬─────────────────┘  │
                                  │                    │ Redis Stream       │
                                  │  ┌─────────────────▼─────────────────┐  │
                                  │  │  Stream Worker Consumer           │  │
                                  │  │  • User-Agent & Geo Enrichment    │  │
                                  │  │  • Batch Telemetry Processing     │  │
                                  │  │  • ClickHouse / SQLite Sync       │  │
                                  │  └───────────────────────────────────┘  │
                                  └──────┬──────────────────────┬───────────┘
                                         │                      │
                                  ┌──────▼──────┐        ┌──────▼──────┐
                                  │ ClickHouse /│        │   Redis     │
                                  │ PostgreSQL  │        │(Events Stream)
                                  └─────────────┘        └─────────────┘
```

---

## 💻 Tech Stack

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Message Broker & Stream:** [Redis](https://redis.io/) (Redis Streams)
- **Primary Database & ORM:** [SQLModel](https://sqlmodel.tiangolo.com/) / [SQLAlchemy](https://www.sqlalchemy.org/) (SQLite / PostgreSQL)
- **Analytics Store:** [ClickHouse](https://clickhouse.com/) Columnar Database
- **Authentication & Security:** JWT tokens, Passlib, OTP verification, CORS middleware
- **Billing Integration:** [Stripe API](https://stripe.com/)

### Frontend
- **Framework:** [Next.js 14](https://nextjs.org/) (App Router) + [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + Dark/Light Theme System
- **Visualization:** [Recharts](https://recharts.org/)
- **Icons & UI:** Lucide React, Custom Selects, Glassmorphic Design Tokens

### DevOps & Infrastructure
- **Containers:** Docker & Docker Compose
- **Hosting:** Render.com (Backend API & Worker), Vercel (Frontend Dashboard)
- **Database Hosting:** ClickHouse Cloud / Local Docker, Managed PostgreSQL

---

## 🚀 Quick Start Guide

### Option 1: Running with Docker Compose (Recommended)

Spins up the full stack (Next.js Frontend, FastAPI Backend API, Redis Stream, and Workers) with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/Pritii-9/Luminary-Scalable-Web-Event-Engine.git
cd Luminary-Scalable-Web-Event-Engine

# 2. Configure environment variables
cp backend/.env.example backend/.env

# 3. Build and launch services
docker compose up --build
```

Access the applications:
- **Frontend App:** `http://localhost:3000`
- **FastAPI API Documentation:** `http://localhost:8000/docs`

---

### Option 2: Manual Local Development

#### Prerequisites
- **Python:** 3.11 or 3.12
- **Node.js:** v18 or later
- **Redis:** Running instance (e.g. `docker run -p 6379:6379 -d redis:7`)

#### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install backend dependencies
pip install -r requirements.txt

# Create local environment config
cp .env.example .env

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```

In a separate terminal tab, run the Redis Stream Consumer Worker:

```bash
cd backend
python -m app.workers.stream_worker
```

#### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```

The frontend will run at `http://localhost:3000`.

---

## ⚙️ Environment Configuration

Copy `backend/.env.example` to `backend/.env` and update the environment settings:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Optional | PostgreSQL connection string (`postgresql://user:pass@host/db`). Falls back to SQLite if empty. |
| `SQLITE_PATH` | Yes | SQLite database file path (e.g. `app.db`) |
| `REDIS_URL` | Yes | Redis connection string (`redis://localhost:6379/0`) |
| `REDIS_STREAM_KEY` | Yes | Key for event queue stream (default: `events:raw`) |
| `SECRET_KEY` | Yes | Secret key used for signing authentication JWT tokens |
| `CORS_ORIGINS` | Yes | Comma-separated allowed frontend origins |
| `CLICKHOUSE_HOST` | Optional | ClickHouse host address for columnar event analytics |
| `STRIPE_SECRET_KEY` | Optional | Stripe Secret Key for processing billing checkout |

---

## 📖 API Endpoint Reference

Interactive OpenAPI documentation is available at `http://localhost:8000/docs` (Swagger UI).

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | API health check endpoint |
| `POST` | `/api/v1/collect` | High-throughput public telemetry event collector |
| `POST` | `/api/v1/auth/register` | Register a new user account |
| `POST` | `/api/v1/auth/verify-otp` | Verify user email with OTP code |
| `POST` | `/api/v1/auth/login` | Login user & issue HTTP-only authentication cookies |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile & plan info |
| `GET` | `/api/v1/sites` | List site tracking properties for user |
| `POST` | `/api/v1/sites` | Create a new site tracking property |
| `DELETE` | `/api/v1/sites/{site_id}` | Delete a site tracking property |
| `GET` | `/api/v1/stats/summary` | Fetch pageviews, unique visitors, and sessions summary |
| `GET` | `/api/v1/stats/timeseries` | Get pageview & visitor time-series analytics |
| `GET` | `/api/v1/stats/pages` | Retrieve top visited page paths |
| `GET` | `/api/v1/stats/referrers` | Retrieve top traffic referral domains |
| `GET` | `/api/v1/stats/devices` | Retrieve device type breakdown (Desktop, Mobile, Tablet) |
| `GET` | `/api/v1/stats/countries` | Retrieve geolocation visitor distributions |
| `POST` | `/api/v1/billing/checkout` | Create Stripe checkout session for plan upgrade |

---

## 🧪 Testing

### Backend Unit & Integration Tests
```bash
cd backend
python -m unittest discover -s tests -v
```

### Frontend Build Verification
```bash
cd frontend
npm run build
```

---

## 📂 Directory Structure

```
Luminary/
├── docker-compose.yml         # Root Docker Compose orchestration
├── README.md                  # Project documentation & setup guide
├── docs/
│   └── screenshots/           # Platform UI screenshots
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI route handlers (auth, collect, sites, stats, billing)
│   │   ├── core/              # Config, DB models, security, CORS middleware
│   │   ├── services/          # Redis stream, ClickHouse client, stats aggregation, enrichment
│   │   └── workers/           # Stream worker for ingestion processing
│   ├── Dockerfile             # Backend container definition
│   └── requirements.txt       # Python dependencies
└── frontend/
    ├── src/
    │   ├── app/               # Next.js App Router pages (login, sites, dashboard/[siteId])
    │   ├── components/        # Reusable UI components (Sidebar, Charts, UserDropdown, Modals)
    │   └── lib/               # API client library & utilities
    ├── Dockerfile             # Frontend container definition
    └── package.json           # Node dependencies
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
