"""AquaTwin backend — FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import logger
from app.services.demo_data import FARM as DEMO_FARM

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
@app.get("/api/health", tags=["health"])
@app.get("/api/v1/health", tags=["health"])
def health() -> dict:
    return {"status": "ok", "service": "aquatwin", "farm": DEMO_FARM["name"]}


# Mount routers: supports both legacy /api and versioned /api/v1
app.include_router(api_router, prefix="/api")
app.include_router(api_router, prefix="/api/v1")

logger.info(f"AquaTwin API initialized in {settings.APP_ENV} mode.")
