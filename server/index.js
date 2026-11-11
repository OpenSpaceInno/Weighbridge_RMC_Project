import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as ftp from 'basic-ftp';
import { pool, testConnection, initializeDatabase } from './db.js';
import anprProcessor from './anpr-processor.js';
import multer from 'multer';
import net from 'net';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const snapshotsDir = path.resolve(__dirname, '..', 'public', 'snapshots');
if (!fs.existsSync(snapshotsDir)) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
}

// Configure multer for image uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const app = express();
const PORT = process.env.PORT || 3001;

// Trust reverse proxy for HTTPS termination (Coolify / Traefik / Nginx / Cloudflare)
app.set('trust proxy', 1);

// Configure CORS for HTTPS, custom domains, credentials, and preflight
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : null;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile, curl, postman, server-to-server)
    if (!origin) return callback(null, true);

    // If explicit list configured and contains origin or '*'
    if (allowedOrigins && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      return callback(null, true);
    }

    // Default: dynamically reflect origin to support HTTPS domains and subdomains
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-Plant-Id',
    'X-Terminal-Id'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Explicit preflight and security headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '50mb' })); // Increase limit for image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/snapshots', express.static(snapshotsDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Initialize database endpoint
app.post('/api/init-db', async (req, res) => {
  try {
    const result = await initializeDatabase();
    if (result) {
      res.json({ success: true, message: 'Database initialized successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Database initialization failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check database status
app.get('/api/db-status', async (req, res) => {
  try {
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('camera_devices', 'device_rtsp_config', 'device_network_config')
    `, [process.env.DB_NAME]);
    
    const initialized = tables.length === 3;
    res.json({ 
      initialized, 
      tables: tables.map(t => t.TABLE_NAME),
      message: initialized ? 'Database is ready' : 'Database needs initialization'
    });
  } catch (error) {
    res.json({ initialized: false, message: error.message });
  }
});

// ==================== CAMERA DEVICES ====================

// Get all camera devices
app.get('/api/cameras', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM camera_devices ORDER BY created_at');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single camera device
app.get('/api/cameras/:deviceId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM camera_devices WHERE device_id = ?', [req.params.deviceId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Camera network reachability diagnostic endpoint
app.get('/api/cameras/diagnostic/:ip', async (req, res) => {
  const { ip } = req.params;
  const testPort = (port, timeout = 1200) => new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(timeout);
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('timeout', () => { s.destroy(); resolve(false); });
    s.on('error', () => { s.destroy(); resolve(false); });
    s.connect(port, ip);
  });

  try {
    const [port554, port80, port8000] = await Promise.all([
      testPort(554),
      testPort(80),
      testPort(8000),
    ]);
    const reachable = port554 || port80 || port8000;
    res.json({
      ip,
      reachable,
      ports: {
        554: port554,
        80: port80,
        8000: port8000
      },
      status: reachable ? 'online' : 'offline',
      message: reachable 
        ? `Camera at ${ip} is responsive on network` 
        : `Camera at ${ip} timed out (Unreachable on current subnet)`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create camera device
app.post('/api/cameras', async (req, res) => {
  try {
    const { device_id, name, model, location, ip_address, mac_address, status, firmware } = req.body;
    const [result] = await pool.query(
      `INSERT INTO camera_devices (device_id, name, model, location, ip_address, mac_address, status, firmware, last_seen) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [device_id, name, model, location, ip_address, mac_address, status || 'offline', firmware]
    );
    res.status(201).json({ success: true, device_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update camera device
app.put('/api/cameras/:deviceId', async (req, res) => {
  try {
    const { name, model, location, ip_address, mac_address, status, firmware } = req.body;
    await pool.query(
      `UPDATE camera_devices 
       SET name = ?, model = ?, location = ?, ip_address = ?, mac_address = ?, status = ?, firmware = ?, last_seen = NOW()
       WHERE device_id = ?`,
      [name, model, location, ip_address, mac_address, status, firmware, req.params.deviceId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete camera device
app.delete('/api/cameras/:deviceId', async (req, res) => {
  try {
    await pool.query('DELETE FROM camera_devices WHERE device_id = ?', [req.params.deviceId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RTSP CONFIGURATION ====================

// Get RTSP config for a device
app.get('/api/rtsp-config/:deviceId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM device_rtsp_config WHERE device_id = ?', [req.params.deviceId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'RTSP config not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update RTSP config
app.post('/api/rtsp-config', async (req, res) => {
  try {
    const {
      device_id, enabled, url, direct_url, use_direct_url, port, username, password,
      stream_path, transport, reconnect_interval, buffer_size, low_latency_mode, hls_proxy_url
    } = req.body;
    
    // Check if config exists
    const [existing] = await pool.query('SELECT device_id FROM device_rtsp_config WHERE device_id = ?', [device_id]);
    
    if (existing.length > 0) {
      // Update existing
      await pool.query(
        `UPDATE device_rtsp_config 
         SET enabled = ?, url = ?, direct_url = ?, use_direct_url = ?, port = ?, username = ?, password = ?,
             stream_path = ?, transport = ?, reconnect_interval = ?, buffer_size = ?, low_latency_mode = ?, hls_proxy_url = ?
         WHERE device_id = ?`,
        [enabled, url, direct_url, use_direct_url, port, username, password, stream_path, transport, 
         reconnect_interval, buffer_size, low_latency_mode, hls_proxy_url, device_id]
      );
    } else {
      // Insert new
      await pool.query(
        `INSERT INTO device_rtsp_config 
         (device_id, enabled, url, direct_url, use_direct_url, port, username, password, stream_path, 
          transport, reconnect_interval, buffer_size, low_latency_mode, hls_proxy_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [device_id, enabled, url, direct_url, use_direct_url, port, username, password, stream_path, 
         transport, reconnect_interval, buffer_size, low_latency_mode, hls_proxy_url]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== NETWORK CONFIGURATION ====================

// Get network config for a device
app.get('/api/network-config/:deviceId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM device_network_config WHERE device_id = ?', [req.params.deviceId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Network config not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update network config
app.post('/api/network-config', async (req, res) => {
  try {
    const { device_id, ip_address, subnet_mask, gateway, primary_dns, secondary_dns, dhcp_enabled } = req.body;
    
    // Check if config exists
    const [existing] = await pool.query('SELECT device_id FROM device_network_config WHERE device_id = ?', [device_id]);
    
    if (existing.length > 0) {
      // Update existing
      await pool.query(
        `UPDATE device_network_config 
         SET ip_address = ?, subnet_mask = ?, gateway = ?, primary_dns = ?, secondary_dns = ?, dhcp_enabled = ?
         WHERE device_id = ?`,
        [ip_address, subnet_mask, gateway, primary_dns, secondary_dns, dhcp_enabled, device_id]
      );
    } else {
      // Insert new
      await pool.query(
        `INSERT INTO device_network_config 
         (device_id, ip_address, subnet_mask, gateway, primary_dns, secondary_dns, dhcp_enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [device_id, ip_address, subnet_mask, gateway, primary_dns, secondary_dns, dhcp_enabled]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ANPR ENDPOINTS ====================

// Initialize ANPR tables
app.post('/api/anpr/init', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const migrationPath = path.resolve(__dirname, 'migrations', 'anpr_events.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    
    res.json({ success: true, message: 'ANPR tables initialized' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all ANPR events with matched vehicle details
app.get('/api/anpr/events', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        e.*,
        v.id AS vehicle_id,
        v.make AS vehicle_make,
        v.model AS vehicle_model,
        v.current_driver AS vehicle_driver,
        v.current_driver_phone AS vehicle_driver_phone,
        v.status AS vehicle_status
      FROM anpr_events e
      LEFT JOIN vehicles v ON (
        REPLACE(UPPER(e.vehicle_reg_no), ' ', '') = REPLACE(UPPER(v.registration_no), ' ', '')
      )
    `;
    const params = [];
    
    if (status) {
      query += ' WHERE e.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY e.timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single ANPR event with evidence
app.get('/api/anpr/events/:eventId', async (req, res) => {
  try {
    const [events] = await pool.query('SELECT * FROM anpr_events WHERE event_id = ?', [req.params.eventId]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const [evidence] = await pool.query('SELECT * FROM anpr_evidence WHERE event_id = ?', [req.params.eventId]);
    
    res.json({
      ...events[0],
      evidence
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create ANPR event
app.post('/api/anpr/events', async (req, res) => {
  try {
    const {
      event_id, plant_id, camera_id, vehicle_reg_no, confidence, source,
      vehicle_type, direction, evidence
    } = req.body;
    
    // Insert event
    await pool.query(
      `INSERT INTO anpr_events 
       (event_id, plant_id, camera_id, vehicle_reg_no, confidence, source, vehicle_type, direction, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [event_id, plant_id, camera_id, vehicle_reg_no, confidence, source, vehicle_type, direction]
    );
    
    // Insert evidence if provided
    if (evidence && evidence.length > 0) {
      for (const item of evidence) {
        await pool.query(
          `INSERT INTO anpr_evidence 
           (event_id, evidence_type, url, thumbnail_url, angle, timestamp)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [event_id, item.type, item.url, item.thumbnailUrl, item.angle, item.timestamp]
        );
      }
    }
    
    res.status(201).json({ success: true, event_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ANPR event status
app.put('/api/anpr/events/:eventId', async (req, res) => {
  try {
    const { status, operator_note, vehicle_reg_no } = req.body;
    
    const updates = [];
    const params = [];
    
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (operator_note) {
      updates.push('operator_note = ?');
      params.push(operator_note);
    }
    if (vehicle_reg_no) {
      updates.push('vehicle_reg_no = ?');
      params.push(vehicle_reg_no);
    }
    
    params.push(req.params.eventId);
    
    await pool.query(
      `UPDATE anpr_events SET ${updates.join(', ')} WHERE event_id = ?`,
      params
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process image for ANPR detection
app.post('/api/anpr/detect', upload.single('image'), async (req, res) => {
  try {
    const { camera_id } = req.body;
    const imageData = req.file ? req.file.buffer : req.body.image;
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    const result = await anprProcessor.detectPlate(imageData, camera_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ANPR configuration for camera
app.get('/api/anpr/config/:cameraId', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM anpr_config WHERE camera_id = ?', [req.params.cameraId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'ANPR config not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ANPR configuration
app.put('/api/anpr/config/:cameraId', async (req, res) => {
  try {
    const { enabled, min_confidence, auto_confirm_threshold, capture_interval, region, processing_mode, api_key } = req.body;
    
    await pool.query(
      `UPDATE anpr_config 
       SET enabled = ?, min_confidence = ?, auto_confirm_threshold = ?, capture_interval = ?, 
           region = ?, processing_mode = ?, api_key = ?
       WHERE camera_id = ?`,
      [enabled, min_confidence, auto_confirm_threshold, capture_interval, region, processing_mode, api_key, req.params.cameraId]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to see raw webhook data
app.post('/api/anpr/webhook-test/:cameraId', async (req, res) => {
  console.log('\n========================================');
  console.log('🧪 WEBHOOK TEST - Raw Data Received');
  console.log('========================================');
  console.log('Camera ID:', req.params.cameraId);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('========================================\n');
  
  res.json({ 
    success: true, 
    message: 'Test webhook received',
    received: {
      headers: req.headers,
      body: req.body
    }
  });
});

// Webhook endpoint for camera ANPR events
app.post('/api/anpr/webhook/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;
    
    console.log(`📥 Received ANPR webhook from camera: ${cameraId}`);
    console.log('Webhook payload:', JSON.stringify(req.body, null, 2));
    
    // Extract plate data from camera webhook
    // Different cameras send different formats, so we'll try to parse common ones
    let plate = null;
    let confidence = 0.95;
    let vehicle_type = 'Unknown';
    let image_url = null;
    
    // Try different common webhook formats
    if (req.body.plate || req.body.plateNumber || req.body.licensePlate) {
      plate = req.body.plate || req.body.plateNumber || req.body.licensePlate;
    } else if (req.body.AlarmInfoPlate && req.body.AlarmInfoPlate.result) {
      // Hikvision format
      plate = req.body.AlarmInfoPlate.result.PlateResult.license;
      confidence = req.body.AlarmInfoPlate.result.PlateResult.confidence / 100;
    } else if (req.body.data && req.body.data.plate) {
      // Generic format
      plate = req.body.data.plate;
      confidence = req.body.data.confidence || 0.95;
    }
    
    if (!plate) {
      console.log('⚠️ No plate found in webhook payload');
      return res.status(400).json({ error: 'No plate data in webhook' });
    }
    
    console.log(`✅ Plate extracted: ${plate} (confidence: ${confidence})`);
    
    const event_id = `evt_ANPR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create ANPR event
    await pool.query(
      `INSERT INTO anpr_events 
       (event_id, plant_id, camera_id, vehicle_reg_no, confidence, source, vehicle_type, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [event_id, 'plant_001', cameraId, plate, confidence, 'camera_webhook', vehicle_type]
    );
    
    // Add evidence if image provided
    if (req.body.image_url || req.body.imageUrl || req.body.snapshot) {
      image_url = req.body.image_url || req.body.imageUrl || req.body.snapshot;
      await pool.query(
        `INSERT INTO anpr_evidence 
         (event_id, evidence_type, url, angle, timestamp)
         VALUES (?, 'image', ?, 'plate', NOW())`,
        [event_id, image_url]
      );
    }
    
    console.log(`✅ ANPR event created: ${event_id}`);
    
    res.json({ 
      success: true, 
      event_id,
      plate,
      message: 'ANPR event received and stored'
    });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// VEHICLES & DRIVERS API (Phase 1)
// ==========================================

function formatVehicle(v) {
  if (!v) return null;
  return {
    id: v.id,
    registrationNo: v.registration_no,
    type: v.type,
    make: v.make || '',
    model: v.model || '',
    year: v.year || 2023,
    capacity: parseFloat(v.capacity) || 0,
    capacityUnit: v.capacity_unit || 'ton',
    fuelType: v.fuel_type || 'diesel',
    status: v.status || 'available',
    currentDriver: v.current_driver || '',
    currentDriverPhone: v.current_driver_phone || '',
    lastMaintenance: v.last_maintenance ? new Date(v.last_maintenance).toISOString().split('T')[0] : '',
    nextMaintenance: v.next_maintenance ? new Date(v.next_maintenance).toISOString().split('T')[0] : '',
    insuranceExpiry: v.insurance_expiry ? new Date(v.insurance_expiry).toISOString().split('T')[0] : '',
    fitnessExpiry: v.fitness_expiry ? new Date(v.fitness_expiry).toISOString().split('T')[0] : '',
    permitExpiry: v.permit_expiry ? new Date(v.permit_expiry).toISOString().split('T')[0] : '',
    odometer: parseFloat(v.odometer) || 0,
    fuelEfficiency: parseFloat(v.fuel_efficiency) || 0,
    createdAt: v.created_at ? new Date(v.created_at).toISOString() : new Date().toISOString(),
    updatedAt: v.updated_at ? new Date(v.updated_at).toISOString() : new Date().toISOString(),
  };
}

function formatDriver(d) {
  if (!d) return null;
  let emergencyContact = { name: '', relation: '', phone: '' };
  try {
    emergencyContact = typeof d.emergency_contact === 'string'
      ? JSON.parse(d.emergency_contact)
      : (d.emergency_contact || emergencyContact);
  } catch (e) {}

  let license = { number: '', type: 'HMV', issueDate: '', expiryDate: '', issuingAuthority: '', endorsements: [], status: 'valid' };
  try {
    license = typeof d.license === 'string'
      ? JSON.parse(d.license)
      : (d.license || license);
  } catch (e) {}

  return {
    id: d.id,
    name: d.name,
    phone: d.phone,
    email: d.email || '',
    dateOfBirth: d.date_of_birth ? new Date(d.date_of_birth).toISOString().split('T')[0] : '',
    address: d.address || '',
    employeeId: d.employee_id,
    dateOfJoining: d.date_of_joining ? new Date(d.date_of_joining).toISOString().split('T')[0] : '',
    status: d.status || 'available',
    photo: d.photo || undefined,
    emergencyContact,
    license,
    assignedVehicle: d.assigned_vehicle || '',
    rating: parseFloat(d.rating) || 4.5,
    totalTrips: parseInt(d.total_trips) || 0,
    totalDistance: parseFloat(d.total_distance) || 0,
    currentTripId: d.current_trip_id || undefined,
  };
}

// GET /api/vehicles
app.get('/api/vehicles', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM vehicles';
    const params = [];
    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatVehicle));
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vehicles/:id
app.get('/api/vehicles/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM vehicles WHERE id = ? OR registration_no = ?',
      [req.params.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(formatVehicle(rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vehicles
app.post('/api/vehicles', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `v-${Date.now()}`;
    await pool.query(
      `INSERT INTO vehicles (
        id, registration_no, type, make, model, year, capacity, capacity_unit,
        fuel_type, status, current_driver, current_driver_phone, last_maintenance,
        next_maintenance, insurance_expiry, fitness_expiry, permit_expiry,
        odometer, fuel_efficiency, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id, b.registrationNo || b.registration_no, b.type || 'truck', b.make, b.model, b.year || 2023,
        b.capacity || 0, b.capacityUnit || b.capacity_unit || 'ton', b.fuelType || b.fuel_type || 'diesel',
        b.status || 'available', b.currentDriver || b.current_driver || null,
        b.currentDriverPhone || b.current_driver_phone || null,
        b.lastMaintenance || b.last_maintenance || null,
        b.nextMaintenance || b.next_maintenance || null,
        b.insuranceExpiry || b.insurance_expiry || null,
        b.fitnessExpiry || b.fitness_expiry || null,
        b.permitExpiry || b.permit_expiry || null,
        b.odometer || 0, b.fuelEfficiency || b.fuel_efficiency || 0
      ]
    );
    res.status(201).json({ success: true, id, message: 'Vehicle created successfully' });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/vehicles/:id
app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];

    const fieldMap = {
      registrationNo: 'registration_no',
      registration_no: 'registration_no',
      type: 'type',
      make: 'make',
      model: 'model',
      year: 'year',
      capacity: 'capacity',
      capacityUnit: 'capacity_unit',
      capacity_unit: 'capacity_unit',
      fuelType: 'fuel_type',
      fuel_type: 'fuel_type',
      status: 'status',
      currentDriver: 'current_driver',
      current_driver: 'current_driver',
      currentDriverPhone: 'current_driver_phone',
      current_driver_phone: 'current_driver_phone',
      lastMaintenance: 'last_maintenance',
      last_maintenance: 'last_maintenance',
      nextMaintenance: 'next_maintenance',
      next_maintenance: 'next_maintenance',
      insuranceExpiry: 'insurance_expiry',
      insurance_expiry: 'insurance_expiry',
      fitnessExpiry: 'fitness_expiry',
      fitness_expiry: 'fitness_expiry',
      permitExpiry: 'permit_expiry',
      permit_expiry: 'permit_expiry',
      odometer: 'odometer',
      fuelEfficiency: 'fuel_efficiency',
      fuel_efficiency: 'fuel_efficiency'
    };

    const handledCols = new Set();
    for (const [key, val] of Object.entries(b)) {
      const col = fieldMap[key];
      if (col && !handledCols.has(col)) {
        handledCols.add(col);
        updates.push(`${col} = ?`);
        params.push(val);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Vehicle updated successfully' });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/vehicles/:id
app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/drivers
app.get('/api/drivers', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM drivers';
    const params = [];
    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatDriver));
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/drivers/:id
app.get('/api/drivers/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM drivers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json(formatDriver(rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drivers
app.post('/api/drivers', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `DRV-${Date.now()}`;
    await pool.query(
      `INSERT INTO drivers (
        id, name, phone, email, date_of_birth, address, employee_id,
        date_of_joining, status, photo, emergency_contact, license,
        assigned_vehicle, rating, total_trips, total_distance, current_trip_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id, b.name, b.phone, b.email || null, b.dateOfBirth || b.date_of_birth || null,
        b.address || null, b.employeeId || b.employee_id || `EMP-${Date.now()}`,
        b.dateOfJoining || b.date_of_joining || null, b.status || 'available',
        b.photo || null, JSON.stringify(b.emergencyContact || b.emergency_contact || {}),
        JSON.stringify(b.license || {}), b.assignedVehicle || b.assigned_vehicle || null,
        b.rating || 4.5, b.totalTrips || b.total_trips || 0,
        b.totalDistance || b.total_distance || 0, b.currentTripId || b.current_trip_id || null
      ]
    );
    res.status(201).json({ success: true, id, message: 'Driver created successfully' });
  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/drivers/:id
app.put('/api/drivers/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];

    if (b.name !== undefined) { updates.push('name = ?'); params.push(b.name); }
    if (b.phone !== undefined) { updates.push('phone = ?'); params.push(b.phone); }
    if (b.email !== undefined) { updates.push('email = ?'); params.push(b.email); }
    if (b.status !== undefined) { updates.push('status = ?'); params.push(b.status); }
    if (b.address !== undefined) { updates.push('address = ?'); params.push(b.address); }
    if (b.assignedVehicle !== undefined || b.assigned_vehicle !== undefined) {
      updates.push('assigned_vehicle = ?');
      params.push(b.assignedVehicle || b.assigned_vehicle);
    }
    if (b.emergencyContact !== undefined || b.emergency_contact !== undefined) {
      updates.push('emergency_contact = ?');
      params.push(JSON.stringify(b.emergencyContact || b.emergency_contact));
    }
    if (b.license !== undefined) {
      updates.push('license = ?');
      params.push(JSON.stringify(b.license));
    }
    if (b.rating !== undefined) { updates.push('rating = ?'); params.push(b.rating); }
    if (b.totalTrips !== undefined || b.total_trips !== undefined) {
      updates.push('total_trips = ?');
      params.push(b.totalTrips ?? b.total_trips);
    }
    if (b.totalDistance !== undefined || b.total_distance !== undefined) {
      updates.push('total_distance = ?');
      params.push(b.totalDistance ?? b.total_distance);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE drivers SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Driver updated successfully' });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/drivers/:id
app.delete('/api/drivers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM drivers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// WEIGHBRIDGE API (Phase 2)
// ==========================================

function formatWeighbridgeSession(row) {
  if (!row) return null;
  let evidence = [];
  try {
    evidence = typeof row.evidence === 'string' ? JSON.parse(row.evidence) : (row.evidence || []);
  } catch (e) {}

  let printOptions = { printDuplicate: false, printQrCode: true, printImages: true };
  try {
    if (row.print_options) {
      printOptions = typeof row.print_options === 'string' ? JSON.parse(row.print_options) : row.print_options;
    }
  } catch (e) {}

  return {
    id: row.session_id,
    sessionId: row.session_id,
    transactionNo: row.transaction_no ? parseInt(row.transaction_no) : 0,
    vehicleRegNo: row.vehicle_reg_no || '',
    partyName: row.party_name || '',
    firmName: row.firm_name || '',
    product: row.material || '',
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    firstWeight: row.first_weight !== null && row.first_weight !== undefined ? parseFloat(row.first_weight) : (row.tare_weight !== null ? parseFloat(row.tare_weight) : null),
    firstWeightTime: row.first_weight_time ? new Date(row.first_weight_time).toISOString() : (row.timestamp ? new Date(row.timestamp).toISOString() : null),
    secondWeight: row.second_weight !== null && row.second_weight !== undefined ? parseFloat(row.second_weight) : (row.gross_weight !== null ? parseFloat(row.gross_weight) : null),
    secondWeightTime: row.second_weight_time ? new Date(row.second_weight_time).toISOString() : null,
    tareWeight: row.tare_weight !== null ? parseFloat(row.tare_weight) : null,
    grossWeight: row.gross_weight !== null ? parseFloat(row.gross_weight) : null,
    netWeight: row.net_weight !== null ? parseFloat(row.net_weight) : null,
    driverName: row.driver_name || '',
    material: row.material || '',
    rate: row.rate !== null && row.rate !== undefined ? parseFloat(row.rate) : 0,
    moisture: row.moisture !== null && row.moisture !== undefined ? parseFloat(row.moisture) : 0,
    deduction: row.deduction !== null && row.deduction !== undefined ? parseFloat(row.deduction) : 0,
    charges: row.charges !== null && row.charges !== undefined ? parseFloat(row.charges) : 0,
    vehicleType: row.vehicle_type || '',
    bagsBales: row.bags_bales || '',
    agent: row.agent || '',
    village: row.village || '',
    chessNo: row.chess_no || '',
    chessAmount: row.chess_amount !== null && row.chess_amount !== undefined ? parseFloat(row.chess_amount) : 0,
    chessName: row.chess_name || '',
    finalRate: row.final_rate !== null && row.final_rate !== undefined ? parseFloat(row.final_rate) : 0,
    totalAmount: row.total_amount !== null && row.total_amount !== undefined ? parseFloat(row.total_amount) : 0,
    printOptions,
    destination: row.destination || '',
    evidence,
    status: row.status || 'tare',
    operatorId: row.operator_id || 'OP001',
    operatorName: row.operator_name || 'System Operator',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatWeighSlip(row) {
  if (!row) return null;
  let evidence = [];
  try {
    evidence = typeof row.evidence === 'string' ? JSON.parse(row.evidence) : (row.evidence || []);
  } catch (e) {}

  let printOptions = { printDuplicate: false, printQrCode: true, printImages: true };
  try {
    if (row.print_options) {
      printOptions = typeof row.print_options === 'string' ? JSON.parse(row.print_options) : row.print_options;
    }
  } catch (e) {}

  return {
    slipNumber: row.slip_number,
    sessionId: row.session_id,
    transactionNo: row.transaction_no ? parseInt(row.transaction_no) : 0,
    vehicleRegNo: row.vehicle_reg_no || '',
    partyName: row.party_name || '',
    firmName: row.firm_name || '',
    product: row.material || '',
    dateTime: row.date_time ? new Date(row.date_time).toISOString() : new Date().toISOString(),
    firstWeight: row.first_weight !== null && row.first_weight !== undefined ? parseFloat(row.first_weight) : (row.tare_weight !== null ? parseFloat(row.tare_weight) : 0),
    firstWeightTime: row.first_weight_time ? new Date(row.first_weight_time).toISOString() : null,
    secondWeight: row.second_weight !== null && row.second_weight !== undefined ? parseFloat(row.second_weight) : (row.gross_weight !== null ? parseFloat(row.gross_weight) : 0),
    secondWeightTime: row.second_weight_time ? new Date(row.second_weight_time).toISOString() : null,
    tareWeight: parseFloat(row.tare_weight) || 0,
    grossWeight: parseFloat(row.gross_weight) || 0,
    netWeight: parseFloat(row.net_weight) || 0,
    material: row.material || '',
    rate: row.rate !== null && row.rate !== undefined ? parseFloat(row.rate) : 0,
    moisture: row.moisture !== null && row.moisture !== undefined ? parseFloat(row.moisture) : 0,
    deduction: row.deduction !== null && row.deduction !== undefined ? parseFloat(row.deduction) : 0,
    charges: row.charges !== null && row.charges !== undefined ? parseFloat(row.charges) : 0,
    vehicleType: row.vehicle_type || '',
    bagsBales: row.bags_bales || '',
    agent: row.agent || '',
    village: row.village || '',
    chessNo: row.chess_no || '',
    chessAmount: row.chess_amount !== null && row.chess_amount !== undefined ? parseFloat(row.chess_amount) : 0,
    chessName: row.chess_name || '',
    finalRate: row.final_rate !== null && row.final_rate !== undefined ? parseFloat(row.final_rate) : 0,
    totalAmount: row.total_amount !== null && row.total_amount !== undefined ? parseFloat(row.total_amount) : 0,
    printOptions,
    driverName: row.driver_name || '',
    destination: row.destination || '',
    operatorName: row.operator_name || 'System Operator',
    evidence,
    createdAt: row.created_at,
  };
}

// GET /api/weighbridge/next-transaction-no
app.get('/api/weighbridge/next-transaction-no', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COALESCE(MAX(transaction_no), 0) + 1 AS nextTx FROM weighbridge_sessions');
    res.json({ nextTransactionNo: rows[0].nextTx || 1 });
  } catch (error) {
    console.error('Get next transaction no error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/weighbridge/pending-vehicles
app.get('/api/weighbridge/pending-vehicles', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM weighbridge_sessions 
       WHERE (second_weight IS NULL OR status = 'pending_2nd_weight' OR status = '1st_weight_complete' OR status = 'tare')
       AND (first_weight IS NOT NULL OR tare_weight IS NOT NULL)
       ORDER BY created_at DESC LIMIT 50`
    );
    res.json(rows.map(formatWeighbridgeSession));
  } catch (error) {
    console.error('Get pending vehicles error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/weighbridge/sessions
app.get('/api/weighbridge/sessions', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM weighbridge_sessions';
    const params = [];
    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatWeighbridgeSession));
  } catch (error) {
    console.error('Get weighbridge sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/weighbridge/sessions/:id
app.get('/api/weighbridge/sessions/:id', async (req, res) => {
  try {
    const isNumeric = /^\d+$/.test(req.params.id);
    let rows;
    if (isNumeric) {
      [rows] = await pool.query('SELECT * FROM weighbridge_sessions WHERE transaction_no = ? OR session_id = ?', [parseInt(req.params.id), req.params.id]);
    } else {
      [rows] = await pool.query('SELECT * FROM weighbridge_sessions WHERE session_id = ?', [req.params.id]);
    }
    if (rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    res.json(formatWeighbridgeSession(rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/weighbridge/sessions
app.post('/api/weighbridge/sessions', async (req, res) => {
  try {
    const b = req.body;
    const sessionId = b.sessionId || b.session_id || `WB-SESS-${Date.now()}`;

    // Auto-calculate transaction number if omitted
    let txNo = b.transactionNo || b.transaction_no;
    if (!txNo) {
      const [maxRes] = await pool.query('SELECT COALESCE(MAX(transaction_no), 0) + 1 AS nextTx FROM weighbridge_sessions');
      txNo = maxRes[0].nextTx || 1;
    }

    const firstWeight = b.firstWeight !== undefined ? b.firstWeight : (b.tareWeight !== undefined ? b.tareWeight : null);
    const secondWeight = b.secondWeight !== undefined ? b.secondWeight : (b.grossWeight !== undefined ? b.grossWeight : null);

    let netWeight = b.netWeight;
    if (netWeight === undefined || netWeight === null) {
      if (firstWeight !== null && secondWeight !== null) {
        netWeight = Math.abs(secondWeight - firstWeight);
      } else {
        netWeight = null;
      }
    }

    await pool.query(
      `INSERT INTO weighbridge_sessions (
        session_id, transaction_no, vehicle_reg_no, party_name, firm_name,
        timestamp, first_weight, first_weight_time, second_weight, second_weight_time,
        tare_weight, gross_weight, net_weight, material, rate, moisture, deduction,
        charges, vehicle_type, bags_bales, agent, village, chess_no, chess_amount,
        chess_name, final_rate, total_amount, print_options, driver_name, destination,
        evidence, status, operator_id, operator_name, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        NOW(), ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, NOW(), NOW()
      )`,
      [
        sessionId,
        txNo,
        b.vehicleRegNo || b.vehicle_reg_no || '',
        b.partyName || b.party_name || '',
        b.firmName || b.firm_name || '',
        firstWeight,
        b.firstWeightTime ? new Date(b.firstWeightTime) : (firstWeight !== null ? new Date() : null),
        secondWeight,
        b.secondWeightTime ? new Date(b.secondWeightTime) : (secondWeight !== null ? new Date() : null),
        b.tareWeight !== undefined ? b.tareWeight : firstWeight,
        b.grossWeight !== undefined ? b.grossWeight : secondWeight,
        netWeight,
        b.material || b.product || '',
        b.rate !== undefined ? b.rate : 0,
        b.moisture !== undefined ? b.moisture : 0,
        b.deduction !== undefined ? b.deduction : 0,
        b.charges !== undefined ? b.charges : 0,
        b.vehicleType || b.vehicle_type || '',
        b.bagsBales || b.bags_bales || '',
        b.agent || '',
        b.village || '',
        b.chessNo || b.chess_no || '',
        b.chessAmount !== undefined ? b.chessAmount : 0,
        b.chessName || b.chess_name || '',
        b.finalRate !== undefined ? b.finalRate : 0,
        b.totalAmount !== undefined ? b.totalAmount : 0,
        JSON.stringify(b.printOptions || { printDuplicate: false, printQrCode: true, printImages: true }),
        b.driverName || b.driver_name || '',
        b.destination || '',
        JSON.stringify(b.evidence || []),
        b.status || (secondWeight ? 'completed' : 'pending_2nd_weight'),
        b.operatorId || 'OP001',
        b.operatorName || 'System Operator'
      ]
    );

    res.status(201).json({ success: true, sessionId, transactionNo: txNo, message: 'Weighbridge session created' });
  } catch (error) {
    console.error('Create weighbridge session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/weighbridge/sessions/:id
app.put('/api/weighbridge/sessions/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];

    if (b.vehicleRegNo !== undefined) { updates.push('vehicle_reg_no = ?'); params.push(b.vehicleRegNo); }
    if (b.partyName !== undefined) { updates.push('party_name = ?'); params.push(b.partyName); }
    if (b.firmName !== undefined) { updates.push('firm_name = ?'); params.push(b.firmName); }
    if (b.firstWeight !== undefined) { updates.push('first_weight = ?'); params.push(b.firstWeight); }
    if (b.firstWeightTime !== undefined) { updates.push('first_weight_time = ?'); params.push(b.firstWeightTime ? new Date(b.firstWeightTime) : null); }
    if (b.secondWeight !== undefined) { updates.push('second_weight = ?'); params.push(b.secondWeight); }
    if (b.secondWeightTime !== undefined) { updates.push('second_weight_time = ?'); params.push(b.secondWeightTime ? new Date(b.secondWeightTime) : null); }
    if (b.tareWeight !== undefined) { updates.push('tare_weight = ?'); params.push(b.tareWeight); }
    if (b.grossWeight !== undefined) { updates.push('gross_weight = ?'); params.push(b.grossWeight); }
    if (b.netWeight !== undefined) { updates.push('net_weight = ?'); params.push(b.netWeight); }
    if (b.material !== undefined) { updates.push('material = ?'); params.push(b.material); }
    if (b.product !== undefined) { updates.push('material = ?'); params.push(b.product); }
    if (b.rate !== undefined) { updates.push('rate = ?'); params.push(b.rate); }
    if (b.moisture !== undefined) { updates.push('moisture = ?'); params.push(b.moisture); }
    if (b.deduction !== undefined) { updates.push('deduction = ?'); params.push(b.deduction); }
    if (b.charges !== undefined) { updates.push('charges = ?'); params.push(b.charges); }
    if (b.vehicleType !== undefined) { updates.push('vehicle_type = ?'); params.push(b.vehicleType); }
    if (b.bagsBales !== undefined) { updates.push('bags_bales = ?'); params.push(b.bagsBales); }
    if (b.agent !== undefined) { updates.push('agent = ?'); params.push(b.agent); }
    if (b.village !== undefined) { updates.push('village = ?'); params.push(b.village); }
    if (b.chessNo !== undefined) { updates.push('chess_no = ?'); params.push(b.chessNo); }
    if (b.chessAmount !== undefined) { updates.push('chess_amount = ?'); params.push(b.chessAmount); }
    if (b.chessName !== undefined) { updates.push('chess_name = ?'); params.push(b.chessName); }
    if (b.finalRate !== undefined) { updates.push('final_rate = ?'); params.push(b.finalRate); }
    if (b.totalAmount !== undefined) { updates.push('total_amount = ?'); params.push(b.totalAmount); }
    if (b.printOptions !== undefined) { updates.push('print_options = ?'); params.push(JSON.stringify(b.printOptions)); }
    if (b.status !== undefined) { updates.push('status = ?'); params.push(b.status); }
    if (b.evidence !== undefined) { updates.push('evidence = ?'); params.push(JSON.stringify(b.evidence)); }
    if (b.driverName !== undefined) { updates.push('driver_name = ?'); params.push(b.driverName); }
    if (b.destination !== undefined) { updates.push('destination = ?'); params.push(b.destination); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');

    const isNumeric = /^\d+$/.test(req.params.id);
    if (isNumeric) {
      await pool.query(`UPDATE weighbridge_sessions SET ${updates.join(', ')} WHERE transaction_no = ? OR session_id = ?`, [...params, parseInt(req.params.id), req.params.id]);
    } else {
      await pool.query(`UPDATE weighbridge_sessions SET ${updates.join(', ')} WHERE session_id = ?`, [...params, req.params.id]);
    }
    res.json({ success: true, message: 'Session updated successfully' });
  } catch (error) {
    console.error('Update weighbridge session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== WEIGHBRIDGE CAMERA SNAPSHOTS & FTP SYNC ====================

// Helper: upload files to FTP server
async function uploadFilesToFtp(files, ftpConfig) {
  if (!ftpConfig || !ftpConfig.enabled || !ftpConfig.host) {
    return { enabled: false, message: 'FTP upload disabled or host not configured' };
  }
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access({
      host: ftpConfig.host,
      port: parseInt(ftpConfig.port) || 21,
      user: ftpConfig.user || 'anonymous',
      password: ftpConfig.password || '',
      secure: Boolean(ftpConfig.secure),
      timeout: 5000,
    });

    const remoteDir = ftpConfig.remoteDir || '/snapshots';
    if (remoteDir && remoteDir !== '/' && remoteDir !== '.') {
      await client.ensureDir(remoteDir);
    }

    const results = [];
    for (const f of files) {
      try {
        await client.uploadFrom(f.localPath, f.fileName);
        results.push({ fileName: f.fileName, success: true, remotePath: `${remoteDir}/${f.fileName}` });
      } catch (err) {
        console.warn(`FTP file upload failed for ${f.fileName}:`, err.message);
        results.push({ fileName: f.fileName, success: false, error: err.message });
      }
    }
    return { enabled: true, success: true, results };
  } catch (err) {
    console.warn('FTP connection failed:', err.message);
    return { enabled: true, success: false, error: err.message };
  } finally {
    client.close();
  }
}

// POST /api/weighbridge/snapshots/upload
app.post('/api/weighbridge/snapshots/upload', async (req, res) => {
  try {
    const { transactionNo, vehicleRegNo, weight, images, imageData, angle = 'front', camId = 'cam1' } = req.body;
    const items = Array.isArray(images) && images.length > 0 
      ? images 
      : (imageData ? [{ camId, angle, dataUrl: imageData }] : []);

    if (items.length === 0) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const txNo = transactionNo || '0';
    const now = Date.now();
    const savedFiles = [];
    const snapshots = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cId = item.camId || `cam${i + 1}`;
      const cName = item.camName || (cId === 'cam1' ? 'Camera 1 (Front ANPR)' : 'Camera 2 (Deck & Chute)');
      const cAngle = item.angle || (i === 0 ? 'front' : (i === 1 ? 'side' : 'rear'));
      const rawData = item.dataUrl || item.imageData || '';
      
      const base64Data = rawData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `wb-tx${txNo}-${cId}-${now}-${i}.jpg`;
      const localPath = path.join(snapshotsDir, fileName);

      fs.writeFileSync(localPath, buffer);
      const url = `/snapshots/${fileName}`;

      savedFiles.push({ localPath, fileName, cId, angle: cAngle });
      snapshots.push({
        id: `ev-wb-${now}-${i}`,
        type: 'image',
        url,
        angle: cAngle,
        camId: cId,
        camName: cName,
        timestamp: new Date().toISOString(),
        fileName,
      });
    }

    // Check FTP config from company_settings
    let ftpSummary = { enabled: false, message: 'FTP not enabled in company settings' };
    try {
      const [rows] = await pool.query('SELECT weighbridge_defaults FROM company_settings LIMIT 1');
      if (rows.length > 0 && rows[0].weighbridge_defaults) {
        const defaults = typeof rows[0].weighbridge_defaults === 'string'
          ? JSON.parse(rows[0].weighbridge_defaults)
          : rows[0].weighbridge_defaults;
        if (defaults && defaults.ftp && defaults.ftp.enabled) {
          ftpSummary = await uploadFilesToFtp(savedFiles, defaults.ftp);
        }
      }
    } catch (ftpErr) {
      console.warn('FTP check error:', ftpErr.message);
      ftpSummary = { enabled: true, success: false, error: ftpErr.message };
    }

    // Merge FTP status into snapshots
    const enrichedSnapshots = snapshots.map((s, idx) => {
      const ftpResult = ftpSummary.results ? ftpSummary.results[idx] : null;
      return {
        ...s,
        ftpStatus: ftpResult || { enabled: ftpSummary.enabled, success: ftpSummary.success, error: ftpSummary.error },
      };
    });

    res.json({
      success: true,
      message: `Captured ${savedFiles.length} snapshot(s) successfully`,
      snapshots: enrichedSnapshots,
      ftpSummary,
    });
  } catch (error) {
    console.error('Snapshot upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/company-settings/test-ftp
app.post('/api/company-settings/test-ftp', async (req, res) => {
  const { host, port = 21, user = 'anonymous', password = '', secure = false, remoteDir = '/snapshots' } = req.body;
  if (!host) {
    return res.status(400).json({ success: false, error: 'FTP Host is required' });
  }

  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access({
      host,
      port: parseInt(port) || 21,
      user,
      password,
      secure: Boolean(secure),
      timeout: 5000,
    });

    if (remoteDir && remoteDir !== '/' && remoteDir !== '.') {
      await client.ensureDir(remoteDir);
    }
    const list = await client.list();
    client.close();
    res.json({
      success: true,
      message: `Connected successfully to FTP server at ${host}:${port}! Directory verified (${list.length} items found).`,
    });
  } catch (err) {
    client.close();
    console.warn('FTP test connection failed:', err.message);
    res.status(500).json({
      success: false,
      error: `FTP Connection Failed: ${err.message}`,
    });
  }
});

// ==================== THIRD-PARTY WEIGHBRIDGE INTEGRATION ENGINE ====================

// In-memory live scale state, defaults to zero (00000)
let liveScaleReading = {
  weight: 0,
  unit: 'kg',
  stable: true,
  zero: true,
  timestamp: new Date().toISOString(),
  source: 'standby',
  connected: false,
};

// Default scale data directory for third-party file sync
const scaleDataDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(scaleDataDir)) {
  fs.mkdirSync(scaleDataDir, { recursive: true });
}
const defaultScaleFilePath = path.join(scaleDataDir, 'live_scale_weight.txt');
if (!fs.existsSync(defaultScaleFilePath)) {
  // Initialize with 0 so indicator reads 00000
  fs.writeFileSync(defaultScaleFilePath, '0\n', 'utf8');
}

// Helper: resolve relative or absolute scale path
function resolveScalePath(targetPath) {
  if (!targetPath) return defaultScaleFilePath;
  if (path.isAbsolute(targetPath) && fs.existsSync(targetPath)) return targetPath;
  const projectRel = path.resolve(__dirname, '..', targetPath);
  if (fs.existsSync(projectRel)) return projectRel;
  const cwdRel = path.resolve(process.cwd(), targetPath);
  if (fs.existsSync(cwdRel)) return cwdRel;
  return targetPath;
}

// Helper: read and parse weight from third-party shared file
function readScaleFromFile(targetPath) {
  try {
    const p = resolveScalePath(targetPath);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8').trim();
      const match = content.match(/([+-]?\d+(?:\.\d+)?)/);
      if (match) {
        const val = Math.max(0, Math.round(parseFloat(match[1])));
        return {
          weight: val,
          unit: 'kg',
          stable: true,
          zero: val === 0,
          timestamp: new Date().toISOString(),
          source: 'file_monitor',
          connected: true,
          filePath: p,
          raw: content,
        };
      }
    }
  } catch (err) {
    console.warn('Read scale file error:', err.message);
  }
  return null;
}

// GET /api/weighbridge/live-weight
// Returns current live weight from third-party scale (or 00000 standby)
app.get('/api/weighbridge/live-weight', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT weighbridge_defaults FROM company_settings LIMIT 1');
    let scaleConfig = null;
    if (rows.length > 0 && rows[0].weighbridge_defaults) {
      const defaults = typeof rows[0].weighbridge_defaults === 'string'
        ? JSON.parse(rows[0].weighbridge_defaults)
        : rows[0].weighbridge_defaults;
      scaleConfig = defaults?.thirdPartyScale;
    }

    if (scaleConfig && scaleConfig.enabled && scaleConfig.mode === 'file_monitor') {
      const fileReading = readScaleFromFile(scaleConfig.filePath || defaultScaleFilePath);
      if (fileReading) {
        liveScaleReading = { ...liveScaleReading, ...fileReading };
      }
    }

    res.json(liveScaleReading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/weighbridge/third-party/push
// Webhook for third-party weighbridge desktop applications / external bridges
app.post('/api/weighbridge/third-party/push', (req, res) => {
  try {
    const { weight = 0, unit = 'kg', stable = true, source = 'third_party_software' } = req.body;
    const numWeight = Math.max(0, Math.round(Number(weight) || 0));

    liveScaleReading = {
      weight: numWeight,
      unit: unit === 'ton' ? 'ton' : 'kg',
      stable: Boolean(stable),
      zero: numWeight === 0,
      timestamp: new Date().toISOString(),
      source,
      connected: true,
    };

    res.json({
      success: true,
      message: `Live weight updated to ${numWeight} ${unit}`,
      reading: liveScaleReading,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/weighbridge/third-party/zero
// Reset live weight to 0 (00000)
app.post('/api/weighbridge/third-party/zero', (req, res) => {
  liveScaleReading = {
    weight: 0,
    unit: 'kg',
    stable: true,
    zero: true,
    timestamp: new Date().toISOString(),
    source: 'zero_command',
    connected: true,
  };
  try {
    if (fs.existsSync(defaultScaleFilePath)) {
      fs.writeFileSync(defaultScaleFilePath, '0\n', 'utf8');
    }
  } catch (e) {}
  res.json({ success: true, message: 'Scale zeroed successfully to 00000', reading: liveScaleReading });
});

// POST /api/weighbridge/third-party/simulate
// Update simulated weight for testing
app.post('/api/weighbridge/third-party/simulate', (req, res) => {
  const { weight = 24580, stable = true } = req.body;
  const numWeight = Math.max(0, Math.round(Number(weight) || 0));
  liveScaleReading = {
    weight: numWeight,
    unit: 'kg',
    stable: Boolean(stable),
    zero: numWeight === 0,
    timestamp: new Date().toISOString(),
    source: 'simulation',
    connected: true,
  };
  try {
    if (fs.existsSync(defaultScaleFilePath)) {
      fs.writeFileSync(defaultScaleFilePath, `${numWeight}\n`, 'utf8');
    }
  } catch (e) {}
  res.json({ success: true, message: `Simulated weight set to ${numWeight} kg`, reading: liveScaleReading });
});

// POST /api/weighbridge/third-party/test-source
// Tests file existence or TCP port reachability
app.post('/api/weighbridge/third-party/test-source', async (req, res) => {
  try {
    const { mode = 'file_monitor', filePath, tcpHost, tcpPort } = req.body;
    if (mode === 'file_monitor') {
      const p = resolveScalePath(filePath);
      const exists = fs.existsSync(p);
      let content = '';
      if (exists) {
        content = fs.readFileSync(p, 'utf8').trim();
      }
      return res.json({
        success: exists,
        mode: 'file_monitor',
        filePath: p,
        exists,
        sampleContent: content,
        message: exists
          ? `File verified successfully at ${p}. Current content: "${content}"`
          : `File not found at ${p}. Please ensure third-party software exports to this path.`,
      });
    } else if (mode === 'tcp_socket') {
      if (!tcpHost || !tcpPort) {
        return res.status(400).json({ success: false, error: 'TCP Host and Port are required' });
      }
      const s = new net.Socket();
      s.setTimeout(3000);
      s.on('connect', () => {
        s.destroy();
        res.json({ success: true, message: `TCP scale connection established at ${tcpHost}:${tcpPort}!` });
      });
      s.on('timeout', () => {
        s.destroy();
        res.status(500).json({ success: false, error: `Connection timed out to ${tcpHost}:${tcpPort}` });
      });
      s.on('error', (err) => {
        s.destroy();
        res.status(500).json({ success: false, error: `TCP connection failed: ${err.message}` });
      });
      s.connect(Number(tcpPort), tcpHost);
      return;
    }

    res.json({ success: true, message: 'Source tested successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/weighbridge/slips
app.get('/api/weighbridge/slips', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const [rows] = await pool.query(
      'SELECT * FROM weigh_slips ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [parseInt(limit), parseInt(offset)]
    );
    res.json(rows.map(formatWeighSlip));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/weighbridge/slips
app.post('/api/weighbridge/slips', async (req, res) => {
  try {
    const b = req.body;
    const slipNumber = b.slipNumber || `SLIP-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    await pool.query(
      `INSERT INTO weigh_slips (
        slip_number, session_id, transaction_no, vehicle_reg_no, party_name, firm_name,
        date_time, first_weight, first_weight_time, second_weight, second_weight_time,
        tare_weight, gross_weight, net_weight, material, rate, moisture, deduction,
        charges, vehicle_type, bags_bales, agent, village, chess_no, chess_amount,
        chess_name, final_rate, total_amount, print_options, driver_name, destination,
        operator_name, evidence, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        NOW(), ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, NOW()
      )`,
      [
        slipNumber,
        b.sessionId || `WB-SESS-${Date.now()}`,
        b.transactionNo || 0,
        b.vehicleRegNo || '',
        b.partyName || '',
        b.firmName || '',
        b.firstWeight !== undefined ? b.firstWeight : (b.tareWeight || 0),
        b.firstWeightTime ? new Date(b.firstWeightTime) : null,
        b.secondWeight !== undefined ? b.secondWeight : (b.grossWeight || 0),
        b.secondWeightTime ? new Date(b.secondWeightTime) : null,
        b.tareWeight || 0,
        b.grossWeight || 0,
        b.netWeight || 0,
        b.material || b.product || '',
        b.rate !== undefined ? b.rate : 0,
        b.moisture !== undefined ? b.moisture : 0,
        b.deduction !== undefined ? b.deduction : 0,
        b.charges !== undefined ? b.charges : 0,
        b.vehicleType || '',
        b.bagsBales || '',
        b.agent || '',
        b.village || '',
        b.chessNo || '',
        b.chessAmount !== undefined ? b.chessAmount : 0,
        b.chessName || '',
        b.finalRate !== undefined ? b.finalRate : 0,
        b.totalAmount !== undefined ? b.totalAmount : 0,
        JSON.stringify(b.printOptions || { printDuplicate: false, printQrCode: true, printImages: true }),
        b.driverName || '',
        b.destination || '',
        b.operatorName || 'System Operator',
        JSON.stringify(b.evidence || [])
      ]
    );

    res.status(201).json({ success: true, slipNumber, message: 'Weigh slip generated' });
  } catch (error) {
    console.error('Create weigh slip error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// TRIPS & TRACKING API (Phase 2)
// ==========================================

function toSqlDatetime(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}


function formatTrip(row) {
  if (!row) return null;

  const parseJson = (val, def) => {
    try {
      return typeof val === 'string' ? JSON.parse(val) : (val || def);
    } catch (e) {
      return def;
    }
  };

  return {
    id: row.id,
    tripNumber: row.trip_number,
    vehicleId: row.vehicle_id || '',
    vehicleRegNo: row.vehicle_reg_no,
    driverId: row.driver_id || '',
    driverName: row.driver_name || '',
    driverPhone: row.driver_phone || '',
    customerId: row.customer_id || '',
    customerName: row.customer_name || '',
    customerContact: row.customer_contact || '',
    material: row.material || '',
    quantity: parseFloat(row.quantity) || 0,
    unit: row.unit || 'ton',
    origin: parseJson(row.origin, { name: 'RMC Plant', address: '', location: { latitude: 19.1, longitude: 72.9 } }),
    destination: parseJson(row.destination, { name: 'Customer Site', address: '', location: { latitude: 19.05, longitude: 72.82 } }),
    waypoints: parseJson(row.waypoints, []),
    scheduledStartTime: row.scheduled_start_time ? new Date(row.scheduled_start_time).toISOString() : new Date().toISOString(),
    actualStartTime: row.actual_start_time ? new Date(row.actual_start_time).toISOString() : undefined,
    estimatedArrival: row.estimated_arrival ? new Date(row.estimated_arrival).toISOString() : new Date().toISOString(),
    actualArrival: row.actual_arrival ? new Date(row.actual_arrival).toISOString() : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    status: row.status || 'scheduled',
    totalDistance: parseFloat(row.total_distance) || 0,
    distanceCovered: parseFloat(row.distance_covered) || 0,
    distanceRemaining: parseFloat(row.distance_remaining) || 0,
    currentLocation: parseJson(row.current_location, undefined),
    gpsConfig: parseJson(row.gps_config, { isEnabled: false, trackingInterval: 30 }),
    priority: row.priority || 'normal',
    notes: row.notes || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

// GET /api/trips
app.get('/api/trips', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM trips';
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatTrip));
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/trips/:id
app.get('/api/trips/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM trips WHERE id = ? OR trip_number = ?',
      [req.params.id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Trip not found' });
    res.json(formatTrip(rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/trips
app.post('/api/trips', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `trip-${Date.now()}`;
    const tripNumber = b.tripNumber || `TRP-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    await pool.query(
      `INSERT INTO trips (
        id, trip_number, vehicle_id, vehicle_reg_no, driver_id, driver_name,
        driver_phone, customer_id, customer_name, customer_contact, material,
        quantity, unit, origin, destination, waypoints, scheduled_start_time,
        estimated_arrival, status, total_distance, distance_covered,
        distance_remaining, current_location, gps_config, notes, priority,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        tripNumber,
        b.vehicleId || null,
        b.vehicleRegNo,
        b.driverId || null,
        b.driverName || '',
        b.driverPhone || '',
        b.customerId || null,
        b.customerName || '',
        b.customerContact || null,
        b.material || '',
        b.quantity || 0,
        b.unit || 'ton',
        JSON.stringify(b.origin || {}),
        JSON.stringify(b.destination || {}),
        JSON.stringify(b.waypoints || []),
        toSqlDatetime(b.scheduledStartTime) || toSqlDatetime(new Date()),
        toSqlDatetime(b.estimatedArrival) || toSqlDatetime(new Date()),
        b.status || 'scheduled',
        b.totalDistance || 0,
        b.distanceCovered || 0,
        b.distanceRemaining || b.totalDistance || 0,
        JSON.stringify(b.currentLocation || null),
        JSON.stringify(b.gpsConfig || { isEnabled: false }),
        b.notes || '',
        b.priority || 'normal'
      ]
    );

    // Also record a 'created' event in trip_events
    await pool.query(
      `INSERT INTO trip_events (id, trip_id, timestamp, event_type, description, location, created_at)
       VALUES (?, ?, NOW(), 'created', 'Trip created and scheduled', ?, NOW())`,
      [`evt-${Date.now()}`, id, JSON.stringify(b.currentLocation || {})]
    );

    res.status(201).json({ success: true, id, tripNumber, message: 'Trip created successfully' });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/trips/:id/status
app.put('/api/trips/:id/status', async (req, res) => {
  try {
    const { status, description, location } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const updates = ['status = ?', 'updated_at = NOW()'];
    const params = [status];

    if (status === 'in_transit' || status === 'dispatched') {
      updates.push('actual_start_time = COALESCE(actual_start_time, NOW())');
    } else if (status === 'completed') {
      updates.push('completed_at = NOW()');
    }

    params.push(req.params.id);

    await pool.query(`UPDATE trips SET ${updates.join(', ')} WHERE id = ?`, params);

    // Record milestone event in trip_events
    await pool.query(
      `INSERT INTO trip_events (id, trip_id, timestamp, event_type, description, location, created_at)
       VALUES (?, ?, NOW(), ?, ?, ?, NOW())`,
      [
        `evt-${Date.now()}`,
        req.params.id,
        status,
        description || `Trip status updated to ${status}`,
        JSON.stringify(location || {})
      ]
    );

    res.json({ success: true, status, message: `Trip transitioned to ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/trips/:id (update location or metrics)
app.put('/api/trips/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];

    if (b.currentLocation !== undefined) {
      updates.push('current_location = ?');
      params.push(JSON.stringify(b.currentLocation));
    }
    if (b.distanceCovered !== undefined) {
      updates.push('distance_covered = ?');
      params.push(b.distanceCovered);
    }
    if (b.distanceRemaining !== undefined) {
      updates.push('distance_remaining = ?');
      params.push(b.distanceRemaining);
    }
    if (b.notes !== undefined) {
      updates.push('notes = ?');
      params.push(b.notes);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE trips SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Trip updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/trips/:id/events
app.get('/api/trips/:id/events', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM trip_events WHERE trip_id = ? ORDER BY timestamp ASC',
      [req.params.id]
    );

    const events = rows.map(r => {
      let loc;
      try {
        loc = typeof r.location === 'string' ? JSON.parse(r.location) : r.location;
      } catch (e) {}
      return {
        id: r.id,
        tripId: r.trip_id,
        type: r.event_type,
        timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
        description: r.description,
        location: loc,
      };
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/trips/:id/events
app.post('/api/trips/:id/events', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `evt-${Date.now()}`;
    await pool.query(
      `INSERT INTO trip_events (id, trip_id, timestamp, event_type, description, location, created_at)
       VALUES (?, ?, NOW(), ?, ?, ?, NOW())`,
      [id, req.params.id, b.type || 'note_added', b.description || '', JSON.stringify(b.location || {})]
    );
    res.status(201).json({ success: true, id, message: 'Trip event recorded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// LOADING BAYS & SESSIONS API (Phase 3)
// ==========================================

function formatLoadingBay(row) {
  if (!row) return null;
  let currentSession = undefined;
  try {
    currentSession = typeof row.current_session === 'string'
      ? JSON.parse(row.current_session)
      : (row.current_session || undefined);
  } catch (e) {}

  return {
    id: row.id,
    name: row.name,
    status: row.status || 'available',
    currentSession,
    capacity: row.capacity || 60,
    location: row.location || 'Batching Plant Area',
    updatedAt: row.updated_at,
  };
}

// GET /api/loading-bays
app.get('/api/loading-bays', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM loading_bays ORDER BY id ASC');
    res.json(rows.map(formatLoadingBay));
  } catch (error) {
    console.error('Get loading bays error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/loading-bays/:id
app.get('/api/loading-bays/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM loading_bays WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Loading bay not found' });
    res.json(formatLoadingBay(rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/loading-bays/:id
app.put('/api/loading-bays/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];

    if (b.status !== undefined) { updates.push('status = ?'); params.push(b.status); }
    if (b.name !== undefined) { updates.push('name = ?'); params.push(b.name); }
    if (b.capacity !== undefined) { updates.push('capacity = ?'); params.push(b.capacity); }
    if (b.location !== undefined) { updates.push('location = ?'); params.push(b.location); }
    if (b.currentSession !== undefined) {
      updates.push('current_session = ?');
      params.push(b.currentSession ? JSON.stringify(b.currentSession) : null);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE loading_bays SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Loading bay updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/loading-sessions
app.post('/api/loading-sessions', async (req, res) => {
  try {
    const b = req.body;
    const sessionId = b.sessionId || `LS-${Date.now()}`;

    await pool.query(
      `INSERT INTO loading_sessions (
        session_id, bay_id, vehicle_reg_no, mix_design_id, start_time,
        materials, quality_checks, overall_progress, status, operator_id, created_at
      ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, NOW())`,
      [
        sessionId,
        b.bayId,
        b.vehicleRegNo,
        b.mixDesignId || 'MIX-M25',
        JSON.stringify(b.materials || []),
        JSON.stringify(b.qualityChecks || []),
        b.overallProgress || 0,
        b.status || 'in_progress',
        b.operatorId || 'OP-001'
      ]
    );

    // Update bay status
    await pool.query(
      'UPDATE loading_bays SET status = ?, current_session = ?, updated_at = NOW() WHERE id = ?',
      ['loading', JSON.stringify({ ...b, sessionId, startTime: new Date().toISOString() }), b.bayId]
    );

    res.status(201).json({ success: true, sessionId, message: 'Loading session started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// DISPATCH APPROVAL API (Phase 3)
// ==========================================

function formatDispatch(row) {
  if (!row) return null;
  const parseJson = (v, def) => {
    try { return typeof v === 'string' ? JSON.parse(v) : (v || def); } catch (e) { return def; }
  };

  return {
    id: row.id,
    vehicleRegNo: row.vehicle_reg_no,
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    material: row.material || '',
    quantity: parseFloat(row.quantity) || 0,
    unit: row.unit || 'ton',
    customer: row.customer || '',
    documentation: parseJson(row.documentation, []),
    route: parseJson(row.route, undefined),
    plateImages: parseJson(row.plate_images, []),
    status: row.status || 'pending',
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at ? new Date(row.approved_at).toISOString() : undefined,
    rejectionReason: row.rejection_reason || undefined,
  };
}

// GET /api/dispatches
app.get('/api/dispatches', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM dispatches';
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatDispatch));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/dispatches
app.post('/api/dispatches', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `DISP-${Date.now()}`;

    await pool.query(
      `INSERT INTO dispatches (
        id, vehicle_reg_no, timestamp, material, quantity, unit,
        customer, documentation, route, plate_images, status, created_at
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        b.vehicleRegNo,
        b.material || '',
        b.quantity || 0,
        b.unit || 'ton',
        b.customer || '',
        JSON.stringify(b.documentation || []),
        JSON.stringify(b.route || null),
        JSON.stringify(b.plateImages || []),
        b.status || 'pending'
      ]
    );

    res.status(201).json({ success: true, id, message: 'Dispatch order created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/dispatches/:id/approve
app.put('/api/dispatches/:id/approve', async (req, res) => {
  try {
    const { approvedBy = 'OP001', route } = req.body;
    await pool.query(
      `UPDATE dispatches 
       SET status = 'approved', approved_by = ?, approved_at = NOW(), route = COALESCE(?, route)
       WHERE id = ?`,
      [approvedBy, route ? JSON.stringify(route) : null, req.params.id]
    );
    res.json({ success: true, message: 'Dispatch approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/dispatches/:id/reject
app.put('/api/dispatches/:id/reject', async (req, res) => {
  try {
    const { reason = 'Discrepancy in documentation or quality specs' } = req.body;
    await pool.query(
      `UPDATE dispatches SET status = 'rejected', rejection_reason = ? WHERE id = ?`,
      [reason, req.params.id]
    );
    res.json({ success: true, message: 'Dispatch rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// EXIT VERIFICATIONS API (Phase 3)
// ==========================================

function formatExitVerification(row) {
  if (!row) return null;
  const parseJson = (v, def) => {
    try { return typeof v === 'string' ? JSON.parse(v) : (v || def); } catch (e) { return def; }
  };

  return {
    id: row.id,
    verificationId: row.verification_id,
    vehicleRegNo: row.vehicle_reg_no,
    exitTimestamp: row.exit_timestamp ? new Date(row.exit_timestamp).toISOString() : new Date().toISOString(),
    exitWeight: parseFloat(row.exit_weight) || 0,
    entryWeight: row.entry_weight !== null ? parseFloat(row.entry_weight) : undefined,
    loadingWeight: row.loading_weight !== null ? parseFloat(row.loading_weight) : undefined,
    weightDifference: parseFloat(row.weight_difference) || 0,
    plateImages: parseJson(row.plate_images, []),
    status: row.status || 'verified',
    operatorId: row.operator_id || 'OP001',
    operatorName: row.operator_name || 'System Operator',
    remarks: row.remarks || undefined,
    anomalyReason: row.anomaly_reason || undefined,
    incidentId: row.incident_id || undefined,
    createdAt: row.created_at,
  };
}

// GET /api/exit-verifications
app.get('/api/exit-verifications', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const [rows] = await pool.query(
      'SELECT * FROM exit_verifications ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [parseInt(limit), parseInt(offset)]
    );
    res.json(rows.map(formatExitVerification));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/exit-verifications
app.post('/api/exit-verifications', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `ev-${Date.now()}`;
    const verificationId = b.verificationId || `EV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    await pool.query(
      `INSERT INTO exit_verifications (
        id, verification_id, vehicle_reg_no, exit_timestamp, exit_weight,
        entry_weight, loading_weight, weight_difference, plate_images,
        status, operator_id, operator_name, remarks, anomaly_reason, incident_id, created_at
      ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        verificationId,
        b.vehicleRegNo,
        b.exitWeight || 0,
        b.entryWeight !== undefined ? b.entryWeight : null,
        b.loadingWeight !== undefined ? b.loadingWeight : null,
        b.weightDifference || 0,
        JSON.stringify(b.plateImages || []),
        b.status || 'verified',
        b.operatorId || 'OP001',
        b.operatorName || 'System Operator',
        b.remarks || null,
        b.anomalyReason || null,
        b.incidentId || null
      ]
    );

    res.status(201).json({ success: true, id, verificationId, message: 'Exit verification logged' });
  } catch (error) {
    console.error('Create exit verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// INCIDENTS API (Phase 3)
// ==========================================

function formatIncident(row) {
  if (!row) return null;
  const parseJson = (v, def) => {
    try { return typeof v === 'string' ? JSON.parse(v) : (v || def); } catch (e) { return def; }
  };

  return {
    id: row.incident_number || row.id,
    incidentId: row.id,
    title: row.title,
    description: row.description,
    type: row.type || 'operational',
    severity: row.severity || 'medium',
    status: row.status || 'reported',
    location: row.location || '',
    reportedBy: row.reported_by || 'Staff',
    reportedAt: row.reported_at ? new Date(row.reported_at).toISOString() : new Date().toISOString(),
    assignedTo: row.assigned_to || undefined,
    assignedAt: row.assigned_at ? new Date(row.assigned_at).toISOString() : undefined,
    investigationNotes: row.investigation_notes || undefined,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : undefined,
    resolution: row.resolution || undefined,
    vehicleRegNo: row.vehicle_reg_no || undefined,
    relatedModule: row.related_module || undefined,
    tags: parseJson(row.tags, []),
    evidence: parseJson(row.evidence, []),
    comments: parseJson(row.comments, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/incidents
app.get('/api/incidents', async (req, res) => {
  try {
    const { status, severity, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM incidents';
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (severity && severity !== 'all') {
      conditions.push('severity = ?');
      params.push(severity);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatIncident));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/incidents
app.post('/api/incidents', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `inc-${Date.now()}`;
    const incidentNumber = b.incidentNumber || b.incident_number || `INC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    await pool.query(
      `INSERT INTO incidents (
        id, incident_number, title, description, type, severity, status,
        location, reported_by, reported_at, assigned_to, vehicle_reg_no,
        related_module, tags, evidence, comments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        incidentNumber,
        b.title,
        b.description,
        b.type || 'operational',
        b.severity || 'medium',
        b.status || 'reported',
        b.location || 'Plant Grounds',
        b.reportedBy || 'Staff',
        b.assignedTo || null,
        b.vehicleRegNo || null,
        b.relatedModule || null,
        JSON.stringify(b.tags || []),
        JSON.stringify(b.evidence || []),
        JSON.stringify(b.comments || [])
      ]
    );

    res.status(201).json({ success: true, id, incidentNumber, message: 'Incident reported' });
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/incidents/:id
app.put('/api/incidents/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];

    if (b.status !== undefined) { updates.push('status = ?'); params.push(b.status); }
    if (b.assignedTo !== undefined) {
      updates.push('assigned_to = ?', 'assigned_at = NOW()');
      params.push(b.assignedTo);
    }
    if (b.resolution !== undefined) {
      updates.push('resolution = ?', 'resolved_at = NOW()');
      params.push(b.resolution);
    }
    if (b.investigationNotes !== undefined) {
      updates.push('investigation_notes = ?');
      params.push(b.investigationNotes);
    }
    if (b.comments !== undefined) {
      updates.push('comments = ?');
      params.push(JSON.stringify(b.comments));
    }
    if (b.evidence !== undefined) {
      updates.push('evidence = ?');
      params.push(JSON.stringify(b.evidence));
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');
    params.push(req.params.id, req.params.id);

    await pool.query(
      `UPDATE incidents SET ${updates.join(', ')} WHERE id = ? OR incident_number = ?`,
      params
    );

    res.json({ success: true, message: 'Incident updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// FUEL RECORDS API (Phase 4)
// ==========================================

function formatFuelRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleRegNo: row.vehicle_reg_no,
    driverId: row.driver_id || undefined,
    driverName: row.driver_name || undefined,
    tripId: row.trip_id || undefined,
    tripNumber: row.trip_number || undefined,
    fuelType: row.fuel_type || 'diesel',
    quantity: parseFloat(row.quantity) || 0,
    pricePerUnit: parseFloat(row.price_per_unit) || 0,
    totalCost: parseFloat(row.total_cost) || 0,
    odometerReading: parseInt(row.odometer_reading) || 0,
    fuelStation: row.fuel_station || '',
    location: row.location || '',
    receiptNumber: row.receipt_number || '',
    date: row.date ? new Date(row.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: row.notes || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

// GET /api/fuel-records
app.get('/api/fuel-records', async (req, res) => {
  try {
    const { vehicleId, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM fuel_records';
    const params = [];

    if (vehicleId) {
      query += ' WHERE vehicle_id = ?';
      params.push(vehicleId);
    }

    query += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatFuelRecord));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/fuel-records
app.post('/api/fuel-records', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `fuel-${Date.now()}`;
    const totalCost = b.totalCost || ((b.quantity || 0) * (b.pricePerUnit || 0));

    await pool.query(
      `INSERT INTO fuel_records (
        id, vehicle_id, vehicle_reg_no, driver_id, driver_name, trip_id,
        trip_number, fuel_type, quantity, price_per_unit, total_cost,
        odometer_reading, fuel_station, location, receipt_number, date,
        notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        b.vehicleId,
        b.vehicleRegNo,
        b.driverId || null,
        b.driverName || null,
        b.tripId || null,
        b.tripNumber || null,
        b.fuelType || 'diesel',
        b.quantity || 0,
        b.pricePerUnit || 0,
        totalCost,
        b.odometerReading || 0,
        b.fuelStation || 'Fuel Station',
        b.location || null,
        b.receiptNumber || null,
        b.date ? b.date.split('T')[0] : new Date().toISOString().split('T')[0],
        b.notes || null
      ]
    );

    res.status(201).json({ success: true, id, message: 'Fuel record created' });
  } catch (error) {
    console.error('Create fuel record error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/fuel-records/:id

// PUT /api/fuel-records/:id
app.put('/api/fuel-records/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];
    if (b.quantity !== undefined) { updates.push('quantity = ?'); params.push(b.quantity); }
    if (b.pricePerUnit !== undefined) { updates.push('price_per_unit = ?'); params.push(b.pricePerUnit); }
    if (b.totalCost !== undefined) { updates.push('total_cost = ?'); params.push(b.totalCost); }
    if (b.odometerReading !== undefined) { updates.push('odometer_reading = ?'); params.push(b.odometerReading); }
    if (b.fuelStation !== undefined) { updates.push('fuel_station = ?'); params.push(b.fuelStation); }
    if (b.location !== undefined) { updates.push('location = ?'); params.push(b.location); }
    if (b.notes !== undefined) { updates.push('notes = ?'); params.push(b.notes); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push('updated_at = NOW()');
    params.push(req.params.id);
    await pool.query('UPDATE fuel_records SET ' + updates.join(', ') + ' WHERE id = ?', params);
    res.json({ success: true, message: 'Fuel record updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/fuel-records/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM fuel_records WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Fuel record deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// MAINTENANCE TASKS API (Phase 4)
// ==========================================

function formatMaintenanceTask(row) {
  if (!row) return null;
  const parseJson = (v, def) => {
    try { return typeof v === 'string' ? JSON.parse(v) : (v || def); } catch (e) { return def; }
  };

  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleRegNo: row.vehicle_reg_no,
    type: row.type || 'preventive',
    title: row.title,
    description: row.description || '',
    status: row.status || 'scheduled',
    priority: row.priority || 'medium',
    scheduledDate: row.scheduled_date ? new Date(row.scheduled_date).toISOString().split('T')[0] : '',
    completedDate: row.completed_date ? new Date(row.completed_date).toISOString().split('T')[0] : undefined,
    estimatedCost: parseFloat(row.estimated_cost) || 0,
    actualCost: row.actual_cost !== null ? parseFloat(row.actual_cost) : undefined,
    technician: row.technician || undefined,
    parts: parseJson(row.parts, []),
    notes: row.notes || undefined,
    nextDueDate: row.next_due_date ? new Date(row.next_due_date).toISOString().split('T')[0] : undefined,
    nextDueOdometer: row.next_due_odometer || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/maintenance-tasks
app.get('/api/maintenance-tasks', async (req, res) => {
  try {
    const { status, vehicleId } = req.query;
    let query = 'SELECT * FROM maintenance_tasks';
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (vehicleId) {
      conditions.push('vehicle_id = ?');
      params.push(vehicleId);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY scheduled_date DESC, created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatMaintenanceTask));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/maintenance-tasks
app.post('/api/maintenance-tasks', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `mt-${Date.now()}`;

    await pool.query(
      `INSERT INTO maintenance_tasks (
        id, vehicle_id, vehicle_reg_no, type, title, description, status,
        priority, scheduled_date, estimated_cost, technician, parts, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        b.vehicleId,
        b.vehicleRegNo,
        b.type || 'preventive',
        b.title,
        b.description || '',
        b.status || 'scheduled',
        b.priority || 'medium',
        b.scheduledDate ? b.scheduledDate.split('T')[0] : new Date().toISOString().split('T')[0],
        b.estimatedCost || 0,
        b.technician || null,
        JSON.stringify(b.parts || []),
        b.notes || null
      ]
    );

    res.status(201).json({ success: true, id, message: 'Maintenance task scheduled' });
  } catch (error) {
    console.error('Create maintenance task error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/maintenance-tasks/:id
app.put('/api/maintenance-tasks/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];

    if (b.status !== undefined) {
      updates.push('status = ?');
      params.push(b.status);
      if (b.status === 'completed') {
        updates.push('completed_date = CURDATE()');
      }
    }
    if (b.actualCost !== undefined) { updates.push('actual_cost = ?'); params.push(b.actualCost); }
    if (b.notes !== undefined) { updates.push('notes = ?'); params.push(b.notes); }
    if (b.technician !== undefined) { updates.push('technician = ?'); params.push(b.technician); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE maintenance_tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Maintenance task updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// DELETE /api/maintenance-tasks/:id
app.delete('/api/maintenance-tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM maintenance_tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Maintenance task deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// INVENTORY ITEMS API (Phase 4)
// ==========================================

function formatInventoryItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    unit: row.unit,
    currentStock: parseFloat(row.current_stock) || 0,
    minStock: parseFloat(row.min_stock) || 0,
    maxStock: parseFloat(row.max_stock) || 0,
    reorderLevel: parseFloat(row.reorder_level) || 0,
    reorderQuantity: parseFloat(row.reorder_quantity) || 0,
    unitCost: parseFloat(row.unit_cost) || 0,
    totalValue: parseFloat(row.total_value) || 0,
    location: row.location || '',
    supplier: row.supplier || '',
    supplierContact: row.supplier_contact || undefined,
    lastReceived: row.last_received ? new Date(row.last_received).toISOString().split('T')[0] : undefined,
    lastConsumed: row.last_consumed ? new Date(row.last_consumed).toISOString().split('T')[0] : undefined,
    isLowStock: Boolean(row.is_low_stock),
    isOverstock: Boolean(row.is_overstock),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM inventory_items';
    const params = [];

    if (category && category !== 'all') {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY name ASC';
    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatInventoryItem));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inventory
app.post('/api/inventory', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `inv-${Date.now()}`;
    const totalValue = (b.currentStock || 0) * (b.unitCost || 0);

    await pool.query(
      `INSERT INTO inventory_items (
        id, name, sku, category, unit, current_stock, min_stock, max_stock,
        reorder_level, reorder_quantity, unit_cost, total_value, location,
        supplier, is_low_stock, is_overstock, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        b.name,
        b.sku || `SKU-${Date.now()}`,
        b.category || 'other',
        b.unit || 'tons',
        b.currentStock || 0,
        b.minStock || 0,
        b.maxStock || 1000,
        b.reorderLevel || 100,
        b.reorderQuantity || 200,
        b.unitCost || 0,
        totalValue,
        b.location || 'Silo',
        b.supplier || 'Plant Materials Co',
        b.currentStock <= (b.minStock || 0) ? 1 : 0,
        b.currentStock >= (b.maxStock || 1000) ? 1 : 0
      ]
    );

    res.status(201).json({ success: true, id, message: 'Inventory item added' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/inventory/:id
app.put('/api/inventory/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];

    if (b.currentStock !== undefined) {
      updates.push('current_stock = ?', 'total_value = current_stock * unit_cost');
      params.push(b.currentStock);
    }
    if (b.unitCost !== undefined) {
      updates.push('unit_cost = ?', 'total_value = current_stock * ?');
      params.push(b.unitCost, b.unitCost);
    }
    if (b.reorderLevel !== undefined) { updates.push('reorder_level = ?'); params.push(b.reorderLevel); }
    if (b.location !== undefined) { updates.push('location = ?'); params.push(b.location); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE inventory_items SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Inventory item updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// DELETE /api/inventory/:id
app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Inventory item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stock-movements
app.get('/api/stock-movements', async (req, res) => {
  try {
    const { itemId, limit = 50 } = req.query;
    let query = 'SELECT * FROM stock_movements';
    const params = [];
    if (itemId) {
      query += ' WHERE item_id = ?';
      params.push(itemId);
    }
    query += ' ORDER BY date DESC, created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    const [rows] = await pool.query(query, params);
    res.json(rows.map(r => ({
      id: r.id,
      itemId: r.item_id,
      itemName: r.item_name,
      itemSku: r.item_sku,
      type: r.type,
      quantity: parseFloat(r.quantity) || 0,
      previousStock: parseFloat(r.previous_stock) || 0,
      newStock: parseFloat(r.new_stock) || 0,
      unitCost: parseFloat(r.unit_cost) || 0,
      totalCost: parseFloat(r.total_cost) || 0,
      referenceNumber: r.reference_number,
      tripId: r.trip_id || undefined,
      notes: r.notes || '',
      performedBy: r.performed_by || 'Yard Staff',
      date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
      createdAt: r.created_at
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/stock-movements
app.post('/api/stock-movements', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || ('mov-' + Date.now());
    await pool.query(
      'INSERT INTO stock_movements (id, item_id, item_name, item_sku, type, quantity, previous_stock, new_stock, unit_cost, total_cost, reference_number, trip_id, notes, performed_by, date, created_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [
        id, b.itemId, b.itemName, b.itemSku || '', b.type,
        b.quantity || 0, b.previousStock || 0, b.newStock || 0,
        b.unitCost || 0, b.totalCost || 0, b.referenceNumber || ('REF-' + Date.now()),
        b.tripId || null, b.notes || null, b.performedBy || 'Yard Staff'
      ]
    );
    res.status(201).json({ success: true, id, message: 'Stock movement recorded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// INVOICES & PAYMENTS API (Phase 4)
// ==========================================

function formatInvoice(row) {
  if (!row) return null;
  const parseJson = (v, def) => {
    try { return typeof v === 'string' ? JSON.parse(v) : (v || def); } catch (e) { return def; }
  };

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerAddress: row.customer_address || undefined,
    customerEmail: row.customer_email || undefined,
    customerPhone: row.customer_phone || undefined,
    customerGST: row.customer_gst || undefined,
    tripIds: parseJson(row.trip_ids, []),
    items: parseJson(row.items, []),
    subtotal: parseFloat(row.subtotal) || 0,
    taxAmount: parseFloat(row.tax_amount) || 0,
    discountAmount: parseFloat(row.discount_amount) || 0,
    totalAmount: parseFloat(row.total_amount) || 0,
    paidAmount: parseFloat(row.paid_amount) || 0,
    balanceAmount: parseFloat(row.balance_amount) || 0,
    status: row.status || 'pending',
    issueDate: row.issue_date ? new Date(row.issue_date).toISOString().split('T')[0] : '',
    dueDate: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : '',
    paidDate: row.paid_date ? new Date(row.paid_date).toISOString().split('T')[0] : undefined,
    notes: row.notes || undefined,
    terms: row.terms || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const { status, customerId } = req.query;
    let query = 'SELECT * FROM invoices';
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (customerId) {
      conditions.push('customer_id = ?');
      params.push(customerId);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY issue_date DESC, created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatInvoice));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/invoices
app.post('/api/invoices', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `inv-${Date.now()}`;
    const invoiceNumber = b.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    await pool.query(
      `INSERT INTO invoices (
        id, invoice_number, customer_id, customer_name, customer_address,
        customer_email, customer_phone, customer_gst, trip_ids, items,
        subtotal, tax_amount, discount_amount, total_amount, paid_amount,
        balance_amount, status, issue_date, due_date, notes, terms, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        invoiceNumber,
        b.customerId || 'CUST-GENERIC',
        b.customerName,
        b.customerAddress || null,
        b.customerEmail || null,
        b.customerPhone || null,
        b.customerGST || null,
        JSON.stringify(b.tripIds || []),
        JSON.stringify(b.items || []),
        b.subtotal || 0,
        b.taxAmount || 0,
        b.discountAmount || 0,
        b.totalAmount || 0,
        b.paidAmount || 0,
        b.balanceAmount !== undefined ? b.balanceAmount : (b.totalAmount || 0),
        b.status || 'pending',
        b.issueDate ? b.issueDate.split('T')[0] : new Date().toISOString().split('T')[0],
        b.dueDate ? b.dueDate.split('T')[0] : new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        b.notes || null,
        b.terms || 'Net 15 days'
      ]
    );

    res.status(201).json({ success: true, id, invoiceNumber, message: 'Invoice created' });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments
app.post('/api/payments', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `pay-${Date.now()}`;

    await pool.query(
      `INSERT INTO payments (
        id, invoice_id, invoice_number, customer_id, customer_name,
        amount, method, reference_number, date, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, NOW())`,
      [
        id,
        b.invoiceId,
        b.invoiceNumber,
        b.customerId || 'CUST-001',
        b.customerName,
        b.amount || 0,
        b.method || 'bank_transfer',
        b.referenceNumber || null,
        b.status || 'completed',
        b.notes || null
      ]
    );

    // Update invoice balance
    await pool.query(
      `UPDATE invoices
       SET paid_amount = paid_amount + ?,
           balance_amount = GREATEST(0, total_amount - (paid_amount + ?)),
           status = CASE WHEN (total_amount - (paid_amount + ?)) <= 0 THEN 'paid' ELSE 'sent' END,
           paid_date = CASE WHEN (total_amount - (paid_amount + ?)) <= 0 THEN CURDATE() ELSE paid_date END,
           updated_at = NOW()
       WHERE id = ? OR invoice_number = ?`,
      [b.amount, b.amount, b.amount, b.amount, b.invoiceId, b.invoiceNumber]
    );

    res.status(201).json({ success: true, id, message: 'Payment recorded' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// GET /api/payments
app.get('/api/payments', async (req, res) => {
  try {
    const { invoiceId, limit = 50 } = req.query;
    let query = 'SELECT * FROM payments';
    const params = [];
    if (invoiceId) {
      query += ' WHERE invoice_id = ?';
      params.push(invoiceId);
    }
    query += ' ORDER BY date DESC, created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    const [rows] = await pool.query(query, params);
    res.json(rows.map(r => ({
      id: r.id,
      invoiceId: r.invoice_id,
      invoiceNumber: r.invoice_number,
      customerId: r.customer_id,
      customerName: r.customer_name,
      amount: parseFloat(r.amount) || 0,
      method: r.method,
      referenceNumber: r.reference_number,
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: r.status,
      notes: r.notes || '',
      createdAt: r.created_at
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/invoices/:id
app.put('/api/invoices/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];
    if (b.status !== undefined) {
      updates.push('status = ?');
      params.push(b.status);
      if (b.status === 'paid') {
        updates.push('paid_date = CURDATE()');
      }
    }
    if (b.notes !== undefined) { updates.push('notes = ?'); params.push(b.notes); }
    if (b.paidAmount !== undefined) { updates.push('paid_amount = ?'); params.push(b.paidAmount); }
    if (b.balanceAmount !== undefined) { updates.push('balance_amount = ?'); params.push(b.balanceAmount); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push('updated_at = NOW()');
    params.push(req.params.id);
    await pool.query('UPDATE invoices SET ' + updates.join(', ') + ' WHERE id = ?', params);
    res.json({ success: true, message: 'Invoice updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/invoices/:id
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// AUDIT LOGS API (Phase 4)
// ==========================================

function formatAuditLog(row) {
  if (!row) return null;
  const parseJson = (v, def) => {
    try { return typeof v === 'string' ? JSON.parse(v) : (v || def); } catch (e) { return def; }
  };

  return {
    id: row.id,
    timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
    module: row.module || 'system',
    action: row.action || 'UPDATE',
    entityId: row.entity_id || '',
    entityType: row.entity_type || '',
    performedBy: parseJson(row.performed_by, { id: 'SYS', name: 'System Operator', role: 'operator' }),
    details: row.details || '',
    severity: row.severity || 'info',
    previousState: parseJson(row.previous_state, null),
    newState: parseJson(row.new_state, null),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
  };
}

// GET /api/audit-logs
app.get('/api/audit-logs', async (req, res) => {
  try {
    const { module: mod, severity, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM audit_logs';
    const params = [];
    const conditions = [];

    if (mod && mod !== 'all') {
      conditions.push('module = ?');
      params.push(mod);
    }
    if (severity && severity !== 'all') {
      conditions.push('severity = ?');
      params.push(severity);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    res.json(rows.map(formatAuditLog));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/audit-logs
app.post('/api/audit-logs', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `aud-${Date.now()}`;

    await pool.query(
      `INSERT INTO audit_logs (
        id, timestamp, module, action, entity_id, entity_type,
        performed_by, details, severity, previous_state, new_state, metadata, created_at
      ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        b.module || 'system',
        b.action || 'UPDATE',
        b.entityId || b.entity_id || '',
        b.entityType || b.entity_type || 'System',
        JSON.stringify(b.performedBy || b.performed_by || { id: 'SYS', name: 'User', role: 'Staff' }),
        b.details || '',
        b.severity || 'info',
        JSON.stringify(b.previousState || b.previous_state || null),
        JSON.stringify(b.newState || b.new_state || null),
        JSON.stringify(b.metadata || {})
      ]
    );

    res.status(201).json({ success: true, id, message: 'Audit entry created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// AUTHENTICATION & RBAC API
// ==========================================

function formatUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    roleId: u.role_id,
    roleName: u.role_name,
    phone: u.phone || undefined,
    department: u.department || undefined,
    shift: u.shift || undefined,
    status: u.status || 'active',
    avatar: u.avatar || undefined,
    lastLogin: u.last_login ? new Date(u.last_login).toISOString() : undefined,
    createdAt: u.created_at ? new Date(u.created_at).toISOString() : undefined,
    updatedAt: u.updated_at ? new Date(u.updated_at).toISOString() : undefined,
  };
}

function formatRole(r) {
  if (!r) return null;
  const parseJson = (v, def) => {
    try { return typeof v === 'string' ? JSON.parse(v) : (v || def); } catch (e) { return def; }
  };
  return {
    id: r.id,
    name: r.name,
    description: r.description || '',
    color: r.color || 'blue',
    modules: parseJson(r.modules, []),
    permissions: parseJson(r.permissions, []),
    isSystem: Boolean(r.is_system),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function createSessionToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    roleId: user.role_id,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function verifySessionToken(token) {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const payload = JSON.parse(raw);
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    let users;
    try {
      [users] = await pool.query(
        'SELECT * FROM users WHERE (username = ? OR email = ?)',
        [username.trim(), username.trim()]
      );
    } catch (queryErr) {
      // Auto-heal: If users table doesn't exist, initialize database immediately
      if (queryErr.code === 'ER_NO_SUCH_TABLE') {
        console.warn('⚠️ Users table not found. Auto-initializing database schema...');
        await initializeDatabase();
        [users] = await pool.query(
          'SELECT * FROM users WHERE (username = ? OR email = ?)',
          [username.trim(), username.trim()]
        );
      } else {
        throw queryErr;
      }
    }

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive. Please contact administrator.' });
    }

    // Update last login
    try {
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    } catch (e) {}

    // Fetch user role
    let role = {
      id: user.role_id,
      name: user.role_name,
      modules: ['/'],
      permissions: []
    };

    try {
      const [roles] = await pool.query('SELECT * FROM roles WHERE id = ?', [user.role_id]);
      if (roles.length > 0) {
        role = roles[0];
      }
    } catch (e) {}

    const token = createSessionToken(user);

    // Record login in audit_logs (safe fallback)
    try {
      await pool.query(
        `INSERT INTO audit_logs (id, timestamp, module, action, entity_id, entity_type, performed_by, details, severity, created_at)
         VALUES (?, NOW(), 'auth', 'LOGIN', ?, 'User Session', ?, ?, 'info', NOW())`,
        [
          `aud-${Date.now()}`,
          user.id,
          JSON.stringify({ id: user.id, name: user.name, role: user.role_name }),
          `User ${user.username} logged in successfully from IP ${req.ip || '127.0.0.1'}`
        ]
      );
    } catch (e) {}

    res.json({
      success: true,
      token,
      user: formatUser(user),
      role: formatRole(role),
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifySessionToken(token);
    if (!payload || !payload.userId) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const [roles] = await pool.query('SELECT * FROM roles WHERE id = ?', [user.role_id]);
    const role = roles.length > 0 ? roles[0] : {
      id: user.role_id,
      name: user.role_name,
      modules: ['/'],
      permissions: []
    };

    res.json({
      user: formatUser(user),
      role: formatRole(role)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const payload = verifySessionToken(authHeader.split(' ')[1]);
      if (payload && payload.userId) {
        await pool.query(
          `INSERT INTO audit_logs (id, timestamp, module, action, entity_id, entity_type, performed_by, details, severity, created_at)
           VALUES (?, NOW(), 'auth', 'LOGOUT', ?, 'User Session', ?, ?, 'info', NOW())`,
          [
            `aud-${Date.now()}`,
            payload.userId,
            JSON.stringify({ id: payload.userId, name: payload.username, role: payload.roleId }),
            `User ${payload.username} logged out`
          ]
        );
      }
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/users
app.get('/api/auth/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users ORDER BY name ASC');
    res.json(rows.map(formatUser));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/users
app.post('/api/auth/users', async (req, res) => {
  try {
    const b = req.body;
    const id = b.id || `USR-${Date.now()}`;
    const password = b.password || 'plant123';

    await pool.query(
      `INSERT INTO users (
        id, username, name, email, password_hash, role_id, role_name,
        phone, department, shift, status, avatar, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        b.username,
        b.name,
        b.email,
        password,
        b.roleId || 'weighbridge_operator',
        b.roleName || 'Operator',
        b.phone || null,
        b.department || 'Operations',
        b.shift || 'General Shift',
        b.status || 'active',
        b.avatar || null
      ]
    );

    res.status(201).json({ success: true, id, message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/users/:id
app.put('/api/auth/users/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];

    if (b.name !== undefined) { updates.push('name = ?'); params.push(b.name); }
    if (b.email !== undefined) { updates.push('email = ?'); params.push(b.email); }
    if (b.phone !== undefined) { updates.push('phone = ?'); params.push(b.phone); }
    if (b.department !== undefined) { updates.push('department = ?'); params.push(b.department); }
    if (b.shift !== undefined) { updates.push('shift = ?'); params.push(b.shift); }
    if (b.status !== undefined) { updates.push('status = ?'); params.push(b.status); }
    if (b.roleId !== undefined) { updates.push('role_id = ?'); params.push(b.roleId); }
    if (b.roleName !== undefined) { updates.push('role_name = ?'); params.push(b.roleName); }
    if (b.password !== undefined && b.password) { updates.push('password_hash = ?'); params.push(b.password); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/roles
app.get('/api/auth/roles', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roles ORDER BY name ASC');
    res.json(rows.map(formatRole));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/roles/:id
app.put('/api/auth/roles/:id', async (req, res) => {
  try {
    const b = req.body;
    const updates = [];
    const params = [];

    if (b.name !== undefined) { updates.push('name = ?'); params.push(b.name); }
    if (b.description !== undefined) { updates.push('description = ?'); params.push(b.description); }
    if (b.color !== undefined) { updates.push('color = ?'); params.push(b.color); }
    if (b.modules !== undefined) { updates.push('modules = ?'); params.push(JSON.stringify(b.modules)); }
    if (b.permissions !== undefined) { updates.push('permissions = ?'); params.push(JSON.stringify(b.permissions)); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    await pool.query(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// COMPANY SETTINGS & BRANDING API
// ==========================================

function formatCompanySettings(row) {
  if (!row) return null;
  let weighbridgeDefaults = {
    defaultRate: 7520,
    defaultMoisture: 8,
    defaultDeduction: 50,
    defaultCharges: 250,
    printDuplicate: false,
    printQrCode: true,
    printImages: true,
    autoWeighInterval: 600,
    minTareWeight: 5000,
    maxGrossWeight: 60000,
    ftp: {
      enabled: false,
      host: '192.168.0.15',
      port: 21,
      user: 'weighbridge',
      password: '',
      secure: false,
      remoteDir: '/snapshots',
    },
    thirdPartyScale: {
      enabled: true,
      mode: 'file_monitor',
      protocol: 'standard_ascii',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      filePath: 'C:\\Weighbridge\\live_weight.txt',
      tcpHost: '127.0.0.1',
      tcpPort: 4001,
      pollIntervalMs: 500,
    },
  };
  try {
    if (row.weighbridge_defaults) {
      weighbridgeDefaults = typeof row.weighbridge_defaults === 'string'
        ? JSON.parse(row.weighbridge_defaults)
        : row.weighbridge_defaults;
    }
  } catch (e) {}

  return {
    id: row.id || 'default_company',
    companyName: row.company_name || 'Dharani Cotton Mills / Aparna RMC Ltd.',
    firmName: row.firm_name || 'Dharani Cotton Mills',
    plantName: row.plant_name || 'Plant 1 - Main Batching Yard',
    plantCode: row.plant_code || 'PLANT_001',
    tagline: row.tagline || 'Certified Electronic Weighbridge & Automated Concrete Dispatch',
    logoUrl: row.logo_url || '',
    address: row.address || '',
    city: row.city || 'Pune',
    state: row.state || 'Maharashtra',
    pincode: row.pincode || '411057',
    phone: row.phone || '+91 20 2712 8899',
    email: row.email || 'weighbridge@dharanimills.com',
    website: row.website || 'https://www.dharanimills.com',
    gstin: row.gstin || '27AAAAA0000A1Z5',
    weighbridgeLicense: row.weighbridge_license || 'WB/2026/RMC-449',
    scaleModel: row.scale_model || 'Avery Weigh-Tronix E1205',
    scaleCapacity: row.scale_capacity || '100 MT',
    scaleDivision: row.scale_division || '10 kg',
    currency: row.currency || '₹',
    weighbridgeDefaults,
    invoiceTerms: row.invoice_terms || '',
    weighSlipNotes: row.weigh_slip_notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/company-settings
app.get('/api/company-settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM company_settings LIMIT 1');
    if (rows.length === 0) {
      return res.json(formatCompanySettings({}));
    }
    res.json(formatCompanySettings(rows[0]));
  } catch (error) {
    console.error('Get company settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/company-settings
app.put('/api/company-settings', async (req, res) => {
  try {
    const b = req.body;
    const [rows] = await pool.query('SELECT id FROM company_settings LIMIT 1');
    const targetId = rows.length > 0 ? rows[0].id : 'default_company';

    const updates = [];
    const params = [];

    if (b.companyName !== undefined) { updates.push('company_name = ?'); params.push(b.companyName); }
    if (b.firmName !== undefined) { updates.push('firm_name = ?'); params.push(b.firmName); }
    if (b.plantName !== undefined) { updates.push('plant_name = ?'); params.push(b.plantName); }
    if (b.plantCode !== undefined) { updates.push('plant_code = ?'); params.push(b.plantCode); }
    if (b.tagline !== undefined) { updates.push('tagline = ?'); params.push(b.tagline); }
    if (b.logoUrl !== undefined) { updates.push('logo_url = ?'); params.push(b.logoUrl); }
    if (b.address !== undefined) { updates.push('address = ?'); params.push(b.address); }
    if (b.city !== undefined) { updates.push('city = ?'); params.push(b.city); }
    if (b.state !== undefined) { updates.push('state = ?'); params.push(b.state); }
    if (b.pincode !== undefined) { updates.push('pincode = ?'); params.push(b.pincode); }
    if (b.phone !== undefined) { updates.push('phone = ?'); params.push(b.phone); }
    if (b.email !== undefined) { updates.push('email = ?'); params.push(b.email); }
    if (b.website !== undefined) { updates.push('website = ?'); params.push(b.website); }
    if (b.gstin !== undefined) { updates.push('gstin = ?'); params.push(b.gstin); }
    if (b.weighbridgeLicense !== undefined) { updates.push('weighbridge_license = ?'); params.push(b.weighbridgeLicense); }
    if (b.scaleModel !== undefined) { updates.push('scale_model = ?'); params.push(b.scaleModel); }
    if (b.scaleCapacity !== undefined) { updates.push('scale_capacity = ?'); params.push(b.scaleCapacity); }
    if (b.scaleDivision !== undefined) { updates.push('scale_division = ?'); params.push(b.scaleDivision); }
    if (b.currency !== undefined) { updates.push('currency = ?'); params.push(b.currency); }
    if (b.weighbridgeDefaults !== undefined) { updates.push('weighbridge_defaults = ?'); params.push(JSON.stringify(b.weighbridgeDefaults)); }
    if (b.invoiceTerms !== undefined) { updates.push('invoice_terms = ?'); params.push(b.invoiceTerms); }
    if (b.weighSlipNotes !== undefined) { updates.push('weigh_slip_notes = ?'); params.push(b.weighSlipNotes); }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      params.push(targetId);
      await pool.query(`UPDATE company_settings SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updatedRows] = await pool.query('SELECT * FROM company_settings WHERE id = ?', [targetId]);
    res.json({
      success: true,
      settings: formatCompanySettings(updatedRows[0]),
      message: 'Company settings updated successfully'
    });
  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/company-settings/logo
app.post('/api/company-settings/logo', async (req, res) => {
  try {
    const { logoUrl } = req.body;
    if (!logoUrl) {
      return res.status(400).json({ error: 'Logo URL / image data is required' });
    }
    const [rows] = await pool.query('SELECT id FROM company_settings LIMIT 1');
    const targetId = rows.length > 0 ? rows[0].id : 'default_company';

    await pool.query('UPDATE company_settings SET logo_url = ?, updated_at = NOW() WHERE id = ?', [logoUrl, targetId]);
    res.json({ success: true, logoUrl, message: 'Logo updated successfully' });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    let targetUserId = userId;

    if (!targetUserId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const payload = verifySessionToken(authHeader.split(' ')[1]);
        if (payload && payload.userId) targetUserId = payload.userId;
      }
    }

    if (!targetUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE id = ? OR username = ? OR email = ?', [targetUserId, targetUserId, targetUserId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    if (user.password_hash !== currentPassword) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    await pool.query('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [newPassword, user.id]);

    // Record in audit_logs
    try {
      await pool.query(
        `INSERT INTO audit_logs (id, timestamp, user_id, user_name, action, module, details, status)
         VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)`,
        [
          `AUD-PWD-${Date.now()}`,
          user.id,
          user.name,
          'PASSWORD_CHANGED',
          'SECURITY',
          JSON.stringify({ userId: user.id, username: user.username, message: 'Password updated successfully' }),
          'SUCCESS'
        ]
      );
    } catch (e) {}

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  // Test database connection
  const connected = await testConnection();
  
  if (connected) {
    // Initialize database tables
    await initializeDatabase();
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🎯 ANPR endpoints available at http://localhost:${PORT}/api/anpr`);
    if (!connected) {
      console.log('⚠️  Warning: Database connection failed. Please check MySQL configuration.');
    }
  });
}

startServer();
