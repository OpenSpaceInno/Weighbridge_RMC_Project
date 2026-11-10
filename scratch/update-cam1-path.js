import mysql from 'mysql2/promise';

async function update() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'RMC-SAAS'
  });

  await conn.query(
    "UPDATE device_rtsp_config SET direct_url = 'rtsp://admin:Password@123@192.168.0.100:554/ch1/main/av_stream', stream_path = '/ch1/main/av_stream' WHERE device_id = 'cam_gate_1'"
  );

  console.log('✅ Successfully updated cam_gate_1 direct_url to /ch1/main/av_stream in MySQL');
  await conn.end();
}

update().catch(console.error);
