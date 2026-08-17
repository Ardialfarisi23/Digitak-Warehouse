const customerService = require("./customer.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await customerService.create(req.body);
    return response.success(res, "Customer berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await customerService.findAll(req.query);
    return response.success(res, "Daftar customer berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByCode = async (req, res, next) => {
  try {
    const result = await customerService.findByCode(req.params.code);
    return response.success(res, "Detail Customer berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await customerService.update(req.params.code, req.body);
    return response.success(res, "Customer berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await customerService.softDelete(req.params.code);
    return response.success(res, "Customer berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await customerService.restore(req.params.code);
    return response.success(res, "Customer berhasil dipulihkan.", result);
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
