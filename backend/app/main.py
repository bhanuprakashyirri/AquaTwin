"""AquaTwin backend — FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.services.demo_data import FARM as DEMO_FARM

app = FastAPI(
    title="AquaTwin API",
    version="0.1.0",
    description="AI irrigation optimizer — digital twin, what-if simulation, water budget optimization.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "aquatwin", "farm": DEMO_FARM["name"]}


app.include_router(api_router, prefix="/api")
