# GoTransit Regina

## Problem Definition

Public transportation plays an important role for students, workers and residents to get to school, work and other places. Many things can change when buses arrive, such as weather, traffic jams, route detours and people frequently experience uncertainty when waiting for the buses. A lot of people get to bus stops early and wait longer than necessary, while some miss the buses because of delays or changes to schedule.

The goal of our project is to develop a web-based transit application that improves the experience of daily bus commuters by integrating real-time bus tracking and future route planning with a visually clear interface.

While users can still look up routes and schedules on the current transit applications, it is still time consuming to answer questions such as: "Where is my bus?", "When will it reach my stop?"

GoTransit Regina aims to reduce uncertainty and help users make better travel decisions by combining real-time data and a user-friendly interface. This platform is designed using the MVC architecture that separates user interface, application and data management components. It ensures that the system is maintainable and scalable.

---

## Application Benefits

### Comparison with existing systems:

**System 1: Google Maps**

Google Maps is widely used for navigation. It provides various transportation modes including public transit, when you enter your origin and destination. Although it is reliable for navigation services, it does not provide several features such as:

- It does not offer dedicated real-time bus tracking for Regina Transit with frequent updates.
- It is used for general navigation and not specifically designed for daily transit commuters.
- It does not provide stop-level departure boards or predicted arrival times for Regina buses.

GoTransit introduces features which are designed for regular transit users. It provides real-time bus tracking with updates every 1.5 seconds using the TransitLive API. It also provides an interactive map showing buses, stops and routes with a smart route planner that suggests direct and transfer-based trip options. This helps users to make more informed travel decisions.

**System 2: Regina Transit official website**

The transit official website provides useful information such as live-bus tracking, bus schedules and route maps. It mainly serves as an information platform rather than an interactive tool. For example, it does not allow users to plan a trip based on their personal preferences and provides a basic user interface.

GoTransit Regina improves these limitations by offering personalized services with a more interactive platform. It provides smart route planning with direct and transfer route suggestions, real-time arrival predictions at each stop, GPS-based location detection and a modern animated user interface. It provides a more efficient experience as compared to Regina Transit.

---

## Requirements Elicitation

GoTransit is created to support two primary users: administrators and commuters. Both the groups use the platform differently and therefore require different functionalities.

### User Role 1: Admin (Transit Manager)

**Manage Transit Routes**

The administrators can manage the bus routes within the platform. They can rename routes, and toggle route visibility (hide/show) for end users when there are detours or changes. This ensures that information displayed to users is accurate and reflects real-time transit conditions. The administrators keep the route information synchronized with available transit data and real-time APIs to display routes, stops and live bus locations.

**Function Analytics Dashboard**

The administrators can monitor how different features of the application are used through the analytics dashboard. The dashboard displays live metrics including active route count, registered user count (fetched from Supabase in real-time) and total feature interactions. It includes a weekly bar chart comparing place searches vs. saved directions (Monday to Sunday) and a daily pie chart showing traffic distribution by weekday. The dashboard refreshes data every 10 seconds. This helps transit managers understand commuter behaviour and identify the most valuable features for users. Changes can be made to the system to make it more efficient, using this data.

**User Management**

The administrators can manage all registered users through a dedicated user management panel. They can view a list of all users with details including name, email, role, account status, registration date and last active time. Administrators can edit user profiles (change name, role or account status), ban users by suspending their accounts, or soft-delete user accounts. The panel also supports exporting the user list as a CSV file and shows real-time online indicators for users active within the last 2 minutes.

**Visitor Analytics**

The administrators can track website visitors through a beacon-based session tracking system. When a user opens the application, a beacon request creates a visitor session. A heartbeat signal is sent every 60 seconds to keep the session alive, and sessions are marked inactive after 30 minutes without a heartbeat. The system tracks visitor details including IP address, browser, operating system, device type, pages visited and page view count. Administrators can view visitor records chronologically and filter by date range, with aggregated data showing unique visitor counts, device distribution and traffic trends.

### User Role 2: Commuter

**Advanced Route Planner**

Commuters can use the route planning tool that determines the most efficient way to travel. Users can generate routes using their current GPS location and a destination selected through Google Places Autocomplete search. The route planner analyzes factors such as nearby stops (within 500m, expanding to 800m if needed), possible direct routes, transfer options with intelligent transfer stop selection and suggests the best routes. The system supports three types of route suggestions:

- **Direct routes**: Single-leg journeys on one bus where the origin stop comes before the destination stop on the route sequence.
- **Transfer routes**: One-transfer journeys with intelligent transfer stop selection, using nearby stops within 400m for transfers.
- **Walkable shortcuts**: When a transfer's first leg is short (5 minutes or less), the system suggests walking directly to the second bus's boarding stop.

