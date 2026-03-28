# GoTransit Regina — Use Case Diagrams & Activity Diagrams

---

## 1. Use Case Diagram: Commuter (User Role)

```
                                    ┌─────────────────────────────────────────────────────┐
                                    │              GoTransit Regina System                │
                                    │                                                     │
                                    │  ┌───────────────────────┐                          │
                                    │  │    Sign Up            │                          │
                                    │  │  ┌──────────────────┐ │                          │
                                    │  │  │Validate fields   │ │                          │
                                    │  │  └──────────────────┘ │                          │
                                    │  │  ┌──────────────────┐ │                          │
                                    │  │  │Check password    │ │                          │
                                    │  │  │strength          │ │                          │
                                    │  │  └──────────────────┘ │                          │
                                    │  │  ┌──────────────────┐ │                          │
                                    │  │  │Format mobile     │ │                          │
                                    │  │  │number            │ │                          │
                                    │  │  └──────────────────┘ │                          │
                                    │  └───────────┬───────────┘                          │
                                    │              │ «includes»                           │
         ┌──────┐                   │  ┌───────────▼───────────┐                          │
         │      │                   │  │                       │                          │
         │      │───────────────────┼─►│      Log In           │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Resolve mobile    │ │                          │
         │      │                   │  │  │to email (if      │ │                          │
         │      │                   │  │  │mobile entered)   │ │      ┌──────────┐        │
         │      │                   │  │  └──────────────────┘ │      │          │        │
         │Commu-│                   │  │  ┌──────────────────┐ │      │ Supabase │        │
         │ ter  │                   │  │  │Check account     │ │◄────►│  Auth    │        │
         │      │                   │  │  │status            │ │      │          │        │
         │      │                   │  │  └──────────────────┘ │      └──────────┘        │
         │      │                   │  └───────────────────────┘                          │
         │      │                   │                                                     │
         │      │                   │  ┌───────────────────────┐                          │
         │      │───────────────────┼─►│  View Live Bus        │                          │
         │      │                   │  │  Tracking              │      ┌──────────┐        │
         │      │                   │  │  ┌──────────────────┐ │      │          │        │
         │      │                   │  │  │Poll bus positions│◄┼─────►│TransitLive│       │
         │      │                   │  │  │every 1.5s        │ │      │  API     │        │
         │      │                   │  │  └──────────────────┘ │      │          │        │
         │      │                   │  │  ┌──────────────────┐ │      └──────────┘        │
         │      │                   │  │  │Cache buses with  │ │                          │
         │      │                   │  │  │miss-count evict  │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  └───────────────────────┘                          │
         │      │                   │                                                     │
         │      │                   │  ┌───────────────────────┐                          │
         │      │───────────────────┼─►│  Plan a Trip          │                          │
         │      │                   │  │  ┌──────────────────┐ │      ┌──────────┐        │
         │      │                   │  │  │Detect GPS        │◄┼─────►│ Browser  │        │
         │      │                   │  │  │location          │ │      │Geolocation│       │
         │      │                   │  │  └──────────────────┘ │      └──────────┘        │
         │      │                   │  │  ┌──────────────────┐ │      ┌──────────┐        │
         │      │                   │  │  │Search destination│◄┼─────►│ Google   │        │
         │      │                   │  │  │(Autocomplete)    │ │      │Places API│        │
         │      │                   │  │  └──────────────────┘ │      └──────────┘        │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Calculate direct  │ │                          │
         │      │                   │  │  │routes            │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Calculate transfer│ │                          │
         │      │                   │  │  │routes            │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Enrich with live  │ │                          │
         │      │                   │  │  │predictions       │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Rank & return top │ │                          │
         │      │                   │  │  │5 suggestions     │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  └───────────────────────┘                          │
         │      │                   │                                                     │
         │      │                   │  ┌───────────────────────┐                          │
         │      │───────────────────┼─►│  View Stop Departures │                          │
         │      │                   │  │  ┌──────────────────┐ │      ┌──────────┐        │
         │      │                   │  │  │Fetch stop        │◄┼─────►│TransitLive│       │
         │      │                   │  │  │predictions       │ │      │  API     │        │
         │      │                   │  │  └──────────────────┘ │      └──────────┘        │
         │      │                   │  └───────────────────────┘                          │
         │      │                   │                                                     │
         │      │                   │  ┌───────────────────────┐      ┌──────────┐        │
         │      │───────────────────┼─►│  Search Places        │◄────►│ Google   │        │
         │      │                   │  │                       │      │Places API│        │
         │      │                   │  └───────────────────────┘      └──────────┘        │
         │      │                   │                                                     │
         │      │                   │  ┌───────────────────────┐                          │
         │      │───────────────────┼─►│  Use "You Are Here"   │      ┌──────────┐        │
         │      │                   │  │  GPS Location         │◄────►│ Browser  │        │
         │      │                   │  │                       │      │Geolocation│       │
         │      │                   │  └───────────────────────┘      └──────────┘        │
         │      │                   │                                                     │
         │      │                   │  ┌───────────────────────┐                          │
         │      │───────────────────┼─►│  Manage Profile       │                          │
         │      │                   │  │  ┌──────────────────┐ │      ┌──────────┐        │
         │      │                   │  │  │Edit personal info│◄┼─────►│ Supabase │        │
         │      │                   │  │  └──────────────────┘ │      │    DB    │        │
         │      │                   │  │  ┌──────────────────┐ │      └──────────┘        │
         │      │                   │  │  │Change password   │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Delete account    │ │                          │
         │      │                   │  │  │(soft delete)     │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  └───────────────────────┘                          │
         │      │                   │                                                     │
         │      │                   │  ┌───────────────────────┐                          │
         │      │───────────────────┼─►│  View Landing Page    │                          │
         │      │                   │  │                       │                          │
         └──────┘                   │  └───────────────────────┘                          │
                                    │                                                     │
                                    └─────────────────────────────────────────────────────┘

Actors:
  - Commuter (primary actor)
  - Supabase Auth (authentication service)
  - TransitLive API (real-time bus data)
  - Google Places API (location search)
  - Browser Geolocation API (GPS)
  - Supabase DB (data storage)
```

