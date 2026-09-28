const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--apply') ? false : true;
const RESTORE = process.argv.includes('--restore');

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

if (DRY_RUN && !RESTORE) {
  info('Dry-run mode. Tambahkan --apply untuk menulis ke database.');
}

if (RESTORE) {
  info('Restore mode: akan mengembalikan stok ke snapshot dan menghapus data TEST-.');
}

(async () => {
  try {
    if (RESTORE) {
      const fs = require('fs');
      const snapshotPath = require('path').join(__dirname, '.seed-snapshot.json');
      if (!fs.existsSync(snapshotPath)) {
        fail('Snapshot tidak ditemukan: ' + snapshotPath);
      }

      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

      info('Menghapus data TEST- (urutan aman)...');
      await prisma.surat_jalan_item_pick.deleteMany({
        where: { item: { surat_jalan: { nomor_surat_jalan: { startsWith: 'TEST-' } } } },
      });
      await prisma.stok_ledger.deleteMany({
        where: { surat_jalan_item: { surat_jalan: { nomor_surat_jalan: { startsWith: 'TEST-' } } } },
      });
      await prisma.audit_log.deleteMany({
        where: { entity_type: 'surat_jalan', entity_id: { in: snapshot.sjIds.map(id => BigInt(id)) } },
      });
      await prisma.surat_jalan_item.deleteMany({
        where: { surat_jalan: { nomor_surat_jalan: { startsWith: 'TEST-' } } },
      });
      await prisma.surat_jalan.deleteMany({
        where: { nomor_surat_jalan: { startsWith: 'TEST-' } },
      });

      info('Mengembalikan stok ke snapshot...');
      for (const row of snapshot.stocks) {
        await prisma.stok_gudang.update({
          where: { stok_id: BigInt(row.stok_id) },
          data: { qty: row.qty },
        });
      }

      info('Restore selesai.');
      await prisma.$disconnect();
      return;
    }

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
    const barangIds = selectedItems.map(bi => bi.barang_id);

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
        await prisma.stok_gudang.update({
          where: { stok_id: existing.stok_id },
          data: { qty: cfg.qty },
        });
        stocks.push({ stok_id: existing.stok_id, qty: cfg.qty, kondisi: cfg.kondisi, barang_id: bi.barang_id });
      } else {
        const created = await prisma.stok_gudang.create({
          data: {
            gudang_id: gudang.gudang_id,
            zona_id: zona.zona_id,
            barang_id: bi.barang_id,
            project_id: project.project_id,
            kondisi: cfg.kondisi,
            qty: cfg.qty,
          },
        });
        stocks.push({ stok_id: created.stok_id, qty: cfg.qty, kondisi: cfg.kondisi, barang_id: bi.barang_id });
      }
    }

    const snapshot = {
      timestamp: new Date().toISOString(),
      project_id: Number(project.project_id),
      gudang_id: Number(gudang.gudang_id),
      zona_id: Number(zona.zona_id),
      stocks,
      sjIds: [],
    };

    info('Membuat SJ test...');
    const users = await prisma.user_account.findMany({
      where: { role: { in: ['staf_gudang', 'supervisor'] } },
      take: 5,
    });

    if (users.length < 2) {
      fail('Butuh minimal 2 user (staf_gudang + supervisor).');
    }

    const staff = users.find(u => u.role === 'staf_gudang') || users[0];
    const supervisor = users.find(u => u.role === 'supervisor') || users[1];

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
          picking_selesai: true,
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
      const pickedKondisi = cfg.overrideKondisi || cfg.kondisi;

      const stockToUpdate = await prisma.stok_gudang.findFirst({
        where: {
          gudang_id: gudang.gudang_id,
          zona_id: zona.zona_id,
          barang_id: bi.barang_id,
          project_id: project.project_id,
          kondisi: pickedKondisi,
        },
      });

      if (!stockToUpdate) {
        fail(`Stok tidak ditemukan untuk barang ${bi.barang_id} kondisi ${pickedKondisi}.`);
      }

      await prisma.stok_gudang.update({
        where: { stok_id: stockToUpdate.stok_id },
        data: { qty: { decrement: cfg.qty } },
      });

      await prisma.surat_jalan_item_pick.create({
        data: {
          surat_jalan_item_id: item.item_id,
          gudang_id: gudang.gudang_id,
          zona_id: zona.zona_id,
          kondisi_diminta: cfg.kondisi,
          kondisi_diambil: pickedKondisi,
          qty: cfg.qty,
          is_override: Boolean(cfg.overrideKondisi),
          catatan_override: cfg.overrideKondisi ? 'TEST override' : null,
          picked_by: BigInt(staff.user_id),
        },
      });

      await prisma.stok_ledger.create({
        data: {
          surat_jalan_item_id: item.item_id,
          barang_id: bi.barang_id,
          jenis_mutasi: 'out',
          qty: cfg.qty,
          saldo_setelah: 100 - cfg.qty,
        },
      });

      snapshot.sjIds.push(Number(sj.surat_jalan_id));
      createdSjs.push({
        surat_jalan_id: Number(sj.surat_jalan_id),
        nomor_surat_jalan: nomorSJ,
        item_id: Number(item.item_id),
        barang_id: bi.barang_id,
        qty: cfg.qty,
        kondisi: cfg.kondisi,
        picked_kondisi: pickedKondisi,
        is_override: Boolean(cfg.overrideKondisi),
      });
    }

    const fs = require('fs');
    const snapshotPath = require('path').join(__dirname, '.seed-snapshot.json');
    fs.writeFileSync(snapshotPath, JSON.stringify(toJson(snapshot), null, 2));

    info('Snapshot tersimpan di:', snapshotPath);
    info('');
    info('SJ yang dibuat:');
    for (const sj of createdSjs) {
      info(`  - ${sj.nomor_surat_jalan} (item ${sj.item_id}): barang ${sj.barang_id}, qty ${sj.qty}, kondisi_diminta=${sj.kondisi}, kondisi_diambil=${sj.picked_kondisi}, override=${sj.is_override}`);
    }

    if (DRY_RUN) {
      info('');
      info('DRY-RUN: Tidak ada yang diubah. Jalankan dengan --apply untuk membuat data test.');
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
