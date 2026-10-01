const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const safe = (obj) => JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v);
(async () => {
  try {
    // Count inbound diterima_didistribusikan with zona_id NULL but exactly 1 zona in stok_gudang
    const q = await prisma.$queryRaw`
      WITH candidate AS (
        SELECT sji.item_id, sji.barang_id, sj.gudang_tujuan_id
        FROM surat_jalan_item sji
        JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
        WHERE sj.tipe = 'inbound'
          AND sj.status = 'diterima_didistribusikan'
          AND sji.zona_id IS NULL
          AND sj.gudang_tujuan_id IS NOT NULL
      ),
      zona_count AS (
        SELECT c.barang_id, c.gudang_tujuan_id, COUNT(DISTINCT sg.zona_id) AS zona_unik
        FROM candidate c
        JOIN stok_gudang sg ON sg.barang_id = c.barang_id AND sg.gudang_id = c.gudang_tujuan_id AND sg.zona_id IS NOT NULL
        GROUP BY c.barang_id, c.gudang_tujuan_id
      )
      SELECT 
        (SELECT COUNT(*) FROM candidate) AS total_kandidat,
        (SELECT COUNT(*) FROM zona_count WHERE zona_unik = 1) AS tepat_1_zona,
        (SELECT COUNT(*) FROM zona_count WHERE zona_unik = 0) AS zona_0,
        (SELECT COUNT(*) FROM zona_count WHERE zona_unik > 1) AS zona_lebih_dari_1
  `;
    console.log('Zona fallback stats:', safe(q));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
