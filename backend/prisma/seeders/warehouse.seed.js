async function seedWarehouses(prisma) {
  const admin = await prisma.user_account.findFirst({ where: { role: "admin_general" } });

  const andi = await prisma.personil.findFirst({ where: { nama: "Andi Pratama" } });
  const budi = await prisma.personil.findFirst({ where: { nama: "Budi Santoso" } });

  const gudangData = [
    {
      nama_gudang: "Gudang Rancamanyar",
      tipe: "tetap",
      alamat: "Jl. Rancamanyar Utama No. 15, Rancamanyar, Baleendah, Kabupaten Bandung",
      latitude: "-69.987",
      longitude: "1076248",
      keterangan: "Gudang utama untuk penyimpanan",
      pic_id: andi?.personil_id || null,
      is_aktif: true,
      created_by: admin.user_id,
      updated_by: admin.user_id,
    },
    {
      nama_gudang: "Gudang Ciamis",
      tipe: "tetap",
      alamat: "Jl. Jenderal Sudirman No. 88, Ciamis, Kabupaten Ciamis",
      latitude: "-73.266",
      longitude: "1083538",
      keterangan: "Gudang cabang untuk distribusi",
      pic_id: budi?.personil_id || null,
      is_aktif: true,
      created_by: admin.user_id,
      updated_by: admin.user_id,
    },
  ];

  const seededGudangs = [];
  for (const item of gudangData) {
    const existing = await prisma.gudang.findFirst({ where: { nama_gudang: item.nama_gudang } });
    if (existing) {
      const updated = await prisma.gudang.update({
        where: { gudang_id: existing.gudang_id },
        data: item,
      });
      seededGudangs.push(updated);
    } else {
      const created = await prisma.gudang.create({ data: item });
      seededGudangs.push(created);
    }
  }

  const zonaLayout = [
    { kode_zona: "A", nama_zona: "Zona A", tipe_zona: "Indoor", status_kecukupan: "CUKUP", utilisasi_persen: 0 },
    { kode_zona: "B", nama_zona: "Zona B", tipe_zona: "Indoor", status_kecukupan: "CUKUP", utilisasi_persen: 0 },
    { kode_zona: "C", nama_zona: "Zona C", tipe_zona: "Outdoor", status_kecukupan: "CUKUP", utilisasi_persen: 0 },
    { kode_zona: "D", nama_zona: "Zona D", tipe_zona: "Outdoor", status_kecukupan: "CUKUP", utilisasi_persen: 0 },
  ];

  for (const gudang of seededGudangs) {
    for (const zona of zonaLayout) {
      const existingZona = await prisma.zona_gudang.findFirst({
        where: {
          gudang_id: gudang.gudang_id,
          kode_zona: zona.kode_zona,
        },
      });

      if (existingZona) {
        await prisma.zona_gudang.update({
          where: { zona_id: existingZona.zona_id },
          data: {
            nama_zona: zona.nama_zona,
            tipe_zona: zona.tipe_zona,
            status_kecukupan: zona.status_kecukupan,
            utilisasi_persen: zona.utilisasi_persen,
          },
        });
      } else {
        await prisma.zona_gudang.create({
          data: {
            gudang_id: gudang.gudang_id,
            kode_zona: zona.kode_zona,
            nama_zona: zona.nama_zona,
            tipe_zona: zona.tipe_zona,
            status_kecukupan: zona.status_kecukupan,
            utilisasi_persen: zona.utilisasi_persen,
          },
        });
      }
    }
  }

  console.log(`✔ Seeded ${seededGudangs.length} warehouse records with ${zonaLayout.length} zones each`);
}

module.exports = seedWarehouses;
