const projectRepository = require("./project.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const notificationService = require("../../modules/notifications/notifications.service");
const { createAuditLog } = require("../../utils/audit-log");

const toProjectResponse = (record) => {
  if (!record || typeof record !== "object") return record;

  const { creator, updater, ...rest } = record;

  return {
    ...rest,
    created_by_name: creator?.nama ?? null,
    updated_by_name: updater?.nama ?? null,
  };
};

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

  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({ data: createData });

    await createAuditLog(
      {
        entityType: "project",
        entityId: project.project_id,
        aksi: "create",
        actorId: userId,
        dataSebelum: null,
        dataSesudah: project,
      },
      tx
    );

    return project;
  });

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
          .map((b) => Number(b.tiket?.project_id))
      );

      result.data = result.data.map((p) => ({
        ...toProjectResponse(p),
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

  return toProjectResponse(record);
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
  return await nonaktifkan(project_id, userId);
};

const nonaktifkan = async (project_id, userId) => {
  const record = await projectRepository.findByProjectId(project_id, { includeInactive: true });

  if (!record) {
    throw new AppError("Project tidak ditemukan.", 404);
  }

  if (!record.status_aktif) {
    throw new AppError("Project sudah dinonaktifkan.", 400);
  }

  const incompleteBoqs = await prisma.boq.findMany({
    where: {
      tiket: {
        project_id: Number(project_id),
      },
      status: {
        notIn: ["selesai", "draft"],
      },
    },
    include: {
      tiket: {
        select: {
          kode_tiket: true,
        },
      },
    },
  });

  if (incompleteBoqs.length > 0) {
    throw new AppError(
      `Tidak dapat menonaktifkan project. Masih ada ${incompleteBoqs.length} BOQ yang belum selesai (BOQ berstatus aktif/ditolak yang perlu diselesaikan/dihapus).`,
      400
    );
  }

  const activeSuratJalans = await prisma.surat_jalan.count({
    where: {
      project_id: Number(project_id),
      status: {
        notIn: ["diterima_didistribusikan", "ditolak"],
      },
    },
  });

  if (activeSuratJalans > 0) {
    throw new AppError(
      `Tidak dapat menonaktifkan project. Masih ada ${activeSuratJalans} Surat Jalan yang sedang berjalan.`,
      400
    );
  }

  const result = await projectRepository.softDelete(project_id);

  try {
    await prisma.audit_log.create({
      data: {
        entity_type: "project",
        entity_id: BigInt(project_id),
        aksi: "nonaktifkan_project",
        actor_id: BigInt(userId),
        data_sebelum: { status_aktif: true },
        data_sesudah: { status_aktif: false },
      },
    });
  } catch (auditErr) {
    console.error("Gagal membuat audit log nonaktifkan project:", auditErr);
  }

  return result;
};

const restore = async (project_id, userId) => {
  const record = await projectRepository.findByProjectId(project_id, { includeInactive: true });

  if (!record) {
    throw new AppError("Project tidak ditemukan.", 404);
  }

  if (record.status_aktif) {
    throw new AppError("Project sudah aktif.", 400);
  }

  const result = await projectRepository.restore(project_id);

  try {
    await prisma.audit_log.create({
      data: {
        entity_type: "project",
        entity_id: BigInt(project_id),
        aksi: "aktifkan_project",
        actor_id: BigInt(userId),
        data_sebelum: { status_aktif: false },
        data_sesudah: { status_aktif: true },
      },
    });
  } catch (auditErr) {
    console.error("Gagal membuat audit log aktifkan project:", auditErr);
  }

  return result;
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