### Commuter Use Cases Summary

| # | Use Case | Description | External Actors |
|---|----------|-------------|-----------------|
| UC1 | Sign Up | Create account with email, password, name, optional mobile. Includes password strength check and mobile formatting. | Supabase Auth |
| UC2 | Log In | Authenticate with email or mobile number + password. Includes mobile-to-email resolution and account status check. | Supabase Auth |
| UC3 | View Live Bus Tracking | See real-time bus positions on map, updated every 1.5s with miss-count caching. | TransitLive API |
| UC4 | Plan a Trip | Get up to 5 route suggestions (direct, transfer, walkable shortcut) between GPS/searched origin and destination. Enriched with live predictions. | Browser Geolocation, Google Places API, TransitLive API |
| UC5 | View Stop Departures | Click a stop to see departure board with predicted bus arrivals. | TransitLive API |
| UC6 | Search Places | Search for destinations using Google Places Autocomplete. Map navigates to selected place. | Google Places API |
| UC7 | Use "You Are Here" | Auto-detect GPS location, display pulsing blue dot on map, continuously track position. | Browser Geolocation |
| UC8 | Manage Profile | Edit name/email/mobile, change password, view preferences, delete account (soft delete). | Supabase DB |
| UC9 | View Landing Page | Browse the animated landing page with features, FAQ, comparison table, etc. | None |

---

## 2. Use Case Diagram: Admin (Transit Manager)

