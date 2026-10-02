async function seedSuratJalan(prisma) {
  const admin = await prisma.user_account.findFirst({ where: { role: "admin_general" } });
  const andi = await prisma.personil.findFirst({ where: { nama: "Andi Pratama" } });
  const budi = await prisma.personil.findFirst({ where: { nama: "Budi Santoso" } });
  const rina = await prisma.personil.findFirst({ where: { nama: "Rina Kartika" } });
  const dedi = await prisma.personil.findFirst({ where: { nama: "Dedi Kurniawan" } });
  const fajar = await prisma.personil.findFirst({ where: { nama: "Fajar Hidayat" } });

  const pickup = await prisma.kendaraan.findFirst({ where: { no_polisi: "D 8345 CD" } });
  const trukBox = await prisma.kendaraan.findFirst({ where: { no_polisi: "Z 8123 AB" } });
  const trukEngkel = await prisma.kendaraan.findFirst({ where: { no_polisi: "Z 8567 EF" } });

  const gudangRancamanyar = await prisma.gudang.findFirst({ where: { nama_gudang: "Gudang Rancamanyar" } });
  const gudangCiamis = await prisma.gudang.findFirst({ where: { nama_gudang: "Gudang Ciamis" } });

  // Setiap surat jalan wajib menunjuk BOQ yang valid. project_id TIDAK lagi
  // di-hardcode via findFirst(nama_project) — nilainya diturunkan dari
  // boq.tiket.project_id supaya surat_jalan dan tiket_material dijamin
  // menunjuk project yang sama (dulu bisa divergen: SJ ke project 1-4,
  // tiket ke project 16-18, sehingga kode_tiket tidak pernah bisa diresolve).
  const boqs = await prisma.boq.findMany({
    include: { tiket: { select: { tiket_id: true, kode_tiket: true, project_id: true } } },
  });

  const boqByKodeTiket = new Map();
  for (const b of boqs) {
    if (b.tiket?.kode_tiket) {
      boqByKodeTiket.set(b.tiket.kode_tiket, b);
    }
  }

  const resolveBoq = (kodeTiket) => {
    const boq = boqByKodeTiket.get(kodeTiket);
    if (!boq) {
      throw new Error(
        `BOQ untuk tiket "${kodeTiket}" tidak ditemukan. Jalankan boq.seed.js lebih dulu.`
      );
    }
    if (!boq.tiket?.project_id) {
      throw new Error(`Tiket "${kodeTiket}" tidak punya project_id yang valid.`);
    }
    return boq;
  };

  const barangKabel = await prisma.barang.findFirst({ where: { kode_perangkat: "CBL-00043" } });
  const barangClosure = await prisma.barang.findFirst({ where: { kode_perangkat: "NWK-00466" } });
  const barangODP = await prisma.barang.findFirst({ where: { kode_perangkat: "NWK-00964" } });
  const barangKabel24 = await prisma.barang.findFirst({ where: { kode_perangkat: "CBL-00461" } });
  const barangPatchcord = await prisma.barang.findFirst({ where: { kode_perangkat: "JTR-02242" } });
  const barangBracket = await prisma.barang.findFirst({ where: { kode_perangkat: "SPP-00100" } });

  const satuanRoll = await prisma.satuan.findFirst({ where: { kode_satuan: "roll" } });
  const satuanPcs = await prisma.satuan.findFirst({ where: { kode_satuan: "pcs" } });
  const satuanMeter = await prisma.satuan.findFirst({ where: { kode_satuan: "meter" } });
  const satuanUnit = await prisma.satuan.findFirst({ where: { kode_satuan: "unit" } });

  // stok_ledger -> surat_jalan_item bersifat required tanpa onDelete cascade,
  // jadi ledger harus dibersihkan lebih dulu agar re-seed tidak kena FK error.
  // (Data ledger development ini di-generate ulang oleh scripts/seed-reports-data.js.)
  await prisma.stok_ledger.deleteMany({});
  await prisma.surat_jalan_item.deleteMany({});
  await prisma.surat_jalan.deleteMany({});

  const suratJalans = [
    {
      nomor_surat_jalan: "SJ-OUT-2026-001",
      tipe: "outbound",
      status: "draft_diajukan",
      tanggal: new Date("2026-08-14T08:00:00"),
      kode_tiket: "TKT-2026-001",
      gudang_asal_id: gudangRancamanyar?.gudang_id,
      gudang_tujuan_id: null,
      kendaraan_id: pickup?.kendaraan_id,
      personil_pengantar_id: andi?.personil_id,
      created_by: admin.user_id,
      updated_by: admin.user_id,
      items: {
        create: [
          {
            barang_id: barangKabel?.barang_id,
            qty: 10,
            satuan_id: satuanRoll?.satuan_id,
            kondisi: "baik",
          },
          {
            barang_id: barangClosure?.barang_id,
            qty: 20,
            satuan_id: satuanPcs?.satuan_id,
            kondisi: "baik",
          },
        ],
      },
    },
    {
      nomor_surat_jalan: "SJ-IN-2026-001",
      tipe: "inbound",
      status: "draft_diajukan",
      tanggal: new Date("2026-08-14T10:00:00"),
      kode_tiket: "TKT-2026-002",
      gudang_asal_id: null,
      gudang_tujuan_id: gudangCiamis?.gudang_id,
      kendaraan_id: trukBox?.kendaraan_id,
      personil_pengantar_id: budi?.personil_id,
      created_by: admin.user_id,
      updated_by: admin.user_id,
      items: {
        create: [
          {
            barang_id: barangODP?.barang_id,
            qty: 15,
            satuan_id: satuanPcs?.satuan_id,
            kondisi: "baik",
          },
          {
            barang_id: barangKabel24?.barang_id,
            qty: 5,
            satuan_id: satuanRoll?.satuan_id,
            kondisi: "baik",
          },
        ],
      },
    },
    {
      nomor_surat_jalan: "SJ-OUT-2026-002",
      tipe: "outbound",
      status: "disetujui",
      tanggal: new Date("2026-08-12T09:00:00"),
      kode_tiket: "TKT-2026-004",
      gudang_asal_id: gudangRancamanyar?.gudang_id,
      gudang_tujuan_id: null,
      kendaraan_id: pickup?.kendaraan_id,
      personil_pengantar_id: rina?.personil_id,
      created_by: admin.user_id,
      updated_by: admin.user_id,
      items: {
        create: [
          {
            barang_id: barangPatchcord?.barang_id,
            qty: 50,
            satuan_id: satuanPcs?.satuan_id,
            kondisi: "baik",
          },
        ],
      },
    },
    {
      nomor_surat_jalan: "SJ-OUT-2026-003",
      tipe: "outbound",
      status: "diterima_didistribusikan",
      tanggal: new Date("2026-08-10T07:30:00"),
      kode_tiket: "TKT-2026-002",
      gudang_asal_id: gudangCiamis?.gudang_id,
      gudang_tujuan_id: null,
      kendaraan_id: trukEngkel?.kendaraan_id,
      personil_pengantar_id: dedi?.personil_id,
      created_by: admin.user_id,
      updated_by: admin.user_id,
      items: {
        create: [
          {
            barang_id: barangBracket?.barang_id,
            qty: 100,
            satuan_id: satuanPcs?.satuan_id,
            kondisi: "baik",
          },
          {
            barang_id: barangKabel?.barang_id,
            qty: 3,
            satuan_id: satuanRoll?.satuan_id,
            kondisi: "baik",
          },
        ],
      },
    },
    {
      nomor_surat_jalan: "SJ-IN-2026-002",
      tipe: "inbound",
      status: "digenerate",
      tanggal: new Date("2026-08-11T11:00:00"),
      kode_tiket: "TKT-2026-003",
      gudang_asal_id: null,
      gudang_tujuan_id: gudangRancamanyar?.gudang_id,
      kendaraan_id: trukBox?.kendaraan_id,
      personil_pengantar_id: andi?.personil_id,
      created_by: admin.user_id,
      updated_by: admin.user_id,
      items: {
        create: [
          {
            barang_id: barangODP?.barang_id,
            qty: 8,
            satuan_id: satuanUnit?.satuan_id,
            kondisi: "baik",
          },
        ],
      },
    },
    {
      nomor_surat_jalan: "SJ-OUT-2026-004",
      tipe: "outbound",
      status: "draft_diajukan",
      tanggal: new Date("2026-08-09T13:00:00"),
      kode_tiket: "TKT-2026-009",
      gudang_asal_id: gudangRancamanyar?.gudang_id,
      gudang_tujuan_id: null,
      kendaraan_id: pickup?.kendaraan_id,
      personil_pengantar_id: fajar?.personil_id,
      created_by: admin.user_id,
      updated_by: admin.user_id,
      items: {
        create: [
          {
            barang_id: barangClosure?.barang_id,
            qty: 5,
            satuan_id: satuanPcs?.satuan_id,
            kondisi: "rusak_ringan",
          },
        ],
      },
    },
  ];

  for (const sj of suratJalans) {
    // `kode_tiket` hanya penanda di seeder (bukan kolom surat_jalan) -> dikeluarkan
    // dari payload, lalu diterjemahkan menjadi boq_id + project_id.
    const { kode_tiket, ...payload } = sj;
    const boq = resolveBoq(kode_tiket);

    const created = await prisma.surat_jalan.create({
      data: {
        ...payload,
        boq_id: boq.boq_id,
        project_id: boq.tiket.project_id,
      },
      include: {
        items: true,
        project: true,
        gudang_asal: true,
        gudang_tujuan: true,
        kendaraan: true,
        personil_pengantar: true,
        boq: { include: { tiket: { select: { kode_tiket: true } } } },
      },
    });

    console.log(
      `✔ Surat Jalan ${created.nomor_surat_jalan} (${created.tipe}/${created.status}) ` +
        `→ boq_id=${created.boq_id}, tiket=${created.boq?.tiket?.kode_tiket}, ` +
        `project=${created.project?.nama_project} (id=${created.project_id})`
    );
  }

  console.log(`✔ Seeded ${suratJalans.length} surat jalan records`);
}

module.exports = seedSuratJalan;
