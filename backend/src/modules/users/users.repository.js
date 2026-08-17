const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

const ALLOWED_SORT_FIELDS = [
  "user_id",
  "nama",
  "email",
  "role",
  "is_aktif",
  "created_at",
  "updated_at",
];

/* =========================================================
   RELASI USER
========================================================= */

const userInclude = {
  personils: {
    select: {
      personil_id: true,
      foto: true,
      nama: true,
      no_hp: true,
      nik: true,
      email: true,
      posisi: true,
      gudang_id: true,
      gudang: {
        select: {
          gudang_id: true,
          nama_gudang: true,
          tipe: true,
          alamat: true,
          is_aktif: true,
        },
      },
      gudang_pics: {
        select: {
          gudang_id: true,
          nama_gudang: true,
          tipe: true,
          alamat: true,
          is_aktif: true,
        },
        where: {
          is_aktif: true,
        },
      },
    },
  },
};

/* =========================================================
   HELPER BIGINT
========================================================= */

const toStringOrNull = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toString();
};

/* =========================================================
   HELPER MAPPING ROLE -> PERSONIL
========================================================= */

/*
 * Tabel personil mewajibkan field "jenis" (enum personil_jenis:
 * teknisi | admin_gudang | pengantar_logistik).
 * Kita turunkan otomatis dari role user, supaya form
 * "Tambah Pengguna" tidak perlu minta input tambahan.
 */
const roleToJenis = (role) => {
  if (role === "admin_general") {
    return "admin_gudang";
  }

  return "teknisi";
};

const roleToPosisi = (role) => {
  switch (role) {
    case "admin_general":
      return "Admin";

    case "supervisor":
      return "Supervisor";

    case "staf_gudang":
      return "Staff Gudang";

    default:
      return null;
  }
};

/* =========================================================
   FORMAT USER
========================================================= */

/**
 * Format data user dari database agar sesuai
 * dengan kebutuhan frontend.
 *
 * Struktur utama yang dikirim ke frontend:
 *
 * user_id
 * nama
 * email
 * no_telepon
 * role
 * gudang_id
 * gudang_nama
 * is_aktif
 * foto
 * personil_id
 * nik
 * posisi
 * gudang
 * personils
 */
const formatUser = (user) => {
  const personil = user.personils || null;
  const personilsArray = personil ? [personil] : [];
  const gudang = personil?.gudang || null;

  const personilId = toStringOrNull(
    personil?.personil_id
  );

  const gudangId = toStringOrNull(
    gudang?.gudang_id
  );

  return {
    /* =====================================================
       DATA USER
    ===================================================== */

    user_id: toStringOrNull(user.user_id),

    nama: user.nama ?? "",

    email: user.email ?? "",

    role: user.role ?? "",

    is_aktif: Boolean(user.is_aktif),

    created_at: user.created_at ?? null,

    updated_at: user.updated_at ?? null,

    /* =====================================================
       DATA PERSONIL
    ===================================================== */

    personil_id: personilId,

    foto: personil?.foto ?? null,

    nik: personil?.nik ?? null,

    posisi: personil?.posisi ?? null,

    /*
     * Frontend menggunakan no_telepon.
     * Database/personil menggunakan no_hp.
     *
     * Kita kirim keduanya supaya kompatibel.
     */

    no_hp: personil?.no_hp ?? null,

    no_telepon: personil?.no_hp ?? null,

    /* =====================================================
       DATA GUDANG
    ===================================================== */

    /*
     * Field langsung untuk memudahkan frontend.
     */

    gudang_id: gudangId,

    gudang_nama: gudang?.nama_gudang ?? null,

    /*
     * Tetap kirim object gudang lengkap.
     */

    gudang: gudang
      ? {
          gudang_id: toStringOrNull(
            gudang.gudang_id
          ),

          nama_gudang:
            gudang.nama_gudang ?? null,

          tipe: gudang.tipe ?? null,

          alamat: gudang.alamat ?? null,

          is_aktif: Boolean(gudang.is_aktif),
        }
      : null,

    /* =====================================================
       RELASI PERSONIL
    ===================================================== */

    personils: personilsArray.map((p) => ({
      personil_id: toStringOrNull(
        p.personil_id
      ),

      foto: p.foto ?? null,

      nama: p.nama ?? null,

      no_hp: p.no_hp ?? null,

      nik: p.nik ?? null,

      email: p.email ?? null,

      posisi: p.posisi ?? null,

      gudang_id: p.gudang_id ? toStringOrNull(p.gudang_id) : null,

      gudang: p.gudang
        ? {
            gudang_id: toStringOrNull(
              p.gudang.gudang_id
            ),

            nama_gudang:
              p.gudang.nama_gudang ?? null,

            tipe: p.gudang.tipe ?? null,

            alamat: p.gudang.alamat ?? null,

            is_aktif: Boolean(p.gudang.is_aktif),
          }
        : null,

      gudang_pics: (
        p.gudang_pics || []
      ).map((g) => ({
        gudang_id: toStringOrNull(
          g.gudang_id
        ),

        nama_gudang:
          g.nama_gudang ?? null,

        tipe: g.tipe ?? null,

        alamat: g.alamat ?? null,

        is_aktif: Boolean(g.is_aktif),
      })),
    })),
  };
};

