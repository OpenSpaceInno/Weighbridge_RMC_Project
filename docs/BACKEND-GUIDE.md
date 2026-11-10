# RMC-SAAS — Backend Architecture & Developer Guide

> **Engineering Pack · Backend Server Architecture**
> Node.js, Express, ES Modules, and MySQL Connection Pooling

---

## Table of Contents

1. [Backend Overview](#backend-overview)
2. [Server Structure & File Map](#server-structure--file-map)
3. [Database Connection Pools (`server/db.js`)](#database-connection-pools-serverdbjs)
4. [Request Lifecycle & Middleware](#request-lifecycle--middleware)
5. [API Implementation Pattern](#api-implementation-pattern)
6. [ANPR Processing Engine (`server/anpr-processor.js`)](#anpr-processing-engine-serveranpr-processorjs)
7. [Database Migration Strategy](#database-migration-strategy)
8. [Adding a New API Endpoint](#adding-a-new-api-endpoint)
9. [Error Handling & Security Best Practices](#error-handling--security-best-practices)

---

## Backend Overview

The backend is a lightweight, high-performance Node.js REST API server designed to:
- Interface directly with **MySQL 8.0** (`RMC-SAAS`) using connection pooling.
- Manage CCTV camera profiles, RTSP URLs, and network diagnostic tests.
- Ingest camera webhooks and dispatch license plate detection frames.
- Run entirely as native ES Modules (`"type": "module"` in `server/package.json`).

---

## Server Structure & File Map

```
server/
├── index.js               # Application entry point & all REST API routes
├── db.js                  # MySQL connection pools & initializeDatabase()
├── anpr-processor.js      # Plate recognition logic (PlateRecognizer / Mock)
├── migrations/
│   └── anpr_events.sql    # Core ANPR schema definition
├── .env                   # Local server environment config
├── .env.example           # Template for environment configuration
└── package.json           # Dependencies and ES Module definition
```

---

## Database Connection Pools (`server/db.js`)

Connecting to a database with a hyphen in its name (`RMC-SAAS`) requires explicit backtick quoting. `server/db.js` creates **two distinct pools**:

```javascript
// 1. Pool used to create the database if it doesn't already exist
export const poolWithoutDb = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
});

// 2. Main application pool bound to `RMC-SAAS`
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'RMC-SAAS',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
```

### Automatic Bootstrap on Boot
When `node index.js` runs, it calls:
```javascript
import { initializeDatabase } from './db.js';

await initializeDatabase();
```
This routine executes `CREATE DATABASE IF NOT EXISTS \`RMC-SAAS\`` followed by `CREATE TABLE IF NOT EXISTS` for all foundation tables.

---

## Request Lifecycle & Middleware

Requests pass through standard global middlewares configured in `server/index.js`:

```javascript
import express from 'express';
import cors from 'cors';
import multer from 'multer';

const app = express();

// 1. Enable Cross-Origin Resource Sharing for Vite frontend
app.use(cors());

// 2. Parse large JSON payloads (supports base64 image uploads up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Multer memory storage for raw multipart image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file limit
});
```

---

## API Implementation Pattern

All routes follow an explicit `async / await` try-catch pattern with parameterized SQL:

```javascript
// Example: Updating a Camera
app.put('/api/cameras/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ip_address, status, rtsp_url, hls_url } = req.body;

    // Use parameterized queries to prevent SQL injection
    await pool.query(
      `UPDATE camera_devices 
       SET name = COALESCE(?, name),
           ip_address = COALESCE(?, ip_address),
           status = COALESCE(?, status),
           rtsp_url = COALESCE(?, rtsp_url),
           hls_url = COALESCE(?, hls_url),
           updated_at = NOW()
       WHERE id = ?`,
      [name, ip_address, status, rtsp_url, hls_url, id]
    );

    res.json({ success: true, message: 'Camera updated successfully' });
  } catch (error) {
    console.error('Update camera error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## ANPR Processing Engine (`server/anpr-processor.js`)

The `ANPRProcessor` class handles detection:
1. Validates whether `PLATERECOGNIZER_API_KEY` is present in `process.env`.
2. If present, packages image buffers as `multipart/form-data` and issues a `POST` request to `https://api.platerecognizer.com/v1/plate-reader/`.
3. If absent, executes `mockDetection(cameraId)` which returns synthetic Indian plate formats with randomized high confidence for local testing.
4. Detection events are saved in `anpr_events` and binary image frames are saved in `anpr_evidence`.

---

## Database Migration Strategy

When schema changes are needed:
1. Put SQL statements inside `server/db.js` under `initializeDatabase()` with `CREATE TABLE IF NOT EXISTS` or safe column alterations.
2. For one-off batch data fixes, create standalone `.js` scripts in `server/` (e.g., `seed-data.js`), run them via `node seed-data.js`, and delete them after execution.
3. **Never embed raw SQL statements directly in shell commands** on Windows PowerShell to avoid escaping issues with backticks.

---

## Adding a New API Endpoint

To add a new endpoint (e.g., Weighbridge):

1. **Define Route in `server/index.js`:**
   ```javascript
   app.get('/api/weighbridge/sessions', async (req, res) => {
     try {
       const [rows] = await pool.query('SELECT * FROM weighbridge_sessions ORDER BY created_at DESC');
       res.json(rows);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

2. **Add Method to `src/lib/api.ts`:**
   ```typescript
   async getWeighbridgeSessions(): Promise<WeighbridgeSession[]> {
     return this.request<WeighbridgeSession[]>('/weighbridge/sessions');
   }
   ```

3. **Call from Hook / Component:**
   ```typescript
   const { data } = useQuery({
     queryKey: ['weighbridge-sessions'],
     queryFn: () => apiClient.getWeighbridgeSessions(),
   });
   ```

---

## Error Handling & Security Best Practices

1. **SQL Injection Defense:** Always use `?` placeholders with `pool.query(sql, [params])`. Never concatenate raw variables into SQL query strings.
2. **Database Identifiers:** Because the database name has a hyphen (`RMC-SAAS`), whenever referencing database-qualified tables in SQL, always use backticks: `` `RMC-SAAS`.table_name ``.
3. **Graceful Failures:** Log full stack traces on the server (`console.error`), but return clean error objects (`{ error: error.message }`) to the client.
4. **CORS:** Ensure `cors()` is configured with production origin whitelists before exposing port 3001 outside the local plant subnet.

