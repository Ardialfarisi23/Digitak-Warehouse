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

  for (const item of data) {
    await prisma.project.create({ data: item });
  }

  console.log(`✔ Seeded ${data.length} project records`);
}

module.exports = seedProjects;
