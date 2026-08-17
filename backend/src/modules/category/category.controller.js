const categoryService = require("./category.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await categoryService.create(req.body);
    return response.success(res, "Category berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await categoryService.findAll(req.query);
    return response.success(res, "Daftar category berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByCode = async (req, res, next) => {
  try {
    const result = await categoryService.findByCode(req.params.code);
    return response.success(res, "Detail Category berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await categoryService.update(req.params.code, req.body);
    return response.success(res, "Category berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await categoryService.softDelete(req.params.code);
    return response.success(res, "Category berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await categoryService.restore(req.params.code);
    return response.success(res, "Category berhasil dipulihkan.", result);
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
