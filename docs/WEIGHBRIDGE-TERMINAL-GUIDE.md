# RMC-SAAS — Industrial Weighbridge Terminal Guide & Specification

> **Engineering Pack · Operational Hardware & Terminal Integration**
> Module: `src/pages/Weighbridge.tsx` · Dual-Camera ANPR · Digital Indicator Telemetry · Function Hotkeys (F1–F7)

---

## 1. Overview & Terminal Purpose

The **Industrial Weighbridge Terminal** is a specialized, high-throughput operator workstation designed for Ready Mix Concrete (RMC) batching plants, quarry aggregates, and bulk raw materials. It replicates the ergonomic standard of dedicated weighbridge software (Avery India, Rice Lake, Essae) while providing cloud/local MySQL persistence, automated ANPR plate recognition, dual live IP/RTSP camera feeds, and automated gross/tare/nett calculations.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ APARNA RMC / DHARANI MILLS    [⚖ Weighment] [🖹 Reports] [🖩 Calc] [📷 Cam1] [📷 Cam2]  │
│ [Master] [Weighment] [Reports] [Tools] [Settings] [Help] [Exit]                        │
├─────────────────────────────────────────────────┬───────┬──────────────────────────────┤
│  Transaction No: ◀ [ 0002 ] ▶                    │ Snap- │  CAMERA 1                    │
│  Vehicle No *   [ MH12AB1234 ] [✓] Search        │ shots │  [ Live RTSP Viewport ]      │
│  Party Name *   [ BuildCorp Infra Ltd       ]    │ ┌───┐ │  IP: 192.168.0.153 | Port: 80│
│  Product        [ M30 Concrete Mix          ]    │ │ 1 │ │──────────────────────────────┤
│  Charges        [ ₹ 250.00                  ]    │ ├───┤ │  CAMERA 2                    │
│  Rate / Moisture[ ₹ 4,200.00 / 8.0%         ]    │ │ 2 │ │  [ Live RTSP Viewport ]      │
│  Deductions     [ 50.00 kg                  ]    │ └───┘ │  IP: 192.168.0.153 | Port: 80│
├─────────────────────────────────────────────────┴───────┴──────────────────────────────┤
│  1st Weight: [ 14,200 kg ] @ 2026-11-02 08:30  │ Date & Time: [ 2026-11-02 08:30 ]     │
│  2nd Weight: [ 38,500 kg ] @ 2026-11-02 09:15  │ Date & Time: [ 2026-11-02 09:15 ]     │
│  Nett Weight: 24,300 kg                         │ Final Rate:  ₹ 4,200.00 / ton         │
│  Final Weight: 24,250 kg (After Deductions)     │ Total Amount: ₹ 1,02,100.00           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ ] Duplicate  [ ] QR Code  [x] Images │ [F1 New] [F4 Save&Print] [F3 GET WEIGHT]       │
│ Moisture: [ 8 ]%   Rate: [ ₹7520 ]     │ [F2 Save] [F5 Print] [F7 Close] [E-Mail]       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Layout & Architecture

The terminal screen is organized into five integrated functional zones:

### 2.1 Header & Digital Telemetry Ribbon
- **Plant Branding:** Header logo and firm identification dynamically driven by [`CompanyContext`](../src/contexts/CompanyContext.tsx) and MySQL `company_settings` (`Dharani Cotton Mills`, `Aparna RMC`, etc.).
- **Quick Icon Actions:**
  - `Weighment`: Primary scale workstation tab.
  - `Reports`: Direct shortcut to daily weighment register and shift dockets.
  - `Calculator`: Popup floating calculator for tare adjustments and cubic-meter conversions.
  - `Camera1` / `Camera2`: One-click toggle between live streams and snapshot previews.
- **Large Digital Scale LED / 7-Segment Weight Display:**
  - Prominent 6-digit high-contrast display (`000000` or live reading e.g. `024580` kg).
  - High visibility color coding: Bright cyan/green on black background.
  - Real-time indicator flags: `STABLE`, `ZERO`, `GROSS`, `TARE`.
- **Today Pending Vehicles Widget:**
  - Header badge and flyout drawer showing all vehicles currently in the plant awaiting second weighment (Gross or Tare).
