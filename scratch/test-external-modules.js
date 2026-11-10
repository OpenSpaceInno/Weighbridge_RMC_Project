import http from 'http';

const FRONTEND_URL = 'http://localhost:8080';
const BACKEND_URL = 'http://localhost:3001';

const routesToTest = [
  { name: 'Customer Portal', url: `${FRONTEND_URL}/customer-portal` },
  { name: 'Billing & Invoicing', url: `${FRONTEND_URL}/billing` },
  { name: 'Inventory Management', url: `${FRONTEND_URL}/inventory` },
  { name: 'Reports & Exports', url: `${FRONTEND_URL}/reports` },
  { name: 'Device Configuration', url: `${FRONTEND_URL}/device-config` },
];

const apiEndpointsToTest = [
  { name: 'Backend Health', url: `${BACKEND_URL}/api/health`, method: 'GET' },
  { name: 'Get Cameras', url: `${BACKEND_URL}/api/cameras`, method: 'GET' },
  { name: 'Get Camera cam_gate_1', url: `${BACKEND_URL}/api/cameras/cam_gate_1`, method: 'GET' },
  { name: 'Get RTSP Config', url: `${BACKEND_URL}/api/rtsp-config/cam_gate_1`, method: 'GET' },
  { name: 'ANPR Webhook Test', url: `${BACKEND_URL}/api/anpr/webhook-test/cam_gate_1`, method: 'POST', body: { test: true } },
];

async function testUrl(target) {
  return new Promise((resolve) => {
    const parsed = new URL(target.url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: target.method || 'GET',
      headers: {
        'Accept': 'text/html,application/json,*/*',
        'Content-Type': 'application/json',
      },
      timeout: 4000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          name: target.name,
          url: target.url,
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 400,
          length: data.length,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name: target.name,
        url: target.url,
        status: 'ERROR',
        ok: false,
        error: err.message,
      });
    });

    if (target.body) {
      req.write(JSON.stringify(target.body));
    }
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('   TESTING EXTERNAL MODULES & BACKEND SERVICES     ');
  console.log('====================================================\n');

  console.log('--- Frontend SPA Routes (Port 8080) ---');
  for (const route of routesToTest) {
    const res = await testUrl(route);
    const icon = res.ok ? '✅' : '❌';
    console.log(`${icon} [${res.status}] ${res.name.padEnd(25)} -> ${res.url}`);
  }

  console.log('\n--- Express API Endpoints (Port 3001) ---');
  for (const api of apiEndpointsToTest) {
    const res = await testUrl(api);
    const icon = res.ok ? '✅' : '❌';
    console.log(`${icon} [${res.status}] ${res.name.padEnd(25)} -> ${api.method} ${res.url}`);
  }

  console.log('\n====================================================');
  console.log('   ALL CHECKS COMPLETE                              ');
  console.log('====================================================');
}

run();
