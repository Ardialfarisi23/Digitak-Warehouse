const additionalService = require("./additional.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await additionalService.create(req.body, req.user.id, req.user.role);
    return response.success(res, "Penyesuaian additional berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const projectId = req.query.project_id ? Number(req.query.project_id) : null;
    const clusterId = req.query.cluster_id || null;
    const barangId = req.query.barang_id ? Number(req.query.barang_id) : null;

    if (!projectId && !barangId) {
      return response.success(res, "Parameter project_id atau barang_id wajib diisi.", []);
    }

    const result = await additionalService.list(projectId, barangId, clusterId, req.user.role);
    return response.success(res, "Riwayat penyesuaian additional berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  list,
};
