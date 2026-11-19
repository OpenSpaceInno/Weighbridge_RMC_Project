import * as ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(__dirname, 'temp_sync');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

class FtpAnprWatcher {
  constructor() {
    // Demo user (target folder /Dharani for user storage & web view)
    this.demoConfig = {
      host: process.env.FTP_HOST || 'ftp.activitsol.com',
      port: parseInt(process.env.FTP_PORT || '2121', 10),
      user: process.env.FTP_USER || 'demo',
      password: process.env.FTP_PASSWORD || 'Password@123',
      secure: false,
      remoteDir: process.env.FTP_DIR || '/Dharani',
    };

    // Camera user (where physical camera 192.168.0.101 uploads)
    this.cameraConfig = {
      host: process.env.FTP_CAMERA_HOST || 'ftp.activitsol.com',
      port: parseInt(process.env.FTP_CAMERA_PORT || '2121', 10),
      user: process.env.FTP_CAMERA_USER || 'sarath',
      password: process.env.FTP_CAMERA_PASSWORD || 'Password@123',
      secure: false,
      remoteDirs: ['/', '/Plant 01 - Shamshabad Central/Entry Gate'],
    };

    this.pollIntervalMs = 3000;
    this.processedFiles = new Set();
    this.latestDetection = null;
    this.isPolling = false;
    this.pollTimer = null;
    this.listeners = [];
    this.lastPollTime = null;
    this.lastError = null;
    this.totalFilesSeen = 0;
  }

  /**
   * Register a callback for new vehicle detections
   */
  onDetection(cb) {
    if (typeof cb === 'function') {
      this.listeners.push(cb);
    }
  }

  notifyListeners(detection) {
    for (const listener of this.listeners) {
      try {
        listener(detection);
      } catch (err) {
        console.warn('[FTP ANPR] Listener notification error:', err.message);
      }
    }
  }

  markFileProcessed(fileName) {
    if (fileName) {
      this.processedFiles.add(fileName);
    }
  }

  /**
   * Start the background FTP watcher
   */
  async start() {
    console.log(`[FTP ANPR] Starting Dual-Sync FTP Watcher:`);
    console.log(`  Source (Camera): ${this.cameraConfig.host}:${this.cameraConfig.port} (User: ${this.cameraConfig.user})`);
    console.log(`  Target (Dharani): ${this.demoConfig.host}:${this.demoConfig.port}${this.demoConfig.remoteDir} (User: ${this.demoConfig.user})`);
    
    // Initial baseline scan of existing files
    try {
      await this.poll(true);
    } catch (err) {
      console.warn('[FTP ANPR] Initial baseline scan error:', err.message);
    }

    // Start recurring poll
    this.pollTimer = setInterval(() => {
      this.poll(false).catch(err => {
        this.lastError = err.message;
      });
    }, this.pollIntervalMs);
  }

