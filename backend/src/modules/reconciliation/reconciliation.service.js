const reconciliationRepository = require("./reconciliation.repository");
const prisma = require("../../config/prisma");
const { createAuditLog } = require("../../utils/audit-log");
const AppError = require("../../shared/errors");
const { pickLatestPerKey } = require("./reconciliation.utils");

/**
 * Refresh angka MOS & Used pada tiket_material.
 *
 * MOS = snapshot TERAKHIR laporan mitra untuk tiap (tiket, barang) lalu
 * dijumlahkan per barang. `laporan_mitra` berisi snapshot MOS per tanggal
 * laporan (bukan akumulasi), jadi memakai baris terbaru mencegah
 * penghitungan ganda ketika mitra meng-upload laporan lebih dari sekali untuk
 * (tiket, barang) yang sama.
 *
 * Used = penjumlahan seluruh laporan aktif (perilaku lama, tetap sama dengan
 * perhitungan `used` pada tabel rekonsiliasi).
 */
const refreshTiketMosUsed = async (tiketId, tx) => {
  const client = tx || prisma;

  const laporanRows = await client.laporan_mitra.findMany({
    where: {
      tiket_id: BigInt(tiketId),
      is_aktif: true,
    },
    select: {
      laporan_id: true,
      tiket_id: true,
      barang_id: true,
      nama_barang: true,
      mos: true,
      used: true,
      tanggal_laporan: true,
      uploaded_at: true,
    },
  });

  const latestByBarang = pickLatestPerKey(
    laporanRows,
    (row) => String(row.barang_id || row.nama_barang || ""),
    (row) => {
      const tanggal = row.tanggal_laporan ? new Date(row.tanggal_laporan).getTime() : 0;
      const uploaded = row.uploaded_at ? new Date(row.uploaded_at).getTime() : 0;
      return Math.max(tanggal, uploaded) + Number(row.laporan_id || 0) / 1e6;
    }
  );

  let mos = 0;
  let used = 0;
  for (const row of latestByBarang.values()) {
    mos += Number(row.mos || 0);
  }
  for (const row of laporanRows) {
    used += Number(row.used || 0);
  }

  await client.tiket_material.update({
    where: { tiket_id: BigInt(tiketId) },
    data: { mos, used },
  });
};

/**
 * Metrik rekonsiliasi kanonik per (cluster, barang).
 *
 * Nilainya diambil Langsung dari tabel rekonsiliasi (getInventory mode
 * cluster), sehingga angka MOS pada ringkasan rekonsiliasi dan angka MOS
 * yang disimpan pada riwayat laporan mitra dijamin identik (sumber data
 * tunggal).
 *
 * @returns {Promise<Map<string, {mos:number, boq:number, additional:number, remains:number}>>}
 *          key: `${clusterId}-${barangId}`
 */
const getRekonsiliasiMetricsByCluster = async (projectIds = []) => {
  const metrics = new Map();
  const uniqueProjectIds = Array.from(
    new Set((projectIds || []).filter((id) => id !== null && id !== undefined && id !== "").map((id) => String(id)))
  );

  for (const projectId of uniqueProjectIds) {
    const result = await reconciliationRepository.getInventory(
      {
        groupBy: "cluster",
        projectId,
        clusterId: "all",
        search: "",
        status: "all",
        warehouseId: "all",
      },
      null
    );

    for (const row of result?.data || []) {
      const clusterId = row.cluster_id;
      if (!clusterId) continue;
      metrics.set(`${clusterId}-${row.barang_id}`, {
        mos: Number(row.mos || 0),
        boq: Number(row.boq || 0),
        additional: Number(row.additional || 0),
        remains: Number(row.remains || 0),
      });
    }
  }

  return metrics;
};

const getInventory = async (filters = {}, actor = null) => {
  return await reconciliationRepository.getInventory(filters, actor);
};

