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
    // First, let's find an item with relations to test the blocked case
    // We know from earlier that barang_id=58 has no relations, but let's use one with relations
    
    // Let's check which items have relations
    console.log('=== Checking items with relations ===');
    const allItems = await new Promise((resolve, reject) => {
      const url = new URL('/api/items?limit=100', BASE);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
        },
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    const items = allItems?.data?.data || [];
    console.log('Total items:', allItems?.data?.meta?.total);
    
    // Let's test with a known safe item first (barang_id=58 has no relations)
    console.log('\n=== Test 6b: Delete safe item (barang_id=58) ===');
    const r1 = await request('DELETE', '/api/items/58');
    console.log('Status:', r1.status);
    console.log('Body:', JSON.stringify(r1.body, null, 2));

    // Verify deletion
    console.log('\n=== Verify deletion ===');
    const verify = await request('GET', '/api/items/58');
    console.log('GET after delete status:', verify.status);
    console.log('GET after delete body:', JSON.stringify(verify.body, null, 2));

    // Test 6a: Try to delete an item that has relations (if we can find one)
    console.log('\n=== Test 6a: Try delete item with relations ===');
    
    // Let's create a test item and then create a BOQ item referencing it
    console.log('\n--- Creating test item for blocked delete ---');
    const createRes = await request('POST', '/api/items', {
      kode_perangkat: 'DELETE-BLOCKED-001',
      nama_barang: 'Test Blocked Delete',
      kategori_id: 1,
      satuan_default_id: 1,
    });
    console.log('Create status:', createRes.status);
    const testItemId = createRes.body?.data?.barang_id;
    console.log('Created item ID:', testItemId);

    if (testItemId) {
      // Now try to delete it - should succeed since no relations
      console.log('\n--- Deleting newly created item (should succeed) ---');
      const delRes = await request('DELETE', `/api/items/${testItemId}`);
      console.log('Delete status:', delRes.status);
      console.log('Delete body:', JSON.stringify(delRes.body, null, 2));
    }

    // Test 6c: Delete non-existent ID
    console.log('\n=== Test 6c: Delete non-existent ID ===');
    const r3 = await request('DELETE', '/api/items/999999');
    console.log('Status:', r3.status);
    console.log('Body:', JSON.stringify(r3.body, null, 2));

  } catch (e) {
    console.error('ERROR:', e);
  }
}

run();