Routes are ranked by live predictions availability, effective travel time (with a 3x penalty for transfer walking), number of transfers and total walking distance. The system provides up to 5 trip suggestions and enriches each option with real-time arrival predictions from the TransitLive API. The route planner simplifies the trip planning process and users can quickly identify the most convenient way to reach their destination.

**Real-time Bus Tracking**

The system displays bus locations on an interactive Google Maps interface and updates every 1.5 seconds using real-time data from the TransitLive API. The system uses an intelligent caching mechanism that tracks each bus with a miss count; buses are only removed from the map after 3 consecutive missed polls (approximately 4.5 seconds) to prevent marker flickering. Buses are displayed with color-coded markers matching their route colors and heading-based compass direction indicators. Also, when a commuter selects a specific bus stop, the system displays a detailed departure board showing bus numbers and predicted arrival times for upcoming buses at that stop. It helps users to decide when to leave to catch the bus and reduces the uncertainty of waiting at bus stops.

**Location Services and "You Are Here"**

The system automatically detects the user's GPS location using the browser's Geolocation API and displays a pulsing blue dot marker on the map indicating "You Are Here." Users can also search for destinations using Google Places Autocomplete, which provides location suggestions as they type. The system finds nearby transit stops within walking distance (500m default, 800m fallback) from the user's current location.

**Landing Page**

The application features an animated landing page with multiple sections including a hero section with call-to-action buttons, statistics, a features carousel, a how-it-works guide, a visual demo, a problem and solution narrative, a comparison table against competitors, a technology and trust section, an FAQ and a final call-to-action. The landing page uses animated SVG transit route networks in the background with pulsing bus stop markers for a visually engaging experience.

**User Profile**

Commuters can access their profile page to view and manage their personal information including their name, email and phone number. The profile page also provides options to change their password, log out or delete their account.

---

## Software Qualities

**Correctness:** It is the ability of the system to provide accurate results based on the inputs and system data.

**Example 1: Manage routes (Admin role)**

Whenever the administrators modify the bus routes (rename or hide/show), the system must provide accurate information to the users. The system uses the official transit data from external APIs and static GTFS data files (shapes, stop sequences, stop-route mappings) to match the routes, stops and detours of the actual Regina transit network. The system synchronizes this data and ensures that users receive reliable information while planning their trips.

**Example 2: Route planning (User role)**

When a commuter uses the route planner tool, the system analyzes and determines the best possible path between the selected locations. The system uses GTFS direction validation to ensure buses travel toward the destination by checking stop sequence order. It ensures route suggestions are generated by accurately interpreting the user's starting point (GPS or searched location), destination (via Places Autocomplete) and preferred stops, using the Haversine formula for precise geographic distance calculations.

**Time Efficiency:** It refers to the system's ability to quickly process the information and respond to the users.

**Example 1: Live updates**

Bus locations are updated every 1.5 seconds through polling the TransitLive API, which ensures that users receive timely and near real-time information. The admin dashboard metrics refresh every 10 seconds for up-to-date monitoring.

**Example 2: Fast route calculation**

The route planning algorithm processes data efficiently and generates results quickly with up to 5 route options. It uses pre-loaded static GTFS data (stop sequences, stop-route indices) to avoid repeated API calls, and enriches results with live predictions fetched in parallel using Promise.all() for optimal performance.

**Robustness:** It is the system's ability to operate even when unexpected situations occur.

**Example 1: Handling missing data**

Buses may disappear from the data source due to network issues. The system uses a miss-count-based caching mechanism where each bus is tracked with a counter. A bus is only removed from the map after 3 consecutive missed polls (approximately 4.5 seconds at the 1.5-second polling interval). This prevents sudden disappearance of bus markers and ensures a smooth user experience.

**Example 2: External API issues**

The system is designed to handle failures from external APIs. When the TransitLive API returns an error or malformed response, the RealTimeService returns an empty array instead of crashing. Analytics failures are handled silently and never break the main application. The system ensures the application remains stable when external services are not fully responsive.

---

## Functional Requirements

### MVC Architecture

The GoTransit Regina follows the MVC architecture which is implemented using Node.js with Express 5 (backend) and React 19 (frontend). Both frontend and backend are written in TypeScript. The three main components — View, Controller and Model — separate the user interface, application logic and data management which clearly organizes the system. This makes the system easier to manage, develop and maintain.

### Presentation Layer

