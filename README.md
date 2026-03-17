# 🚌 GoTransit Regina

Real-time transit tracking and route planning application for Regina, Saskatchewan — featuring live bus tracking, smart trip planning, and a full admin analytics dashboard.

---

## 🚀 Tech Stack

- **Frontend:** React 19, React Router 7, TailwindCSS, Framer Motion  
- **Maps:** Google Maps API (`@react-google-maps/api`)  
- **Backend:** Node.js, Express 5  
- **Database & Auth:** Supabase (PostgreSQL + Authentication)  
- **Build:** Vite 7, TypeScript 5  
- **Charts:** Recharts  
- **Deployment:** Railway  

---

## ✨ Features

- **Live Bus Tracking**  
  Real-time bus positions updated every 1.5 seconds on an interactive map  

- **Smart Route Planning**  
  Multi-leg trip suggestions with transfers, walking directions, and live ETAs  

- **Location Detection**  
  Automatically finds nearby transit options using user GPS  

- **Search Integration**  
  Search any destination and generate transit routes instantly  

- **Admin Dashboard**  
  Manage routes, users, and view analytics with real-time charts  

- **Authentication System**  
  Secure login/signup with role-based access (user vs admin)  

- **Landing Experience**  
  Modern animated landing page with feature showcase and FAQ  

---

## 🧠 Architecture (MVC)

The project follows a **strict Model–View–Controller (MVC)** structure for scalability and maintainability.
```
src/
├── App.tsx, index.tsx, server.ts      (entry points)
│
├── models/                            (data layer)
│   ├── transit/      → Route, Stop, BusPosition types
│   ├── auth/         → AuthModel types
│   ├── admin/        → AdminTypes
│   ├── landing/      → LandingTypes
│   ├── components/   → component prop types
│   ├── controllers/  → MapControllerOutput type
│   ├── views/        → MapViewProps, NavbarProps
│   ├── services/     → TransitService, AuthService, AnalyticsService, TimeService
│   ├── repositories/ → RouteRepository, StopRepository
│   ├── data/         → transitRoutes, transitStops, JSON files, mock/
│   ├── lib/          → Supabase clients
│   └── context/      → AuthContext
│
├── views/                             (UI layer)
│   ├── auth/         → LoginPage, SignupPage, ProfilePage
│   ├── admin/        → Dashboard, RouteManager, UserManager, VisitorAnalytics
│   ├── landing/      → LandingPage, sections/
│   ├── components/   → ProtectedRoute, AdminRoute, transit/*, admin/*
│   ├── layouts/      → AdminLayout
│   └── MapPage, MapView, Navbar, ConnectPage
│
└── controllers/                       (logic layer)
    ├── auth/         → useLogin, useSignup, useProfile
    ├── admin/        → useDashboard, useRouteManager, useUserManager, useVisitorAnalytics
    ├── landing/      → useLandingController
    ├── routes/       → transit.routes, analytics.routes, feature.routes
    ├── middleware/    → visitorTracker, featureTracker
    ├── hooks/        → useAnalyticsBeacon
    └── useMapController, useNavbarController, useBusSuggestionController, useTripPlannerController, TransitController

```
---

## 🔄 Data Flow

```
User Action
    ↓
View (React component — pure UI rendering)
    ↓ calls hook
Controller (useXxxController — state + orchestration)
    ↓ calls
Model / Services (business logic + API calls)
    ↓ reads from
Model / Repositories → Model / Data (static data)
    ↓ returns data
Controller (manages state)
    ↓ passes via props / hook return
View (renders UI)
```

---

## ⚙️ Core Functionality

### 📍 Live Tracking
- Polls backend every 1.5 seconds  
- Uses caching to prevent marker flickering  
- Removes stale buses after missed updates  

### 🧭 Route Planning
- Combines GPS + destination input  
- Finds nearest stops and optimal routes  
- Supports multi-leg journeys with live predictions  

### 📊 Admin Dashboard
- Role-protected (admin only)  
- Displays user stats, routes, and feature usage  
- Visitor tracking via beacon + heartbeat system  

### 🔐 Authentication
- Global session management with Supabase  
- Route protection:
  - `ProtectedRoute` (auth required)  
  - `PublicOnlyRoute` (guests only)  
  - `AdminRoute` (admin only)  

---

## 📌 Highlights

- Clean **MVC architecture** with strict separation of concerns  
- Real-time system with optimized polling + caching  
- Scalable backend with modular services and repositories  
- Production-ready UI with modern animations and UX patterns
