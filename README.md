# Luminary — Scalable Web Event Engine

Luminary is a lightweight, production-oriented event ingestion and processing platform for web applications. It provides a small footprint backend for collecting high-throughput telemetry (pageviews, custom events), buffering via Redis streams, and extensible workers for downstream processing and analytics.

## Key Features

- High-throughput event ingestion API (FastAPI)
- Redis Streams for durable, ordered buffering
- Simple enrichment pipeline and worker consumer
- Minimal infra for local development (Docker-ready)

## Architecture 

1. Clients send JSON events to the `/api/v1/collect` endpoint.
2. The API validates and enriches events, then publishes them to a Redis stream (`events:raw`).
3. Worker processes consume the stream and forward events to storage, analytics, or downstream services.

## Quickstart (local)

Prerequisites: `docker`, `python 3.11+`, and an activated virtual environment for the backend.

Start Redis (recommended via Docker):

```powershell
docker run -d --name luminary-redis -p 6379:6379 redis:7
```

Install backend dependencies and run the API (from `backend/`):

```powershell
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Send a test event (PowerShell):

```powershell
Invoke-RestMethod -Method Post -Uri 'http://localhost:8000/api/v1/collect' -ContentType 'application/json' -Body '{"site_id":"site_123","event_type":"pageview","url":"https://example.com/home","path":"/home","session_id":"sess_1","visitor_id":"vis_1"}'
```

Inspect the Redis stream:

```powershell
docker exec -it luminary-redis redis-cli XREVRANGE events:raw + - COUNT 10
```

## Configuration

Configuration is driven by environment variables (see `backend/app/core/config.py`). Key settings:

- `REDIS_URL` — Redis connection string (default `redis://localhost:6379/0`)
- `REDIS_STREAM_KEY` — Redis stream key (default `events:raw`)

## Development and Testing

- Unit tests live in `tests/`. Run them with `pytest` from the repository root after activating the backend venv.
- Worker code is under `backend/app/workers/` and can be run locally against the same Redis instance.

## Contributing

Contributions are welcome. Keep commits small and focused and follow conventional-ish commit messages (e.g., `feat:`, `fix:`, `chore:`, `docs:`).

## License & Contact

This project is provided as-is. For questions or collaboration, open an issue or contact the maintainers.

