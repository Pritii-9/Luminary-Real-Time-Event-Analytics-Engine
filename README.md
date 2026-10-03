# Luminary 🚀

[![Live Demo](https://img.shields.io/badge/Live%20Demo-luminary--web--event--engine.vercel.app-blueviolet?style=for-the-badge&logo=vercel)](https://luminary-web-event-engine.vercel.app)
[![Backend Status](https://img.shields.io/badge/Backend-Render-000000?style=for-the-badge&logo=render)](https://luminary-scalable-web-event-engine.onrender.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **Scalable Web Telemetry Engine, AI-Powered Cyber Security & Real-Time Analytics Platform**  
> Luminary is a production-grade, high-throughput event ingestion and telemetry analytics platform built for modern web applications. It features zero-latency Redis Stream buffering, background stream consumer workers, PostgreSQL database analytics, ML cyber threat payload scanning (SQLi, XSS, Shannon Entropy), LLM incident reasoning & WAF patch generation, Z-score traffic anomaly detection, conversion funnels, and multi-tenant management.

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
| 📊 **Real-Time Analytics Dashboard** | Interactive React 19 dashboard displaying live pageviews, unique visitors, active sessions, top pages, referrers, and geolocation breakdown. |
| 🛡️ **ML Cyber Threat Detection** | Scans incoming telemetry for OWASP Top 10 exploits (SQLi, XSS, Path Traversal) and calculates Shannon Entropy obfuscation risk scores. |
| 🤖 **LLM Security Incident Agent** | Analyzes flagged cyber threats to generate technical root cause analysis, automated WAF rules, and developer code fixes. |
| 📈 **Statistical Anomaly Engine** | Calculates rolling moving averages and Z-scores using **NumPy** and **Pandas** to detect 3-sigma traffic spikes and bot surges. |
| 🎯 **Conversion Funnels & Goals** | Track multi-step user conversion journeys and identify step-by-step drop-off percentages. |
| 🗄️ **PostgreSQL Analytical Engine** | High-performance relational querying and index-optimized time-series analytics via PostgreSQL (Neon DB). |
| 🔄 **Session Telemetry & Replays** | Track visitor journeys, entry/exit pages, referral sources, user agents, and session duration distributions. |
| 🔐 **Multi-Tenant Authentication** | Email OTP verification, JWT authentication, domain CORS protection, and secure account management. |
| 💳 **Stripe Billing & Tier Quotas** | Usage tracking against tier quotas (Free, Pro, Enterprise) with Stripe portal integration. |
| 🚀 **Locust Performance Benchmarking** | Built-in high-concurrency load testing suite (`scripts/load_test.py`) for empirical RPS and latency verification. |

---

## 🏗️ System Architecture

```
                               ┌──────────────────────────────────────────┐
                               │            Vercel (Frontend)             │
                               │       React 19 + Vite + TS +             │
                               │      Tailwind CSS + Recharts + Lucide    │
                               └────────────────────┬─────────────────────┘
                                                    │  HTTPS / REST / Auth
                               ┌────────────────────▼─────────────────────┐
                               │           Render.com (Backend)           │
                               │  ┌────────────────────────────────────┐  │
                               │  │  FastAPI (Uvicorn Async API)       │  │
                               │  │  • Rate Limiting & Bot Filter      │  │
                               │  │  • ML Threat Scan (SQLi, XSS)      │  │
                               │  │  • LLM Security Incident Agent     │  │
                               │  │  • Ingestion /api/v1/collect       │  │
                               │  └─────────────────┬──────────────────┘  │
                               │                    │ Redis Stream        │
                               │  ┌─────────────────▼──────────────────┐  │
                               │  │  Stream Worker Consumer            │  │
                               │  │  • User-Agent & Geo Enrichment     │  │
                               │  │  • Batch Telemetry Processing      │  │
                               │  │  • PostgreSQL Batch DB Sync        │  │
                               │  └──────────────────┬─────────────────┘  │
                               └──────┬──────────────┼────────────────────┘
                                      │              │
                               ┌──────▼──────┐  ┌────▼────────┐
                               │ PostgreSQL  │  │   Redis     │
                               │ (Neon DB)   │  │ (Upstash)   │
                               └─────────────┘  └─────────────┘
```

---

## 💻 Tech Stack

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Message Broker & Stream:** [Redis](https://redis.io/) (Upstash Redis Streams)
- **Primary Database & Analytics:** [SQLModel](https://sqlmodel.tiangolo.com/) / [SQLAlchemy](https://www.sqlalchemy.org/) (PostgreSQL on Neon DB / SQLite)
- **Data & Statistics:** [NumPy](https://numpy.org/) & [Pandas](https://pandas.pydata.org/) (Z-Score Anomaly Engine)
- **AI & Security:** OpenAI API (LLM Incident Agent), Shannon Entropy Payload Scanner
- **Authentication & Security:** JWT tokens, Passlib, OTP verification, CORS middleware
- **Billing Integration:** [Stripe API](https://stripe.com/)

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + Dark/Light Theme System
- **Visualization:** [Recharts](https://recharts.org/)
- **Icons & UI:** Lucide React, Custom Selects, Glassmorphic Design Tokens

### DevOps & DevSecOps
- **Containers:** Docker & Docker Compose (Non-root `appuser` container execution)
- **Hosting:** Render.com (Backend API & Worker), Vercel (Frontend Dashboard)
- **CI/CD & Security:** GitHub Actions Matrix Strategy (Python 3.11/3.12 & Node 20/22), CodeQL SAST Analysis, Aqua Security Trivy Container Scans

---

## 🛡️ DevSecOps & Security Architecture

Luminary incorporates enterprise-grade DevSecOps automation, multi-version matrix testing, non-root container isolation, and automated static/container vulnerability scanning:

```mermaid
graph TD
    subgraph CI/CD & Security Architecture
        Commit["Git Push / PR"] --> CI["GitHub Actions DAG Pipeline"]
        
        subgraph Stage 1: Compatibility Matrix & SAST
            CI --> MatrixPy["Python Matrix Test (3.11 & 3.12)"]
            CI --> MatrixNode["Node.js Matrix Build (20 & 22)"]
            CI --> CodeQL["CodeQL SAST Scan (Python & TypeScript)"]
        end
        
        subgraph Stage 2: Container Security
            MatrixPy & MatrixNode --> DockerBuild["Docker Build (Unprivileged appuser UID 1000)"]
            DockerBuild --> Trivy["Aqua Security Trivy Scan (OS & Library CVEs)"]
        end
        
        subgraph Stage 3: Maintenance & Release
            Dependabot["Dependabot (Weekly Dependency Audits)"]
            Trivy & CodeQL --> Production["Production Deploy (Render & Vercel)"]
        end
    end
```

| Security Pillar | Implementation | Focus Area |
|---|---|---|
| 🔍 **SAST (Static Analysis)** | GitHub CodeQL (`codeql.yml`) | Scans Python backend & TypeScript/React code for security vulnerabilities, SQL injection, and weak crypto. |
| 🛡️ **Container Scanning** | Aqua Security Trivy Action (`ci.yml`) | Inspects Docker image layers (`python:3.11-slim`) for OS-level CVE binaries and unpatched Linux packages. |
| 📦 **SCA (Dependency Audit)** | GitHub Dependabot (`dependabot.yml`) | Automated weekly scanning for outdated PyPI packages, npm packages, and GitHub Actions dependencies. |
| 🔀 **Matrix Compatibility** | GitHub Actions Matrix Strategy | Multi-version cross-platform validation across Python (3.11, 3.12) and Node.js (20, 22). |
| 🔒 **Least Privilege Execution** | Docker Non-Root Hardening (`Dockerfile`) | Backend application executes as an unprivileged user (`appuser` UID 1000) to mitigate container breakout risks. |
| ⚡ **Strict Gating** | Zero-Fallback Exit Code Gates | Pipeline fails builds immediately on linting, testing, or vulnerability threshold failures. |

---

## 🚀 Quick Start Guide

### Option 1: Running with Docker Compose (Recommended)

Spins up the full stack (Vite/React Frontend, FastAPI Backend API, Redis Stream, and Workers) with a single command:

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
| `OPENAI_API_KEY` | Optional | OpenAI Secret Key for LLM incident reasoning & natural language query agent |
| `STRIPE_SECRET_KEY` | Optional | Stripe Secret Key for processing billing checkout |

---

## 📖 API Endpoint Reference

Interactive OpenAPI documentation is available at `http://localhost:8000/docs` (Swagger UI).

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | API health check endpoint |
| `POST` | `/api/v1/collect` | High-throughput public telemetry event collector |
| `POST` | `/api/v1/auth/register` | Register a new user account |
| `POST` | `/api/v1/auth/login` | Login user & issue HTTP-only authentication cookies |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile & plan info |
| `GET` | `/api/v1/sites` | List site tracking properties for user |
| `POST` | `/api/v1/sites` | Create a new site tracking property |
| `GET` | `/api/v1/stats/summary` | Fetch pageviews, unique visitors, and sessions summary |
| `GET` | `/api/v1/stats/timeseries` | Get pageview & visitor time-series analytics |
| `GET` | `/api/v1/ai-security/threats` | Scan telemetry logs for ML-detected OWASP cyber attack vectors |
| `POST` | `/api/v1/ai-security/llm-analyze` | Generate LLM security report, WAF patch rule, and code fix |
| `POST` | `/api/v1/ai-security/nl-query` | Execute natural language queries over event telemetry |
| `POST` | `/api/v1/billing/checkout` | Create Stripe checkout session for plan upgrade |

---

## 🧪 Testing & Load Benchmarking

### Backend Unittest Suite
Run the fresher-friendly unit test suite (Auth, Health Check, ML Cyber Threat Detector, Z-score Anomalies, Funnels):
```bash
cd backend
python -m unittest discover -s tests -v
```

### High-Concurrency Load Test (Locust)
Simulate high-throughput traffic beacons:
```bash
pip install locust
locust -f scripts/load_test.py --headless -u 100 -r 20 --run-time 1m --host http://localhost:8000
```

---

## 📂 Directory Structure

```
Luminary/
├── docker-compose.yml         # Root Docker Compose orchestration
├── README.md                  # Project documentation & setup guide
├── docs/                      # Screenshots & stripe_setup_guide.md
├── scripts/                   # Performance load testing & event generator scripts
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI route handlers (collect, auth, stats, ai-security, billing)
│   │   ├── core/              # DB models, security, CORS middleware
│   │   ├── services/          # Cyber threat scanner, LLM agent, anomaly engine, stats aggregation
│   │   └── workers/           # Stream worker for ingestion processing
│   ├── tests/                 # Clean Python unittest suite (test_api, test_anomalies, test_funnels)
│   ├── Dockerfile             # Backend container definition (Non-root execution)
│   └── requirements.txt       # Python dependencies
└── frontend/
    ├── src/                   # React 19 + TypeScript dashboard components & pages
    ├── Dockerfile             # Frontend container definition
    └── package.json           # Node dependencies
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