- **Ribbon Menu:**
  - `Master` (Vehicles, Customers, Products, Transporters).
  - `Weighment` (1st Weight, 2nd Weight, Re-weighment, Cancellation).
  - `Reports` (Daily Register, Vehicle Ledger, Material Summary).
  - `Tools` (Zero Scale, Calibration Diagnostics, Camera Diagnostics).
  - `Settings` (Navigates directly to Company & System Settings `/settings`: Corporate Logo, Metrology License, Printer Defaults, Password Management).
  - `Help` & `Exit`.

### 2.2 Transaction Navigator
- Displays the sequential `Transaction No` (e.g., `0002`).
- Navigation buttons (`◀` Previous, `▶` Next) to inspect past transactions or load open pending tickets.
- Status badge: `Pending 2nd Weight`, `Completed`, or `Cancelled`.

### 2.3 Dual-Column Form Data Entry
- **Left Column:**
  - `Vehicle No *`: Required vehicle registration number with automatic fuzzy-matching against registered fleet in MySQL and live ANPR camera detections.
  - `Party Name *`: Customer, Supplier, or Consignee name.
  - `Product`: Concrete mix grade (M20, M25, M30, M35, M40) or raw material (10mm Aggregate, 20mm Aggregate, M-Sand, OPC 53 Cement).
  - `Status`: Current weighment stage.
  - `FirmName`: Operating enterprise / transporter company name.
  - `Rate`: Contract rate per ton or cubic meter.
  - `Moisture`: Raw material moisture percentage (% deduction).
  - `Deduction`: Tare dirt, moisture, or material wastage weight deduction in kg.
- **Center Column:**
  - `Charges`: Weighment fee / bridge docket charges.
  - `VehicleType`: Transit Mixer (TM), Tipper, Bulker, Tractor-Trailer.
  - `BagsBales`: Bag count or volumetric concrete batch capacity ($m^3$).
  - `Agent`: Field broker, logistic agent, or dispatcher.
  - `Village`: Destination jobsite location / pour location.
  - `ChessNo`: Delivery Challan (DC) No / Gate Pass / e-Way Bill No.
  - `ChessAmount`: Commercial invoice or DC invoice value.
  - `ChessName`: Delivery docket name / site incharge name.

### 2.4 Snapshot Gallery & Dual Camera Feeds
- **Vertical Snapshot Previews (Middle-Right):**
  - 3 preview viewports capturing evidence on scale lock:
    1. Plate Camera (Front OCR view).
    2. Bay Load Camera (Drum inlet/chute or open tipper bed).
    3. Cabin/Rear Camera (Driver verification and vehicle exit angle).
- **Dual Live Camera Panels (Far Right):**
  - **Camera 1:** Top live RTSP video/snapshot canvas with `Connected` badge, timecode, and camera IP connection details (`CamIP: 192.168.0.153`, `Port: 80`, `User: admin`).
  - **Camera 2:** Bottom live RTSP video/snapshot canvas with `Connected` badge, timecode, and camera IP connection details (`CamIP: 192.168.0.153`, `Port: 80`, `User: admin`).

### 2.5 Weight & Calculation Matrix
Structured 4-row computation table:
$$\text{Nett Weight} = |\text{1st Weight} - \text{2nd Weight}|$$
$$\text{Final Weight} = \text{Nett Weight} - \text{Deduction} - \left(\text{Nett Weight} \times \frac{\text{Moisture \%}}{100}\right)$$
$$\text{Total Amount} = \left(\frac{\text{Final Weight}}{1000} \times \text{Final Rate}\right) + \text{Charges}$$

| Parameter | Weight / Value | Date & Time |
|---|---|---|
| **1st Weight** | Recorded Tare/Gross in kg | Timestamp of 1st weighment |
| **2nd Weight** | Recorded Gross/Tare in kg | Timestamp of 2nd weighment |
| **Nett Weight** | Calculated absolute delta | **Final Rate** (Adjusted ₹ / ton) |
| **Final Weight** | Net weight minus deductions | **Total Amount** (Final payable/receivable ₹) |

### 2.6 Bottom Function Toolbar & Hotkeys
Dedicated physical keyboard function keys (`F1`–`F7`) engineered for fast single-key operator execution without mouse dependency:
- **`F1 New`**: Clears form and resets scale for a new transaction ticket.
- **`F2 Save`**: Saves current transaction state to MySQL database without printing.
- **`F3 Get Weight`**: **High-contrast primary action.** Reads stable telemetry from indicator into 1st Weight (if empty) or 2nd Weight (if 1st weight present), freezing timecode and triggering camera snapshots.
- **`F4 Save & Print`**: Commits completed weighment session to MySQL, generates sequential Weigh Slip, opens print dialog with QR code and photos.
- **`F5 Print`**: Reprints the active transaction weighment slip.
- **`F7 Close`**: Cancels active weighing session safely.
- **`E-Mail`**: Exports digital docket PDF and emails it to customer/accounts.
- **Checkboxes:** `[ ] Print Duplicate`, `[ ] Print QR Code`, `[x] Print Images`.

