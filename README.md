# AquaTwin — AI Irrigation Intelligence

> Precision digital twin modeling, what-if irrigation simulation, and water budget optimization platform.

AquaTwin pairs real-time soil moisture telemetry with FAO-56 evapotranspiration physics and mathematical optimization to prevent over-irrigation, protect crops against stress, and maximize water savings.

---

## Workspace Structure

The project is structured into a clean monorepo with distinct frontend and backend packages:

```text
aquatwin/
├── frontend/                 # Next.js 14 App Router application
│   ├── public/              # Agricultural visual assets, hero video & icons
│   │   ├── images/aquatwin/
│   │   └── hero.mp4
│   ├── src/
│   │   ├── app/             # Application routes (marketing, dashboard, twin, simulator, etc.)
│   │   ├── components/      # UI components, farm maps, charts, landing layouts
│   │   ├── hooks/           # Telemetry and sensor data hooks
│   │   ├── lib/             # Calculations, utilities & deterministic engine
│   │   ├── services/        # Centralized API client & domain service modules
│   │   └── types/           # Domain TypeScript definitions
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── README.md
│
├── backend/                  # FastAPI calculation and telemetry service
│   ├── app/
│   │   ├── api/             # Centralized router & v1 domain endpoints
│   │   │   ├── router.py
│   │   │   └── v1/          # Modular endpoints (health, dashboard, twin, etc.)
│   │   ├── core/            # Configuration, logging & security
│   │   ├── schemas.py       # Pydantic domain models
│   │   ├── services/        # FAO-56 twin math, adapters & simulation models
│   │   └── main.py          # FastAPI application factory
│   ├── tests/               # Backend integration tests
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example
│   └── README.md
│
├── docs/                     # Architecture & API documentation
│   ├── architecture.md
│   ├── api-contracts.md
│   └── development-setup.md
│
├── .gitignore
├── .editorconfig
├── README.md                 # Primary workspace README
└── package.json              # Workspace scripts orchestration
```

---

## Prerequisites

- **Node.js**: v18.17+ or v20+
- **Python**: v3.10+ (v3.11 recommended)
- **Package Managers**: `npm` and `pip`

---

## Installation & Setup

### 1. Install dependencies
```bash
# Frontend dependencies
npm --prefix frontend install

# Backend dependencies
python -m pip install -r backend/requirements.txt
```

### 2. Environment Configuration
Copy the provided `.env.example` templates:

- Frontend: `cp frontend/.env.example frontend/.env.local`
- Backend: `cp backend/.env.example backend/.env`

*Note: All features function deterministically out-of-the-box without requiring external paid API keys.*

---

## Running the Application

### Option A: From Repository Root (Recommended)
Open two terminal windows:

```bash
# Terminal 1 — Start Backend (FastAPI on port 8000):
npm run dev:backend
# (Delegates to: python -m uvicorn app.main:app --app-dir backend --reload --port 8000)

# Terminal 2 — Start Frontend (Next.js on port 3000):
npm run dev:frontend
# (Delegates to: npm --prefix frontend run dev)
```

### Option B: From Individual Subdirectories
```bash
# Backend:
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Frontend:
cd frontend
npm run dev
```

---

## Testing & Quality Assurance

```bash
# Run backend integration test suite (15 tests covering all API endpoints):
npm run test:backend
# Or directly: python -m unittest discover -s backend/tests -p "test_*.py"

# Run frontend typecheck:
npm run typecheck:frontend
# Or directly: npm --prefix frontend run typecheck

# Build frontend for production:
npm run build:frontend
# Or directly: npm --prefix frontend run build
```

---

## API Documentation

When the backend is running, interactive API documentation is available at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## Offline Demo Mode

AquaTwin features dual-mode architecture:
- When connected to the FastAPI service, all calculations are executed using live FAO-56 evapotranspiration models and OR-Tools solvers.
- If the backend is offline or during high-stakes presentations, the frontend's centralized API client automatically falls back to an in-browser deterministic simulation engine, ensuring no screens fail or display broken states.
