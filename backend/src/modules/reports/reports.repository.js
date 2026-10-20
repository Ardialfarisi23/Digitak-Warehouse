const prisma = require("../../config/prisma");
const { getAksiLabel, getEntityTypeLabel, getRoleLabel, formatAuditMetadata } = require("../../utils/audit-labels");
const AppError = require("../../shared/errors");
const reconciliationService = require("../reconciliation/reconciliation.service");
const returnRepository = require("../return/return.repository");
const { getApprovedReturnsAfterSnapshot, getLatestPhysicalSnapshot } = returnRepository;
const additionalRepository = require("../additional/additional.repository");
const { isMosEligibleInbound } = require("../reconciliation/reconciliation.utils");

const AUDIT_AKSI_VALUES = [
  "create",
  "update",
  "delete",
  "approve",
  "receive_inbound",
  "approve_inbound",
  "approve_outbound",
  "confirm_distributed",
  "reject_inbound",
  "reject_outbound",
  "putaway",
  "retrieve",
  "create_inbound",
  "create_outbound",
];

const enrichAuditEntityNames = async (logs) => {
  if (!Array.isArray(logs) || logs.length === 0) {
    return logs.map((log) => ({ ...log, entity_name: null, entity_refs_resolved: {} }));
  }

  const groupedEntity = new Map();
  const refGroups = {
    tiket_id: new Set(),
    surat_jalan_id: new Set(),
    gudang_asal_id: new Set(),
    gudang_tujuan_id: new Set(),
    project_id: new Set(),
    boq_id: new Set(),
    zona_id: new Set(),
    barang_id: new Set(),
    surat_jalan_item_id: new Set(),
    created_by: new Set(),
    updated_by: new Set(),
    kategori_id: new Set(),
    satuan_default_id: new Set(),
    gudang_id: new Set(),
    personil_id: new Set(),
    kendaraan_id: new Set(),
    supplier_id: new Set(),
    user_id: new Set(),
    pic_id: new Set(),
  };

  for (const log of logs) {
    const type = log.entity_type;
    if (!groupedEntity.has(type)) {
      groupedEntity.set(type, new Set());
    }
    groupedEntity.get(type).add(Number(log.entity_id));

    for (const payload of [log.data_sebelum, log.data_sesudah]) {
      if (!payload || typeof payload !== "object") continue;
      for (const key of Object.keys(payload)) {
        if (key in refGroups) {
          const value = Number(payload[key]);
          if (Number.isFinite(value) && value > 0) {
            refGroups[key].add(value);
          }
        }
      }
    }
  }

  const nameMap = new Map();
  const refMaps = {
    tiket_id: new Map(),
    surat_jalan_id: new Map(),
    gudang_asal_id: new Map(),
    gudang_tujuan_id: new Map(),
    project_id: new Map(),
    boq_id: new Map(),
    zona_id: new Map(),
    barang_id: new Map(),
    surat_jalan_item_id: new Map(),
    created_by: new Map(),
    updated_by: new Map(),
    kategori_id: new Map(),
    satuan_default_id: new Map(),
    gudang_id: new Map(),
    personil_id: new Map(),
    kendaraan_id: new Map(),
    supplier_id: new Map(),
    user_id: new Map(),
    pic_id: new Map(),
  };

  for (const [entityType, idSet] of groupedEntity) {
    const ids = Array.from(idSet).filter((id) => Number.isFinite(id) && id > 0);
    if (!ids.length) continue;

    switch (entityType) {
      case "boq": {
        const rows = await prisma.boq.findMany({
          where: { boq_id: { in: ids } },
          select: { boq_id: true, boq_number: true },
        });
        for (const row of rows) {
          nameMap.set(`boq:${row.boq_id}`, row.boq_number);
        }
        break;
      }
      case "surat_jalan": {
        const rows = await prisma.surat_jalan.findMany({
          where: { surat_jalan_id: { in: ids } },
          select: { surat_jalan_id: true, nomor_surat_jalan: true },
        });
        for (const row of rows) {
          nameMap.set(`surat_jalan:${row.surat_jalan_id}`, row.nomor_surat_jalan);
        }
        break;
      }
      case "project": {
        const rows = await prisma.project.findMany({
          where: { project_id: { in: ids } },
          select: { project_id: true, nama_project: true },
        });
        for (const row of rows) {
          nameMap.set(`project:${row.project_id}`, row.nama_project);
        }
        break;
      }
      case "item": {
        const rows = await prisma.barang.findMany({
          where: { barang_id: { in: ids } },
          select: { barang_id: true, nama_barang: true, kode_perangkat: true },
        });
        for (const row of rows) {
          nameMap.set(`item:${row.barang_id}`, row.nama_barang || row.kode_perangkat || `Barang ${row.barang_id}`);
        }
        break;
      }
      case "personil": {
        const rows = await prisma.personil.findMany({
          where: { personil_id: { in: ids } },
          select: { personil_id: true, nama: true },
        });
        for (const row of rows) {
          nameMap.set(`personil:${row.personil_id}`, row.nama || `Personil ${row.personil_id}`);
        }
        break;
      }
      case "vehicle": {
        const rows = await prisma.kendaraan.findMany({
          where: { kendaraan_id: { in: ids } },
          select: { kendaraan_id: true, no_polisi: true, jenis_kendaraan: true },
        });
        for (const row of rows) {
          nameMap.set(`vehicle:${row.kendaraan_id}`, row.no_polisi || row.jenis_kendaraan || `Kendaraan ${row.kendaraan_id}`);
        }
        break;
      }
      case "supplier": {
        const rows = await prisma.supplier.findMany({
          where: { supplier_id: { in: ids } },
          select: { supplier_id: true, nama: true, kode: true },
        });
        for (const row of rows) {
          nameMap.set(`supplier:${row.supplier_id}`, row.nama || row.kode || `Supplier ${row.supplier_id}`);
        }
        break;
      }
      case "warehouse": {
        const rows = await prisma.gudang.findMany({
          where: { gudang_id: { in: ids } },
          select: { gudang_id: true, nama_gudang: true },
        });
        for (const row of rows) {
          nameMap.set(`warehouse:${row.gudang_id}`, row.nama_gudang || `Gudang ${row.gudang_id}`);
        }
        break;
      }
      case "titik_lapangan": {
        const rows = await prisma.titik_lapangan.findMany({
          where: { titik_lapangan_id: { in: ids } },
          select: { titik_lapangan_id: true, nama_lokasi: true },
        });
        for (const row of rows) {
          nameMap.set(`titik_lapangan:${row.titik_lapangan_id}`, row.nama_lokasi);
        }
        break;
      }
      case "user_account": {
        const rows = await prisma.user_account.findMany({
          where: { user_id: { in: ids } },
          select: { user_id: true, nama: true },
        });
        for (const row of rows) {
          nameMap.set(`user_account:${row.user_id}`, row.nama);
        }
        break;
      }
      case "reconciliation":
      case "reconciliation_remains_note": {
        // `reconciliation` tidak punya tabel tersendiri (entity_id = tiket_id).
        // `reconciliation_remains_note` punya tabel sendiri tapi hanya berisi
        // keterangan bebas, jadi tetap ditampilkan sebagai judul catatan.
        if (entityType === "reconciliation") break;

        const rows = await prisma.reconciliation_remains_note.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            keterangan: true,
            project: { select: { nama_project: true } },
            barang: { select: { nama_barang: true } },
          },
        });
        for (const row of rows) {
          const projectName = row.project?.nama_project || "-";
          const barangName = row.barang?.nama_barang || "-";
          const note = row.keterangan ? String(row.keterangan).trim() : "";
          nameMap.set(
            `reconciliation_remains_note:${row.id}`,
            note ? `${barangName} - ${projectName}: ${note}` : `${barangName} - ${projectName}`
          );
        }
        break;
      }
      default:
        break;
    }
  }

  if (refGroups.tiket_id.size) {
    const ids = Array.from(refGroups.tiket_id);
    const rows = await prisma.tiket_material.findMany({
      where: { tiket_id: { in: ids } },
      select: { tiket_id: true, kode_tiket: true },
    });
    for (const row of rows) {
      refMaps.tiket_id.set(Number(row.tiket_id), row.kode_tiket);
    }
  }

  if (refGroups.surat_jalan_id.size) {
    const ids = Array.from(refGroups.surat_jalan_id);
    const rows = await prisma.surat_jalan.findMany({
      where: { surat_jalan_id: { in: ids } },
      select: { surat_jalan_id: true, nomor_surat_jalan: true },
    });
    for (const row of rows) {
      refMaps.surat_jalan_id.set(Number(row.surat_jalan_id), row.nomor_surat_jalan);
    }
  }

  if (refGroups.gudang_asal_id.size) {
    const ids = Array.from(refGroups.gudang_asal_id);
    const rows = await prisma.gudang.findMany({
      where: { gudang_id: { in: ids } },
      select: { gudang_id: true, nama_gudang: true },
    });
    for (const row of rows) {
      refMaps.gudang_asal_id.set(Number(row.gudang_id), row.nama_gudang);
    }
  }

  if (refGroups.gudang_tujuan_id.size) {
    const ids = Array.from(refGroups.gudang_tujuan_id);
    const rows = await prisma.gudang.findMany({
      where: { gudang_id: { in: ids } },
      select: { gudang_id: true, nama_gudang: true },
    });
    for (const row of rows) {
      refMaps.gudang_tujuan_id.set(Number(row.gudang_id), row.nama_gudang);
    }
  }

  if (refGroups.project_id.size) {
    const ids = Array.from(refGroups.project_id);
    const rows = await prisma.project.findMany({
      where: { project_id: { in: ids } },
      select: { project_id: true, nama_project: true },
    });
    for (const row of rows) {
      refMaps.project_id.set(Number(row.project_id), row.nama_project);
    }
  }

  if (refGroups.boq_id.size) {
    const ids = Array.from(refGroups.boq_id);
    const rows = await prisma.boq.findMany({
      where: { boq_id: { in: ids } },
      select: { boq_id: true, boq_number: true },
    });
    for (const row of rows) {
      refMaps.boq_id.set(Number(row.boq_id), row.boq_number);
    }
  }

  if (refGroups.zona_id.size) {
    const ids = Array.from(refGroups.zona_id);
    const rows = await prisma.zona_gudang.findMany({
      where: { zona_id: { in: ids } },
      select: { zona_id: true, nama_zona: true, kode_zona: true },
    });
    for (const row of rows) {
      refMaps.zona_id.set(Number(row.zona_id), row.nama_zona || row.kode_zona || `Zona ${row.zona_id}`);
    }
  }

  if (refGroups.barang_id.size) {
    const ids = Array.from(refGroups.barang_id);
    const rows = await prisma.barang.findMany({
      where: { barang_id: { in: ids } },
      select: { barang_id: true, nama_barang: true, kode_perangkat: true },
    });
    for (const row of rows) {
      refMaps.barang_id.set(Number(row.barang_id), row.nama_barang || row.kode_perangkat || `Barang ${row.barang_id}`);
    }
  }

  if (refGroups.surat_jalan_item_id.size) {
    const ids = Array.from(refGroups.surat_jalan_item_id);
    const rows = await prisma.surat_jalan_item.findMany({
      where: { item_id: { in: ids } },
      select: { item_id: true, barang_id: true, qty: true },
    });
    for (const row of rows) {
      refMaps.surat_jalan_item_id.set(Number(row.item_id), `Item #${row.item_id} (barang ${row.barang_id}, qty ${row.qty})`);
    }
  }

  if (refGroups.created_by.size) {
    const ids = Array.from(refGroups.created_by);
    const rows = await prisma.user_account.findMany({
      where: { user_id: { in: ids } },
      select: { user_id: true, nama: true },
    });
    for (const row of rows) {
      refMaps.created_by.set(Number(row.user_id), row.nama || `User ${row.user_id}`);
    }
  }

  if (refGroups.updated_by.size) {
    const ids = Array.from(refGroups.updated_by);
    const rows = await prisma.user_account.findMany({
      where: { user_id: { in: ids } },
      select: { user_id: true, nama: true },
    });
    for (const row of rows) {
      refMaps.updated_by.set(Number(row.user_id), row.nama || `User ${row.user_id}`);
    }
  }

  if (refGroups.kategori_id.size) {
    const ids = Array.from(refGroups.kategori_id);
    const rows = await prisma.kategori_barang.findMany({
      where: { kategori_id: { in: ids } },
      select: { kategori_id: true, nama_kategori: true },
    });
    for (const row of rows) {
      refMaps.kategori_id.set(Number(row.kategori_id), row.nama_kategori || `Kategori ${row.kategori_id}`);
    }
  }

  if (refGroups.satuan_default_id.size) {
    const ids = Array.from(refGroups.satuan_default_id);
    const rows = await prisma.satuan.findMany({
      where: { satuan_id: { in: ids } },
      select: { satuan_id: true, kode_satuan: true },
    });
    for (const row of rows) {
      refMaps.satuan_default_id.set(Number(row.satuan_id), row.kode_satuan || `Satuan ${row.satuan_id}`);
    }
  }

  if (refGroups.gudang_id.size) {
    const ids = Array.from(refGroups.gudang_id);
    const rows = await prisma.gudang.findMany({
      where: { gudang_id: { in: ids } },
      select: { gudang_id: true, nama_gudang: true },
    });
    for (const row of rows) {
      refMaps.gudang_id.set(Number(row.gudang_id), row.nama_gudang || `Gudang ${row.gudang_id}`);
    }
  }

  if (refGroups.personil_id.size) {
    const ids = Array.from(refGroups.personil_id);
    const rows = await prisma.personil.findMany({
      where: { personil_id: { in: ids } },
      select: { personil_id: true, nama: true },
    });
    for (const row of rows) {
      refMaps.personil_id.set(Number(row.personil_id), row.nama || `Personil ${row.personil_id}`);
    }
  }

  if (refGroups.kendaraan_id.size) {
    const ids = Array.from(refGroups.kendaraan_id);
    const rows = await prisma.kendaraan.findMany({
      where: { kendaraan_id: { in: ids } },
      select: { kendaraan_id: true, no_polisi: true, jenis_kendaraan: true },
    });
    for (const row of rows) {
      refMaps.kendaraan_id.set(Number(row.kendaraan_id), row.no_polisi || row.jenis_kendaraan || `Kendaraan ${row.kendaraan_id}`);
    }
  }

  if (refGroups.supplier_id.size) {
    const ids = Array.from(refGroups.supplier_id);
    const rows = await prisma.supplier.findMany({
      where: { supplier_id: { in: ids } },
      select: { supplier_id: true, nama: true, kode: true },
    });
    for (const row of rows) {
      refMaps.supplier_id.set(Number(row.supplier_id), row.nama || row.kode || `Supplier ${row.supplier_id}`);
    }
  }

  if (refGroups.user_id.size) {
    const ids = Array.from(refGroups.user_id);
    const rows = await prisma.user_account.findMany({
      where: { user_id: { in: ids } },
      select: { user_id: true, nama: true },
    });
    for (const row of rows) {
      refMaps.user_id.set(Number(row.user_id), row.nama || `User ${row.user_id}`);
    }
  }

  if (refGroups.pic_id.size) {
    const ids = Array.from(refGroups.pic_id);
    const rows = await prisma.personil.findMany({
      where: { personil_id: { in: ids } },
      select: { personil_id: true, nama: true },
    });
    for (const row of rows) {
      refMaps.pic_id.set(Number(row.personil_id), row.nama || `Personil ${row.personil_id}`);
    }
  }

  return logs.map((log) => {
    const entity_refs_resolved = {};
    for (const key of Object.keys(refGroups)) {
      const value = log.data_sebelum?.[key] ?? log.data_sesudah?.[key];
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0 && refMaps[key].has(numeric)) {
        entity_refs_resolved[key] = refMaps[key].get(numeric);
      } else {
        entity_refs_resolved[key] = null;
      }
    }

    return {
      ...log,
      entity_name: nameMap.get(`${log.entity_type}:${String(log.entity_id)}`) ?? (log.entity_type === "cluster" ? (log.data_sesudah?.nama_cluster || log.data_sebelum?.nama_cluster || null) : null),
      entity_refs_resolved,
    };
  });
};

