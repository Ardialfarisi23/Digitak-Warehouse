const AppError = require("../shared/errors");
const prisma = require("../config/prisma");

// Satu kalimat final tanpa placeholder, supaya pesan yang muncul di UI tidak
// pernah menampilkan sisa template.
const PESAN_GUDANG_DIARANG = "Anda tidak memiliki akses ke gudang ini.";

const STAF_GUDANG = "staf_gudang";
const KNOWN_ROLES = ["admin_general", "supervisor", "staf_gudang"];

const keNomor = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const angka = Number(value);
  return Number.isInteger(angka) && angka > 0 ? angka : null;
};

/**
 * Daftar gudang seorang staf = UNION dari tiga sumber:
 *  1. tabel `user_gudang`  -> penugasan tambahan / multi gudang
 *  2. `personil.gudang_id` -> penugasan lama (tunggal), tidak diubah & tidak dihapus
 *  3. `gudang.pic_id`      -> staf yang jadi PIC sebuah gudang otomatis dianggap
 *                            ditugaskan ke gudang itu
 *
 * Sumber 2 dan 3 sengaja ikut dibaca supaya data lama tetap berlaku tanpa
 * backfill, dan supaya modul personnel, notifikasi, serta master gudang yang
 * sudah memakai kedua kolom itu tidak ikut berubah perilakunya.
 *
 * Kode ini murni membaca, tidak pernah menulis ke database.
 */
const resolveGudangIds = async (userId, role) => {
  const idNumerik = keNomor(userId);
  if (idNumerik === null) return [];

  const personil = await prisma.personil.findUnique({
    where: { user_id: BigInt(idNumerik) },
    select: { personil_id: true, gudang_id: true },
  });

  const penugasanBaru = await prisma.user_gudang.findMany({
    where: { user_id: BigInt(idNumerik) },
    select: { gudang_id: true },
  });

  const ids = penugasanBaru.map((row) => keNomor(row.gudang_id)).filter((id) => id !== null);
  const lama = keNomor(personil?.gudang_id);
  if (lama !== null) ids.push(lama);

  if (role !== "staf_gudang") {
    const gudangDipic = personil?.personil_id
      ? await prisma.gudang.findMany({
          where: { pic_id: personil.personil_id },
          select: { gudang_id: true },
        })
      : [];

    for (const row of gudangDipic) {
      const pic = keNomor(row.gudang_id);
      if (pic !== null) ids.push(pic);
    }
  }

  return [...new Set(ids)].sort((a, b) => a - b);
};

/**
 * Menempelkan scope gudang ke request.
 *
 * req.gudangScope = {
 *   dibatasi: boolean,          // true HANYA untuk staf_gudang yang SUDAH punya penugasan
 *   sudahDitugaskan: boolean,   // false = staf tanpa penugasan sama sekali
 *   gudangIds: number[],       // [] bila tidak dibatasi
 *   gudangUtamaId: number|null,
 * }
 *
 * admin_general dan supervisor mendapat `dibatasi: false`, sehingga seluruh guard
 * di bawah meloloskan mereka tanpa perubahan perilaku sama sekali.
 *
 * PENTING: staf yang belum punya penugasan sama sekali TIDAK diblokir di sini.
 * Secara default dia diperlakukan `dibatasi: false` supaya perilakunya sama seperti
 * sebelum fitur ini ada, dan tidak terkunci selamanya selama admin belum mengisi
 * data penugasan. Begitu penugasan diisi, pembatasan otomatis aktif tanpa perlu ubah
 * kode lagi. Batasannya disimpan di `sudahDitugaskan` supaya UI bisa memberi
 * penjelasan, bukan diam-diam menampilkan halaman kosong.
 */
