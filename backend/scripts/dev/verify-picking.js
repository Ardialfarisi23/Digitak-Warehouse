const http = require('http');
const https = require('https');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TOKEN = process.env.TOKEN || '';
const SJ_ID = process.env.SJ_ID || '';
const MODE = process.env.MODE || 'normal';
const RECON = process.argv.includes('--recon');

function fail(msg) {
  console.error('ERROR:', msg);
  process.exit(1);
}

function info(msg) {
  console.log('[INFO]', msg);
}

if (!TOKEN) fail('TOKEN environment variable is required.');
if (!SJ_ID) fail('SJ_ID environment variable is required.');
if (!['parallel', 'override', 'normal'].includes(MODE)) fail('MODE must be: parallel, override, or normal.');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

(async () => {
  try {
    info(`MODE: ${MODE}, SJ_ID: ${SJ_ID}, BASE_URL: ${BASE_URL}`);
    info('Tidak mencetak token.');

    const sj = await prisma.surat_jalan.findUnique({
      where: { surat_jalan_id: BigInt(SJ_ID) },
      include: { items: true },
    });

    if (!sj) {
      fail(`Surat jalan ${SJ_ID} tidak ditemukan.`);
    }

    if (sj.tipe !== 'outbound') {
      fail('SJ harus berjenis outbound.');
    }

    const item = sj.items[0];
    if (!item) {
      fail('SJ tidak punya item.');
    }

    const stock = await prisma.stok_gudang.findFirst({
      where: {
        gudang_id: sj.gudang_asal_id,
        barang_id: item.barang_id,
        kondisi: item.kondisi || 'baik',
        project_id: sj.project_id,
      },
    });

    if (!stock) {
      fail(`Stok untuk barang ${item.barang_id} kondisi ${item.kondisi || 'baik'} tidak ditemukan.`);
    }

    const initialStock = Number(stock.qty || 0);
    info(`SJ: ${sj.nomor_surat_jalan}, Barang: ${item.barang_id}, Qty: ${item.qty}, Stok awal: ${initialStock}`);

    if (MODE === 'parallel') {
      info('Mengirim 2 request retrieve paralel...');
      const payload = {
        items: [
          {
            item_id: Number(item.item_id),
            qty: Number(item.qty),
            zona_id: Number(stock.zona_id),
            kondisi: item.kondisi || 'baik',
          },
        ],
      };

      const [res1, res2] = await Promise.all([
        request('POST', `/api/surat-jalan/${SJ_ID}/retrieve`, payload),
        request('POST', `/api/surat-jalan/${SJ_ID}/retrieve`, payload),
      ]);

      info(`Request 1: ${res1.status} - ${JSON.stringify(res1.body)}`);
      info(`Request 2: ${res2.status} - ${JSON.stringify(res2.body)}`);

      const success1 = res1.status === 200 && res1.body.success;
      const success2 = res2.status === 200 && res2.body.success;
      const alreadyPicked1 = res1.body.code === 'ALREADY_PICKED';
      const alreadyPicked2 = res2.body.code === 'ALREADY_PICKED';

      let pass = true;
      let reasons = [];

      if (!(success1 ^ success2)) {
        pass = false;
        reasons.push('Harus tepat satu request sukses.');
      }

      if (!((alreadyPicked1 && !success1) || (alreadyPicked2 && !success2))) {
        pass = false;
        reasons.push('Harus ada satu ALREADY_PICKED.');
      }

      const picks = await prisma.surat_jalan_item_pick.findMany({
        where: { surat_jalan_item_id: Number(item.item_id) },
      });

      info(`Pick rows: ${picks.length}`);
      if (picks.length !== 1) {
        pass = false;
        reasons.push(`Harus ada tepat 1 pick row, ditemukan ${picks.length}.`);
      }

      const ledgers = await prisma.stok_ledger.findMany({
        where: { surat_jalan_item_id: Number(item.item_id) },
      });

      info(`Ledger rows: ${ledgers.length}`);
      if (ledgers.length !== 1) {
        pass = false;
        reasons.push(`Harus ada tepat 1 ledger row, ditemukan ${ledgers.length}.`);
      }

      const updatedStock = await prisma.stok_gudang.findFirst({
        where: { stok_id: stock.stok_id },
      });

      const finalStock = Number(updatedStock?.qty || 0);
      const expectedStock = initialStock - Number(item.qty || 0);
      info(`Stok awal: ${initialStock}, akhir: ${finalStock}, expected: ${expectedStock}`);
      if (finalStock !== expectedStock) {
        pass = false;
        reasons.push(`Stok tidak sesuai. Expected ${expectedStock}, got ${finalStock}.`);
      }

      if (pass) {
        info('PASS: Parallel retrieve berhasil.');
      } else {
        info('FAIL: ' + reasons.join(' '));
        process.exit(1);
      }
    } else if (MODE === 'override') {
      info('Mengirim retrieve dengan override...');
      const overrideKondisi = 'rusak_ringan';
      const payload = {
        items: [
          {
            item_id: Number(item.item_id),
            qty: Number(item.qty),
            zona_id: Number(stock.zona_id),
            kondisi: overrideKondisi,
            catatan_kondisi: 'TEST override: stok Baik habis.',
          },
        ],
      };

      const res = await request('POST', `/api/surat-jalan/${SJ_ID}/retrieve`, payload);
      info(`Response: ${res.status} - ${JSON.stringify(res.body)}`);

      let pass = res.status === 200 && res.body.success;
      let reasons = [];

      if (!pass) {
        reasons.push('Request harus sukses (200).');
      }

      const picks = await prisma.surat_jalan_item_pick.findMany({
        where: { surat_jalan_item_id: Number(item.item_id) },
      });

      const pick = picks[0];
      if (!pick) {
        pass = false;
        reasons.push('Pick row tidak ditemukan.');
      } else {
        info(`Pick: kondisi_diminta=${pick.kondisi_diminta}, kondisi_diambil=${pick.kondisi_diambil}, is_override=${pick.is_override}, catatan=${pick.catatan_override}`);
        if (pick.kondisi_diminta !== (item.kondisi || 'baik')) {
          pass = false;
          reasons.push('kondisi_diminta tidak sesuai.');
        }
        if (pick.kondisi_diambil !== overrideKondisi) {
          pass = false;
          reasons.push('kondisi_diambil tidak sesuai.');
        }
        if (!pick.is_override) {
          pass = false;
          reasons.push('is_override harus true.');
        }
        if (!pick.catatan_override) {
          pass = false;
          reasons.push('catatan_override harus terisi.');
        }
      }

      const overrideStock = await prisma.stok_gudang.findFirst({
        where: {
          gudang_id: sj.gudang_asal_id,
          barang_id: item.barang_id,
          kondisi: overrideKondisi,
          project_id: sj.project_id,
          zona_id: stock.zona_id,
        },
      });

      const overrideQty = Number(overrideStock?.qty || 0);
      const expectedOverride = Math.max(0, initialStock - Number(item.qty || 0));
      info(`Stok override awal: ${initialStock}, akhir: ${overrideQty}, expected: ${expectedOverride}`);
      if (overrideQty !== expectedOverride) {
        pass = false;
        reasons.push(`Stok override tidak sesuai. Expected ${expectedOverride}, got ${overrideQty}.`);
      }

      if (pass) {
        info('PASS: Override retrieve berhasil.');
      } else {
        info('FAIL: ' + reasons.join(' '));
        process.exit(1);
      }
    } else {
      info('Mengirim retrieve normal...');
      const payload = {
        items: [
          {
            item_id: Number(item.item_id),
            qty: Number(item.qty),
            zona_id: Number(stock.zona_id),
            kondisi: item.kondisi || 'baik',
          },
        ],
      };

      const res = await request('POST', `/api/surat-jalan/${SJ_ID}/retrieve`, payload);
      info(`Response: ${res.status} - ${JSON.stringify(res.body)}`);

      let pass = res.status === 200 && res.body.success;
      let reasons = [];

      if (!pass) {
        reasons.push('Request harus sukses (200).');
      }

      const picks = await prisma.surat_jalan_item_pick.findMany({
        where: { surat_jalan_item_id: Number(item.item_id) },
      });

      const pick = picks[0];
      if (!pick) {
        pass = false;
        reasons.push('Pick row tidak ditemukan.');
      } else {
        info(`Pick: is_override=${pick.is_override}, qty=${pick.qty}`);
        if (pick.is_override) {
          pass = false;
          reasons.push('is_override harus false.');
        }
        if (Number(pick.qty) !== Number(item.qty)) {
          pass = false;
          reasons.push('Pick qty tidak sesuai.');
        }
      }

      const updatedStock = await prisma.stok_gudang.findFirst({
        where: { stok_id: stock.stok_id },
      });

      const finalStock = Number(updatedStock?.qty || 0);
      const expectedStock = initialStock - Number(item.qty || 0);
      info(`Stok awal: ${initialStock}, akhir: ${finalStock}, expected: ${expectedStock}`);
      if (finalStock !== expectedStock) {
        pass = false;
        reasons.push(`Stok tidak sesuai. Expected ${expectedStock}, got ${finalStock}.`);
      }

      if (pass) {
        info('PASS: Normal retrieve berhasil.');
      } else {
        info('FAIL: ' + reasons.join(' '));
        process.exit(1);
      }
    }

    if (RECON) {
      info('Mengambil data rekonsiliasi...');
      const reconRes = await request('GET', '/api/reconciliation/inventory');
      if (reconRes.status === 200 && reconRes.body.success) {
        const rows = reconRes.body.data?.data || [];
        const pickRow = rows.find(r => {
          const key = `${r.project_id}-${r.barang_id}`;
          const sjItem = sj.items.find(i => String(i.barang_id) === String(r.barang_id));
          return sjItem && `${Number(sj.project_id)}-${String(sjItem.barang_id)}` === key;
        });

        if (pickRow) {
          info(`Rekonsiliasi untuk barang ${pickRow.barang_id}:`);
          info(`  pick_source: ${pickRow.pick_source}`);
          info(`  qty_picked_total: ${pickRow.qty_picked_total}`);
          info(`  pick_breakdown: ${JSON.stringify(pickRow.pick_breakdown)}`);
          info(`  qty_override_total: ${pickRow.qty_override_total}`);
          info(`  pick_mismatch: ${pickRow.pick_mismatch}`);
        } else {
          info('Barang tidak ditemukan di rekonsiliasi (mungkin tidak ada BOQ).');
        }
      } else {
        info('Gagal mengambil rekonsiliasi: ' + JSON.stringify(reconRes.body));
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
