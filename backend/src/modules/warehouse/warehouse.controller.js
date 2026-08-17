const warehouseService = require("./warehouse.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await warehouseService.create(req.body, req.user.id);
    return response.success(res, "Warehouse berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await warehouseService.findAll(req.query);
    return response.success(res, "Daftar warehouse berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByNama = async (req, res, next) => {
  try {
    const result = await warehouseService.findByNama(req.params.nama_gudang);
    return response.success(res, "Detail warehouse berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await warehouseService.update(req.params.nama_gudang, req.body, req.user.id);
    return response.success(res, "Warehouse berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await warehouseService.softDelete(req.params.nama_gudang);
    return response.success(res, "Warehouse berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await warehouseService.restore(req.params.nama_gudang);
    return response.success(res, "Warehouse berhasil dipulihkan.", result);
  } catch (err) {
    next(err);
  }
};

const getLayout = async (req, res, next) => {
  try {
    const result = await warehouseService.getLayout(req.params.nama_gudang);
    return response.success(res, "Layout warehouse berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getZoneStockSnapshot = async (req, res, next) => {
  try {
    const result = await warehouseService.getZoneStockSnapshot(
      req.params.nama_gudang,
      req.params.zona_id,
      req.query
    );
    return response.success(res, "Snapshot stok zona berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findByNama,
  update,
  softDelete,
  restore,
  getLayout,
  getZoneStockSnapshot,
};