```
                                    ┌─────────────────────────────────────────────────────┐
                                    │              GoTransit Regina System                │
                                    │                                                     │
                                    │  ┌───────────────────────┐                          │
                                    │  │  Log In               │      ┌──────────┐        │
         ┌──────┐                   │  │  (same as Commuter    │◄────►│ Supabase │        │
         │      │───────────────────┼─►│   + role = 'admin'    │      │  Auth    │        │
         │      │                   │  │   check)              │      └──────────┘        │
         │      │                   │  └───────────────────────┘                          │
         │      │                   │                                                     │
         │      │                   │  ┌───────────────────────┐                          │
         │      │───────────────────┼─►│  View Dashboard       │                          │
         │      │                   │  │  (refreshes every 10s)│                          │
         │      │                   │  │  ┌──────────────────┐ │      ┌──────────┐        │
         │      │                   │  │  │Fetch user count  │◄┼─────►│ Supabase │        │
         │      │                   │  │  └──────────────────┘ │      │    DB    │        │
         │      │                   │  │  ┌──────────────────┐ │      └──────────┘        │
         │      │                   │  │  │Count active      │ │                          │
         │      │                   │  │  │routes            │ │      ┌──────────┐        │
         │      │                   │  │  └──────────────────┘ │      │ Feature  │        │
         │      │                   │  │  ┌──────────────────┐ │◄────►│ Tracking │        │
         │      │                   │  │  │Fetch weekly      │ │      │   API    │        │
         │      │                   │  │  │feature chart data│ │      └──────────┘        │
         │Admin │                   │  │  └──────────────────┘ │                          │
         │(Tran-│                   │  │  ┌──────────────────┐ │                          │
         │ sit  │                   │  │  │Fetch daily       │ │                          │
         │Mana- │                   │  │  │traffic pie chart │ │                          │
         │ ger) │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Fetch total       │ │                          │
         │      │                   │  │  │interactions      │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  └───────────────────────┘                          │
         │      │                   │                                                     │
         │      │                   │  ┌───────────────────────┐                          │
         │      │───────────────────┼─►│  Manage Routes        │                          │
         │      │                   │  │  ┌──────────────────┐ │      ┌──────────┐        │
         │      │                   │  │  │Search/filter     │ │      │ Backend  │        │
         │      │                   │  │  │routes            │ │◄────►│  Admin   │        │
         │      │                   │  │  └──────────────────┘ │      │   API    │        │
         │      │                   │  │  ┌──────────────────┐ │      └──────────┘        │
         │      │                   │  │  │Rename route      │ │                          │
         │      │                   │  │  │(optimistic UI)   │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Toggle visibility │ │                          │
         │      │                   │  │  │(Active/Hidden)   │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  └───────────────────────┘                          │
         │      │                   │                                                     │
         │      │                   │  ┌───────────────────────┐                          │
         │      │───────────────────┼─►│  Manage Users         │                          │
         │      │                   │  │  ┌──────────────────┐ │      ┌──────────┐        │
         │      │                   │  │  │Search/filter     │ │      │ Supabase │        │
         │      │                   │  │  │users             │ │◄────►│    DB    │        │
         │      │                   │  │  └──────────────────┘ │      └──────────┘        │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Edit user profile │ │                          │
         │      │                   │  │  │(name, role,      │ │                          │
         │      │                   │  │  │ status)          │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Ban user          │ │                          │
         │      │                   │  │  │(suspend account) │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Soft delete user  │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Export users CSV  │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  └───────────────────────┘                          │
         │      │                   │                                                     │
         │      │                   │  ┌───────────────────────┐                          │
         │      │───────────────────┼─►│  View Visitor         │                          │
         │      │                   │  │  Analytics             │                          │
         │      │                   │  │  (refreshes every 30s)│      ┌──────────┐        │
         │      │                   │  │  ┌──────────────────┐ │      │Analytics │        │
         │      │                   │  │  │Filter by date    │◄┼─────►│  API     │        │
         │      │                   │  │  │range / presets   │ │      └──────────┘        │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │Search visitor    │ │                          │
         │      │                   │  │  │records           │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │View session      │ │                          │
         │      │                   │  │  │details           │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  │  ┌──────────────────┐ │                          │
         │      │                   │  │  │View device/      │ │                          │
         │      │                   │  │  │browser charts    │ │                          │
         │      │                   │  │  └──────────────────┘ │                          │
         │      │                   │  └───────────────────────┘                          │
         │      │                   │                                                     │
         │      │                   │  ── Admin also has access to all ──                 │
         │      │                   │  ── Commuter use cases (UC1-UC9) ──                 │
         │      │                   │                                                     │
         └──────┘                   └─────────────────────────────────────────────────────┘

Actors:
  - Admin / Transit Manager (primary actor)
  - Supabase Auth (authentication)
  - Supabase DB (user data, profiles)
  - Backend Admin API (route management)
  - Feature Tracking API (usage analytics)
  - Analytics API (visitor sessions)
```

