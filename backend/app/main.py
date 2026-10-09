"""AquaTwin backend — Production FastAPI application factory."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import logger
from app.db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize relational tables on startup
    init_db()
    logger.info("AquaTwin database tables initialized.")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
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
    return {
        "status": "ok",
        "service": "aquatwin",
        "environment": settings.APP_ENV,
        "database": "sqlite_connected",
    }


# Mount API routers
app.include_router(api_router, prefix="/api")
app.include_router(api_router, prefix="/api/v1")

logger.info(f"AquaTwin API initialized in {settings.APP_ENV} mode.")
