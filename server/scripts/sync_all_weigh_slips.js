import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

function sanitizeValue(v) {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())} ${pad(v.getHours())}:${pad(v.getMinutes())}:${pad(v.getSeconds())}`;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

async function main() {
  console.log('========================================================================');
  console.log(' SYNCHRONIZING ALL WEIGH SLIPS & SESSIONS FROM LOCAL TO REMOTE SERVER   ');
  console.log('========================================================================\n');

  const localConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'rmc_gate_system'
  });

  const remoteConn = await mysql.createConnection({
    host: process.env.REMOTE_DB_HOST || '213.210.37.249',
    port: Number(process.env.REMOTE_DB_PORT) || 3306,
    user: process.env.REMOTE_DB_USER || 'rmc_user',
    password: process.env.REMOTE_DB_PASSWORD || 'SecureRmcPassword2026!',
    database: process.env.REMOTE_DB_NAME || 'rmc_gate_system'
  });

  console.log('✅ Connected to Local MySQL (localhost) and Remote MySQL (213.210.37.249).\n');

  await remoteConn.query('SET FOREIGN_KEY_CHECKS = 0');

  // 1. Sync weigh_slips
  console.log('1. Fetching local weigh_slips...');
  const [slips] = await localConn.query('SELECT * FROM weigh_slips ORDER BY transaction_no ASC');
  console.log(`   Found ${slips.length} weigh_slips locally.`);

  const [colRows] = await remoteConn.query(
    'SELECT COLUMN_NAME, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [process.env.REMOTE_DB_NAME || 'rmc_gate_system', 'weigh_slips']
  );
  const validCols = new Set(colRows.map((c) => c.COLUMN_NAME));
  const sampleCols = Object.keys(slips[0]).filter((c) => validCols.has(c));
  const colList = sampleCols.map((c) => `\`${c}\``).join(', ');
  const nonPkCols = sampleCols.filter((c) => c !== 'slip_number');
  const updateClause = nonPkCols.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');

  console.log(`   Syncing ${slips.length} weigh_slips to remote database...`);
  const chunkSize = 100;
  for (let i = 0; i < slips.length; i += chunkSize) {
    const chunk = slips.slice(i, i + chunkSize);
    for (const row of chunk) {
      const values = sampleCols.map((c) => sanitizeValue(row[c]));
      const placeholders = sampleCols.map(() => '?').join(', ');
      const sql = `INSERT INTO \`weigh_slips\` (${colList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;
      await remoteConn.query(sql, values);
    }
    console.log(`   Synced: ${Math.min(i + chunkSize, slips.length)} / ${slips.length} weigh_slips`);
  }
  console.log('   ✅ weigh_slips sync complete!\n');

  // 2. Sync weighbridge_sessions
  console.log('2. Fetching local weighbridge_sessions...');
  const [sessions] = await localConn.query('SELECT * FROM weighbridge_sessions ORDER BY transaction_no ASC');
  console.log(`   Found ${sessions.length} weighbridge_sessions locally.`);

  const [sessColRows] = await remoteConn.query(
    'SELECT COLUMN_NAME, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [process.env.REMOTE_DB_NAME || 'rmc_gate_system', 'weighbridge_sessions']
  );
  const validSessCols = new Set(sessColRows.map((c) => c.COLUMN_NAME));
  const sampleSessCols = Object.keys(sessions[0]).filter((c) => validSessCols.has(c));
  const sessColList = sampleSessCols.map((c) => `\`${c}\``).join(', ');
  const nonPkSessCols = sampleSessCols.filter((c) => c !== 'session_id');
  const updateSessClause = nonPkSessCols.map((c) => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');

  console.log(`   Syncing ${sessions.length} weighbridge_sessions to remote database...`);
  for (let i = 0; i < sessions.length; i += chunkSize) {
    const chunk = sessions.slice(i, i + chunkSize);
    for (const row of chunk) {
      const values = sampleSessCols.map((c) => sanitizeValue(row[c]));
      const placeholders = sampleSessCols.map(() => '?').join(', ');
      const sql = `INSERT INTO \`weighbridge_sessions\` (${sessColList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateSessClause}`;
      await remoteConn.query(sql, values);
    }
    console.log(`   Synced: ${Math.min(i + chunkSize, sessions.length)} / ${sessions.length} weighbridge_sessions`);
  }
  console.log('   ✅ weighbridge_sessions sync complete!\n');

  await remoteConn.query('SET FOREIGN_KEY_CHECKS = 1');

  // 3. Update edge_sync_tracking locally so incremental sync stays perfectly in step
  const now = new Date();
  await localConn.query(
    `INSERT INTO edge_sync_tracking (table_name, last_synced_at, total_synced, status, last_error, updated_at)
     VALUES ('weigh_slips', ?, ?, 'synced', NULL, NOW())
     ON DUPLICATE KEY UPDATE
       last_synced_at = VALUES(last_synced_at),
       total_synced = VALUES(total_synced),
       status = 'synced',
       last_error = NULL,
       updated_at = NOW()`,
    [now, slips.length]
  );

  await localConn.query(
    `INSERT INTO edge_sync_tracking (table_name, last_synced_at, total_synced, status, last_error, updated_at)
     VALUES ('weighbridge_sessions', ?, ?, 'synced', NULL, NOW())
     ON DUPLICATE KEY UPDATE
       last_synced_at = VALUES(last_synced_at),
       total_synced = VALUES(total_synced),
       status = 'synced',
       last_error = NULL,
       updated_at = NOW()`,
    [now, sessions.length]
  );

  // 4. Verify on Remote Server
  const [remSlipsCount] = await remoteConn.query('SELECT COUNT(*) as c, MIN(transaction_no) as min_tx, MAX(transaction_no) as max_tx FROM weigh_slips');
  const [remSessCount] = await remoteConn.query('SELECT COUNT(*) as c, MIN(transaction_no) as min_tx, MAX(transaction_no) as max_tx FROM weighbridge_sessions');

  console.log('========================================================================');
  console.log(' FINAL VERIFICATION REPORT ON SERVER (213.210.37.249):');
  console.log('========================================================================');
  console.log(`Server weigh_slips count:        ${remSlipsCount[0].c} (Min Tx: #${remSlipsCount[0].min_tx}, Max Tx: #${remSlipsCount[0].max_tx})`);
  console.log(`Server weighbridge_sessions count: ${remSessCount[0].c} (Min Tx: #${remSessCount[0].min_tx}, Max Tx: #${remSessCount[0].max_tx})`);
  console.log('========================================================================\n');

  await localConn.end();
  await remoteConn.end();
}

main().catch((err) => {
  console.error('❌ Error during synchronization:', err);
  process.exit(1);
});
