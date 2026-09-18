const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const items = await prisma.barang.findMany({
      select: {
        barang_id: true,
        kode_perangkat: true,
        nama_barang: true,
        created_at: true,
      },
      orderBy: { barang_id: 'asc' },
    });

    console.log('TOTAL BARANG:', items.length);

    const map = new Map();
    const conflicts = [];

    for (const item of items) {
      const original = item.kode_perangkat;
      const normalized = String(original).trim().toUpperCase();

      if (map.has(normalized)) {
        const existing = map.get(normalized);
        conflicts.push({
          normalized,
          items: [existing, item],
        });
      } else {
        map.set(normalized, item);
      }
    }

    console.log('\nKONFLIK:', conflicts.length);

    if (conflicts.length === 0) {
      console.log('0 konflik ditemukan, aman untuk lanjut normalisasi.');
    } else {
      for (const group of conflicts) {
        console.log('\nGrup bentrok untuk kode dinormalisasi:', group.normalized);
        for (const it of group.items) {
          console.log(`  - barang_id=${it.barang_id}, kode_perangkat="${it.kode_perangkat}", nama_barang="${it.nama_barang}", created_at=${it.created_at}`);
        }
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
