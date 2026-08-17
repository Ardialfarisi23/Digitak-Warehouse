const aisleService = require("./aisle.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await aisleService.create(req.body);
    return response.success(res, "Aisle berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await aisleService.findAll(req.query);
    return response.success(res, "Daftar aisle berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByCode = async (req, res, next) => {
  try {
    const result = await aisleService.findByCode(req.params.code);
    return response.success(res, "Detail Aisle berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await aisleService.update(req.params.code, req.body);
    return response.success(res, "Aisle berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await aisleService.softDelete(req.params.code);
    return response.success(res, "Aisle berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await aisleService.restore(req.params.code);
    return response.success(res, "Aisle berhasil dipulihkan.", result);
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
