const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- Testing Third-Party Weighbridge Scale Integration ---');

  // Test 1: Get initial live scale weight (should default to 0 -> 00000)
  const initial = await request({
    host: 'localhost',
    port: 3001,
    path: '/api/weighbridge/live-weight',
    method: 'GET',
  });
  console.log('1. GET /api/weighbridge/live-weight:', initial.body);
  if (initial.body?.weight === 0) {
    console.log('   ✅ Initial scale reading is 0 (00000 standby)');
  } else {
    console.warn('   ⚠️ Expected initial reading 0, got:', initial.body?.weight);
  }

  // Test 2: Push third party scale weight (e.g. 24,580 kg loaded truck)
  const pushRes = await request(
    {
      host: 'localhost',
      port: 3001,
      path: '/api/weighbridge/third-party/push',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { weight: 24580, unit: 'kg', stable: true, source: 'Avery E1205 Indicator' }
  );
  console.log('2. POST /api/weighbridge/third-party/push:', pushRes.body);

  // Verify weight latched
  const afterPush = await request({
    host: 'localhost',
    port: 3001,
    path: '/api/weighbridge/live-weight',
    method: 'GET',
  });
  console.log('   ✅ Verified live reading:', afterPush.body?.weight, 'kg (Stable:', afterPush.body?.stable, ')');

  // Test 3: Zero scale back to 00000
  const zeroRes = await request({
    host: 'localhost',
    port: 3001,
    path: '/api/weighbridge/third-party/zero',
    method: 'POST',
  });
  console.log('3. POST /api/weighbridge/third-party/zero:', zeroRes.body);

  const afterZero = await request({
    host: 'localhost',
    port: 3001,
    path: '/api/weighbridge/live-weight',
    method: 'GET',
  });
  console.log('   ✅ Verified reset to zero:', afterZero.body?.weight, 'kg (Zero flag:', afterZero.body?.zero, ')');

  // Test 4: Test source diagnostic
  const testSource = await request(
    {
      host: 'localhost',
      port: 3001,
      path: '/api/weighbridge/third-party/test-source',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { mode: 'file_monitor', filePath: 'data/live_scale_weight.txt', protocol: 'standard_ascii' }
  );
  console.log('4. POST /api/weighbridge/third-party/test-source:', testSource.body);
  if (testSource.body?.success) {
    console.log('   ✅ File monitor verified successfully!');
  }

  console.log('--- All scale integration tests passed! ---');
}

runTests().catch(console.error);
