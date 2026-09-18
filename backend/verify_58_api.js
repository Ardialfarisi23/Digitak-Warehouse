const http = require('http');
const BASE = 'http://localhost:5000';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbl9nZW5lcmFsIiwiYXZhdGFyX3VybCI6bnVsbCwiaWF0IjoxNzg5NzU2NDA3LCJleHAiOjE3ODk4NDI4MDd9.4EBCXZzgGZ4JXNkkETqKy-8YSm4Y07T3zvNkGXa8Sho';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  try {
    console.log('=== GET /api/items?limit=100 ===');
    const list = await request('GET', '/api/items?limit=100');
    console.log('Status:', list.status);
    const items = list.body?.data?.data || [];
    const target = items.find(i => Number(i.barang_id) === 58);
    console.log('barang_id=58 from list:', target ? JSON.stringify(target, null, 2) : 'NOT FOUND');

    console.log('\n=== GET /api/items/ PRK-SVR-001 ===');
    const detail = await request('GET', '/api/items/%20PRK-SVR-001');
    console.log('Status:', detail.status);
    console.log('Body:', JSON.stringify(detail.body, null, 2));
  } catch (e) {
    console.error('ERROR:', e);
  }
}

run();
