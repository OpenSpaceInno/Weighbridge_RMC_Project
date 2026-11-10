import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool (without database selection initially)
const poolWithoutDb = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create connection pool (with database)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'RMC-SAAS',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
async function testConnection() {
  try {
    // First, create database if it doesn't exist
    const connection = await poolWithoutDb.getConnection();
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'RMC-SAAS'}\``);
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
  try {
    const connection = await poolWithoutDb.getConnection();
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'RMC-SAAS'}\``);
    console.log(`✅ Database '${process.env.DB_NAME}' ready`);
    connection.release();
    
    // Now use the database connection pool
    const dbConnection = await pool.getConnection();
    
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
    
    console.log('✅ Database tables created successfully!');
    dbConnection.release();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

export { pool, testConnection, initializeDatabase };
