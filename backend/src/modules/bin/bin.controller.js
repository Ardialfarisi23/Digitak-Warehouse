const binService = require("./bin.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      rak_id: req.body.rak_id ? Number(req.body.rak_id) : undefined,
    };
    const result = await binService.create(body);
    return response.success(res, "Bin berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await binService.findAll(req.query);
    return response.success(res, "Daftar bin berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByCode = async (req, res, next) => {
  try {
    const result = await binService.findByCode(req.params.code);
    return response.success(res, "Detail Bin berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      rak_id: req.body.rak_id ? Number(req.body.rak_id) : undefined,
    };
    const result = await binService.update(req.params.code, body);
    return response.success(res, "Bin berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await binService.softDelete(req.params.code);
    return response.success(res, "Bin berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await binService.restore(req.params.code);
    return response.success(res, "Bin berhasil dipulihkan.", result);
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
