import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const SQL_FILE_PATH = path.join(__dirname, 'insert_500_weigh_slips_batch2.sql');

// Sample real-world lists for randomized realistic data
const VEHICLE_PREFIXES = ['AP 28 TB', 'TS 09 UB', 'KA 04 MM', 'MH 12 RN', 'TN 15 MF', 'HR 98 AA', 'DL 01 AA', 'GJ 06 AB', 'TS 25 T', 'AP 05 TC'];
const VEHICLE_TYPES = ['10 Wheeler Truck', '12 Wheeler Tipper', 'Multi-Axle Trailer', '6 Wheeler Heavy', '14 Wheeler Hauler'];
const PARTIES = [
  'Sudahrshana Ways', 'Natraj Motors', 'Venkateshwara Traders', 'Sri Lakshmi Logistics',
  'Dharani Agro Mills', 'Balaji Transports', 'Sree Ram Raw Materials', 'Hyderabad Cotton Traders',
  'Deccan Ready Mix', 'Aparna Infrastructure', 'Kaveri Seeds & Cotton', 'Telangana Cotton Guild'
];
const PRODUCTS = [
  'Cotton Bales', 'Raw Cotton', 'Cement 53 Grade', 'Fly Ash', 'Aggregate 20mm',
  'Aggregate 10mm', 'River Sand', 'M-Sand', 'Cotton Seed', 'Yarn'
];
const CULTIVATORS = [
  'Varma', 'Ramesh', 'Suresh Reddy', 'K. Naidu', 'M. Srinivas',
  'Venkat Rao', 'Anjaneyulu', 'B. Prasad', 'G. Narayana', 'T. Ramakrishna'
];
const VILLAGES = ['Vuravakonda', 'Sompeta', 'Tandur', 'Chevella', 'Shadnagar', 'Pargi', 'Vikarabad', 'Shamshabad'];
const LOCATIONS = ['Sompeta Yard', 'Tandur Plant', 'Vikarabad Main Mill', 'Shadnagar Hub', 'Shamshabad Depot'];
const DRIVERS = ['Raju Kumar', 'Mohan Singh', 'S. Balakrishna', 'Jitender Rao', 'Govind Naik', 'P. Mahesh', 'K. Ravi'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDateOnly(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'number') return String(str);
  return `'${String(str).replace(/'/g, "''")}'`;
}

