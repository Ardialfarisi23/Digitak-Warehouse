async function seedItems(prisma) {
  const admin = await prisma.user_account.findFirst({ where: { role: "admin_general" } });

  const categories = [
    { nama_kategori: "Kabel & Aksesoris", is_kritis: false },
    { nama_kategori: "Networking", is_kritis: true },
    { nama_kategori: "Server", is_kritis: true },
    { nama_kategori: "Storage", is_kritis: true },
    { nama_kategori: "Power/UPS", is_kritis: true },
    { nama_kategori: "Endpoint/Laptop", is_kritis: false },
  ];

  const categoryMap = new Map();
  for (const cat of categories) {
    const created = await prisma.kategori_barang.upsert({
      where: { nama_kategori: cat.nama_kategori },
      update: cat,
      create: cat,
    });
    categoryMap.set(created.nama_kategori, created.kategori_id);
  }

  const units = [
    { kode_satuan: "pcs" },
    { kode_satuan: "roll" },
    { kode_satuan: "meter" },
    { kode_satuan: "unit" },
    { kode_satuan: "box" },
  ];

  const unitMap = new Map();
  for (const u of units) {
    const created = await prisma.satuan.upsert({
      where: { kode_satuan: u.kode_satuan },
      update: u,
      create: u,
    });
    unitMap.set(created.kode_satuan, created.satuan_id);
  }

  const items = [
    { kode_perangkat: "[01-013-13103]", nama_barang: "TIANG 7 METER - 3\" OD.90 X 2.8 X 7000", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "[01-013-13104]", nama_barang: "TIANG 6 METER - 2\" OD.57 X 1.5 X 6000", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "NWK-00468", nama_barang: "CLOSURE DACK 288 CORE FIBERTRON (LOGO)", kategori: "Networking", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "NWK-00466", nama_barang: "CLOSURE DACK 144 CORE FIBERTRON (LOGO)", kategori: "Networking", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "[01-013-00010]", nama_barang: "24 CORE 4 FRP MICRO CABLE", kategori: "Kabel & Aksesoris", satuan: "meter", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CBL-00043", nama_barang: "KABEL FO 48 CORE ZTT 2024", kategori: "Kabel & Aksesoris", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "[01-013-00406]", nama_barang: "KABEL FO 48 CORE- 8 T 2023", kategori: "Kabel & Aksesoris", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "[01-013-00344]", nama_barang: "KABEL FO 48 CORE- 4 T 2023", kategori: "Kabel & Aksesoris", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CBL-00461", nama_barang: "KABEL FO 24/2T ZTT 2024", kategori: "Kabel & Aksesoris", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CBL-00465", nama_barang: "KABEL FO 144C/12T ZTT 2024", kategori: "Kabel & Aksesoris", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "10001296", nama_barang: "KABEL FO 96C/8T ZTT 2024", kategori: "Kabel & Aksesoris", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "01-013-01273", nama_barang: "KABEL FO 96/8T ZTT 2022", kategori: "Kabel & Aksesoris", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "01-013-06350", nama_barang: "KABEL FO 96C/8T Stralight 2025", kategori: "Kabel & Aksesoris", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CPT-00620", nama_barang: "BRACKET TIANG DROP WIRE", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CPT-00623", nama_barang: "BRACKET TIANG FLEXIBEL BEHEL PER (BRACKET C)", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "29000001", nama_barang: "Strength Clamp Buaya 50/70", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "29000002", nama_barang: "Strength Clamp Buaya 70/95", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CBL-00215", nama_barang: "KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 50 METER", kategori: "Kabel & Aksesoris", satuan: "unit", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CBL-00225", nama_barang: "KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 75 METER", kategori: "Kabel & Aksesoris", satuan: "unit", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CBL-00220", nama_barang: "KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 100 METER", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CBL-00223", nama_barang: "KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 150 METER", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CBL-00226", nama_barang: "KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 200 METER", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CBL-00229", nama_barang: "KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 250 METER", kategori: "Kabel & Aksesoris", satuan: "meter", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CBL-00231", nama_barang: "KABEL DROPCORE PRECON 1 CORE 3 SELING SC/UPC-SC/UPC 300 METER", kategori: "Kabel & Aksesoris", satuan: "meter", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "SPP-00100", nama_barang: "BRACKET X-FRAME BEHEL MINI 12X40X40 (HITAM-MERAH)", kategori: "Kabel & Aksesoris", satuan: "meter", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CPT-00655", nama_barang: "BRACKET X-FRAME BEHEL 12X65X65", kategori: "Kabel & Aksesoris", satuan: "unit", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CPT-00630", nama_barang: "BRACKET COILAN X-FRAME (BESAR 4 PER)", kategori: "Kabel & Aksesoris", satuan: "unit", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "90000151", nama_barang: "BRACKET SALIB BARU", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CPT-00718", nama_barang: "DUDUKAN CLOUSURE BRACKET COILAN X-FRAME (MODEL BARU)", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CPT-00914", nama_barang: "MUR + BAUT STENLIS M10 - 1.5 X 45", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "01-013-03083", nama_barang: "MUR + BAUT STENLIS M08 - 1.25 X 80", kategori: "Kabel & Aksesoris", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "GT0000100", nama_barang: "ODP Boxes 16 port with 1:8 PLC Splitter including accessories but without connector and adapter", kategori: "Networking", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "GT0000201M", nama_barang: "Outdoor Connector with SC/UPC adapter, magenta color", kategori: "Networking", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "GT0000201S", nama_barang: "Outdoor Connector with SC/UPC adapter, silver color", kategori: "Networking", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "NWK-00964", nama_barang: "ODP 10 PORT WITH 8PCS SC UPC ADAPTER AND OUTDOOR CONNECTOR", kategori: "Networking", satuan: "meter", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "01-013-00225", nama_barang: "1:8 balanced PLC Splitter SC/UPC,G657A2,0.9mm,0.6m", kategori: "Networking", satuan: "meter", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "01-013-00004", nama_barang: "1*8 PLC SPLITTER 1:8", kategori: "Networking", satuan: "meter", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "00-013-13404", nama_barang: "1:8 balanced PLC Splitter SC/UPC,G657A2,0.9mm,0.6m WITH CONNECTOR INPUT", kategori: "Networking", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "JTR-02242", nama_barang: "PATCHCORD LC/UPC - SC/UPC 3 METER ( Simplex )", kategori: "Networking", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "In MSP", nama_barang: "Precon 3m (Produksi in-House MSP)", kategori: "Kabel & Aksesoris", satuan: "unit", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "01-013-00587", nama_barang: "Outdoor Connector With SC/UPC Adapter, green color", kategori: "Networking", satuan: "unit", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "[01-013-11630]", nama_barang: "STAINLESS BELT NON MAGNET", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "[01-013-01157]", nama_barang: "STOPPING BUCKLER", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "[01-013-08487]", nama_barang: "CLAMP DROP WIRE ( S CLAMP )", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "01-013-00033", nama_barang: "ADAPTER LC/UPC DUPLEX AUTO SHUTTER", kategori: "Networking", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "JTR-02154", nama_barang: "OTB RACK PAZ 48 core LC/UPC", kategori: "Networking", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CPT-00671", nama_barang: "CABLE MANAGEMENT METAL 1U ( CCM-M1U-BLK )", kategori: "Kabel & Aksesoris", satuan: "roll", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "90000156", nama_barang: "KSS Spiral Wrapping Band KS-6BK Hitam 10m", kategori: "Kabel & Aksesoris", satuan: "unit", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CPT-00674", nama_barang: "CAGE NUT MUR + RING 6", kategori: "Kabel & Aksesoris", satuan: "unit", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CPT-00753", nama_barang: "FLEXIBLE WP 1/2\" INCH", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "JTR-02401", nama_barang: "PIGTAIL LC/UPC", kategori: "Networking", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "01-013-13101", nama_barang: "TIANG 9 METER - 3\" OD.90 X 2.8 X 9000", kategori: "Kabel & Aksesoris", satuan: "meter", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "29000006", nama_barang: "HOSE CLAMP/KLEM SELANG 1 1/2 INCH [25-38mm]", kategori: "Kabel & Aksesoris", satuan: "meter", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "90000163", nama_barang: "Nylon Cable Tie 3.6x300mm Hitam", kategori: "Kabel & Aksesoris", satuan: "meter", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "CPT-00533", nama_barang: "Pipa Pralon 1,5inch", kategori: "Kabel & Aksesoris", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
    { kode_perangkat: "[01-013-03725]", nama_barang: "PLC SPLITTER 1X8 SC/UPC", kategori: "Networking", satuan: "pcs", created_by: admin.user_id, updated_by: admin.user_id },
  ];

  for (const item of items) {
    await prisma.barang.upsert({
      where: { kode_perangkat: item.kode_perangkat },
      update: {
        kode_perangkat: item.kode_perangkat,
        nama_barang: item.nama_barang,
        kategori_id: categoryMap.get(item.kategori),
        satuan_default_id: unitMap.get(item.satuan),
        created_by: item.created_by,
        updated_by: item.updated_by,
      },
      create: {
        kode_perangkat: item.kode_perangkat,
        nama_barang: item.nama_barang,
        kategori_id: categoryMap.get(item.kategori),
        satuan_default_id: unitMap.get(item.satuan),
        created_by: item.created_by,
        updated_by: item.updated_by,
      },
    });
  }

  console.log(`✔ Seeded ${items.length} item records`);
}

module.exports = seedItems;
