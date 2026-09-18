const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const ids = [62, 63, 64];
    
    // Check using Prisma native methods
    console.log('=== Checking boq_item ===');
    const boqItems = await prisma.boq_item.findMany({
      where: { barang_id: { in: ids } },
      select: { boq_item_id: true, barang_id: true, boq_id: true }
    });
    console.log('boq_item count:', boqItems.length);
    if (boqItems.length) console.log(JSON.stringify(boqItems, null, 2));

    console.log('\n=== Checking surat_jalan_item ===');
    const suratJalanItems = await prisma.surat_jalan_item.findMany({
      where: { barang_id: { in: ids } },
      select: { item_id: true, barang_id: true, surat_jalan_id: true }
    });
    console.log('surat_jalan_item count:', suratJalanItems.length);
    if (suratJalanItems.length) console.log(JSON.stringify(suratJalanItems, null, 2));

    console.log('\n=== Checking stok_gudang ===');
    const stokGudang = await prisma.stok_gudang.findMany({
      where: { barang_id: { in: ids } },
      select: { stok_id: true, barang_id: true, gudang_id: true }
    });
    console.log('stok_gudang count:', stokGudang.length);
    if (stokGudang.length) console.log(JSON.stringify(stokGudang, null, 2));

    console.log('\n=== Checking stok_ledger ===');
    const stokLedger = await prisma.stok_ledger.findMany({
      where: { barang_id: { in: ids } },
      select: { ledger_id: true, barang_id: true, surat_jalan_item_id: true }
    });
    console.log('stok_ledger count:', stokLedger.length);
    if (stokLedger.length) console.log(JSON.stringify(stokLedger, null, 2));

    console.log('\n=== Checking permintaan_boq ===');
    const permintaanBoq = await prisma.permintaan_boq.findMany({
      where: { barang_id: { in: ids } },
      select: { permintaan_id: true, barang_id: true, project_id: true }
    });
    console.log('permintaan_boq count:', permintaanBoq.length);
    if (permintaanBoq.length) console.log(JSON.stringify(permintaanBoq, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
