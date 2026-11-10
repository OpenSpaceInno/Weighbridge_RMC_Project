# RMC-SAAS — Camera & ANPR Integration Guide

> **Engineering Pack · Video & License Plate Recognition**
> RTSP Streaming, MediaMTX Transcoder, and ANPR Pipeline

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [MediaMTX RTSP-to-HLS Proxy](#mediamtx-rtsp-to-hls-proxy)
3. [Camera Configuration](#camera-configuration)
4. [ANPR Recognition Pipeline](#anpr-recognition-pipeline)
   - [Cloud Mode (PlateRecognizer.com)](#cloud-mode-platerecognizercom)
   - [Local Mode (OpenALPR)](#local-mode-openalpr)
   - [Mock Mode](#mock-mode)
5. [Camera Webhooks](#camera-webhooks)
6. [Frontend Video Player (hls.js)](#frontend-video-player-hlsjs)
7. [Camera Diagnostics](#camera-diagnostics)
8. [Troubleshooting Checklist](#troubleshooting-checklist)

---

## Architecture Overview

Modern browsers cannot directly play RTSP (Real-Time Streaming Protocol) streams over HTTP or WebSockets without plugins. RMC-SAAS uses **MediaMTX** as a high-performance local proxy that ingests camera RTSP feeds and repackages them into HTTP Live Streaming (HLS, `.m3u8`), which is played seamlessly via `hls.js` inside the browser.

```
┌────────────────────────┐
│ Physical IP Camera     │  (e.g., Hikvision 192.168.0.100)
│ rtsp://...:554/ch1/main│
└───────────┬────────────┘
            │ RTSP (TCP port 554)
            ▼
┌────────────────────────┐
│ MediaMTX (Local Proxy) │  mediamtx.exe
│ Port 8554 (RTSP in)    │  Configuration: mediamtx.yml
│ Port 8888 (HLS out)    │
└───────────┬────────────┘
            │ HLS stream (HTTP GET /cam1/index.m3u8)
            ▼
┌────────────────────────┐
│ React Browser Client   │
│ VideoPlayer / hls.js   │
└────────────────────────┘
```

For license plate recognition, two workflows operate in parallel:
1. **Camera Webhook:** The camera detects motion/plate locally and pushes an HTTP JSON payload to the backend at `/api/anpr/webhook/:cameraId`.
2. **Snapshot Capture:** The frontend captures a frame from the live video stream canvas and sends it to `/api/anpr/detect` via multipart form data.

---

## MediaMTX RTSP-to-HLS Proxy

### Installation & Execution
MediaMTX runs as a lightweight standalone binary on the plant server or local dev machine.
- Binary path: `./mediamtx.exe` (in project root or system PATH)
- Config file: `./mediamtx.yml`

To start MediaMTX:
```bash
./mediamtx.exe
```

### Key Ports
- **8554**: RTSP listening port
- **8888**: HLS HTTP streaming port
- **9997**: MediaMTX REST API management port

### Stream URLs
| Stream | MediaMTX Path | HLS Playback URL |
|---|---|---|
| Entry Camera | `cam1` | `http://localhost:8888/cam1/index.m3u8` |
| Exit Camera | `cam2` | `http://localhost:8888/cam2/index.m3u8` |
| Weighbridge | `weighbridge` | `http://localhost:8888/weighbridge/index.m3u8` |
| Demo Stream | `test` | `http://localhost:8888/test/index.m3u8` |

### Configuration Example (`mediamtx.yml`)
```yaml
paths:
  cam1:
    source: rtsp://admin:Password@123@192.168.0.100:554/Streaming/Channels/101
    sourceProtocol: tcp
    sourceOnDemand: yes

  cam2:
    source: rtsp://admin:Password@123@192.168.0.101:554/Streaming/Channels/101
    sourceProtocol: tcp
    sourceOnDemand: yes

  weighbridge:
    source: rtsp://admin:Password@123@192.168.0.102:554/Streaming/Channels/101
    sourceProtocol: tcp
    sourceOnDemand: yes
```
*Note: `sourceOnDemand: yes` ensures MediaMTX only pulls the RTSP stream from the camera when a client is actively viewing the HLS feed, saving plant network bandwidth.*

---

## Camera Configuration

Cameras are stored in the MySQL table `camera_devices` with related credentials in `device_rtsp_config` and IP configs in `device_network_config`.

### Standard RTSP URL Patterns
- **Hikvision:** `rtsp://<user>:<pass>@<ip>:554/Streaming/Channels/101` (Main stream) or `102` (Sub stream)
- **Dahua:** `rtsp://<user>:<pass>@<ip>:554/cam/realmonitor?channel=1&subtype=0`
- **CP PLUS:** `rtsp://<user>:<pass>@<ip>:554/cam/realmonitor?channel=1&subtype=0`
- **Uniview:** `rtsp://<user>:<pass>@<ip>:554/unicast/c1/s0/live`

---

## ANPR Recognition Pipeline

The ANPR engine is encapsulated in `server/anpr-processor.js`. It supports three operational modes:

### 1. Cloud Mode (PlateRecognizer.com)
- **Active when:** `PLATERECOGNIZER_API_KEY` is present in `server/.env`.
- **Free Tier:** 2,500 lookups per month.
- **Accuracy:** High (includes regional plate format support for India `'in'`, US, EU).
- **Endpoint used:** `https://api.platerecognizer.com/v1/plate-reader/`
- **Configuration in `server/.env`:**
  ```env
  PLATERECOGNIZER_API_KEY=your_token_from_platerecognizer
  ```

### 2. Local Mode (OpenALPR)
- **Active when:** `localEnabled: true` in `ANPRProcessor`.
- Uses locally hosted OpenALPR or Docker instance at `http://localhost:8080/alpr`.

### 3. Mock Mode
- **Active when:** No `PLATERECOGNIZER_API_KEY` is configured.
- Generates realistic Indian license plate strings (e.g., `MH12AB1234`, `DL01XY9876`) with 90%+ confidence for local development and testing without internet access.

---

## Camera Webhooks

Many modern IP cameras (such as Hikvision ANPR series) can send an HTTP POST request when a vehicle is detected. RMC-SAAS backend exposes:

```
POST /api/anpr/webhook/:cameraId
```

### Supported Payloads

#### Format A: Hikvision AlarmInfoPlate
```json
{
  "AlarmInfoPlate": {
    "plateNo": "MH12AB1234",
    "confidence": 98,
    "picName": "base64..."
  }
}
```

#### Format B: Generic Plate JSON
```json
{
  "plate": "MH12AB1234",
  "confidence": 0.96,
  "direction": "entry"
}
```

#### Format C: Nested Data
```json
{
  "data": {
    "plate": "MH12AB1234"
  }
}
```

Whenever a webhook triggers, a record is inserted into `anpr_events`, and if an image is provided, it is stored in `anpr_evidence`.

---

## Frontend Video Player (hls.js)

The frontend uses `hls.js` inside `src/components/gate/GateCameraFeed.tsx`:

```tsx
import Hls from 'hls.js';

// If HLS is supported natively (Safari)
if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
  videoRef.current.src = hlsUrl;
} else if (Hls.isSupported()) {
  const hls = new Hls({
    lowLatencyMode: true,
    liveSyncDurationCount: 3,
  });
  hls.loadSource(hlsUrl);
  hls.attachMedia(videoRef.current);
}
```

---

## Camera Diagnostics

The backend provides a TCP diagnostic tool at:
```
GET /api/cameras/diagnostic/:ip
```

It checks connectivity against the 3 standard CCTV ports:
- **554 (RTSP):** Checks if the video stream port is listening.
- **80 (HTTP):** Checks if camera web management interface is reachable.
- **8000 (Hikvision SDK):** Checks if manufacturer management port is open.

Response example:
```json
{
  "ip": "192.168.0.100",
  "reachable": true,
  "ports": {
    "554": true,
    "80": true,
    "8000": false
  },
  "latency_ms": 14
}
```

---

## Troubleshooting Checklist

1. **Video player displays black screen / loading spinner:**
   - Check if MediaMTX is running: `Get-Process mediamtx -ErrorAction SilentlyContinue`
   - Check if the HLS manifest exists in browser: Navigate to `http://localhost:8888/cam1/index.m3u8`
   - Verify camera IP ping from server: `ping 192.168.0.100`

2. **RTSP authentication fails:**
   - Hikvision passwords containing special characters (e.g., `@`, `#`) must be URL-encoded in the RTSP string if placed inside standard URLs (e.g., `@` becomes `%40`).

3. **ANPR events not registering:**
   - Verify that the camera webhook URL is configured in the camera's Web UI to point to `http://<SERVER_IP>:3001/api/anpr/webhook/cam1`.
   - Test using the backend manual test endpoint:
     ```bash
     curl -X POST http://localhost:3001/api/anpr/webhook-test/cam1
     ```

