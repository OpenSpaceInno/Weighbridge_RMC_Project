import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

// Create connection pool (without database selection initially)
const poolWithoutDb = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

// Create connection pool (with database)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rmc_gate_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

// Test connection
async function testConnection() {
  const dbName = process.env.DB_NAME || 'rmc_gate_system';
  try {
    // First, create database if it doesn't exist
    const connection = await poolWithoutDb.getConnection();
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    connection.release();
    
    // Then test connection to the database
    const dbConnection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully!');
    dbConnection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    return false;
  }
}

// Initialize database and tables
async function initializeDatabase() {
  const dbName = process.env.DB_NAME || 'rmc_gate_system';
  try {
    const connection = await poolWithoutDb.getConnection();
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database '${dbName}' ready`);
    connection.release();
    
    // Now use the database connection pool
    const dbConnection = await pool.getConnection();

    // Check if the users table already exists
    const [userTables] = await dbConnection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
      [dbName]
    );

    // If users table is missing, run full schema initialization from init.sql
    if (userTables.length === 0) {
      console.log('🔄 Core tables missing. Initializing complete schema from init.sql...');
      const initSqlPath = path.resolve(__dirname, 'init.sql');
      if (fs.existsSync(initSqlPath)) {
        try {
          let sqlContent = fs.readFileSync(initSqlPath, 'utf8');
          if (dbName !== 'rmc_gate_system') {
            sqlContent = sqlContent.replace(/`rmc_gate_system`/g, `\`${dbName}\``);
          }
          await dbConnection.query(sqlContent);
          console.log('✅ Complete schema & seed data initialized from init.sql!');
        } catch (sqlErr) {
          console.error('⚠️ Warning executing init.sql batch:', sqlErr.message);
        }
      }
    }
    
    // Ensure roles table exists
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        description TEXT,
        color VARCHAR(32) DEFAULT 'blue',
        modules JSON,
        permissions JSON,
        is_system BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Ensure default admin role exists
    await dbConnection.query(`
      INSERT INTO roles (id, name, description, color, modules, permissions, is_system)
      VALUES (
        'admin',
        'Plant Head / Admin',
        'Executive leadership with comprehensive plant-wide visibility, multi-camera CCTV wall, all operational modules, and configuration overrides.',
        'purple',
        '["/","/gate-monitor","/weighbridge","/loading","/dispatch","/trips","/trip-tracking","/trip-analytics","/exit-verification","/incidents","/audit-logs","/vehicles","/drivers","/fuel","/maintenance","/billing","/inventory","/reports","/customer-portal","/device-config","/database-setup","/users","/roles"]',
        '["all:manage","users:manage","roles:manage","config:manage","reports:export","override:approve"]',
        TRUE
      )
      ON DUPLICATE KEY UPDATE name=VALUES(name);
    `);

    // Ensure users table exists
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(128) NOT NULL,
        email VARCHAR(128) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role_id VARCHAR(64) NOT NULL,
        role_name VARCHAR(128) NOT NULL,
        phone VARCHAR(32),
        department VARCHAR(64),
        shift VARCHAR(64),
        status VARCHAR(32) DEFAULT 'active',
        avatar VARCHAR(255),
        last_login TIMESTAMP NULL,
        plant_id VARCHAR(64) DEFAULT 'PL01',
        plant_name VARCHAR(128) DEFAULT 'Plant 01 • Shamshabad Central',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_role (role_id),
        INDEX idx_users_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Ensure default users exist
    await dbConnection.query(`
      INSERT INTO users (id, username, name, email, password_hash, role_id, role_name, status)
      VALUES 
        ('USR-001', 'admin', 'Rajesh Sharma', 'admin@aparnarmc.com', 'admin123', 'admin', 'Plant Manager / Admin', 'active'),
        ('USR-002', 'gate.security', 'Mahesh Patil', 'security@aparnarmc.com', 'gate123', 'gate_operator', 'Gate Security Supervisor', 'active'),
        ('USR-003', 'weighbridge.op', 'Ramesh Kulkarni', 'weighbridge@aparnarmc.com', 'scale123', 'weighbridge_operator', 'Weighbridge Scale Operator', 'active'),
        ('USR-003B', 'weigh_op', 'Ramesh Kulkarni', 'weigh_op@aparna-rmc.com', 'weigh123', 'weighbridge_operator', 'Weighbridge Scale Operator', 'active'),
        ('USR-004', 'batching.supv', 'Anil Desai', 'batching@aparnarmc.com', 'batch123', 'batching_operator', 'Batching Plant Supervisor', 'active'),
        ('USR-005', 'qc.inspector', 'Vikram Joshi', 'qc@aparnarmc.com', 'qc123', 'qc_inspector', 'Quality Control Lead', 'active'),
        ('USR-006', 'dispatch.lead', 'Amitabh Verma', 'dispatch@aparnarmc.com', 'dispatch123', 'dispatch_officer', 'Dispatch & Logistics Officer', 'active'),
        ('USR-007', 'fleet.mgr', 'Sunil Shinde', 'fleet@aparnarmc.com', 'fleet123', 'fleet_manager', 'Fleet & Workshop Manager', 'active'),
        ('USR-008', 'billing.acc', 'Pooja Hegde', 'billing@aparnarmc.com', 'billing123', 'accounts_manager', 'Commercial & Accounts Lead', 'active')
      ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), status='active';
    `);

    // Ensure audit_logs table exists
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        module VARCHAR(64) NOT NULL,
        action VARCHAR(64) NOT NULL,
        entity_id VARCHAR(128),
        entity_type VARCHAR(128),
        performed_by JSON,
        details TEXT,
        severity VARCHAR(32) DEFAULT 'info',
        user_id VARCHAR(64),
        user_name VARCHAR(128),
        status VARCHAR(32) DEFAULT 'SUCCESS',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_module (module),
        INDEX idx_audit_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Create camera_devices table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS camera_devices (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        device_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        model VARCHAR(100) NOT NULL,
        location VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        mac_address VARCHAR(17),
        status VARCHAR(20) NOT NULL DEFAULT 'offline',
        last_seen DATETIME,
        firmware VARCHAR(50),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_device_id (device_id),
        INDEX idx_location (location),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    // Create device_rtsp_config table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS device_rtsp_config (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        device_id VARCHAR(50) UNIQUE NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        url TEXT,
        direct_url TEXT,
        use_direct_url BOOLEAN NOT NULL DEFAULT TRUE,
        port INT NOT NULL DEFAULT 554,
        username VARCHAR(255),
        password VARCHAR(255),
        stream_path VARCHAR(500) NOT NULL DEFAULT '/rtsp/streaming?channel=01&subtype=0',
        transport VARCHAR(10) NOT NULL DEFAULT 'tcp',
        reconnect_interval INT NOT NULL DEFAULT 5,
        buffer_size INT NOT NULL DEFAULT 1024,
        low_latency_mode BOOLEAN NOT NULL DEFAULT TRUE,
        hls_proxy_url TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES camera_devices(device_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    // Create device_network_config table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS device_network_config (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        device_id VARCHAR(50) UNIQUE NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        subnet_mask VARCHAR(45) NOT NULL DEFAULT '255.255.255.0',
        gateway VARCHAR(45) NOT NULL,
        primary_dns VARCHAR(45) NOT NULL DEFAULT '8.8.8.8',
        secondary_dns VARCHAR(45) DEFAULT '8.8.4.4',
        dhcp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES camera_devices(device_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Create company_settings table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id VARCHAR(64) PRIMARY KEY,
        company_name VARCHAR(255) DEFAULT 'Dharani Cotton Mills',
        firm_name VARCHAR(255) DEFAULT 'Dharani Cotton Mills',
        plant_name VARCHAR(255) DEFAULT 'Plant 1 - Main Batching Yard',
        plant_code VARCHAR(64) DEFAULT 'PLANT_001',
        tagline VARCHAR(255) DEFAULT 'Certified Electronic Weighbridge & Automated Concrete Dispatch',
        logo_url TEXT,
        address TEXT,
        city VARCHAR(100) DEFAULT 'Hyderabad',
        state VARCHAR(100) DEFAULT 'Telangana',
        pincode VARCHAR(20) DEFAULT '500033',
        phone VARCHAR(50) DEFAULT '+91 20 2712 8899',
        email VARCHAR(100) DEFAULT 'weighbridge@dharanicotton.com',
        website VARCHAR(255) DEFAULT 'https://www.dharanicotton.com',
        gstin VARCHAR(50) DEFAULT '27AAAAA0000A1Z5',
        weighbridge_license VARCHAR(100) DEFAULT 'WB/2026/RMC-449',
        scale_model VARCHAR(100) DEFAULT 'VENTEK VMS-WB',
        scale_capacity VARCHAR(50) DEFAULT '50,000 kg (50 MT)',
        scale_division VARCHAR(50) DEFAULT '10 kg',
        currency VARCHAR(10) DEFAULT '₹',
        weighbridge_defaults JSON,
        invoice_terms TEXT,
        weigh_slip_notes TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await dbConnection.query(`
      INSERT INTO company_settings (id, company_name, firm_name, plant_name, plant_code, weighbridge_defaults)
      VALUES (
        'default_company',
        'Dharani Cotton Mills',
        'Dharani Cotton Mills',
        'Plant 1 - Main Batching Yard',
        'PLANT_001',
        JSON_OBJECT(
          'defaultRate', 7520,
          'defaultMoisture', 8,
          'defaultDeduction', 50,
          'defaultCharges', 250,
          'printDuplicate', false,
          'printQrCode', true,
          'printImages', true,
          'autoWeighInterval', 600,
          'minTareWeight', 5000,
          'maxGrossWeight', 60000,
          'ftp', JSON_OBJECT(
            'enabled', true,
            'host', 'ftp.activitsol.com',
            'port', 2121,
            'user', 'demo',
            'password', 'Password@123',
            'secure', false,
            'remoteDir', '/Dharani'
          )
        )
      )
      ON DUPLICATE KEY UPDATE 
        company_name='Dharani Cotton Mills',
        firm_name='Dharani Cotton Mills',
        weighbridge_defaults = CASE 
          WHEN weighbridge_defaults IS NULL OR JSON_EXTRACT(weighbridge_defaults, '$.ftp.host') = '192.168.0.15' OR JSON_EXTRACT(weighbridge_defaults, '$.ftp.user') = 'weighbridge'
          THEN JSON_SET(
            COALESCE(weighbridge_defaults, JSON_OBJECT()),
            '$.ftp', JSON_OBJECT(
              'enabled', true,
              'host', 'ftp.activitsol.com',
              'port', 2121,
              'user', 'demo',
              'password', 'Password@123',
              'secure', false,
              'remoteDir', '/Dharani'
            )
          )
          ELSE weighbridge_defaults
        END;
    `);

    // Create anpr_events table
    await dbConnection.query(`
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

    // Create anpr_evidence table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS anpr_evidence (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id VARCHAR(100) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(50) DEFAULT 'image/jpeg',
        camera_id VARCHAR(50) DEFAULT 'cam_gate_1',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_evidence_event (event_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Create weighbridge_sessions table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS weighbridge_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL UNIQUE,
        transaction_no INT NULL,
        vehicle_reg_no VARCHAR(50) NOT NULL,
        party_name VARCHAR(150) NULL,
        firm_name VARCHAR(150) NULL,
        first_weight DECIMAL(10,2) NULL,
        first_weight_time DATETIME NULL,
        second_weight DECIMAL(10,2) NULL,
        second_weight_time DATETIME NULL,
        gross_weight DECIMAL(10,2) NULL,
        tare_weight DECIMAL(10,2) NULL,
        net_weight DECIMAL(10,2) NULL,
        material VARCHAR(150) NULL,
        product VARCHAR(150) NULL,
        rate DECIMAL(10,2) DEFAULT 0.00,
        moisture DECIMAL(10,2) DEFAULT 0.00,
        deduction DECIMAL(10,2) DEFAULT 0.00,
        charges DECIMAL(10,2) DEFAULT 0.00,
        less_weight DECIMAL(10,2) DEFAULT 0.00,
        final_weight DECIMAL(10,2) DEFAULT 0.00,
        mois_rate DECIMAL(10,2) DEFAULT 0.00,
        final_rate DECIMAL(10,2) DEFAULT 0.00,
        total_amount DECIMAL(12,2) DEFAULT 0.00,
        vehicle_type VARCHAR(100) NULL,
        bags_bales VARCHAR(50) NULL,
        agent VARCHAR(100) NULL,
        village VARCHAR(100) NULL,
        chess_no VARCHAR(50) NULL,
        chess_amount DECIMAL(10,2) DEFAULT 0.00,
        chess_name VARCHAR(100) NULL,
        location_name VARCHAR(150) NULL,
        cultivator_name VARCHAR(150) NULL,
        load_slip_no VARCHAR(50) NULL,
        father_name VARCHAR(150) NULL,
        mandal VARCHAR(100) NULL,
        bank_name VARCHAR(150) NULL,
        branch_name VARCHAR(150) NULL,
        ifsc_code VARCHAR(50) NULL,
        trader_name VARCHAR(150) NULL,
        alloted_mill VARCHAR(150) NULL,
        account_no VARCHAR(50) NULL,
        heap_no VARCHAR(50) NULL,
        mobile_no VARCHAR(50) NULL,
        image1 TEXT NULL,
        image2 TEXT NULL,
        image3 TEXT NULL,
        image4 TEXT NULL,
        udt DATETIME NULL,
        print_options JSON NULL,
        status VARCHAR(50) DEFAULT 'pending_1st_weight',
        operator_id VARCHAR(50) NULL,
        operator_name VARCHAR(100) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_session_tx (transaction_no),
        INDEX idx_session_veh (vehicle_reg_no),
        INDEX idx_session_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Create weigh_slips table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS weigh_slips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slip_number VARCHAR(64) DEFAULT NULL,
        session_id VARCHAR(64) DEFAULT NULL,
        transaction_no INT NOT NULL,
        vehicle_reg_no VARCHAR(50) DEFAULT '',
        vehicle_no VARCHAR(50) NOT NULL,
        party_name VARCHAR(255) DEFAULT '',
        firm_name VARCHAR(255) DEFAULT '',
        first_weight DECIMAL(10,2) DEFAULT NULL,
        first_weight_date DATE DEFAULT NULL,
        first_weight_time DATETIME DEFAULT NULL,
        second_weight DECIMAL(10,2) DEFAULT NULL,
        second_weight_date DATE DEFAULT NULL,
        second_weight_time DATETIME DEFAULT NULL,
        tare_weight DECIMAL(10,2) DEFAULT NULL,
        gross_weight DECIMAL(10,2) DEFAULT NULL,
        net_weight DECIMAL(10,2) DEFAULT NULL,
        nett_weight DECIMAL(10,2) DEFAULT NULL,
        rate DECIMAL(10,2) DEFAULT 0,
        moisture DECIMAL(5,2) DEFAULT 0,
        deduction DECIMAL(10,2) DEFAULT 0,
        charges DECIMAL(10,2) DEFAULT 0,
        vehicle_type VARCHAR(100) DEFAULT '',
        bags_bales VARCHAR(100) DEFAULT '',
        agent VARCHAR(100) DEFAULT '',
        village VARCHAR(100) DEFAULT '',
        chess_no VARCHAR(50) DEFAULT '',
        chess_amount DECIMAL(10,2) DEFAULT 0,
        chess_name VARCHAR(100) DEFAULT '',
        final_rate DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(12,2) DEFAULT 0,
        print_options JSON DEFAULT NULL,
        company_name VARCHAR(255) DEFAULT '',
        company_address TEXT DEFAULT NULL,
        phone_no VARCHAR(50) DEFAULT '',
        load_slip_no VARCHAR(100) DEFAULT '',
        cultivator_name VARCHAR(150) DEFAULT '',
        father_name VARCHAR(150) DEFAULT '',
        location_name VARCHAR(150) DEFAULT '',
        mobile_no VARCHAR(50) DEFAULT '',
        material VARCHAR(150) DEFAULT '',
        product VARCHAR(150) DEFAULT '',
        destination VARCHAR(150) DEFAULT '',
        driver_name VARCHAR(150) DEFAULT '',
        operator_name VARCHAR(100) DEFAULT '',
        evidence JSON DEFAULT NULL,
        admin_name VARCHAR(100) DEFAULT '',
        status VARCHAR(50) DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slip_tx (transaction_no),
        INDEX idx_slip_veh (vehicle_no)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Ensure all weigh_slips columns exist
    const [existingSlipCols] = await dbConnection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'weigh_slips'
    `, [dbName]);
    const slipColSet = new Set(existingSlipCols.map(c => c.COLUMN_NAME.toLowerCase()));

    const requiredSlipCols = [
      { name: 'transaction_no', type: 'INT DEFAULT 0' },
      { name: 'party_name', type: "VARCHAR(255) DEFAULT ''" },
      { name: 'firm_name', type: "VARCHAR(255) DEFAULT ''" },
      { name: 'first_weight', type: 'DECIMAL(10,2) DEFAULT NULL' },
      { name: 'first_weight_time', type: 'DATETIME DEFAULT NULL' },
      { name: 'second_weight', type: 'DECIMAL(10,2) DEFAULT NULL' },
      { name: 'second_weight_time', type: 'DATETIME DEFAULT NULL' },
      { name: 'rate', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'moisture', type: 'DECIMAL(5,2) DEFAULT 0' },
      { name: 'deduction', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'charges', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'vehicle_type', type: "VARCHAR(100) DEFAULT ''" },
      { name: 'bags_bales', type: "VARCHAR(100) DEFAULT ''" },
      { name: 'agent', type: "VARCHAR(100) DEFAULT ''" },
      { name: 'village', type: "VARCHAR(100) DEFAULT ''" },
      { name: 'chess_no', type: "VARCHAR(50) DEFAULT ''" },
      { name: 'chess_amount', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'chess_name', type: "VARCHAR(100) DEFAULT ''" },
      { name: 'final_rate', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'total_amount', type: 'DECIMAL(12,2) DEFAULT 0' },
      { name: 'print_options', type: 'JSON DEFAULT NULL' },
      { name: 'company_name', type: "VARCHAR(255) DEFAULT ''" },
      { name: 'company_address', type: "TEXT DEFAULT NULL" },
      { name: 'phone_no', type: "VARCHAR(50) DEFAULT ''" },
      { name: 'load_slip_no', type: "VARCHAR(100) DEFAULT ''" },
      { name: 'vehicle_no', type: "VARCHAR(50) DEFAULT ''" },
      { name: 'cultivator_name', type: "VARCHAR(150) DEFAULT ''" },
      { name: 'father_name', type: "VARCHAR(150) DEFAULT ''" },
      { name: 'mobile_no', type: "VARCHAR(50) DEFAULT ''" },
      { name: 'status', type: "VARCHAR(50) DEFAULT 'completed'" },
      { name: 'first_weight_date', type: "DATE DEFAULT NULL" },
      { name: 'second_weight_date', type: "DATE DEFAULT NULL" },
      { name: 'nett_weight', type: "DECIMAL(10,2) DEFAULT NULL" },
      { name: 'admin_name', type: "VARCHAR(100) DEFAULT ''" }
    ];

    for (const col of requiredSlipCols) {
      if (!slipColSet.has(col.name.toLowerCase())) {
        try {
          await dbConnection.query(`ALTER TABLE weigh_slips ADD COLUMN \`${col.name}\` ${col.type}`);
        } catch (e) {}
      }
    }

    // Auto-synchronize any existing weighbridge_sessions into weigh_slips
    try {
      await dbConnection.query(`
        INSERT INTO weigh_slips (
          slip_number, session_id, transaction_no, vehicle_reg_no, party_name, firm_name,
          date_time, first_weight, first_weight_time, second_weight, second_weight_time,
          tare_weight, gross_weight, net_weight, material, rate, moisture, deduction,
          charges, vehicle_type, bags_bales, agent, village, chess_no, chess_amount,
          chess_name, final_rate, total_amount, print_options, driver_name, destination,
          operator_name, evidence, load_slip_no, vehicle_no, cultivator_name, location_name,
          father_name, mobile_no, status, first_weight_date, second_weight_date, nett_weight,
          admin_name, product, created_at
        )
        SELECT
          CONCAT('WS-2026-', LPAD(ws.transaction_no, 4, '0')),
          ws.session_id, ws.transaction_no, ws.vehicle_reg_no, ws.party_name, ws.firm_name,
          COALESCE(ws.timestamp, NOW()), ws.first_weight, ws.first_weight_time, ws.second_weight, ws.second_weight_time,
          ws.tare_weight, ws.gross_weight, ws.net_weight, ws.material, ws.rate, ws.moisture, ws.deduction,
          ws.charges, ws.vehicle_type, ws.bags_bales, ws.agent, ws.village, ws.chess_no, ws.chess_amount,
          ws.chess_name, ws.final_rate, ws.total_amount, ws.print_options, ws.driver_name, ws.destination,
          ws.operator_name, ws.evidence, ws.load_slip_no, ws.vehicle_reg_no, ws.cultivator_name, ws.location_name,
          ws.father_name, ws.mobile_no, ws.status,
          DATE(ws.first_weight_time), DATE(ws.second_weight_time), ws.net_weight,
          ws.operator_name, ws.material, ws.created_at
        FROM weighbridge_sessions ws
        WHERE ws.transaction_no IS NOT NULL
        ON DUPLICATE KEY UPDATE
          first_weight = VALUES(first_weight),
          second_weight = VALUES(second_weight),
          net_weight = VALUES(net_weight),
          nett_weight = VALUES(nett_weight),
          total_amount = VALUES(total_amount),
          status = VALUES(status)
      `);
    } catch (syncErr) {
      console.warn('Auto-backfill weigh_slips warning:', syncErr.message);
    }
    
    console.log('✅ Database tables initialized successfully!');
    dbConnection.release();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

export { pool, testConnection, initializeDatabase };
