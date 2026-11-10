# RMC-SAAS — Database Reference

> **Engineering Pack · Database Reference**
> MySQL 8.0 · Database: `RMC-SAAS` · 32 Tables

---

## Table of Contents

1. [Connection Details](#connection-details)
2. [Database Initialization](#database-initialization)
3. [Table Inventory](#table-inventory)
4. [Live Tables (MySQL-backed)](#live-tables-mysql-backed)
5. [Pending Migration Tables (exist in DB, not yet API-connected)](#pending-migration-tables)
6. [Key Relationships](#key-relationships)
7. [SQL Quick Reference](#sql-quick-reference)

---

## Connection Details

```
Host:     localhost (or DB_HOST in server/.env)
Port:     3306
Database: RMC-SAAS   ← contains hyphen — always backtick-quote in raw SQL
User:     root (or DB_USER in server/.env)
Password: (DB_PASSWORD in server/.env)
```

> [!IMPORTANT]
> The database name `RMC-SAAS` **must always be wrapped in backticks** in raw SQL statements:
> ```sql
> USE `RMC-SAAS`;
> SELECT * FROM `RMC-SAAS`.camera_devices;
> ```

### Environment Variables (`server/.env`)

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=RMC-SAAS
PORT=3001
PLATERECOGNIZER_API_KEY=    # Optional — enables real ANPR
```

---

## Database Initialization

The database is **auto-created on first server start** via `server/db.js`:

1. `poolWithoutDb` connects without specifying a database
2. Executes `CREATE DATABASE IF NOT EXISTS \`RMC-SAAS\``
3. `pool` connects to `RMC-SAAS`
4. `initializeDatabase()` runs `CREATE TABLE IF NOT EXISTS` for all 6 core tables
5. `/api/init-db` endpoint (called from Database Setup page) creates additional tables

Tables are **idempotent** — safe to call repeatedly.

---

## Table Inventory

### Summary by Category

| Category | Tables | Status |
|---|---|---|
| Camera & ANPR | camera_devices, device_rtsp_config, device_network_config, anpr_events, anpr_evidence, anpr_config | ✅ Live (API-connected) |
| Operations | weighbridge_sessions, loading_bay_assignments, dispatch_approvals | 🟡 DB exists, needs API |
| Fleet | vehicles, drivers, maintenance_records, fuel_records | 🟡 DB exists, needs API |
| Trips | trips, trip_events, trip_waypoints | 🟡 DB exists, needs API |
| Billing & Finance | billing_records, payment_records, invoice_line_items | 🟡 DB exists, needs API |
| Inventory | inventory_items, inventory_transactions | 🟡 DB exists, needs API |
| Safety | incidents, incident_evidence | 🟡 DB exists, needs API |
| Compliance | audit_logs, gate_passes, exit_verifications | 🟡 DB exists, needs API |
| Reports | report_configs, report_schedules | 🟡 DB exists, needs API |
| Reference | customers, concrete_grades, sites | 🟡 DB exists, needs API |

---

## Live Tables (MySQL-backed)

These 6 tables are fully wired to the Express API and used in production:

### `camera_devices`

Primary registry of all IP cameras connected to the system.

```sql
CREATE TABLE camera_devices (
  id           VARCHAR(50)  PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  location     VARCHAR(200),
  ip_address   VARCHAR(50)  NOT NULL,
  rtsp_url     VARCHAR(500),
  hls_url      VARCHAR(500),
  status       ENUM('online','offline','connecting','error') DEFAULT 'offline',
  type         VARCHAR(50)  DEFAULT 'ip_camera',
  manufacturer VARCHAR(100),
  model        VARCHAR(100),
  resolution   VARCHAR(20),
  fps          INT          DEFAULT 25,
  has_ptz      BOOLEAN      DEFAULT FALSE,
  has_anpr     BOOLEAN      DEFAULT FALSE,
  anpr_mode    ENUM('cloud','local','mock') DEFAULT 'mock',
  anpr_webhook VARCHAR(500),
  last_seen    DATETIME,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `device_rtsp_config`

RTSP-specific configuration per camera (credentials, protocol, stream profile).

```sql
CREATE TABLE device_rtsp_config (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  camera_id       VARCHAR(50) NOT NULL,
  username        VARCHAR(100),
  password        VARCHAR(100),
  port            INT    DEFAULT 554,
  stream_profile  VARCHAR(50) DEFAULT 'main',
  protocol        ENUM('tcp','udp','http') DEFAULT 'tcp',
  timeout         INT    DEFAULT 30,
  FOREIGN KEY (camera_id) REFERENCES camera_devices(id) ON DELETE CASCADE
);
```

### `device_network_config`

Network settings per camera (DHCP, static IP, DNS).

```sql
CREATE TABLE device_network_config (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  camera_id   VARCHAR(50) NOT NULL,
  dhcp        BOOLEAN     DEFAULT TRUE,
  ip_address  VARCHAR(50),
  subnet_mask VARCHAR(50),
  gateway     VARCHAR(50),
  dns_primary VARCHAR(50),
  dns_secondary VARCHAR(50),
  http_port   INT         DEFAULT 80,
  https_port  INT         DEFAULT 443,
  FOREIGN KEY (camera_id) REFERENCES camera_devices(id) ON DELETE CASCADE
);
```

### `anpr_events`

All ANPR plate detection events (from webhooks or manual detection).

```sql
CREATE TABLE anpr_events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  camera_id   VARCHAR(50)  NOT NULL,
  plate       VARCHAR(20)  NOT NULL,
  confidence  FLOAT        NOT NULL,
  direction   ENUM('entry','exit','unknown') DEFAULT 'unknown',
  vehicle_type VARCHAR(50),
  timestamp   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  processed   BOOLEAN      DEFAULT FALSE,
  trip_id     VARCHAR(50),
  FOREIGN KEY (camera_id) REFERENCES camera_devices(id)
);
```

### `anpr_evidence`

Image evidence linked to ANPR events (stores image as base64 or file path).

```sql
CREATE TABLE anpr_evidence (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  event_id    INT     NOT NULL,
  image_data  LONGTEXT,           -- base64-encoded JPEG
  image_path  VARCHAR(500),       -- or filesystem path
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES anpr_events(id) ON DELETE CASCADE
);
```

### `anpr_config`

Per-camera ANPR configuration (confidence threshold, enabled status).

```sql
CREATE TABLE anpr_config (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  camera_id   VARCHAR(50) NOT NULL UNIQUE,
  enabled     BOOLEAN     DEFAULT TRUE,
  mode        ENUM('cloud','local','mock') DEFAULT 'mock',
  confidence  FLOAT       DEFAULT 0.7,
  region      VARCHAR(10) DEFAULT 'in',
  api_key     VARCHAR(200),
  webhook_url VARCHAR(500),
  updated_at  DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (camera_id) REFERENCES camera_devices(id) ON DELETE CASCADE
);
```

---

## Pending Migration Tables

These tables **exist in the `RMC-SAAS` database** but are not yet wired to API endpoints. The frontend uses localStorage mock data for these modules. Migrating to MySQL requires building API endpoints (see [`ENHANCEMENT-GUIDE.md`](./ENHANCEMENT-GUIDE.md)).

### `weighbridge_sessions`

```sql
CREATE TABLE weighbridge_sessions (
  id              VARCHAR(50) PRIMARY KEY,
  vehicle_id      VARCHAR(50),
  registration_no VARCHAR(20) NOT NULL,
  driver_id       VARCHAR(50),
  session_type    ENUM('single','axle') DEFAULT 'single',
  tare_weight     DECIMAL(10,3),
  gross_weight    DECIMAL(10,3),
  nett_weight     DECIMAL(10,3) GENERATED ALWAYS AS (gross_weight - tare_weight),
  unit            VARCHAR(10) DEFAULT 'MT',
  grade           VARCHAR(50),
  site_id         VARCHAR(50),
  customer_id     VARCHAR(50),
  status          ENUM('tare_pending','gross_pending','complete','void') DEFAULT 'tare_pending',
  tare_time       DATETIME,
  gross_time      DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `trips`

```sql
CREATE TABLE trips (
  id              VARCHAR(50) PRIMARY KEY,
  registration_no VARCHAR(20),
  driver_id       VARCHAR(50),
  vehicle_id      VARCHAR(50),
  customer_id     VARCHAR(50),
  site_id         VARCHAR(50),
  grade           VARCHAR(50),
  ordered_qty     DECIMAL(10,3),
  loaded_qty      DECIMAL(10,3),
  status          ENUM('scheduled','loading','loaded','dispatched','in_transit',
                       'delivered','returning','completed','cancelled'),
  dispatch_time   DATETIME,
  delivery_time   DATETIME,
  return_time     DATETIME,
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `vehicles`

```sql
CREATE TABLE vehicles (
  id              VARCHAR(50) PRIMARY KEY,
  registration_no VARCHAR(20) NOT NULL UNIQUE,
  type            ENUM('truck','mixer','tanker','pump') NOT NULL,
  make            VARCHAR(50),
  model           VARCHAR(100),
  year            INT,
  capacity        DECIMAL(10,2),
  capacity_unit   VARCHAR(20) DEFAULT 'ton',
  fuel_type       VARCHAR(20) DEFAULT 'diesel',
  status          ENUM('available','in_transit','loading','maintenance','inactive'),
  current_driver  VARCHAR(100),
  odometer        INT,
  fuel_efficiency DECIMAL(6,2),
  insurance_expiry DATE,
  fitness_expiry  DATE,
  permit_expiry   DATE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `drivers`

```sql
CREATE TABLE drivers (
  id              VARCHAR(50) PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  license_no      VARCHAR(50)  NOT NULL UNIQUE,
  license_type    VARCHAR(20),
  license_expiry  DATE,
  phone           VARCHAR(20),
  emergency_phone VARCHAR(20),
  address         TEXT,
  status          ENUM('available','on_trip','off_duty','suspended'),
  blood_group     VARCHAR(10),
  joined_date     DATE,
  medical_expiry  DATE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Other Pending Tables (abbreviated)

| Table | Key Columns |
|---|---|
| `maintenance_records` | id, vehicle_id, type, scheduled_date, completed_date, cost, technician, status |
| `fuel_records` | id, vehicle_id, driver_id, litres, cost_per_litre, total_cost, odometer, filled_at |
| `incidents` | id, type, severity, location, description, reported_by, status, created_at |
| `audit_logs` | id, action, entity_type, entity_id, user_id, old_value (JSON), new_value (JSON), timestamp |
| `customers` | id, name, contact_person, phone, email, address, gst_no, credit_limit |
| `sites` | id, customer_id, name, address, latitude, longitude, contact_name, contact_phone |
| `concrete_grades` | id, grade_name, cement_ratio, water_ratio, slump, strength, price_per_m3 |
| `billing_records` | id, trip_id, customer_id, amount, tax, total, status, invoice_no, issued_at |
| `inventory_items` | id, name, category, unit, quantity, reorder_level, unit_cost |
| `exit_verifications` | id, trip_id, vehicle_id, seal_intact, documents_ok, verified_by, verified_at |
| `gate_passes` | id, vehicle_id, type (entry/exit), issued_by, issued_at, valid_until |
| `dispatch_approvals` | id, trip_id, approved_by, approved_at, notes, status |
| `loading_bay_assignments` | id, bay_no, vehicle_id, trip_id, assigned_at, released_at, status |
| `report_configs` | id, name, type, schedule, recipients (JSON), filters (JSON) |
| `trip_events` | id, trip_id, type, timestamp, description, location (JSON), created_by |
| `trip_waypoints` | id, trip_id, latitude, longitude, speed, heading, recorded_at |

---

## Key Relationships

```
customers (1) ──── (N) sites
customers (1) ──── (N) trips
customers (1) ──── (N) billing_records

vehicles (1) ──── (N) trips
vehicles (1) ──── (N) maintenance_records
vehicles (1) ──── (N) fuel_records
vehicles (1) ──── (N) weighbridge_sessions

drivers (1) ──── (N) trips
drivers (1) ──── (N) fuel_records

trips (1) ──── (N) trip_events
trips (1) ──── (N) trip_waypoints
trips (1) ──── (1) weighbridge_sessions
trips (1) ──── (1) exit_verifications
trips (1) ──── (1) dispatch_approvals
trips (1) ──── (1) loading_bay_assignments

camera_devices (1) ──── (1) device_rtsp_config
camera_devices (1) ──── (1) device_network_config
camera_devices (1) ──── (1) anpr_config
camera_devices (1) ──── (N) anpr_events
anpr_events (1) ──── (N) anpr_evidence
```

---

## SQL Quick Reference

```sql
-- List all tables
SHOW TABLES IN `RMC-SAAS`;

-- Count records per table
SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'RMC-SAAS'
ORDER BY TABLE_ROWS DESC;

-- Show camera list
SELECT id, name, ip_address, status, has_anpr FROM `RMC-SAAS`.camera_devices;

-- Recent ANPR events
SELECT e.plate, e.confidence, e.direction, e.timestamp, c.name AS camera
FROM `RMC-SAAS`.anpr_events e
JOIN `RMC-SAAS`.camera_devices c ON e.camera_id = c.id
ORDER BY e.timestamp DESC
LIMIT 20;

-- Check table structure
DESCRIBE `RMC-SAAS`.camera_devices;

-- Clear ANPR events (testing)
DELETE FROM `RMC-SAAS`.anpr_events WHERE processed = 0;
```