The presentation layer is where the user interacts directly with the system. React components are implemented in this layer that displays the user interface of the application. It displays the transit map with Google Maps integration, real-time bus locations with color-coded markers, route overlays, stop markers (with viewport culling for performance) and a departure board panel for selected stops. Users can search for destinations using Google Places Autocomplete, plan trips through the route planner panel, view bus suggestions and manage their profiles. It also collects user inputs such as login and signup information. The landing page provides an animated introduction to the platform with feature showcases, comparisons and FAQs.

The presentation layer uses code splitting through React.lazy() for all pages (MapPage, LandingPage, LoginPage, SignupPage, AdminLayout and ConnectPage), which reduces the initial bundle size so that landing page visitors do not need to download the map-related code.

Presentation layer communicates with the backend server through API requests. When a user searches for a route, views live bus locations or plans a trip, the frontend sends a request to the backend and displays the information to the user.

### Application Layer

The application layer processes requests from the user and manages the system's functionality. This layer is implemented using Node.js with Express 5 and TypeScript. This layer is responsible for the following:

- Processing API requests from the frontend (transit data, live buses, stop predictions).
- Processing route planning requests with direct route, transfer route and walkable shortcut calculations.
- Managing authorization for users and admins through role-based access control.
- Tracking visitor sessions through beacon and heartbeat middleware.
- Recording feature usage events (place searches and saved directions).
- Serving admin-specific endpoints for route management, user management and analytics.

Whenever a user performs an action such as planning a route or viewing live bus locations, the request is processed by the controller and returns the data to the user. Controllers act as intermediaries between the user interface and the system data.

### Data Layer

The data layer is responsible for data storage and retrieval for the system. This layer is supported through Supabase (PostgreSQL database with built-in authentication). Responsibilities include:

- Managing user accounts through the `profiles` table (id, full_name, email, mobile_number, role, account_status, created_at, updated_at, last_active).
- Authentication information through Supabase Auth (supports email and mobile number login).
- Storing visitor session data in the `visitor_sessions` table (session_id, IP, browser, OS, device, pages_visited, page_views, first_seen, last_seen, status).
- Recording feature usage events in the `feature_events` table (type: places or directions, created_at).
- Static GTFS data stored as JSON and TypeScript files (transit routes, stops, colors, shapes, directional shapes, stop sequences, stop-route mappings).

This layer works closely with the controllers which retrieve and update data whenever the system processes user requests.

### Benefits of MVC Architecture

- MVC separates the user interface, application logic and data management into different layers. This makes it easier to understand and manage the system. The changes that are made to the user interface do not affect the backend logic or database structure.
- MVC makes the development process easier as developers can work on different parts of the system independently. Frontend developers can improve the user interface while backend developers can focus on system logic and data processing.
- MVC makes the system expandable. New tools or services can be integrated without redesigning the entire system.

---

## Software Implementation

### Top-level structure within the web framework

```
src/
├── App.tsx, index.tsx, server.ts          [Entry points]
├── models/                                [Data & Business Logic Layer]
│   ├── transit/                           [Route, Stop, BusPosition types]
│   ├── auth/                              [AuthModel types]
│   ├── admin/                             [AdminTypes]
│   ├── landing/                           [LandingTypes]
│   ├── services/                          [TransitService, AuthService,
│   │                                       AnalyticsService, RoutePlanningService,
│   │                                       RealTimeService, StopPredictionService]
│   ├── repositories/                      [RouteRepository, StopRepository]
│   ├── data/                              [transitRoutes.ts, transitStops.ts,
│   │                                       transitColors.ts, GTFS JSON files]
│   ├── lib/                               [Supabase clients (browser & server)]
│   └── context/                           [AuthContext (global auth state)]
├── views/                                 [UI Layer]
│   ├── auth/                              [LoginPage, SignupPage, ProfilePage]
│   ├── admin/                             [Dashboard, RouteManager, UserManager,
│   │                                       VisitorAnalytics]
│   ├── landing/                           [LandingPage + sections]
│   ├── components/                        [ProtectedRoute, AdminRoute,
│   │                                       PublicOnlyRoute, transit/*, admin/*]
│   ├── layouts/                           [AdminLayout]
│   └── MapPage, MapView, Navbar, ConnectPage
└── controllers/                           [Logic & State Management Layer]
    ├── auth/                              [useLoginController, useSignupController,
    │                                       useProfileController]
    ├── admin/                             [useDashboardController,
    │                                       useRouteManagerController,
    │                                       useUserManagerController]
    ├── routes/                            [transit.routes.ts, analytics.routes.ts,
    │                                       feature.routes.ts]
    ├── middleware/                         [visitorTracker, featureTracker]
    ├── hooks/                             [useAnalyticsBeacon]
    └── useMapController, useNavbarController,
        useBusSuggestionController, useTripPlannerController
```

