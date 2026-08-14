from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_collect import router as collect_router
from app.core.config import settings

app = FastAPI(title="Analytics Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(collect_router)


@app.get("/health")
def health():
    return {"status": "ok"}