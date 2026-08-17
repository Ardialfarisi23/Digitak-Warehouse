async function seedVehicles(prisma) {
  const admin = await prisma.user_account.findFirst({ where: { role: "admin_general" } });

  const data = [
    { no_polisi: "Z 8123 AB", jenis_kendaraan: "Truk Box", merk: "Mitsubishi Canter", kapasitas_angkut: 5000, keterangan: "Kendaraan distribusi barang ke pelanggan", created_by: admin.user_id, updated_by: admin.user_id },
    { no_polisi: "D 8345 CD", jenis_kendaraan: "Pickup", merk: "Suzuki Carry", kapasitas_angkut: 1000, keterangan: "Kendaraan operasional pengiriman dalam kota", created_by: admin.user_id, updated_by: admin.user_id },
    { no_polisi: "FL-001", jenis_kendaraan: "Forklift", merk: "Toyota", kapasitas_angkut: 3000, keterangan: "Digunakan untuk bongkar muat dan pemindahan pallet di gudang", created_by: admin.user_id, updated_by: admin.user_id },
    { no_polisi: "Z 8567 EF", jenis_kendaraan: "Truk Engkel", merk: "Hino Dutro", kapasitas_angkut: 4000, keterangan: "Distribusi barang antargudang dan antarkota", created_by: admin.user_id, updated_by: admin.user_id },
    { no_polisi: "D 1234 GH", jenis_kendaraan: "Mobil Operasional", merk: "Toyota Avanza", kapasitas_angkut: 500, keterangan: "Kendaraan supervisor untuk inspeksi gudang dan operasional", created_by: admin.user_id, updated_by: admin.user_id },
  ];

  for (const item of data) {
    await prisma.kendaraan.upsert({
      where: { no_polisi: item.no_polisi },
      update: item,
      create: item,
    });
  }

  console.log(`✔ Seeded ${data.length} vehicle records`);
}

module.exports = seedVehicles;
