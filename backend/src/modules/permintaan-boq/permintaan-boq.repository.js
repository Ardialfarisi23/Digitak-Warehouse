const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const ALLOWED_SORT_FIELDS = ["permintaan_id", "status", "created_at", "updated_at"];

const create = async (data) => {
  return await prisma.permintaanBoq.create({
    data,
    include: {
      project: true,
      barang: true,
      tiket: true,
      diajukan_user: true,
      ditinjau_user: true,
    },
  });
};

const findAll = async ({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
  sortBy = "created_at",
  sortOrder = "desc",
  status,
  projectId,
}) => {
  const sanitizedPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const sanitizedLimit = Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1);
  const orderField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "created_at";
  const orderDirection = ["asc", "desc"].includes((sortOrder || "").toLowerCase())
    ? sortOrder.toLowerCase()
    : "desc";

  const where = {};

  if (status) {
    where.status = status.toLowerCase();
  }

  if (projectId) {
    where.project_id = Number(projectId);
  }

  if (search) {
    where.OR = [
      { alasan: { contains: search, mode: "insensitive" } },
      { barang: { nama_barang: { contains: search, mode: "insensitive" } } },
      { project: { nama_project: { contains: search, mode: "insensitive" } } },
    ];
  }

  const total = await prisma.permintaanBoq.count({
    where,
  });

  const data = await prisma.permintaanBoq.findMany({
    where,
    orderBy: {
      [orderField]: orderDirection,
    },
    skip: (sanitizedPage - 1) * sanitizedLimit,
    take: sanitizedLimit,
    include: {
      project: true,
      barang: true,
      tiket: true,
      diajukan_user: true,
      ditinjau_user: true,
    },
  });

  return {
    data,
    meta: {
      total,
      page: sanitizedPage,
      limit: sanitizedLimit,
      totalPages: Math.ceil(total / sanitizedLimit),
    },
  };
};

const findById = async (id) => {
  return await prisma.permintaanBoq.findUnique({
    where: { permintaan_id: Number(id) },
    include: {
      project: true,
      barang: true,
      tiket: true,
      diajukan_user: true,
      ditinjau_user: true,
    },
  });
};

const updateStatus = async (id, status, diajukan_oleh, ditinjau_oleh = null) => {
  const updateData = {
    status,
    updated_at: new Date(),
  };

  if (status === "ditinjau") {
    updateData.ditinjau_oleh = Number(ditinjau_oleh);
  }

  return await prisma.permintaanBoq.update({
    where: { permintaan_id: Number(id) },
    data: updateData,
    include: {
      project: true,
      barang: true,
      tiket: true,
      diajukan_user: true,
      ditinjau_user: true,
    },
  });
};

const softDelete = async (id) => {
  return await prisma.permintaanBoq.update({
    where: { permintaan_id: Number(id) },
    data: { status: "ditolak" },
    include: {
      project: true,
      barang: true,
      tiket: true,
      diajukan_user: true,
      ditinjau_user: true,
    },
  });
};

const restore = async (id) => {
  return await prisma.permintaanBoq.update({
    where: { permintaan_id: Number(id) },
    data: { status: "diajukan" },
    include: {
      project: true,
      barang: true,
      tiket: true,
      diajukan_user: true,
      ditinjau_user: true,
    },
  });
};

const getStats = async () => {
  const menungguReview = await prisma.permintaanBoq.count({
    where: { status: { in: ["diajukan", "ditinjau"] } },
  });

  const disetujui = await prisma.permintaanBoq.count({
    where: { status: "disetujui" },
  });

  const ditolak = await prisma.permintaanBoq.count({
    where: { status: "ditolak" },
  });

  return {
    menungguReview,
    disetujui,
    ditolak,
  };
};

module.exports = {
  create,
  findAll,
  findById,
  updateStatus,
  softDelete,
  restore,
  getStats,
};
