"""Security and CORS helpers for AquaTwin backend."""

from typing import List


def get_cors_origins(origins: List[str]) -> List[str]:
    """Validate and normalize CORS origins."""
    return [origin for origin in origins if origin]
