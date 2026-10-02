// Seeder stok gudang untuk keperluan testing alur picking outbound.
//
// Seeder ini sengaja dibuat idempotent (upsert per kombinasi
// gudang + zona + barang + project + kondisi) agar aman dijalankan ulang
// setelah `prisma migrate reset`.
//
// WAJIB dipanggil setelah seedItems() dan seedProjects() karena memakai
// kode_perangkat / nama_project / nama_gudang sebagai lookup.
const GUDANG = "Gudang Rancamanyar";
const QTY_PER_ZONA = 100;
const KONDISI = ["baik", "rusak_ringan"];

// Barang yang dipakai oleh surat jalan outbound pada seed.
const BARANG = ["NWK-00466", "CBL-00043", "JTR-02242"];

// Project yang dipakai oleh surat jalan outbound pada seed.
const PROYEK = ["FTTH Rancamanyar Tahap 1", "FTTH Sumedang Kota"];

async function seedStokGudang(prisma) {
  const gudang = await prisma.gudang.findFirst({ where: { nama_gudang: GUDANG } });
  if (!gudang) {
    console.log(`↷ Seeder stok gudang dilewati: "${GUDANG}" belum ada.`);
    return;
  }

  const zones = await prisma.zona_gudang.findMany({
    where: { gudang_id: gudang.gudang_id },
    select: { zona_id: true, kode_zona: true },
    orderBy: { kode_zona: "asc" },
  });

  if (!zones.length) {
    console.log(`↷ Seeder stok gudang dilewati: "${GUDANG}" belum punya zona.`);
    return;
  }

  const projects = [];
  for (const nama of PROYEK) {
    const project = await prisma.project.findFirst({ where: { nama_project: nama } });
    if (project) projects.push(project);
  }
  if (!projects.length) {
    console.log("↷ Seeder stok gudang dilewati: tidak ada project yang cocok.");
    return;
  }

  const barangs = [];
  for (const kode of BARANG) {
    const barang = await prisma.barang.findFirst({ where: { kode_perangkat: kode } });
    if (barang) barangs.push(barang);
  }
  if (!barangs.length) {
    console.log("↷ Seeder stok gudang dilewati: tidak ada barang yang cocok.");
    return;
  }

  let created = 0;
  let updated = 0;

  for (const project of projects) {
    for (const barang of barangs) {
      for (const zona of zones) {
        for (const kondisi of KONDISI) {
          const existing = await prisma.stok_gudang.findFirst({
            where: {
              gudang_id: gudang.gudang_id,
              zona_id: zona.zona_id,
              barang_id: barang.barang_id,
              project_id: project.project_id,
              kondisi,
            },
            select: { stok_id: true },
          });

          if (existing) {
            await prisma.stok_gudang.update({
              where: { stok_id: existing.stok_id },
              data: { qty: QTY_PER_ZONA, updated_at: new Date() },
            });
            updated++;
          } else {
            await prisma.stok_gudang.create({
              data: {
                gudang_id: gudang.gudang_id,
                zona_id: zona.zona_id,
                barang_id: barang.barang_id,
                project_id: project.project_id,
                kondisi,
                qty: QTY_PER_ZONA,
              },
            });
            created++;
          }
        }
      }
    }
  }

  console.log(
    `✔ Seeded stok_gudang untuk ${GUDANG}: ${barangs.length} barang x ${projects.length} project x ${zones.length} zona x ${KONDISI.length} kondisi @${QTY_PER_ZONA} (created=${created}, updated=${updated})`
  );
}

module.exports = seedStokGudang;