### Admin Use Cases Summary

| # | Use Case | Description | External Actors |
|---|----------|-------------|-----------------|
| UC10 | Log In (Admin) | Same as Commuter login, but system verifies role = 'admin' in profiles table before granting admin access. | Supabase Auth |
| UC11 | View Dashboard | View live metrics (user count, active routes, total interactions) with weekly bar chart and daily pie chart. Refreshes every 10 seconds. | Supabase DB, Feature Tracking API |
| UC12 | Manage Routes | Search/filter routes, rename routes (optimistic UI with rollback), toggle route visibility (Active/Hidden). | Backend Admin API |
| UC13 | Manage Users | Search/filter users, edit profiles (name, role, status), ban users (suspend), soft-delete users, export as CSV. | Supabase DB |
| UC14 | View Visitor Analytics | View visitor sessions with date filtering (presets or custom), search records, expand session details, view device/browser distribution charts. Refreshes every 30 seconds. | Analytics API |

**Note:** The Admin also inherits all Commuter use cases (UC1–UC9).

---

## 3. Activity Diagram 1: Plan a Trip (Commuter — Most Complex Use Case)

This is the most complex commuter use case as it involves multiple secondary use cases: GPS location detection, Google Places search, route calculation (direct + transfer + walkable shortcuts), live prediction enrichment, and analytics tracking.

