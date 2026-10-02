async function seedProjects(prisma) {
  const admin = await prisma.user_account.findFirst({ where: { role: "admin_general" } });

  const data = [
    {
      nama_project: "FTTH Rancamanyar Tahap 1",
      title: "Pembangunan Jaringan FTTH Rancamanyar",
      cluster_id: "CL001",
      area: "Bandung",
      klien: "Rancamanyar",
      kecamatan: "Baleendah",
      desa_kelurahan: "Rancamanyar",
      kota_kabupaten: "Kabupaten Bandung",
      provinsi: "Jawa Barat",
      status_aktif: true,
      created_by: admin.user_id,
      updated_by: admin.user_id,
    },
    {
      nama_project: "FTTH Ciamis Area Utara",
      title: "Pengembangan Jaringan Fiber Optik Ciamis",
      cluster_id: "CL002",
      area: "Ciamis",
      klien: "Ciamis",
      kecamatan: "Ciamis",
      desa_kelurahan: "Ciamis",
      kota_kabupaten: "Kabupaten Ciamis",
      provinsi: "Jawa Barat",
      status_aktif: true,
      created_by: admin.user_id,
      updated_by: admin.user_id,
    },
    {
      nama_project: "Backbone Garut Selatan",
      title: "Modernisasi Infrastruktur Telekomunikasi Garut",
      cluster_id: "CL003",
      area: "Garut",
      klien: "Garut",
      kecamatan: "Tarogong Kidul",
      desa_kelurahan: "Haurpanggung",
      kota_kabupaten: "Kabupaten Garut",
      provinsi: "Jawa Barat",
      status_aktif: true,
      created_by: admin.user_id,
      updated_by: admin.user_id,
    },
    {
      nama_project: "FTTH Sumedang Kota",
      title: "Instalasi Fiber Optik Sumedang",
      cluster_id: "CL004",
      area: "Sumedang",
      klien: "Sumedang",
      kecamatan: "Sumedang Utara",
      desa_kelurahan: "Kotakulon",
      kota_kabupaten: "Kabupaten Sumedang",
      provinsi: "Jawa Barat",
      status_aktif: true,
      created_by: admin.user_id,
      updated_by: admin.user_id,
    },
    {
      nama_project: "FTTH Tasikmalaya Timur",
      title: "Perluasan Jaringan Internet Tasikmalaya",
      cluster_id: "CL005",
      area: "Tasikmalaya",
      klien: "Tasikmalaya",
      kecamatan: "Cibeureum",
      desa_kelurahan: "Setiajaya",
      kota_kabupaten: "Kota Tasikmalaya",
      provinsi: "Jawa Barat",
      status_aktif: true,
      created_by: admin.user_id,
      updated_by: admin.user_id,
    },
  ];

  // Idempotent: project tidak punya unique constraint di schema, jadi dedup manual
  // berdasarkan nama_project. Baris yang sudah ada di-update (tidak dihapus) supaya
  // project_id existing tetap stabil dan referensi tiket/surat_jalan tidak putus.
  // Ini yang mencegah project duplikat menumpuk setiap kali seeder dijalankan ulang.
  for (const item of data) {
    const existing = await prisma.project.findFirst({
      where: { nama_project: item.nama_project },
      orderBy: { project_id: "asc" },
      select: { project_id: true },
    });

    if (existing) {
      const { created_by, ...updatable } = item;
      await prisma.project.update({
        where: { project_id: existing.project_id },
        data: updatable,
      });
      console.log(`↻ Project "${item.nama_project}" (id=${existing.project_id}) diperbarui.`);
    } else {
      const created = await prisma.project.create({ data: item });
      console.log(`✔ Project "${item.nama_project}" (id=${created.project_id}) dibuat.`);
    }
  }

  console.log(`✔ Seeded ${data.length} project records`);
}

module.exports = seedProjects;
