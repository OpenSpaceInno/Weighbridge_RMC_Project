import express from 'express';
import { pool } from '../db.js';
import cloudSyncService from '../cloud-sync-service.js';

const router = express.Router();
const EXPECTED_SYNC_SECRET = process.env.CLOUD_SYNC_SECRET || 'Aparna_RMC_Cloud_Sync_Secret_2026!';

// Helper to sanitize incoming date/JSON values for MySQL insertion
function sanitizeValueForMysql(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'object') {
    if (val instanceof Date) {
      return val.toISOString().slice(0, 19).replace('T', ' ');
    }
    return JSON.stringify(val);
  }
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/i.test(val)) {
      return val.replace('T', ' ').replace(/\..*$/, '').replace(/Z$/, '');
    }
    return val;
  }
  if (typeof val === 'boolean') {
    return val ? 1 : 0;
  }
  return val;
}

// ============================================================================
// GET /api/sync/status
// Diagnostic endpoint: reports local sync worker status & tracking statistics
// ============================================================================
router.get('/status', async (req, res) => {
  try {
    const status = await cloudSyncService.getStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/sync/trigger
// Manually triggers an immediate synchronization cycle
// ============================================================================
router.post('/trigger', async (req, res) => {
  try {
    const result = await cloudSyncService.runSyncCycle();
    res.json({ success: true, message: 'Sync cycle completed', report: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/sync/init-tables
// Idempotently creates missing operational tables (anpr_events, weigh_slips, etc.)
// ============================================================================
router.post('/init-tables', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query(`
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

      await connection.query(`
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

      await connection.query(`
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

      await connection.query(`
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

      await connection.query(`
        INSERT INTO company_settings (id, company_name, firm_name, plant_name, plant_code)
        VALUES ('default_company', 'Dharani Cotton Mills', 'Dharani Cotton Mills', 'Plant 1 - Main Batching Yard', 'PLANT_001')
        ON DUPLICATE KEY UPDATE company_name='Dharani Cotton Mills', firm_name='Dharani Cotton Mills'
      `);

      res.json({ success: true, message: 'All operational tables initialized successfully!' });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/sync/push
// Central Server Receiver: Upserts incoming data batches
// Uses transactions, disables FK checks during batch, and tracks inserted vs updated
// ============================================================================
router.post('/push', async (req, res) => {
  const incomingSecret = req.headers['x-sync-secret'] || req.body?.syncSecret;
  if (incomingSecret !== EXPECTED_SYNC_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid x-sync-secret' });
  }

  const { plantId, tables } = req.body;
  if (!tables || typeof tables !== 'object') {
    return res.status(400).json({ success: false, error: 'Payload must contain a tables map' });
  }

  const connection = await pool.getConnection();
  const summary = {
    totalTables: 0,
    insertedRecords: 0,
    updatedRecords: 0,
    unchangedRecords: 0,
    tableStats: {}
  };

  try {
    await connection.beginTransaction();
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Get list of existing tables in this database
    const [existingTableRows] = await connection.query('SHOW TABLES');
    const existingTableSet = new Set(existingTableRows.map((r) => Object.values(r)[0].toLowerCase()));

    for (const [tableName, rows] of Object.entries(tables)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      if (!existingTableSet.has(tableName.toLowerCase())) {
        console.warn(`[Sync Receiver] Skipped table '${tableName}': does not exist on this server`);
        continue;
      }

      // Query valid columns for this table to prevent invalid column injection
      const [colRows] = await connection.query(
        `SELECT COLUMN_NAME, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
      );
      const validColSet = new Set(colRows.map((c) => c.COLUMN_NAME));
      const pkCols = new Set(colRows.filter((c) => c.COLUMN_KEY === 'PRI').map((c) => c.COLUMN_NAME));

      // Filter sample row to only existing table columns
      const firstRow = rows[0];
      const validCols = Object.keys(firstRow).filter((c) => validColSet.has(c));
      if (validCols.length === 0) continue;

      const colListSql = validCols.map((c) => `\`${c}\``).join(', ');
      const nonPkCols = validCols.filter((c) => !pkCols.has(c));
      const updateCols = nonPkCols.length > 0 ? nonPkCols : validCols;
      const updateListSql = updateCols
        .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
        .join(', ');

      let insertedCount = 0;
      let updatedCount = 0;
      let unchangedCount = 0;

      for (const row of rows) {
        const values = validCols.map((col) => sanitizeValueForMysql(row[col]));
        const placeholders = validCols.map(() => '?').join(', ');
        const sql = `INSERT INTO \`${tableName}\` (${colListSql}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateListSql}`;
        const [result] = await connection.query(sql, values);

        if (result.affectedRows === 1) {
          insertedCount++;
        } else if (result.affectedRows === 2) {
          updatedCount++;
        } else {
          unchangedCount++;
        }
      }

      summary.tableStats[tableName] = {
        total: rows.length,
        inserted: insertedCount,
        updated: updatedCount,
        unchanged: unchangedCount
      };
      summary.insertedRecords += insertedCount;
      summary.updatedRecords += updatedCount;
      summary.unchangedRecords += unchangedCount;
      summary.totalTables++;
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    await connection.commit();

    console.log(`📥 [Sync Receiver] Upserted from plant [${plantId || 'remote'}]: Inserted=${summary.insertedRecords}, Updated=${summary.updatedRecords}, Unchanged=${summary.unchangedRecords} across ${summary.totalTables} tables`);

    res.json({
      success: true,
      plantId,
      summary,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      await connection.rollback();
    } catch {}
    console.error('[Sync Receiver] Upsert error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
