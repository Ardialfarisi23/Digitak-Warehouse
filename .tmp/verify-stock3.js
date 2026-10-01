const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const safe = (obj) => JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v);
(async () => {
  try {
    // C: 5 inbound diterima_didistribusikan zona NULL
    const qC1 = await prisma.$queryRaw`
      SELECT sj.nomor_surat_jalan, sj.status, sj.created_at,
        ga.nama_gudang AS asal, gt.nama_gudang AS tujuan,
        sji.zona_id, z.kode_zona, sl.waktu_mutasi,
        sg.gudang_id, sg.zona_id AS stok_zona_id, sg.qty AS stok_qty
      FROM stok_ledger sl
      JOIN surat_jalan_item sji ON sl.surat_jalan_item_id = sji.item_id
      JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
      LEFT JOIN gudang ga ON sj.gudang_asal_id = ga.gudang_id
      LEFT JOIN gudang gt ON sj.gudang_tujuan_id = gt.gudang_id
      LEFT JOIN zona_gudang z ON sji.zona_id = z.zona_id
      LEFT JOIN stok_gudang sg ON sg.barang_id = sji.barang_id AND sg.gudang_id = COALESCE(sj.gudang_tujuan_id, ga.gudang_id)
      WHERE sj.tipe = 'inbound' AND sj.status = 'diterima_didistribusikan' AND sji.zona_id IS NULL
      ORDER BY sl.waktu_mutasi DESC
      LIMIT 5
    `;
    console.log('C1-inbound-zona-null:', safe(qC1));

    // C2: 5 inbound dengan zona terisi
    const qC2 = await prisma.$queryRaw`
      SELECT sj.nomor_surat_jalan, sj.status, sj.created_at,
        ga.nama_gudang AS asal, gt.nama_gudang AS tujuan,
        sji.zona_id, z.kode_zona, sl.waktu_mutasi
      FROM stok_ledger sl
      JOIN surat_jalan_item sji ON sl.surat_jalan_item_id = sji.item_id
      JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
      LEFT JOIN gudang ga ON sj.gudang_asal_id = ga.gudang_id
      LEFT JOIN gudang gt ON sj.gudang_tujuan_id = gt.gudang_id
      LEFT JOIN zona_gudang z ON sji.zona_id = z.zona_id
      WHERE sj.tipe = 'inbound' AND sj.status = 'diterima_didistribusikan' AND sji.zona_id IS NOT NULL
      ORDER BY sl.waktu_mutasi DESC
      LIMIT 5
    `;
    console.log('C2-inbound-zona-ada:', safe(qC2));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
