# RMC-SAAS — Gate-to-Exit Workflow

> **Engineering Pack · Operational Workflow Reference**
> End-to-end vehicle journey through the RMC plant

---

## Overview

The "Gate-to-Exit" workflow represents the complete lifecycle of a concrete delivery vehicle from the moment it enters the plant gates until it exits after delivering concrete to a customer site.

```
ENTRY GATE ──► WEIGHBRIDGE (Tare) ──► LOADING BAY ──► DISPATCH ──► DELIVERY ──► WEIGHBRIDGE (Gross) ──► EXIT GATE
```

---

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          VEHICLE ARRIVAL                                     │
│                                                                               │
│  Physical vehicle approaches gate                                            │
│  Camera captures → ANPR detects plate → auto-lookup in vehicle database     │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GATE ENTRY (Gate Monitor)                               │
│                                                                               │
│  • ANPR event created in MySQL (anpr_events)                                │
│  • Gate pass issued (gate_passes table)                                      │
│  • Vehicle status: ARRIVED                                                   │
│  • Operator can override/correct plate number                                │
│  • Camera: Entry Gate Camera (cam1)                                          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WEIGHBRIDGE TERMINAL (1st Weighment)                     │
│                                                                               │
│  • Vehicle drives onto weighbridge (Empty Mixer for Tare OR Raw Mat for Gross)│
│  • Digital Indicator latching via [F3 Get Weight] (000000 LED display)       │
│  • 1st Weight recorded (weighbridge_sessions.first_weight / tare_weight)     │
│  • Dual RTSP cameras capture vehicle alignment and plate evidence            │
│  • Session status: 1ST_WEIGHT_COMPLETE / AWAITING_2ND                        │
│  • Specification: docs/WEIGHBRIDGE-TERMINAL-GUIDE.md                         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LOADING BAY ASSIGNMENT                                     │
│                                                                               │
│  • Dispatcher assigns vehicle to available loading bay                       │
│  • Bay status: ASSIGNED (loading_bay_assignments)                           │
│  • Concrete grade and quantity specified                                     │
│  • Loading Console operators can see the assignment                         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONCRETE LOADING (Loading Console)                         │
│                                                                               │
│  • RMC batch plant fills the mixer                                           │
│  • Slump test performed (quality check)                                      │
│  • Actual loaded quantity recorded                                           │
│  • Trip status: LOADED                                                       │
│  • Bay status: RELEASED                                                      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DISPATCH APPROVAL                                          │
│                                                                               │
│  • Supervisor reviews loaded quantity vs ordered quantity                    │
│  • Delivery challan / job ticket generated                                   │
│  • Approval recorded (dispatch_approvals)                                    │
│  • Trip status: DISPATCHED                                                   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TRANSIT (Trip Tracking)                                    │
│                                                                               │
│  • Vehicle leaves plant                                                       │
│  • GPS waypoints recorded (trip_waypoints)                                   │
│  • Trip events logged (trip_events: started, milestone, delay)              │
│  • Estimated arrival calculated                                              │
│  • Trip status: IN_TRANSIT                                                   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DELIVERY (Customer Site)                                   │
│                                                                               │
│  • Driver pours concrete at customer site                                    │
│  • Delivery confirmed (by driver or site manager)                            │
│  • Trip status: DELIVERED                                                    │
│  • Return journey begins                                                     │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WEIGHBRIDGE TERMINAL (2nd Weighment & Settlement)        │
│                                                                               │
│  • Vehicle returns to weighbridge (Loaded Mixer for Gross OR Dumped for Tare) │
│  • Quick-select from "Today Pending Vehicles" drawer                         │
│  • 2nd Weight recorded via [F3 Get Weight] with exact date/time timestamp    │
│  • Automated Nett Calculation: |1st Weight - 2nd Weight|                     │
│  • Deductions applied: Moisture % + Dirt/Impurity kg                         │
│  • Final Weight = Nett - Deduction - (Nett * Moisture / 100)                 │
│  • Total Commercial Amount = (Final Weight / 1000) * Final Rate + Charges     │
│  • [F4 Save & Print] generates weigh slip with QR code and dual camera photos │
│  • Weighbridge session status: COMPLETE                                      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXIT VERIFICATION                                          │
│                                                                               │
│  • Gate supervisor checks:                                                   │
│    - Drum seal intact                                                        │
│    - Documents complete (challan, test report)                               │
│    - Payment cleared (if COD)                                                │
│  • Exit verification recorded (exit_verifications)                          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXIT GATE                                                  │
│                                                                               │
│  • ANPR captures plate at exit                                               │
│  • Exit gate pass issued                                                     │
│  • Trip status: COMPLETED                                                    │
│  • Audit log entry created                                                   │
│  • Camera: Exit Gate Camera (cam2)                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Mapping

