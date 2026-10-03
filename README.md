# Luminary 🚀

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

> **AI-Powered Web Telemetry, Cyber Security & Real-Time Analytics Platform**  
> Luminary is a high-performance, real-time web analytics and security engine built with **FastAPI**, **Redis Streams**, **PostgreSQL**, **NumPy & Pandas**, and **React 19**. It features zero-latency event buffering, background stream workers, ML cyber threat payload scanning (SQLi, XSS, Shannon Entropy), LLM security reasoning, Z-score traffic anomaly detection, conversion funnels, and interactive dashboard charts.

---

## 🖥️ Platform Screenshots

### 🌐 1. Multi-Tenant Sites Overview
Manage website properties, inspect live telemetry status, and view real-time pageviews across all configured properties.

![Sites Overview](docs/screenshots/sites-overview.png)

### 📊 2. Real-Time Analytics Dashboard
Comprehensive analytics dashboard showing live pageviews, unique visitors, active sessions, traffic time-series graphs, and device breakdowns.

![Analytics Dashboard](docs/screenshots/analytics-dashboard.png)

---

## 💡 How Luminary Works (End-to-End Flow)

```
 1. BROWSER INGESTION        2. FASTAPI API         3. REDIS STREAM        4. BACKGROUND WORKER      5. POSTGRESQL DB
 ┌───────────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌────────────────┐
 │ tracker.js script │ ──>│ /api/v1/collect │ ──>│ events:raw queue │ ──>│ stream_worker.py │ ──>│ PostgreSQL DB  │
 │ (Captures URL,    │    │ (Rate limiting, │    │ (Sub-5ms buffer) │    │ (Batches 100 evs,│    │ (Indexed event │
 │  screen, clicks)  │    │  Bot filtering) │    │                  │    │  User-Agent, Geo)│    │  records)      │
 └───────────────────┘    └─────────────────┘    └──────────────────┘    └──────────────────┘    └────────────────┘
```

---

## ✨ How Our Engine Catches & Processes Everything

### 1. 🌐 In the Web Browser (`tracker.js`)
* **Pageview & Telemetry Capture:** When embedded on a client website, `tracker.js` reads `window.location`, `document.referrer`, screen resolution (`1920x1080`), visitor ID (`localStorage`), and session ID (`sessionStorage`).
* **Single Page Application (SPA) Tracking:** Intercepts HTML5 `pushState` and `popstate` events to track page changes in React/Next.js without full browser reloads.
* **Session Replay Tracking:** Listens to mouse clicks and $(x, y)$ coordinates for session replay.

### 2. ⚡ In the Backend API (`FastAPI + Redis Streams`)
* **Rate Limiting & Bot Filtering:** Checks Redis sliding windows (**60 req/min**) and filters out known automated crawlers (`GPTBot`, `ClaudeBot`).
* **Zero-Latency Ingestion:** Pushes event payloads into **Redis Streams** (`events:raw`) with **< 5ms** API response times.

### 3. ⚙️ In the Background Worker (`stream_worker.py`)
* **Batch Consumer Loop:** Uses Redis Consumer Groups (`XREADGROUP`) to process events in batches of 100.
* **Enrichment & Database Sync:** Parses User-Agent strings (Device/Browser type), looks up GeoIP locations, and bulk-inserts records into **PostgreSQL**.

### 4. 🛡️ Cyber Security & ML Anomaly Engine (`cyber_threat_service.py` & `anomaly_service.py`)
* **ML Payload Threat Scanner:** Scans URL paths for SQL Injection, XSS, and calculates **Shannon Entropy** to detect obfuscated Base64 attack payloads.
* **LLM Incident Agent:** Uses OpenAI/LLM capabilities to analyze attack mechanisms, generate Cloudflare WAF firewall rules, and provide developer code fixes.
* **Z-Score Anomaly Engine:** Uses **NumPy** and **Pandas** to calculate moving averages and Z-scores over hourly traffic data to detect 3-sigma traffic spikes.

