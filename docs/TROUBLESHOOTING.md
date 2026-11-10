# RMC-SAAS — Troubleshooting & Diagnostics Guide

> **Engineering Pack · Operational Incident Resolution**
> Common failure modes, root cause analyses, and verified fixes

---

## Table of Contents

1. [Database & MySQL Issues](#database--mysql-issues)
2. [Network & Port Conflicts](#network--port-conflicts)
3. [Camera Streaming & MediaMTX](#camera-streaming--mediamtx)
4. [ANPR Recognition Issues](#anpr-recognition-issues)
5. [Frontend & Build Issues](#frontend--build-issues)
6. [Windows PowerShell Quirks](#windows-powershell-quirks)

---

## Database & MySQL Issues

### 1. `ER_SYNTAX_ERROR: ... near '-SAAS'`
- **Root Cause:** The database name `RMC-SAAS` contains a hyphen. MySQL interprets unquoted hyphens as minus arithmetic operators.
- **Fix:** Always wrap the database name in backticks:
  ```sql
  -- Incorrect:
  USE RMC-SAAS;
  
  -- Correct:
  USE `RMC-SAAS`;
  ```
  In Node.js `mysql2`, connection parameters (`database: 'RMC-SAAS'`) handle this automatically, but raw DDL statements inside `server/db.js` must use backticks.

### 2. `ER_ACCESS_DENIED_ERROR for user 'root'@'localhost'`
- **Root Cause:** Incorrect password specified in `server/.env`.
- **Fix:**
  1. Open `server/.env`.
  2. Verify `DB_PASSWORD` matches your local MySQL root password.
  3. Test connection in command prompt:
     ```bash
     mysql -u root -p
     ```

### 3. `ECONNREFUSED 127.0.0.1:3306`
- **Root Cause:** MySQL Windows service is stopped.
- **Fix (PowerShell as Admin):**
  ```powershell
  Start-Service MySQL80
  ```

---

## Network & Port Conflicts

### 1. Port 3001 (Backend) Already in Use
- **Symptoms:** Server startup fails with `EADDRINUSE :::3001`.
- **Fix (Windows PowerShell):**
  ```powershell
  # Find process holding port 3001
  Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess

  # Stop the process (replace PID)
  Stop-Process -Id <PID> -Force
  ```

### 2. Port 8080 (Vite Frontend) Jumps to 8081
- **Root Cause:** Another tool (such as Apache, Tomcat, or another dev server) occupies port 8080.
- **Fix:** Vite automatically starts on 8081. You can access the app at `http://localhost:8081`. To force 8080, kill the conflicting process on port 8080.

---

## Camera Streaming & MediaMTX

### 1. Video Player Shows Constant Spinner
- **Cause 1: MediaMTX is not running.**
  - **Check:** Run `Get-Process mediamtx -ErrorAction SilentlyContinue`.
  - **Fix:** Start MediaMTX from the project root: `./mediamtx.exe`.
- **Cause 2: RTSP path mismatch.**
  - **Check:** Ensure the camera's `hls_url` in MySQL (`camera_devices`) matches the stream path configured in `mediamtx.yml`. E.g., path `cam1` corresponds to `http://localhost:8888/cam1/index.m3u8`.

### 2. Camera Shows Offline in Gate Monitor
- **Diagnostics:**
  Run the backend diagnostic endpoint:
  ```bash
  curl http://localhost:3001/api/cameras/diagnostic/192.168.0.100
  ```
- **If port 554 is closed:** Camera RTSP service is disabled or camera is powered off.
- **If port 80 is closed:** Camera is unreachable over the IP subnet.

---

## ANPR Recognition Issues

### 1. ANPR Generates Synthetic/Random Plates
- **Root Cause:** No `PLATERECOGNIZER_API_KEY` is set in `server/.env`. The backend defaults to `mock` mode to prevent development disruption.
- **Fix:** Obtain a free API key from [PlateRecognizer.com](https://platerecognizer.com) and add it to `server/.env`:
  ```env
  PLATERECOGNIZER_API_KEY=your_actual_token_here
  ```
  Restart backend: `cd server && node index.js`.

### 2. Camera Webhook Returns `404` or Connection Refused
- **Fix:** Verify the camera's HTTP notification settings point to:
  `http://<SERVER_LAN_IP>:3001/api/anpr/webhook/cam1`
  *(Note: Cameras cannot resolve `localhost` — you must use the server's actual LAN IP, e.g., `192.168.0.50`).*

---

## Frontend & Build Issues

### 1. API Calls Fail With CORS Errors
- **Root Cause:** Backend is missing `cors()` middleware or frontend is connecting to an unallowed domain.
- **Fix:** Verify `server/index.js` contains `app.use(cors())` before any route definitions.

### 2. Browser Console Shows Supabase Errors
- **Root Cause:** Legacy calls inside `useExitVerification.ts` or `useIncidents.ts`.
- **Impact:** **Benign.** Both hooks are wrapped in `try/catch` and gracefully fall back to `localStorage`. You can safely ignore these warnings or follow the migration guide in [`DATA-STORAGE-STRATEGY.md`](./DATA-STORAGE-STRATEGY.md) to migrate them to MySQL.

---

## Windows PowerShell Quirks

1. **Backtick Escaping:**
   In PowerShell, the backtick character (`` ` ``) is the escape character. When passing SQL queries containing backticks to inline commands, PowerShell strips them!
   - **Recommendation:** Do not use `node -e "..."` with embedded SQL in PowerShell. Always put SQL inside `.js` script files and execute `node script.js`.

2. **File Encoding:**
   Always ensure configuration files (`.env`, `mediamtx.yml`) are saved in **UTF-8 without BOM**.