```
                                ┌─────────┐
                                │  Start  │
                                └────┬────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │ User opens Trip Planner │
                        │ panel on Map Page       │
                        └────────────┬────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     │                               │
          ┌──────────▼──────────┐         ┌──────────▼──────────┐
          │  SET ORIGIN         │         │  SET DESTINATION    │
          │  (Fork — user can   │         │  (can happen in     │
          │  do either first)   │         │   any order)        │
          └──────────┬──────────┘         └──────────┬──────────┘
                     │                               │
                     ▼                               ▼
           ┌─────────────────┐            ┌─────────────────────┐
           │ User clicks     │            │ User types in       │
           │"Use My Location"│            │ destination field   │
           └────────┬────────┘            └─────────┬───────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐          ┌────────────────────────┐
        │ Browser supports  │          │ Google Places API      │
        │ Geolocation?      │          │ returns suggestions    │
        └─────┬────────┬────┘          │ (debounced 300ms)      │
              │        │               └──────────┬─────────────┘
         ┌────┘        └────┐                     │
         │ YES              │ NO                  ▼
         ▼                  ▼           ┌─────────────────────┐
  ┌──────────────┐  ┌──────────────┐   │ User selects a      │
  │ Request GPS  │  │ Show error:  │   │ suggestion          │
  │ position     │  │ "Geolocation │   └─────────┬───────────┘
  │ from browser │  │  not         │             │
  └──────┬───────┘  │  supported"  │             ▼
         │          └──────┬───────┘   ┌─────────────────────┐
         ▼                 │           │ Geocode address via  │
  ┌──────────────┐         │           │ getGeocode() to get  │
  │ Position     │         │           │ lat/lng coordinates  │
  │ received?    │         │           └─────────┬───────────┘
  └──┬───────┬───┘         │                     │
     │       │             │                     ▼
  YES│       │NO           │           ┌─────────────────────┐
     ▼       ▼             │           │ Set destination =   │
┌────────┐ ┌────────────┐  │           │ {lat, lng, label}   │
│Set     │ │Show GPS    │  │           └─────────┬───────────┘
│origin =│ │error msg   │  │                     │
│{lat,   │ │(permission │  │                     │
│ lng}   │ │denied /    │  │                     │
│        │ │timeout)    │  │                     │
└───┬────┘ └─────┬──────┘  │                     │
    │            │         │                     │
    └────────────┼─────────┼─────────────────────┘
                 │         │
                 ▼         │
    ┌────────────────────┐ │
    │ Both origin AND    │ │
    │ destination set?   │ │
    └──┬─────────────┬───┘ │
       │             │     │
    YES│          NO │     │
       │             │     │
       │             └─────┘ (User must set missing location)
       ▼
┌──────────────────────┐
│ User clicks          │
│ "Find Routes"        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                  ROUTE CALCULATION ENGINE                     │
│                  (RoutePlanningService)                       │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Step 1: Find nearby stops at origin (within 500m)     │   │
│  │         If none found → expand to 800m                │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │                               │
│  ┌───────────────────────────▼───────────────────────────┐   │
│  │ Step 2: Find nearby stops at destination (within 500m)│   │
│  │         If none found → expand to 800m                │   │
│  └───────────────────────────┬───────────────────────────┘   │
│                              │                               │
│            ┌─────────────────┴─────────────────┐             │
│            │                                   │             │
│            ▼                                   ▼             │
│  ┌─────────────────────┐            ┌─────────────────────┐  │
│  │ Step 3A:            │            │ Step 3B:            │  │
│  │ DIRECT ROUTES       │            │ TRANSFER ROUTES     │  │
│  │                     │            │                     │  │
│  │ For each route      │            │ For each pair of    │  │
│  │ serving origin:     │            │ (originRoute,       │  │
│  │                     │            │  destRoute):        │  │
│  │ ┌─────────────────┐ │            │                     │  │
│  │ │Validate GTFS    │ │            │ ┌─────────────────┐ │  │
│  │ │direction_id:    │ │            │ │Find transfer    │ │  │
│  │ │origin must come │ │            │ │stop: same-stop  │ │  │
│  │ │before dest in   │ │            │ │or nearby stop   │ │  │
│  │ │stop sequence    │ │            │ │(≤400m walk)     │ │  │
│  │ └────────┬────────┘ │            │ └────────┬────────┘ │  │
│  │          │          │            │          │          │  │
│  │          ▼          │            │          ▼          │  │
│  │ ┌─────────────────┐ │            │ ┌─────────────────┐ │  │
│  │ │Select (from,to) │ │            │ │Validate GTFS    │ │  │
│  │ │stop pair with   │ │            │ │direction for    │ │  │
│  │ │minimum combined │ │            │ │both legs        │ │  │
│  │ │walking distance │ │            │ └────────┬────────┘ │  │
│  │ └────────┬────────┘ │            │          │          │  │
│  │          │          │            │          ▼          │  │
│  │          ▼          │            │ ┌─────────────────┐ │  │
│  │ ┌─────────────────┐ │            │ │Score with 3x    │ │  │
│  │ │Calculate walking│ │            │ │penalty for      │ │  │
│  │ │+ riding time    │ │            │ │transfer walking │ │  │
│  │ │using Haversine  │ │            │ └────────┬────────┘ │  │
│  │ └─────────────────┘ │            │          │          │  │
│  └─────────┬───────────┘            │          ▼          │  │
│            │                        │ ┌─────────────────┐ │  │
│            │                        │ │Check: 1st leg   │ │  │
│            │                        │ │≤5 min?          │ │  │
│            │                        │ └───┬─────────┬───┘ │  │
│            │                        │  YES│         │NO   │  │
│            │                        │     ▼         │     │  │
│            │                        │ ┌───────────┐ │     │  │
│            │                        │ │Add WALKABLE│ │     │  │
│            │                        │ │SHORTCUT    │ │     │  │
│            │                        │ │option      │ │     │  │
│            │                        │ └─────┬─────┘ │     │  │
│            │                        │       │       │     │  │
│            │                        └───────┼───────┼─────┘  │
│            │                                │       │        │
│            └──────────┬─────────────────────┘       │        │
│                       │                             │        │
│                       ▼                             │        │
│  ┌────────────────────────────────────────────┐     │        │
│  │ Step 4: Merge all route options             │◄───┘        │
│  │ (direct + transfer + walkable shortcuts)    │             │
│  └───────────────────┬────────────────────────┘              │
│                      │                                       │
│                      ▼                                       │
│  ┌────────────────────────────────────────────┐              │
│  │ Step 5: ENRICH WITH LIVE PREDICTIONS       │              │
│  │                                            │              │
│  │ For each option's boarding stop:           │              │
│  │  → Fetch GET /api/stop-predictions/:stopId │              │
│  │  → Match prediction to route number        │              │
│  │  → Extract wait time and ETA               │              │
│  │  → Mark as isLivePrediction = true         │              │
│  │                                            │              │
│  │ (All fetched in parallel via Promise.all)  │              │
│  └───────────────────┬────────────────────────┘              │
│                      │                                       │
│                      ▼                                       │
│  ┌────────────────────────────────────────────┐              │
│  │ Step 6: RANK results by:                   │              │
│  │  1. Live prediction available (priority)   │              │
│  │  2. Effective time (with transfer penalty) │              │
│  │  3. Fewer transfers preferred              │              │
│  │  4. Less walking distance                  │              │
│  │                                            │              │
│  │ Return top 5 suggestions                   │              │
│  └───────────────────┬────────────────────────┘              │
│                      │                                       │
└──────────────────────┼───────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────┐
            │ Results found?   │
            └──┬───────────┬───┘
               │           │
            YES│           │ NO
               │           │
               ▼           ▼
   ┌───────────────┐  ┌──────────────────┐
   │Display up to  │  │Show "No routes   │
   │5 trip options │  │found" message    │
   │with:          │  └────────┬─────────┘
   │• Route numbers│           │
   │• Walking time │           │
   │• Riding time  │           │
   │• Total time   │           │
   │• Live ETA     │           │
   │• Transfer info│           │
   └───────┬───────┘           │
           │                   │
           ▼                   │
   ┌───────────────────┐       │
   │Track analytics:   │       │
   │POST /api/features/│       │
   │track              │       │
   │{type:'directions'}│       │
   │(silent, non-      │       │
   │ blocking)         │       │
   └───────┬───────────┘       │
           │                   │
           └─────────┬─────────┘
                     │
                     ▼
                ┌─────────┐
                │   End   │
                └─────────┘
```

