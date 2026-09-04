const profileRepository = require("./profile.repository");
const AppError = require("../../shared/errors");
const passwordHelper = require("../../shared/password");

const toProfileResponse = (userAccount) => {
  const personil = userAccount?.personils ?? null;
  const gudang = personil?.gudang || null;

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
    created_at: personil?.created_at ? personil.created_at.toISOString() : null,
    updated_at: personil?.updated_at ? personil.updated_at.toISOString() : null,
  };
};

const getProfile = async (id) => {
  const userAccount = await profileRepository.findById(id);

  if (!userAccount) {
    throw new AppError("User tidak ditemukan.", 404);
  }

  return toProfileResponse(userAccount);
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

  return await profileRepository.updateProfile(personilId, data);
};

module.exports = {
  getProfile,
  updateProfile,
};