/* =========================================================
   CREATE USER (+ PERSONIL OTOMATIS + PIC GUDANG)
========================================================= */

/**
 * Membuat user baru.
 *
 * Selain membuat baris di user_account, fungsi ini juga:
 * 1. Membuat baris personil yang terhubung (user_id),
 *    supaya no_telepon langsung tersimpan.
 * 2. Kalau gudang_id dikirim, personil yang baru dibuat
 *    otomatis dijadikan PIC gudang tersebut
 *    (gudang.pic_id = personil.personil_id).
 *
 * data yang diterima dari frontend (payload modal
 * "Tambah anggota"):
 *   nama, email, no_telepon, role, gudang_id,
 *   gudang_nama, personil_id, password (opsional)
 *
 * Field no_telepon dan gudang_id BUKAN kolom di
 * user_account, jadi harus dipisah sebelum insert.
 */
const create = async (data) => {
  const {
    no_telepon,
    gudang_id,
    gudang_nama, // tidak dipakai untuk insert, hanya info dari frontend
    personil_id, // kalau nanti mau hubungkan ke personil yang sudah ada
    ...userData
  } = data;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Buat user_account
    const user = await tx.user_account.create({
      data: userData,
    });

    // 2. Buat personil terhubung ke user ini
    const personil = await tx.personil.create({
      data: {
        nama: user.nama,
        jenis: roleToJenis(user.role),
        no_hp: no_telepon || null,
        posisi: roleToPosisi(user.role),
        email: user.email,
        user_id: user.user_id,
        created_by: user.user_id,
        updated_by: user.user_id,
      },
    });

    // 3. Kalau gudang dipilih, set gudang yang ditugaskan dan jadikan PIC
    if (gudang_id) {
      await tx.personil.update({
        where: { personil_id: personil.personil_id },
        data: { gudang_id: BigInt(gudang_id) },
      });

      await tx.gudang.update({
        where: {
          gudang_id: BigInt(gudang_id),
        },
        data: {
          pic_id: personil.personil_id,
        },
      });
    }

    // 4. Ambil ulang data lengkap untuk diformat
    const fullUser = await tx.user_account.findUnique({
      where: {
        user_id: user.user_id,
      },
      include: userInclude,
    });

    return fullUser;
  });

  return formatUser(result);
};

/* =========================================================
   FIND USER BY ID
========================================================= */

/**
 * Mengambil satu user berdasarkan user_id.
 *
 * Default:
 * hanya user aktif.
 *
 * options.includeInactive = true:
 * user aktif maupun nonaktif dapat diambil.
 */
const findById = async (
  user_id,
  options = {}
) => {
  const id = BigInt(user_id);

  let user;

  if (options.includeInactive) {
    user =
      await prisma.user_account.findUnique({
        where: {
          user_id: id,
        },
        include: userInclude,
      });
  } else {
    user =
      await prisma.user_account.findFirst({
        where: {
          user_id: id,
          is_aktif: true,
        },
        include: userInclude,
      });
  }

  if (!user) {
    return null;
  }

  return formatUser(user);
};

/* =========================================================
   FIND USER BY EMAIL
========================================================= */

/**
 * Mengambil user berdasarkan email.
 *
 * Default:
 * hanya user aktif.
 *
 * options.includeInactive = true:
 * user aktif maupun nonaktif dapat dicari.
 */
const findByEmail = async (
  email,
  options = {}
) => {
  let user;

  if (options.includeInactive) {
    user =
      await prisma.user_account.findUnique({
        where: {
          email,
        },
        include: userInclude,
      });
  } else {
    user =
      await prisma.user_account.findFirst({
        where: {
          email,
          is_aktif: true,
        },
        include: userInclude,
      });
  }

  if (!user) {
    return null;
  }

  return formatUser(user);
};

/* =========================================================
   FIND ALL USERS
========================================================= */

/**
 * Mengambil seluruh user dari database.
 *
 * Endpoint frontend:
 *
 * GET /api/users?page=1&limit=100
 *
 * Response:
 *
 * {
 *   data: [...],
 *   meta: {...}
 * }
 */
