const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSafeItems() {
  try {
    const allIds = await prisma.barang.findMany({
      select: { barang_id: true, kode_perangkat: true, nama_barang: true },
      orderBy: { barang_id: 'asc' },
    });

    const conflictIds = new Set([58, 59]);
    const ids = allIds.map(i => i.barang_id).filter(id => !conflictIds.has(id));
    
    console.log('Checking safe items (non-conflict):', ids.length);

    for (const id of ids) {
      const boq = await prisma.boq_item.count({ where: { barang_id: id } });
      const sj = await prisma.surat_jalan_item.count({ where: { barang_id: id } });
      const stok = await prisma.stok_gudang.count({ where: { barang_id: id } });
      const ledger = await prisma.stok_ledger.count({ where: { barang_id: id } });
      const pb = await prisma.permintaan_boq.count({ where: { barang_id: id } });
      const total = boq + sj + stok + ledger + pb;
      
      if (total === 0) {
        console.log(`SAFE: barang_id=${id} has no relations`);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

findSafeItems();
