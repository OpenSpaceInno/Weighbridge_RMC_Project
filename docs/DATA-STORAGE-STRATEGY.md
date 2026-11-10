# RMC-SAAS — Data Storage Strategy

> **Engineering Pack · Storage Architecture & Migration Matrix**
> Mapping client-side localStorage, in-memory state, and MySQL 8.0 `RMC-SAAS`

---

## Table of Contents

1. [Storage Architecture Overview](#storage-architecture-overview)
2. [Module Storage Matrix](#module-storage-matrix)
3. [Live MySQL Modules](#live-mysql-modules)
4. [localStorage Mock Modules](#localstorage-mock-modules)
5. [Legacy Supabase References](#legacy-supabase-references)
6. [Migration Roadmap to 100% MySQL](#migration-roadmap-to-100-mysql)

---

## Storage Architecture Overview

RMC-SAAS currently utilizes a hybrid 3-tier data persistence design:

1. **Tier 1: Live MySQL (`RMC-SAAS`)**
   - Directly backed by Express API routes (`/api/cameras`, `/api/anpr/*`).
   - Tables: `camera_devices`, `device_rtsp_config`, `device_network_config`, `anpr_events`, `anpr_evidence`, `anpr_config`.
   - Data persists across server restarts and is shared among all connected clients.

2. **Tier 2: Client `localStorage` (Rich Mocks)**
   - Used for operational and fleet modules where UI flows are complete, but API routes have not yet been wired.
   - Keys follow the pattern: `rmc_[module]_data`.
   - Data persists across browser refreshes on the local machine.

3. **Tier 3: Dynamic In-Memory Computations**
   - Calculated in React state (`useState`, `useMemo`) from underlying base records (e.g., Dashboard stats, Trip Analytics).

---

## Module Storage Matrix

| Module Name | React Hook | Current Storage | Storage Key | Target MySQL Table | Migration Priority |
|---|---|---|---|---|---|
| **Gate Monitor** | `useGateCameras`<br>`useANPREvents` | **Live MySQL** | N/A (API) | `camera_devices`<br>`anpr_events` | Completed |
| **Device Config** | `useDeviceConfig` | **Live MySQL** | N/A (API) | `device_rtsp_config`<br>`device_network_config` | Completed |
| **Trip Management** | `useTripManagement` | `localStorage` | `rmc_trips_data`<br>`rmc_trip_events` | `trips`<br>`trip_events` | **P0 (Immediate)** |
| **Weighbridge** | `useWeighbridge` | `localStorage` | `rmc_weighbridge_data` | `weighbridge_sessions` | **P0 (Immediate)** |
| **Vehicle Management** | `useVehicleManagement` | `localStorage` | `rmc_vehicles_data` | `vehicles` | **P1 (High)** |
| **Driver Management** | `useDriverManagement` | `localStorage` | `rmc_drivers_data` | `drivers` | **P1 (High)** |
| **Loading Console** | `useLoadingConsole` | `localStorage` | `rmc_loading_bays` | `loading_bay_assignments` | **P1 (High)** |
| **Dispatch Approval** | `useDispatch` | `localStorage` | `rmc_dispatch_approvals` | `dispatch_approvals` | **P1 (High)** |
| **Trip Tracking** | `useTripTracking` | `localStorage` | `rmc_trip_tracking` | `trip_waypoints` | **P2 (Medium)** |
| **Exit Verification** | `useExitVerification` | `localStorage` + Supabase try | `rmc_exit_verifications` | `exit_verifications` | **P2 (Medium)** |
| **Incidents** | `useIncidents` | `localStorage` + Supabase try | `rmc_incidents_data` | `incidents` | **P2 (Medium)** |
| **Maintenance** | `useVehicleManagement` | `localStorage` | `rmc_maintenance_records_history`| `maintenance_records` | **P2 (Medium)** |
| **Fuel Management** | `useFuelManagement` | `localStorage` | `rmc_fuel_data` | `fuel_records` | **P3 (Normal)** |
| **Billing** | `useBilling` | `localStorage` | `rmc_billing_data` | `billing_records` | **P3 (Normal)** |
| **Inventory** | `useInventory` | `localStorage` | `rmc_inventory_data` | `inventory_items` | **P3 (Normal)** |
| **Customer Portal** | `useCustomerPortal` | `localStorage` | `rmc_customer_portal` | `customers`<br>`sites` | **P3 (Normal)** |
| **Audit Trail** | `useAuditTrail` | `localStorage` | `rmc_audit_logs` | `audit_logs` | **P3 (Normal)** |
| **Reports** | `useReports` | In-Memory / Computed | N/A | `report_configs` | **P4 (Low)** |
| **Trip Analytics** | `useTripAnalytics` | In-Memory / Computed | N/A | Analytical Queries | **P4 (Low)** |
| **Dashboard** | Page aggregation | In-Memory / Computed | N/A | Multi-table joins | **P4 (Low)** |

---

## Live MySQL Modules

The backend Express app (`server/index.js`) interacts with the database `RMC-SAAS` using the connection pool defined in `server/db.js`.
- Queries use parameterized SQL (`?`) to prevent SQL injection.
- Tables are created automatically on server boot via `initializeDatabase()`.
- API endpoints are centralized under `ApiClient` (`src/lib/api.ts`).

---

## localStorage Mock Modules

Each mock module follows a standard pattern:
1. Loads stored JSON from `localStorage.getItem(STORAGE_KEY)`.
2. If null, initializes with rich mock data simulating real plant operational entities.
3. Provides full synchronous CRUD actions (`addItem`, `updateItem`, `deleteItem`).
4. Whenever state modifies, persists immediately via `localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))`.

---

## Legacy Supabase References

Two hooks contain residual background calls to Supabase:
- `src/hooks/useExitVerification.ts`
- `src/hooks/useIncidents.ts`

### Current Behavior
These hooks execute `supabase.from('...').insert(...)` inside a `try/catch` block. Because no valid Supabase keys are active, the operation fails silently and the hook gracefully falls back to updating `localStorage`.

### Action Item for Engineers
When implementing the MySQL API routes for Exit Verification and Incidents:
1. Remove `import { supabase } from '@/integrations/supabase/client'`.
2. Replace the Supabase call with `apiClient.createExitVerification(...)` or `apiClient.createIncident(...)`.

---

## Migration Roadmap to 100% MySQL

To transition a module from `localStorage` to MySQL:

```
┌─────────────────────────┐
│ 1. Verify Table Schema  │ (Tables already exist in RMC-SAAS)
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 2. Create Express Route │ Add GET, POST, PUT, DELETE in server/index.js
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 3. Add to ApiClient     │ Expose methods in src/lib/api.ts
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 4. Refactor Hook        │ Replace localStorage with TanStack Query useQuery/useMutation
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 5. Verify in UI         │ Test create, edit, delete from the page component
└─────────────────────────┘
```

Detailed code templates for this migration are provided in [`ENHANCEMENT-GUIDE.md`](./ENHANCEMENT-GUIDE.md).

