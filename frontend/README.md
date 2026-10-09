# AquaTwin — Frontend Application

Next.js 14 App Router client application for AquaTwin — AI Irrigation Intelligence.

## Features
- **Landing Page**: Immersive agricultural hero with interactive feature spotlights and telemetry previews.
- **Field Twin**: Interactive farm map, zone telemetry, sensor nodes, and real-time streaming soil moisture updates.
- **What-If Simulator**: Scenario modeling, 48-hour moisture projections, rain uncertainty risk assessment, and decision factors.
- **Water Budget Optimizer**: Dynamic allocation across zones under constrained water quotas.
- **Field Health**: NDVI vegetation indices, NDWI water stress layers, and zone risk indicators.
- **Analytics & History**: Moisture decay fingerprints, ETc diurnal curves, and historical irrigation schedules.
- **Settings & Demo Mode**: Seamless transition between live FastAPI backend and deterministic offline simulation engine.

## Directory Structure
```text
frontend/
├── public/
│   ├── images/aquatwin/    # Generated agricultural visual assets & WebP images
│   ├── favicon.ico
│   ├── favicon.png
│   ├── hero.mp4            # Hero section video
│   ├── logo.png
│   └── logo-white.png
├── src/
│   ├── app/                # Next.js App Router (pages and layouts)
│   ├── components/         # UI components, layout, charts, maps, landing
│   ├── hooks/              # Data hooks (useApiData, useSensorStream)
│   ├── lib/                # Utilities, demo data, deterministic simulation engine
│   ├── services/           # Centralized API client & domain service modules
│   └── types/              # TypeScript domain types & API contracts
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.js
├── postcss.config.js
└── tailwind.config.ts
```

## Running the Frontend

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run type check
npm run typecheck

# Production build
npm run build
```
The application will be accessible at `http://localhost:3000`.
