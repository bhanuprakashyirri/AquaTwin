"""Weather forecast and observations endpoints backed by Open-Meteo."""

from fastapi import APIRouter
from app.db.database import get_field
from app.services.adapters import OpenMeteoWeatherProvider
from app.services.twin import ET0_FACTOR

router = APIRouter(tags=["weather"])

_weather = OpenMeteoWeatherProvider()


def compute_rain_summary(forecast: list) -> dict:
    if not forecast:
        return {"probabilityPct": 0, "inHours": 0}
    for h, row in enumerate(forecast):
        if row.get("rainProbabilityPct", 0) >= 50 and row.get("rainfallMm", 0) > 0.5:
            return {"probabilityPct": row["rainProbabilityPct"], "inHours": h}
    row = forecast[0]
    return {"probabilityPct": row.get("rainProbabilityPct", 0), "inHours": 0}


@router.get("/fields/{field_id}/weather")
def field_weather(field_id: str) -> dict:
    field = get_field(field_id)
    lat = field.get("latitude", 16.54) if field else 16.54
    lon = field.get("longitude", 81.52) if field else 81.52

    forecast = _weather.get_forecast(lat, lon, 48)
    observations = _weather.get_observations(lat, lon, 7)

    if forecast is None:
        return {
            "source": _weather.source_label,
            "status": "unavailable",
            "forecast": [],
            "observations": observations or [],
            "summary": {
                "nextRainProbabilityPct": 0,
                "nextRainInHours": 0,
                "tempNowC": 0.0,
                "et0Mm": 0.0,
            },
            "error": "Unable to retrieve the current weather forecast.",
        }

    rain_sum = compute_rain_summary(forecast)
    # Daily reference ET0 (mm/day) from the next 24h of solar radiation,
    # using the same radiation balance the digital twin applies per hour.
    et0_mm = sum(row.get("solarRadMJm2", 0.0) for row in forecast[:24]) * ET0_FACTOR
    return {
        "source": _weather.source_label,
        "status": "connected",
        "forecast": forecast,
        "observations": observations or [],
        "summary": {
            "nextRainProbabilityPct": rain_sum["probabilityPct"],
            "nextRainInHours": rain_sum["inHours"],
            "tempNowC": forecast[0]["temperatureC"] if forecast else 0.0,
            "et0Mm": round(et0_mm, 1),
        },
    }
