require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.surat_jalan.findMany({
    where: { status: "draft_diajukan", tipe: "outbound" },
    select: {
      surat_jalan_id: true,
      nomor_surat_jalan: true,
      status: true,
      tipe: true,
      created_by: true,
      creator: {
        select: {
          user_id: true,
          nama: true,
          role: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  const mapped = rows.map((r) => ({
    surat_jalan_id: Number(r.surat_jalan_id),
    nomor_surat_jalan: r.nomor_surat_jalan,
    status: r.status,
    tipe: r.tipe,
    created_by: Number(r.created_by),
    created_by_type: typeof r.created_by,
    creator_user_id: r.creator?.user_id ? Number(r.creator.user_id) : null,
    creator_role: r.creator?.role,
    creator_nama: r.creator?.nama,
  }));

  console.log(JSON.stringify(mapped, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
