# RMC-SAAS — Modules Reference

> **Engineering Pack · Frontend & Functional Modules**
> Detailed breakdown of all 20+ modules in RMC-SAAS

---

## Table of Contents

1. [Navigation & Groupings](#navigation--groupings)
2. [Operations Modules](#operations-modules)
   - [Dashboard](#dashboard)
   - [Gate Monitor](#gate-monitor)
   - [Weighbridge](#weighbridge)
   - [Loading Console](#loading-console)
   - [Dispatch Approval](#dispatch-approval)
3. [Tracking Modules](#tracking-modules)
   - [Trip Management](#trip-management)
   - [Trip Tracking](#trip-tracking)
   - [Trip Analytics](#trip-analytics)
   - [Exit Verification](#exit-verification)
   - [Incidents](#incidents)
   - [Audit Trail](#audit-trail)
4. [Fleet Modules](#fleet-modules)
   - [Vehicle Management](#vehicle-management)
   - [Driver Management](#driver-management)
   - [Fuel Management](#fuel-management)
   - [Maintenance Management](#maintenance-management)
5. [Commercial & External Modules](#commercial--external-modules)
   - [Customer Portal](#customer-portal)
   - [Billing](#billing)
   - [Inventory](#inventory)
   - [Reports](#reports)
6. [System Administration Modules](#system-administration-modules)
   - [Device Config](#device-config)
   - [Database Setup](#database-setup)

---

## Navigation & Groupings

The application uses `src/components/AppSidebar.tsx` to group navigation items into 4 user-facing sections:

- **Operations**: Day-to-day concrete production, weighbridge, and gate workflows.
- **Tracking**: Real-time vehicle location, trip analytics, security checks, and incident response.
- **Fleet**: Vehicles, drivers, preventive/corrective maintenance, and fuel tracking.
- **External / Commercial**: Client portal, billing generation, raw material inventory, and reporting.

---

## Operations Modules

### Dashboard
- **Page Component:** `src/pages/Index.tsx`
- **Data Hook:** Uses aggregations across `useTripManagement`, `useVehicleManagement`, `useWeighbridge`, `useGateCameras`
- **Storage:** Dynamic computed state from hooks (in-memory / localStorage / live API)
- **Features:**
  - High-level KPI cards: Active Trips, Trucks at Plant, Plant Utilization, Daily Dispatched Volume ($m^3$).
  - Live alerts ticker (delays, maintenance warnings, gate anomalies).
  - Quick actions to navigate to Weighbridge, Loading Bay, or Gate Monitor.

### Gate Monitor
- **Page Component:** `src/pages/GateMonitor.tsx`
- **Data Hook:** `src/hooks/useGateCameras.ts`, `src/hooks/useANPREvents.ts`
- **Storage:** ✅ **Live MySQL** (`camera_devices`, `anpr_events`, `anpr_evidence`, `anpr_config`)
- **Features:**
  - Live video streams via HLS (`hls.js`) for Entry Gate (cam1) and Exit Gate (cam2).
  - Real-time ANPR plate recognition feed.
  - Manual plate override dialog and snapshot capture.
  - Gate open/close relay simulation and pass generation.

### Weighbridge (Industrial Terminal)
- **Page Component:** `src/pages/Weighbridge.tsx`
- **Data Hook:** `src/hooks/useWeighbridge.ts`
- **Storage:** 🟢 **Live MySQL** (`weighbridge_sessions`, `weigh_slips`, `anpr_events`)
- **Specification Document:** [`WEIGHBRIDGE-TERMINAL-GUIDE.md`](./WEIGHBRIDGE-TERMINAL-GUIDE.md)
- **Features & Ergonomics:**
  - **Industrial Hardware Ribbon:** Quick shortcuts for Weighment, Reports, Calculator, Camera 1, and Camera 2 toggles.
  - **7-Segment Digital Weight Indicator:** Large 6-digit LED display (`000000`) with live STABLE / ZERO / GROSS telemetry.
  - **Transaction Browser:** Transaction navigation (`◀ [ No ] ▶`) with automatic sequential ID generation and state recovery.
  - **Two-Column Industrial Form:** Vehicle No (with fleet search/ANPR link), Party Name, Product/Mix Grade, Status, Firm Name, Rate, Moisture %, Deductions, Weighment Charges, Vehicle Type, Bags/Bales/m³, Agent, Site/Village, Challan/Chess No, Chess Amount, and Chess Name.
  - **Dual Live Camera Previews & ANPR:** Multi-angle RTSP IP cameras (`cam1` Front ANPR on `192.168.0.100`, `cam2` Scale Deck & Chute on `192.168.0.99`) streaming HLS via MediaMTX (`:8888`), with connection bars, manual Start/Stop controls, live ANPR OCR plate detection tags, and automatic canvas simulation fallback.
  - **Snapshot Evidence Stack & Automated FTP Sync:** 3-slot vertical snapshot viewports with interactive full-screen previews. When operator clicks **"Get Weight F3"**, camera frames are captured automatically with legal metrology watermarks, saved to disk (`/snapshots/`), and synced directly to the plant FTP server for docket printing.
  - **Dual-Weighment Calculation Matrix:** Structured 1st Weight, 2nd Weight, automated Nett Weight ($|1\text{st} - 2\text{nd}|$), Moisture/Dirt Deductions, Final Rate, and Total Commercial Amount.
  - **Single-Key Function Hotkeys (F1–F7):**
    - `F1 New`: Clear / New ticket
    - `F2 Save`: Persist to MySQL without printing
    - `F3 Get Weight`: High-contrast primary action to latch stable weight into 1st or 2nd weighment
    - `F4 Save & Print`: Commit session and trigger formal slip printing with QR code and dual camera photos
    - `F5 Print`: Reprint current transaction slip
    - `F7 Close`: Safe cancellation
    - `E-Mail`: PDF docket dispatch to customer/accounts
  - **Print Customization:** Checkbox controls for Print Duplicate, Print QR Code, and Print Camera Images.
  - **Today Pending Vehicles Drawer:** Real-time counter and quick-load drawer of vehicles awaiting 2nd weight.

### Loading Console
- **Page Component:** `src/pages/LoadingConsole.tsx`
- **Data Hook:** `src/hooks/useLoadingConsole.ts`
- **Storage:** 🟡 `localStorage` (`rmc_loading_bays`) — Target DB: `loading_bay_assignments`
- **Features:**
  - Bay status cards (Idle, Loading, Maintenance).
  - Mix recipe allocation (e.g., M25, M30, M40 concrete grades).
  - Slump measurement logging and moisture correction.
  - Batching plant status monitor and emergency stop indicator.

### Dispatch Approval
- **Page Component:** `src/pages/DispatchApproval.tsx`
- **Data Hook:** `src/hooks/useDispatch.ts`
- **Storage:** 🟡 `localStorage` (`rmc_dispatch_approvals`) — Target DB: `dispatch_approvals`
- **Features:**
  - Pre-dispatch checklist: Quality control check, customer credit limit verification.
  - One-click approval / rejection workflow with comments.
  - Automatic delivery challan PDF generation.

---

## Tracking Modules

### Trip Management
- **Page Component:** `src/pages/TripManagement.tsx`
- **Data Hook:** `src/hooks/useTripManagement.ts`
- **Storage:** 🟡 `localStorage` (`rmc_trips_data`) — Target DB: `trips`, `trip_events`
- **Features:**
  - Master schedule table for all orders and dispatched vehicles.
  - Status transitions: `Scheduled` -> `Loading` -> `Dispatched` -> `In Transit` -> `Delivered` -> `Returning` -> `Completed`.
  - Manual trip cancellation and rerouting.

### Trip Tracking
- **Page Component:** `src/pages/TripTracking.tsx`
- **Data Hook:** `src/hooks/useTripTracking.ts`
- **Storage:** 🟡 `localStorage` (`rmc_trip_tracking`) — Target DB: `trip_waypoints`
- **Features:**
  - Interactive Leaflet map displaying real-time vehicle GPS positions.
  - Route replay, route deviation alerts, and ETA predictions.
  - Concrete shelf-life countdown (typically alert if in-transit > 90 mins).

### Trip Analytics
- **Page Component:** `src/pages/TripAnalytics.tsx`
- **Data Hook:** `src/hooks/useTripAnalytics.ts`
- **Storage:** In-memory calculations over trip history
- **Features:**
  - Turnaround time (TAT) distribution histograms.
  - Lead-time breakdown: Loading time vs transit time vs unloading time.
  - Delay categorization (traffic, customer site readiness, breakdown).

### Exit Verification
- **Page Component:** `src/pages/ExitVerification.tsx`
- **Data Hook:** `src/hooks/useExitVerification.ts`
- **Storage:** 🟡 `localStorage` (`rmc_exit_verifications`) — Target DB: `exit_verifications` (legacy Supabase fallback)
- **Features:**
  - Security inspection before barrier lifts: Drum seal intactness, safety cones, PPE compliance.
  - Digital signature capture for gate security officer.

### Incidents
- **Page Component:** `src/pages/Incidents.tsx`
- **Data Hook:** `src/hooks/useIncidents.ts`
- **Storage:** 🟡 `localStorage` (`rmc_incidents_data`) — Target DB: `incidents` (legacy Supabase fallback)
- **Features:**
  - Safety incident reporting (spills, mechanical failures, site accidents).
  - Severity classification (Low, Medium, High, Critical).
  - Photographic evidence attachment and resolution log.

### Audit Trail
- **Page Component:** `src/pages/AuditTrail.tsx`
- **Data Hook:** `src/hooks/useAuditTrail.ts`
- **Storage:** 🟡 `localStorage` (`rmc_audit_logs`) — Target DB: `audit_logs`
- **Features:**
  - Immutable changelog tracking operations across trips, overrides, and user actions.
  - Search and filter by Entity, User, Action, and Date range.

---

## Fleet Modules

### Vehicle Management
- **Page Component:** `src/pages/VehicleManagement.tsx`
- **Data Hook:** `src/hooks/useVehicleManagement.ts`
- **Storage:** 🟡 `localStorage` (`rmc_vehicles_data`) — Target DB: `vehicles`
- **Features:**
  - Fleet inventory: Concrete transit mixers, cement bulkers, boom pumps.
  - Document validity alerts (Insurance, Fitness Certificate, Road Tax, National Permit).
  - Current status (Available, In Transit, Under Maintenance).

### Driver Management
- **Page Component:** `src/pages/DriverManagement.tsx`
- **Data Hook:** `src/hooks/useDriverManagement.ts`
- **Storage:** 🟡 `localStorage` (`rmc_drivers_data`) — Target DB: `drivers`
- **Features:**
  - Driver roster with commercial driving license details.
  - Medical fitness expiry alerts, safety rating, and total completed trips.
  - Driver assignment to vehicles.

### Fuel Management
- **Page Component:** `src/pages/FuelManagement.tsx`
- **Data Hook:** `src/hooks/useFuelManagement.ts`
- **Storage:** 🟡 `localStorage` (`rmc_fuel_data`) — Target DB: `fuel_records`
- **Features:**
  - Fuel refill log: Litres filled, cost per litre, odometer readings.
  - Mileage calculation ($km/l$) and fuel theft/pilferage anomaly detection.

### Maintenance Management
- **Page Component:** `src/pages/Maintenance.tsx`
- **Data Hook:** `src/hooks/useVehicleManagement.ts` (sub-records)
- **Storage:** 🟡 `localStorage` (`rmc_maintenance_records_history`) — Target DB: `maintenance_records`
- **Features:**
  - Preventive maintenance schedules based on odometer or days elapsed.
  - Breakdown logs, spare parts cost tracking, and workshop status.

---

## Commercial & External Modules

### Customer Portal
- **Page Component:** `src/pages/CustomerPortal.tsx`
- **Data Hook:** `src/hooks/useCustomerPortal.ts`
- **Storage:** 🟡 `localStorage` (`rmc_customer_portal`) — Target DB: `customers`, `sites`
- **Features:**
  - Read-only tracking view for client project managers.
  - Live pour tracking, dispatched volume confirmation, and digital delivery receipt downloads.

### Billing
- **Page Component:** `src/pages/Billing.tsx`
- **Data Hook:** `src/hooks/useBilling.ts`
- **Storage:** 🟡 `localStorage` (`rmc_billing_data`) — Target DB: `billing_records`
- **Features:**
  - Invoices generated based on delivered concrete volume ($m^3$) and grade rates.
  - GST / tax calculations and payment status tracking.

### Inventory
- **Page Component:** `src/pages/Inventory.tsx`
- **Data Hook:** `src/hooks/useInventory.ts`
- **Storage:** 🟡 `localStorage` (`rmc_inventory_data`) — Target DB: `inventory_items`
- **Features:**
  - Raw material stock levels: OPC Cement, PPC Cement, Fly Ash, Sand, 10mm Aggregates, 20mm Aggregates, Admixtures.
  - Reorder threshold alerts and replenishment logging.

### Reports
- **Page Component:** `src/pages/Reports.tsx`
- **Data Hook:** `src/hooks/useReports.ts`
- **Storage:** 🟡 In-memory generation / export
- **Features:**
  - PDF and Excel export for daily plant production summary.
  - Vehicle utilization, driver performance, and customer order fulfillment reports.

---

## System Administration Modules

### Device Config
- **Page Component:** `src/pages/DeviceConfig.tsx`
- **Data Hook:** `src/hooks/useDeviceConfig.ts`, `src/hooks/useGateCameras.ts`
- **Storage:** ✅ **Live MySQL** (`camera_devices`, `device_rtsp_config`, `device_network_config`)
- **Features:**
  - IP camera onboarding and parameter configuration.
  - RTSP port, credentials, stream profile selection.
  - Network IP/subnet assignment and TCP port diagnostics.

### Database Setup
- **Page Component:** `src/pages/DatabaseSetup.tsx`
- **Data Hook:** Direct API calls to `POST /api/init-db` and `GET /api/db-status`
- **Storage:** ✅ **Live MySQL**
- **Features:**
  - One-click schema initialisation and verification.
  - Visual status check of database connection and table counts.

### Company & System Settings
- **Page Component:** `src/pages/CompanySettings.tsx`
- **Data Context:** `src/contexts/CompanyContext.tsx`
- **Storage:** 🟢 **Live MySQL** (`company_settings`, `users`, `audit_logs`)
- **Features:**
  - **Company Profile Administration:** Legal company name, trade/firm name, plant unit, address, GSTIN, and contact information.
  - **Dynamic Branding & Logo Engine:** File upload (Data URL) and URL-based logo management with presets and live previews across navigation bars, weighbridge terminal, and weigh dockets.
  - **Weighbridge Hardware & Calibration Defaults:** Legal Metrology license number, scale indicator model (e.g. Avery Weigh-Tronix E1205), capacity (100 MT), division (10 kg), default pricing rate, moisture deduction %, tare allowances, and statutory docket disclaimer footers.
  - **User Security & Credential Management:** Active session overview, authenticated password change tool with password quality verification, and automatic non-repudiation audit logging.
  - **Global Module Synchronization:** Serves as the single source of truth for plant branding across Weighbridge, Gate Monitor, Invoices, and Reports.

### User & RBAC Security
- **Page Component:** `src/pages/UserManagement.tsx`
- **Data Hook:** `src/hooks/useAuth.ts`
- **Storage:** 🟢 **Live MySQL** (`users`, `roles`)
- **Features:**
  - Complete user lifecycle management (Create, Edit, Deactivate).
  - Role-based permissions matrix for 8 plant operational personas.
  - Dynamic route and action-level authorization.

