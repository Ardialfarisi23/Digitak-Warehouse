async function seedBoq(prisma) {
  const admin = await prisma.user_account.findFirst({ where: { role: "admin_general" } });
  const supervisor = await prisma.user_account.findFirst({ where: { role: "supervisor" } });

  await prisma.boq_item.deleteMany({});
  await prisma.boq.deleteMany({});
  await prisma.permintaan_boq.deleteMany({});
  await prisma.tiket_material.deleteMany({});

  // Ambil project terurut project_id ASC dan pakai match PERTAMA per nama.
  // Sebelumnya `new Map(projects.map(...))` membuat duplikat nama menang-terakhir
  // (project_id tinggi), sementara surat-jalan.seed.js pakai findFirst (project_id
  // terendah) -> tiket & surat_jalan berakhir di project yang berbeda dan tidak
  // pernah beririsan.
  const projects = await prisma.project.findMany({ orderBy: { project_id: "asc" } });
  const projectMap = new Map();
  for (const p of projects) {
    if (!projectMap.has(p.nama_project)) {
      projectMap.set(p.nama_project, p.project_id);
    }
  }

  const resolveProjectId = (namaProject) => {
    const id = projectMap.get(namaProject);
    if (!id) {
      throw new Error(
        `Project "${namaProject}" tidak ditemukan. Jalankan project.seed.js lebih dulu.`
      );
    }
    return id;
  };

  const barangs = await prisma.barang.findMany();
  const barangMap = new Map(barangs.map((b) => [b.kode_perangkat, b.barang_id]));

  const gudangs = await prisma.gudang.findMany();
  const gudangMap = new Map(gudangs.map((g) => [g.nama_gudang, g.gudang_id]));

  const satuanMap = new Map();
  const allSatuan = await prisma.satuan.findMany();
  for (const s of allSatuan) {
    satuanMap.set(s.kode_satuan, s.satuan_id);
  }

  const tiketMap = new Map();

  const boqs = [
    {
      kode_tiket: "TKT-2026-001",
      nama_project: "FTTH Rancamanyar Tahap 1",
      area: "Bandung",
      status: "draft",
      items: [
        { kode_perangkat: "CBL-00043", qty: 20, satuan: "roll", gudang: "Gudang Rancamanyar" },
        { kode_perangkat: "NWK-00466", qty: 10, satuan: "pcs", gudang: "Gudang Rancamanyar" },
        { kode_perangkat: "SPP-00100", qty: 50, satuan: "meter", gudang: "Gudang Rancamanyar" },
      ],
    },
    {
      kode_tiket: "TKT-2026-002",
      nama_project: "FTTH Ciamis Area Utara",
      area: "Ciamis",
      status: "aktif",
      items: [
        { kode_perangkat: "CBL-00461", qty: 30, satuan: "roll", gudang: "Gudang Ciamis" },
        { kode_perangkat: "JTR-02242", qty: 100, satuan: "pcs", gudang: "Gudang Ciamis" },
      ],
    },
    {
      kode_tiket: "TKT-2026-003",
      nama_project: "Backbone Garut Selatan",
      area: "Garut",
      status: "draft",
      items: [{ kode_perangkat: "JTR-02242", qty: 5, satuan: "meter", gudang: "Gudang Rancamanyar" }],
    },
    {
      kode_tiket: "TKT-2026-004",
      nama_project: "FTTH Rancamanyar Tahap 1",
      area: "Bandung",
      status: "aktif",
      items: [
        { kode_perangkat: "NWK-00964", qty: 25, satuan: "meter", gudang: "Gudang Rancamanyar" },
        { kode_perangkat: "CBL-00043", qty: 15, satuan: "unit", gudang: "Gudang Rancamanyar" },
      ],
    },
    {
      // Ditambahkan supaya SJ-OUT-2026-004 (project Sumedang) punya BOQ/tiket
      // sendiri dan tidak perlu dipindah project-nya.
      kode_tiket: "TKT-2026-009",
      nama_project: "FTTH Sumedang Kota",
      area: "Sumedang",
      status: "aktif",
      items: [
        { kode_perangkat: "NWK-00466", qty: 10, satuan: "pcs", gudang: "Gudang Rancamanyar" },
      ],
    },
  ];

  for (const boq of boqs) {
    const tiket = await prisma.tiket_material.create({
      data: {
        kode_tiket: boq.kode_tiket,
        project_id: resolveProjectId(boq.nama_project),
        area: boq.area,
        created_by: admin.user_id,
      },
    });
    tiketMap.set(boq.kode_tiket, tiket.tiket_id);

    const createdBoq = await prisma.boq.create({
      data: {
        tiket_id: tiket.tiket_id,
        status: boq.status,
        tanggal_aktivasi: boq.status === "aktif" ? new Date() : null,
        diaktifkan_oleh: boq.status === "aktif" ? admin.user_id : null,
        created_by: admin.user_id,
        updated_by: admin.user_id,
        items: {
          create: boq.items.map((item) => ({
            barang_id: barangMap.get(item.kode_perangkat),
            qty_rencana: item.qty,
            satuan_id: satuanMap.get(item.satuan),
            gudang_tujuan_id: gudangMap.get(item.gudang),
          })),
        },
      },
    });

    console.log(`✔ BOQ ${boq.kode_tiket} (${boq.status}) berhasil dibuat.`);
  }

  const permintaanBoqs = [
    {
      kode_tiket: "TKT-2026-005",
      nama_project: "FTTH Rancamanyar Tahap 1",
      kode_perangkat: "NWK-00964",
      qty: 5,
      alasan: "Kebutuhan tambahan untuk proyek pengembangan jaringan",
      status: "diajukan",
      diajukan_oleh: supervisor ? supervisor.user_id : admin.user_id,
    },
    {
      kode_tiket: "TKT-2026-006",
      nama_project: "FTTH Ciamis Area Utara",
      kode_perangkat: "NWK-00964",
      qty: 2,
      alasan: "Pengganti perangkat yang rusak di site klien",
      status: "disetujui",
      diajukan_oleh: supervisor ? supervisor.user_id : admin.user_id,
      ditinjau_oleh: admin.user_id,
    },
  ];

  for (const req of permintaanBoqs) {
    const tiket = await prisma.tiket_material.create({
      data: {
        kode_tiket: req.kode_tiket,
        project_id: resolveProjectId(req.nama_project),
        area: "Bandung",
        created_by: admin.user_id,
      },
    });

    await prisma.permintaan_boq.create({
      data: {
        project_id: resolveProjectId(req.nama_project),
        tiket_id: tiket.tiket_id,
        barang_id: barangMap.get(req.kode_perangkat),
        qty_usulan: req.qty,
        alasan: req.alasan,
        status: req.status,
        diajukan_oleh: req.diajukan_oleh,
        ditinjau_oleh: req.ditinjau_oleh,
      },
    });

    console.log(`✔ Permintaan BOQ ${req.kode_tiket} (${req.status}) berhasil dibuat.`);
  }

  // --- TAMBAHAN UNTUK TESTING ---
  // Sengaja membuat tiket yang tidak punya BOQ agar bisa dipilih di dropdown frontend
  const tiketKosong = [
    {
      kode_tiket: "TKT-2026-007",
      nama_project: "FTTH Rancamanyar Tahap 1",
      area: "Bandung",
    },
    {
      kode_tiket: "TKT-2026-008",
      nama_project: "Backbone Garut Selatan",
      area: "Garut",
    },
  ];

  for (const t of tiketKosong) {
    // Validasi projectMap supaya aman jika data project berbeda
    if (projectMap.has(t.nama_project)) {
      await prisma.tiket_material.create({
        data: {
          kode_tiket: t.kode_tiket,
          project_id: projectMap.get(t.nama_project),
          area: t.area,
          created_by: admin.user_id,
        },
      });
      console.log(`✔ Tiket kosong ${t.kode_tiket} berhasil dibuat untuk testing form UI.`);
    }
  }

  console.log(`✔ Seeded ${boqs.length} BOQ records dan tiket tambahan untuk testing.`);
}

module.exports = seedBoq;