const findAll = async ({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
  sortBy = "updated_at",
  sortOrder = "desc",
} = {}) => {
  /* =======================================================
     PAGINATION
  ======================================================= */

  const sanitizedPage = Math.max(
    parseInt(page, 10) || DEFAULT_PAGE,
    DEFAULT_PAGE
  );

  const sanitizedLimit = Math.max(
    parseInt(limit, 10) || DEFAULT_LIMIT,
    1
  );

  /* =======================================================
     SORTING
  ======================================================= */

  const orderField =
    ALLOWED_SORT_FIELDS.includes(sortBy)
      ? sortBy
      : "updated_at";

  const orderDirection =
    ["asc", "desc"].includes(
      String(sortOrder || "").toLowerCase()
    )
      ? String(sortOrder).toLowerCase()
      : "desc";

  /* =======================================================
     FILTER / SEARCH
  ======================================================= */

  const where = {};

  if (
    search &&
    String(search).trim()
  ) {
    const keyword =
      String(search).trim();

    where.OR = [
      {
        nama: {
          contains: keyword,
          mode: "insensitive",
        },
      },

      {
        email: {
          contains: keyword,
          mode: "insensitive",
        },
      },

      {
        role: {
          contains: keyword,
          mode: "insensitive",
        },
      },
    ];
  }

  /* =======================================================
     HITUNG TOTAL DATA
  ======================================================= */

  const total =
    await prisma.user_account.count({
      where,
    });

  /* =======================================================
     AMBIL DATA USER
  ======================================================= */

  const users =
    await prisma.user_account.findMany({
      where,

      orderBy: {
        [orderField]: orderDirection,
      },

      skip:
        (sanitizedPage - 1) *
        sanitizedLimit,

      take: sanitizedLimit,

      include: userInclude,
    });

  /* =======================================================
     FORMAT DATA
  ======================================================= */

  const data =
    users.map(formatUser);

  /* =======================================================
     RESPONSE
  ======================================================= */

  return {
    data,

    meta: {
      total,

      page: sanitizedPage,

      limit: sanitizedLimit,

      totalPages:
        Math.ceil(
          total / sanitizedLimit
        ),
    },
  };
};

/* =========================================================
   UPDATE USER (+ PERSONIL OTOMATIS + PIC GUDANG)
========================================================= */

/**
 * Update data user.
 *
 * Selain mengupdate user_account, fungsi ini juga
 * menyinkronkan data personil terkait:
 *
 * - Kalau no_telepon dikirim, update/ buat personil.no_hp
 * - Kalau gudang_id dikirim, jadikan personil ini PIC
 *   gudang tersebut.
 *
 * Contoh payload sederhana (tetap didukung):
 * {
 *   is_aktif: false
 * }
 *
 * Contoh payload lengkap:
 * {
 *   nama: "...",
 *   no_telepon: "0812...",
 *   gudang_id: "3"
 * }
 */
const update = async (
  user_id,
  data
) => {
  const {
    no_telepon,
    gudang_id,
    gudang_nama,
    personil_id,
    ...userData
  } = data;

  const id = BigInt(user_id);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update user_account (kalau ada field yang dikirim)
    let user;

    if (Object.keys(userData).length > 0) {
      user = await tx.user_account.update({
        where: {
          user_id: id,
        },
        data: userData,
      });
    } else {
      user = await tx.user_account.findUnique({
        where: {
          user_id: id,
        },
      });
    }

    // 2. Cek apakah personil untuk user ini sudah ada
    let personil = await tx.personil.findUnique({
      where: {
        user_id: id,
      },
    });

    const noTeleponDikirim =
      no_telepon !== undefined;

    if (personil) {
      // personil sudah ada, update kalau ada perubahan relevan
      const updateData = {
        updated_by: id,
      };

      if (noTeleponDikirim) {
        updateData.no_hp = no_telepon;
      }

      if (userData.nama) {
        updateData.nama = userData.nama;
      }

      if (userData.email) {
        updateData.email = userData.email;
      }

       if (gudang_id !== undefined) {
        updateData.gudang_id = gudang_id ? BigInt(gudang_id) : null;
      }

      if (userData.role && userData.role !== user.role) {
        updateData.posisi = roleToPosisi(userData.role);
        updateData.jenis = roleToJenis(userData.role);
      }

      personil = await tx.personil.update({
        where: {
          personil_id: personil.personil_id,
        },
        data: updateData,
      });
    } else if (noTeleponDikirim || gudang_id) {
      // belum ada personil untuk user ini, buat baru
      personil = await tx.personil.create({
        data: {
          nama: user.nama,
          jenis: roleToJenis(user.role),
          no_hp: no_telepon || null,
          posisi: roleToPosisi(user.role),
          email: user.email,
          user_id: id,
          created_by: id,
          updated_by: id,
          ...(gudang_id ? { gudang_id: BigInt(gudang_id) } : {}),
        },
      });
    }

    // 3. Kalau gudang_id dikirim dan personil ada, set PIC
    if (gudang_id && personil) {
      await tx.gudang.update({
        where: {
          gudang_id: BigInt(gudang_id),
        },
        data: {
          pic_id: personil.personil_id,
        },
      });
    }

    const fullUser = await tx.user_account.findUnique({
      where: {
        user_id: id,
      },
      include: userInclude,
    });

    return fullUser;
  });

  return formatUser(result);
};

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  create,
  findById,
  findByEmail,
  findAll,
  update,
};