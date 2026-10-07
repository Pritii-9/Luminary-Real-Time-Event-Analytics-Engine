# Luminary — Scalable Web Event & Threat Intelligence Engine

A high-throughput distributed telemetry ingestion engine and real-time observability platform with Redis Stream micro-batching, live OpenMetrics exposition, and heuristic OWASP threat detection.

---

### 🌐 Live Production Deployments & Instant Demo

| Resource | Live Endpoint | Description |
|:---|:---|:---|
| **Web Console (SPA)** | [luminary-zeta-five.vercel.app](https://luminary-zeta-five.vercel.app) | React 19 / Vite telemetry console with in-place SRE inspection |
| **Backend Ingestion API** | [luminary-scalable-web-event-engine.onrender.com](https://luminary-scalable-web-event-engine.onrender.com) | FastAPI high-throughput collector service |
| **OpenMetrics Exporter** | [luminary-scalable-web-event-engine.onrender.com/metrics](https://luminary-scalable-web-event-engine.onrender.com/metrics) | Live OpenMetrics exposition for Prometheus & Datadog |
| **API Health Check** | [luminary-scalable-web-event-engine.onrender.com/health](https://luminary-scalable-web-event-engine.onrender.com/health) | Live service uptime & Redis connectivity status |

> **⚡ 1-Click Recruiter Sandbox:** Open [the Live Web App](https://luminary-zeta-five.vercel.app/login) and click **"1-Click Recruiter Demo Access"** to immediately access an enterprise workspace pre-seeded with active telemetry and OWASP exploit logs (no registration required).
> 
> *Manual credentials:* `demo@luminary.dev` / `demo123`

---

## Architecture Overview

Instead of writing events directly to the database on every HTTP request (which causes connection pool saturation and write locks during traffic spikes), Luminary decouples ingestion from persistence using an in-memory stream buffer:

```
[ Client Browser (tracker.js) ]
               │
               ▼  POST /api/v1/collect (JSON beacon)
    [ FastAPI Collector ]
         ├── Rate Limiting (Redis sliding window)
         ├── AI Scraper Filter (GPTBot, ClaudeBot)
         ├── Threat Scanner (OWASP patterns + Shannon Entropy)
         └── Atomic Quota Check (Redis INCR)
               │
               ├──► [ Redis Sorted Set ] ──► Real-Time Concurrent Visitors (5-min window)
               │
               └──► [ Redis Stream: events:raw ]
                           │
                           ▼ (XREADGROUP in batches of 100)
                 [ stream_worker.py ]
                     ├── User-Agent & GeoIP Enrichment
                     └── Single Bulk SQL Insert ──► [ PostgreSQL / SQLite ]
```

---

## Core Capabilities

### 1. Lightweight Telemetry SDK (`tracker.js`)
* **Under 5KB, zero external dependencies:** Uses native browser APIs without blocking page load (`defer`).
* **SPA Route Tracking:** Monkey-patches HTML5 `pushState`, `replaceState`, and listens to `popstate` to track page views in single-page apps (React, Next.js, Vue) without page reloads.
* **Reliable Unload Delivery:** Uses `navigator.sendBeacon` and `fetch` with `keepalive: true` to ensure exit events are delivered when a user closes a tab.
* **Session Replay Tracking:** Samples normalized cursor coordinates ($x/w$, $y/h$) at 100ms intervals to visualize user heatmaps.

### 2. Stream Ingestion & Micro-Batching
* **Fast Ingestion:** The collector appends events to a Redis Stream via `XADD` and returns `HTTP 204 No Content` immediately.
* **Bulk Worker Writes:** A background daemon (`stream_worker.py`) reads events in batches of 100 (`XREADGROUP`) and persists them in a single database transaction, eliminating database write contention.
* **Real-Time Cardinality:** Uses Redis Sorted Sets (`ZSET`) with `ZREMRANGEBYSCORE` to track active concurrent visitors over a rolling 5-minute window in $O(1)$ memory lookup time.

### 3. OpenMetrics / Prometheus Exporter & SIEM Webhooks
* **Native `/metrics` Endpoint:** Real-time OpenMetrics stream exposing ingestion latency (p50/p95), cache hit ratios (L1 Memory / L2 Redis), and active consumer group buffer sizes.
* **HMAC-SHA256 SIEM Webhook Dispatch:** Cryptographically signed incident alert payloads dispatched to external SIEM endpoints (Splunk, Datadog, Slack, Discord).

### 4. Privacy-First Identity (GDPR Compliant)
* **No Third-Party Cookies:** Uses first-party `localStorage` (`visitor_id`) and `sessionStorage` (`session_id`).
* **Cryptographic IP Salting:** If storage is disabled, the backend generates an anonymized hash:
  $$\text{Hash} = \text{SHA-256}(\text{Client IP} + \text{Daily Rotating Salt} + \text{User Agent})$$
  Because the salt changes daily, visitor tracking across days is mathematically irreversible, ensuring compliance with GDPR and ePrivacy directives.

### 5. Statistical Anomaly Detection
* **Rolling Z-Score Engine:** In [`app/services/anomaly_service.py`](backend/app/services/anomaly_service.py), traffic is evaluated against a 7-day rolling hourly baseline using **NumPy** and **Pandas**:
  $$Z = \frac{x - \mu}{\sigma}$$
  Flags a `SPIKE` when $Z \ge 2.5$ and a `DROP_OFF` (downtime or broken routes) when $Z \le -2.0$.

### 6. Threat Intelligence & In-Place Accordion Triage
* **OWASP Heuristic Scanner:** Inspects query parameters and paths for SQL injection, XSS, SSRF, and directory traversal.
* **Shannon Entropy Analysis:** Calculates string randomness ($H(X) = -\sum P(x) \log_2 P(x)$) on query strings to detect obfuscated or Base64-encoded exploits.
* **LLM Incident Analyst & In-Place Accordion Triage:** Generates root-cause telemetry, ready-to-use Cloudflare WAF rules, Terraform IaC, and Python code fixes via **Groq Cloud (Llama 3.1 8B)**, expanding directly in-place inside the incident table.

---

## Tech Stack

| Layer | Technologies Used |
|---|---|
| **Backend API** | Python 3.11+, FastAPI, Uvicorn, SQLModel / SQLAlchemy, Pydantic |
| **Streaming & Cache** | Redis (Redis Streams `XADD`, Sorted Sets `ZSET`, Atomic Pipelines) |
| **Primary Storage** | PostgreSQL (Production) / SQLite (Local development) |
| **Data & Modeling** | NumPy, Pandas, Shannon Entropy heuristics |
| **AI / LLM** | Groq Cloud API (`llama-3.1-8b-instant`), OpenAI API fallback |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons |
| **DevOps & CI/CD** | Docker, Docker Compose, GitHub Actions (Ruff linter + Pytest matrix) |

---

## Local Development Setup

### Prerequisites
* Python 3.11+
* Node.js 20+
* Redis (local or via Docker)

### 1. Start Redis
```bash
docker run -d --name luminary-redis -p 6379:6379 redis:alpine
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
uvicorn app.main:app --reload --port 8000
```

### 3. Start Background Stream Worker (Optional for dev)
In a separate terminal tab:
```bash
cd backend
python -m app.workers.stream_worker
```
*(Note: If the stream worker is not running, the collector automatically persists events via asynchronous background tasks).*

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The dashboard will be available at `http://localhost:5173` (or `http://localhost:3000`).

---

## Automated Testing & Benchmarking

### Run Test Suite
Runs tests for authentication, health checks, cyber threat scanning, anomaly calculation, and funnel analysis:
```bash
cd backend
pytest tests/ -W ignore::DeprecationWarning
```

### Run Concurrency Load Test (Locust)
Simulates high-concurrency event ingestion:
```bash
pip install locust
locust -f scripts/load_test.py --headless -u 100 -r 20 --run-time 1m --host http://localhost:8000
```

---

## Embedding the Tracker

Add this single `<script>` tag to the `<head>` of any website you want to track:

```html
<script src="https://your-luminary-api.com/tracker.js?site=YOUR_PUBLIC_TOKEN" defer></script>
```

---

## License

This project is open-source under the [MIT License](LICENSE).
