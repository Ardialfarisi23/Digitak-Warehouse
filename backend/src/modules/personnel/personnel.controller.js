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
    const result = await personnelService.update(req.params.personil_id, req.body, req.user.id);
    return response.success(res, "Personnel berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findByPersonilId,
  update,
};