/**
 * Mengubah filter ID dari query string menjadi BigInt secara aman.
 * Mengembalikan null bila filter tidak dipakai ("all"/kosong/undefined),
 * dan melempar AppError 400 (bukan 500) bila nilainya bukan ID numerik.
 */
const parseIdFilter = (value, fieldName) => {
  if (value === undefined || value === null) return null;

  const raw = String(value).trim();
  if (!raw || raw === "all") return null;

  if (!/^\d+$/.test(raw)) {
    throw new AppError(
      `Parameter "${fieldName}" harus berupa ID numerik, diterima: "${raw}".`,
      400
    );
  }

  return BigInt(raw);
};

const buildZonaFallbackMap = async (rows, prisma) => {
  const candidates = rows.filter(
    (r) =>
      r.surat_jalan_item?.surat_jalan?.tipe === "inbound" &&
      r.surat_jalan_item?.surat_jalan?.status === "diterima_didistribusikan" &&
      !r.surat_jalan_item?.zona_id &&
      r.surat_jalan_item?.surat_jalan?.gudang_tujuan_id
  );

  if (!candidates.length) {
    return new Map();
  }

  const uniqueKeys = new Set();
  for (const r of candidates) {
    uniqueKeys.add(`${r.barang_id}:${r.surat_jalan_item.surat_jalan.gudang_tujuan_id}`);
  }

  if (!uniqueKeys.size) {
    return new Map();
  }

  const orConditions = Array.from(uniqueKeys).map((key) => {
    const [barang_id, gudang_id] = key.split(":").map(Number);
    return { barang_id, gudang_id };
  });

  const stokRecords = await prisma.stok_gudang.findMany({
    where: { OR: orConditions },
    select: { barang_id: true, gudang_id: true, zona_id: true },
  });

  const grouped = new Map();
  for (const record of stokRecords) {
    const key = `${record.barang_id}:${record.gudang_id}`;
    if (!grouped.has(key)) {
      grouped.set(key, new Set());
    }
    if (record.zona_id != null) {
      grouped.get(key).add(Number(record.zona_id));
    }
  }

  const fallbackMap = new Map();
  for (const [key, zonaIds] of grouped) {
    if (zonaIds.size === 1) {
      fallbackMap.set(key, Array.from(zonaIds)[0]);
    }
  }

  return fallbackMap;
};

const buildPickZonaMap = async (rows, prisma) => {
  const allZonaIds = new Set();
  for (const r of rows) {
    const picks = r.surat_jalan_item?.picks;
    if (Array.isArray(picks)) {
      for (const p of picks) {
        if (p?.zona_id != null) {
          allZonaIds.add(Number(p.zona_id));
        }
      }
    }
  }

  if (!allZonaIds.size) {
    return new Map();
  }

  const zonaRecords = await prisma.zona_gudang.findMany({
    where: { zona_id: { in: Array.from(allZonaIds) } },
    select: {
      zona_id: true,
      kode_zona: true,
      nama_zona: true,
      tipe_zona: true,
      gudang: {
        select: {
          nama_gudang: true,
        },
      },
    },
  });

  const zonaMap = new Map();
  for (const z of zonaRecords) {
    zonaMap.set(Number(z.zona_id), z);
  }

  const result = new Map();
  for (const r of rows) {
    const picks = r.surat_jalan_item?.picks;
    if (!Array.isArray(picks) || !picks.length) {
      result.set(Number(r.ledger_id), null);
      continue;
    }

    const uniqueZonaIds = [...new Set(picks.map((p) => Number(p.zona_id)).filter((id) => !Number.isNaN(id)))];
    if (uniqueZonaIds.length === 0) {
      result.set(Number(r.ledger_id), null);
      continue;
    }

    if (uniqueZonaIds.length === 1) {
      result.set(Number(r.ledger_id), zonaMap.get(uniqueZonaIds[0]) || null);
      continue;
    }

    const labels = uniqueZonaIds
      .map((id) => {
        const z = zonaMap.get(id);
        if (!z) return null;
        const nama = z.nama_zona || z.kode_zona || `Zona ${id}`;
        const gudang = z.gudang?.nama_gudang || "";
        return gudang ? `${nama} / ${gudang}` : nama;
      })
      .filter(Boolean);

    result.set(Number(r.ledger_id), labels.join(", "));
  }

  return result;
};

const resolveAsal = (ledger) => {
  const item = ledger.surat_jalan_item;
  const suratJalan = item?.surat_jalan;

  if (!suratJalan) {
    return { asal_label: null, asal_tipe: null };
  }

  if (suratJalan.tipe === "inbound") {
    if (suratJalan.gudang_asal?.nama_gudang) {
      return { asal_label: suratJalan.gudang_asal.nama_gudang, asal_tipe: "gudang" };
    }
    if (suratJalan.tipe_pengirim === "external") {
      const nama = suratJalan.supplier?.nama || suratJalan.pengirim_eksternal_nama || null;
      if (nama) {
        return { asal_label: nama, asal_tipe: "pemasok" };
      }
    }
    if (suratJalan.project?.nama_project) {
      return { asal_label: suratJalan.project.nama_project, asal_tipe: "project" };
    }
    return { asal_label: null, asal_tipe: null };
  }

  if (suratJalan.tipe === "outbound") {
    if (suratJalan.gudang_asal?.nama_gudang) {
      return { asal_label: suratJalan.gudang_asal.nama_gudang, asal_tipe: "gudang" };
    }
    const zonaGudang = item?.zona?.gudang?.nama_gudang;
    if (zonaGudang) {
      return { asal_label: zonaGudang, asal_tipe: "gudang_stok" };
    }
    return { asal_label: null, asal_tipe: null };
  }

  if (ledger.return_transaction) {
    const rt = ledger.return_transaction;
    const zonaGudang = rt.surat_jalan_item?.zona?.gudang?.nama_gudang;
    if (zonaGudang) {
      return { asal_label: zonaGudang, asal_tipe: "return" };
    }
    if (rt.project?.nama_project) {
      return { asal_label: rt.project.nama_project, asal_tipe: "project" };
    }
    return { asal_label: null, asal_tipe: null };
  }

  if (suratJalan.gudang_asal?.nama_gudang) {
    return { asal_label: suratJalan.gudang_asal.nama_gudang, asal_tipe: "gudang" };
  }
  return { asal_label: null, asal_tipe: null };
};

