require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  console.log("=== CEK STATUS BACKFILL RECONCILIATION (READ-ONLY) ===\n");

  // 1. Count laporan_mitra dengan jenis_laporan = migrasi_sistem
  const migrasiCount = await prisma.laporan_mitra.count({
    where: { jenis_laporan: "migrasi_sistem" },
  });
  console.log(`1. Jumlah laporan_mitra dengan jenis_laporan = "migrasi_sistem": ${migrasiCount}`);

  // 2. Sample 10 record migrasi_sistem
  const migrasiSamples = await prisma.laporan_mitra.findMany({
    where: { jenis_laporan: "migrasi_sistem" },
    take: 10,
    select: {
      laporan_id: true,
      tiket_id: true,
      kode_tiket: true,
      mos: true,
      used: true,
      tanggal_laporan: true,
      uploaded_at: true,
      uploaded_by: true,
      catatan: true,
    },
    orderBy: { laporan_id: "asc" },
  });
  const safeMigrasiSamples = migrasiSamples.map((r) => ({
    ...r,
    tiket_id: Number(r.tiket_id),
    mos: Number(r.mos),
    used: Number(r.used),
    uploaded_by: Number(r.uploaded_by),
  }));
  console.log("\n2. Sample record migrasi_sistem (maks 10):");
  console.log(JSON.stringify(safeMigrasiSamples, null, 2));

  // 3. Total tiket_material
  const totalTiket = await prisma.tiket_material.count();
  console.log(`\n3. Total tiket_material: ${totalTiket}`);

  // 4. Total laporan_mitra (semua jenis)
  const totalLaporan = await prisma.laporan_mitra.count();
  console.log(`4. Total laporan_mitra (semua jenis): ${totalLaporan}`);

  // 5. Tiket_material yang punya minimal 1 laporan_mitra
  const laporanTiketRows = await prisma.laporan_mitra.findMany({
    select: { tiket_id: true },
    distinct: ["tiket_id"],
  });
  const laporanTiketIds = new Set(laporanTiketRows.map((r) => String(r.tiket_id)));
  console.log(`5. Jumlah tiket_material yang punya minimal 1 laporan_mitra: ${laporanTiketIds.size}`);

  // 6. Tiket_material dengan mos > 0 yang TIDAK punya laporan_mitra sama sekali
  const tiketsWithMos = await prisma.tiket_material.findMany({
    where: { mos: { gt: 0 } },
    select: { tiket_id: true, kode_tiket: true, mos: true },
  });
  const stuckTikets = tiketsWithMos.filter((t) => !laporanTiketIds.has(String(t.tiket_id)));
  console.log(
    `6. Tiket_material dengan mos > 0 tapi TIDAK punya laporan_mitra: ${stuckTikets.length} dari ${tiketsWithMos.length}`
  );
  if (stuckTikets.length > 0) {
    console.log("   Sample (maks 10):");
    const safeStuck = stuckTikets.slice(0, 10).map((t) => ({
      ...t,
      tiket_id: Number(t.tiket_id),
      mos: Number(t.mos),
    }));
    console.log(JSON.stringify(safeStuck, null, 2));
  }

  // 7. Persentase
  const percentageMigrasi = totalTiket > 0 ? ((migrasiCount / totalTiket) * 100).toFixed(2) : "0.00";
  const percentageStuck = tiketsWithMos.length > 0 ? ((stuckTikets.length / tiketsWithMos.length) * 100).toFixed(2) : "0.00";
  console.log(`\n7. Persentase tiket yang punya laporan_mitra migrasi_system: ${percentageMigrasi}%`);
  console.log(`   Persentase tiket mos>0 yang "nyangkut" tanpa laporan_mitra: ${percentageStuck}%`);

  // 8. Cek earliest dan latest untuk migrasi_sistem
  if (migrasiSamples.length > 0) {
    const earliest = migrasiSamples[0].tanggal_laporan;
    const latest = migrasiSamples[migrasiSamples.length - 1].tanggal_laporan;
    console.log(`\n8. Rentang tanggal_laporan sample migrasi_sistem: ${earliest} s/d ${latest}`);
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
