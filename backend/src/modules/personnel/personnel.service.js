const personnelRepository = require("./personnel.repository");
const AppError = require("../../shared/errors");


const create = async (data, userId) => {
  const existing = await personnelRepository.findByPersonilId(
    data.personil_id,
    {
      includeInactive: true,
    }
  );

  if (existing) {
    throw new AppError("ID personnel sudah digunakan.", 400);
  }

  const createData = {
    ...data,
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

module.exports = {
  create,
  findAll,
  findByPersonilId,
  update,
};
