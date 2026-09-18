const http = require('http');
const BASE = 'http://localhost:5000';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbl9nZW5lcmFsIiwiYXZhdGFyX3VybCI6bnVsbCwiaWF0IjoxNzg5NzQxOTI2LCJleHAiOjE3ODk4MjgzMjZ9.PN379xYmboWfSCpWgAD8Qgvwh61xjQnnst4e3K3qbOc';

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
    const payload = {
      kode_perangkat: 'TEST-DUP-001',
      nama_barang: 'Barang Test Duplikat',
      kategori_id: 1,
      satuan_default_id: 1,
    };

    console.log('--- Request 1 (create) ---');
    const r1 = await request('POST', '/api/items', payload);
    console.log('Status:', r1.status);
    console.log('Body:', JSON.stringify(r1.body, null, 2));

    console.log('\n--- Request 2 (create exact same code) ---');
    const r2 = await request('POST', '/api/items', payload);
    console.log('Status:', r2.status);
    console.log('Body:', JSON.stringify(r2.body, null, 2));

    console.log('\n--- Request 3 (create with different case) ---');
    const r3 = await request('POST', '/api/items', { ...payload, kode_perangkat: 'test-dup-001' });
    console.log('Status:', r3.status);
    console.log('Body:', JSON.stringify(r3.body, null, 2));

    console.log('\n--- Request 4 (create with leading/trailing space) ---');
    const r4 = await request('POST', '/api/items', { ...payload, kode_perangkat: ' TEST-DUP-001 ' });
    console.log('Status:', r4.status);
    console.log('Body:', JSON.stringify(r4.body, null, 2));

  } catch (e) {
    console.error('ERROR:', e);
  }
}

run();
