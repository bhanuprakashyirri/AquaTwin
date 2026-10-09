# AquaTwin Architecture Documentation

## Overview

AquaTwin is an AI Irrigation Intelligence platform providing digital twin modeling, what-if scenario simulations, and water budget optimization for precision agriculture.

The workspace is strictly partitioned into:
- **`frontend/`**: Next.js 14 (App Router) client application with TypeScript, Tailwind CSS, Framer Motion, Recharts, and MapLibre GL.
- **`backend/`**: FastAPI service providing FAO-56 evapotranspiration models, digital twin projections, and OR-Tools optimization.

---

## Architectural Principles

1. **Separation of Concerns**:
   - The browser UI never executes direct server logic or imports backend modules.
   - The backend never renders HTML and contains no Next.js dependencies.
   - All communication takes place via typed REST endpoints and WebSocket telemetry channels.

2. **Resilient Dual-Mode Operation**:
   - **Live API Mode**: When the FastAPI backend is running at `http://localhost:8000`, the frontend queries the live API.
   - **Deterministic Demo Fallback**: When the backend is offline or during standalone demo presentations, the centralized frontend API client gracefully falls back to deterministic local calculations, ensuring presentations never encounter broken screens.

3. **Thin HTTP Route Handlers**:
   - Backend routes are partitioned by domain into `backend/app/api/v1/`:
     - `health.py`: Liveness and service identity
     - `dashboard.py`: Farm metadata, recommendations, system telemetry
     - `field_twin.py`: Field boundaries, twin state, sensor telemetry, and live WebSocket streaming
     - `simulation.py`: Soil moisture projections and rain uncertainty scenarios
     - `irrigation.py`: Constrained water allocation optimization and historical irrigation logs
     - `weather.py`: 48-hour forecast and historical observations
   - All core mathematical models reside in `backend/app/services/twin.py`.

4. **Security & Secrets**:
   - Backend credentials (e.g. `GEMINI_API_KEY`, `REDIS_URL`, `DATABASE_URL`) are loaded server-side only in `app/core/config.py`.
   - No sensitive API keys are prefixed with `NEXT_PUBLIC_` or exposed to browser bundles.

---

## Workspace Layout

```text
aquatwin/
├── frontend/                 # Client application
│   ├── public/              # Static assets (images, hero video, icons, favicons)
│   ├── src/
│   │   ├── app/             # App Router routes ((app) workspace & marketing)
│   │   ├── components/      # Reusable UI, layout, charts, maps, landing
│   │   ├── hooks/           # Data & streaming hooks
│   │   ├── lib/             # Utilities, demo data & fallback simulation engine
│   │   ├── services/        # Centralized API client & domain service modules
│   │   └── types/           # Domain TypeScript definitions
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
│
├── backend/                  # Server API & analytical engine
│   ├── app/
│   │   ├── api/             # API Router & domain v1 modules
│   │   ├── core/            # Configuration, logging, security
│   │   ├── services/        # FAO-56 models, providers, demo datasets
│   │   ├── schemas.py       # Pydantic request & response models
│   │   └── main.py          # FastAPI application factory
│   ├── tests/               # Integration tests
│   └── requirements.txt     # Python dependencies
│
├── docs/                     # Architectural and operational documentation
├── .gitignore                # Workspace gitignore
├── README.md                 # Primary workspace README
└── package.json              # Workspace script orchestration
```
