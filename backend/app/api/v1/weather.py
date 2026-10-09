"""Weather forecast and observations endpoints."""

from fastapi import APIRouter
from app.services.adapters import DemoWeatherProvider
from app.services.demo_data import FORECAST_48H

router = APIRouter(tags=["weather"])

_weather = DemoWeatherProvider()


def next_rain_summary() -> dict:
    for h, row in enumerate(FORECAST_48H):
        if row["rainProbabilityPct"] >= 50 and row["rainfallMm"] > 0.5:
            return {"probabilityPct": row["rainProbabilityPct"], "inHours": h}
    row = FORECAST_48H[0]
    return {"probabilityPct": row["rainProbabilityPct"], "inHours": 0}


@router.get("/fields/{field_id}/weather")
def field_weather(field_id: str) -> dict:
    return {
        "source": _weather.source_label,
        "forecast": _weather.get_forecast(48),
        "observations": _weather.get_observations(7),
        "summary": {
            "nextRainProbabilityPct": next_rain_summary()["probabilityPct"],
            "nextRainInHours": next_rain_summary()["inHours"],
            "tempNowC": _weather.get_forecast(1)[0]["temperatureC"],
        },
    }
