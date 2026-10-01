const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const safeStringify = (obj) => JSON.stringify(obj, (_, value) => typeof value === 'bigint' ? value.toString() : value);
(async () => {
  try {
    const q1 = await prisma.$queryRaw`
      SELECT sj.tipe,
        COUNT(*) FILTER (WHERE sj.gudang_tujuan_id IS NULL AND sj.titik_lapangan_id IS NOT NULL) AS tujuan_null_lapangan_ada,
        COUNT(*) FILTER (WHERE sj.gudang_tujuan_id IS NULL AND sj.titik_lapangan_id IS NULL) AS tujuan_null_lapangan_null,
        COUNT(*) FILTER (WHERE sj.gudang_tujuan_id IS NOT NULL) AS tujuan_ada
      FROM stok_ledger sl
      JOIN surat_jalan_item sji ON sl.surat_jalan_item_id = sji.item_id
      JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
      GROUP BY sj.tipe
      ORDER BY sj.tipe
    `;
    console.log('Q1:', safeStringify(q1));

    const q2 = await prisma.$queryRaw`
      SELECT sj.tipe, sj.status,
        COUNT(*) FILTER (WHERE sji.zona_id IS NULL) AS zona_null,
        COUNT(*) FILTER (WHERE sji.zona_id IS NOT NULL) AS zona_ada
      FROM stok_ledger sl
      JOIN surat_jalan_item sji ON sl.surat_jalan_item_id = sji.item_id
      JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
      GROUP BY sj.tipe, sj.status
      ORDER BY sj.tipe, sj.status
    `;
    console.log('Q2:', safeStringify(q2));

    const q3a = await prisma.$queryRaw`
      SELECT sj.tipe, sj.nomor_surat_jalan, sj.status,
        ga.nama_gudang AS asal, gt.nama_gudang AS tujuan, tl.nama_lokasi AS lapangan,
        sji.zona_id, z.kode_zona, sl.waktu_mutasi
      FROM stok_ledger sl
      JOIN surat_jalan_item sji ON sl.surat_jalan_item_id = sji.item_id
      JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
      LEFT JOIN gudang ga ON sj.gudang_asal_id = ga.gudang_id
      LEFT JOIN gudang gt ON sj.gudang_tujuan_id = gt.gudang_id
      LEFT JOIN titik_lapangan tl ON sj.titik_lapangan_id = tl.titik_lapangan_id
      LEFT JOIN zona_gudang z ON sji.zona_id = z.zona_id
      WHERE sj.gudang_tujuan_id IS NULL AND sj.titik_lapangan_id IS NOT NULL
      ORDER BY sl.waktu_mutasi DESC
      LIMIT 5
    `;
    console.log('Q3a:', safeStringify(q3a));

    const q3b = await prisma.$queryRaw`
      SELECT sj.tipe, sj.nomor_surat_jalan, sj.status,
        ga.nama_gudang AS asal, gt.nama_gudang AS tujuan, tl.nama_lokasi AS lapangan,
        sji.zona_id, z.kode_zona, sl.waktu_mutasi
      FROM stok_ledger sl
      JOIN surat_jalan_item sji ON sl.surat_jalan_item_id = sji.item_id
      JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
      LEFT JOIN gudang ga ON sj.gudang_asal_id = ga.gudang_id
      LEFT JOIN gudang gt ON sj.gudang_tujuan_id = gt.gudang_id
      LEFT JOIN titik_lapangan tl ON sj.titik_lapangan_id = tl.titik_lapangan_id
      LEFT JOIN zona_gudang z ON sji.zona_id = z.zona_id
      WHERE sj.gudang_tujuan_id IS NULL AND sj.titik_lapangan_id IS NULL
      ORDER BY sl.waktu_mutasi DESC
      LIMIT 5
    `;
    console.log('Q3b:', safeStringify(q3b));

    const q3c = await prisma.$queryRaw`
      SELECT sj.tipe, sj.nomor_surat_jalan, sj.status,
        ga.nama_gudang AS asal, gt.nama_gudang AS tujuan, tl.nama_lokasi AS lapangan,
        sji.zona_id, z.kode_zona, sl.waktu_mutasi
      FROM stok_ledger sl
      JOIN surat_jalan_item sji ON sl.surat_jalan_item_id = sji.item_id
      JOIN surat_jalan sj ON sji.surat_jalan_id = sj.surat_jalan_id
      LEFT JOIN gudang ga ON sj.gudang_asal_id = ga.gudang_id
      LEFT JOIN gudang gt ON sj.gudang_tujuan_id = gt.gudang_id
      LEFT JOIN titik_lapangan tl ON sj.titik_lapangan_id = tl.titik_lapangan_id
      LEFT JOIN zona_gudang z ON sji.zona_id = z.zona_id
      WHERE sji.zona_id IS NULL
      ORDER BY sl.waktu_mutasi DESC
      LIMIT 5
    `;
    console.log('Q3c:', safeStringify(q3c));

    const q4 = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'titik_lapangan'
      ORDER BY ordinal_position
    `;
    console.log('Q4:', safeStringify(q4));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