const getPutawayLedgerIds = async (prismaOrTx) => {
  const putawayRows = await prismaOrTx.$queryRaw`
    WITH pairs AS (
      SELECT
        a.ledger_id AS out_id,
        b.ledger_id AS in_id
      FROM stok_ledger a
      JOIN stok_ledger b ON a.surat_jalan_item_id = b.surat_jalan_item_id
      WHERE a.jenis_mutasi = 'out'
        AND b.jenis_mutasi = 'in'
        AND a.return_transaction_id IS NULL
        AND b.return_transaction_id IS NULL
        AND (
          (a.waktu_mutasi < b.waktu_mutasi AND ABS(EXTRACT(EPOCH FROM (b.waktu_mutasi - a.waktu_mutasi))) <= 1.0)
          OR (a.waktu_mutasi = b.waktu_mutasi AND a.ledger_id < b.ledger_id)
        )
    ),
    out_counts AS (
      SELECT out_id, COUNT(*) AS cnt FROM pairs GROUP BY out_id
    ),
    in_counts AS (
      SELECT in_id, COUNT(*) AS cnt FROM pairs GROUP BY in_id
    ),
    unique_pairs AS (
      SELECT p.out_id, p.in_id
      FROM pairs p
      JOIN out_counts oc ON p.out_id = oc.out_id AND oc.cnt = 1
      JOIN in_counts ic ON p.in_id = ic.in_id AND ic.cnt = 1
    )
    SELECT out_id AS ledger_id FROM unique_pairs
    UNION
    SELECT in_id AS ledger_id FROM unique_pairs
  `;
  return Array.isArray(putawayRows)
    ? putawayRows.map((row) => {
        const raw = row.ledger_id;
        if (typeof raw === 'bigint') return raw;
        if (typeof raw === 'number' && Number.isFinite(raw)) return BigInt(Math.trunc(raw));
        return null;
      }).filter((val) => val !== null)
    : [];
};