const getFilterOptions = async (actor = null) => {
  const { boq_status } = require("@prisma/client");

  // Get projects that have BOQ items (status draft, aktif, selesai) with source top_down
  const projectsWithBoq = await prisma.project.findMany({
    where: {
      clusters: {
        some: {
          boqs: {
            some: {
              status: { in: [boq_status.aktif, boq_status.selesai] },
              source: "top_down",
            },
          },
        },
      },
    },
    select: {
      project_id: true,
      nama_project: true,
      clusters: {
        where: {
          boqs: {
            some: {
              status: { in: [boq_status.aktif, boq_status.selesai] },
              source: "top_down",
            },
          },
        },
        select: {
          cluster_id: true,
          nama_cluster: true,
        },
        orderBy: { nama_cluster: "asc" },
      },
    },
    orderBy: { nama_project: "asc" },
  });

  const projects = projectsWithBoq
    .filter((p) => p.clusters.length > 0)
    .map((p) => ({
      project_id: String(p.project_id),
      project_nama: p.nama_project,
      clusters: p.clusters.map((c) => ({
        cluster_id: c.cluster_id,
        nama_cluster: c.nama_cluster,
      })),
    }));

  return { projects };
};

const saveRemainsNote = async (payload, user) => {
  const { project_id, cluster_id, barang_id, keterangan } = payload;

  const project = await prisma.project.findUnique({ where: { project_id: BigInt(project_id) } });
  if (!project) throw new AppError("Project tidak ditemukan", 404);

  const barang = await prisma.barang.findUnique({ where: { barang_id: BigInt(barang_id), is_aktif: true } });
  if (!barang) throw new AppError("Barang tidak ditemukan", 404);

  if (cluster_id) {
    const cluster = await prisma.cluster.findUnique({ where: { cluster_id } });
    if (!cluster) throw new AppError("Cluster tidak ditemukan", 404);
    if (cluster.project_id !== BigInt(project_id)) throw new AppError("Cluster tidak milik project ini", 400);
  }

  const existing = await prisma.reconciliation_remains_note.findFirst({
    where: {
      project_id: BigInt(project_id),
      barang_id: BigInt(barang_id),
      cluster_id: cluster_id || null,
    },
  });

  let result;
  const isDelete = !keterangan || keterangan.trim() === "";

  await prisma.$transaction(async (tx) => {
    if (isDelete) {
      if (existing) {
        await tx.audit_log.create({
          data: {
            entity_type: "reconciliation_remains_note",
            entity_id: existing.id,
            aksi: "delete",
            actor_id: BigInt(user.id),
            data_sebelum: { project_id, cluster_id: cluster_id || null, barang_id, keterangan: existing.keterangan },
            data_sesudah: null,
          },
        });
        await tx.reconciliation_remains_note.delete({ where: { id: existing.id } });
        result = null;
      } else {
        result = null;
      }
    } else {
      const trimmed = keterangan.trim();
      if (existing) {
        await tx.audit_log.create({
          data: {
            entity_type: "reconciliation_remains_note",
            entity_id: existing.id,
            aksi: "update",
            actor_id: BigInt(user.id),
            data_sebelum: { keterangan: existing.keterangan },
            data_sesudah: { keterangan: trimmed },
          },
        });
        result = await tx.reconciliation_remains_note.update({
          where: { id: existing.id },
          data: { keterangan: trimmed, updated_by: BigInt(user.id) },
        });
      } else {
        result = await tx.reconciliation_remains_note.create({
          data: {
            project_id: BigInt(project_id),
            cluster_id: cluster_id || null,
            barang_id: BigInt(barang_id),
            keterangan: trimmed,
            created_by: BigInt(user.id),
            updated_by: BigInt(user.id),
          },
        });
        await tx.audit_log.create({
          data: {
            entity_type: "reconciliation_remains_note",
            entity_id: result.id,
            aksi: "create",
            actor_id: BigInt(user.id),
            data_sebelum: null,
            data_sesudah: { project_id, cluster_id: cluster_id || null, barang_id, keterangan: trimmed },
          },
        });
      }
    }
  });

  return result;
};

module.exports = {
  getInventory,
  getFilterOptions,
  getRekonsiliasiMetricsByCluster,
  refreshTiketMosUsed,
  saveRemainsNote,
};
