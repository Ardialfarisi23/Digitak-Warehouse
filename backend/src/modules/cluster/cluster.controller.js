const clusterService = require("./cluster.service");
const response = require("../../shared/response");

const listByProject = async (req, res, next) => {
  try {
    const projectId = req.query.project_id;
    const status = req.query.status || "aktif";
    const result = await clusterService.findByProjectId(projectId, status);
    return response.success(res, "Daftar clusterhasil diambil.", result);
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

/**
 * Endpoint read-only khusus staf (dropdown/picker).
 * Tidak memuat data manajemen cluster, hanya id + kode + nama.
 */
const listOptions = async (req, res, next) => {
  try {
    const result = await clusterService.findOptions(req.query);
    return response.success(res, "Daftar cluster berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const result = await clusterService.create(req.body, req.user.id);
    return response.success(res, "Cluster berhasil dibuat.", result, 201);
  } catch (err) {
    console.error("[ClusterController] create failed:", err);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await clusterService.update(req.params.clusterId, req.body);
    return response.success(res, "Cluster berhasil diperbarui.", result);
  } catch (err) {
    console.error("[ClusterController] update failed:", err);
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

const deleteCluster = async (req, res, next) => {
  try {
    const result = await clusterService.deleteCluster(req.params.clusterId);
    return response.success(res, result.message || "Cluster berhasil dihapus.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listByProject,
  listAll,
  listOptions,
  create,
  update,
  toggleStatus,
  deleteCluster,
};