const getStockHistory = async (filters = {}) => {
  const {
    search = "",
    projectId = "all",
    warehouseId = "all",
    zonaId = "all",
    kategoriId = "all",
    type = "all",
    status = "all",
    startDate,
    endDate,
    page = 1,
    limit = 50,
    include_putaway = "false",
  } = filters;

  const where = {};

  if (include_putaway !== "true") {
    const putawayIds = await getPutawayLedgerIds(prisma);
    if (putawayIds.length > 0) {
      where.ledger_id = { notIn: putawayIds };
    }
  }

  if (search.trim()) {
    const s = search.trim();
    where.OR = [
      { barang: { nama_barang: { contains: s, mode: "insensitive" } } },
      { barang: { kode_perangkat: { contains: s, mode: "insensitive" } } },
      {
        surat_jalan_item: {
          surat_jalan: {
            OR: [
              { nomor_surat_jalan: { contains: s, mode: "insensitive" } },
              {
                boq: {
                  tiket: {
                    kode_tiket: { contains: s, mode: "insensitive" },
                  },
                },
              },
            ],
          },
        },
      },
    ];
  }

  // --- Filter di level surat_jalan (project / tipe / status / gudang) ---
  const suratJalanWhere = {};

  const projectIdFilter = parseIdFilter(projectId, "projectId");
  if (projectIdFilter !== null) {
    suratJalanWhere.project_id = projectIdFilter;
  }
  if (type && type !== "all") {
    suratJalanWhere.tipe = type;
  }
  if (status && status !== "all") {
    suratJalanWhere.status = status;
  }

  const warehouseIdFilter = parseIdFilter(warehouseId, "warehouseId");
  if (warehouseIdFilter !== null) {
    suratJalanWhere.OR = [
      { gudang_asal_id: warehouseIdFilter },
      { gudang_tujuan_id: warehouseIdFilter },
    ];
  }

  // --- Filter di level surat_jalan_item (zona) ---
  // Sengaja memfilter memakai zona_id (PK, unik global), BUKAN kode_zona.
  // zona_gudang hanya punya @@unique([gudang_id, kode_zona]), jadi "Zona A"
  // ada di beberapa gudang; memfilter by kode_zona akan mencampur gudang.
  const suratJalanItemWhere = {};

  const zonaIdFilter = parseIdFilter(zonaId, "zonaId");
  if (zonaIdFilter !== null) {
    suratJalanItemWhere.zona_id = zonaIdFilter;
  }

  if (Object.keys(suratJalanWhere).length > 0) {
    suratJalanItemWhere.surat_jalan = suratJalanWhere;
  }

  if (Object.keys(suratJalanItemWhere).length > 0) {
    where.surat_jalan_item = suratJalanItemWhere;
  }

  // --- Filter di level barang (kategori perangkat) ---
  // stok_ledger punya FK barang_id sendiri, jadi cukup 1 hop tanpa lewat
  // surat_jalan_item.
  const kategoriIdFilter = parseIdFilter(kategoriId, "kategoriId");
  if (kategoriIdFilter !== null) {
    where.barang = { kategori_id: kategoriIdFilter };
  }

  if (startDate || endDate) {
    where.waktu_mutasi = {};
    if (startDate) where.waktu_mutasi.gte = new Date(startDate);
    if (endDate) where.waktu_mutasi.lte = new Date(endDate + "T23:59:59");
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.stok_ledger.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { waktu_mutasi: "desc" },
      include: {
        return_transaction: {
          include: {
            surat_jalan_item: {
              include: {
                zona: {
                  select: {
                    zona_id: true,
                    nama_zona: true,
                    gudang: {
                      select: {
                        nama_gudang: true,
                      },
                    },
                  },
                },
              },
            },
            project: {
              select: {
                project_id: true,
                nama_project: true,
              },
            },
          },
        },
        barang: {
          select: {
            kode_perangkat: true,
            nama_barang: true,
            kategori: {
              select: {
                kategori_id: true,
                nama_kategori: true,
              },
            },
          },
        },
        surat_jalan_item: {
          include: {
            surat_jalan: {
              select: {
                surat_jalan_id: true,
                nomor_surat_jalan: true,
                alamat_lapangan: true,
                tipe: true,
                status: true,
                gudang_asal_id: true,
                gudang_tujuan_id: true,
                tipe_pengirim: true,
                pengirim_eksternal_nama: true,
                supplier: {
                  select: {
                    supplier_id: true,
                    nama: true,
                    kode: true,
                  },
                },
                project: {
                  select: {
                    nama_project: true,
                    area: true,
                  },
                },
                gudang_asal: {
                  select: {
                    nama_gudang: true,
                  },
                },
                gudang_tujuan: {
                  select: {
                    nama_gudang: true,
                  },
                },
                titik_lapangan: {
                  select: {
                    nama_lokasi: true,
                  },
                },
                boq: {
                  include: {
                    tiket: {
                      select: {
                        tiket_id: true,
                        kode_tiket: true,
                      },
                    },
                  },
                },
                creator: {
                  select: {
                    nama: true,
                    role: true,
                  },
                },
              },
            },
            barang: {
              select: {
                kode_perangkat: true,
                nama_barang: true,
                kategori: {
                  select: {
                    kategori_id: true,
                    nama_kategori: true,
                  },
                },
              },
            },
            satuan: {
              select: {
                kode_satuan: true,
              },
            },
            // Zona penempatan item. Hanya terisi untuk item yang sudah melewati
            // alur putaway (surat_jalan_item.zona_id nullable), jadi bisa null.
            // kode_zona cuma unik per gudang -> nama gudang ikut diambil supaya
            // "Zona A" tidak ambigu antar gudang.
            zona: {
              select: {
                zona_id: true,
                kode_zona: true,
                nama_zona: true,
                tipe_zona: true,
                gudang: {
                  select: {
                    nama_gudang: true,
                  },
                },
              },
            },
            picks: {
              select: {
                zona_id: true,
                qty: true,
                picked_at: true,
              },
              orderBy: {
                picked_at: "asc",
              },
            },
          },
        },
      },
    }),
    prisma.stok_ledger.count({ where }),
  ]);

  const zonaFallbackMap = await buildZonaFallbackMap(data, prisma);
  const pickZonaMap = await buildPickZonaMap(data, prisma);

  const putawayLedgerIds = new Set();
  const uniqueSjiIds = Array.from(
    new Set(
      data
        .map((ledger) => ledger.surat_jalan_item_id)
        .filter((sji) => sji != null && Number.isFinite(Number(sji)))
    )
  );

  if (uniqueSjiIds.length > 0) {
    const candidateLedgers = await prisma.stok_ledger.findMany({
      where: {
        surat_jalan_item_id: { in: uniqueSjiIds.map((id) => Number(id)) },
        return_transaction_id: null,
      },
      select: {
        ledger_id: true,
        surat_jalan_item_id: true,
        jenis_mutasi: true,
        waktu_mutasi: true,
      },
    });

    const groupedBySji = new Map();
    for (const ledger of candidateLedgers) {
      const sji = ledger.surat_jalan_item_id;
      if (!sji) continue;
      if (!groupedBySji.has(sji)) groupedBySji.set(sji, []);
      groupedBySji.get(sji).push(ledger);
    }

    for (const [sji, ledgers] of groupedBySji) {
      const outCandidates = ledgers.filter((l) => l.jenis_mutasi === "out");
      const inCandidates = ledgers.filter((l) => l.jenis_mutasi === "in");

      const outMatches = new Map();
      const inMatches = new Map();

      for (const out of outCandidates) {
        const outTime = new Date(out.waktu_mutasi).getTime();
        for (const inEntry of inCandidates) {
          const inTime = new Date(inEntry.waktu_mutasi).getTime();
          if (inTime > outTime && Math.abs(inTime - outTime) <= 1000) {
            if (!outMatches.has(out.ledger_id)) outMatches.set(out.ledger_id, []);
            outMatches.get(out.ledger_id).push(inEntry);
            if (!inMatches.has(inEntry.ledger_id)) inMatches.set(inEntry.ledger_id, []);
            inMatches.get(inEntry.ledger_id).push(out);
          }
        }
      }

      let unique = true;
      for (const matches of outMatches.values()) {
        if (matches.length !== 1) { unique = false; break; }
      }
      if (unique) {
        for (const matches of inMatches.values()) {
          if (matches.length !== 1) { unique = false; break; }
        }
      }

      if (unique) {
        for (const [outId, ins] of outMatches) {
          putawayLedgerIds.add(String(outId));
          for (const inEntry of ins) {
            putawayLedgerIds.add(String(inEntry.ledger_id));
          }
        }
      }
    }
  }

  const zonaMap = new Map();
  for (const ledger of data) {
    const z = ledger.surat_jalan_item?.zona;
    if (z?.zona_id) {
      zonaMap.set(Number(z.zona_id), z);
    }
  }

  const rows = data.map((ledger) => {
    const item = ledger.surat_jalan_item;
    const suratJalan = item?.surat_jalan;
    const barang = item?.barang ?? ledger.barang;
    const tiket = suratJalan?.boq?.tiket;

    const fallbackZonaId =
      !item?.zona_id &&
      suratJalan?.tipe === "inbound" &&
      suratJalan?.status === "diterima_didistribusikan"
        ? zonaFallbackMap.get(`${ledger.barang_id}:${suratJalan?.gudang_tujuan_id}`)
        : null;

    const effectiveZonaId = item?.zona_id || fallbackZonaId || null;
    const pickZona = pickZonaMap.get(Number(ledger.ledger_id));
    const zona =
      suratJalan?.tipe === "outbound" && pickZona
        ? typeof pickZona === "string"
          ? { kode_zona: pickZona, nama_zona: pickZona, tipe_zona: null, gudang: { nama_gudang: null }, zona_id: null }
          : pickZona
        : effectiveZonaId && zonaMap.get(Number(effectiveZonaId))
          ? zonaMap.get(Number(effectiveZonaId))
          : item?.zona || null;

    const gudangAsal = suratJalan?.gudang_asal?.nama_gudang || null;
    const gudangTujuan = suratJalan?.gudang_tujuan?.nama_gudang || null;

    return {
      ledger_id: String(ledger.ledger_id),
      waktu_mutasi: ledger.waktu_mutasi,
      jenis_mutasi: ledger.jenis_mutasi,
      qty: Number(ledger.qty),
      satuan: item?.satuan?.kode_satuan || "-",
      saldo_setelah: Number(ledger.saldo_setelah),
      barang_id: String(ledger.barang_id),
      kode_perangkat: barang?.kode_perangkat || "-",
      nama_barang: barang?.nama_barang || "-",
      kategori_id: barang?.kategori?.kategori_id ? String(barang.kategori.kategori_id) : null,
      kategori_nama: barang?.kategori?.nama_kategori || "-",
      kondisi: item?.kondisi || "-",
      surat_jalan_id: suratJalan ? String(suratJalan.surat_jalan_id) : "-",
      nomor_surat_jalan: suratJalan?.nomor_surat_jalan || "-",
      return_transaction_id: ledger.return_transaction_id ? String(ledger.return_transaction_id) : null,
      tipe_surat_jalan: suratJalan?.tipe || "-",
      status_surat_jalan: suratJalan?.status || "-",
      project_nama: suratJalan?.project?.nama_project || "-",
      area: suratJalan?.project?.area || "-",
      gudang: gudangAsal || gudangTujuan || "-",
      gudang_asal: gudangAsal || "-",
      gudang_tujuan: gudangTujuan || "-",
      gudang_asal_id: suratJalan?.gudang_asal_id ? String(suratJalan.gudang_asal_id) : null,
      gudang_tujuan_id: suratJalan?.gudang_tujuan_id ? String(suratJalan.gudang_tujuan_id) : null,
      lapangan_tujuan: suratJalan?.titik_lapangan?.nama_lokasi ?? suratJalan?.alamat_lapangan ?? null,
      zona_id: effectiveZonaId ? String(effectiveZonaId) : null,
      zona_kode: zona?.kode_zona || "-",
      zona_nama: zona?.nama_zona || "-",
      zona_tipe: zona?.tipe_zona || "-",
      zona_gudang: zona?.gudang?.nama_gudang || "-",
      tiket_id: tiket ? String(tiket.tiket_id) : "-",
      kode_tiket: tiket?.kode_tiket || "-",
      is_kelebihan: item?.is_kelebihan || false,
      diproses_oleh: suratJalan?.creator?.nama || "-",
      diproses_oleh_role: suratJalan?.creator?.role || "-",
      is_putaway: putawayLedgerIds.has(String(ledger.ledger_id)),
      ...resolveAsal(ledger),
    };
  });

  return {
    data: rows,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

const getStockHistoryForExport = async (filters = {}) => {
  const {
    search = "",
    projectId = "all",
    warehouseId = "all",
    zonaId = "all",
    kategoriId = "all",
    type = "all",
    status = "all",
    startDate,
    endDate,
    include_putaway = "false",
  } = filters;

  const where = {};

  if (include_putaway !== "true") {
    const putawayIds = await getPutawayLedgerIds(prisma);
    if (putawayIds.length > 0) {
      where.ledger_id = { notIn: putawayIds };
    }
  }

  if (search.trim()) {
    const s = search.trim();
    where.OR = [
      { barang: { nama_barang: { contains: s, mode: "insensitive" } } },
      { barang: { kode_perangkat: { contains: s, mode: "insensitive" } } },
      {
        surat_jalan_item: {
          surat_jalan: {
            OR: [
              { nomor_surat_jalan: { contains: s, mode: "insensitive" } },
              {
                boq: {
                  tiket: {
                    kode_tiket: { contains: s, mode: "insensitive" } },
                },
              },
            ],
          },
        },
      },
    ];
  }

  const suratJalanWhere = {};

  const projectIdFilter = parseIdFilter(projectId, "projectId");
  if (projectIdFilter !== null) {
    suratJalanWhere.project_id = projectIdFilter;
  }
  if (type && type !== "all") {
    suratJalanWhere.tipe = type;
  }
  if (status && status !== "all") {
    suratJalanWhere.status = status;
  }

  const warehouseIdFilter = parseIdFilter(warehouseId, "warehouseId");
  if (warehouseIdFilter !== null) {
    suratJalanWhere.OR = [
      { gudang_asal_id: warehouseIdFilter },
      { gudang_tujuan_id: warehouseIdFilter },
    ];
  }

  const suratJalanItemWhere = {};

  const zonaIdFilter = parseIdFilter(zonaId, "zonaId");
  if (zonaIdFilter !== null) {
    suratJalanItemWhere.zona_id = zonaIdFilter;
  }

  if (Object.keys(suratJalanWhere).length > 0) {
    suratJalanItemWhere.surat_jalan = suratJalanWhere;
  }

  if (Object.keys(suratJalanItemWhere).length > 0) {
    where.surat_jalan_item = suratJalanItemWhere;
  }

  const kategoriIdFilter = parseIdFilter(kategoriId, "kategoriId");
  if (kategoriIdFilter !== null) {
    where.barang = { kategori_id: kategoriIdFilter };
  }

  if (startDate || endDate) {
    where.waktu_mutasi = {};
    if (startDate) where.waktu_mutasi.gte = new Date(startDate);
    if (endDate) where.waktu_mutasi.lte = new Date(endDate + "T23:59:59");
  }

  const EXPORT_LIMIT = 10000;

  const [data, total] = await Promise.all([
    prisma.stok_ledger.findMany({
      where,
      skip: 0,
      take: EXPORT_LIMIT,
      orderBy: { waktu_mutasi: "desc" },
      include: {
        return_transaction: {
          include: {
            surat_jalan_item: {
              include: {
                zona: {
                  select: {
                    zona_id: true,
                    nama_zona: true,
                    gudang: {
                      select: {
                        nama_gudang: true,
                      },
                    },
                  },
                },
              },
            },
            project: {
              select: {
                project_id: true,
                nama_project: true,
              },
            },
          },
        },
        barang: {
          select: {
            kode_perangkat: true,
            nama_barang: true,
            kategori: {
              select: {
                kategori_id: true,
                nama_kategori: true,
              },
            },
          },
        },
        surat_jalan_item: {
          include: {
            surat_jalan: {
              select: {
                surat_jalan_id: true,
                nomor_surat_jalan: true,
                alamat_lapangan: true,
                tipe: true,
                status: true,
                gudang_asal_id: true,
                gudang_tujuan_id: true,
                tipe_pengirim: true,
                pengirim_eksternal_nama: true,
                supplier: {
                  select: {
                    supplier_id: true,
                    nama: true,
                    kode: true,
                  },
                },
                project: {
                  select: {
                    nama_project: true,
                    area: true,
                  },
                },
                gudang_asal: {
                  select: {
                    nama_gudang: true,
                  },
                },
                gudang_tujuan: {
                  select: {
                    nama_gudang: true,
                  },
                },
                titik_lapangan: {
                  select: {
                    nama_lokasi: true,
                  },
                },
                boq: {
                  include: {
                    tiket: {
                      select: {
                        tiket_id: true,
                        kode_tiket: true,
                      },
                    },
                  },
                },
                creator: {
                  select: {
                    nama: true,
                    role: true,
                  },
                },
              },
            },
            barang: {
              select: {
                kode_perangkat: true,
                nama_barang: true,
                kategori: {
                  select: {
                    kategori_id: true,
                    nama_kategori: true,
                  },
                },
              },
            },
            satuan: {
              select: {
                kode_satuan: true,
              },
            },
            zona: {
              select: {
                zona_id: true,
                kode_zona: true,
                nama_zona: true,
                tipe_zona: true,
                gudang: {
                  select: {
                    nama_gudang: true,
                  },
                },
              },
            },
            picks: {
              select: {
                zona_id: true,
                qty: true,
                picked_at: true,
              },
              orderBy: {
                picked_at: "asc",
              },
            },
          },
        },
      },
    }),
    prisma.stok_ledger.count({ where }),
  ]);

  const zonaFallbackMap = await buildZonaFallbackMap(data, prisma);
  const pickZonaMap = await buildPickZonaMap(data, prisma);

  const zonaMap = new Map();
  for (const ledger of data) {
    const z = ledger.surat_jalan_item?.zona;
    if (z?.zona_id) {
      zonaMap.set(Number(z.zona_id), z);
    }
  }

  const putawayLedgerIds = new Set();
  const groupedBySji = new Map();
  for (const ledger of data) {
    const sji = ledger.surat_jalan_item_id;
    if (!sji) continue;
    if (!groupedBySji.has(sji)) groupedBySji.set(sji, []);
    groupedBySji.get(sji).push(ledger);
  }

  for (const [sji, ledgers] of groupedBySji) {
    const outCandidates = ledgers.filter((l) => l.jenis_mutasi === "out" && !l.return_transaction_id);
    const inCandidates = ledgers.filter((l) => l.jenis_mutasi === "in" && !l.return_transaction_id);
    for (const out of outCandidates) {
      const outTime = new Date(out.waktu_mutasi).getTime();
      for (const inEntry of inCandidates) {
        const inTime = new Date(inEntry.waktu_mutasi).getTime();
        if (inTime > outTime && Math.abs(inTime - outTime) <= 1000) {
          putawayLedgerIds.add(String(out.ledger_id));
          putawayLedgerIds.add(String(inEntry.ledger_id));
        }
      }
    }
  }

  const rows = data.map((ledger) => {
    const item = ledger.surat_jalan_item;
    const suratJalan = item?.surat_jalan;
    const barang = item?.barang ?? ledger.barang;
    const tiket = suratJalan?.boq?.tiket;

    const fallbackZonaId =
      !item?.zona_id &&
      suratJalan?.tipe === "inbound" &&
      suratJalan?.status === "diterima_didistribusikan"
        ? zonaFallbackMap.get(`${ledger.barang_id}:${suratJalan?.gudang_tujuan_id}`)
        : null;

    const effectiveZonaId = item?.zona_id || fallbackZonaId || null;
    const pickZona = pickZonaMap.get(Number(ledger.ledger_id));
    const zona =
      suratJalan?.tipe === "outbound" && pickZona
        ? typeof pickZona === "string"
          ? { kode_zona: pickZona, nama_zona: pickZona, tipe_zona: null, gudang: { nama_gudang: null }, zona_id: null }
          : pickZona
        : effectiveZonaId && zonaMap.get(Number(effectiveZonaId))
          ? zonaMap.get(Number(effectiveZonaId))
          : item?.zona || null;

    const gudangAsal = suratJalan?.gudang_asal?.nama_gudang || null;
    const gudangTujuan = suratJalan?.gudang_tujuan?.nama_gudang || null;

    return {
      ledger_id: String(ledger.ledger_id),
      waktu_mutasi: ledger.waktu_mutasi,
      jenis_mutasi: ledger.jenis_mutasi,
      qty: Number(ledger.qty),
      satuan: item?.satuan?.kode_satuan || "-",
      saldo_setelah: Number(ledger.saldo_setelah),
      barang_id: String(ledger.barang_id),
      kode_perangkat: barang?.kode_perangkat || "-",
      nama_barang: barang?.nama_barang || "-",
      kategori_id: barang?.kategori?.kategori_id ? String(barang.kategori.kategori_id) : null,
      kategori_nama: barang?.kategori?.nama_kategori || "-",
      kondisi: item?.kondisi || "-",
      surat_jalan_id: suratJalan ? String(suratJalan.surat_jalan_id) : "-",
      nomor_surat_jalan: suratJalan?.nomor_surat_jalan || "-",
      return_transaction_id: ledger.return_transaction_id ? String(ledger.return_transaction_id) : null,
      tipe_surat_jalan: suratJalan?.tipe || "-",
      status_surat_jalan: suratJalan?.status || "-",
      project_nama: suratJalan?.project?.nama_project || "-",
      area: suratJalan?.project?.area || "-",
      gudang: gudangAsal || gudangTujuan || "-",
      gudang_asal: gudangAsal || "-",
      gudang_tujuan: gudangTujuan || "-",
      gudang_asal_id: suratJalan?.gudang_asal_id ? String(suratJalan.gudang_asal_id) : null,
      gudang_tujuan_id: suratJalan?.gudang_tujuan_id ? String(suratJalan.gudang_tujuan_id) : null,
      lapangan_tujuan: suratJalan?.titik_lapangan?.nama_lokasi ?? suratJalan?.alamat_lapangan ?? null,
      zona_id: effectiveZonaId ? String(effectiveZonaId) : null,
      zona_kode: zona?.kode_zona || "-",
      zona_nama: zona?.nama_zona || "-",
      zona_tipe: zona?.tipe_zona || "-",
      zona_gudang: zona?.gudang?.nama_gudang || "-",
      tiket_id: tiket ? String(tiket.tiket_id) : "-",
      kode_tiket: tiket?.kode_tiket || "-",
      is_kelebihan: item?.is_kelebihan || false,
      diproses_oleh: suratJalan?.creator?.nama || "-",
      diproses_oleh_role: suratJalan?.creator?.role || "-",
      is_putaway: putawayLedgerIds.has(String(ledger.ledger_id)),
      ...resolveAsal(ledger),
    };
  });

  return {
    data: rows,
    meta: {
      total,
      limit: EXPORT_LIMIT,
      truncated: total > EXPORT_LIMIT,
    },
  };
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const normalTanggalAwal = (val) => (DATE_ONLY.test(val) ? `${val}T00:00:00+07:00` : val);
const normalTanggalAkhir = (val) => (DATE_ONLY.test(val) ? `${val}T23:59:59.999+07:00` : val);

const getAuditLogs = async (filters = {}) => {
  const {
    search = "",
    actorId = "all",
    actorRole = "all",
    action = "all",
    entityType = "all",
    tiketId = "all",
    kodeTiket = "",
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = filters;

  const where = {};

  if (search.trim()) {
    const s = search.trim();
    const matchedAksi = AUDIT_AKSI_VALUES.filter((aksi) =>
      aksi.toLowerCase().includes(s.toLowerCase())
    );
    where.OR = [
      { entity_type: { contains: s, mode: "insensitive" } },
      { actor: { nama: { contains: s, mode: "insensitive" } } },
      ...(matchedAksi.length > 0 ? [{ aksi: { in: matchedAksi } }] : []),
    ];
  }

  if (actorId !== "all") {
    where.actor_id = BigInt(actorId);
  }

  if (actorRole !== "all") {
    where.actor = { role: actorRole };
  }

  if (action !== "all") {
    where.aksi = action;
  }

  if (entityType !== "all") {
    where.entity_type = entityType;
  }

  if (kodeTiket.trim()) {
    const tiket = await prisma.tiket_material.findFirst({
      where: { kode_tiket: { contains: kodeTiket.trim(), mode: "insensitive" } },
      select: { tiket_id: true },
    });
    if (tiket) {
      where.AND = [
        { entity_type: "reconciliation" },
        { entity_id: BigInt(tiket.tiket_id) },
      ];
    } else {
      where.AND = [
        { entity_id: BigInt(-1) },
      ];
    }
  } else if (tiketId !== "all") {
    where.entity_id = BigInt(tiketId);
  }

  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    throw new AppError("Tanggal akhir tidak boleh lebih awal dari tanggal mulai.", 400);
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(normalTanggalAwal(startDate));
    if (endDate) where.created_at.lte = new Date(normalTanggalAkhir(endDate));
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.audit_log.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: "desc" },
      include: {
        actor: {
          select: {
            nama: true,
            email: true,
            role: true,
            personils: {
              select: {
                nama: true,
              },
            },
          },
        },
      },
    }),

    prisma.audit_log.count({ where }),
  ]);

  const enrichedData = await enrichAuditEntityNames(data);

  const rows = enrichedData.map((log) => ({
    audit_id: String(log.audit_id),
    created_at: log.created_at,
    aksi: log.aksi,
    entity_type: log.entity_type,
    entity_id: String(log.entity_id),
    actor_id: String(log.actor_id),
    actor_nama: log.actor?.personils?.[0]?.nama || log.actor?.nama || "-",
    actor_email: log.actor?.email || "-",
    actor_role: log.actor?.role || "-",
    data_sebelum: log.data_sebelum,
    data_sesudah: log.data_sesudah,
    entity_name: log.entity_name ?? null,
    entity_refs_resolved: log.entity_refs_resolved ?? {},
  }));

  return {
    data: rows,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

const getAuditLogForExport = async (filters = {}) => {
  const {
    search = "",
    actorId = "all",
    actorRole = "all",
    action = "all",
    entityType = "all",
    tiketId = "all",
    kodeTiket = "",
    startDate,
    endDate,
  } = filters;

  const where = {};

  if (search.trim()) {
    const s = search.trim();
    const matchedAksi = AUDIT_AKSI_VALUES.filter((aksi) =>
      aksi.toLowerCase().includes(s.toLowerCase())
    );
    where.OR = [
      { entity_type: { contains: s, mode: "insensitive" } },
      { actor: { nama: { contains: s, mode: "insensitive" } } },
      ...(matchedAksi.length > 0 ? [{ aksi: { in: matchedAksi } }] : []),
    ];
  }

  if (actorId !== "all") {
    where.actor_id = BigInt(actorId);
  }

  if (actorRole !== "all") {
    where.actor = { role: actorRole };
  }

  if (action !== "all") {
    where.aksi = action;
  }

  if (entityType !== "all") {
    where.entity_type = entityType;
  }

  if (kodeTiket.trim()) {
    const tiket = await prisma.tiket_material.findFirst({
      where: { kode_tiket: { contains: kodeTiket.trim(), mode: "insensitive" } },
      select: { tiket_id: true },
    });
    if (tiket) {
      where.AND = [
        { entity_type: "reconciliation" },
        { entity_id: BigInt(tiket.tiket_id) },
      ];
    } else {
      where.AND = [
        { entity_id: BigInt(-1) },
      ];
    }
  } else if (tiketId !== "all") {
    where.entity_id = BigInt(tiketId);
  }

  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    throw new AppError("Tanggal akhir tidak boleh lebih awal dari tanggal mulai.", 400);
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(normalTanggalAwal(startDate));
    if (endDate) where.created_at.lte = new Date(normalTanggalAkhir(endDate));
  }

  const EXPORT_LIMIT = 10000;

  const [data, total] = await Promise.all([
    prisma.audit_log.findMany({
      where,
      skip: 0,
      take: EXPORT_LIMIT,
      orderBy: { created_at: "desc" },
      include: {
        actor: {
          select: {
            nama: true,
            email: true,
            role: true,
            personils: {
              select: {
                nama: true,
              },
            },
          },
        },
      },
    }),
    prisma.audit_log.count({ where }),
  ]);

  const enrichedData = await enrichAuditEntityNames(data);

  const rows = enrichedData.map((log) => {
    const isLogin = ["login_success", "login_failed", "reset_link_created"].includes(log.aksi);
    const hasActor = log.actor_id && String(log.actor_id) !== "0" && log.actor_id !== "null";
    const entityLabel = (() => {
      const kode = log.data_sesudah?.kode_tiket || log.data_sebelum?.kode_tiket;
      if (kode) return String(kode);
      if (log.entity_type === "user_account" && (!log.entity_id || String(log.entity_id) === "0")) {
        return "Akun tidak dikenal";
      }
      if (log.entity_type && log.entity_id && String(log.entity_id) !== "0") {
        return `${getEntityTypeLabel(log.entity_type)} #${log.entity_id}`;
      }
      return getEntityTypeLabel(log.entity_type || "-");
    })();

    return {
      audit_id: String(log.audit_id),
      created_at: log.created_at,
      aksi: getAksiLabel(log.aksi || "-"),
      entity_type: getEntityTypeLabel(log.entity_type || "-"),
      entity_id: String(log.entity_id),
      actor_id: String(log.actor_id),
      actor_nama: hasActor ? (log.actor?.personils?.[0]?.nama || log.actor?.nama || "Tidak dikenal") : "Tidak dikenal",
      actor_email: log.actor?.email || "-",
      actor_role: hasActor ? getRoleLabel(log.actor?.role || "-") : "Tidak dikenal",
      detail: formatAuditMetadata(log.aksi, log.data_sebelum, log.data_sesudah),
      entity_name: entityLabel,
      extra_ref: (() => {
        const ds = log.data_sesudah || {};
        const parts = [];
        if (ds.source_file || ds.filename || ds.nama_file) {
          parts.push(ds.source_file || ds.filename || ds.nama_file);
        }
        if (ds.username_target || ds.target_user || ds.user_target) {
          parts.push(`user: ${ds.username_target || ds.target_user || ds.user_target}`);
        }
        if (ds.catatan) {
          parts.push(ds.catatan);
        }
        return parts.length > 0 ? parts.join(" | ") : "—";
      })(),
      data_sebelum: log.data_sebelum,
      data_sesudah: log.data_sesudah,
      entity_refs_resolved: log.entity_refs_resolved ?? {},
    };
  });

  return {
    data: rows,
    meta: {
      total,
      limit: EXPORT_LIMIT,
      truncated: total > EXPORT_LIMIT,
    },
  };
};