  /**
   * Stop the watcher
   */
  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[FTP ANPR] Watcher stopped.');
  }

  /**
   * Parse plate details from filename
   */
  parseFileName(fileName) {
    if (!fileName || !/\.(jpg|jpeg|png)$/i.test(fileName)) return null;

    let plate = null;
    let timestamp = null;

    // Pattern 1: Dahua/Uniview camera format: Unkown_TN15MF2815(CH1_2026_11_19_141444).jpg
    const camMatch = fileName.match(/^(?:Unkown|[A-Za-z0-9]+)_([A-Z0-9]{4,15})\(CH(\d+)_(\d{4})_(\d{2})_(\d{2})_(\d{2})(\d{2})(\d{2})\)\.jpg$/i);
    if (camMatch) {
      plate = camMatch[1].toUpperCase();
      const [, , ch, year, month, day, hour, min, sec] = camMatch;
      timestamp = `${year}-${month}-${day} ${hour}:${min}:${sec}`;
    }

    // Pattern 2: Explicit prefix: VEHICLE_TN15MF2815_...
    if (!plate) {
      const prefMatch = fileName.match(/^(?:VEHICLE|VEH|PLATE|CAR|TRUCK)_([A-Z0-9]{4,15})/i);
      if (prefMatch) {
        plate = prefMatch[1].toUpperCase();
      }
    }

    // Pattern 3: Standard Indian Plate in filename (e.g. TN15MF2815_tx1_... or AP28TB5296.jpg)
    if (!plate) {
      const indMatch = fileName.match(/(?:^|[_ -])([A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4})(?:[_ -.]|$)/i);
      if (indMatch) {
        plate = indMatch[1].toUpperCase();
      }
    }

    // Pattern 4: BH Series plate: 22BH1234AA
    if (!plate) {
      const bhMatch = fileName.match(/\b([0-9]{2}BH[0-9]{4}[A-Z]{1,2})\b/i);
      if (bhMatch) {
        plate = bhMatch[1].toUpperCase();
      }
    }

    // Pattern 5: Plate with tx prefix: TN15MF2815_tx1_...
    if (!plate) {
      const txMatch = fileName.match(/^([A-Z0-9]{4,15})_tx\d+/i);
      if (txMatch) {
        plate = txMatch[1].toUpperCase();
      }
    }

    if (!plate) return null;

    const cleanPlate = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const blacklist = ['CAMERA', 'CAM1', 'CAM2', 'FRONT', 'SNAPSHOT', 'DECK', 'CHUTE', 'WEIGHBRIDGE',
                       'KA05AB1234', 'MH02CD5678', 'DL01EF9012', 'TN09GH3456', 'GJ06IJ7890'];
    if (blacklist.includes(cleanPlate) || cleanPlate.length < 4 || cleanPlate.length > 15) {
      return null;
    }

    if (!timestamp) {
      const dateMatch = fileName.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})/);
      if (dateMatch) {
        timestamp = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]} ${dateMatch[4]}:${dateMatch[5]}:${dateMatch[6]}`;
      } else {
        const now = new Date();
        timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
      }
    }

    return {
      fileName,
      plate: cleanPlate,
      timestamp,
      isoDate: new Date().toISOString()
    };
  }

  /**
   * Helper: Mirror/copy a file from camera account (sarath) to user demo account (/Dharani)
   */
  async mirrorToDharani(remoteSourcePath, fileName) {
    const srcClient = new ftp.Client();
    const destClient = new ftp.Client();
    srcClient.ftp.verbose = false;
    destClient.ftp.verbose = false;

    const tempFile = path.join(tempDir, `sync_${Date.now()}_${fileName}`);

    try {
      // Connect to source
      await srcClient.access({
        host: this.cameraConfig.host,
        port: this.cameraConfig.port,
        user: this.cameraConfig.user,
        password: this.cameraConfig.password,
        secure: this.cameraConfig.secure,
      });

      // Download file locally to temp
      await srcClient.downloadTo(tempFile, remoteSourcePath);

      // Connect to destination
      await destClient.access({
        host: this.demoConfig.host,
        port: this.demoConfig.port,
        user: this.demoConfig.user,
        password: this.demoConfig.password,
        secure: this.demoConfig.secure,
      });

      if (this.demoConfig.remoteDir && this.demoConfig.remoteDir !== '/' && this.demoConfig.remoteDir !== '.') {
        await destClient.ensureDir(this.demoConfig.remoteDir);
      }

      // Upload to Dharani folder
      await destClient.uploadFrom(tempFile, fileName);
      console.log(`✅ [FTP Mirror] Copied camera image to /Dharani/${fileName}`);
      return true;
    } catch (err) {
      console.warn(`[FTP Mirror] Failed to mirror ${fileName} to Dharani:`, err.message);
      return false;
    } finally {
      srcClient.close();
      destClient.close();
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
    }
  }

  /**
   * Poll both camera FTP (sarath) and demo FTP (/Dharani)
   */
  async poll(isBaseline = false) {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      this.lastPollTime = new Date().toISOString();
      this.lastError = null;

      // 1. Poll camera upload destination (user: sarath)
      await this.pollCameraSource(isBaseline);

      // 2. Poll user destination (user: demo, dir: /Dharani)
      await this.pollDemoDharani(isBaseline);

    } catch (err) {
      this.lastError = err.message;
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Poll camera FTP account (sarath) where physical camera 192.168.0.101 uploads
   */
  async pollCameraSource(isBaseline) {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: this.cameraConfig.host,
        port: this.cameraConfig.port,
        user: this.cameraConfig.user,
        password: this.cameraConfig.password,
        secure: this.cameraConfig.secure,
      });

      // Check both root and Entry Gate
      for (const remoteDir of this.cameraConfig.remoteDirs) {
        let fileList = [];
        try {
          fileList = await client.list(remoteDir);
        } catch (e) {
          continue;
        }

        const detectedFiles = [];
        const overviewFiles = new Map();

        for (const item of fileList) {
          if (item.isDirectory) continue;

          // Track overview images e.g. 192.168.0.101_01_20261119141443471_LICENSE_PLATE_DETECTION.jpg
          if (item.name.includes('_LICENSE_PLATE_DETECTION')) {
            const timeKey = item.name.substring(0, 29); // Prefix up to sec
            overviewFiles.set(timeKey, item.name);
          }

          const parsed = this.parseFileName(item.name);
          if (parsed) {
            detectedFiles.push({
              ...parsed,
              remotePath: remoteDir === '/' ? item.name : `${remoteDir}/${item.name}`,
              size: item.size,
              rawModifiedAt: item.rawModifiedAt,
            });
          }
        }

        // Sort newest first
        detectedFiles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        if (isBaseline) {
          if (detectedFiles.length > 0 && !this.latestDetection) {
            const newest = detectedFiles[0];
            console.log(`📸 [FTP ANPR] Baseline initialized from Camera FTP with plate: ${newest.plate} (${newest.fileName})`);
            await this.recordDetectionToDb(newest);
          }
          for (const f of detectedFiles) {
            this.processedFiles.add(f.fileName);
          }
          continue;
        }

        // Find newly uploaded files
        const newFiles = detectedFiles.filter(f => !this.processedFiles.has(f.fileName));

        for (const newFile of newFiles) {
          this.processedFiles.add(newFile.fileName);
          console.log(`📸 [FTP ANPR] NEW VEHICLE CAPTURED BY CAMERA: ${newFile.plate} (File: ${newFile.fileName})`);

          // 1. Immediately mirror/copy image into demo's /Dharani folder so user sees it in FTP portal!
          await this.mirrorToDharani(newFile.remotePath, newFile.fileName);

          // 2. Also mirror matching overview detection image if available
          for (const [key, ovName] of overviewFiles.entries()) {
            if (!this.processedFiles.has(ovName)) {
              this.processedFiles.add(ovName);
              const ovRemotePath = remoteDir === '/' ? ovName : `${remoteDir}/${ovName}`;
              await this.mirrorToDharani(ovRemotePath, ovName);
              break;
            }
          }

          // 3. Save into MySQL anpr_events & set latestDetection for Weighbridge auto-population
          await this.recordDetectionToDb(newFile);
        }
      }

    } catch (err) {
      this.lastError = err.message;
    } finally {
      client.close();
    }
  }

  /**
   * Poll user demo account /Dharani folder directly
   */
  async pollDemoDharani(isBaseline) {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: this.demoConfig.host,
        port: this.demoConfig.port,
        user: this.demoConfig.user,
        password: this.demoConfig.password,
        secure: this.demoConfig.secure,
      });

      if (this.demoConfig.remoteDir && this.demoConfig.remoteDir !== '/' && this.demoConfig.remoteDir !== '.') {
        await client.ensureDir(this.demoConfig.remoteDir);
      }

      const fileList = await client.list();
      this.totalFilesSeen = fileList.length;

      const detectedFiles = [];
      for (const item of fileList) {
        if (!item.isDirectory) {
          const parsed = this.parseFileName(item.name);
          if (parsed) {
            detectedFiles.push({
              ...parsed,
              size: item.size,
              rawModifiedAt: item.rawModifiedAt,
            });
          }
        }
      }

      detectedFiles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      if (isBaseline) {
        if (detectedFiles.length > 0) {
          const newest = detectedFiles[0];
          console.log(`📸 [FTP ANPR] Baseline initialized from /Dharani with latest plate: ${newest.plate} (${newest.fileName})`);
          await this.recordDetectionToDb(newest);
        }
        for (const f of detectedFiles) {
          this.processedFiles.add(f.fileName);
        }
        return;
      }

      const newFiles = detectedFiles.filter(f => !this.processedFiles.has(f.fileName));
      for (const newFile of newFiles) {
        this.processedFiles.add(newFile.fileName);
        console.log(`📸 [FTP ANPR] DETECTED VEHICLE DIRECTLY IN /Dharani: ${newFile.plate}`);
        await this.recordDetectionToDb(newFile);
      }

    } catch (err) {
      this.lastError = err.message;
    } finally {
      client.close();
    }
  }

  /**
   * Save detected event into MySQL anpr_events and lookup matched vehicle
   */
  async recordDetectionToDb(fileData) {
    const { plate, timestamp, fileName } = fileData;
    const cleanPlate = (plate || '').replace(/\s+/g, '').toUpperCase();
    const event_id = `evt_FTP_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Build detection object and store in memory immediately so it is 100% accessible
    const detection = {
      success: true,
      vehicleRegNo: cleanPlate,
      confidence: 0.98,
      source: 'Entry Gate ANPR Camera (FTP)',
      timestamp: timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
      cameraId: 'cam_gate_1',
      fileName,
      direction: 'entry',
      matchedVehicle: {
        make: '',
        model: '',
        driverName: '',
        driverPhone: '',
        partyName: '',
        product: '',
      }
    };

    this.latestDetection = detection;
    this.notifyListeners(detection);

    // Try to record into MySQL and enrich with vehicle master match
    try {
      try {
        await pool.query(
          `INSERT INTO anpr_events 
           (event_id, plant_id, camera_id, vehicle_reg_no, confidence, source, status, direction, timestamp)
           VALUES (?, 'plant_001', 'cam_gate_1', ?, 0.98, 'ANPR Camera (FTP /Dharani)', 'confirmed', 'entry', ?)`,
          [event_id, cleanPlate, timestamp || new Date()]
        );
      } catch (insertErr) {
        if (insertErr.code === 'ER_NO_SUCH_TABLE' || (insertErr.message && insertErr.message.includes("doesn't exist"))) {
          console.log('[FTP ANPR] anpr_events table missing, auto-creating table...');
          await pool.query(`
            CREATE TABLE IF NOT EXISTS anpr_events (
              id INT AUTO_INCREMENT PRIMARY KEY,
              event_id VARCHAR(100) NOT NULL UNIQUE,
              event_type VARCHAR(50) DEFAULT 'ANPR_READ',
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              plant_id VARCHAR(50) DEFAULT 'plant_001',
              camera_id VARCHAR(50) DEFAULT 'cam_gate_1',
              vehicle_reg_no VARCHAR(50) NOT NULL,
              confidence DECIMAL(5,4) DEFAULT 0.9800,
              source VARCHAR(100) DEFAULT 'ANPR Camera (FTP /Dharani)',
              status VARCHAR(50) DEFAULT 'confirmed',
              operator_note TEXT NULL,
              vehicle_type VARCHAR(50) NULL,
              direction VARCHAR(20) DEFAULT 'entry',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_anpr_time (timestamp),
              INDEX idx_anpr_plate (vehicle_reg_no),
              INDEX idx_anpr_plant (plant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          await pool.query(
            `INSERT INTO anpr_events 
             (event_id, plant_id, camera_id, vehicle_reg_no, confidence, source, status, direction, timestamp)
             VALUES (?, 'plant_001', 'cam_gate_1', ?, 0.98, 'ANPR Camera (FTP /Dharani)', 'confirmed', 'entry', ?)`,
            [event_id, cleanPlate, timestamp || new Date()]
          );
        } else {
          console.warn('[FTP ANPR] DB insert warning:', insertErr.message);
        }
      }

      // Query vehicles and trips for auto-match if tables exist
      try {
        const [vehRows] = await pool.query(
          `SELECT v.make, v.model, v.current_driver, v.current_driver_phone, t.customer_name, t.material 
           FROM vehicles v
           LEFT JOIN trips t ON (REPLACE(UPPER(t.vehicle_reg_no), ' ', '') = REPLACE(UPPER(v.registration_no), ' ', ''))
           WHERE REPLACE(UPPER(v.registration_no), ' ', '') = ?
           LIMIT 1`,
          [cleanPlate]
        );

        if (vehRows && vehRows.length > 0) {
          const matched = vehRows[0];
          detection.matchedVehicle = {
            make: matched?.make || '',
            model: matched?.model || '',
            driverName: matched?.current_driver || '',
            driverPhone: matched?.current_driver_phone || '',
            partyName: matched?.customer_name || '',
            product: matched?.material || '',
          };
          this.latestDetection = detection;
        }
      } catch (vehErr) {}

      return detection;
    } catch (err) {
      console.warn('[FTP ANPR] DB enrichment warning (cached plate preserved):', err.message);
      return detection;
    }
  }

  /**
   * Force sync latest existing file from FTP for testing/instant verification
   */
  async syncLatestExisting() {
    // 1. Check demo/Dharani
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: this.demoConfig.host,
        port: this.demoConfig.port,
        user: this.demoConfig.user,
        password: this.demoConfig.password,
        secure: this.demoConfig.secure,
      });

      if (this.demoConfig.remoteDir && this.demoConfig.remoteDir !== '/' && this.demoConfig.remoteDir !== '.') {
        await client.ensureDir(this.demoConfig.remoteDir);
      }

      const fileList = await client.list();
      const detectedFiles = [];
      for (const item of fileList) {
        if (!item.isDirectory) {
          const parsed = this.parseFileName(item.name);
          if (parsed) {
            detectedFiles.push({
              ...parsed,
              size: item.size,
            });
          }
        }
      }

      detectedFiles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      if (detectedFiles.length > 0) {
        const latest = detectedFiles[0];
        console.log(`[FTP ANPR] Forcing sync of latest file from /Dharani: ${latest.plate} (${latest.fileName})`);
        return await this.recordDetectionToDb(latest);
      }

      // If Dharani has none, check camera source (sarath)
      client.close();
      return await this.syncLatestFromCameraSource();

    } catch (err) {
      console.error('[FTP ANPR] syncLatestExisting error:', err.message);
      throw err;
    } finally {
      client.close();
    }
  }

  async syncLatestFromCameraSource() {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: this.cameraConfig.host,
        port: this.cameraConfig.port,
        user: this.cameraConfig.user,
        password: this.cameraConfig.password,
        secure: this.cameraConfig.secure,
      });

      const fileList = await client.list('/');
      const detectedFiles = [];
      for (const item of fileList) {
        if (!item.isDirectory) {
          const parsed = this.parseFileName(item.name);
          if (parsed) {
            detectedFiles.push({
              ...parsed,
              remotePath: item.name,
              size: item.size,
            });
          }
        }
      }

      detectedFiles.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      if (detectedFiles.length > 0) {
        const latest = detectedFiles[0];
        console.log(`[FTP ANPR] Syncing latest from camera source: ${latest.plate} (${latest.fileName})`);
        await this.mirrorToDharani(latest.remotePath, latest.fileName);
        return await this.recordDetectionToDb(latest);
      }

      return null;
    } finally {
      client.close();
    }
  }

  /**
   * Get current latest detection
   */
  getLatestDetection() {
    return this.latestDetection;
  }

  /**
   * Clear current latest detection
   */
  clearLatestDetection() {
    this.latestDetection = null;
  }

  /**
   * Get status summary
   */
  getStatus() {
    return {
      running: !!this.pollTimer,
      demoHost: this.demoConfig.host,
      demoPort: this.demoConfig.port,
      demoFolder: this.demoConfig.remoteDir,
      cameraUser: this.cameraConfig.user,
      totalFilesSeen: this.totalFilesSeen,
      processedCount: this.processedFiles.size,
      lastPollTime: this.lastPollTime,
      lastError: this.lastError,
      latestDetection: this.latestDetection,
    };
  }
}

const ftpAnprWatcher = new FtpAnprWatcher();
export default ftpAnprWatcher;
