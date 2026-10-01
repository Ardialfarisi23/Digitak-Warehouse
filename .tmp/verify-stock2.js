const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const safe = (obj) => JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? v.toString() : v);
(async () => {
  try {
    const qA1 = await prisma.$queryRaw`
      SELECT sj.surat_jalan_id, sj.nomor_surat_jalan, sj.status, sj.created_at, sj.tujuan_tipe, sj.tipe_pengirim,
        u.nama AS dibuat_oleh, u.role AS dibuat_role,
        ga.nama_gudang AS asal, gt.nama_gudang AS tujuan, tl.nama_lokasi AS lapangan,
        sji.zona_id
      FROM surat_jalan sj
      JOIN user_account u ON sj.created_by = u.user_id
      LEFT JOIN gudang ga ON sj.gudang_asal_id = ga.gudang_id
      LEFT JOIN gudang gt ON sj.gudang_tujuan_id = gt.gudang_id
      LEFT JOIN titik_lapangan tl ON sj.titik_lapangan_id = tl.titik_lapangan_id
      JOIN surat_jalan_item sji ON sj.surat_jalan_id = sji.surat_jalan_id
      WHERE sj.tipe = 'outbound' AND sj.gudang_tujuan_id IS NULL
      ORDER BY sj.created_at DESC
      LIMIT 4
    `;
    console.log('A1-kosong:', safe(qA1));

    const qA1b = await prisma.$queryRaw`
      SELECT sj.surat_jalan_id, sj.nomor_surat_jalan, sj.status, sj.created_at, sj.tujuan_tipe, sj.tipe_pengirim,
        u.nama AS dibuat_oleh, u.role AS dibuat_role,
        ga.nama_gudang AS asal, gt.nama_gudang AS tujuan, tl.nama_lokasi AS lapangan,
        sji.zona_id
      FROM surat_jalan sj
      JOIN user_account u ON sj.created_by = u.user_id
      LEFT JOIN gudang ga ON sj.gudang_asal_id = ga.gudang_id
      LEFT JOIN gudang gt ON sj.gudang_tujuan_id = gt.gudang_id
      LEFT JOIN titik_lapangan tl ON sj.titik_lapangan_id = tl.titik_lapangan_id
      JOIN surat_jalan_item sji ON sj.surat_jalan_id = sji.surat_jalan_id
      WHERE sj.tipe = 'outbound' AND sj.gudang_tujuan_id IS NOT NULL
      ORDER BY sj.created_at DESC
      LIMIT 3
    `;
    console.log('A1-terisi:', safe(qA1b));
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
