const projectService = require("./project.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await projectService.create(req.body, req.user.id);
    return response.success(res, "Project berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await projectService.findAll(req.query);
    return response.success(res, "Daftar projects berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByProjectId = async (req, res, next) => {
  try {
    const result = await projectService.findByProjectId(req.params.project_id);
    return response.success(res, "Detail Project berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await projectService.update(req.params.project_id, req.body, req.user.id);
    return response.success(res, "Project berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await projectService.remove(req.params.project_id, req.user.id);
    return response.success(res, "Project berhasil dihapus.", result);
  } catch (err) {
    next(err);
  }
};

const nonaktifkan = async (req, res, next) => {
  try {
    const result = await projectService.nonaktifkan(req.params.project_id, req.user.id);
    return response.success(res, "Project berhasil dinonaktifkan.", result);
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await projectService.restore(req.params.project_id, req.user.id);
    return response.success(res, "Project berhasil diaktifkan kembali.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findByProjectId,
  update,
  remove,
  nonaktifkan,
  restore,
};
