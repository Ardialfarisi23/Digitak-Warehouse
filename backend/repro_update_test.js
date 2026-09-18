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
    // Create initial item
    console.log('--- Create initial item ---');
    const r0 = await request('POST', '/api/items', {
      kode_perangkat: 'UPDATE-TEST-001',
      nama_barang: 'Barang Update Test',
      kategori_id: 1,
      satuan_default_id: 1,
    });
    console.log('Status:', r0.status);
    console.log('Body:', JSON.stringify(r0.body, null, 2));

    const barangId = r0.body?.data?.barang_id;

    if (!barangId) {
      console.error('Failed to create initial item');
      return;
    }

    // Test update to different case
    console.log('\n--- Update to different case (should be rejected) ---');
    const r1 = await request('PUT', `/api/items/UPDATE-TEST-001`, {
      kode_perangkat: 'update-test-001',
    });
    console.log('Status:', r1.status);
    console.log('Body:', JSON.stringify(r1.body, null, 2));

    // Test update to same with leading space
    console.log('\n--- Update to leading/trailing space (should be rejected) ---');
    const r2 = await request('PUT', `/api/items/UPDATE-TEST-001`, {
      kode_perangkat: ' UPDATE-TEST-001 ',
    });
    console.log('Status:', r2.status);
    console.log('Body:', JSON.stringify(r2.body, null, 2));

    // Test update to exact duplicate of existing
    console.log('\n--- Update to exact duplicate of existing ---');
    const r3 = await request('POST', '/api/items', {
      kode_perangkat: 'EXACT-DUP-001',
      nama_barang: 'Barang Exact Dup',
      kategori_id: 1,
      satuan_default_id: 1,
    });
    console.log('Create first:', r3.status);

    const r3b = await request('POST', '/api/items', {
      kode_perangkat: 'EXACT-DUP-001',
      nama_barang: 'Barang Exact Dup 2',
      kategori_id: 1,
      satuan_default_id: 1,
    });
    console.log('Create duplicate exact:', r3b.status, JSON.stringify(r3b.body, null, 2));

    // Now try to UPDATE first item to same code as second
    console.log('\n--- Update first item to same code as second (should be rejected) ---');
    const r4 = await request('PUT', `/api/items/EXACT-DUP-001`, {
      kode_perangkat: 'EXACT-DUP-001',
    });
    console.log('Status:', r4.status);
    console.log('Body:', JSON.stringify(r4.body, null, 2));

  } catch (e) {
    console.error('ERROR:', e);
  }
}

run();