const getHardwareReconciliation = async (filters = {}) => {
  const { projectId = "all", search = "" } = filters;

  const projects = await prisma.project.findMany({
    where: {
      status_aktif: true,
      ...(projectId !== "all" && { project_id: BigInt(projectId) }),
    },
    orderBy: [{ area: "asc" }, { nama_project: "asc" }],
    select: {
      project_id: true,
      nama_project: true,
      title: true,
      cluster_id: true,
      area: true,
    },
  });

  const boqRecords = await prisma.boq.findMany({
    where: {
      status: { in: ["aktif", "selesai"] },
      ...(projectId !== "all" && {
        cluster: { project_id: BigInt(projectId) },
      }),
    },
    include: {
      tiket: {
        select: {
          tiket_id: true,
        },
      },
      cluster: {
        select: {
          cluster_id: true,
          project_id: true,
        },
      },
      items: {
        select: {
          qty_rencana: true,
        },
      },
    },
  });

  const clusterIdByProject = new Map();
  for (const boq of boqRecords) {
    const projectIdNum = Number(boq.cluster?.project_id);
    if (!projectIdNum) continue;
    if (boq.cluster?.cluster_id && !clusterIdByProject.has(projectIdNum)) {
      clusterIdByProject.set(projectIdNum, boq.cluster.cluster_id);
    }
  }

  const shipmentTotals = await prisma.surat_jalan.findMany({
    where: {
      status: { in: ["disetujui", "diterima_didistribusikan"] },
      ...(projectId !== "all" && { project_id: BigInt(projectId) }),
    },
    select: {
      tipe: true,
      project_id: true,
      tujuan_tipe: true,
      items: {
        select: {
          qty: true,
        },
      },
    },
  });

  const boqByProject = new Map();
  const additionalByProject = new Map();
  const hardwareOnSiteByProject = new Map();
  const usedByProject = new Map();

  for (const boq of boqRecords) {
    const projectIdNum = Number(boq.cluster?.project_id);
    if (!projectIdNum) continue;

    const currentBoq = boqByProject.get(projectIdNum) || 0;
    const itemQty = boq.items?.reduce((sum, item) => sum + Number(item.qty_rencana || 0), 0) || 0;
    boqByProject.set(projectIdNum, currentBoq + itemQty);
  }

  const projectIdsForAdditional =
    projectId !== "all"
      ? [BigInt(projectId)]
      : Array.from(
          new Set(
            boqRecords
              .map((boq) => boq.cluster?.project_id)
              .filter((id) => id != null)
          )
        );

  const additionalTotals =
    projectIdsForAdditional.length > 0
      ? await additionalRepository.getAdditionalTotalsByProjectOnly(
          projectIdsForAdditional.map((id) => Number(id))
        )
      : new Map();

  for (const [projectIdNum, total] of additionalTotals) {
    additionalByProject.set(projectIdNum, total);
  }

  for (const shipment of shipmentTotals) {
    const projectIdNum = Number(shipment.project_id);
    if (!projectIdNum) continue;

    const totalQty = shipment.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

    if (shipment.tipe === "outbound" && shipment.tujuan_tipe !== "gudang") {
      hardwareOnSiteByProject.set(
        projectIdNum,
        (hardwareOnSiteByProject.get(projectIdNum) || 0) + totalQty
      );
    }

    if (shipment.tipe === "outbound" && shipment.tujuan_tipe !== "gudang") {
      usedByProject.set(
        projectIdNum,
        (usedByProject.get(projectIdNum) || 0) + totalQty
      );
    }
  }

  // Compute approved returns per project from the Return module.
  const approvedReturnByProject = new Map();

  for (const project of projects) {
    const projectIdNum = Number(project.project_id);
    const projectBoqRecords = boqRecords.filter(
      (b) => Number(b.cluster?.project_id || 0) === projectIdNum
    );

    const projectTickets = new Set();
    for (const boq of projectBoqRecords) {
      if (boq.tiket?.tiket_id) {
        projectTickets.add(boq.tiket.tiket_id);
      }
    }

    let totalApprovedQty = 0;
    for (const tiketId of projectTickets) {
      const barangIds = new Set();
      for (const boq of projectBoqRecords) {
        for (const item of boq.items || []) {
          if (item.barang_id) {
            barangIds.add(item.barang_id);
          }
        }
      }

      for (const barangId of barangIds) {
        const { snapshot } = await getLatestPhysicalSnapshot(tiketId, barangId);
        if (!snapshot) continue;

        const qty = await getApprovedReturnsAfterSnapshot(tiketId, barangId, snapshot.tanggal_laporan);
        totalApprovedQty += Number(qty);
      }
    }

    approvedReturnByProject.set(projectIdNum, totalApprovedQty);
  }

  return projects.map((project) => {
    const projectIdNum = Number(project.project_id);
    const boq = Number(boqByProject.get(projectIdNum) || 0);
    const additional = Number(additionalByProject.get(projectIdNum) || 0);
    const hardwareOnSite = Number(hardwareOnSiteByProject.get(projectIdNum) || 0);
    const used = Number(usedByProject.get(projectIdNum) || 0);
    const approvedReturnQty = Number(approvedReturnByProject.get(projectIdNum) || 0);
    const remains = hardwareOnSite - (boq + additional) - used - approvedReturnQty;

    let status = "berjalan";
    if (remains < 0) {
      status = "perhatian";
    } else if (remains >= 0 && boq > 0) {
      status = "sesuai";
    }

    return {
      project_id: projectIdNum,
      project_nama: project.title || project.nama_project || "Project",
      cluster_id: clusterIdByProject.get(projectIdNum) || project.cluster_id || "-",
      area: project.area || "-",
      boq,
      additional,
      hardware_on_site: hardwareOnSite,
      used,
      approved_return_qty: approvedReturnQty,
      remains,
      status,
    };
  });
};

