const clusterService = require("./cluster.service");
const response = require("../../shared/response");

const listByProject = async (req, res, next) => {
  try {
    const projectId = req.query.project_id;
    const result = await clusterService.findByProjectId(projectId);
    return response.success(res, "Daftar cluster berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const listAll = async (req, res, next) => {
  try {
    const result = await clusterService.findAll(req.query);
    return response.success(res, "Daftar semua cluster berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const result = await clusterService.create(req.body, req.user.id);
    return response.success(res, "Cluster berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await clusterService.update(req.params.clusterId, req.body);
    return response.success(res, "Cluster berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const result = await clusterService.toggleStatus(req.params.clusterId);
    return response.success(res, result.status_aktif ? "Cluster berhasil diaktifkan." : "Cluster berhasil dinonaktifkan.", result);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await clusterService.remove(req.params.clusterId, req.user.id);
    return response.success(res, "Cluster berhasil dihapus.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listByProject,
  listAll,
  create,
  update,
  toggleStatus,
  remove,
};
