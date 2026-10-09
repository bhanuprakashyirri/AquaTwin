# AquaTwin Development Setup Guide

This guide walks through setting up and running AquaTwin in local development across Windows (PowerShell) and POSIX environments.

---

## Prerequisites

- **Node.js**: v18.17+ or v20+
- **Python**: v3.10+ (v3.11 recommended)
- **Package Managers**: `npm` and `pip`

---

## 1. Quick Start from Repository Root

### Install Dependencies
```bash
# Frontend
npm --prefix frontend install

# Backend
python -m pip install -r backend/requirements.txt
```

### Start Development Servers

Open two terminal sessions:

**Terminal 1 — Backend (FastAPI):**
```bash
# Using root npm script
npm run dev:backend

# Or directly using Python uvicorn
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```
Backend API will be listening at `http://localhost:8000`.

**Terminal 2 — Frontend (Next.js):**
```bash
# Using root npm script
npm run dev:frontend

# Or directly with npm prefix
npm --prefix frontend run dev
```
Frontend application will be accessible at `http://localhost:3000`.

---

## 2. Windows PowerShell Setup

For Windows PowerShell users:

```powershell
# In PowerShell:

# 1. Run backend tests
python -m unittest discover -s backend/tests -p "test_*.py"

# 2. Run frontend typecheck
npm --prefix frontend run typecheck

# 3. Start backend
python -m uvicorn app.main:app --app-dir backend --reload --port 8000

# 4. In a second PowerShell window, start frontend:
npm --prefix frontend run dev
```

---

## 3. Production Build Validation

To verify production builds:

```bash
# Frontend production build
npm --prefix frontend run build

# Backend test suite
python -m unittest discover -s backend/tests -p "test_*.py"
```

---

## 4. Environment Variables

Create `.env.local` inside `frontend/` and `.env` inside `backend/` from the provided `.env.example` templates if customization is needed.

- **`frontend/.env.local`**:
  ```env
  NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
  NEXT_PUBLIC_DEMO_MODE=true
  ```

- **`backend/.env`**:
  ```env
  APP_ENV=development
  API_PREFIX=/api
  CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
  ```
