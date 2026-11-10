const mysql = require('mysql2/promise');

async function updateDb() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Admin@123', database: 'RMC-SAAS' });

  // Update camera_devices
  await pool.query(`
    UPDATE camera_devices 
    SET ip_address = '192.168.0.101', 
        name = 'ANPR Camera (192.168.0.101)' 
    WHERE device_id = 'cam_gate_1'
  `);

  // Update device_rtsp_config
  await pool.query(`
    UPDATE device_rtsp_config 
    SET direct_url = 'rtsp://admin:Password@123@192.168.0.101:554/ch1/main/av_stream',
        hls_proxy_url = 'http://localhost:8888/cam1/index.m3u8'
    WHERE device_id = 'cam_gate_1'
  `);

  console.log('✅ MySQL database updated with 192.168.0.101 for cam_gate_1');

  const [rows] = await pool.query('SELECT device_id, name, ip_address FROM camera_devices');
  console.log('Current camera_devices:', rows);

  const [rtsp] = await pool.query('SELECT device_id, direct_url, hls_proxy_url FROM device_rtsp_config');
  console.log('Current device_rtsp_config:', rtsp);

  await pool.end();
}

updateDb().catch(console.error);

