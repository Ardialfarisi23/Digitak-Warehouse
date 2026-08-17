const prisma = require("../src/config/prisma");

(async () => {
  try {
    const rows = await prisma.surat_jalan.findMany({
      include: {
        items: {
          include: {
            barang: true,
            satuan: true,
          },
        },
        project: true,
        gudang_asal: true,
        gudang_tujuan: true,
        kendaraan: true,
        personil_pengantar: true,
        creator: true,
      },
      orderBy: { created_at: "desc" },
    });

    console.log("Total surat_jalan:", rows.length);
    for (const row of rows) {
      console.log("\n--- SJ:", row.surat_jalan_id, "---");
      console.log("nomor:", row.nomor_surat_jalan);
      console.log("tipe:", row.tipe);
      console.log("status:", row.status);
      console.log("project:", row.project?.nama_project || null);
      console.log("gudang_asal:", row.gudang_asal?.nama_gudang || null);
      console.log("gudang_tujuan:", row.gudang_tujuan?.nama_gudang || null);
      console.log("driver:", row.personil_pengantar?.nama || null);
      console.log("kendaraan:", row.kendaraan?.no_polisi || null);
      console.log("creator:", row.creator?.nama || null);
      console.log("items count:", row.items?.length || 0);
      for (const it of row.items || []) {
        console.log("  -", it.barang?.kode_perangkat, it.barang?.nama_barang, "qty:", it.qty, "satuan:", it.satuan?.kode_satuan);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
