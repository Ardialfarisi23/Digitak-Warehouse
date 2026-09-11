const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function serialize(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? Number(value) : value), 2)
  );
}

function apiRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  try {
    // Step 1: Login as admin
    console.log('=== STEP 1: Login ===');
    const loginRes = await apiRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: 'admin@gmail.com', password: '123456' });
    
    console.log('Login status:', loginRes.status);
    const token = loginRes.body?.data?.token || loginRes.body?.token;
    if (!token) {
      console.error('Login failed:', JSON.stringify(loginRes.body, null, 2));
      return;
    }
    console.log('Token obtained:', token.substring(0, 20) + '...');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // Step 2: GET current BOQ data
    console.log('\n=== STEP 2: GET BOQ 10 ===');
    const getRes = await apiRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/boqs/10',
      method: 'GET',
      headers: authHeaders,
    });
    console.log('GET status:', getRes.status);
    const currentBoq = getRes.body?.data || getRes.body;
    console.log('Current BOQ:', JSON.stringify({
      boq_id: currentBoq?.id || currentBoq?.boq_id,
      boq_number: currentBoq?.boqNumber || currentBoq?.boq_number,
      emailReference: currentBoq?.emailReference,
      status: currentBoq?.status,
      source: currentBoq?.source,
    }, null, 2));

    // Step 3: PUT update emailReference
    console.log('\n=== STEP 3: PUT update emailReference ===');
    const putRes = await apiRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/boqs/10',
      method: 'PUT',
      headers: authHeaders,
    }, {
      emailReference: 'TEST-EMAIL-REF-VALIDASI',
    });
    console.log('PUT status:', putRes.status);
    console.log('PUT response:', JSON.stringify(putRes.body, null, 2));

    // Step 4: SELECT verify
    console.log('\n=== STEP 4: SELECT verify ===');
    const verify1 = await prisma.$queryRaw`
      SELECT boq_id, email_reference 
      FROM boq 
      WHERE boq_id = 10;
    `;
    console.log('After update:', JSON.stringify(serialize(verify1), null, 2));

    // Step 5: Reset to NULL
    console.log('\n=== STEP 5: Reset emailReference to NULL ===');
    const resetRes = await apiRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/boqs/10',
      method: 'PUT',
      headers: authHeaders,
    }, {
      emailReference: null,
    });
    console.log('Reset status:', resetRes.status);
    console.log('Reset response:', JSON.stringify(resetRes.body, null, 2));

    // Step 6: SELECT verify reset
    console.log('\n=== STEP 6: SELECT verify reset ===');
    const verify2 = await prisma.$queryRaw`
      SELECT boq_id, email_reference 
      FROM boq 
      WHERE boq_id = 10;
    `;
    console.log('After reset:', JSON.stringify(serialize(verify2), null, 2));

  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
})();
