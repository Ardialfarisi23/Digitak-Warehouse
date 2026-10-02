const clusterRepository = require("./cluster.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const { createAuditLog } = require("../../utils/audit-log");

const findByProjectId = async (projectId) => {
  if (!projectId) {
    throw new AppError("Project ID wajib diisi.", 400);
  }

  return await clusterRepository.findByProjectId(projectId);
};

const findAll = async (query = {}) => {
  return await clusterRepository.findAll(query);
};

const create = async (data, userId) => {
  if (!data.project_id) {
    throw new AppError("Project ID wajib diisi.", 400);
  }

  if (!data.nama_cluster || !data.nama_cluster.trim()) {
    throw new AppError("Nama cluster wajib diisi.", 400);
  }

  if (!data.cluster_id || !data.cluster_id.trim()) {
    throw new AppError("Cluster ID wajib diisi.", 400);
  }

  const normalizedClusterId = data.cluster_id.trim();
  const existingClusterId = await prisma.cluster.findFirst({
    where: { cluster_id: normalizedClusterId },
    select: { cluster_id: true },
  });

  if (existingClusterId) {
    throw new AppError("Cluster ID sudah digunakan, gunakan ID lain.", 409);
  }

  const createData = {
    ...data,
    cluster_id: normalizedClusterId,
    project_id: Number(data.project_id),
    created_by: Number(userId),
    updated_by: Number(userId),
    pic_id:
      data.pic_id !== undefined && data.pic_id !== null && data.pic_id !== ""
        ? Number(data.pic_id)
        : null,
  };

  if (createData.pic_id !== null) {
    const personil = await prisma.personil.findUnique({
      where: { personil_id: BigInt(createData.pic_id) },
      select: { personil_id: true },
    });
    if (!personil) {
      throw new AppError("Personil tidak ditemukan.", 404);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const cluster = await tx.cluster.create({
      data: createData,
      include: {
        project: { select: { project_id: true, nama_project: true } },
        pic: { select: { personil_id: true, nama: true } },
      },
    });

    await createAuditLog(
      {
        entityType: "cluster",
        entityId: BigInt(0),
        aksi: "create",
        actorId: userId,
        dataSebelum: null,
        dataSesudah: cluster,
      },
      tx
    );

    return cluster;
  });

  return result;
};

const update = async (clusterId, data) => {
  if (!clusterId) {
    throw new AppError("Cluster ID wajib diisi.", 400);
  }

  const updateData = {
    nama_cluster: data.nama_cluster,
    cluster_type: data.cluster_type,
    alamat_lengkap: data.alamat_lengkap,
    pic_id:
      data.pic_id !== undefined && data.pic_id !== null && data.pic_id !== ""
        ? Number(data.pic_id)
        : null,
  };

  if (updateData.pic_id !== null) {
    const personil = await prisma.personil.findUnique({
      where: { personil_id: BigInt(updateData.pic_id) },
      select: { personil_id: true },
    });
    if (!personil) {
      throw new AppError("Personil tidak ditemukan.", 404);
    }
  }

  return await clusterRepository.update(clusterId, updateData);
};

const toggleStatus = async (clusterId) => {
  if (!clusterId) {
    throw new AppError("Cluster ID wajib diisi.", 400);
  }

  const hasActiveBoq = await prisma.boq.findFirst({
    where: {
      cluster_id: clusterId,
      status: { in: ["draft", "aktif"] },
    },
    select: { boq_id: true },
  });

  const cluster = await clusterRepository.toggleStatus(clusterId);

  if (!cluster.status_aktif && hasActiveBoq) {
    return {
      ...cluster,
      warning: "Cluster dinonaktifkan, tetapi masih ada BOQ aktif yang menggunakan cluster ini.",
    };
  }

  return cluster;
};

const remove = async (clusterId, actorId) => {
  if (!clusterId) {
    throw new AppError("Cluster ID wajib diisi.", 400);
  }

  return await prisma.$transaction(async (tx) => {
    const cluster = await tx.cluster.findUnique({
      where: { cluster_id: clusterId },
    });

    if (!cluster) {
      throw new AppError("Cluster tidak ditemukan.", 404);
    }

    const [boqCount, tiketCount, projectCount] = await Promise.all([
      tx.boq.count({ where: { cluster_id: clusterId } }),
      tx.tiket_material.count({ where: { cluster_id: { not: null }, cluster_id: clusterId } }),
      tx.project.count({ where: { cluster_id: clusterId } }),
    ]);

    const usedBy = [];
    if (boqCount > 0) usedBy.push(`${boqCount} BOQ`);
    if (tiketCount > 0) usedBy.push(`${tiketCount} tiket material`);
    if (projectCount > 0) usedBy.push(`${projectCount} project`);

    if (usedBy.length > 0) {
      throw new AppError(
        `Cluster tidak dapat dihapus karena masih dipakai oleh ${usedBy.join(" dan ")}. Gunakan tombol Nonaktifkan.`,
        409
      );
    }

    await createAuditLog(
      {
        entityType: "cluster",
        entityId: BigInt(0),
        aksi: "delete",
        actorId: actorId,
        dataSebelum: cluster,
        dataSesudah: null,
      },
      tx
    );

    await tx.cluster.delete({
      where: { cluster_id: clusterId },
    });
  });
};

module.exports = {
  findByProjectId,
  findAll,
  create,
  update,
  toggleStatus,
  remove,
};
