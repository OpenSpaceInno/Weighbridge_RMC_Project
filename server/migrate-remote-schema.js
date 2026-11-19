import mysql from 'mysql2/promise';

async function migrateRemoteSchema() {
  console.log('=== Migrating Remote rmc_gate_system Schema ===');

  const remoteConn = await mysql.createConnection({
    host: '213.210.37.249',
    port: 3306,
    user: 'rmc_user',
    password: 'SecureRmcPassword2026!',
    database: 'rmc_gate_system'
  });

  const localConn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'rmc_gate_system'
  });

  // 1. Create missing tables on remote if they do not exist
  const missingTables = [
    'anpr_events',
    'anpr_config',
    'company_settings',
    'device_ftp_config',
    'report_field_configs',
    'weighbridge_devices',
    'edge_sync_tracking'
  ];

  for (const table of missingTables) {
    if (table === 'edge_sync_tracking') {
      await remoteConn.query(`
        CREATE TABLE IF NOT EXISTS edge_sync_tracking (
          table_name VARCHAR(64) PRIMARY KEY,
          last_synced_at DATETIME NOT NULL DEFAULT '2000-01-01 00:00:00',
          total_synced INT NOT NULL DEFAULT 0,
          pending_count INT NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'idle',
          last_error TEXT,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ edge_sync_tracking table ensured on remote');
      continue;
    }

    const [remoteTables] = await remoteConn.query('SHOW TABLES LIKE ?', [table]);
    if (remoteTables.length === 0) {
      console.log(`Table '${table}' missing on remote. Fetching CREATE TABLE from local...`);
      const [createRes] = await localConn.query(`SHOW CREATE TABLE \`${table}\``);
      let createSql = createRes[0]['Create Table'];
      // Execute on remote
      await remoteConn.query(createSql);
      console.log(`✅ Created table '${table}' on remote successfully.`);
    } else {
      console.log(`Table '${table}' already exists on remote.`);
    }
  }

  // 2. Add missing columns to weighbridge_sessions
  console.log('\nChecking columns for weighbridge_sessions...');
  const [localWbCols] = await localConn.query(`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'rmc_gate_system' AND TABLE_NAME = 'weighbridge_sessions'
  `);
  const [remoteWbCols] = await remoteConn.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'rmc_gate_system' AND TABLE_NAME = 'weighbridge_sessions'
  `);
  const remoteWbSet = new Set(remoteWbCols.map(c => c.COLUMN_NAME));

  for (const col of localWbCols) {
    if (!remoteWbSet.has(col.COLUMN_NAME)) {
      const nullClause = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defClause = col.COLUMN_DEFAULT !== null ? `DEFAULT ${mysql.escape(col.COLUMN_DEFAULT)}` : '';
      const alterSql = `ALTER TABLE \`weighbridge_sessions\` ADD COLUMN \`${col.COLUMN_NAME}\` ${col.COLUMN_TYPE} ${nullClause} ${defClause}`.trim();
      console.log(`Adding column to weighbridge_sessions: ${col.COLUMN_NAME}`);
      try {
        await remoteConn.query(alterSql);
        console.log(`  ✅ Added ${col.COLUMN_NAME}`);
      } catch (err) {
        console.log(`  ⚠️ Column add error: ${err.message}`);
      }
    }
  }

  // 3. Add missing columns to weigh_slips
  console.log('\nChecking columns for weigh_slips...');
  const [localSlipCols] = await localConn.query(`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'rmc_gate_system' AND TABLE_NAME = 'weigh_slips'
  `);
  const [remoteSlipCols] = await remoteConn.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'rmc_gate_system' AND TABLE_NAME = 'weigh_slips'
  `);
  const remoteSlipSet = new Set(remoteSlipCols.map(c => c.COLUMN_NAME));

  for (const col of localSlipCols) {
    if (!remoteSlipSet.has(col.COLUMN_NAME)) {
      const nullClause = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defClause = col.COLUMN_DEFAULT !== null ? `DEFAULT ${mysql.escape(col.COLUMN_DEFAULT)}` : '';
      const alterSql = `ALTER TABLE \`weigh_slips\` ADD COLUMN \`${col.COLUMN_NAME}\` ${col.COLUMN_TYPE} ${nullClause} ${defClause}`.trim();
      console.log(`Adding column to weigh_slips: ${col.COLUMN_NAME}`);
      try {
        await remoteConn.query(alterSql);
        console.log(`  ✅ Added ${col.COLUMN_NAME}`);
      } catch (err) {
        console.log(`  ⚠️ Column add error: ${err.message}`);
      }
    }
  }

  // 4. Add missing columns to anpr_evidence
  console.log('\nChecking columns for anpr_evidence...');
  const [localAnprCols] = await localConn.query(`
    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'rmc_gate_system' AND TABLE_NAME = 'anpr_evidence'
  `);
  const [remoteAnprCols] = await remoteConn.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'rmc_gate_system' AND TABLE_NAME = 'anpr_evidence'
  `);
  const remoteAnprSet = new Set(remoteAnprCols.map(c => c.COLUMN_NAME));

  for (const col of localAnprCols) {
    if (!remoteAnprSet.has(col.COLUMN_NAME)) {
      const nullClause = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defClause = col.COLUMN_DEFAULT !== null ? `DEFAULT ${mysql.escape(col.COLUMN_DEFAULT)}` : '';
      const alterSql = `ALTER TABLE \`anpr_evidence\` ADD COLUMN \`${col.COLUMN_NAME}\` ${col.COLUMN_TYPE} ${nullClause} ${defClause}`.trim();
      console.log(`Adding column to anpr_evidence: ${col.COLUMN_NAME}`);
      try {
        await remoteConn.query(alterSql);
        console.log(`  ✅ Added ${col.COLUMN_NAME}`);
      } catch (err) {
        console.log(`  ⚠️ Column add error: ${err.message}`);
      }
    }
  }

  console.log('\n=== Remote Schema Migration Finished Successfully ===');
  await localConn.end();
  await remoteConn.end();
}

migrateRemoteSchema().catch(console.error);
