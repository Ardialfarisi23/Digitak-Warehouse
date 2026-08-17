const unitService = require("./unit.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await unitService.create(req.body);
    return response.success(res, "Unit berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await unitService.findAll(req.query);
    return response.success(res, "Daftar unit berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByCode = async (req, res, next) => {
  try {
    const result = await unitService.findByCode(req.params.code);
    return response.success(res, "Detail Unit berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await unitService.update(req.params.code, req.body);
    return response.success(res, "Unit berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await unitService.softDelete(req.params.code);
    return response.success(res, "Unit berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await unitService.restore(req.params.code);
    return response.success(res, "Unit berhasil dipulihkan.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findByCode,
  update,
  softDelete,
  restore,
};
