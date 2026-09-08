const titikLapanganService = require("./titik-lapangan.service");
const response = require("../../shared/response");
const {
  createTitikLapanganSchema,
  updateTitikLapanganSchema,
} = require("./titik-lapangan.validation");
const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

const create = async (req, res, next) => {
  try {
    const result = await titikLapanganService.create(req.body, req.user.id);
    return response.success(res, "Titik lapangan berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await titikLapanganService.findAll(req.query);
    return response.success(res, "Daftar titik lapangan berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findById = async (req, res, next) => {
  try {
    const result = await titikLapanganService.findById(req.params.id);
    return response.success(res, "Detail titik lapangan berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await titikLapanganService.update(req.params.id, req.body, req.user.id);
    return response.success(res, "Titik lapangan berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await titikLapanganService.softDelete(req.params.id, req.user.id);
    return response.success(res, "Titik lapangan berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await titikLapanganService.restore(req.params.id, req.user.id);
    return response.success(res, "Titik lapangan berhasil dipulihkan.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findById,
  update,
  softDelete,
  restore,
};
