import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function clean() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rmc_gate_system'
  });

  const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM anpr_events');
  console.log('Total anpr_events:', cnt[0].c);

  const [del] = await conn.execute(
    "DELETE FROM anpr_events WHERE vehicle_reg_no IN ('KA05AB1234', 'MH02CD5678', 'DL01EF9012', 'TN09GH3456', 'GJ06IJ7890') OR source LIKE '%Mock%'"
  );
  console.log('Deleted mock rows:', del.affectedRows);

  const [remaining] = await conn.execute('SELECT COUNT(*) as c FROM anpr_events');
  console.log('Remaining anpr_events:', remaining[0].c);

  await conn.end();
}

clean().catch(console.error);
