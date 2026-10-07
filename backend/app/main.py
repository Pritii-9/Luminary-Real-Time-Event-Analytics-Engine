from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_auth import router as auth_router
from app.api.routes_collect import router as collect_router
from app.api.routes_realtime import router as realtime_router
from app.api.routes_sites import router as sites_router
from app.api.routes_stats import router as stats_router
from app.api.routes_tracker import router as tracker_router
from app.api.routes_billing import router as billing_router
from app.api.routes_replay import router as replay_router
from app.core.config import settings
from app.core.database import create_tables



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create SQLite tables on startup
    create_tables()
    yield


app = FastAPI(title="Luminary Analytics Engine", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
default_origins = [
    "https://luminary-web-event-engine.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
]
for origin in default_origins:
    if origin not in origins:
        origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request, Response

@app.middleware("http")
async def public_collect_cors_middleware(request: Request, call_next):
    is_public = (
        request.url.path.startswith("/api/v1/collect")
        or request.url.path.startswith("/api/session-replay")
        or request.url.path.startswith("/api/v1/session-replay")
        or request.url.path in ("/tracker.js", "/script.js", "/api/v1/tracker/script.js")
    )
    if is_public:
        origin = request.headers.get("origin") or "*"
        if request.method == "OPTIONS":
            response = Response(status_code=200)
        else:
            response = await call_next(request)
            
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response
    return await call_next(request)

@app.middleware("http")
async def add_pna_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response




from app.api.routes_funnels import router as funnels_router
from app.api.routes_ai_security import router as ai_security_router

app.include_router(auth_router)
app.include_router(collect_router)
app.include_router(sites_router)
app.include_router(stats_router)
app.include_router(realtime_router)
app.include_router(tracker_router)
app.include_router(billing_router)
app.include_router(replay_router)
app.include_router(funnels_router)
app.include_router(ai_security_router)




@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/metrics")
def prometheus_metrics():
    """Prometheus SRE exposition endpoint for Grafana, Datadog, and VictoriaMetrics scrapers."""
    from app.services.metrics_service import generate_prometheus_metrics_text
    return Response(
        content=generate_prometheus_metrics_text(),
        media_type="text/plain; version=0.0.4; charset=utf-8"
    )