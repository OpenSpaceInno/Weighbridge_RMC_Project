import mysql from 'mysql2/promise';
import fs from 'fs';

async function inspectDatabases() {
  const localConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'rmc_gate_system'
  };

  const remoteConfig = {
    host: '213.210.37.249',
    port: 3306,
    user: 'rmc_user',
    password: 'SecureRmcPassword2026!',
    database: 'rmc_gate_system'
  };

  const localConn = await mysql.createConnection(localConfig);
  const remoteConn = await mysql.createConnection(remoteConfig);

  console.log('=== Connected to Local and Remote MySQL ===');

  const [localVer] = await localConn.query('SELECT VERSION() as v');
  const [remoteVer] = await remoteConn.query('SELECT VERSION() as v');

  console.log(`Local MySQL Version:  ${localVer[0].v}`);
  console.log(`Remote MySQL Version: ${remoteVer[0].v}`);

  // Get local tables
  const [localTablesRows] = await localConn.query('SHOW TABLES');
  const localTables = localTablesRows.map(r => Object.values(r)[0]);

  // Get remote tables
  const [remoteTablesRows] = await remoteConn.query('SHOW TABLES');
  const remoteTables = remoteTablesRows.map(r => Object.values(r)[0]);

  console.log(`\nLocal tables count:  ${localTables.length}`);
  console.log(`Remote tables count: ${remoteTables.length}`);

  const diffLocalOnly = localTables.filter(t => !remoteTables.includes(t));
  const diffRemoteOnly = remoteTables.filter(t => !localTables.includes(t));
  const commonTables = localTables.filter(t => remoteTables.includes(t));

  console.log(`\nTables in both:   ${commonTables.length}`);
  console.log(`Tables local only:  [${diffLocalOnly.join(', ')}]`);
  console.log(`Tables remote only: [${diffRemoteOnly.join(', ')}]`);

  // Detailed Table Inspection
  const tableReport = [];

  for (const table of localTables) {
    const isRemote = remoteTables.includes(table);

    // Row counts
    const [localCount] = await localConn.query(`SELECT COUNT(*) as c FROM \`${table}\``);
    let remoteCountVal = 'N/A';
    if (isRemote) {
      const [remoteCount] = await remoteConn.query(`SELECT COUNT(*) as c FROM \`${table}\``);
      remoteCountVal = remoteCount[0].c;
    }

    // Local columns
    const [localCols] = await localConn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA, COLUMN_DEFAULT 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = 'rmc_gate_system' AND TABLE_NAME = ? 
       ORDER BY ORDINAL_POSITION`,
      [table]
    );

    // Remote columns
    let remoteCols = [];
    if (isRemote) {
      const [rCols] = await remoteConn.query(
        `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA, COLUMN_DEFAULT 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = 'rmc_gate_system' AND TABLE_NAME = ? 
         ORDER BY ORDINAL_POSITION`,
        [table]
      );
      remoteCols = rCols;
    }

    // Check primary key
    const pkCols = localCols.filter(c => c.COLUMN_KEY === 'PRI').map(c => c.COLUMN_NAME);
    const trackingCols = localCols.filter(c => ['updated_at', 'created_at', 'timestamp', 'date'].includes(c.COLUMN_NAME.toLowerCase())).map(c => c.COLUMN_NAME);

    // Schema mismatches if remote exists
    const missingInRemote = [];
    const missingInLocal = [];
    const typeMismatches = [];

    if (isRemote) {
      const remoteColMap = new Map(remoteCols.map(c => [c.COLUMN_NAME, c]));
      const localColMap = new Map(localCols.map(c => [c.COLUMN_NAME, c]));

      for (const lc of localCols) {
        if (!remoteColMap.has(lc.COLUMN_NAME)) {
          missingInRemote.push(lc.COLUMN_NAME);
        } else {
          const rc = remoteColMap.get(lc.COLUMN_NAME);
          if (lc.DATA_TYPE !== rc.DATA_TYPE) {
            typeMismatches.push(`${lc.COLUMN_NAME}: local(${lc.DATA_TYPE}) != remote(${rc.DATA_TYPE})`);
          }
        }
      }

      for (const rc of remoteCols) {
        if (!localColMap.has(rc.COLUMN_NAME)) {
          missingInLocal.push(rc.COLUMN_NAME);
        }
      }
    }

    // Foreign keys
    const [fks] = await localConn.query(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = 'rmc_gate_system' AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [table]
    );

    tableReport.push({
      table,
      existsOnRemote: isRemote,
      localRowCount: localCount[0].c,
      remoteRowCount: remoteCountVal,
      primaryKey: pkCols,
      trackingCols,
      foreignKeys: fks.map(f => `${f.COLUMN_NAME} -> ${f.REFERENCED_TABLE_NAME}.${f.REFERENCED_COLUMN_NAME}`),
      missingInRemote,
      missingInLocal,
      typeMismatches
    });
  }

  // Check views, triggers, routines, events
  const [triggers] = await localConn.query(`SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = 'rmc_gate_system'`);
  const [views] = await localConn.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = 'rmc_gate_system'`);
  const [events] = await localConn.query(`SELECT EVENT_NAME, STATUS FROM INFORMATION_SCHEMA.EVENTS WHERE EVENT_SCHEMA = 'rmc_gate_system'`);

  const fullInspection = {
    localVersion: localVer[0].v,
    remoteVersion: remoteVer[0].v,
    localTablesCount: localTables.length,
    remoteTablesCount: remoteTables.length,
    tables: tableReport,
    triggers,
    views: views.map(v => v.TABLE_NAME),
    events
  };

  fs.writeFileSync('db-inspection-report.json', JSON.stringify(fullInspection, null, 2));
  console.log('\n✅ Detailed database inspection saved to db-inspection-report.json');

  console.log('\n--- SUMMARY OF TABLES & COUNTS ---');
  for (const t of tableReport) {
    const pkStr = t.primaryKey.join('+') || 'NO_PK!';
    const trackStr = t.trackingCols.join(',') || 'NO_TRACK_COL';
    const status = !t.existsOnRemote ? '⚠️ MISSING ON REMOTE' : (t.missingInRemote.length ? `⚠️ ${t.missingInRemote.length} COLS MISSING ON REMOTE` : '✅ MATCH');
    console.log(`${t.table.padEnd(28)} | Local: ${String(t.localRowCount).padStart(5)} | Remote: ${String(t.remoteRowCount).padStart(5)} | PK: ${pkStr.padEnd(16)} | Track: ${trackStr.padEnd(22)} | ${status}`);
  }

  await localConn.end();
  await remoteConn.end();
}

inspectDatabases().catch(console.error);