---

## 3. Database Schema Mapping (MySQL 8.0 `RMC-SAAS`)

### 3.1 `weighbridge_sessions`
Table storing live sessions and historical tickets:
```sql
ALTER TABLE weighbridge_sessions
  ADD COLUMN IF NOT EXISTS transaction_no INT,
  ADD COLUMN IF NOT EXISTS party_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS firm_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS rate DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS moisture DECIMAL(5,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS deduction DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS charges DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bags_bales INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent VARCHAR(100),
  ADD COLUMN IF NOT EXISTS village VARCHAR(100),
  ADD COLUMN IF NOT EXISTS chess_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS chess_amount DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS chess_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS first_weight DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS first_weight_time DATETIME,
  ADD COLUMN IF NOT EXISTS second_weight DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS second_weight_time DATETIME,
  ADD COLUMN IF NOT EXISTS final_rate DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS print_options JSON;
```

### 3.2 `weigh_slips`
Table storing immutable legal proof tickets:
```sql
ALTER TABLE weigh_slips
  ADD COLUMN IF NOT EXISTS transaction_no INT,
  ADD COLUMN IF NOT EXISTS party_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS charges DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS qr_code_data TEXT;
```

---

## 4. Operational Workflow & Hotkey Guide

1. **Step 1 — Truck Enters Scale:**
   - Operator presses **`F1`** (or types Vehicle No). Live ANPR detection pre-populates `Vehicle No`.
   - If truck has a pending 1st weight, operator clicks from **"Today Pending Vehicles"** or enters `Vehicle No` — existing transaction loads automatically.
2. **Step 2 — Capture Weight:**
   - When scale LED indicates `STABLE`, operator presses **`F3 (Get Weight)`**.
   - If 1st weight is empty, records `1st Weight` (e.g. empty Tare).
   - If 1st weight already exists, records `2nd Weight` (e.g. loaded Gross) and immediately calculates `Nett Weight` and `Total Amount`.
   - Snapshots from Camera 1 and Camera 2 are auto-captured and stored into `evidence`.
3. **Step 3 — Save & Print:**
   - Operator presses **`F4 (Save & Print)`**.
   - Session marked `completed` in MySQL.
   - Formal weigh slip with QR code verification and camera snapshots prints on thermal or dot-matrix printer.

---

## 5. Live ANPR & IP Camera Integration & Automated FTP Sync

### 5.1 Architecture & Stream Sources
- **MediaMTX Daemon:**
  - HLS server running on port `:8888`, RTSP server on `:8554`.
  - `cam1` (`http://localhost:8888/cam1/index.m3u8`): Dedicated front bumper & license plate ANPR camera (`192.168.0.100`).
  - `cam2` (`http://localhost:8888/cam2/index.m3u8`): Scale platform deck, wheels, and transit mixer chute camera (`192.168.0.99`).
- **Resilient Fallback Mode:**
  - If a physical camera is disconnected or powered off, `DualCameraFeedPanel` smoothly falls back to realistic animated canvas simulation showing real-time road perspective, vehicle movement, live ANPR plate OCR readings, and scale deck alignment so operator workflow is never interrupted.
- **Automated Snapshot Capture on `Get Weight F3`:**
  - When the operator presses `F3` or clicks **Get Weight F3**, the terminal latches the scale reading and concurrently triggers `cameraPanelRef.captureAllSnapshots()`.
  - Both camera viewports draw high-resolution frames with official Legal Metrology watermarks:
    - Company name & weighbridge license (`DHARANI COTTON MILLS / APARNA RMC | LIC: WB/2026/RMC-449`).
    - Transaction number (`TX #00042`).
    - Timestamp & Camera IP / Angle.
    - Verified Scale Weight (`LATCHED SCALE WT: 34,200 KG`).
    - Vehicle plate number (`VEH: MH 12 RN 4501`).
