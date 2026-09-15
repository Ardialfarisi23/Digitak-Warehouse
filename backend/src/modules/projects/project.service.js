const projectRepository = require("./project.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const notificationService = require("../../modules/notifications/notifications.service");

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

  const result = await projectRepository.create(createData);

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(userId) },
    select: { nama: true, role: true },
  });

  try {
    if (actor?.role === "admin_general") {
      const admins = await prisma.user_account.findMany({
        where: { role: "admin_general", is_aktif: true },
        select: { user_id: true },
      });

      const adminIds = admins
        .filter((admin) => Number(admin.user_id) !== Number(userId))
        .map((admin) => Number(admin.user_id));

      if (adminIds.length > 0) {
        await notificationService.create({
          userId: adminIds,
          type: "info",
          title: "Project Baru Ditambahkan",
          message: `Project baru: ${result.nama_project} telah ditambahkan oleh ${actor?.nama || "Admin"}.`,
          link: "/master-data",
        });
      }
    }

    await notificationService.create({
      role: "supervisor",
      type: "info",
      title: "Project Baru Ditambahkan",
      message: `Project baru: ${result.nama_project} telah ditambahkan.`,
      link: "/master-data",
    });

    await notificationService.create({
      role: "staf_gudang",
      type: "info",
      title: "Project Baru Ditambahkan",
      message: `Project baru: ${result.nama_project} telah ditambahkan.`,
      link: "/master-data",
    });
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi create project:", notifErr);
  }

  return result;
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

const remove = async (project_id, userId) => {
  const record = await projectRepository.findByProjectId(project_id, { includeInactive: true });

  if (!record) {
    throw new AppError("Project tidak ditemukan.", 404);
  }

  try {
    return await projectRepository.remove(project_id);
  } catch (err) {
    if (err && err.code === "P2003") {
      return await projectRepository.softDelete(project_id);
    }

    throw err;
  }
};

module.exports = {
  create,
  findAll,
  findByProjectId,
  update,
  remove,
};
