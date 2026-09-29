const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const RESTORE = process.argv.includes('--restore');
const FORCE_NEW = process.argv.includes('--force-new');

function toJson(value) {
  if (typeof value === 'bigint') return value.toString();
  if (value && typeof value === 'object' && typeof value.toJSON === 'function') return value.toJSON();
  if (Array.isArray(value)) return value.map(toJson);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toJson(v)]));
  return value;
}

function fail(msg) {
  console.error('ERROR:', msg);
  process.exit(1);
}

function info(msg) {
  console.log('[INFO]', msg);
}

function guard() {
  if (process.env.NODE_ENV === 'production') {
    fail('Script hanya boleh dijalankan di dev/staging, bukan production.');
  }

  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
    fail('Script hanya boleh dijalankan jika DATABASE_URL menunjuk ke localhost/127.0.0.1.');
  }
}

guard();

if (RESTORE) {
  info('Restore mode: akan mengembalikan stok ke snapshot dan menghapus data TEST-.');
}

async function plan() {
  info('=== PLAN MODE (read-only) ===');
  info('Mencari project dan gudang...');
  const project = await prisma.project.findFirst({
    where: { status_aktif: true },
    include: {
      tiket_materials: {
        include: {
          boq: {
            include: {
              items: {
                include: {
                  barang: true,
                  satuan: true,
                  gudang_tujuan: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    fail('Tidak ada project aktif dengan BOQ top_down.');
  }

  const allBoqItems = [];
  for (const tiket of project.tiket_materials || []) {
    const boq = tiket.boq;
    if (!boq) continue;
    for (const bi of boq.items || []) {
      allBoqItems.push(bi);
    }
  }

  if (allBoqItems.length === 0) {
    fail('Project tidak punya BOQ item.');
  }

  const gudang = await prisma.gudang.findFirst({
    where: { is_aktif: true },
    include: { zonas: true },
  });

  if (!gudang) {
    fail('Tidak ada gudang aktif.');
  }

  const zona = gudang.zonas[0];
  if (!zona) {
    fail('Gudang tidak punya zona.');
  }

  info(`Project: ${project.nama_project} (${project.project_id})`);
  info(`Gudang: ${gudang.nama_gudang} (${gudang.gudang_id}), Zona: ${zona.nama_zona} (${zona.zona_id})`);

  const pickableBoqItems = allBoqItems.filter(bi => bi.barang);
  if (pickableBoqItems.length < 3) {
    fail('Butuh minimal 3 barang di BOQ project untuk membuat 3 SJ.');
  }

  const selectedItems = pickableBoqItems.slice(0, 3);

  const existingTestSj = await prisma.surat_jalan.count({
    where: { nomor_surat_jalan: { startsWith: 'TEST-' } },
  });

  if (existingTestSj > 0 && !FORCE_NEW) {
    fail(`Data TEST- sudah ada (${existingTestSj} SJ). Gunakan --force-new untuk melanjutkan.`);
  }

  info('Menyiapkan stok...');
  const stocks = [];
  const stockConfigs = [
    { barangIndex: 0, kondisi: 'baik', qty: 100 },
    { barangIndex: 1, kondisi: 'baik', qty: 0 },
    { barangIndex: 1, kondisi: 'rusak_ringan', qty: 100 },
    { barangIndex: 2, kondisi: 'baik', qty: 100 },
  ];

  for (const cfg of stockConfigs) {
    const bi = selectedItems[cfg.barangIndex];
    const existing = await prisma.stok_gudang.findFirst({
      where: {
        gudang_id: gudang.gudang_id,
        zona_id: zona.zona_id,
        barang_id: bi.barang_id,
        project_id: project.project_id,
        kondisi: cfg.kondisi,
      },
    });

    if (existing) {
      stocks.push({ stok_id: existing.stok_id, qty: cfg.qty, kondisi: cfg.kondisi, barang_id: bi.barang_id });
    } else {
      stocks.push({ stok_id: 'NEW', qty: cfg.qty, kondisi: cfg.kondisi, barang_id: bi.barang_id });
    }
  }

  info('Membuat SJ test...');
  const users = await prisma.user_account.findMany({
    where: { role: { in: ['staf_gudang', 'supervisor'] } },
    take: 5,
  });

  if (users.length < 2) {
    fail('Butuh minimal 2 user (staf_gudang + supervisor).');
  }

  const staff = users.find(u => u.role === 'staf_gudang') || users[0];

  const sjConfigs = [
    { barangIndex: 0, qty: 10, kondisi: 'baik', label: 'SJ-A' },
    { barangIndex: 1, qty: 10, kondisi: 'baik', label: 'SJ-B', overrideKondisi: 'rusak_ringan' },
    { barangIndex: 2, qty: 10, kondisi: 'baik', label: 'SJ-C' },
  ];

  const createdSjs = [];
  for (const cfg of sjConfigs) {
    const bi = selectedItems[cfg.barangIndex];
    const nomorSJ = `TEST-${cfg.label}-${Date.now()}`;

    const sj = await prisma.surat_jalan.create({
      data: {
        nomor_surat_jalan: nomorSJ,
        tipe: 'outbound',
        status: 'disetujui',
        gudang_asal_id: gudang.gudang_id,
        gudang_tujuan_id: gudang.gudang_id,
        project_id: project.project_id,
        picking_selesai: false,
        created_by: Number(staff.user_id),
        updated_by: Number(staff.user_id),
        items: {
          create: {
            barang_id: bi.barang_id,
            qty: cfg.qty,
            satuan_id: bi.satuan_id,
            kondisi: cfg.kondisi,
          },
        },
      },
      include: { items: true },
    });

    const item = sj.items[0];
    createdSjs.push({
      surat_jalan_id: Number(sj.surat_jalan_id),
      nomor_surat_jalan: nomorSJ,
      item_id: Number(item.item_id),
      barang_id: bi.barang_id,
      qty: cfg.qty,
      kondisi: cfg.kondisi,
      picked_kondisi: cfg.overrideKondisi || cfg.kondisi,
      is_override: Boolean(cfg.overrideKondisi),
    });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotFile = `.seed-snapshot-${timestamp}.json`;
  const snapshot = {
    timestamp: new Date().toISOString(),
    project_id: Number(project.project_id),
    gudang_id: Number(gudang.gudang_id),
    zona_id: Number(zona.zona_id),
    stocks,
    sjIds: createdSjs.map(s => s.surat_jalan_id),
  };

  fs.writeFileSync(path.join(__dirname, snapshotFile), JSON.stringify(toJson(snapshot), null, 2));

  info('Snapshot tersimpan di: ' + snapshotFile);
  info('');
  info('SJ yang dibuat (BELUM picking, gunakan verify-picking.js untuk retrieve):');
  for (const sj of createdSjs) {
    info(`  - ${sj.nomor_surat_jalan} (item ${sj.item_id}): barang ${sj.barang_id}, qty ${sj.qty}, kondisi_diminta=${sj.kondisi}, kondisi_diambil=${sj.picked_kondisi}, override=${sj.is_override}`);
  }

  if (!APPLY) {
    info('');
    info('DRY-RUN: Tidak ada yang diubah. Jalankan dengan --apply untuk membuat data test.');
  }

  return { createdSjs, snapshotFile };
}

(async () => {
  try {
    if (RESTORE) {
      await plan();
      return;
    }

    await plan();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
