# RMC-SAAS — Environment Setup Guide

> **Engineering Pack · Developer Onboarding & Local Environment Setup**
> Complete step-by-step instructions to get RMC-SAAS running from scratch

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Clone & Repository Structure](#project-clone--repository-structure)
3. [Database Setup (MySQL 8.0)](#database-setup-mysql-80)
4. [Backend Configuration & Startup](#backend-configuration--startup)
5. [Frontend Configuration & Startup](#frontend-configuration--startup)
6. [MediaMTX RTSP Streaming Setup (Optional)](#mediamtx-rtsp-streaming-setup-optional)
7. [Verification & Sanity Checks](#verification--sanity-checks)
8. [Common Setup Issues](#common-setup-issues)

---

## Prerequisites

Before setting up the project, ensure your workstation has:

- **Node.js**: v18.x, v20.x, or v22.x+ (Recommended: Node.js 20 LTS)
- **npm**: v9.x or higher (comes bundled with Node.js)
- **MySQL Server**: 8.0 or higher running locally on port 3306
- **Git**: For version control
- *(Optional)* **MediaMTX**: If testing live RTSP camera playback
- *(Optional)* **PlateRecognizer Account**: Free API key if testing cloud ANPR

---

## Project Clone & Repository Structure

```bash
# Clone the repository
git clone <repository_url> rmc-gate-to-exit-main
cd rmc-gate-to-exit-main

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

---

## Database Setup (MySQL 8.0)

RMC-SAAS handles database creation automatically! You only need to ensure MySQL is running.

### 1. Verify MySQL Service is Running
- **Windows:** Run `Get-Service MySQL80` or start MySQL in Services.
- **Linux/macOS:** `sudo systemctl status mysql` or `brew services list`

### 2. Backtick Notice
> [!IMPORTANT]
> The database name is `RMC-SAAS`. Because it contains a hyphen, all manual SQL scripts must wrap the name in backticks: `` `RMC-SAAS` ``. The backend connection pool in `server/db.js` handles this automatically.

---

## Backend Configuration & Startup

### 1. Create `server/.env`
Navigate to the `server/` directory and configure `.env`:

```bash
cd server
cp .env.example .env
```

Ensure your `.env` contains:
```env
# Server Port
PORT=3001

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=RMC-SAAS

# Optional: Cloud ANPR Key (leave blank for mock mode)
PLATERECOGNIZER_API_KEY=
```

### 2. Start the Backend Server
```bash
# Development mode (with auto-restart on changes)
npm run dev

# Or direct node execution
node index.js
```

Expected terminal output:
```
✅ MySQL Database connected successfully!
✅ Database 'RMC-SAAS' ready
✅ Database tables created successfully!
🚀 Server running on http://localhost:3001
📊 API endpoints available at http://localhost:3001/api
🎯 ANPR endpoints available at http://localhost:3001/api/anpr
```

---

## Frontend Configuration & Startup

### 1. Configure `.env` in Project Root
Create or verify `.env` in `rmc-gate-to-exit-main/`:

```env
VITE_API_URL=http://localhost:3001/api
```

### 2. Start Frontend Dev Server
In the root directory:
```bash
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in 450 ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

---

## MediaMTX RTSP Streaming Setup (Optional)

If you are developing or testing camera streams:

1. Download **MediaMTX** from GitHub Releases (e.g., `mediamtx_v1.x.x_windows_amd64.zip`).
2. Extract `mediamtx.exe` and `mediamtx.yml` into the root project directory.
3. Start MediaMTX:
   ```bash
   ./mediamtx.exe
   ```
4. Verify port **8888** is active for HLS streaming.

---

## Verification & Sanity Checks

1. **Backend Health Check:**
   Open browser or run:
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should return: `{"status":"ok","database":"connected","dbName":"RMC-SAAS"}`

2. **Frontend UI:**
   Open [http://localhost:8080](http://localhost:8080) in your browser.
   - Navigate to **Operations > Gate Monitor** to verify camera panels load.
   - Navigate to **System > Database Setup** (`/database-setup`) and verify all 32 tables are recognized.

---

## Common Setup Issues

| Problem | Cause | Solution |
|---|---|---|
| `ER_ACCESS_DENIED_ERROR` | Wrong MySQL password in `server/.env` | Verify credentials using MySQL Workbench or `mysql -u root -p` |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL server is stopped | Start the `MySQL80` service |
| Frontend loads on port `8081` | Port `8080` was already occupied | Vite auto-increments port; check running processes or use port 8081 |
| API calls return `404` or fail | Frontend `VITE_API_URL` misconfigured | Ensure `.env` has `VITE_API_URL=http://localhost:3001/api` and restart frontend |

