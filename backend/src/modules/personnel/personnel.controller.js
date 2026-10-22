const personnelService = require("./personnel.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await personnelService.create(req.body, req.user.id);
    return response.success(res, "Personnel berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await personnelService.findAll(req.query);
    return response.success(res, "Daftar personnel berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByPersonilId = async (req, res, next) => {
  try {
    const result = await personnelService.findByPersonilId(req.params.personil_id);
    return response.success(res, "Detail Personnel berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await personnelService.update(req.params.personil_id, req.body, { id: req.user.id, role: req.user.role });
    return response.success(res, "Personnel berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await personnelService.softDelete(req.params.personil_id, req.user.id);
    return response.success(res, "Personil berhasil dinonaktifkan.", null, 200);
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    await personnelService.restore(req.params.personil_id, req.user.id);
    return response.success(res, "Personil berhasil diaktifkan kembali.", null, 200);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findByPersonilId,
  update,
  remove,
  restore,
};