### Route Map

| Path | Page | Access Level |
|------|------|-------------|
| `/` | Landing Page | Public |
| `/login` | Login Page | Public only (redirects logged-in users to /map) |
| `/signup` | Signup Page | Public only (redirects logged-in users to /map) |
| `/map` | Map Page | Protected (requires login) |
| `/profile` | Profile Page | Protected (requires login) |
| `/admin` | Admin Dashboard | Admin only (requires role = 'admin') |
| `/admin/routes` | Route Manager | Admin only |
| `/admin/users` | User Manager | Admin only |
| `/admin/analytics` | Visitor Analytics | Admin only |
| `/connect` | Meet the Team | Public |

---

## Deployment Diagram

```
User Device                Frontend Server         Application Server        External Services
┌─────────────┐           ┌──────────────┐        ┌──────────────────┐      ┌───────────────────────┐
│ Chrome/Safari│──HTTPS──>│ React (Vite) │──API──>│ Node.js/Express  │──>   │ TransitLive API       │
│             │           │   (Vercel)   │ calls  │   API (Railway)  │      │ Google Maps API       │
└─────────────┘           └──────────────┘        └────────┬─────────┘      │ Places Autocomplete   │
                                                           │                └───────────────────────┘
                                                      DB queries
                                                           │
                                                  ┌────────▼─────────┐
                                                  │  Database Server │
                                                  │    (Supabase     │
                                                  │   PostgreSQL)    │
                                                  └──────────────────┘
```

**GitHub link:** [Insert GitHub repository URL]

**URL of web-based application:** [Insert deployed application URL - gotransitregina.ca]

---

## Technical Documentation

### Programming Languages

- **TypeScript**: It is the primary language used for both frontend (React components, controllers, models) and backend (Express server, routes, middleware, services). The entire codebase is written in TypeScript.
- **HTML**: It is used for web interface structure through JSX/TSX within React components.
- **CSS**: It is used for styling and designing the user interface, primarily through TailwindCSS utility classes and a custom App.css file.

### Reused Algorithms

- **Haversine formula**: It calculates the great-circle distance between two geographic coordinates (latitude/longitude). Used in the route planner to find nearby stops and calculate walking distances.
  Source: https://en.wikipedia.org/wiki/Haversine_formula

- **Point-to-segment distance calculation**: It calculates the perpendicular distance from a geographic point to a route segment using flat-Earth approximation with local cos(lat) scaling. Used for matching user locations to the nearest point on a route shape.

- **Google Maps JavaScript API**: It provides map visualization, rendering and location services including the interactive map display.
  Source: https://developers.google.com/maps

- **Places Autocomplete API**: It provides location search and suggestions, allowing users to search for destinations with auto-complete results.
  Source: https://developers.google.com/maps/documentation/places/web-service/autocomplete

- **TransitLive API**: It provides real-time bus positions in GeoJSON format and stop-level arrival predictions. Two endpoints are used: live bus positions (`/ajax/livemap.php`) and stop time predictions (`stop_times` action).
  Source: https://transitlive.com

### Software Tools and Environments

- **React 19** (Frontend framework): It helps in managing dynamic UI updates such as real-time bus movements, route planning interfaces and admin dashboards. Uses React.lazy() for code splitting.
- **React Router 7** (Client-side routing): Handles navigation between pages with protected routes, public-only routes and admin-only routes.
- **Node.js and Express 5** (Backend): It is used for the server-side application. It handles API requests, route planning logic, visitor tracking middleware, feature event tracking and communication with external APIs.
- **Supabase** (Database and Authentication): It provides a built-in authentication system supporting email and mobile number login, PostgreSQL database which manages user accounts (profiles table), visitor sessions and feature events. It also provides real-time data queries and RPC functions.
- **Google Maps Platform**: It is used for map rendering and location services. It provides the interactive map interface, Places Autocomplete for destination search and marker rendering.
- **Vite 7** (Build tool): It provides instant Hot Module Replacement during development and optimized production builds with code splitting.
- **TailwindCSS 3.4**: It is used for designing the user interface with utility-first CSS classes and responsive design (mobile-first approach).
- **Framer Motion 12**: It is used to create smooth animations and transitions throughout the application, particularly on the landing page, to improve user experience and visual appeal.
- **Recharts 3.7**: It is used in the admin dashboard to display analytics data through weekly bar charts (place searches vs. saved directions) and daily pie charts (traffic distribution).
- **lucide-react**: It provides the icon library used throughout the application interface.
- **embla-carousel-react**: It powers the feature carousel on the landing page.
- **Railway**: It is used to deploy the backend Express server with nixpacks build system and automatic restart on failure.
- **Vercel**: It is used to deploy the frontend React application with SPA rewrites for client-side routing support.

