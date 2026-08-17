const itemService = require("./item.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await itemService.create(req.body, req.user.id);
    return response.success(res, "Item berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await itemService.findAll(req.query);
    return response.success(res, "Daftar item berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByKode = async (req, res, next) => {
  try {
    const result = await itemService.findByKode(req.params.kode_perangkat);
    return response.success(res, "Detail Item berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await itemService.update(req.params.kode_perangkat, req.body, req.user.id);
    return response.success(res, "Item berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findByKode,
  update,
};