async function main() {
  console.log('========================================================================');
  console.log(' GENERATING & INSERTING 2ND BATCH OF 500 DUMMY WEIGH SLIPS INTO MYSQL   ');
  console.log('========================================================================\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'rmc_gate_system',
    multipleStatements: true
  });

  console.log('✅ Connected to Local MySQL database: ' + (process.env.DB_NAME || 'rmc_gate_system'));

  // 1. Check current count and max transaction_no
  const [initialCount] = await connection.query('SELECT COUNT(*) as c FROM weigh_slips');
  const [maxTx] = await connection.query('SELECT COALESCE(MAX(transaction_no), 0) as max_tx FROM weigh_slips');
  const startTx = Number(maxTx[0].max_tx) + 1;
  const countToInsert = 500;
  const endTx = startTx + countToInsert - 1;

  console.log(`Current weigh_slips record count: ${initialCount[0].c}`);
  console.log(`Starting Transaction No:          ${startTx}`);
  console.log(`Ending Transaction No:            ${endTx}`);
  console.log(`Total Records to Generate:        ${countToInsert}\n`);

  // 2. Build 500 records
  const records = [];
  const baseTimestamp = Date.now() - (15 * 24 * 60 * 60 * 1000); // spread over last 15 days up to now
  const timeStep = (15 * 24 * 60 * 60 * 1000) / countToInsert;

  for (let i = 0; i < countToInsert; i++) {
    const txNo = startTx + i;
    const slipNumber = `WS-2026-${String(txNo).padStart(4, '0')}`;
    const sessionId = `WB-TX-${txNo}-${Date.now() + i}`;

    const recTimeMs = baseTimestamp + (i * timeStep) + randomInt(0, 1800000);
    const firstWeightDateObj = new Date(recTimeMs);
    const secondWeightDateObj = new Date(recTimeMs + randomInt(15 * 60 * 1000, 90 * 60 * 1000)); // 15m - 1.5h later

    const vehPrefix = randomChoice(VEHICLE_PREFIXES);
    const vehNumber = `${vehPrefix} ${randomInt(1000, 9999)}`;
    const partyName = randomChoice(PARTIES);
    const product = randomChoice(PRODUCTS);
    const cultivator = randomChoice(CULTIVATORS);
    const village = randomChoice(VILLAGES);
    const location = randomChoice(LOCATIONS);
    const driver = randomChoice(DRIVERS);

    // Weights: Gross (32,000 to 52,000 kg), Tare (11,000 to 18,000 kg)
    const grossWeight = randomInt(320, 520) * 100;
    const tareWeight = randomInt(110, 180) * 100;
    const netWeight = grossWeight - tareWeight;

    const rate = randomInt(45, 80) * 10; // 450 to 800
    const moisture = (randomInt(65, 95) / 10).toFixed(2);
    const charges = randomChoice([50, 80, 100, 120, 150]);
    const deduction = 0.00;
    const bagsBales = `${randomInt(80, 220)} ${product.includes('Cotton') ? 'Bales' : 'Bags'}`;
    const totalAmount = ((netWeight / 100) * rate).toFixed(2); // quintal rate

    const printOptionsJson = JSON.stringify({ printImages: true, printQrCode: true, printDuplicate: false });
    const evidenceJson = JSON.stringify([]);

    records.push({
      slip_number: slipNumber,
      session_id: sessionId,
      vehicle_reg_no: vehNumber,
      vehicle_no: vehNumber,
      date_time: formatDate(secondWeightDateObj),
      tare_weight: tareWeight,
      gross_weight: grossWeight,
      net_weight: netWeight,
      nett_weight: netWeight,
      material: product,
      product: product,
      driver_name: driver,
      destination: location,
      operator_name: 'Weighmaster Authorized',
      admin_name: 'Weighbridge Operator',
      evidence: evidenceJson,
      created_at: formatDate(secondWeightDateObj),
      transaction_no: txNo,
      party_name: partyName,
      firm_name: 'DHARANI COTTON MILLS',
      first_weight: grossWeight,
      first_weight_date: formatDateOnly(firstWeightDateObj),
      first_weight_time: formatDate(firstWeightDateObj),
      second_weight: tareWeight,
      second_weight_date: formatDateOnly(secondWeightDateObj),
      second_weight_time: formatDate(secondWeightDateObj),
      rate: rate,
      final_rate: rate,
      moisture: moisture,
      deduction: deduction,
      charges: charges,
      vehicle_type: randomChoice(VEHICLE_TYPES),
      bags_bales: bagsBales,
      agent: 'Dharani Commission Agent',
      village: village,
      chess_no: `CH-${randomInt(100, 999)}`,
      chess_amount: 150.00,
      chess_name: 'Mandi Cess',
      total_amount: totalAmount,
      print_options: printOptionsJson,
      company_name: 'DHARANI COTTON MILLS',
      company_address: 'Vikarabad, Hyderabad - 500033',
      phone_no: '+91 20 2712 8899',
      load_slip_no: `LS-${randomInt(1000, 9999)}`,
      cultivator_name: cultivator,
      father_name: `K. ${cultivator}`,
      mobile_no: `98${randomInt(10000000, 99999999)}`,
      status: 'completed',
      location_name: location
    });
  }

  // 3. Generate standalone pure MySQL script file (.sql)
  console.log(`Writing standalone MySQL script to: ${SQL_FILE_PATH} ...`);
  const sqlHeader = `-- =====================================================================
-- Standalone MySQL Script: Insert 500 Dummy Records (Batch 2) into weigh_slips Table
-- Project: Weighbridge RMC Management System
-- Database: rmc_gate_system
-- Starting Transaction: ${startTx}
-- Ending Transaction: ${endTx}
-- Generated at: ${new Date().toISOString()}
-- =====================================================================

USE \`rmc_gate_system\`;

SET FOREIGN_KEY_CHECKS = 0;

`;

  let sqlInserts = '';
  const batchChunk = 100;

  for (let b = 0; b < records.length; b += batchChunk) {
    const chunk = records.slice(b, b + batchChunk);
    sqlInserts += `-- Batch ${Math.floor(b / batchChunk) + 1} (Records ${b + 1} to ${b + chunk.length} | Tx #${chunk[0].transaction_no} - #${chunk[chunk.length - 1].transaction_no})\n`;
    sqlInserts += `INSERT INTO \`weigh_slips\` (
  \`slip_number\`, \`session_id\`, \`vehicle_reg_no\`, \`vehicle_no\`, \`date_time\`,
  \`tare_weight\`, \`gross_weight\`, \`net_weight\`, \`nett_weight\`, \`material\`,
  \`product\`, \`driver_name\`, \`destination\`, \`operator_name\`, \`admin_name\`,
  \`evidence\`, \`created_at\`, \`transaction_no\`, \`party_name\`, \`firm_name\`,
  \`first_weight\`, \`first_weight_date\`, \`first_weight_time\`, \`second_weight\`,
  \`second_weight_date\`, \`second_weight_time\`, \`rate\`, \`final_rate\`, \`moisture\`,
  \`deduction\`, \`charges\`, \`vehicle_type\`, \`bags_bales\`, \`agent\`,
  \`village\`, \`chess_no\`, \`chess_amount\`, \`chess_name\`, \`total_amount\`,
  \`print_options\`, \`company_name\`, \`company_address\`, \`phone_no\`, \`load_slip_no\`,
  \`cultivator_name\`, \`father_name\`, \`mobile_no\`, \`status\`, \`location_name\`
) VALUES \n`;

    const rowSqls = chunk.map(r => `  (${[
      escapeSql(r.slip_number), escapeSql(r.session_id), escapeSql(r.vehicle_reg_no), escapeSql(r.vehicle_no), escapeSql(r.date_time),
      r.tare_weight, r.gross_weight, r.net_weight, r.nett_weight, escapeSql(r.material),
      escapeSql(r.product), escapeSql(r.driver_name), escapeSql(r.destination), escapeSql(r.operator_name), escapeSql(r.admin_name),
      escapeSql(r.evidence), escapeSql(r.created_at), r.transaction_no, escapeSql(r.party_name), escapeSql(r.firm_name),
      r.first_weight, escapeSql(r.first_weight_date), escapeSql(r.first_weight_time), r.second_weight,
      escapeSql(r.second_weight_date), escapeSql(r.second_weight_time), r.rate, r.final_rate, r.moisture,
      r.deduction, r.charges, escapeSql(r.vehicle_type), escapeSql(r.bags_bales), escapeSql(r.agent),
      escapeSql(r.village), escapeSql(r.chess_no), r.chess_amount, escapeSql(r.chess_name), r.total_amount,
      escapeSql(r.print_options), escapeSql(r.company_name), escapeSql(r.company_address), escapeSql(r.phone_no), escapeSql(r.load_slip_no),
      escapeSql(r.cultivator_name), escapeSql(r.father_name), escapeSql(r.mobile_no), escapeSql(r.status), escapeSql(r.location_name)
    ].join(', ')})`);

    sqlInserts += rowSqls.join(',\n') + ';\n\n';
  }

  const sqlFooter = `SET FOREIGN_KEY_CHECKS = 1;
-- End of Batch 2 Insert Script
`;

  fs.writeFileSync(SQL_FILE_PATH, sqlHeader + sqlInserts + sqlFooter, 'utf8');
  console.log(`✅ Saved ${countToInsert} record SQL file: ${SQL_FILE_PATH} (${(fs.statSync(SQL_FILE_PATH).size / 1024).toFixed(1)} KB).\n`);

  // 4. Also insert into weighbridge_sessions and weigh_slips for complete application parity
  console.log('Inserting 500 records into weigh_slips & weighbridge_sessions in MySQL...');
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');

  // Insert in batches of 50
  const insertBatchSize = 50;
  for (let i = 0; i < records.length; i += insertBatchSize) {
    const chunk = records.slice(i, i + insertBatchSize);

    // 4a. Insert into weigh_slips
    const slipValues = chunk.map(r => [
      r.slip_number, r.session_id, r.vehicle_reg_no, r.vehicle_no, r.date_time,
      r.tare_weight, r.gross_weight, r.net_weight, r.nett_weight, r.material,
      r.product, r.driver_name, r.destination, r.operator_name, r.admin_name,
      r.evidence, r.created_at, r.transaction_no, r.party_name, r.firm_name,
      r.first_weight, r.first_weight_date, r.first_weight_time, r.second_weight,
      r.second_weight_date, r.second_weight_time, r.rate, r.final_rate, r.moisture,
      r.deduction, r.charges, r.vehicle_type, r.bags_bales, r.agent,
      r.village, r.chess_no, r.chess_amount, r.chess_name, r.total_amount,
      r.print_options, r.company_name, r.company_address, r.phone_no, r.load_slip_no,
      r.cultivator_name, r.father_name, r.mobile_no, r.status, r.location_name
    ]);

    const slipSql = `INSERT INTO \`weigh_slips\` (
      \`slip_number\`, \`session_id\`, \`vehicle_reg_no\`, \`vehicle_no\`, \`date_time\`,
      \`tare_weight\`, \`gross_weight\`, \`net_weight\`, \`nett_weight\`, \`material\`,
      \`product\`, \`driver_name\`, \`destination\`, \`operator_name\`, \`admin_name\`,
      \`evidence\`, \`created_at\`, \`transaction_no\`, \`party_name\`, \`firm_name\`,
      \`first_weight\`, \`first_weight_date\`, \`first_weight_time\`, \`second_weight\`,
      \`second_weight_date\`, \`second_weight_time\`, \`rate\`, \`final_rate\`, \`moisture\`,
      \`deduction\`, \`charges\`, \`vehicle_type\`, \`bags_bales\`, \`agent\`,
      \`village\`, \`chess_no\`, \`chess_amount\`, \`chess_name\`, \`total_amount\`,
      \`print_options\`, \`company_name\`, \`company_address\`, \`phone_no\`, \`load_slip_no\`,
      \`cultivator_name\`, \`father_name\`, \`mobile_no\`, \`status\`, \`location_name\`
    ) VALUES ? ON DUPLICATE KEY UPDATE transaction_no = VALUES(transaction_no)`;

    await connection.query(slipSql, [slipValues]);

    // 4b. Insert into weighbridge_sessions
    const sessionValues = chunk.map(r => [
      r.session_id, r.transaction_no, r.vehicle_reg_no, r.party_name, r.firm_name,
      r.gross_weight, r.tare_weight, r.net_weight, r.driver_name, r.product,
      r.destination, r.status, r.operator_name, r.first_weight, r.first_weight_time,
      r.second_weight, r.second_weight_time, r.rate, r.moisture, r.charges,
      r.final_rate, r.total_amount, r.vehicle_type, r.bags_bales, r.agent,
      r.village, r.chess_no, r.chess_amount, r.chess_name, r.location_name,
      r.cultivator_name, r.load_slip_no, r.father_name, r.mobile_no, r.created_at, r.created_at
    ]);

    const sessionSql = `INSERT INTO \`weighbridge_sessions\` (
      \`session_id\`, \`transaction_no\`, \`vehicle_reg_no\`, \`party_name\`, \`firm_name\`,
      \`gross_weight\`, \`tare_weight\`, \`net_weight\`, \`driver_name\`, \`material\`,
      \`destination\`, \`status\`, \`operator_name\`, \`first_weight\`, \`first_weight_time\`,
      \`second_weight\`, \`second_weight_time\`, \`rate\`, \`moisture\`, \`charges\`,
      \`final_rate\`, \`total_amount\`, \`vehicle_type\`, \`bags_bales\`, \`agent\`,
      \`village\`, \`chess_no\`, \`chess_amount\`, \`chess_name\`, \`location_name\`,
      \`cultivator_name\`, \`load_slip_no\`, \`father_name\`, \`mobile_no\`, \`created_at\`, \`updated_at\`
    ) VALUES ? ON DUPLICATE KEY UPDATE transaction_no = VALUES(transaction_no)`;

    await connection.query(sessionSql, [sessionValues]);

    console.log(`   Inserted batch: ${Math.min(i + insertBatchSize, records.length)} / ${records.length} records...`);
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 1');

  // 5. Verification Check
  const [finalCount] = await connection.query('SELECT COUNT(*) as c FROM weigh_slips');
  const [finalSessionCount] = await connection.query('SELECT COUNT(*) as c FROM weighbridge_sessions');
  const [sampleRows] = await connection.query('SELECT slip_number, transaction_no, vehicle_reg_no, party_name, net_weight, total_amount, date_time FROM weigh_slips ORDER BY transaction_no DESC LIMIT 5');

  console.log('\n========================================================================');
  console.log(' INSERTION VERIFICATION REPORT:');
  console.log('========================================================================');
  console.log(`weigh_slips count BEFORE:        ${initialCount[0].c}`);
  console.log(`weigh_slips count AFTER:         ${finalCount[0].c} (+${Number(finalCount[0].c) - Number(initialCount[0].c)} inserted)`);
  console.log(`weighbridge_sessions count:      ${finalSessionCount[0].c}`);
  console.log(`Batch 2 SQL File location:       ${SQL_FILE_PATH}`);
  console.log('\nTop 5 Latest Inserted Weigh Slips:');
  sampleRows.forEach(r => {
    console.log(`  - Slip: ${r.slip_number} | Tx: #${r.transaction_no} | Veh: ${r.vehicle_reg_no.padEnd(16)} | Party: ${r.party_name.padEnd(24)} | Net: ${r.net_weight} kg | Total: ₹${r.total_amount}`);
  });
  console.log('========================================================================\n');

  await connection.end();
}

main().catch(err => {
  console.error('Error generating and inserting weigh slips:', err);
  process.exit(1);
});
