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
    // First, create a test item that we'll try to delete while it has relations
    console.log('=== Creating test item for blocked delete ===');
    const createRes = await request('POST', '/api/items', {
      kode_perangkat: 'DELETE-BLOCKED-001',
      nama_barang: 'Test Blocked Delete',
      kategori_id: 1,
      satuan_default_id: 1,
    });
    console.log('Create status:', createRes.status);
    const testItemId = createRes.body?.data?.barang_id;
    console.log('Created item ID:', testItemId);

    if (!testItemId) {
      console.error('Failed to create test item');
      return;
    }

    // Create a BOQ item referencing this test item
    console.log('\n=== Creating BOQ with item referencing test item ===');
    const boqRes = await request('POST', '/api/boqs', {
      projectId: '1',
      area: 'Test Area',
      ticketNumber: 'TEST-BOQ-DELETE',
      notes: 'Test BOQ for delete blocking',
      items: [
        {
          itemCode: 'DELETE-BLOCKED-001',
          itemName: 'Test Blocked Delete',
          quantity: 10,
          unit: 'pcs',
        }
      ]
    });
    console.log('BOQ create status:', boqRes.status);
    console.log('BOQ create body:', JSON.stringify(boqRes.body, null, 2));

    const boqId = boqRes.body?.data?.boq_id;
    console.log('Created BOQ ID:', boqId);

    // Now try to delete the test item - should be blocked
    console.log('\n=== Attempting to delete item with BOQ relations ===');
    const delRes = await request('DELETE', `/api/items/${testItemId}`);
    console.log('Delete status:', delRes.status);
    console.log('Delete body:', JSON.stringify(delRes.body, null, 2));

    // Verify item still exists
    console.log('\n=== Verify item still exists after blocked delete ===');
    const verify = await request('GET', `/api/items/${testItemId}`);
    console.log('GET status:', verify.status);
    console.log('GET body:', JSON.stringify(verify.body, null, 2));

    // Clean up - delete the BOQ first
    if (boqId) {
      console.log('\n=== Cleaning up test BOQ ===');
      const delBoq = await request('DELETE', `/api/boqs/${boqId}`);
      console.log('Delete BOQ status:', delBoq.status);
      console.log('Delete BOQ body:', JSON.stringify(delBoq.body, null, 2));
    }

    // Now delete the item again - should succeed
    console.log('\n=== Delete item after removing relations ===');
    const delRes2 = await request('DELETE', `/api/items/${testItemId}`);
    console.log('Delete status:', delRes2.status);
    console.log('Delete body:', JSON.stringify(delRes2.body, null, 2));

  } catch (e) {
    console.error('ERROR:', e);
  }
}

run();
