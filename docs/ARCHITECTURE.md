# RMC-SAAS — System Architecture

> **Engineering Pack · Architecture Reference**
> Ready Mix Concrete Gate-to-Exit Management System

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [High-Level Architecture](#high-level-architecture)
4. [Component Breakdown](#component-breakdown)
5. [Data Flow](#data-flow)
6. [Network Topology](#network-topology)
7. [ANPR / Camera Pipeline](#anpr--camera-pipeline)
8. [Authentication](#authentication)
9. [Key Design Decisions](#key-design-decisions)

---

## Overview

RMC-SAAS is a full-stack web application that manages the **complete lifecycle of a vehicle (concrete mixer truck) at a Ready Mix Concrete (RMC) plant**, from gate entry to exit. It supports:

- ANPR-based automatic license plate detection at entry/exit cameras
- Weighbridge sessions (tare, gross, nett weights)
- Loading bay and dispatch management
- Trip tracking with GPS waypoints
- Fleet management (vehicles, drivers, fuel, maintenance)
- Billing, inventory, reports, and a customer portal

The system is **production-ready for camera/ANPR workflows** and has **mock/localStorage implementations** for all other modules (ready for MySQL migration per module).

---

## Technology Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Frontend Framework | React | 18 | Concurrent mode |
| Language | TypeScript | 5.x | Strict mode |
| Build Tool | Vite + SWC | 5.x | Port 8080 dev |
| Routing | React Router | v6 | `createBrowserRouter` |
| Server State | TanStack React Query | v5 | Camera/ANPR data |
| UI Components | shadcn/ui + Radix UI | latest | Headless primitives |
| Styling | Tailwind CSS | 3.x | Dark mode via `next-themes` |
| Charts | Recharts | 2.x | Analytics pages |
| Maps | Leaflet + react-leaflet | 4.x | Trip tracking |
| Video Streaming | hls.js | latest | RTSP→HLS camera feeds |
| Backend Runtime | Node.js | 24 | ES Modules (`"type":"module"`) |
| Backend Framework | Express | 4.x | All API routes inline |
| Database Driver | mysql2/promise | 3.x | Async/await pool |
| Database | MySQL | 8.0 | Database: `RMC-SAAS` |
| Media Proxy | MediaMTX | latest | RTSP→HLS transcoding |
| File Uploads | multer | latest | Memory storage, 10 MB |
| HTTP Client | axios | latest | ANPR API calls |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER CLIENT                          │
│                                                                   │
│  React 18 + TypeScript + Vite                                    │
│  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  shadcn/ui    │  │  React Query v5  │  │   hls.js        │  │
│  │  Components   │  │  (API cache)     │  │   (HLS streams) │  │
│  └───────────────┘  └──────────────────┘  └─────────────────┘  │
│  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  React Router │  │  Custom Hooks    │  │   Recharts      │  │
│  │  v6 (SPA)     │  │  (domain logic)  │  │   Leaflet       │  │
│  └───────────────┘  └──────────────────┘  └─────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP / REST  (port 3001)
                               │ VITE_API_URL = http://localhost:3001/api
┌──────────────────────────────▼──────────────────────────────────┐
│                       EXPRESS BACKEND                             │
│                    server/index.js  (port 3001)                   │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Camera APIs │  │  ANPR APIs   │  │  DB Management APIs   │  │
│  │  /api/cameras│  │  /api/anpr/* │  │  /api/health          │  │
│  └──────────────┘  └──────────────┘  │  /api/init-db         │  │
│  ┌──────────────┐                    │  /api/db-status        │  │
│  │  anpr-       │                    └───────────────────────┘  │
│  │  processor.js│                                                │
│  └──────────────┘                                                │
└──────┬─────────────────────────┬───────────────────────────────-┘
       │ mysql2/promise           │ axios (PlateRecognizer API)
┌──────▼──────────┐   ┌──────────▼───────────────────────────────┐
│   MySQL 8.0     │   │  External Services                        │
│   RMC-SAAS      │   │  ┌────────────────────────────────────┐  │
│   (32 tables)   │   │  │ PlateRecognizer.com  (ANPR cloud)  │  │
│                 │   │  │ Free: 2,500 detections/month        │  │
└─────────────────┘   │  └────────────────────────────────────┘  │
                      └────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MEDIAMTX MEDIA SERVER                         │
│                    mediamtx.exe  (ports 8554, 8888, 9997)       │
│                                                                   │
│  Physical IP Cameras ──RTSP──► MediaMTX ──HLS──► Browser        │
│  (Hikvision etc.)     :8554              :8888                   │
│                                                                   │
│  cam1  →  http://localhost:8888/cam1/index.m3u8                 │
│  cam2  →  http://localhost:8888/cam2/index.m3u8                 │
│  weighbridge → http://localhost:8888/weighbridge/index.m3u8     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Frontend — Page & Hook Structure

```
src/
├── App.tsx                    # Router (createBrowserRouter)
├── lib/
│   └── api.ts                 # ApiClient class — all HTTP calls
├── types/                     # 19 domain type files
│   ├── camera.ts
│   ├── anpr.ts
│   ├── vehicle.ts
│   ├── driver.ts
│   ├── trip.ts
│   └── ... (14 more)
├── hooks/                     # 24 domain hooks
│   ├── useGateCameras.ts      # ✅ Live MySQL via API
│   ├── useANPREvents.ts       # ✅ Live MySQL via API
│   ├── useDeviceConfig.ts     # ✅ Live MySQL (partial)
│   └── use*.ts                # 🟡 All others: localStorage mock
├── pages/                     # 21 page components
│   ├── Index.tsx              # Dashboard
│   ├── GateMonitor.tsx        # Gate cameras + ANPR
│   ├── DeviceConfig.tsx       # Camera device management
│   ├── DatabaseSetup.tsx      # DB init UI
│   └── ...
└── components/
    ├── AppSidebar.tsx         # Navigation
    ├── ui/                    # shadcn/ui primitives
    └── [domain]/              # Domain-specific components
```

### Backend — Server Structure

```
server/
├── index.js                   # Express app + all routes
├── db.js                      # MySQL connection pools
├── anpr-processor.js          # ANPRProcessor class
├── migrations/
│   └── anpr_events.sql        # ANPR schema migration
├── .env                       # Runtime config (not committed)
├── .env.example               # Config template
└── package.json               # "type":"module" — ES Modules
```

---

## Data Flow

### Camera / ANPR Data Flow (Live)

```
1. IP Camera streams RTSP → MediaMTX (port 8554)
2. MediaMTX transcodes → HLS (port 8888)
3. Browser fetches HLS via hls.js → renders in <video>
4. Camera sends ANPR webhook → POST /api/anpr/webhook/:cameraId
   OR
   Frontend captures frame → POST /api/anpr/detect (multipart/jpg)
5. ANPRProcessor → PlateRecognizer API → plate + confidence
6. Backend stores result in MySQL anpr_events + anpr_evidence
7. Frontend polls GET /api/anpr/events → renders events table
```

### Mock Module Data Flow (localStorage)

```
1. Hook initializes: reads from localStorage (key: rmc_[domain]_data)
2. If empty: seeds with hardcoded mock data
3. All CRUD: updates in-memory state + serializes to localStorage
4. Page refresh: re-reads from localStorage (data persists in browser)
5. No API calls made — entirely client-side
```

---

## Network Topology

| Service | Host | Port | Protocol | Notes |
|---|---|---|---|---|
| Frontend (Vite dev) | localhost | 8080 | HTTP | Auto-increments if busy |
| Backend (Express) | localhost | 3001 | HTTP/REST | `DB_PORT` can change |
| MediaMTX RTSP input | localhost | 8554 | RTSP/TCP | Cameras connect here |
| MediaMTX HLS output | localhost | 8888 | HTTP/HLS | Browser consumes |
| MediaMTX API | localhost | 9997 | HTTP | Management API |
| MySQL | localhost | 3306 | MySQL | Database: `RMC-SAAS` |
| PlateRecognizer | api.platerecognizer.com | 443 | HTTPS | External ANPR cloud |

> **Important:** The database name `RMC-SAAS` contains a hyphen and **must always be wrapped in backticks** in raw SQL: `` `RMC-SAAS` ``

---

## ANPR / Camera Pipeline

See [`CAMERA-ANPR.md`](./CAMERA-ANPR.md) for full details.

**Summary:**

```
Physical Camera (Hikvision / any RTSP)
    │
    │ RTSP (rtsp://user:pass@<ip>:554/Streaming/Channels/101)
    ▼
MediaMTX (mediamtx.exe + mediamtx.yml)
    │
    ├─── HLS → http://localhost:8888/<pathName>/index.m3u8
    │         consumed by hls.js in browser
    │
    └─── Webhook trigger (camera-native, or manual frame capture)
              │
              ▼
         POST /api/anpr/webhook/:cameraId
              │
              ▼
         ANPRProcessor.detectPlate()
              │
         ┌───┴────────────────────┐
         │                        │
     PLATERECOGNIZER_API_KEY   No API key
     set in server/.env         (mock mode)
         │                        │
         ▼                        ▼
  PlateRecognizer API       Random plate (test)
  (cloud, 2500/mo free)
         │
         ▼
  MySQL: anpr_events + anpr_evidence
```

---

## Authentication

> [!WARNING]
> **Authentication is NOT implemented.** There is no login screen, session management, JWT, or role-based access control. The application is designed for internal plant network use only.

When implementing auth, the recommended approach is:

1. Add `users` and `sessions` tables to MySQL
2. Add `POST /api/auth/login` and `POST /api/auth/logout` routes
3. Add JWT middleware to protect all `/api/*` routes
4. Add a login page at `/login` with redirect logic in `App.tsx`

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| All routes in `server/index.js` | Simple, no route file splitting needed at current scale |
| ES Modules in backend | Modern Node.js standard; use `import` not `require` |
| React Query for camera data | Camera list changes require background refresh; Query handles caching + invalidation |
| localStorage for mock modules | Fast to build; data persists across page reloads; easy to migrate to API |
| MediaMTX as RTSP proxy | Browsers cannot consume RTSP directly; HLS is universal |
| mysql2/promise | Native async/await support; no callback hell |
| Two DB pools in `db.js` | `poolWithoutDb` used for `CREATE DATABASE` during setup; `pool` used for all app queries |
| DB name with hyphen | Inherited naming convention; always backtick-quote in SQL |
| Supabase (legacy) | Old integration; two hooks still attempt Supabase inserts but fail gracefully; not critical |

