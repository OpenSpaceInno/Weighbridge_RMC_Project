process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = 'Admin@123';
process.env.DB_NAME = 'RMC-SAAS';

const { pool } = await import('../server/db.js');

async function update() {
  try {
    await pool.query(`
      UPDATE camera_devices 
      SET name = 'ANPR Camera (192.168.0.100)', 
          ip_address = '192.168.0.100',
          status = 'online',
          location = 'entry'
      WHERE device_id = 'cam_gate_1'
    `);

    await pool.query(`
      UPDATE camera_devices 
      SET name = 'IP Camera (192.168.0.99)', 
          ip_address = '192.168.0.99',
          status = 'online',
          location = 'entry'
      WHERE device_id = 'cam_gate_2'
    `);

    await pool.query(`
      UPDATE device_rtsp_config
      SET enabled = 1,
          direct_url = 'rtsp://admin:Password@123@192.168.0.100:554/Streaming/Channels/101',
          use_direct_url = 1,
          hls_proxy_url = 'http://localhost:8888/cam1/index.m3u8',
          username = 'admin',
          password = 'Password@123',
          stream_path = '/Streaming/Channels/101'
      WHERE device_id = 'cam_gate_1'
    `);

    await pool.query(`
      INSERT INTO device_rtsp_config (device_id, enabled, direct_url, use_direct_url, port, username, password, stream_path, hls_proxy_url)
      VALUES ('cam_gate_2', 1, 'rtsp://admin:Password@123@192.168.0.99:554/Streaming/Channels/101', 1, 554, 'admin', 'Password@123', '/Streaming/Channels/101', 'http://localhost:8888/cam2/index.m3u8')
      ON DUPLICATE KEY UPDATE
        enabled = 1,
        direct_url = 'rtsp://admin:Password@123@192.168.0.99:554/Streaming/Channels/101',
        use_direct_url = 1,
        hls_proxy_url = 'http://localhost:8888/cam2/index.m3u8',
        username = 'admin',
        password = 'Password@123',
        stream_path = '/Streaming/Channels/101'
    `);

    console.log('✅ MySQL cameras and RTSP configs updated successfully');

    const [cameras] = await pool.query('SELECT * FROM camera_devices');
    console.log('Current Cameras:', cameras);

    const [rtsp] = await pool.query('SELECT device_id, direct_url, hls_proxy_url FROM device_rtsp_config');
    console.log('Current RTSP configs:', rtsp);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

update();
