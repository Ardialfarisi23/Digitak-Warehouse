const supplierRepository = require("./supplier.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const { createAuditLog } = require("../../utils/audit-log");

const create = async (data, userId) => {
  const existing = await supplierRepository.findByCode(data.kode, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode supplier sudah digunakan.", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({ data });

    await createAuditLog(
      {
        entityType: "supplier",
        entityId: supplier.supplier_id,
        aksi: "create",
        actorId: userId,
        dataSebelum: null,
        dataSesudah: supplier,
      },
      tx
    );

    return supplier;
  });

  return result;
};

const findAll = async (query) => {
  return await supplierRepository.findAll(query);
};

const findByCode = async (code) => {
  const record = await supplierRepository.findByCode(code, { includeInactive: true });

  if (!record) {
    throw new AppError("Supplier tidak ditemukan.", 404);
  }

  return record;
};

const update = async (kode, data) => {
  const record = await supplierRepository.findByCode(kode, { includeInactive: true });

  if (!record) {
    throw new AppError("Supplier tidak ditemukan.", 404);
  }

  if (!record.is_aktif) {
    throw new AppError("Supplier telah dinonaktifkan. Pulihkan untuk mengubah data.", 400);
  }
  if (data.kode && data.kode !== kode) {
    const existing = await supplierRepository.findByCode(data.kode, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode supplier sudah digunakan.", 400);
    }
  }

  return await supplierRepository.update(kode, data);
};

const softDelete = async (kode) => {
  const record = await supplierRepository.findByCode(kode, { includeInactive: true });

  if (!record) {
    throw new AppError("Supplier tidak ditemukan.", 404);
  }

  if (!record.is_aktif) {
    throw new AppError("Supplier sudah dinonaktifkan.", 400);
  }

  const result = await supplierRepository.softDelete(kode);

  try {
    await prisma.audit_log.create({
      data: {
        entity_type: "supplier",
        entity_id: BigInt(record.supplier_id),
        aksi: "soft_delete",
        actor_id: BigInt(record.updated_by || 0),
        data_sebelum: { is_aktif: true },
        data_sesudah: { is_aktif: false },
      },
    });
  } catch (auditErr) {
    console.error("Gagal membuat audit log soft_delete supplier:", auditErr);
  }

  return result;
};

const restore = async (kode) => {
  const record = await supplierRepository.findByCode(kode, { includeInactive: true });

  if (!record) {
    throw new AppError("Supplier tidak ditemukan.", 404);
  }

  if (record.is_aktif) {
    throw new AppError("Supplier sudah aktif.", 400);
  }

  const result = await supplierRepository.restore(kode);

  try {
    await prisma.audit_log.create({
      data: {
        entity_type: "supplier",
        entity_id: BigInt(record.supplier_id),
        aksi: "restore",
        actor_id: BigInt(record.updated_by || 0),
        data_sebelum: { is_aktif: false },
        data_sesudah: { is_aktif: true },
      },
    });
  } catch (auditErr) {
    console.error("Gagal membuat audit log restore supplier:", auditErr);
  }

  return result;
};

module.exports = {
  create,
  findAll,
  findByCode,
  update,
  softDelete,
  restore,
};
