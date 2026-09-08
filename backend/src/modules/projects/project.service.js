const projectRepository = require("./project.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");

const create = async (data, userId) => {
  if (data.project_id) {
    const existing = await projectRepository.findByProjectId(data.project_id, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode project sudah digunakan.", 400);
    }
  }

  const createData = {
    ...data,
    created_by: Number(userId),
    updated_by: Number(userId),
  };

  return await projectRepository.create(createData);
};

const findAll = async (query = {}) => {
  const result = await projectRepository.findAll(query);

  if (result && Array.isArray(result.data)) {
    const projectIds = result.data.map((p) => Number(p.project_id)).filter(Boolean);

    if (projectIds.length > 0) {
      const activeBoqs = await prisma.boq.findMany({
        where: { status: "aktif" },
        include: {
          tiket: {
            select: { project_id: true },
          },
        },
      });

      const activeProjectIds = new Set(
        activeBoqs
          .filter((b) => b.tiket?.project_id)
          .map((b) => Number(b.tiket.project_id))
      );

      result.data = result.data.map((p) => ({
        ...p,
        has_active_boq: activeProjectIds.has(Number(p.project_id)),
      }));
    }
  }

  return result;
};

const findByProjectId = async (project_id) => {
  const record = await projectRepository.findByProjectId(project_id, { includeInactive: true });

  if (!record) {
    throw new AppError("Project tidak ditemukan.", 404);
  }

  return record;
};

const update = async (project_id, data, userId) => {
  const record = await projectRepository.findByProjectId(project_id, { includeInactive: true });

  if (!record) {
    throw new AppError("Project tidak ditemukan.", 404);
  }

  if (!record.status_aktif) {
    throw new AppError("Project telah dinonaktifkan. Pulihkan untuk mengubah data.", 400);
  }

  const updateData = {
    ...data,
    updated_by: Number(userId),
  };

  return await projectRepository.update(project_id, updateData);
};

module.exports = {
  create,
  findAll,
  findByProjectId,
  update,
};
