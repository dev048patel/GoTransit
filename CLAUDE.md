# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start          # Frontend dev server (Vite, port 3000)
npm run start:server   # Backend Express server (port 3001 or Railway PORT)
npm run dev:server     # Backend with nodemon hot-reload
npm run build          # Production build → /build
npm run serve          # Preview production build locally
npm run build:transit-data  # Regenerate src/models/data/ stops, routes and shapes from the GTFS feed in data/google_transit/
npm test               # Backend tests (test/*.test.ts, node:test via tsx)

# SMS service (run inside services/sms, which has its own package.json)
npm start              # Start the service (port 3002 or Railway PORT)
npm test               # Its tests
npm run build:timetable  # Rebuild data/timetable.json from data/google_transit/ (commit the result)
```

No lint scripts are configured.

## Architecture

This is a full-stack real-time transit tracking app for Regina, Saskatchewan. The frontend is React 19 + TypeScript + Vite; the backend is Express 5 + TypeScript. Both run separately in dev and are deployed independently (Railway for backend, Vercel for frontend).

**Strict MVC pattern** — every feature is split across three directories:

```
src/
├── models/       # Data layer: services, repositories, types, static data, Supabase clients
├── views/        # UI layer: React components (pure rendering, no business logic)
└── controllers/  # Orchestration layer: custom React hooks (frontend) + Express routes (backend)
```

### Data flow

User action → View component → Controller hook (`useXxxController`) → Model service → Repository/external API → state update → re-render.

Views must not call services or repositories directly. Services must not import from views or controllers.

### Key services (`src/models/services/`)

| Service | Responsibility |
|---|---|
| `RealTimeService.ts` | Polls transitlive.com every 1.5s for live bus positions |
| `RoutePlanningService.ts` | Multi-leg trip planning with transfers (complex, ~37KB) |
| `StopPredictionService.ts` | Real-time arrival time predictions |
| `TransitService.ts` | Route/stop CRUD with admin overrides |
| `AuthService.ts` | Login/signup via Supabase |
| `AnalyticsService.ts` | Visitor & feature usage tracking |

### Backend (`src/server.ts` + `src/controllers/routes/`)

Express server with three route groups mounted:
- `/api` — transit data (routes, stops, live buses, predictions, admin overrides)
- `/api/analytics` — visitor & feature tracking beacons
- Middleware: `visitorTracker`, `featureTracker`

`TransitController.ts` contains all handler implementations; route files just wire up paths to handlers.

### SMS alert service (`services/sms/`)

A separate Node service with its own deployment (Railway, root `services/sms`), dependencies and tests, so a failure there can't take down the main API and vice versa. It plans riders' saved commutes (`weekly_schedules`) on its own GTFS timetable (`data/timetable.json`), tracks the live buses, and texts through Twilio. Its tables live in the Supabase schema `sms` (script: `docs/security/sms_001_schema.sql`). It must never import from `src/`. The main API only talks to it through `/internal/*` (with `SMS_SERVICE_TOKEN`) and reads its heartbeat for `SmsOutageService` (outage emails to riders). See `services/sms/README.md`.

### Auth & roles

Supabase handles auth. `AuthContext.tsx` exposes `isAuthenticated` and user role globally. Admin routes/views are role-protected. Two Supabase clients exist: `src/models/lib/supabase.ts` (browser, uses `VITE_*` env vars) and `src/models/lib/supabaseServer.ts` (backend).

### Environment variables

Frontend (prefix `VITE_`): `VITE_GOOGLE_MAPS_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`  
Backend (no prefix): `TRANSIT_LIVE_API_URL`, `PORT`, Supabase service-role key

### Maps

`@react-google-maps/api` renders the map. `use-places-autocomplete` powers address search. Live bus positions, route shapes, and stop markers are layered as Google Maps overlays managed in `useMapController.ts`.

### Styling

TailwindCSS 3 with a custom green palette (primary `#2E7D32`). Custom font: Inter. No CSS modules — all styling via Tailwind utility classes.