| Workflow Stage | Frontend Module | Page | Hook |
|---|---|---|---|
| Gate Entry | Gate Monitor | `GateMonitor.tsx` | `useGateCameras`, `useANPREvents` |
| Tare Weighing | Weighbridge | `Weighbridge.tsx` | `useWeighbridge` |
| Bay Assignment | Loading Console | `LoadingConsole.tsx` | `useLoadingConsole` |
| Concrete Loading | Loading Console | `LoadingConsole.tsx` | `useLoadingConsole` |
| Dispatch Approval | Dispatch Approval | `DispatchApproval.tsx` | `useDispatch` |
| Transit Tracking | Trip Tracking | `TripTracking.tsx` | `useTripTracking` |
| Trip Management | Trip Management | `TripManagement.tsx` | `useTripManagement` |
| Trip Analytics | Trip Analytics | `TripAnalytics.tsx` | `useTripAnalytics` |
| Exit Verification | Exit Verification | `ExitVerification.tsx` | `useExitVerification` |
| Audit Trail | Audit Trail | `AuditTrail.tsx` | `useAuditTrail` |
| Incidents | Incidents | `Incidents.tsx` | `useIncidents` |
| Billing | Billing | `Billing.tsx` | `useBilling` |
| Customer Portal | Customer Portal | `CustomerPortal.tsx` | `useCustomerPortal` |

---

## Trip Status State Machine

```
         ┌──────────┐
         │ SCHEDULED│ (trip created, not yet started)
         └─────┬────┘
               │
               ▼
         ┌──────────┐
         │ LOADING  │ (vehicle at loading bay)
         └─────┬────┘
               │
               ▼
         ┌──────────┐
         │  LOADED  │ (concrete loaded, awaiting dispatch approval)
         └─────┬────┘
               │
               ▼
         ┌──────────┐
         │DISPATCHED│ (approved, vehicle leaving plant)
         └─────┬────┘
               │
               ▼
         ┌──────────┐
         │IN_TRANSIT│ (vehicle en route to site)
         └─────┬────┘
               │
               ▼
         ┌──────────┐
         │DELIVERED │ (concrete poured at site)
         └─────┬────┘
               │
               ▼
         ┌──────────┐
         │RETURNING │ (empty vehicle returning to plant)
         └─────┬────┘
               │
               ▼
         ┌──────────┐
         │COMPLETED │ (vehicle exited gate)
         └──────────┘

         At any stage → CANCELLED (with reason)
```

---

## Data Created Per Trip

| Stage | Data Written |
|---|---|
| Gate Entry | `anpr_events`, `gate_passes` |
| Trip Creation | `trips` (status: scheduled) |
| Tare Weighing | `weighbridge_sessions` (tare_weight) |
| Bay Assignment | `loading_bay_assignments` |
| Loading Complete | `trips.loaded_qty`, bay released |
| Dispatch | `dispatch_approvals`, `trips.status = dispatched` |
| Transit | `trip_waypoints` (GPS), `trip_events` (milestones) |
| Delivery | `trips.delivery_time`, `trips.status = delivered` |
| Gross Weighing | `weighbridge_sessions.gross_weight`, session complete |
| Exit Verification | `exit_verifications` |
| Exit Gate | `anpr_events`, `gate_passes` (exit), `trips.status = completed` |
| Billing | `billing_records`, `invoice_line_items` |
| Audit | `audit_logs` entries throughout |

---

## Key Business Rules

1. **One active trip per vehicle** — a vehicle cannot be assigned to a new trip while the previous is IN_TRANSIT or LOADING
2. **Nett weight = Gross − Tare** — computed by MySQL generated column, not application code
3. **Dispatch approval required** — trips cannot be marked DISPATCHED without an approved `dispatch_approvals` record
4. **Exit verification required** — best practice before marking COMPLETED (currently optional in mock implementation)
5. **ANPR is advisory** — plate detected by ANPR can be overridden by operator
6. **Concrete is time-critical** — typically 90 minutes usable life; transit time monitored against this

