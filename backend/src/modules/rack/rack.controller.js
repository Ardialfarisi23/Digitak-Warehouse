const rackService = require("./rack.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      zona_id: req.body.zona_id ? Number(req.body.zona_id) : undefined,
    };
    const result = await rackService.create(body);
    return response.success(res, "Rack berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await rackService.findAll(req.query);
    return response.success(res, "Daftar rack berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByCode = async (req, res, next) => {
  try {
    const result = await rackService.findByCode(req.params.code);
    return response.success(res, "Detail Rack berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      zona_id: req.body.zona_id ? Number(req.body.zona_id) : undefined,
    };
    const result = await rackService.update(req.params.code, body);
    return response.success(res, "Rack berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await rackService.softDelete(req.params.code);
    return response.success(res, "Rack berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await rackService.restore(req.params.code);
    return response.success(res, "Rack berhasil dipulihkan.", result);
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
