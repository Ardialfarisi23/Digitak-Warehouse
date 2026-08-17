const bcrypt = require("bcrypt");

async function seedPersonnel(prisma) {
  const users = [
    {
      nama: "Ahmad Fauzi",
      email: "admin@digitakgudang.com",
      password: "admin123",
      role: "admin_general",
      no_hp: "081234567801",
      nik: "3201010101010001",
      posisi: "Admin",
      jenis: "admin_gudang",
      bisa_menyetir: true,
      is_material_handler: false,
    },
    {
      nama: "Budi Santoso",
      email: "budi.santoso@digitakgudang.com",
      password: "supervisor123",
      role: "supervisor",
      no_hp: "081234567802",
      nik: "3201010101010002",
      posisi: "Supervisor",
      jenis: "teknisi",
      bisa_menyetir: true,
      is_material_handler: false,
    },
    {
      nama: "Rina Kartika",
      email: "rina.kartika@digitakgudang.com",
      password: "rina123",
      role: "supervisor",
      no_hp: "081234567803",
      nik: "3201010101010003",
      posisi: "Supervisor",
      jenis: "teknisi",
      bisa_menyetir: true,
      is_material_handler: false,
    },
    {
      nama: "Dedi Kurniawan",
      email: "dedi.kurniawan@digitakgudang.com",
      password: "dedi123",
      role: "supervisor",
      no_hp: "081234567804",
      nik: "3201010101010004",
      posisi: "Supervisor",
      jenis: "teknisi",
      bisa_menyetir: true,
      is_material_handler: true,
    },
    {
      nama: "Andi Pratama",
      email: "andi.pratama@digitakgudang.com",
      password: "andi123",
      role: "staf_gudang",
      no_hp: "081234567805",
      nik: "3201010101010005",
      posisi: "Staff Gudang",
      jenis: "teknisi",
      bisa_menyetir: true,
      is_material_handler: true,
    },
    {
      nama: "Fajar Hidayat",
      email: "fajar.hidayat@digitakgudang.com",
      password: "fajar123",
      role: "staf_gudang",
      no_hp: "081234567806",
      nik: "3201010101010006",
      posisi: "Staff Gudang",
      jenis: "teknisi",
      bisa_menyetir: true,
      is_material_handler: true,
    },
    {
      nama: "Siti Nurhaliza",
      email: "siti.nurhaliza@digitakgudang.com",
      password: "siti123",
      role: "staf_gudang",
      no_hp: "081234567807",
      nik: "3201010101010007",
      posisi: "Staff Gudang",
      jenis: "teknisi",
      bisa_menyetir: false,
      is_material_handler: true,
    },
    {
      nama: "Rizky Maulana",
      email: "rizky.maulana@digitakgudang.com",
      password: "rizky123",
      role: "staf_gudang",
      no_hp: "081234567808",
      nik: "3201010101010008",
      posisi: "Staff Gudang",
      jenis: "teknisi",
      bisa_menyetir: true,
      is_material_handler: true,
    },
    {
      nama: "Yoga Saputra",
      email: "yoga.saputra@digitakgudang.com",
      password: "yoga123",
      role: "staf_gudang",
      no_hp: "081234567809",
      nik: "3201010101010009",
      posisi: "Staff Gudang",
      jenis: "teknisi",
      bisa_menyetir: true,
      is_material_handler: true,
    },
    {
      nama: "Taufik Hidayat",
      email: "taufik.hidayat@digitakgudang.com",
      password: "taufik123",
      role: "staf_gudang",
      no_hp: "081234567810",
      nik: "3201010101010010",
      posisi: "Staff Gudang",
      jenis: "teknisi",
      bisa_menyetir: false,
      is_material_handler: true,
    },
    {
      nama: "Indra Gunawan",
      email: "indra.gunawan@digitakgudang.com",
      password: "indra123",
      role: "staf_gudang",
      no_hp: "081234567811",
      nik: "3201010101010011",
      posisi: "Staff Gudang",
      jenis: "teknisi",
      bisa_menyetir: true,
      is_material_handler: true,
    },
    {
      nama: "Putri Maharani",
      email: "putri.maharani@digitakgudang.com",
      password: "putri123",
      role: "staf_gudang",
      no_hp: "081234567812",
      nik: "3201010101010012",
      posisi: "Staff Gudang",
      jenis: "teknisi",
      bisa_menyetir: false,
      is_material_handler: false,
    },
    {
      nama: "Eko Prasetyo",
      email: "eko.prasetyo@digitakgudang.com",
      password: "eko123",
      role: "staf_gudang",
      no_hp: "081234567813",
      nik: "3201010101010013",
      posisi: "Staff Gudang",
      jenis: "teknisi",
      bisa_menyetir: true,
      is_material_handler: true,
    },
    {
      nama: "Wahyu Firmansyah",
      email: "wahyu.firmansyah@digitakgudang.com",
      password: "wahyu123",
      role: "staf_gudang",
      no_hp: "081234567814",
      nik: "3201010101010014",
      posisi: "Staff Gudang",
      jenis: "teknisi",
      bisa_menyetir: true,
      is_material_handler: true,
    },
    {
      nama: "Nanda Permata",
      email: "nanda.permata@digitakgudang.com",
      password: "nanda123",
      role: "staf_gudang",
      no_hp: "081234567815",
      nik: "3201010101010015",
      posisi: "Staff Gudang",
      jenis: "teknisi",
      bisa_menyetir: false,
      is_material_handler: false,
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);

    // =========================
    // 1. USER ACCOUNT
    // =========================
    const user = await prisma.user_account.upsert({
      where: {
        email: u.email,
      },
      update: {
        nama: u.nama,
        password_hash: passwordHash,
        role: u.role,
        is_aktif: true,
        updated_at: new Date(),
      },
      create: {
        nama: u.nama,
        email: u.email,
        password_hash: passwordHash,
        role: u.role,
        is_aktif: true,
      },
    });

    // =========================
    // 2. PERSONIL
    // =========================
    await prisma.personil.upsert({
      where: {
        user_id: user.user_id,
      },

      update: {
        nama: u.nama,
        jenis: u.jenis,
        no_hp: u.no_hp,
        nik: u.nik,
        email: u.email,
        posisi: u.posisi,
        bisa_menyetir: u.bisa_menyetir,
        is_material_handler: u.is_material_handler,
        is_dummy: false,
        updated_by: user.user_id,
        updated_at: new Date(),
      },

      create: {
        nama: u.nama,
        jenis: u.jenis,
        no_hp: u.no_hp,
        nik: u.nik,
        email: u.email,
        posisi: u.posisi,
        bisa_menyetir: u.bisa_menyetir,
        is_material_handler: u.is_material_handler,
        user_id: user.user_id,
        is_dummy: false,
        created_by: user.user_id,
        updated_by: user.user_id,
      },
    });
  }

  console.log(
    `✔ Seeded ${users.length} user_account + ${users.length} personil`
  );
}

module.exports = seedPersonnel;