const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('========== SEED REPORTS DATA ==========');

  const users = await prisma.user_account.findMany({ select: { user_id: true, nama: true, role: true } });
  const suratJalanItems = await prisma.surat_jalan_item.findMany({
    include: {
      surat_jalan: {
        include: {
          project: { select: { nama_project: true, area: true } },
          gudang_asal: { select: { nama_gudang: true } },
          gudang_tujuan: { select: { nama_gudang: true } },
          boq: { include: { tiket: { select: { tiket_id: true, kode_tiket: true } } } },
          creator: { select: { nama: true, role: true } },
        },
      },
      barang: { select: { kode_perangkat: true, nama_barang: true } },
    },
  });

  if (!users.length || !suratJalanItems.length) {
    throw new Error('Master data belum siap. Butuh user_account dan surat_jalan_item.');
  }

  const actor = users[0];
  const supervisor = users.find(u => u.role === 'supervisor') || users[1];
  const staff = users.find(u => u.role === 'staf_gudang') || users[2];

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  function makeDate(base, addMinutes) {
    const d = new Date(base);
    d.setMinutes(d.getMinutes() + addMinutes);
    return d;
  }
  function formatDate(d) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  }

  // 1. Seed Audit Log
  console.log('\nSeeding audit_log...');
  await prisma.audit_log.deleteMany({});
  
  const auditLogs = [
    {
      entity_type: 'reconciliation',
      entity_id: BigInt(1),
      aksi: 'update',
      actor_id: actor.user_id,
      data_sebelum: { mos: 100, used: 80 },
      data_sesudah: { mos: 120, used: 95, source_file: 'compile-material-2026-08-14.xlsx' },
      created_at: makeDate(now, -120),
    },
    {
      entity_type: 'reconciliation',
      entity_id: BigInt(2),
      aksi: 'update',
      actor_id: supervisor.user_id,
      data_sebelum: { mos: 50, used: 45 },
      data_sesudah: { mos: 60, used: 50, source_file: 'compile-material-2026-08-10.xlsx' },
      created_at: makeDate(now, -240),
    },
    {
      entity_type: 'Inbound',
      entity_id: BigInt(suratJalanItems[0]?.surat_jalan_id || 7),
      aksi: 'create',
      actor_id: staff.user_id,
      data_sebelum: null,
      data_sesudah: { catatan: 'Input Surat Jalan Inbound SJ-IN-2026-001', nomor_surat_jalan: 'SJ-IN-2026-001' },
      created_at: makeDate(now, -180),
    },
    {
      entity_type: 'Outbound',
      entity_id: BigInt(suratJalanItems[2]?.surat_jalan_id || 8),
      aksi: 'approve',
      actor_id: supervisor.user_id,
      data_sebelum: { status: 'draft_diajukan' },
      data_sesudah: { status: 'disetujui', catatan: 'Approval Surat Jalan Outbound SJ-OUT-2026-002' },
      created_at: makeDate(now, -90),
    },
    {
      entity_type: 'Outbound',
      entity_id: BigInt(suratJalanItems[4]?.surat_jalan_id || 9),
      aksi: 'approve',
      actor_id: supervisor.user_id,
      data_sebelum: { status: 'draft_diajukan' },
      data_sesudah: { status: 'diterima_didistribusikan', catatan: 'Konfirmasi Diterima Surat Jalan Outbound SJ-OUT-2026-003' },
      created_at: makeDate(now, -30),
    },
    {
      entity_type: 'Master Data',
      entity_id: BigInt(1),
      aksi: 'create',
      actor_id: actor.user_id,
      data_sebelum: null,
      data_sesudah: { catatan: 'Menambahkan personil baru: Andi Prasetyo' },
      created_at: makeDate(now, -120),
    },
    {
      entity_type: 'Pengguna',
      entity_id: BigInt(4),
      aksi: 'update',
      actor_id: actor.user_id,
      data_sebelum: { role: 'staf_gudang' },
      data_sesudah: { role: 'supervisor', catatan: 'Mengubah role pengguna: Ahmad Fauzi → Supervisor' },
      created_at: makeDate(now, -90),
    },
    {
      entity_type: 'reconciliation',
      entity_id: BigInt(3),
      aksi: 'update',
      actor_id: staff.user_id,
      data_sebelum: { mos: 30, used: 25 },
      data_sesudah: { mos: 35, used: 28, source_file: 'compile-material-2026-08-01.xlsx' },
      created_at: makeDate(now, -15),
    },
  ];

  for (const payload of auditLogs) {
    await prisma.audit_log.create({ data: payload });
  }
  console.log(`  ${auditLogs.length} audit_log entries created.`);

  // 2. Seed Stok Ledger
  console.log('\nSeeding stok_ledger...');
  await prisma.stok_ledger.deleteMany({});

  const ledgerEntries = [];
  for (const item of suratJalanItems) {
    const sj = item.surat_jalan;
    const jenisMutasi = sj.tipe === 'inbound' ? 'in' : 'out';
    const qty = Number(item.qty);
    const saldoSetelah = qty;

    ledgerEntries.push({
      surat_jalan_item_id: item.item_id,
      barang_id: item.barang_id,
      jenis_mutasi: jenisMutasi,
      qty: qty,
      saldo_setelah: saldoSetelah,
      waktu_mutasi: sj.tanggal_diterima || sj.tanggal || now,
    });
  }

  // Add some additional ledger entries for variety
  if (suratJalanItems.length > 0) {
    const baseItem = suratJalanItems[0];
    const baseSj = baseItem.surat_jalan;
    
    // Add a second ledger entry for the first item to simulate partial movement
    if (baseSj.tipe === 'inbound') {
      ledgerEntries.push({
        surat_jalan_item_id: baseItem.item_id,
        barang_id: baseItem.barang_id,
        jenis_mutasi: 'out',
        qty: 3,
        saldo_setelah: Number(baseItem.qty) - 3,
        waktu_mutasi: makeDate(baseSj.tanggal_diterima || baseSj.tanggal, 60),
      });
    }
  }

  for (const entry of ledgerEntries) {
    await prisma.stok_ledger.create({ data: entry });
  }
  console.log(`  ${ledgerEntries.length} stok_ledger entries created.`);

  // Summary
  const auditCount = await prisma.audit_log.count();
  const ledgerCount = await prisma.stok_ledger.count();
  console.log('\n========== SEED SUMMARY ==========');
  console.log(`Audit Log: ${auditCount} entries`);
  console.log(`Stok Ledger: ${ledgerCount} entries`);
  console.log('===================================');
}

main()
  .catch((e) => {
    console.error('Gagal seeding reports data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
