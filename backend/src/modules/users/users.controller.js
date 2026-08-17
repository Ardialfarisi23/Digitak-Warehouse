const usersService = require("./users.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await usersService.create(req.body);
    return response.success(res, "Akun berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await usersService.findAll(req.query);
    return response.success(res, "Daftar akun berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findById = async (req, res, next) => {
  try {
    const result = await usersService.findById(req.params.user_id);
    return response.success(res, "Detail akun berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await usersService.update(req.params.user_id, req.body);
    return response.success(res, "Akun berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findById,
  update,
};
