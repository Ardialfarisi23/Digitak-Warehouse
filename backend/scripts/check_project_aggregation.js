require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const main = async () => {
  console.log("=== DIAGNOSA PROJECT AGGREGATION (READ-ONLY) ===\n");

  // 1. Ambil semua tiket_material beserta project_id dan kode_tiket
  const tikets = await prisma.tiket_material.findMany({
    select: {
      tiket_id: true,
      kode_tiket: true,
      project_id: true,
      mos: true,
      used: true,
    },
    orderBy: { project_id: "asc" },
  });

  console.log(`Total tiket_material: ${tikets.length}\n`);

  // 2. Group by project_id
  const projectMap = new Map();
  for (const t of tikets) {
    const pid = Number(t.project_id);
    if (!projectMap.has(pid)) {
      projectMap.set(pid, []);
    }
    projectMap.get(pid).push(t);
  }

  console.log("=== Distribusi tiket per project_id ===");
  const multiTicketProjects = [];
  for (const [pid, tiketList] of projectMap.entries()) {
    console.log(`  project_id ${pid}: ${tiketList.length} tiket`);
    if (tiketList.length > 1) {
      multiTicketProjects.push({ project_id: pid, tikets: tiketList });
    }
  }

  if (multiTicketProjects.length === 0) {
    console.log("\nTidak ada project dengan lebih dari 1 tiket_material.");
  } else {
    console.log(`\nProject dengan LEBIH DARI 1 tiket_material: ${multiTicketProjects.length} project`);
    for (const proj of multiTicketProjects) {
      console.log(`\n  project_id ${proj.project_id}:`);
      for (const t of proj.tikets) {
        console.log(`    - tiket_id ${t.tiket_id} | kode_tiket ${t.kode_tiket} | mos ${Number(t.mos || 0)} | used ${Number(t.used || 0)}`);
      }
    }
  }

  // 3. Cek khusus 2 tiket target
  const targetKodes = ["TKT-SI-2026-0134", "TKT-SI-2026-0157"];
  const targetTikets = tikets.filter((t) => targetKodes.includes(t.kode_tiket));

  console.log("\n=== Cek 2 tiket target ===");
  for (const t of targetTikets) {
    const pid = Number(t.project_id);
    const sameProjectTikets = projectMap.get(pid) || [];
    console.log(`  ${t.kode_tiket}:`);
    console.log(`    project_id: ${pid}`);
    console.log(`    Jumlah tiket di project yang sama: ${sameProjectTikets.length}`);
    console.log(`    Tiket lain di project yang sama:`);
    for (const other of sameProjectTikets) {
      if (other.kode_tiket !== t.kode_tiket) {
        console.log(`      - ${other.kode_tiket} (tiket_id ${other.tiket_id})`);
      }
    }
  }

  // 4. Simulasi dampak backfill untuk project dengan multiple tiket
  console.log("\n=== Simulasi dampak backfill (tanpa menulis) ===");
  for (const proj of multiTicketProjects) {
    const pid = proj.project_id;
    // Hitung total inbound/outbound per project dari surat_jalan
    const suratJalans = await prisma.surat_jalan.findMany({
      where: { status: "diterima_didistribusikan", project_id: BigInt(pid) },
      include: {
        items: {
          select: {
            qty: true,
            is_kelebihan: true,
          },
        },
      },
    });

    let totalInbound = 0;
    let totalOutbound = 0;
    for (const sj of suratJalans) {
      for (const item of sj.items) {
        const qty = Number(item.qty || 0);
        if (sj.tipe === "inbound") {
          if (item.is_kelebihan) {
            // additional, tidak masuk mos utama
          } else {
            totalInbound += qty;
          }
        }
        if (sj.tipe === "outbound" && sj.tujuan_tipe !== "gudang") {
          totalOutbound += qty;
        }
      }
    }

    console.log(`\n  project_id ${pid}:`);
    console.log(`    Total surat_jalan diterima_didistribusikan: ${suratJalans.length}`);
    console.log(`    Total inbound (non-kelebihan): ${totalInbound}`);
    console.log(`    Total outbound non-gudang: ${totalOutbound}`);
    console.log(`    Jika backfill dijalankan, semua tiket di project ini akan mendapat:`);
    console.log(`      mos = ${totalInbound} (sama untuk SEMUA tiket dalam project)`);
    console.log(`      used = ${totalOutbound} (sama untuk SEMUA tiket dalam project)`);
    console.log(`    Tiket yang terpengaruh:`);
    for (const t of proj.tikets) {
      console.log(`      - ${t.kode_tiket} (saat ini mos=${Number(t.mos || 0)})`);
    }
  }

  // 5. Kesimpulan dampak pada 2 tiket target
  console.log("\n=== Kesimpulan dampak pada 2 tiket target ===");
  for (const t of targetTikets) {
    const pid = Number(t.project_id);
    const sameProjectTikets = projectMap.get(pid) || [];
    const isSingle = sameProjectTikets.length === 1;
    console.log(`  ${t.kode_tiket} (project_id ${pid}):`);
    console.log(`    ${isSingle ? "AMAN — project ini HANYA punya 1 tiket, tidak ada bug aggregasi per-project" : "BERPENGARUH — project ini punya multiple tiket, nilai mos akan identik antar tiket"}`);
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
