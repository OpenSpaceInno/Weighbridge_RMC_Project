import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        company_name VARCHAR(255) DEFAULT 'Aparna RMC Ltd.',
        firm_name VARCHAR(255) DEFAULT 'Aparna RMC',
        plant_name VARCHAR(255) DEFAULT 'Plant 1 - Main Batching Yard',
        plant_code VARCHAR(64) DEFAULT 'PLANT_001',
        tagline VARCHAR(255) DEFAULT 'Certified Electronic Weighbridge & Automated Concrete Dispatch',
        logo_url TEXT,
        address TEXT,
        city VARCHAR(100) DEFAULT 'Pune',
        state VARCHAR(100) DEFAULT 'Maharashtra',
        pincode VARCHAR(20) DEFAULT '411057',
        phone VARCHAR(50) DEFAULT '+91 20 2712 8899',
        email VARCHAR(100) DEFAULT 'weighbridge@aparnarmc.com',
        website VARCHAR(255) DEFAULT 'https://www.aparnarmc.com',
        gstin VARCHAR(50) DEFAULT '27AAAAA0000A1Z5',
        weighbridge_license VARCHAR(100) DEFAULT 'WB/2026/RMC-449',
        scale_model VARCHAR(100) DEFAULT 'Avery Weigh-Tronix E1205',
        scale_capacity VARCHAR(50) DEFAULT '100 MT',
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
      INSERT INTO company_settings (id, company_name, firm_name, plant_name, plant_code)
      VALUES ('default_company', 'Aparna RMC Ltd.', 'Aparna RMC', 'Plant 1 - Main Batching Yard', 'PLANT_001')
      ON DUPLICATE KEY UPDATE id=id
    `);
    
    console.log('✅ Database tables initialized successfully!');
    dbConnection.release();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

export { pool, testConnection, initializeDatabase };
