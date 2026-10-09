"""AquaTwin application configuration."""

import os
from typing import List

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Settings:
    PROJECT_NAME: str = "AquaTwin API"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "AI irrigation optimizer — digital twin, what-if simulation, water budget optimization."
    APP_ENV: str = os.getenv("APP_ENV", "development")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")

    # CORS configuration
    CORS_ORIGINS_RAW: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        if not self.CORS_ORIGINS_RAW:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS_RAW.split(",") if origin.strip()]

    # Integrations (optional secrets kept strictly on backend)
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_BASE_URL: str = os.getenv(
        "GEMINI_BASE_URL",
        "https://generativelanguage.googleapis.com/v1beta",
    )
    REDIS_URL: str | None = os.getenv("REDIS_URL")
    DATABASE_URL: str | None = os.getenv("DATABASE_URL")


settings = Settings()
