const personnelRepository = require("./personnel.repository");
const AppError = require("../../shared/errors");


const create = async (data, userId) => {
  if (data.nik) {
    const existingNik = await personnelRepository.findByNik(data.nik);
    if (existingNik) {
      throw new AppError("NIK sudah digunakan.", 400);
    }
  }

  if (data.email) {
    const existingEmail = await personnelRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new AppError("Email sudah digunakan.", 400);
    }
  }

  const parsedGudangId =
    data.gudang_id !== undefined && data.gudang_id !== null && data.gudang_id !== ""
      ? Number(data.gudang_id)
      : null;
  const finalGudangId =
    parsedGudangId !== null && Number.isFinite(parsedGudangId) && parsedGudangId > 0
      ? parsedGudangId
      : null;

  const createData = {
    ...data,
    gudang_id: finalGudangId,
    created_by: Number(userId),
    updated_by: Number(userId),
  };

  return await personnelRepository.create(createData);
};

const findAll = async (query) => {
  return await personnelRepository.findAll(query);
};

const findByPersonilId = async (personil_id) => {
  const record = await personnelRepository.findByPersonilId(
    personil_id,
    {
      includeInactive: true,
    }
  );

  if (!record) {
    throw new AppError(
      "Personnel tidak ditemukan.",
      404
    );
  }

  return record;
};

const update = async (personil_id, data, userId) => {
  const record = await personnelRepository.findByPersonilId(
    personil_id,
    {
      includeInactive: true,
    }
  );

  if (!record) {
    throw new AppError(
      "Personnel tidak ditemukan.",
      404
    );
  }

  if (data.personil_id && data.personil_id !== personil_id) {
    const existing =
      await personnelRepository.findByPersonilId(
        data.personil_id,
        {
          includeInactive: true,
        }
      );

    if (existing) {
      throw new AppError(
        "ID personnel sudah digunakan.",
        400
      );
    }
  }

  const updateData = {
    ...data,
    updated_by: Number(userId),
  };

  return await personnelRepository.update(
    personil_id,
    updateData
  );
};

const remove = async (personil_id, userId) => {
  const record = await personnelRepository.findByPersonilId(
    personil_id,
    {
      includeInactive: true,
    }
  );

  if (!record) {
    throw new AppError(
      "Personnel tidak ditemukan.",
      404
    );
  }

  if (record.is_aktif) {
    throw new AppError(
      "Gagal menghapus! Personil harus dinonaktifkan terlebih dahulu di Halaman Operasional.",
      400
    );
  }

  return await personnelRepository.remove(personil_id);
};

module.exports = {
  create,
  findAll,
  findByPersonilId,
  update,
  remove,
};