### Use Cases Involved in "Plan a Trip":
1. **Use My Location** (GPS detection) — secondary use case
2. **Search Places** (Google Autocomplete destination) — secondary use case
3. **View Live Bus Tracking** (live bus data for predictions) — secondary use case
4. **View Stop Departures** (stop predictions for ETA enrichment) — secondary use case
5. **Feature Analytics Tracking** (records the directions event) — secondary use case

---

## 4. Activity Diagram 2: Manage Users (Admin — Most Complex Use Case)

This is the most complex admin use case as it involves multiple secondary use cases: searching/filtering users, editing profiles with validation, banning users (affecting their login ability), soft-deleting accounts, exporting CSV, and real-time status indicators.

```
                                ┌─────────┐
                                │  Start  │
                                └────┬────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │ Admin navigates to     │
                        │ /admin/users           │
                        └────────────┬────────────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │ AdminRoute checks:     │
                        │ isAuthenticated AND    │
                        │ role === 'admin'?      │
                        └─────┬──────────┬───────┘
                              │          │
                         YES  │          │ NO
                              │          │
                              │          ▼
                              │   ┌──────────────┐
                              │   │ Redirect to  │
                              │   │ /login       │
                              │   └──────┬───────┘
                              │          │
                              │          ▼
                              │     ┌─────────┐
                              │     │  End    │
                              │     └─────────┘
                              ▼
                   ┌─────────────────────┐
                   │ FETCH ALL USERS     │
                   │ Query Supabase      │
                   │ profiles table      │
                   │ (id, name, email,   │
                   │  role, status,      │
                   │  created_at,        │
                   │  last_active)       │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Display user list   │
                   │ with online status  │
                   │ indicators          │
                   │ (active < 2 min =   │
                   │  "Online")          │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Setup auto-refresh  │
                   │ interval (every 15s)│
                   └──────────┬──────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │         ADMIN CHOOSES AN ACTION              │
        │   (user can perform any of these actions)    │
        └──┬──────┬──────┬──────┬──────┬───────────────┘
           │      │      │      │      │
           ▼      │      │      │      │
   ┌────────────┐ │      │      │      │
   │  SEARCH /  │ │      │      │      │
   │  FILTER    │ │      │      │      │
   │            │ │      │      │      │
   │ Admin types│ │      │      │      │
   │ in search  │ │      │      │      │
   │ field      │ │      │      │      │
   │            │ │      │      │      │
   │ Filter by: │ │      │      │      │
   │ • name     │ │      │      │      │
   │ • email    │ │      │      │      │
   │ (case-     │ │      │      │      │
   │ insensitive│ │      │      │      │
   │ substring) │ │      │      │      │
   │            │ │      │      │      │
   │ Update     │ │      │      │      │
   │ displayed  │ │      │      │      │
   │ list       │ │      │      │      │
   └────────────┘ │      │      │      │
                  │      │      │      │
                  ▼      │      │      │
          ┌────────────┐ │      │      │
          │ EDIT USER  │ │      │      │
          └──────┬─────┘ │      │      │
                 │       │      │      │
                 ▼       │      │      │
        ┌──────────────┐ │      │      │
        │ Open edit    │ │      │      │
        │ modal with   │ │      │      │
        │ current      │ │      │      │
        │ values:      │ │      │      │
        │ • full_name  │ │      │      │
        │ • role       │ │      │      │
        │ • status     │ │      │      │
        └──────┬───────┘ │      │      │
               │         │      │      │
               ▼         │      │      │
        ┌──────────────┐ │      │      │
        │ Admin edits  │ │      │      │
        │ fields and   │ │      │      │
        │ clicks Save  │ │      │      │
        └──────┬───────┘ │      │      │
               │         │      │      │
               ▼         │      │      │
     ┌───────────────┐   │      │      │
     │ Call Supabase  │   │      │      │
     │ updateUser     │   │      │      │
     │ Profile()      │   │      │      │
     └───┬───────┬────┘   │      │      │
         │       │        │      │      │
     SUCCESS   FAIL       │      │      │
         │       │        │      │      │
         ▼       ▼        │      │      │
  ┌─────────┐ ┌────────┐  │      │      │
  │Refresh  │ │Show    │  │      │      │
  │user list│ │error in│  │      │      │
  │Close    │ │modal   │  │      │      │
  │modal    │ │Keep    │  │      │      │
  └─────────┘ │open    │  │      │      │
              └────────┘  │      │      │
                          │      │      │
                          ▼      │      │
                 ┌────────────┐  │      │
                 │ BAN USER   │  │      │
                 └──────┬─────┘  │      │
                        │        │      │
                        ▼        │      │
              ┌───────────────┐  │      │
              │ Call Supabase │  │      │
              │ updateUser    │  │      │
              │ Profile()     │  │      │
              │ {account_     │  │      │
              │  status:      │  │      │
              │  'suspended'} │  │      │
              └──┬────────┬───┘  │      │
                 │        │      │      │
             SUCCESS    FAIL     │      │
                 │        │      │      │
                 ▼        ▼      │      │
          ┌─────────┐ ┌──────┐   │      │
          │Refresh  │ │Show  │   │      │
          │user list│ │error │   │      │
          │User now │ │msg   │   │      │
          │shows    │ └──────┘   │      │
          │"Suspen- │            │      │
          │ded"     │            │      │
          │         │            │      │
          │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
          │ SIDE EFFECT:         │      │
          │ Banned user tries    │      │  ┌───────────────┐  │
          │ to log in →          │      │  │ Login checks   │
          │ account_status       │      │  │ account_status │
          │ = 'suspended'        │      │  │ → DENIED       │
          │ → Login rejected     │      │  │ "Account       │
          │                      │      │  │  suspended"    │
          └─────────┘            │      │  └───────────────┘  │
                                 │      │                     │
           ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┼ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
                                 │      │
                                 ▼      │
                      ┌────────────────┐│
                      │ SOFT DELETE    ││
                      │ USER           ││
                      └───────┬────────┘│
                              │         │
                              ▼         │
                   ┌────────────────┐   │
                   │ Call Supabase  │   │
                   │ softDeleteUser │   │
                   │ ()             │   │
                   │ Sets status =  │   │
                   │ 'deleted'      │   │
                   │ (keeps record  │   │
                   │  for audit)    │   │
                   └──┬────────┬───┘   │
                      │        │       │
                  SUCCESS    FAIL      │
                      │        │       │
                      ▼        ▼       │
               ┌─────────┐ ┌──────┐    │
               │Remove   │ │Show  │    │
               │user from│ │error │    │
               │local    │ │msg   │    │
               │list     │ └──────┘    │
               │(optimis-│             │
               │tic)     │             │
               │         │             │
               │User can │             │
               │no longer│             │
               │log in   │             │
               └─────────┘             │
                                       │
                                       ▼
                            ┌────────────────┐
                            │ EXPORT CSV     │
                            │                │
                            │ Generate CSV   │
                            │ from current   │
                            │ filtered list: │
                            │ • Name         │
                            │ • Email        │
                            │ • Role         │
                            │ • Status       │
                            │ • Registered   │
                            │ • Last Active  │
                            │                │
                            │ Trigger browser│
                            │ download       │
                            └───────┬────────┘
                                    │
                                    ▼
                             ┌─────────────┐
                             │ Return to   │
                             │ user list   │
                             │ (auto-      │
                             │ refreshing  │
                             │ every 15s)  │
                             └──────┬──────┘
                                    │
                                    ▼
                               ┌─────────┐
                               │   End   │
                               └─────────┘
```

