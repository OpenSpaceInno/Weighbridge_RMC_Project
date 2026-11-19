import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

async function runVerification() {
  console.log('================================================================');
  console.log('   STEP-BY-STEP SYNCHRONIZATION VERIFICATION SUITE              ');
  console.log('   Local MySQL (localhost:3306) -> Remote MySQL (213.210.37.249)');
  console.log('================================================================');

  const localConn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'rmc_gate_system'
  });

  const remoteConn = await mysql.createConnection({
    host: '213.210.37.249',
    port: 3306,
    user: 'rmc_user',
    password: 'SecureRmcPassword2026!',
    database: 'rmc_gate_system'
  });

  console.log('✅ Both Local and Remote MySQL connections established.\n');

  // Clean up any old test records first
  await localConn.query("DELETE FROM weighbridge_sessions WHERE session_id LIKE 'WB-VERIFY-TEST-%'");
  await remoteConn.query("DELETE FROM weighbridge_sessions WHERE session_id LIKE 'WB-VERIFY-TEST-%'");

  const testSessionId = 'WB-VERIFY-TEST-' + Date.now();
  const testTxNo = 999990 + Math.floor(Math.random() * 9);
  const testPlate = 'TS99ZZ' + Math.floor(1000 + Math.random() * 9000);

  try {
    // -------------------------------------------------------------
    // STEP 1: Baseline Check
    // -------------------------------------------------------------
    console.log('--- STEP 1: Baseline Check ---');
    const [localRowsWb] = await localConn.query('SELECT count(*) as c FROM weighbridge_sessions');
    const [remoteRowsWb] = await remoteConn.query('SELECT count(*) as c FROM weighbridge_sessions');
    console.log(`weighbridge_sessions count: Local = ${localRowsWb[0].c}, Remote = ${remoteRowsWb[0].c}`);

    const [localRowsAnpr] = await localConn.query('SELECT count(*) as c FROM anpr_events');
    const [remoteRowsAnpr] = await remoteConn.query('SELECT count(*) as c FROM anpr_events');
    console.log(`anpr_events count:          Local = ${localRowsAnpr[0].c}, Remote = ${remoteRowsAnpr[0].c}`);

    const [localRowsAudit] = await localConn.query('SELECT count(*) as c FROM audit_logs');
    const [remoteRowsAudit] = await remoteConn.query('SELECT count(*) as c FROM audit_logs');
    console.log(`audit_logs count:           Local = ${localRowsAudit[0].c}, Remote = ${remoteRowsAudit[0].c}`);

    // -------------------------------------------------------------
    // STEP 2: Insert Verification
    // -------------------------------------------------------------
    console.log('\n--- STEP 2: Insert Test Verification ---');
    console.log(`Inserting test record locally: [${testSessionId}], Tx: ${testTxNo}, Plate: ${testPlate}`);

    await localConn.query(`
      INSERT INTO weighbridge_sessions (
        session_id, transaction_no, vehicle_reg_no, party_name, firm_name,
        first_weight, first_weight_time, rate, moisture, status,
        cultivator_name, location_name, created_at, updated_at
      ) VALUES (
        ?, ?, ?, 'Verification Test Mill', 'Dharani Mills QA',
        24500.00, NOW(), 5500.00, 7.20, 'pending_2nd_weight',
        'Test Farmer', 'Shamshabad QA Lab', NOW(), NOW()
      )
    `, [testSessionId, testTxNo, testPlate]);

    console.log('Calling /api/sync/trigger to execute synchronization...');
    const triggerRes = await fetch('http://localhost:3001/api/sync/trigger', { method: 'POST' });
    const triggerJson = await triggerRes.json();
    console.log(`Sync cycle completed. Status: ${triggerJson.report?.status}, Tables processed: ${triggerJson.report?.tablesProcessed}, Inserted: ${triggerJson.report?.totalInserted}`);

    // Verify on remote MySQL
    const [remoteRecord] = await remoteConn.query(
      'SELECT session_id, transaction_no, vehicle_reg_no, party_name, first_weight, status FROM weighbridge_sessions WHERE session_id = ?',
      [testSessionId]
    );

    if (remoteRecord.length > 0) {
      console.log('✅ Remote verification SUCCESS: Record verified in remote MySQL database!');
      console.log('   Remote data:', JSON.stringify(remoteRecord[0]));
    } else {
      throw new Error('❌ Insert verification FAILED: Record was not found on remote MySQL!');
    }

    // -------------------------------------------------------------
    // STEP 3: Update Verification (Wait 2 seconds so timestamp changes)
    // -------------------------------------------------------------
    console.log('\n--- STEP 3: Update Test Verification ---');
    console.log('Waiting 2 seconds for timestamp progression...');
    await new Promise(r => setTimeout(r, 2000));

    console.log('Updating record locally: adding second_weight = 10500, net_weight = 14000, status = "completed"');

    await localConn.query(`
      UPDATE weighbridge_sessions
      SET second_weight = 10500.00,
          second_weight_time = NOW(),
          net_weight = 14000.00,
          status = 'completed',
          updated_at = NOW()
      WHERE session_id = ?
    `, [testSessionId]);

    console.log('Calling /api/sync/trigger to sync update...');
    const updateRes = await fetch('http://localhost:3001/api/sync/trigger', { method: 'POST' });
    const updateJson = await updateRes.json();
    console.log(`Sync cycle completed. Status: ${updateJson.report?.status}, Updated: ${updateJson.report?.totalUpdated}`);

    // Verify updated record on remote MySQL
    const [remoteUpdatedRecord] = await remoteConn.query(
      'SELECT session_id, second_weight, net_weight, status, updated_at FROM weighbridge_sessions WHERE session_id = ?',
      [testSessionId]
    );

    if (remoteUpdatedRecord.length > 0 && remoteUpdatedRecord[0].status === 'completed' && Number(remoteUpdatedRecord[0].net_weight) === 14000) {
      console.log('✅ Remote update verification SUCCESS: Updated fields reflected in remote MySQL database!');
      console.log('   Remote updated data:', JSON.stringify(remoteUpdatedRecord[0]));
    } else {
      throw new Error('❌ Update verification FAILED: Updated fields mismatch on remote!');
    }

  } finally {
    // -------------------------------------------------------------
    // STEP 4: Clean up test record
    // -------------------------------------------------------------
    console.log('\n--- STEP 4: Cleanup Test Records ---');
    await localConn.query('DELETE FROM weighbridge_sessions WHERE session_id = ?', [testSessionId]);
    await remoteConn.query('DELETE FROM weighbridge_sessions WHERE session_id = ?', [testSessionId]);
    console.log('✅ Cleaned up test record from both local and remote MySQL. Production database is pristine.');

    // -------------------------------------------------------------
    // STEP 5: Final Status Check
    // -------------------------------------------------------------
    console.log('\n--- STEP 5: Service Status Check ---');
    const statusRes = await fetch('http://localhost:3001/api/sync/status');
    const statusJson = await statusRes.json();
    console.log('Sync Service Health:', {
      enabled: statusJson.enabled,
      mode: statusJson.mode,
      targetHost: statusJson.targetHost,
      targetDatabase: statusJson.targetDatabase,
      intervalMinutes: statusJson.intervalMinutes,
      lastAttemptAt: statusJson.lastAttemptAt,
      lastSuccessAt: statusJson.lastSuccessAt,
      status: statusJson.status
    });

    await localConn.end();
    await remoteConn.end();
  }

  console.log('\n================================================================');
  console.log('   ALL 5 VERIFICATION STEPS PASSED WITH 100% SUCCESS!          ');
  console.log('================================================================');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
