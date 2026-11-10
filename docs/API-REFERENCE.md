# RMC-SAAS — API Reference

> **Engineering Pack · Backend API Reference**
> Express 4.x · Base URL: `http://localhost:3001/api`

---

## Table of Contents

1. [General Conventions](#general-conventions)
2. [Health & Database](#health--database)
3. [Camera Management](#camera-management)
4. [Device Configuration](#device-configuration)
5. [ANPR (License Plate Recognition)](#anpr-license-plate-recognition)
6. [Weighbridge & Industrial Scale Terminal](#weighbridge--industrial-scale-terminal)
7. [Company Settings & Account Security](#company-settings--account-security)

---

## General Conventions

### Base URL

```
http://localhost:3001/api
```

Configured via `VITE_API_URL` environment variable in the frontend (`.env`).

### Response Format

All endpoints return JSON. On success:
```json
{ "field": "value", ... }
```

On error:
```json
{ "error": "Error message string" }
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / validation error |
| `404` | Resource not found |
| `500` | Server error (see `error` field) |

### Request Headers

For endpoints accepting a body:
```
Content-Type: application/json
```

For file upload endpoints:
```
Content-Type: multipart/form-data
```

---

## Health & Database

### `GET /api/health`

Returns server and database health status.

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "dbName": "RMC-SAAS",
  "timestamp": "2026-10-29T10:00:00.000Z"
}
```

**Curl:**
```bash
curl http://localhost:3001/api/health
```

---

### `POST /api/init-db`

Initializes all database tables (idempotent — safe to call multiple times). Called automatically by the Database Setup page.

**Response:**
```json
{
  "success": true,
  "message": "Database initialized successfully",
  "tables": ["camera_devices", "device_rtsp_config", "..."]
}
```

**Curl:**
```bash
curl -X POST http://localhost:3001/api/init-db
```

---

### `GET /api/db-status`

Returns count of records in each key table.

**Response:**
```json
{
  "cameras": 3,
  "anprEvents": 142,
  "anprEventsToday": 18
}
```

---

## Camera Management

### `GET /api/cameras`

Returns all cameras with their RTSP and network configurations.

**Response:**
```json
[
  {
    "id": "cam1",
    "name": "Entry Gate Camera",
    "location": "Main Gate",
    "ip_address": "192.168.0.100",
    "rtsp_url": "rtsp://admin:pass@192.168.0.100:554/Streaming/Channels/101",
    "hls_url": "http://localhost:8888/cam1/index.m3u8",
    "status": "online",
    "type": "ip_camera",
    "manufacturer": "Hikvision",
    "model": "DS-2CD2143G2-I",
    "has_anpr": true,
    "anpr_mode": "cloud",
    "created_at": "2026-10-01T00:00:00.000Z"
  }
]
```

**Curl:**
```bash
curl http://localhost:3001/api/cameras
```

---

### `GET /api/cameras/:id`

Returns a single camera by ID.

**Curl:**
```bash
curl http://localhost:3001/api/cameras/cam1
```

---

### `POST /api/cameras`

Creates a new camera device.

**Request Body:**
```json
{
  "id": "cam3",
  "name": "Exit Gate Camera",
  "location": "Rear Exit",
  "ip_address": "192.168.0.103",
  "rtsp_url": "rtsp://admin:pass@192.168.0.103:554/Streaming/Channels/101",
  "hls_url": "http://localhost:8888/cam3/index.m3u8",
  "manufacturer": "Hikvision",
  "model": "DS-2CD2143G2-I",
  "has_anpr": true,
  "anpr_mode": "cloud"
}
```

**Response:** `201` with the created camera object.

**Curl:**
```bash
curl -X POST http://localhost:3001/api/cameras \
  -H "Content-Type: application/json" \
  -d '{"id":"cam3","name":"Exit Gate Camera","ip_address":"192.168.0.103"}'
```

---

### `PUT /api/cameras/:id`

Updates an existing camera. Accepts any subset of camera fields.

**Curl:**
```bash
curl -X PUT http://localhost:3001/api/cameras/cam1 \
  -H "Content-Type: application/json" \
  -d '{"status":"online","hls_url":"http://localhost:8888/cam1/index.m3u8"}'
```

---

### `DELETE /api/cameras/:id`

Deletes a camera and its related RTSP config, network config, and ANPR config (CASCADE).

**Curl:**
```bash
curl -X DELETE http://localhost:3001/api/cameras/cam3
```

---

### `GET /api/cameras/diagnostic/:ip`

Runs a TCP connectivity diagnostic against the camera IP (probes ports 554, 80, 8000).

**Parameters:**
- `ip` — IP address of the camera (e.g., `192.168.0.100`)

**Response:**
```json
{
  "ip": "192.168.0.100",
  "reachable": true,
  "ports": {
    "554": true,
    "80": true,
    "8000": false
  },
  "latency_ms": 12
}
```

**Curl:**
```bash
curl http://localhost:3001/api/cameras/diagnostic/192.168.0.100
```

---

## Device Configuration

### `GET /api/rtsp-config`

Returns RTSP configuration for all cameras.

**Response:**
```json
[
  {
    "camera_id": "cam1",
    "username": "admin",
    "password": "Password@123",
    "port": 554,
    "stream_profile": "main",
    "protocol": "tcp",
    "timeout": 30
  }
]
```

**Curl:**
```bash
curl http://localhost:3001/api/rtsp-config
```

---

### `PUT /api/rtsp-config/:cameraId`

Updates RTSP configuration for a camera.

**Request Body:**
```json
{
  "username": "admin",
  "password": "newpassword",
  "port": 554,
  "protocol": "tcp"
}
```

**Curl:**
```bash
curl -X PUT http://localhost:3001/api/rtsp-config/cam1 \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"newpass"}'
```

---

### `GET /api/network-config`

Returns network configuration for all cameras.

**Response:**
```json
[
  {
    "camera_id": "cam1",
    "dhcp": false,
    "ip_address": "192.168.0.100",
    "subnet_mask": "255.255.255.0",
    "gateway": "192.168.0.1",
    "dns_primary": "8.8.8.8",
    "http_port": 80,
    "https_port": 443
  }
]
```

---

### `PUT /api/network-config/:cameraId`

Updates network configuration for a camera.

**Curl:**
```bash
curl -X PUT http://localhost:3001/api/network-config/cam1 \
  -H "Content-Type: application/json" \
  -d '{"dhcp":false,"ip_address":"192.168.0.100","gateway":"192.168.0.1"}'
```

---

## ANPR (License Plate Recognition)

### `POST /api/anpr/init`

Initializes the ANPR processor (sets API key, mode). Called on server start.

**Response:**
```json
{ "success": true, "mode": "cloud" }
```

---

### `GET /api/anpr/events`

Returns all ANPR detection events, newest first.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `cameraId` | string | Filter by camera ID |
| `limit` | integer | Max records (default: 100) |
| `since` | ISO8601 | Events after this timestamp |
| `plate` | string | Filter by plate number (partial match) |

**Response:**
```json
[
  {
    "id": 1,
    "camera_id": "cam1",
    "plate": "MH12AB1234",
    "confidence": 0.94,
    "direction": "entry",
    "vehicle_type": "truck",
    "timestamp": "2026-10-29T08:30:00.000Z",
    "processed": false,
    "trip_id": null
  }
]
```

**Curl:**
```bash
curl "http://localhost:3001/api/anpr/events?limit=20&cameraId=cam1"
```

---

### `GET /api/anpr/events/:id`

Returns a single ANPR event with evidence images.

**Response:**
```json
{
  "id": 1,
  "plate": "MH12AB1234",
  "confidence": 0.94,
  "evidence": [
    {
      "id": 1,
      "image_data": "data:image/jpeg;base64,/9j/4AAQ...",
      "captured_at": "2026-10-29T08:30:00.000Z"
    }
  ]
}
```

---

### `DELETE /api/anpr/events/:id`

Deletes an ANPR event and its evidence.

**Curl:**
```bash
curl -X DELETE http://localhost:3001/api/anpr/events/1
```

---

### `POST /api/anpr/detect`

Accepts an image file or base64 data and runs plate detection.

**Request:** `multipart/form-data`
| Field | Type | Description |
|---|---|---|
| `image` | file | JPEG image file (max 10 MB) |
| `cameraId` | string | Which camera triggered detection |

Or JSON body:
```json
{
  "imageBase64": "data:image/jpeg;base64,...",
  "cameraId": "cam1"
}
```

**Response:**
```json
{
  "success": true,
  "plates": [
    {
      "plate": "MH12AB1234",
      "confidence": 0.94,
      "region": "in",
      "bbox": { "xmin": 120, "ymin": 300, "xmax": 380, "ymax": 380 }
    }
  ],
  "eventId": 42
}
```

**Curl (file upload):**
```bash
curl -X POST http://localhost:3001/api/anpr/detect \
  -F "image=@/path/to/frame.jpg" \
  -F "cameraId=cam1"
```

---

### `GET /api/anpr/config/:cameraId`

Returns ANPR configuration for a specific camera.

**Response:**
```json
{
  "camera_id": "cam1",
  "enabled": true,
  "mode": "cloud",
  "confidence": 0.7,
  "region": "in",
  "webhook_url": null
}
```

**Curl:**
```bash
curl http://localhost:3001/api/anpr/config/cam1
```

---

### `PUT /api/anpr/config/:cameraId`

Updates ANPR configuration for a camera.

**Request Body:**
```json
{
  "enabled": true,
  "mode": "cloud",
  "confidence": 0.8,
  "region": "in"
}
```

**Curl:**
```bash
curl -X PUT http://localhost:3001/api/anpr/config/cam1 \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"confidence":0.8}'
```

---

### `POST /api/anpr/webhook/:cameraId`

Receives ANPR events pushed by the physical camera (Hikvision alarm, etc.).

Supports multiple webhook payload formats:

**Format 1 — Hikvision AlarmInfoPlate:**
```json
{
  "AlarmInfoPlate": {
    "plateNo": "MH12AB1234",
    "picName": "base64_image_data"
  }
}
```

**Format 2 — Generic `plate` field:**
```json
{
  "plate": "MH12AB1234",
  "confidence": 0.95,
  "direction": "entry"
}
```

**Format 3 — Nested `data.plate`:**
```json
{
  "data": {
    "plate": "MH12AB1234"
  }
}
```

**Response:**
```json
{
  "success": true,
  "eventId": 43,
  "plate": "MH12AB1234",
  "confidence": 0.95
}
```

**Curl (simulate webhook):**
```bash
curl -X POST http://localhost:3001/api/anpr/webhook/cam1 \
  -H "Content-Type: application/json" \
  -d '{"plate":"MH12AB1234","confidence":0.95,"direction":"entry"}'
```

---

### `POST /api/anpr/webhook-test/:cameraId`

Fires a test webhook event (simulates a plate detection) for development/testing.

**Response:**
```json
{
  "success": true,
  "message": "Test event created",
  "plate": "TEST1234",
  "eventId": 44
}
```

**Curl:**
```bash
curl -X POST http://localhost:3001/api/anpr/webhook-test/cam1
```

---

## Weighbridge & Industrial Scale Terminal

### `GET /api/weighbridge/sessions`

Returns weighbridge sessions with optional filtering by status, with pagination.

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | string | No | Filter by session status (`pending`, `1st_weight_complete`, `completed`) |
| `limit` | integer | No | Maximum rows to return (default: `50`) |
| `offset` | integer | No | Pagination offset (default: `0`) |

**Response:**
```json
[
  {
    "id": 104,
    "sessionId": "WB-20261102-0002",
    "transactionNo": 2,
    "vehicleRegNo": "MH12AB1234",
    "partyName": "BuildCorp Infra Ltd",
    "product": "M30 Concrete Mix",
    "status": "completed",
    "tareWeight": 14200,
    "grossWeight": 38500,
    "netWeight": 24300,
    "firstWeight": 14200,
    "firstWeightTime": "2026-11-02T08:30:00.000Z",
    "secondWeight": 38500,
    "secondWeightTime": "2026-11-02T09:15:00.000Z",
    "firmName": "Dharani Mills Plant 1",
    "rate": 4200,
    "moisture": 8,
    "deduction": 50,
    "charges": 250,
    "finalRate": 4200,
    "totalAmount": 102100,
    "evidence": ["/snapshots/wb-104-cam1.jpg", "/snapshots/wb-104-cam2.jpg"]
  }
]
```

---

### `GET /api/weighbridge/sessions/:id`

Retrieves a single weighbridge session by its primary ID or `sessionId`.

---

### `POST /api/weighbridge/sessions`

Creates a new weighbridge session or records the 1st/2nd weighment.

**Request Body:**
```json
{
  "transactionNo": 2,
  "vehicleRegNo": "MH12AB1234",
  "partyName": "BuildCorp Infra Ltd",
  "product": "M30 Concrete Mix",
  "firmName": "Dharani Mills Plant 1",
  "firstWeight": 14200,
  "firstWeightTime": "2026-11-02T08:30:00.000Z",
  "secondWeight": 38500,
  "secondWeightTime": "2026-11-02T09:15:00.000Z",
  "tareWeight": 14200,
  "grossWeight": 38500,
  "netWeight": 24300,
  "rate": 4200,
  "moisture": 8,
  "deduction": 50,
  "charges": 250,
  "vehicleType": "Transit Mixer 6m3",
  "bagsBales": "6 m3",
  "agent": "Rajesh Kumar",
  "village": "Wakad Site 4",
  "chessNo": "CH-8821",
  "chessAmount": 500,
  "chessName": "Panchayat Cess",
  "finalRate": 4200,
  "totalAmount": 102100,
  "status": "completed",
  "evidence": ["/snapshots/cam1.jpg", "/snapshots/cam2.jpg"]
}
```

---

### `PUT /api/weighbridge/sessions/:id`

Updates an existing session (e.g. recording the 2nd weight on a return vehicle).

---

### `GET /api/weighbridge/next-transaction-no`

Returns the sequential auto-incrementing transaction number for the terminal display `◀ [ No ] ▶`.

**Response:**
```json
{
  "nextTransactionNo": 3
}
```

---

### `GET /api/weighbridge/pending-vehicles`

Returns all vehicles currently awaiting 2nd weight today. Used by the "Today Pending Vehicles" drawer to quickly load a session with one click.

**Response:**
```json
[
  {
    "transactionNo": 2,
    "vehicleRegNo": "MH12AB1234",
    "partyName": "BuildCorp Infra Ltd",
    "firstWeight": 14200,
    "firstWeightTime": "2026-11-02T08:30:00.000Z",
    "product": "M30 Concrete Mix",
    "status": "pending_2nd_weight"
  }
]
```

---

### `GET /api/weighbridge/slips` & `POST /api/weighbridge/slips`

Retrieves or persists generated weighment slips with QR codes, itemized commercial breakdown, and camera snapshot links.

---

## Company Settings & Account Security

### `GET /api/company-settings`

Retrieves the active corporate profile, branding assets, scale calibration info, and module defaults.

**Response:**
```json
{
  "id": "default_company",
  "companyName": "Dharani Cotton Mills / Aparna RMC Ltd.",
  "firmName": "Dharani Cotton Mills",
  "plantName": "Plant 1 - Main Batching Yard",
  "plantCode": "PLANT_001",
  "tagline": "Certified Electronic Weighbridge & Automated Concrete Dispatch",
  "logoUrl": "data:image/svg+xml;utf8,...",
  "address": "Plot No. 44/2, Phase II, Industrial Estate, Chakan",
  "city": "Pune",
  "state": "Maharashtra",
  "pincode": "411057",
  "phone": "+91 20 2712 8899",
  "email": "weighbridge@dharanimills.com",
  "website": "https://www.dharanimills.com",
  "gstin": "27AAAAA0000A1Z5",
  "weighbridgeLicense": "WB/2026/RMC-449",
  "scaleModel": "Avery Weigh-Tronix E1205",
  "scaleCapacity": "100 MT",
  "scaleDivision": "10 kg",
  "currency": "₹",
  "weighbridgeDefaults": {
    "defaultRate": 7520,
    "defaultMoisture": 8,
    "defaultDeduction": 50,
    "defaultCharges": 250,
    "printDuplicate": false,
    "printQrCode": true,
    "printImages": true
  },
  "invoiceTerms": "1. Payment due within 15 days of invoice date.",
  "weighSlipNotes": "Certified under Legal Metrology Act. Scale calibrated and stamped by Govt. Inspector."
}
```

---

### `PUT /api/company-settings`

Updates corporate profile fields, scale specifications, and default values.

**Request Body:** (Partial updates accepted)
```json
{
  "firmName": "Dharani Cotton Mills",
  "tagline": "Certified High-Precision Weighbridge Terminal & RMC Batching",
  "weighbridgeLicense": "WB/2026/RMC-449",
  "weighbridgeDefaults": {
    "defaultRate": 7520,
    "defaultMoisture": 8,
    "defaultDeduction": 50,
    "defaultCharges": 250,
    "printDuplicate": false,
    "printQrCode": true,
    "printImages": true
  }
}
```

---

### `POST /api/company-settings/logo`

Uploads or sets the company logo (Base64 Data URL or HTTP image link). Updates all modules immediately.

**Request Body:**
```json
{
  "logoUrl": "data:image/svg+xml;utf8,..."
}
```

---

### `POST /api/auth/change-password`

Allows authenticated operators and users to update their login credentials. Verifies existing password and logs an immutable audit event in `audit_logs`.

**Request Body:**
```json
{
  "userId": "USR-001",
  "currentPassword": "current_password",
  "newPassword": "new_secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

### `POST /api/weighbridge/snapshots/upload`

Receives high-resolution base64 multi-camera frames captured automatically when the operator clicks **"Get Weight F3"** (or manual slot click). Decodes binary images, persists them to `public/snapshots/`, serves them statically via Express `/snapshots/`, and automatically syncs them to the configured plant FTP server for document printing.

**Request Body:**
```json
{
  "transactionNo": 42,
  "vehicleRegNo": "MH12RN4501",
  "weight": 34200,
  "images": [
    {
      "camId": "cam1",
      "camName": "Camera 1 (Front ANPR)",
      "angle": "front",
      "dataUrl": "data:image/jpeg;base64,..."
    },
    {
      "camId": "cam2",
      "camName": "Camera 2 (Deck & Chute)",
      "angle": "side",
      "dataUrl": "data:image/jpeg;base64,..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Captured 2 snapshot(s) successfully",
  "snapshots": [
    {
      "id": "ev-wb-1793629079684-0",
      "type": "image",
      "url": "/snapshots/wb-tx42-cam1-1793629079684-0.jpg",
      "angle": "front",
      "camId": "cam1",
      "camName": "Camera 1 (Front ANPR)",
      "timestamp": "2026-11-02T14:05:51.050Z",
      "fileName": "wb-tx42-cam1-1793629079684-0.jpg",
      "ftpStatus": {
        "fileName": "wb-tx42-cam1-1793629079684-0.jpg",
        "success": true,
        "remotePath": "/snapshots/wb-tx42-cam1-1793629079684-0.jpg"
      }
    }
  ],
  "ftpSummary": {
    "enabled": true,
    "success": true,
    "results": [...]
  }
}
```

---

### `POST /api/company-settings/test-ftp`

Tests connection and remote directory accessibility on a remote FTP / FTPS server.

**Request Body:**
```json
{
  "host": "192.168.0.15",
  "port": 21,
  "user": "weighbridge",
  "password": "ftp_password",
  "secure": false,
  "remoteDir": "/snapshots"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connected successfully to FTP server at 192.168.0.15:21! Directory verified (12 items found)."
}
```

---

### `GET /api/weighbridge/live-weight`

Returns the current weight reading from the live scale indicator (or standby zero `00000`).

**Response:**
```json
{
  "weight": 0,
  "unit": "kg",
  "stable": true,
  "zero": true,
  "timestamp": "2026-11-03T11:40:29.804Z",
  "source": "standby",
  "connected": false
}
```

---

### `POST /api/weighbridge/third-party/push`

Inbound webhook for third-party weighbridge desktop software (Avery WinWeigh, Essae, Tulsi, Mettler Toledo).

**Request Body:**
```json
{
  "weight": 24580,
  "unit": "kg",
  "stable": true,
  "source": "Avery E1205 Indicator"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Live weight updated to 24580 kg",
  "reading": {
    "weight": 24580,
    "unit": "kg",
    "stable": true,
    "zero": false,
    "timestamp": "2026-11-03T11:40:55.269Z",
    "source": "Avery E1205 Indicator",
    "connected": true
  }
}
```

---

### `POST /api/weighbridge/third-party/zero`

Zeros the scale indicator back to `00000`.

**Response:**
```json
{
  "success": true,
  "message": "Scale zeroed successfully to 00000",
  "reading": {
    "weight": 0,
    "unit": "kg",
    "stable": true,
    "zero": true,
    "source": "zero_command",
    "connected": true
  }
}
```

---

### `POST /api/weighbridge/third-party/test-source`

Tests communication reachability of a file path (file sync) or TCP host/port (serial device server).

**Request Body (File Monitor):**
```json
{
  "mode": "file_monitor",
  "filePath": "data/live_scale_weight.txt",
  "protocol": "standard_ascii"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "file_monitor",
  "filePath": "D:\\Projects\\rmc-gate-to-exit-main\\rmc-gate-to-exit-main\\data\\live_scale_weight.txt",
  "exists": true,
  "sampleContent": "0",
  "message": "File verified successfully. Current content: \"0\""
}
```

---

## Adding New Endpoints

See [`ENHANCEMENT-GUIDE.md`](./ENHANCEMENT-GUIDE.md) for step-by-step instructions on adding new API routes to `server/index.js` and wiring them to the frontend `ApiClient` class in `src/lib/api.ts`.