- **Disk Storage & FTP Sync:**
  - Images are posted to `POST /api/weighbridge/snapshots/upload` and saved to `public/snapshots/wb-tx{txNo}-cam{camId}-{timestamp}.jpg`.
  - Served via Express `/snapshots/` for browser rendering and printing.
  - Automatically uploaded via `basic-ftp` to the plant's remote FTP server configured under **Company Settings > Weighbridge Defaults > FTP Snapshot Server**.
  - If the FTP server is temporarily unreachable, the system stores the snapshot locally, logs a diagnostic warning, and proceeds without blocking the weigh docket or print dialog.
- **Printed Docket Integration (`IndustrialWeighSlipModal`):**
  - Displays up to 3 captured snapshots with high-contrast angle labels (`Cam 1 · Front (ANPR)`, `Cam 2 · Scale Deck`) when `Print Images` is checked.

---

## 6. Single-Line Top Ribbon, 5-Digit Readout (00000), & Third-Party Integration Suite

### 6.1 Sleek Single-Line Header (Zero Space Wastage)
- **Logo & Company Header Removed:** The previous company logo image and company name text were removed from the terminal's top ribbon to maximize screen space for dense weighing operations.
- **Unified Single-Line Ribbon (`h-12 min-h-[48px]`):** All primary operator actions are consolidated into a single horizontal row:
  - **Left Actions:** `Weighment` (active tab), `Reports`, `Calculator` (Tools), `Camera 1`, `Camera 2`, `Scale Bridge` (with live green pulse indicator), `Settings`, and `Exit`.
  - **Center & Right:** 5-digit digital indicator (`00000`) positioned cleanly on the upper right.
- **Total Pending Vehicles Button (Moved to Bottom):** Repositioned from the top ribbon down to the bottom action bar in place of the E-Mail button:
  - Formatted as `Total Pending Vehicles` with high-contrast amber/gold styling and live numeric count badge (`{pendingVehicles.length}`).
  - Directly adjacent to `Close F7`, keeping all transaction actions together.
- **Redundant Sub-Menu Strip Eliminated:** The separate secondary menu bar was merged directly into the top ribbon, recovering vertical space and eliminating page scrolling.

### 6.2 5-Digit Scale Display (`00000`)
- Standard industrial weighbridge indicators in India (Avery, Essae, Toledo) operate with 5-digit displays.
- `IndustrialDigitalIndicator.tsx` defaults to `digitsCount={5}` with `padStart(5, '0')`.
- Initial scale weight defaults to `0`, producing strictly **`00000`** in idle/standby mode with active `ZERO` and `STABLE` annunciator flags.

### 6.3 Third-Party Weighbridge Software Integration Suite
The weighbridge terminal interfaces seamlessly with external software (Avery WinWeigh, Essae Teraoka, Tulsi, Mettler Toledo, Eagle) through 4 versatile communication modes:

1. **Direct Web Serial (RS-232 / COM Port / USB-to-Serial):**
   - Connects directly from modern browsers (Chrome/Edge) to physical COM ports via `navigator.serial`.
   - Built-in frame parsers for Avery E1205/E1110, Essae Teraoka, Mettler Toledo Continuous, Eagle/Tulsi, and Standard ASCII.
   - Live packet terminal stream in `ThirdPartyScaleModal.tsx`.
2. **Desktop File Sync (File Watcher):**
   - Reads shared text files continuously exported by third-party desktop weighbridge software (e.g. `C:\Weighbridge\live_weight.txt` or `data/live_scale_weight.txt`).
   - Monitored automatically via background polling in Node.js Express.
3. **TCP Socket Stream:**
   - Connects over Ethernet to serial device servers (Moxa NPort, USR-TCP232, or network-enabled indicators) on `host:port` (e.g. `127.0.0.1:4001`).
4. **Inbound HTTP REST Webhook:**
   - Any external desktop app or script can push live weights directly to:
     ```bash
     curl -X POST http://localhost:3001/api/weighbridge/third-party/push \
       -H "Content-Type: application/json" \
       -d '{"weight": 24580, "unit": "kg", "stable": true, "source": "Avery WinWeigh"}'
     ```
5. **Scale Bridge Modal & Zeroing:**
   - Click **Scale Bridge** in the top ribbon to open the dialog, select baud rate, inspect incoming packets, test external sources, or zero the scale back to `00000`.
6. **Company Settings Configuration:**
   - Default scale mode, protocol, baud rate, file path, and TCP host/port can be configured and tested in **Company Settings > Weighbridge & Module Defaults**.