const attachGudangScope = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError("Unauthorized.", 401);
    }

    if (!KNOWN_ROLES.includes(req.user.role)) {
      throw new AppError(PESAN_GUDANG_DIARANG, 403);
    }

    if (req.user.role !== STAF_GUDANG) {
      req.gudangScope = {
        dibatasi: false,
        sudahDitugaskan: true,
        gudangIds: [],
        gudangUtamaId: null,
      };
      return next();
    }

    const gudangIds = await resolveGudangIds(req.user.id, req.user.role);

    if (gudangIds.length === 0) {
      req.gudangScope = {
        dibatasi: false,
        sudahDitugaskan: false,
        gudangIds: [],
        gudangUtamaId: null,
      };
      return next();
    }

    req.gudangScope = {
      dibatasi: true,
      sudahDitugaskan: true,
      gudangIds,
      gudangUtamaId: gudangIds[0],
    };
    return next();
  } catch (err) {
    next(err);
  }
};

/** null berarti "tidak dibatasi" (admin_general / supervisor). */
const getScope = (scope) => {
  if (!scope || typeof scope !== "object" || scope.dibatasi !== true) return null;
  return Array.isArray(scope.gudangIds) ? scope.gudangIds : [];
};

const scopeMelingkupi = (scope, gudangId) => {
  const daftar = getScope(scope);
  if (daftar === null) return true;
  const target = keNomor(gudangId);
  return target !== null && daftar.includes(target);
};

/**
 * Lempar 403 kalau scope tidak berbentuk hasil attachGudangScope, supaya route
 * yang lupa memasang middleware ketahuan dan bukan diam-diam meloloskan semua
 * staf tanpa pembatasan.
 */
const ambilScopeWajib = (scope) => {
  if (!scope || typeof scope !== "object" || typeof scope.dibatasi !== "boolean") {
    throw new AppError(PESAN_GUDANG_DIARANG, 403);
  }
  return scope;
};

/** 403 kalau gudangId berada di luar daftar penugasan staf. */
const assertGudangDiizinkan = (scope, gudangId) => {
  const finalScope = ambilScopeWajib(scope);
  if (!finalScope.dibatasi) return true;
  if (scopeMelingkupi(finalScope, gudangId)) return true;
  throw new AppError(PESAN_GUDANG_DIARANG, 403);
};

/**
 * 403 kalau tidak satu pun dari daftar gudang yang diberikan diizinkan.
 * Dipakai untuk surat jalan yang punya dua sisi gudang (asal & tujuan).
 */
const assertAdaGudangDiizinkan = (scope, daftarGudangId) => {
  const finalScope = ambilScopeWajib(scope);
  if (!finalScope.dibatasi) return true;
  const kandidat = Array.isArray(daftarGudangId) ? daftarGudangId : [daftarGudangId];
  const adaYangBoleh = kandidat.some((id) => scopeMelingkupi(finalScope, id));
  if (adaYangBoleh) return true;
  throw new AppError(PESAN_GUDANG_DIARANG, 403);
};

/**
 * Pastikan zona yang dipilih client benar-benar milik gudang yang diharapkan.
 *
 * Dipakai karena `zona_id` pada endpoint putaway dan retrieve berasal dari body
 * client. Tanpa validasi ini staf bisa menaruh atau mengambil stok di zona milik
 * gudang lain hanya dengan mengarang angka zona.
 *
 * Fungsi ini murni memvalidasi kepemilikan zona terhadap gudang, tanpa menyentuh
 * role. Pembatasan hanya untuk staf_gudang dipakai di pemanggil (service), sehingga
 * admin_general dan supervisor tidak ikut terpengaruh.
 */
const assertZonaMilikGudang = async (zonaId, gudangId) => {
  const zona = keNomor(zonaId);
  if (zona === null) {
    throw new AppError("Zona tidak valid.", 403);
  }

  const record = await prisma.zona_gudang.findUnique({
    where: { zona_id: BigInt(zona) },
    select: { gudang_id: true },
  });

  if (!record) {
    throw new AppError("Zona tidak ditemukan.", 404);
  }

  const pemilik = record.gudang_id === null || record.gudang_id === undefined
    ? null
    : Number(record.gudang_id);

  if (pemilik === null || pemilik !== keNomor(gudangId)) {
    throw new AppError(PESAN_GUDANG_DIARANG, 403);
  }

  return true;
};

module.exports = {
  attachGudangScope,
  resolveGudangIds,
  assertGudangDiizinkan,
  assertAdaGudangDiizinkan,
  assertZonaMilikGudang,
  scopeMelingkupi,
  PESAN_GUDANG_DIARANG,
};
