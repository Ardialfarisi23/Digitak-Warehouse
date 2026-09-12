const zoneRepository = require("./zone.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const capacityService = require("../capacity/capacity.service");
const notificationService = require("../../modules/notifications/notifications.service");

const create = async (data) => {
  const kodeZona = data.kode_zona || data.code;
  const gudangId = data.gudang_id ? Number(data.gudang_id) : null;

  if (!gudangId) {
    throw new AppError("gudang_id wajib diisi.", 400);
  }

  const existing = await zoneRepository.findByKodeAndGudangId(kodeZona, gudangId, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode zone sudah digunakan di gudang ini.", 400);
  }

  const payload = {
    ...data,
    kode_zona: kodeZona,
    nama_zona: data.nama_zona || data.name || kodeZona,
    gudang_id: gudangId,
  };
  delete payload.code;
  delete payload.name;

  return await zoneRepository.create(payload);
};

const findAll = async (query) => {
  return await zoneRepository.findAll(query);
};

const findById = async (zona_id) => {
  const record = await zoneRepository.findById(zona_id);

  if (!record) {
    throw new AppError("Zone tidak ditemukan.", 404);
  }

  return record;
};

const findByKode = async (kode_zona) => {
  const record = await zoneRepository.findByKode(kode_zona, { includeInactive: true });

  if (!record) {
    throw new AppError("Zone tidak ditemukan.", 404);
  }

  return record;
};

const updateById = async (zona_id, data) => {
  const zonaId = Number(zona_id);
  const record = await zoneRepository.findById(zonaId);

  if (!record) {
    throw new AppError("Zone tidak ditemukan.", 404);
  }

  const newKode = data.kode_zona || data.code;
  if (newKode && newKode !== record.kode_zona) {
    const existing = await zoneRepository.findByKodeAndGudangId(newKode, record.gudang_id, { includeInactive: true });
    if (existing && existing.zona_id !== zonaId) {
      throw new AppError("Kode zone sudah digunakan di gudang ini.", 400);
    }
  }

  const payload = { ...data };
  if (newKode) payload.kode_zona = newKode;
  if (data.name) payload.nama_zona = data.name;
  delete payload.code;
  delete payload.name;
  delete payload.gudang_id;

  const result = await zoneRepository.update(zonaId, payload);

  try {
    const warehouse = result.gudang || await prisma.gudang.findUnique({
      where: { gudang_id: record.gudang_id },
      select: { gudang_id: true, nama_gudang: true, pic_id: true },
    });

    if (warehouse) {
      const [supervisors, staff] = await Promise.all([
        prisma.user_account.findMany({
          where: { role: "supervisor", is_aktif: true },
          select: { user_id: true },
        }),
        prisma.personil.findMany({
          where: {
            gudang_id: warehouse.gudang_id,
            user: {
              role: { in: ["staf_gudang"] },
              is_aktif: true,
            },
          },
          select: { user_id: true },
        }),
      ]);

      const userIds = [
        ...supervisors.map((s) => s.user_id).filter((id) => id != null),
        ...staff.map((p) => p.user_id).filter((id) => id != null),
      ];

      for (const uid of userIds) {
        await notificationService.create({
          userId: uid,
          type: "info",
          title: "Zona Diperbarui",
          message: `Zona ${record.kode_zona} di gudang ${warehouse.nama_gudang || warehouse.gudang_id} telah diperbarui.`,
          link: "/dashboard/master-data",
        });
      }
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi update zone:", notifErr);
  }

  return result;
};

const update = async (kode_zona, data) => {
  const record = await zoneRepository.findByKode(kode_zona, { includeInactive: true });

  if (!record) {
    throw new AppError("Zone tidak ditemukan.", 404);
  }

  const newKode = data.kode_zona || data.code;
  if (newKode && newKode !== kode_zona) {
    const existing = await zoneRepository.findByKodeAndGudangId(newKode, record.gudang_id, { includeInactive: true });
    if (existing && existing.zona_id !== record.zona_id) {
      throw new AppError("Kode zone sudah digunakan di gudang ini.", 400);
    }
  }

  const payload = { ...data };
  if (newKode) payload.kode_zona = newKode;
  if (data.name) payload.nama_zona = data.name;
  delete payload.code;
  delete payload.name;
  delete payload.gudang_id;

  const result = await zoneRepository.update(record.zona_id, payload);

  try {
    const warehouse = result.gudang || await prisma.gudang.findUnique({
      where: { gudang_id: record.gudang_id },
      select: { gudang_id: true, nama_gudang: true, pic_id: true },
    });

    if (warehouse) {
      const [supervisors, staff] = await Promise.all([
        prisma.user_account.findMany({
          where: { role: "supervisor", is_aktif: true },
          select: { user_id: true },
        }),
        prisma.personil.findMany({
          where: {
            gudang_id: warehouse.gudang_id,
            user: {
              role: { in: ["staf_gudang"] },
              is_aktif: true,
            },
          },
          select: { user_id: true },
        }),
      ]);

      const userIds = [
        ...supervisors.map((s) => s.user_id).filter((id) => id != null),
        ...staff.map((p) => p.user_id).filter((id) => id != null),
      ];

      for (const uid of userIds) {
        await notificationService.create({
          userId: uid,
          type: "info",
          title: "Zona Diperbarui",
          message: `Zona ${record.kode_zona} di gudang ${warehouse.nama_gudang || warehouse.gudang_id} telah diperbarui.`,
          link: "/dashboard/master-data",
        });
      }
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi update zone:", notifErr);
  }

  return result;
};

const updateUtilizationStatus = async (zona_id, body, userId) => {
  const zonaId = Number(zona_id);
  const { status_kecukupan, kapasitas_maksimum } = body;

  const zona = await prisma.zona_gudang.findUnique({
    where: { zona_id: zonaId },
    select: {
      zona_id: true,
      gudang_id: true,
      kapasitas_maksimum: true,
      status_kecukupan: true,
      status_kecukupan_source: true,
    },
  });

  if (!zona) {
    throw new AppError("Zona tidak ditemukan.", 404);
  }

  await prisma.$transaction(async (tx) => {
    if (kapasitas_maksimum !== undefined) {
      await tx.zona_gudang.update({
        where: { zona_id: zonaId },
        data: {
          kapasitas_maksimum: kapasitas_maksimum === null ? null : Number(kapasitas_maksimum),
        },
      });
    }

    if (status_kecukupan) {
      await tx.zona_gudang.update({
        where: { zona_id: zonaId },
        data: {
          status_kecukupan: status_kecukupan,
          status_kecukupan_source: "MANUAL",
          dinilai_oleh: Number(userId),
          dinilai_pada: new Date(),
        },
      });

      await tx.zona_utilisasi_log.create({
        data: {
          zona_id: zonaId,
          status: status_kecukupan,
          diperbarui_oleh: Number(userId),
          catatan: `Status kecukupan diperbarui menjadi ${status_kecukupan}`,
        },
      });

      return;
    }

    if (kapasitas_maksimum !== undefined) {
      await capacityService.recalculateZonaStatus(tx, zona.gudang_id, zonaId, Number(userId));
    }
  });

  const updatedZona = await prisma.zona_gudang.findUnique({
    where: { zona_id: zonaId },
    include: {
      dinilai_oleh_user: {
        select: {
          nama: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return {
    ...updatedZona,
    dinilai_oleh: updatedZona?.dinilai_oleh_user?.nama || null,
  };
};

const deleteZone = async (kode_zona) => {
  const record = await zoneRepository.findByKode(kode_zona, { includeInactive: true });

  if (!record) {
    throw new AppError("Zone tidak ditemukan.", 404);
  }

  const zonaId = record.zona_id;

  const [stockCount, logCount, sjItemCount] = await Promise.all([
    prisma.stok_gudang.count({ where: { zona_id: zonaId } }),
    prisma.zona_utilisasi_log.count({ where: { zona_id: zonaId } }),
    prisma.surat_jalan_item.count({ where: { zona_id: zonaId } }),
  ]);

  const dependencies = [];
  if (stockCount > 0) dependencies.push(`${stockCount} data stok`);
  if (logCount > 0) dependencies.push(`${logCount} riwayat utilisasi`);
  if (sjItemCount > 0) dependencies.push(`${sjItemCount} item surat jalan`);

  if (dependencies.length > 0) {
    throw new AppError(`Zona tidak bisa dihapus karena masih memiliki data terkait: ${dependencies.join(", ")}.`, 400);
  }

  await prisma.zona_gudang.delete({
    where: { zona_id: zonaId },
  });

  return { message: "Zone berhasil dihapus." };
};

const deleteById = async (zona_id) => {
  const zonaId = Number(zona_id);
  const record = await zoneRepository.findById(zonaId);

  if (!record) {
    throw new AppError("Zone tidak ditemukan.", 404);
  }

  const [stockCount, logCount, sjItemCount] = await Promise.all([
    prisma.stok_gudang.count({ where: { zona_id: zonaId } }),
    prisma.zona_utilisasi_log.count({ where: { zona_id: zonaId } }),
    prisma.surat_jalan_item.count({ where: { zona_id: zonaId } }),
  ]);

  const dependencies = [];
  if (stockCount > 0) dependencies.push(`${stockCount} data stok`);
  if (logCount > 0) dependencies.push(`${logCount} riwayat utilisasi`);
  if (sjItemCount > 0) dependencies.push(`${sjItemCount} item surat jalan`);

  if (dependencies.length > 0) {
    throw new AppError(`Zona tidak bisa dihapus karena masih memiliki data terkait: ${dependencies.join(", ")}.`, 400);
  }

  await prisma.zona_gudang.delete({
    where: { zona_id: zonaId },
  });

  return { message: "Zone berhasil dihapus." };
};

module.exports = {
  create,
  findAll,
  findById,
  findByKode,
  update,
  updateById,
  deleteZone,
  deleteById,
  updateUtilizationStatus,
};
