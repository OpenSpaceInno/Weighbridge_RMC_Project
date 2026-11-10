const mysql = require('mysql2/promise');

async function check() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Admin@123', database: 'RMC-SAAS' });
  const [cameras] = await pool.query('SELECT * FROM camera_devices');
  console.log('--- camera_devices ---');
  console.log(JSON.stringify(cameras, null, 2));

  const [rtsp] = await pool.query('SELECT * FROM device_rtsp_config');
  console.log('--- device_rtsp_config ---');
  console.log(JSON.stringify(rtsp, null, 2));

  await pool.end();
}

check().catch(console.error);
