const vehicleService = require("./vehicle.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await vehicleService.create(req.body, req.user.id);
    return response.success(res, "Vehicle berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await vehicleService.findAll(req.query);
    return response.success(res, "Daftar vehicle berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByNoPolisi = async (req, res, next) => {
  try {
    const result = await vehicleService.findByNoPolisi(req.params.no_polisi);
    return response.success(res, "Detail Vehicle berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await vehicleService.update(req.params.no_polisi, req.body, req.user.id);
    return response.success(res, "Vehicle berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findByNoPolisi,
  update,
};
