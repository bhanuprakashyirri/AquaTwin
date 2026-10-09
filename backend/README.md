# AquaTwin — Backend Service

FastAPI-powered irrigation intelligence engine implementing FAO-56 evapotranspiration models, digital twin projections, what-if simulations, and water budget optimization.

## Responsibilities
- REST API and WebSocket telemetry service.
- Soil-moisture, depletion, and evapotranspiration calculations (FAO-56-inspired water balance).
- What-If simulation engine with rainfall uncertainty modeling.
- Water budget allocation optimization (OR-Tools / priority fallback).
- Weather and satellite adapters.

## Project Structure
```text
backend/
├── app/
│   ├── main.py              # Application factory & CORS configuration
│   ├── api/
│   │   ├── router.py        # Centralized router combining v1 modules
│   │   ├── routes.py        # Backward compatibility alias
│   │   └── v1/
│   │       ├── health.py     # Health checks
│   │       ├── dashboard.py  # Farms, recommendations & status
│   │       ├── field_twin.py # Field geometry, state, zones & WebSocket
│   │       ├── simulation.py # What-If scenarios & rain uncertainty
│   │       ├── irrigation.py # Budget optimization & history
│   │       └── weather.py    # Forecast & observations
│   ├── core/
│   │   ├── config.py        # Environment settings
│   │   ├── logging.py       # Structured logging
│   │   └── security.py      # Security and CORS helpers
│   ├── schemas.py           # Pydantic data schemas
│   └── services/
│       ├── adapters.py      # Weather, satellite, and sensor providers
│       ├── demo_data.py     # Deterministic demo datasets
│       └── twin.py          # Soil water balance and simulation engine
├── tests/
│   └── test_api.py          # Integration tests for all endpoints
├── requirements.txt         # Python dependencies
└── .env.example             # Environment template
```

## Setup & Running

### 1. Install dependencies
```bash
python -m pip install -r requirements.txt
```

### 2. Run development server
```bash
# From workspace root:
python -m uvicorn app.main:app --app-dir backend --reload --port 8000

# Or from backend directory:
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Run tests
```bash
# From workspace root:
python -m unittest discover -s backend/tests -p "test_*.py"
```

## API Documentation
When running, interactive documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
