const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSafeExistingItems() {
  try {
    const allItems = await prisma.barang.findMany({
      select: { barang_id: true, kode_perangkat: true, nama_barang: true },
      orderBy: { barang_id: 'asc' },
    });

    const conflictIds = new Set([58, 59]);
    const safeItems = [];

    for (const item of allItems) {
      if (conflictIds.has(item.barang_id)) continue;

      const boq = await prisma.boq_item.count({ where: { barang_id: item.barang_id } });
      const sj = await prisma.surat_jalan_item.count({ where: { barang_id: item.barang_id } });
      const stok = await prisma.stok_gudang.count({ where: { barang_id: item.barang_id } });
      const ledger = await prisma.stok_ledger.count({ where: { barang_id: item.barang_id } });
      const pb = await prisma.permintaan_boq.count({ where: { barang_id: item.barang_id } });
      const total = boq + sj + stok + ledger + pb;

      if (total === 0) {
        safeItems.push(item);
      }
    }

      console.log('Safe items count:', safeItems.length);
      const safe = safeItems.slice(0, 5).map(item => ({
        barang_id: Number(item.barang_id),
        kode_perangkat: item.kode_perangkat,
        nama_barang: item.nama_barang,
      }));
      console.log(JSON.stringify(safe, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

findSafeExistingItems();
