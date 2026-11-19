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
    // Single, dedicated FTP configuration for user demo and target folder /Dharani
    this.ftpConfig = {
      host: process.env.FTP_HOST || 'ftp.activitsol.com',
      port: parseInt(process.env.FTP_PORT || '2121', 10),
      user: process.env.FTP_USER || 'demo',
      password: process.env.FTP_PASSWORD || 'Password@123',
      secure: false,
      remoteDir: process.env.FTP_DIR || '/Dharani',
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
    console.log(`[FTP ANPR] Starting Dedicated FTP Watcher:`);
    console.log(`  Host: ${this.ftpConfig.host}:${this.ftpConfig.port}`);
    console.log(`  User: ${this.ftpConfig.user}`);
    console.log(`  Target Folder: ${this.ftpConfig.remoteDir}`);

    // Initial baseline scan of existing files in /Dharani
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
   * Poll user demo account /Dharani folder
   */
  async poll(isBaseline = false) {
    if (this.isPolling) return;
    this.isPolling = true;

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      this.lastPollTime = new Date().toISOString();
      this.lastError = null;

      await client.access({
        host: this.ftpConfig.host,
        port: this.ftpConfig.port,
        user: this.ftpConfig.user,
        password: this.ftpConfig.password,
        secure: this.ftpConfig.secure,
      });

      let targetDir = this.ftpConfig.remoteDir || '/Dharani';
      if (!targetDir.startsWith('/')) targetDir = '/' + targetDir;
      try {
        await client.cd(targetDir);
      } catch {
        await client.ensureDir(targetDir);
        try { await client.cd(targetDir); } catch {}
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
        console.log(`📸 [FTP ANPR] NEW VEHICLE DETECTED IN /Dharani: ${newFile.plate} (File: ${newFile.fileName})`);
        await this.recordDetectionToDb(newFile);
      }

    } catch (err) {
      this.lastError = err.message;
    } finally {
      this.isPolling = false;
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
      fileName: fileName || '',
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

    // Store in memory first and broadcast immediately
    this.latestDetection = detection;
    this.notifyListeners(detection);

    try {
      // 1. Check vehicle master table for details
      const [vRows] = await pool.query(
        'SELECT make, model, driver_name, driver_phone, party_name, default_material, allowed_products FROM vehicles WHERE UPPER(REPLACE(vehicle_number, " ", "")) = ? LIMIT 1',
        [cleanPlate]
      );
      if (vRows.length > 0) {
        const v = vRows[0];
        detection.matchedVehicle = {
          make: v.make || '',
          model: v.model || '',
          driverName: v.driver_name || '',
          driverPhone: v.driver_phone || '',
          partyName: v.party_name || '',
          product: v.default_material || v.allowed_products || '',
        };
        this.latestDetection = detection;
      }
    } catch (dbErr) {
      console.warn('[FTP ANPR] Vehicle query warning:', dbErr.message);
    }

    try {
      // 2. Insert into anpr_events table (auto-create if missing)
      const sql = `
        INSERT INTO anpr_events 
          (event_id, event_type, timestamp, plant_id, camera_id, vehicle_reg_no, confidence, source, status, direction)
        VALUES 
          (?, 'ANPR_READ', ?, 'plant_001', 'cam_gate_1', ?, 0.9800, 'ANPR Camera (FTP /Dharani)', 'confirmed', 'entry')
        ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
      `;

      try {
        await pool.query(sql, [event_id, detection.timestamp, cleanPlate]);
      } catch (insertErr) {
        if (insertErr.code === 'ER_NO_SUCH_TABLE') {
          console.log('[FTP ANPR] Auto-creating anpr_events table...');
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
          await pool.query(sql, [event_id, detection.timestamp, cleanPlate]);
        } else {
          throw insertErr;
        }
      }

      // 3. Insert into anpr_evidence table
      if (fileName) {
        try {
          await pool.query(
            'INSERT INTO anpr_evidence (event_id, file_name, file_url, camera_id) VALUES (?, ?, ?, ?)',
            [event_id, fileName, `/Dharani/${fileName}`, 'cam_gate_1']
          );
        } catch (evErr) {
          // ignore evidence table error
        }
      }

      console.log(`💾 [FTP ANPR] Synced vehicle ${cleanPlate} from /Dharani/${fileName}`);
    } catch (saveErr) {
      console.warn('[FTP ANPR] Database save warning:', saveErr.message);
    }

    return detection;
  }

  /**
   * On-demand sync for latest vehicle in /Dharani
   */
  async syncLatestExisting() {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: this.ftpConfig.host,
        port: this.ftpConfig.port,
        user: this.ftpConfig.user,
        password: this.ftpConfig.password,
        secure: this.ftpConfig.secure,
      });

      let targetDir = this.ftpConfig.remoteDir || '/Dharani';
      if (!targetDir.startsWith('/')) targetDir = '/' + targetDir;
      try {
        await client.cd(targetDir);
      } catch {
        await client.ensureDir(targetDir);
        try { await client.cd(targetDir); } catch {}
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

      return null;
    } catch (err) {
      console.error('[FTP ANPR] syncLatestExisting error:', err.message);
      throw err;
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
      host: this.ftpConfig.host,
      port: this.ftpConfig.port,
      user: this.ftpConfig.user,
      folder: this.ftpConfig.remoteDir,
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
