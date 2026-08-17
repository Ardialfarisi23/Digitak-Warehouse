const supplierService = require("./supplier.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await supplierService.create(req.body);
    return response.success(res, "Supplier berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await supplierService.findAll(req.query);
    return response.success(res, "Daftar supplier berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByCode = async (req, res, next) => {
  try {
    const result = await supplierService.findByCode(req.params.code);
    return response.success(res, "Detail Supplier berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await supplierService.update(req.params.code, req.body);
    return response.success(res, "Supplier berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await supplierService.softDelete(req.params.code);
    return response.success(res, "Supplier berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await supplierService.restore(req.params.code);
    return response.success(res, "Supplier berhasil dipulihkan.", result);
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
