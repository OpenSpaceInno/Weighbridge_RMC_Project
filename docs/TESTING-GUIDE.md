# RMC-SAAS — Testing & Verification Guide

> **Engineering Pack · Quality Assurance & Manual Test Playbook**
> Verification recipes, API curl commands, and end-to-end testing checklists

---

## Table of Contents

1. [Backend API Test Suite (curl)](#backend-api-test-suite-curl)
2. [ANPR & Camera Verification Recipes](#anpr--camera-verification-recipes)
3. [Manual Module Test Checklist](#manual-module-test-checklist)
4. [Database Verification Queries](#database-verification-queries)
5. [End-to-End Simulation Script](#end-to-end-simulation-script)

---

## Backend API Test Suite (curl)

Run these curl commands from PowerShell or bash to verify backend health:

### 1. Health & Database Status
```bash
# Health check
curl http://localhost:3001/api/health

# Database table counts
curl http://localhost:3001/api/db-status

# Re-run idempotent database initialization
curl -X POST http://localhost:3001/api/init-db
```

### 2. Camera Management APIs
```bash
# List all cameras
curl http://localhost:3001/api/cameras

# Get single camera details
curl http://localhost:3001/api/cameras/cam1

# Update camera status
curl -X PUT http://localhost:3001/api/cameras/cam1 \
  -H "Content-Type: application/json" \
  -d '{"status":"online","location":"Main Entry Gate"}'

# Run network diagnostic against camera IP
curl http://localhost:3001/api/cameras/diagnostic/192.168.0.100
```

### 3. RTSP & Network Configurations
```bash
# Get RTSP credentials
curl http://localhost:3001/api/rtsp-config

# Update RTSP credentials for cam1
curl -X PUT http://localhost:3001/api/rtsp-config/cam1 \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Password@123","port":554,"protocol":"tcp"}'

# Get camera network settings
curl http://localhost:3001/api/network-config
```

### 4. ANPR & Detection APIs
```bash
# List recent ANPR events
curl "http://localhost:3001/api/anpr/events?limit=10"

# Trigger a test webhook detection event
curl -X POST http://localhost:3001/api/anpr/webhook-test/cam1

# Simulate a Hikvision camera webhook payload
curl -X POST http://localhost:3001/api/anpr/webhook/cam1 \
  -H "Content-Type: application/json" \
  -d '{"plate":"MH12AB1234","confidence":0.97,"direction":"entry"}'

# Get ANPR settings for cam1
curl http://localhost:3001/api/anpr/config/cam1
```

---

## ANPR & Camera Verification Recipes

### Recipe A: Verifying HLS Video Stream in Browser
1. Ensure MediaMTX is running:
   ```bash
   ./mediamtx.exe
   ```
2. Open VLC Media Player or browser at:
   `http://localhost:8888/cam1/index.m3u8`
3. Verify video stream loads without stutter.

### Recipe B: Simulating Gate Entry Plate Detection
1. Open frontend at `http://localhost:8080/gate-monitor`.
2. In a separate terminal, trigger a simulated plate:
   ```bash
   curl -X POST http://localhost:3001/api/anpr/webhook/cam1 \
     -H "Content-Type: application/json" \
     -d '{"plate":"MH14DE9999","confidence":0.98,"direction":"entry"}'
   ```
3. Look at the **Gate Monitor** UI: The vehicle plate `MH14DE9999` should immediately appear at the top of the detection feed.

---

## Manual Module Test Checklist

| Module | Verification Step | Expected Outcome |
|---|---|---|
| **Gate Monitor** | Visit `/gate-monitor` | Camera feeds display video or test card; recent events table shows entries |
| **Weighbridge** | Perform Gross & Tare weighment | Net weight automatically calculated ($Gross - Tare$); slip prints |
| **Loading Console**| Assign vehicle to Bay 2 with M25 grade | Bay status turns to `Active`; slump field accepts values |
| **Dispatch** | Click "Approve Dispatch" on a ready order | Challan status updates to `Dispatched`; toast notification fires |
| **Trip Tracking** | Open `/trip-tracking` | Leaflet map displays plant center and moving vehicle markers |
| **Vehicles** | Register a new transit mixer | Vehicle appears in table; insurance expiry alert renders |
| **Drivers** | Add new driver with license number | Driver added to active roster; status shows `Available` |
| **Database Setup**| Open `/database-setup` and click "Verify DB" | Green badge shows 32 tables intact in `RMC-SAAS` |

---

## Database Verification Queries

Connect to MySQL via MySQL CLI or Workbench and run:

```sql
USE `RMC-SAAS`;

-- 1. Check all tables exist (expecting 32 tables)
SELECT COUNT(*) AS total_tables FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'RMC-SAAS';

-- 2. Inspect cameras
SELECT id, name, ip_address, status, anpr_mode FROM camera_devices;

-- 3. Inspect latest 10 ANPR events
SELECT id, camera_id, plate, confidence, direction, timestamp 
FROM anpr_events 
ORDER BY timestamp DESC 
LIMIT 10;

-- 4. Check evidence storage
SELECT e.id, e.event_id, a.plate, e.captured_at
FROM anpr_evidence e
JOIN anpr_events a ON e.event_id = a.id
ORDER BY e.captured_at DESC
LIMIT 5;
```

---

## End-to-End Simulation Script

You can save this script as `server/test-workflow.js` to simulate a complete gate-to-exit cycle:

```javascript
// Run with: node test-workflow.js
import axios from 'axios';

const BASE = 'http://localhost:3001/api';

async function runSimulation() {
  console.log('--- Starting Gate-to-Exit Simulation ---');
  
  // 1. Health check
  const health = await axios.get(`${BASE}/health`);
  console.log('1. Health check:', health.data.status);

  // 2. Gate Entry Detection
  const entry = await axios.post(`${BASE}/anpr/webhook/cam1`, {
    plate: 'MH12XX5555',
    confidence: 0.96,
    direction: 'entry'
  });
  console.log('2. Entry ANPR logged:', entry.data.plate, 'Event ID:', entry.data.eventId);

  // 3. Query events
  const events = await axios.get(`${BASE}/anpr/events?limit=1`);
  console.log('3. Verified latest event in DB:', events.data[0].plate);

  console.log('--- Simulation Completed Successfully ---');
}

runSimulation().catch(console.error);
```

