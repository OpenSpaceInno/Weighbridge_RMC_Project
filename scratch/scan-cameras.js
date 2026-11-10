const net = require('net');
const http = require('http');

console.log('--- Scanning 192.168.0.x for RTSP (554) and HTTP (80) ---');

const checkPort = (ip, port, timeout = 800) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeout);
    socket.on('connect', () => {
      status = true;
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, ip);
  });
};

async function scan() {
  const targets = [];
  for (let i = 1; i <= 254; i++) {
    targets.push(`192.168.0.${i}`);
  }

  console.log('Testing specific cameras first...');
  const cam1_554 = await checkPort('192.168.0.100', 554, 2000);
  const cam1_80 = await checkPort('192.168.0.100', 80, 2000);
  const cam2_554 = await checkPort('192.168.0.99', 554, 2000);
  const cam2_80 = await checkPort('192.168.0.99', 80, 2000);

  console.log(`192.168.0.100 -> Port 554: ${cam1_554}, Port 80: ${cam1_80}`);
  console.log(`192.168.0.99  -> Port 554: ${cam2_554}, Port 80: ${cam2_80}`);

  if (!cam1_554 && !cam2_554) {
    console.log('Scanning entire 192.168.0.x for port 554 (RTSP)...');
    const batchSize = 30;
    for (let i = 0; i < targets.length; i += batchSize) {
      const chunk = targets.slice(i, i + batchSize);
      await Promise.all(chunk.map(async (ip) => {
        const rtsp = await checkPort(ip, 554, 500);
        if (rtsp) console.log(`>>> FOUND RTSP 554 ON: ${ip}`);
        const web = await checkPort(ip, 80, 500);
        if (web) console.log(`>>> FOUND HTTP 80 ON: ${ip}`);
      }));
    }
  }
}

scan().catch(console.error);
