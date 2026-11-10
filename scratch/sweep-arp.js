import { execSync } from 'child_process';
import net from 'net';

console.log('Sweeping 192.168.0.1 - 192.168.0.254 to populate ARP table...');

// Rapid socket test / ping
const checkPort = (ip, port, timeout = 300) => new Promise(res => {
  const s = new net.Socket();
  s.setTimeout(timeout);
  s.on('connect', () => { s.destroy(); res(true); });
  s.on('timeout', () => { s.destroy(); res(false); });
  s.on('error', () => { s.destroy(); res(false); });
  s.connect(port, ip);
});

async function sweep() {
  const ips = [];
  for (let i = 1; i <= 254; i++) {
    ips.push(`192.168.0.${i}`);
  }

  // Probe all IPs on port 80 and 554
  const batchSize = 35;
  for (let i = 0; i < ips.length; i += batchSize) {
    const chunk = ips.slice(i, i + batchSize);
    await Promise.all(chunk.map(async ip => {
      const p554 = await checkPort(ip, 554);
      if (p554) console.log(`>>> RTSP PORT 554 OPEN ON: ${ip}`);
      const p80 = await checkPort(ip, 80);
      if (p80 && ip !== '192.168.0.1') console.log(`>>> HTTP PORT 80 OPEN ON: ${ip}`);
      const p8000 = await checkPort(ip, 8000);
      if (p8000) console.log(`>>> MEDIA PORT 8000 OPEN ON: ${ip}`);
    }));
  }

  // Now dump ARP
  try {
    const arp = execSync('arp -a').toString();
    console.log('\n--- ARP TABLE ---');
    const lines = arp.split('\n').filter(l => l.includes('192.168.0.'));
    lines.forEach(l => console.log(l.trim()));
  } catch (e) {
    console.error(e);
  }
}

sweep().catch(console.error);
