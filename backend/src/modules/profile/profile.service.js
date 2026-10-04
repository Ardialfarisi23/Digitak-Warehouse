const profileRepository = require("./profile.repository");
const AppError = require("../../shared/errors");
const passwordHelper = require("../../shared/password");
const prisma = require("../../config/prisma");
const { resolveGudangIds } = require("../../middlewares/gudang-scope.middleware");

/**
 * `gudang_ids` = daftar lengkap gudang yang ditugaskan ke user ini, hasil union
 * tabel `user_gudang`, `personil.gudang_id`, dan `gudang.pic_id` (lihat
 * resolveGudangIds). Semua nilai dikirim sebagai string supaya konsisten dengan
 * `gudang_id` lama yang juga string (BigInt).
 *
 * `gudang_utama_id` = gudang yang dipakai halaman staff sebagai bawaan. Nilainya
 * `personil.gudang_id` bila masih terisi, supaya `gudang_utama_id` selalu sama
 * dengan `gudang_id` lama untuk data yang sudah ada.
 */
const toProfileResponse = (userAccount, gudangIds = []) => {
  const personil = userAccount?.personils ?? null;
  const gudang = personil?.gudang || null;
  const gudangIdsStr = gudangIds.map((id) => String(id));
  const gudangUtamaId =
    personil?.gudang_id !== null && personil?.gudang_id !== undefined
      ? String(personil.gudang_id)
      : gudangIdsStr.length > 0
        ? gudangIdsStr[0]
        : null;

  return {
    id: userAccount?.user_id ? String(userAccount.user_id) : null,
    nama: personil?.nama || userAccount?.nama || null,
    email: userAccount?.email || personil?.email || null,
    role: userAccount?.role || null,
    is_aktif: userAccount?.is_aktif ?? null,
    foto: personil?.foto || null,
    no_hp: personil?.no_hp || null,
    nik: personil?.nik || null,
    posisi: personil?.posisi || null,
    gudang_id: personil?.gudang_id ? String(personil.gudang_id) : null,
    gudang_nama: gudang?.nama_gudang || null,
    gudang_alamat: gudang?.alamat || null,
    gudang_ids: gudangIdsStr,
    gudang_utama_id: gudangUtamaId,
    created_at: personil?.created_at ? personil.created_at.toISOString() : null,
    updated_at: personil?.updated_at ? personil.updated_at.toISOString() : null,
  };
};

const getProfile = async (id) => {
  const userAccount = await profileRepository.findById(id);

  if (!userAccount) {
    throw new AppError("User tidak ditemukan.", 404);
  }

  const gudangIds = await resolveGudangIds(id);

  return toProfileResponse(userAccount, gudangIds);
};

const updateProfile = async (id, data) => {
  const personnel = await profileRepository.findById(id);

  if (!personnel) {
    throw new AppError("User tidak ditemukan.", 404);
  }

  const personil = personnel?.personils ?? null;

  if (!personil) {
    throw new AppError("Data personnel tidak ditemukan.", 404);
  }

  const personilId = personil.personil_id;

  if (data.password) {
    data.password = await passwordHelper.hash(data.password);
  }

  const { nama, ...rest } = data;

  if (nama !== undefined) {
    await prisma.user_account.update({
      where: { user_id: BigInt(id) },
      data: { nama },
    });
  }

  const personilData = { ...rest };
  if (nama !== undefined) {
    personilData.nama = nama;
  }

  if (Object.keys(personilData).length > 0) {
    await profileRepository.updateProfile(personilId, personilData);
  }

  return await profileRepository.findById(id);
};

module.exports = {
  getProfile,
  updateProfile,
};