### Use Cases Involved in "Manage Users":
1. **Log In (Admin)** — prerequisite use case (must be authenticated with admin role)
2. **AdminRoute Authorization** — role-based access check
3. **Search/Filter Users** — secondary use case (substring matching)
4. **Edit User Profile** — secondary use case (modify name, role, status with validation)
5. **Ban User** — secondary use case (suspend account, affects Login use case)
6. **Soft Delete User** — secondary use case (mark as deleted, affects Login use case)
7. **Export CSV** — secondary use case (generate downloadable file)
8. **Auto-Refresh** — secondary use case (poll Supabase every 15 seconds)
9. **Online Status Detection** — secondary use case (check last_active < 2 minutes)

---

## Summary of All Use Cases by Role

### Commuter Use Cases
| ID | Use Case | Complexity | Secondary Use Cases Involved |
|----|----------|------------|------------------------------|
| UC1 | Sign Up | Medium | Validate fields, Password strength check, Format mobile |
| UC2 | Log In | Medium | Resolve mobile to email, Check account status |
| UC3 | View Live Bus Tracking | Medium | Poll API, Cache with miss-count, Color-code markers |
| UC4 | **Plan a Trip** | **High** | **GPS detection, Places search, Direct routes, Transfer routes, Walkable shortcuts, Live predictions, Analytics tracking** |
| UC5 | View Stop Departures | Low | Fetch stop predictions |
| UC6 | Search Places | Low | Google Places Autocomplete |
| UC7 | Use "You Are Here" | Low | Browser Geolocation |
| UC8 | Manage Profile | Medium | Edit info, Change password, Delete account |
| UC9 | View Landing Page | Low | None |

### Admin Use Cases
| ID | Use Case | Complexity | Secondary Use Cases Involved |
|----|----------|------------|------------------------------|
| UC10 | Log In (Admin) | Medium | Same as UC2 + admin role check |
| UC11 | View Dashboard | Medium | Fetch user count, Count routes, Fetch charts, Auto-refresh |
| UC12 | Manage Routes | Medium | Search, Rename (optimistic + rollback), Toggle visibility |
| UC13 | **Manage Users** | **High** | **Search, Edit profiles, Ban (affects login), Soft delete, CSV export, Auto-refresh, Online detection** |
| UC14 | View Visitor Analytics | Medium | Date filtering, Search records, Expand details, Charts |
