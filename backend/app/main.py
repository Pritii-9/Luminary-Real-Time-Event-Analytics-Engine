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
    if request.url.path.startswith("/api/v1/collect"):
        if request.method == "OPTIONS":
            response = Response()
        else:
            response = await call_next(request)
            
        origin = request.headers.get("origin")
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response
    return await call_next(request)

@app.middleware("http")
async def add_pna_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response




app.include_router(auth_router)
app.include_router(collect_router)
app.include_router(sites_router)
app.include_router(stats_router)
app.include_router(realtime_router)
app.include_router(tracker_router)
app.include_router(billing_router)
app.include_router(replay_router)



@app.get("/health")
def health():
    return {"status": "ok"}