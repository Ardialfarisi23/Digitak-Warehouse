const prisma = require("../src/config/prisma");

(async () => {
  try {
    const rows = await prisma.surat_jalan.findMany({
      select: {
        surat_jalan_id: true,
        nomor_surat_jalan: true,
        tipe: true,
        status: true,
        created_at: true,
        project_id: true,
      },
      orderBy: { created_at: "desc" },
    });

    console.log("Total surat_jalan:", rows.length);
    rows.forEach((row, i) => {
      console.log(
        `${i + 1}. id=${row.surat_jalan_id} | nomor=${row.nomor_surat_jalan} | tipe=${row.tipe} | status=${row.status} | project_id=${row.project_id} | created_at=${row.created_at}`
      );
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