---

## API Endpoints

### Transit Data (`/api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/routes` | Fetch all visible transit routes |
| GET | `/api/routes/:id` | Fetch a specific route by ID |
| GET | `/api/stops` | Fetch all transit stops |
| GET | `/api/colors` | Fetch route color mappings |
| GET | `/api/live` | Fetch live bus positions (polled every 1.5s) |
| GET | `/api/stop-predictions/:stopId` | Real-time predicted arrivals for a stop |
| GET | `/api/admin/routes` | All routes with status (admin only) |
| PATCH | `/api/admin/routes/:id` | Update route name or visibility (admin only) |

### Analytics (`/api/analytics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analytics/beacon` | Register a new visitor session |
| POST | `/api/analytics/heartbeat` | Keep visitor session alive (60s interval) |
| GET | `/api/analytics/visitors` | Get visitor sessions (supports date filtering) |
| GET | `/api/analytics/summary` | Get aggregated analytics summary |

### Feature Tracking (`/api/features`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/features/track` | Record a feature event (places or directions) |
| GET | `/api/features/weekly` | Weekly bar chart data |
| GET | `/api/features/daily` | Daily pie chart data |
| GET | `/api/features/total` | Total interactions count |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Server health check |

---

## Acceptance Testing

**Test case ID: TC001**
Use case: User login
Input: Valid email and password
Expected output: The user logs in successfully and is redirected to the map page.
Actual output: As expected
Status: Pass

**Test case ID: TC002**
Use case: Live bus tracking display
Input: Open map page
Expected output: Live bus markers will be displayed on the map page with color-coded route markers updating every 1.5 seconds.
Actual output: As expected
Status: Pass

**Test case ID: TC003**
Use case: Route planning
Input: Enter a valid destination.
Expected output: System shows up to 5 suggested routes including direct and transfer options with estimated travel times.
Actual output: As expected
Status: Pass

**Test case ID: TC004**
Use case: User profile page
Input: Click on profile icon
Expected output: The user profile will load successfully displaying name, email and phone number.
Actual output: As expected
Status: Pass

**Test case ID: TC005**
Use case: Login with incorrect password
Input: Valid email and wrong password
Expected output: Shows error message and login denied.
Actual output: As expected
Status: Pass

**Test case ID: TC006**
Use case: Bus tracking while network is disconnected
Input: Open map page while network is disconnected
Expected output: The system will handle the failure without crashing and map may not load due to lack of connectivity.
Actual output: As expected
Status: Pass

**Test case ID: TC007**
Use case: Route planner with unsupported location
Input: Enter a location outside Regina
Expected output: The system should not display any transit data or bus locations.
Actual output: As expected
Status: Pass

**Test case ID: TC008**
Use case: Invalid input in search bar.
Input: Enter a random string in search bar.
Expected output: The system should not update or display any routes.
Actual output: As expected
Status: Pass

**Test case ID: TC009**
Use case: Mobile number login
Input: Valid mobile number (+1 XXX-XXX-XXXX format) and password
Expected output: The system resolves the mobile number to the associated email and logs in successfully.
Actual output: As expected
Status: Pass

**Test case ID: TC010**
Use case: Admin route management
Input: Admin renames a route and toggles visibility
Expected output: Route name updates immediately with optimistic UI, and hidden routes are no longer visible to commuters.
Actual output: As expected
Status: Pass

**Test case ID: TC011**
Use case: Admin user management
Input: Admin bans a user account
Expected output: The user's account status changes to "suspended" and the user cannot log in.
Actual output: As expected
Status: Pass

**Test case ID: TC012**
Use case: Landing page load
Input: Navigate to the root URL
Expected output: The animated landing page loads with all sections (hero, features, FAQ, etc.) and animated background.
Actual output: As expected
Status: Pass

---

## Time Efficiency Testing

| Feature | Update Interval | Description |
|---------|----------------|-------------|
| Live bus tracking | 1.5 seconds | Bus positions polled from TransitLive API |
| Admin dashboard metrics | 10 seconds | Metrics refreshed from Supabase |
| Visitor heartbeat | 60 seconds | Session keep-alive signal |
| Session timeout | 30 minutes | Visitor marked inactive after no heartbeat |
| Bus cache eviction | ~4.5 seconds | Bus removed after 3 missed polls (3 × 1.5s) |

[Insert screenshots of before/after bus position updates showing real-time movement]