### 5. 📊 On the Frontend Dashboard (`React 19 + Tailwind CSS + Recharts`)
* Renders real-time time-series pageview graphs, top visited pages, referrer sources, device breakdowns, conversion funnels, and session replays.

---

## 🛠️ Tech Stack

### Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+) & Uvicorn Async Server
- **Message Broker & Stream:** [Redis](https://redis.io/) (Upstash Redis Streams)
- **Primary Database:** [SQLModel](https://sqlmodel.tiangolo.com/) / [SQLAlchemy](https://www.sqlalchemy.org/) (PostgreSQL on Neon DB / SQLite)
- **Data & Statistics:** [NumPy](https://numpy.org/) & [Pandas](https://pandas.pydata.org/) (Z-Score Anomaly Engine)
- **AI & Security:** OpenAI API (LLM Incident Agent), Shannon Entropy Payload Scanner
- **Authentication:** JWT tokens, Passlib password hashing, CORS middleware

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + Dark/Light Theme System
- **Visualization:** [Recharts](https://recharts.org/) & Lucide React Icons

### DevOps & Testing
- **Containers:** Docker & Docker Compose
- **Testing:** Standard Python `unittest` framework & FastAPI `TestClient`
- **CI/CD:** GitHub Actions Automated Test Pipeline

---

## 📖 Key API Routes

| Method | Endpoint | What It Does |
|---|---|---|
| `GET` | `/health` | API health check endpoint |
| `POST` | `/api/v1/collect` | High-speed telemetry ingestion beacon |
| `POST` | `/api/v1/auth/register` | Register new user account |
| `POST` | `/api/v1/auth/login` | Login user & issue authentication JWT |
| `GET` | `/api/v1/sites` | List site tracking properties for user |
| `POST` | `/api/v1/sites` | Create new site tracking property |
| `GET` | `/api/v1/stats/summary` | Fetch pageviews, unique visitors, and sessions |
| `GET` | `/api/v1/stats/timeseries` | Get daily pageview time-series metrics |
| `GET` | `/api/v1/ai-security/threats` | Scan telemetry logs for OWASP cyber attack vectors |
| `POST` | `/api/v1/ai-security/llm-analyze` | Generate LLM security report, WAF rule, and code fix |

---

## 🚀 Quick Start (Local Setup)

### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment config
cp .env.example .env

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

### 2. Stream Worker Setup
In a new terminal tab:
```bash
cd backend
python -m app.workers.stream_worker
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will run at `http://localhost:3000`.

---

## 🧪 Testing & Load Benchmarking

### Run Backend Unit Tests
Run the standard Python test suite (Auth, Health Check, ML Cyber Threat Detector, Z-score Anomalies, Funnels):
```bash
cd backend
python -m unittest discover -s tests -v
```

### Run Performance Load Test (Locust)
Simulate high-throughput traffic beacons:
```bash
pip install locust
locust -f scripts/load_test.py --headless -u 100 -r 20 --run-time 1m --host http://localhost:8000
```

---

## 📂 Directory Structure

```
Luminary/
├── docker-compose.yml         # Root Docker Compose file
├── README.md                  # Project documentation & setup guide
├── docs/                      # Screenshots & setup guides
├── scripts/                   # Performance load testing & event generator scripts
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI route handlers (collect, auth, stats, ai-security)
│   │   ├── core/              # DB models, config, security
│   │   ├── services/          # Cyber threat scanner, LLM agent, anomaly engine
│   │   └── workers/           # Stream worker for event ingestion
│   ├── tests/                 # Clean Python unittest suite (test_api, test_anomalies, test_funnels)
│   ├── Dockerfile             # Backend container definition
│   └── requirements.txt       # Python dependencies
└── frontend/
    ├── src/                   # React 19 + TypeScript dashboard components & pages
    ├── Dockerfile             # Frontend container definition
    └── package.json           # Node dependencies
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
