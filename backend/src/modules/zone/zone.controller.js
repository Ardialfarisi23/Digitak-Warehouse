const zoneService = require("./zone.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      gudang_id: req.body.gudang_id ? Number(req.body.gudang_id) : undefined,
      utilisasi_persen: req.body.utilisasi_persen ? Number(req.body.utilisasi_persen) : undefined,
    };
    const result = await zoneService.create(body);
    return response.success(res, "Zone berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await zoneService.findAll(req.query);
    return response.success(res, "Daftar zone berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByCode = async (req, res, next) => {
  try {
    const result = await zoneService.findByCode(req.params.code);
    return response.success(res, "Detail Zone berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      gudang_id: req.body.gudang_id ? Number(req.body.gudang_id) : undefined,
      utilisasi_persen: req.body.utilisasi_persen ? Number(req.body.utilisasi_persen) : undefined,
    };
    const result = await zoneService.update(req.params.code, body);
    return response.success(res, "Zone berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await zoneService.softDelete(req.params.code);
    return response.success(res, "Zone berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await zoneService.restore(req.params.code);
    return response.success(res, "Zone berhasil dipulihkan.", result);
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