const getHardwareReconciliationPerTiket = async (filters = {}) => {
  const { projectId = "all", search = "", startDate, endDate, page = 1, limit = 50 } = filters;

  const tiketWhere = {};
  if (projectId !== "all") {
    tiketWhere.project_id = BigInt(projectId);
  }

  const tikets = await prisma.tiket_material.findMany({
    where: tiketWhere,
    include: {
      project: {
        select: {
          project_id: true,
          nama_project: true,
          area: true,
          cluster_id: true,
        },
      },
      boq: {
        where: { status: { in: ["aktif", "selesai"] } },
        include: {
          items: {
            select: {
              qty_rencana: true,
            },
          },
          cluster: {
            select: {
              cluster_id: true,
            },
          },
        },
      },
    },
  });

  // Query outbound Surat Jalan
  const outboundShipmentWhere = {
    status: { in: ["disetujui", "diterima_didistribusikan"] },
    tipe: "outbound",
  };
  if (projectId !== "all") {
    outboundShipmentWhere.project_id = BigInt(projectId);
  }
  if (startDate || endDate) {
    outboundShipmentWhere.tanggal = {};
    if (startDate) outboundShipmentWhere.tanggal.gte = new Date(startDate);
    if (endDate) outboundShipmentWhere.tanggal.lte = new Date(endDate + "T23:59:59");
  }

  const outboundSuratJalans = await prisma.surat_jalan.findMany({
    where: outboundShipmentWhere,
    include: {
      items: {
        select: {
          qty: true,
          is_kelebihan: true,
        },
      },
    },
  });

  // Query inbound Surat Jalan with approved statuses
  const inboundShipmentWhere = {
    status: { in: ["ready_putaway", "disetujui", "diterima_didistribusikan"] },
    tipe: "inbound",
  };
  if (projectId !== "all") {
    inboundShipmentWhere.project_id = BigInt(projectId);
  }
  if (startDate || endDate) {
    inboundShipmentWhere.tanggal = {};
    if (startDate) inboundShipmentWhere.tanggal.gte = new Date(startDate);
    if (endDate) inboundShipmentWhere.tanggal.lte = new Date(endDate + "T23:59:59");
  }

  const inboundSuratJalans = await prisma.surat_jalan.findMany({
    where: inboundShipmentWhere,
    include: {
      items: {
        select: {
          qty: true,
          is_kelebihan: true,
        },
      },
    },
  });

  const inboundByProject = new Map();
  const outboundByProject = new Map();
  const additionalByProject = new Map();
  const inboundMosByProject = new Map();

  const additionalTotalsByProject =
    projectId !== "all"
      ? await additionalRepository.getAdditionalTotalsByProjectOnly([Number(projectId)])
      : new Map();

  // Build inbound MOS map using isMosEligibleInbound
  for (const sj of inboundSuratJalans) {
    const pid = Number(sj.project_id);
    if (!pid) continue;
    for (const item of sj.items) {
      const qty = Number(item.qty || 0);
      if (isMosEligibleInbound(sj)) {
        inboundMosByProject.set(pid, (inboundMosByProject.get(pid) || 0) + qty);
      }
    }
  }

  // Build outbound map (for Used/other calculations, NOT for MOS)
  for (const sj of outboundSuratJalans) {
    const pid = Number(sj.project_id);
    if (!pid) continue;
    for (const item of sj.items) {
      const qty = Number(item.qty || 0);
      if (sj.tipe === "outbound" && sj.tujuan_tipe !== "gudang") {
        outboundByProject.set(pid, (outboundByProject.get(pid) || 0) + qty);
      }
    }
  }

  // MOS = inbound only (external vendor inbound)
  const mosByProject = inboundMosByProject;

  // Compute approved returns per tiket from the Return module.
  const approvedReturnByTiket = new Map();

  for (const tiket of tikets) {
    const tiketId = tiket.tiket_id;
    const barangIds = new Set();
    for (const item of tiket.boq?.items || []) {
      if (item.barang_id) {
        barangIds.add(item.barang_id);
      }
    }

    let totalApprovedQty = 0;
    for (const barangId of barangIds) {
      const { snapshot } = await getLatestPhysicalSnapshot(tiketId, barangId);
      if (!snapshot) continue;

      const qty = await getApprovedReturnsAfterSnapshot(tiketId, barangId, snapshot.tanggal_laporan);
      totalApprovedQty += Number(qty);
    }

    approvedReturnByTiket.set(tiketId, totalApprovedQty);
  }

  let rows = tikets.map((tiket) => {
    const projectIdNum = Number(tiket.project_id);
    const boqPlan = tiket.boq?.items?.reduce((sum, item) => sum + Number(item.qty_rencana || 0), 0) || 0;
    const additional = Number(additionalTotalsByProject.get(projectIdNum) || 0);
    const mos = Number(mosByProject.get(projectIdNum) || 0);
    const used = tiket.used ? Number(tiket.used) : Number(outboundByProject.get(projectIdNum) || 0);
    const approvedReturnQty = Number(approvedReturnByTiket.get(tiket.tiket_id) || 0);
    const remains = mos - (boqPlan + additional) - used - approvedReturnQty;

    let status = "berjalan";
    if (remains < 0) {
      status = "perhatian";
    } else if (remains >= 0 && boqPlan > 0) {
      status = "sesuai";
    }

    return {
      tiket_id: String(tiket.tiket_id),
      kode_tiket: tiket.kode_tiket,
      project_id: projectIdNum,
      project_nama: tiket.project?.nama_project || "-",
      cluster_id: tiket.boq?.cluster?.cluster_id || tiket.project?.cluster_id || "-",
      area: tiket.project?.area || "-",
      boq_plan: boqPlan,
      additional,
      mos,
      used,
      approved_return_qty: approvedReturnQty,
      remains,
      status,
    };
  });

  if (search.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter((row) =>
      [row.kode_tiket, row.project_nama, row.cluster_id, row.area]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  const total = rows.length;
  const skip = (Number(page) - 1) * Number(limit);
  const paginatedRows = rows.slice(skip, skip + Number(limit));

  return {
    data: paginatedRows,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

const getHardwareReconciliationDetailed = async (filters = {}) => {
  const { projectId = "all", search = "" } = filters;

  const whereBoq = {
    boq: {
      status: { in: ["aktif", "selesai"] },
      ...(projectId !== "all" ? { tiket: { project_id: BigInt(projectId) } } : {}),
    },
  };

  const boqItems = await prisma.boq_item.findMany({
    where: whereBoq,
    include: {
      boq: {
        include: {
          tiket: {
            select: {
              project_id: true,
              kode_tiket: true,
              cluster_id: true,
              project: {
                select: {
                  nama_project: true,
                  area: true,
                },
              },
            },
          },
          cluster: {
            include: {
              project: {
                select: {
                  cluster_id: true,
                  area: true,
                  nama_project: true,
                },
              },
            },
          },
        },
      },
      barang: {
        select: {
          kode_perangkat: true,
          nama_barang: true,
        },
      },
    },
  });

  const shipmentItems = await prisma.surat_jalan_item.findMany({
    where: {
      surat_jalan: {
        status: { in: ["disetujui", "diterima_didistribusikan"] },
        ...(projectId !== "all" && { project_id: BigInt(projectId) }),
      },
    },
    include: {
      surat_jalan: {
        select: {
          tipe: true,
          project_id: true,
          tujuan_tipe: true,
        },
      },
    },
  });

  const inboundByBarang = new Map();
  const outboundByBarang = new Map();
  const additionalByBarang = new Map();

  const projectIdsForAdditional =
    projectId !== "all"
      ? [Number(projectId)]
      : Array.from(
          new Set(
            shipmentItems
              .map((item) => item.surat_jalan?.project_id)
              .filter((id) => id != null)
          )
        );

  const additionalTotalsByProject =
    projectIdsForAdditional.length > 0
      ? await additionalRepository.getAdditionalTotalsByProject(projectIdsForAdditional)
      : new Map();

  for (const [key, val] of additionalTotalsByProject) {
    additionalByBarang.set(key, (additionalByBarang.get(key) || 0) + val);
  }

  for (const item of shipmentItems) {
    const barangId = String(item.barang_id);
    const qty = Number(item.qty || 0);
    const projectIdNum = Number(item.surat_jalan?.project_id);
    const key = `${projectIdNum}-${barangId}`;

    if (item.surat_jalan?.tipe === "inbound") {
      inboundByBarang.set(
        key,
        (inboundByBarang.get(key) || 0) + qty
      );
    }

    if (item.surat_jalan?.tipe === "outbound" && item.surat_jalan?.tujuan_tipe !== "gudang") {
      outboundByBarang.set(
        key,
        (outboundByBarang.get(key) || 0) + qty
      );
    }
  }

  // Compute approved returns per project+barang from the Return module.
  const approvedReturnByProjectBarang = new Map();
  const projectBarangKeys = new Set();

  for (const item of boqItems) {
    const project = item.boq?.tiket;
    const projectIdNum = Number(project?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;
    projectBarangKeys.add(key);
  }

  for (const key of projectBarangKeys) {
    const [projectIdNum, barangId] = key.split("-").map(Number);
    if (!projectIdNum || !barangId) continue;

    const projectTickets = new Set();
    for (const item of boqItems) {
      const tiket = item.boq?.tiket;
      const project = tiket?.project;
      if (Number(project?.project_id || 0) === projectIdNum && tiket?.tiket_id) {
        projectTickets.add(tiket.tiket_id);
      }
    }

    let totalApprovedQty = 0;
    for (const tiketId of projectTickets) {
      const { snapshot } = await getLatestPhysicalSnapshot(tiketId, barangId);
      if (!snapshot) continue;

      const qty = await getApprovedReturnsAfterSnapshot(tiketId, barangId, snapshot.tanggal_laporan);
      totalApprovedQty += Number(qty);
    }

    approvedReturnByProjectBarang.set(key, totalApprovedQty);
  }

  const rows = boqItems.map((item) => {
    const tiket = item.boq?.tiket;
    const tiketProject = tiket?.project;
    const clusterProject = item.boq?.cluster?.project;
    const projectIdNum = Number(tiketProject?.project_id || 0);
    const barangId = String(item.barang_id);
    const key = `${projectIdNum}-${barangId}`;

    const boq = Number(item.qty_rencana || 0);
    const additional = Number(additionalByBarang.get(key) || 0);
    const hardwareOnSite = Number(outboundByBarang.get(key) || 0);
    const used = Number(outboundByBarang.get(key) || 0);
    const approvedReturnQty = Number(approvedReturnByProjectBarang.get(key) || 0);
    const remains = hardwareOnSite - (boq + additional) - used - approvedReturnQty;

    let status = "berjalan";
    if (remains < 0) {
      status = "perhatian";
    } else if (remains >= 0 && boq > 0) {
      status = "sesuai";
    }

    const clusterId = clusterProject?.cluster_id || tiketProject?.cluster_id || "-";
    const area = clusterProject?.area || tiketProject?.area || "-";

    return {
      project_id: projectIdNum,
      project_nama: tiketProject?.nama_project || "-",
      cluster_id: clusterId,
      area: area,
      barang_id: barangId,
      kode_perangkat: item.barang?.kode_perangkat || "-",
      nama_barang: item.barang?.nama_barang || "-",
      boq,
      additional,
      hardware_on_site: hardwareOnSite,
      used,
      approved_return_qty: approvedReturnQty,
      remains,
      status,
    };
  });

  let filtered = rows;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = rows.filter((row) =>
      [
        row.project_nama,
        row.area,
        row.cluster_id,
        row.kode_perangkat,
        row.nama_barang,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  return { data: filtered };
};

const getZoneUtilizationHistory = async (filters = {}) => {
  const {
    gudangId = "all",
    zonaId = "all",
    status = "all",
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = filters;

  const where = {};

  if (gudangId !== "all") {
    where.zona = { gudang_id: BigInt(gudangId) };
  }

  if (zonaId !== "all") {
    where.zona_id = BigInt(zonaId);
  }

  if (status !== "all") {
    where.status = status;
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(startDate);
    if (endDate) where.created_at.lte = new Date(endDate + "T23:59:59");
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.zona_utilisasi_log.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { created_at: "desc" },
      include: {
        zona: {
          include: {
            gudang: {
              select: {
                nama_gudang: true,
                tipe: true,
              },
            },
          },
        },
        diperbarui_user: {
          select: {
            nama: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.zona_utilisasi_log.count({ where }),
  ]);

  const rows = data.map((log) => ({
    log_id: String(log.log_id),
    created_at: log.created_at,
    zona_id: String(log.zona_id),
    zona_kode: log.zona?.kode_zona || "-",
    zona_nama: log.zona?.nama_zona || "-",
    gudang_id: log.zona?.gudang_id ? String(log.zona.gudang_id) : "-",
    gudang_nama: log.zona?.gudang?.nama_gudang || "-",
    gudang_tipe: log.zona?.gudang?.tipe || "-",
    status: log.status,
    diperbarui_oleh: String(log.diperbarui_oleh),
    diperbarui_nama: log.diperbarui_user?.nama || "-",
    diperbarui_email: log.diperbarui_user?.email || "-",
    diperbarui_role: log.diperbarui_user?.role || "-",
    catatan: log.catatan || "-",
  }));

  return {
    data: rows,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

const getZoneUtilization = async (filters = {}) => {
  const { gudangId = "all" } = filters;

  const where = {};
  if (gudangId !== "all") {
    where.gudang_id = BigInt(gudangId);
  }

  const zonas = await prisma.zona_gudang.findMany({
    where,
    include: {
      gudang: {
        select: {
          nama_gudang: true,
          tipe: true,
        },
      },
    },
    orderBy: [
      { gudang_id: "asc" },
      { kode_zona: "asc" },
    ],
  });

  return zonas.map((zona) => ({
    zona_id: String(zona.zona_id),
    zona_kode: zona.kode_zona,
    zona_nama: zona.nama_zona || zona.kode_zona,
    gudang_id: String(zona.gudang_id),
    gudang_nama: zona.gudang?.nama_gudang || "-",
    gudang_tipe: zona.gudang?.tipe || "-",
    status_kecukupan: zona.status_kecukupan || "CUKUP",
    utilisasi_persen: zona.utilisasi_persen ?? null,
  }));
};

const backfillReconciliation = async (actorId) => {
  const tikets = await prisma.tiket_material.findMany({
    include: {
      project: true,
      boq: {
        include: {
          items: {
            select: {
              qty_rencana: true,
            },
          },
        },
      },
    },
  });

  const allSuratJalans = await prisma.surat_jalan.findMany({
    where: { status: "diterima_didistribusikan" },
    include: {
      items: {
        select: {
          qty: true,
        },
      },
    },
  });

  const inboundByProject = new Map();
  const outboundByProject = new Map();
  const additionalByProject = new Map();
  const inboundMosByProject = new Map();

  const projectIdsForAdditional = Array.from(
    new Set(allSuratJalans.map((sj) => sj.project_id).filter((id) => id != null))
  ).map((id) => Number(id));

  const additionalTotalsByProject =
    projectIdsForAdditional.length > 0
      ? await additionalRepository.getAdditionalTotalsByProjectOnly(projectIdsForAdditional)
      : new Map();

  for (const sj of allSuratJalans) {
    const pid = Number(sj.project_id);
    if (!pid) continue;
    for (const item of sj.items) {
      const qty = Number(item.qty || 0);
      if (sj.tipe === "inbound") {
        inboundByProject.set(pid, (inboundByProject.get(pid) || 0) + qty);
        if (isMosEligibleInbound(sj)) {
          inboundMosByProject.set(pid, (inboundMosByProject.get(pid) || 0) + qty);
        }
      }
      if (sj.tipe === "outbound" && sj.tujuan_tipe !== "gudang") {
        outboundByProject.set(pid, (outboundByProject.get(pid) || 0) + qty);
      }
    }
  }

  // MOS = inbound only (external vendor inbound)
  const mosByProject = inboundMosByProject;

  const affectedTiketIds = [];

  for (const tiket of tikets) {
    const existingLaporan = await prisma.laporan_mitra.findFirst({
      where: {
        tiket_id: tiket.tiket_id,
        is_aktif: true,
      },
    });

    if (existingLaporan) {
      continue;
    }

    const pid = Number(tiket.project_id);
    // TODO: backfill ini masih pakai proxy dari surat jalan untuk migrasi data lama.
    // Untuk data baru, Used harus SELALU dari input manual laporan mitra, bukan dari fungsi ini.
    const mos = Number(outboundByProject.get(pid) || 0);
    const used = Number(inboundByProject.get(pid) || 0);

    await prisma.laporan_mitra.create({
      data: {
        tiket_id: tiket.tiket_id,
        kode_tiket: tiket.kode_tiket,
        project_id: tiket.project_id,
        jenis_laporan: "migrasi_sistem",
        tanggal_laporan: new Date(),
        mos,
        used,
        catatan: "Data migrasi otomatis dari sistem lama — belum dikonfirmasi mitra",
        cluster_id: tiket.cluster_id || null,
        uploaded_by: BigInt(actorId || 0),
        is_aktif: true,
      },
    });

    affectedTiketIds.push(String(tiket.tiket_id));
  }

  for (const tiketId of affectedTiketIds) {
    await reconciliationService.refreshTiketMosUsed(tiketId, prisma);
  }

  return { updated: affectedTiketIds.length };
};

// Normalisasi kunci kode_tiket agar cocok walau data tersimpan dengan spasi/karakter tak terlihat.
// Pola yang sama dipakai saat parsing file upload di reports.controller.js.
const normalizeTicketKey = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toUpperCase();

// Memetakan row tiket_material (batch query) menjadi Map kode_tiket -> info cluster/project.
// Dipakai untuk memperkaya riwayat upload laporan mitra tanpa query N+1.
const buildTicketInfoMap = (tikets = []) => {
  const map = new Map();
  for (const tiket of tikets) {
    const key = normalizeTicketKey(tiket?.kode_tiket);
    if (!key || map.has(key)) continue;
    const boq = tiket.boq || null;
    const cluster = boq?.cluster || null;
    // Urutan fallback cluster: BOQ (wajib ber-cluster) -> kolom cluster_id pada tiket.
    const clusterId = cluster?.cluster_id || boq?.cluster_id || tiket.cluster_id || null;
    map.set(key, {
      project_nama: tiket.project?.nama_project || null,
      cluster_id: clusterId,
      nama_cluster: cluster?.nama_cluster || null,
    });
  }
  return map;
};

// Menambahkan project_nama/cluster_id/nama_cluster pada setiap detail dan
// ringkasan unik tingkat log. Fungsi murni (tanpa DB) agar mudah diuji.
const enrichUploadLogs = (logs = [], ticketMap = new Map()) => {
  // Kumpulkan nilai unik sesuai urutan kemunculan; nilai tampil apa adanya,
  // tapi perbandingan memakai kunci ternormalisasi agar tidak ganda karena spasi.
  const collectUnique = (values) => {
    const seen = new Map();
    for (const { value, key } of values) {
      if (value === null || value === undefined) continue;
      const display = String(value);
      if (!display) continue;
      const dedupeKey = key || normalizeTicketKey(display);
      if (seen.has(dedupeKey)) continue;
      seen.set(dedupeKey, display);
    }
    return [...seen.values()];
  };

  return logs.map((log) => {
    const details = (log.details || []).map((detail) => {
      const info = detail.kode_tiket ? ticketMap.get(normalizeTicketKey(detail.kode_tiket)) : null;
      return {
        ...detail,
        project_nama: detail.project_nama || info?.project_nama || null,
        cluster_id: info?.cluster_id ?? null,
        nama_cluster: info?.nama_cluster ?? null,
      };
    });

    // Nilai tampil kode_tiket tetap apa adanya (mis. mempertahankan spasi),
    // hanya dedupe-nya yang memakai kunci ternormalisasi.
    const kode_tikets = [];
    const seenKodeTiket = new Set();
    for (const detail of details) {
      if (detail.kode_tiket === null || detail.kode_tiket === undefined) continue;
      const display = String(detail.kode_tiket);
      if (!display) continue;
      const key = normalizeTicketKey(detail.kode_tiket);
      if (seenKodeTiket.has(key)) continue;
      seenKodeTiket.add(key);
      kode_tikets.push(display);
    }

    return {
      ...log,
      details,
      cluster_ids: collectUnique(details.map((d) => ({ value: d.cluster_id, key: null }))),
      cluster_names: collectUnique(details.map((d) => ({ value: d.nama_cluster, key: null }))),
      project_names: collectUnique(details.map((d) => ({ value: d.project_nama, key: null }))),
      kode_tikets,
    };
  });
};

const getReconciliationUploadLogs = async (filters = {}) => {
  const {
    search = "",
    actorId = "all",
    startDate,
    endDate,
    status = "",
    clusterId = "",
    projectName = "",
    jenisInput = "",
    page = 1,
    limit = 20,
  } = filters;

  const where = {};

  if (search.trim()) {
    const s = search.trim().slice(0, 100);
    where.OR = [
      { filename: { contains: s, mode: "insensitive" } },
      { actor: { nama: { contains: s, mode: "insensitive" } } },
      {
        details: {
          some: {
            OR: [
              { kode_tiket: { contains: s, mode: "insensitive" } },
              { project_nama: { contains: s, mode: "insensitive" } },
              { nama_barang: { contains: s, mode: "insensitive" } },
              { kode_barang: { contains: s, mode: "insensitive" } },
              { barang: { nama_barang: { contains: s, mode: "insensitive" } } },
              { barang: { kode_perangkat: { contains: s, mode: "insensitive" } } },
            ],
          },
        },
      },
    ];
  }

  if (actorId !== "all") {
    where.uploaded_by = BigInt(actorId);
  }

  if (startDate || endDate) {
    where.uploaded_at = {};
    if (startDate) where.uploaded_at.gte = new Date(startDate + "T00:00:00+07:00");
    if (endDate) where.uploaded_at.lte = new Date(endDate + "T23:59:59+07:00");
  }

  if (status === "berhasil") { where.success_rows = { gt: 0 }; where.failed_rows = 0; }
  if (status === "sebagian_gagal") { where.failed_rows = { gt: 0 }; }
  if (status === "draft") { where.success_rows = 0; where.failed_rows = 0; }
  if (clusterId) {
    const tickets = await prisma.tiket_material.findMany({ where: { boq: { cluster_id: BigInt(clusterId) } }, select: { kode_tiket: true } });
    const codes = tickets.map((t) => t.kode_tiket);
    where.details = { some: { kode_tiket: { in: codes } } };
  }
  if (jenisInput === "manual") where.filename = "manual-input";
  if (jenisInput === "excel") where.filename = { not: "manual-input" };
  if (projectName) where.details = { some: { project_nama: { equals: projectName, mode: "insensitive" } } };
  const skip = (Number(page) - 1) * Number(limit);

  const [data, total] = await Promise.all([
    prisma.reconciliation_upload_log.findMany({
      where,
      skip: Number(skip),
      take: Number(limit),
      orderBy: { uploaded_at: "desc" },
      include: {
        actor: {
          select: {
            user_id: true,
            nama: true,
            email: true,
            role: true,
          },
        },
        details: {
          orderBy: { detail_id: "asc" },
          include: {
            barang: {
              select: {
                nama_barang: true,
                kode_perangkat: true,
                satuan_default: { select: { kode_satuan: true } },
              },
            },
          },
        },
      },
    }),
    prisma.reconciliation_upload_log.count({ where }),
  ]);

  const rows = data.map((log) => ({
    upload_id: String(log.upload_id),
    filename: log.filename,
    file_url: log.file_url,
    uploaded_at: log.uploaded_at,
    uploaded_by: String(log.uploaded_by),
    uploaded_by_nama: log.actor?.nama || "-",
    uploaded_by_role: log.actor?.role || "-",
    total_rows: log.total_rows,
    success_rows: log.success_rows,
    failed_rows: log.failed_rows,
    jumlah_barang: (log.details || []).length,
    barang_preview: (log.details || []).slice(0, 2).map((d) => ({
      nama_barang: d.nama_barang || d.barang?.nama_barang || null,
      kode_barang: d.kode_barang || d.barang?.kode_perangkat || null,
    })),
    details: log.details.map((d) => ({
       detail_id: String(d.detail_id),
       kode_tiket: d.kode_tiket,
       mos: d.mos ? Number(d.mos) : 0,
       used: d.used ? Number(d.used) : 0,
       status: d.status,
       reason: d.reason,
       project_nama: d.project_nama || null,
       nama_barang: d.nama_barang || d.barang?.nama_barang || null,
       kode_barang: d.kode_barang || d.barang?.kode_perangkat || null,
       satuan: d.barang?.satuan_default?.kode_satuan || null,
    })),
  }));

  // Batch tunggal: kumpulkan semua kode_tiket pada halaman ini, lalu ambil info cluster/project-nya.
  // Kunci dinormalisasi agar cocok dengan data yang tersimpan memiliki spasi tak sengaja.
  const kodeTiketList = [
    ...new Set(rows.flatMap((log) => (log.details || []).map((d) => normalizeTicketKey(d.kode_tiket)).filter(Boolean))),
  ];

  let ticketMap = new Map();
  if (kodeTiketList.length > 0) {
    const tikets = await prisma.tiket_material.findMany({
      where: { kode_tiket: { in: kodeTiketList } },
      include: {
        project: {
          select: {
            nama_project: true,
          },
        },
        boq: {
          select: {
            cluster_id: true,
            cluster: {
              select: {
                cluster_id: true,
                nama_cluster: true,
              },
            },
          },
        },
      },
    });
    ticketMap = buildTicketInfoMap(tikets);
  }

  return {
    data: enrichUploadLogs(rows, ticketMap),
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  };
};

const getReconciliationUploadLogBarang = async (uploadId) => {
  const log = await prisma.reconciliation_upload_log.findUnique({
    where: { upload_id: BigInt(uploadId) },
    select: {
      details: {
        orderBy: { detail_id: "asc" },
        select: {
          detail_id: true,
          nama_barang: true,
          kode_barang: true,
          used: true,
          status: true,
          barang: { select: { nama_barang: true, kode_perangkat: true, satuan_default: { select: { kode_satuan: true } } } },
        },
      },
    },
  });
  if (!log) return null;
  return log.details.map((d) => ({
    detail_id: String(d.detail_id),
    nama_barang: d.nama_barang || d.barang?.nama_barang || null,
    kode_barang: d.kode_barang || d.barang?.kode_perangkat || null,
    qty: d.used ? Number(d.used) : 0,
    satuan: d.barang?.satuan_default?.kode_satuan || null,
    status_baris: d.status,
  }));
};

const getReconciliationUploadLogFilterOptions = async () => {
  const logs = await prisma.reconciliation_upload_log.findMany({
    select: { uploaded_by: true, actor: { select: { nama: true } }, details: { select: { project_nama: true, kode_tiket: true } } },
  });
  const projects = [...new Set(logs.flatMap((l) => l.details.map((d) => d.project_nama).filter(Boolean)))];
  const actors = [...new Map(logs.map((l) => [String(l.uploaded_by), l.actor?.nama || "-"])).entries()].map(([id, nama]) => ({ id, nama }));
  const clusters = await prisma.cluster.findMany({ select: { cluster_id: true, nama_cluster: true } });
  return { statuses: ["berhasil", "sebagian_gagal", "draft"], clusters: clusters.map((c) => ({ id: String(c.cluster_id), nama: c.nama_cluster })), projects: projects.map((p) => ({ id: p, nama: p })), actors };
};

module.exports = {
  getStockHistory,
  getStockHistoryForExport,
  getAuditLogs,
  getAuditLogForExport,
  getHardwareReconciliation,
  getHardwareReconciliationPerTiket,
  getHardwareReconciliationDetailed,
  getZoneUtilizationHistory,
  getZoneUtilization,
  backfillReconciliation,
  getReconciliationUploadLogs,
  getReconciliationUploadLogBarang,
  getReconciliationUploadLogFilterOptions,
  enrichUploadLogs,
  buildTicketInfoMap,
};
