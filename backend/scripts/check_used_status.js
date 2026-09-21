require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const main = async () => {
  console.log("=== DIAGNOSA USED (READ-ONLY) ===\n");

  // 1. Total tiket_material dengan used > 0
  const usedCount = await prisma.tiket_material.count({
    where: { used: { gt: 0 } },
  });
  console.log(`1. Tiket_material dengan used > 0: ${usedCount}`);

  // 2. Semua tiket_material dengan used > 0
  const tiketsWithUsed = await prisma.tiket_material.findMany({
    where: { used: { gt: 0 } },
    select: { tiket_id: true, kode_tiket: true, project_id: true, used: true },
    orderBy: { project_id: "asc" },
  });

  // 3. Ambil semua tiket_id yang punya laporan_mitra (aktif)
  const laporanRows = await prisma.laporan_mitra.findMany({
    where: { is_aktif: true },
    select: { tiket_id: true },
    distinct: ["tiket_id"],
  });
  const laporanTiketIds = new Set(laporanRows.map((r) => String(r.tiket_id)));
  console.log(`2. Tiket_material yang punya minimal 1 laporan_mitra aktif: ${laporanTiketIds.size}`);

  // 4. Tiket dengan used > 0 tapi TIDAK punya laporan_mitra
  const stuckUsed = tiketsWithUsed.filter((t) => !laporanTiketIds.has(String(t.tiket_id)));
  console.log(`3. Tiket_material dengan used > 0 tapi TIDAK punya laporan_mitra: ${stuckUsed.length} dari ${tiketsWithUsed.length}`);
  if (stuckUsed.length > 0) {
    const safeStuck = stuckUsed.map((t) => ({
      ...t,
      tiket_id: Number(t.tiket_id),
      project_id: Number(t.project_id),
      used: Number(t.used),
    }));
    console.log(JSON.stringify(safeStuck, null, 2));
  }

  // 5. Persentase
  const percentageStuck = tiketsWithUsed.length > 0 ? ((stuckUsed.length / tiketsWithUsed.length) * 100).toFixed(2) : "0.00";
  console.log(`4. Persentase used>0 yang "nyangkut" tanpa laporan_mitra: ${percentageStuck}%`);

  // 6. Cek apakah ada tiket dengan used > 0 yang project_id-nya sama dengan tiket lain
  const projectMap = new Map();
  for (const t of tiketsWithUsed) {
    const pid = Number(t.project_id);
    if (!projectMap.has(pid)) projectMap.set(pid, []);
    projectMap.get(pid).push(t);
  }

  console.log("\n5. Tiket dengan used > 0 per project:");
  for (const [pid, list] of projectMap.entries()) {
    console.log(`   project_id ${pid}: ${list.length} tiket dengan used > 0`);
  }

  const multiUsedProjects = [...projectMap.entries()].filter(([_, list]) => list.length > 1);
  if (multiUsedProjects.length > 0) {
    console.log(`\n6. Project dengan multiple tiket (used > 0): ${multiUsedProjects.length} project`);
    for (const [pid, list] of multiUsedProjects) {
      console.log(`   project_id ${pid}:`);
      for (const t of list) {
        console.log(`     - ${t.kode_tiket} (used=${Number(t.used)})`);
      }
    }
  }

  console.log("\n=== SELESAI ===");
};

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
