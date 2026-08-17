const permintaanBoqService = require("./permintaan-boq.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await permintaanBoqService.create(req.body, req.user.id);
    return response.success(res, "Permintaan BOQ berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await permintaanBoqService.findAll(req.query);
    return response.success(res, "Daftar Permintaan BOQ berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findById = async (req, res, next) => {
  try {
    const result = await permintaanBoqService.findById(req.params.id);
    return response.success(res, "Detail Permintaan BOQ berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await permintaanBoqService.updateStatus(req.params.id, status, req.user.id);
    return response.success(res, `Permintaan BOQ berhasil di${status === "DISETUJUI" ? "setujui" : status === "DITOLAK" ? "tolak" : "diubah"}.`, result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await permintaanBoqService.softDelete(req.params.id);
    return response.success(res, "Permintaan BOQ berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await permintaanBoqService.restore(req.params.id);
    return response.success(res, "Permintaan BOQ berhasil dipulihkan.", result);
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const result = await permintaanBoqService.getStats();
    return response.success(res, "Statistik Permintaan BOQ berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findById,
  updateStatus,
  softDelete,
  restore,
  getStats,
};
