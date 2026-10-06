const reportsService = require("./reports.service");
const response = require("../../shared/response");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const ExcelJS = require("exceljs");
const prisma = require("../../config/prisma");
const reportsRepository = require("./reports.repository");
const reconciliationService = require("../reconciliation/reconciliation.service");

const RECONCILIATION_REQUIRED_COLUMNS = [
  { name: "Kode Tiket", aliases: ["Kode Tiket", "kode_tiket", "KODE_TIKET"] },
  { name: "Project", aliases: ["Project", "project", "Nama Project"] },
  { name: "Nama Barang", aliases: ["Nama Barang", "nama_barang", "Barang"] },
  { name: "Used", aliases: ["Used", "used"] },
  { name: "Kondisi", aliases: ["Kondisi", "kondisi", "KONDISI"] },
  { name: "Catatan", aliases: ["Catatan", "catatan", "Keterangan"] },
];

const KONDISI_BARANG_VALUES = new Set(["baik", "rusak_ringan", "rusak_berat", "tidak_sesuai_spek", "doa"]);
const KONDISI_BARANG_LABEL_MAP = new Map([
  ["baik", "baik"],
  ["rusak ringan", "rusak_ringan"],
  ["rusak berat", "rusak_berat"],
  ["tidak sesuai spek", "tidak_sesuai_spek"],
  ["tidak sesuai_spek", "tidak_sesuai_spek"],
  ["doa", "doa"],
  ["baik", "baik"],
  ["rusak_ringan", "rusak_ringan"],
  ["rusak_berat", "rusak_berat"],
  ["tidak_sesuai_spek", "tidak_sesuai_spek"],
  ["doa", "doa"],
]);

const normalizeKondisi = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  const withUnderscore = normalized.replace(/[\s-]+/g, "_");
  if (KONDISI_BARANG_VALUES.has(withUnderscore)) return withUnderscore;
  const mapped = KONDISI_BARANG_LABEL_MAP.get(normalized);
  if (mapped) return mapped;
  if (KONDISI_BARANG_VALUES.has(normalized)) return normalized;
  return null;
};

const getStockHistory = async (req, res, next) => {
  try {
    const result = await reportsService.getStockHistory(req.query);
    return response.success(res, "Riwayat stok berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const result = await reportsService.getAuditLogs(req.query);
    return response.success(res, "Log audit berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const exportAuditLogExcel = async (req, res, next) => {
  try {
    const result = await reportsService.exportAuditLog(req.query);
    const rows = result.data;
    const truncated = result.meta.truncated;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Audit Log");

    const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    const headerFont = { bold: true, color: { argb: "FFFFFFFF" } };
    const borderStyle = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    const headers = ["Waktu", "Pengguna", "Peran", "Aksi", "Entitas Terkait", "Referensi Tambahan"];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderStyle;
    });

    rows.forEach((row, rowIndex) => {
      const excelRow = rowIndex + 2;
      const ds = row.data_sesudah || {};
      const entityLabel = (() => {
        const kode = ds.kode_tiket || row.data_sebelum?.kode_tiket;
        if (kode) return kode;
        if (row.entity_type && row.entity_id && row.entity_id !== "0") {
          return `${row.entity_type} #${row.entity_id}`;
        }
        return row.entity_type || "-";
      })();
      const extraRef = (() => {
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
      })();

      const values = [
        row.created_at ? new Date(row.created_at).toLocaleString("id-ID") : "-",
        row.actor_nama || "-",
        row.actor_role || "-",
        row.aksi || "-",
        entityLabel,
        extraRef,
      ];

      values.forEach((value, colIndex) => {
        const cell = worksheet.getCell(excelRow, colIndex + 1);
        cell.value = value;
        cell.border = borderStyle;
        cell.alignment = { vertical: "middle", wrapText: true };
      });
    });

    worksheet.getRow(1).height = 22;
    for (let i = 1; i <= headers.length; i++) {
      worksheet.getColumn(i).width = 28;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Audit-Log-Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);
    if (truncated) {
      res.setHeader("X-Export-Truncated", "true");
      res.setHeader("X-Export-Truncated-Message", "Data melebihi batas 10.000 baris. Mohon persempit filter tanggal.");
    }
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

const exportStockHistoryExcel = async (req, res, next) => {
  try {
    const result = await reportsService.exportStockHistory(req.query);
    const rows = result.data;
    const truncated = result.meta.truncated;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Riwayat Stok");

    const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    const headerFont = { bold: true, color: { argb: "FFFFFFFF" } };
    const borderStyle = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    const headers = ["Tanggal", "Kode Tiket", "Jenis Transaksi", "Status", "Diproses Oleh", "Kode Perangkat", "Nama Barang", "Qty", "Zona", "Asal", "Tujuan"];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderStyle;
    });

    rows.forEach((row, rowIndex) => {
      const excelRow = rowIndex + 2;
      const values = [
        row.waktu_mutasi ? new Date(row.waktu_mutasi).toLocaleString("id-ID") : "-",
        row.kode_tiket || "-",
        row.tipe_surat_jalan || "-",
        row.status_surat_jalan || "-",
        row.diproses_oleh || "-",
        row.kode_perangkat || "-",
        row.nama_barang || "-",
        `${row.qty}${row.satuan && row.satuan !== "-" ? ` ${row.satuan}` : ""}`,
        row.zona_kode && row.zona_kode !== "-" ? `${row.zona_gudang} / ${row.zona_kode}` : "—",
        row.gudang_asal || "-",
        row.gudang_tujuan && row.gudang_tujuan !== "-" ? row.gudang_tujuan : (row.lapangan_tujuan || "-"),
      ];

      values.forEach((value, colIndex) => {
        const cell = worksheet.getCell(excelRow, colIndex + 1);
        cell.value = value;
        cell.border = borderStyle;
        cell.alignment = { vertical: "middle", wrapText: true };
      });
    });

    worksheet.getRow(1).height = 22;
    for (let i = 1; i <= headers.length; i++) {
      worksheet.getColumn(i).width = 28;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Riwayat-Stok-Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);
    if (truncated) {
      res.setHeader("X-Export-Truncated", "true");
      res.setHeader("X-Export-Truncated-Message", "Data melebihi batas 10.000 baris. Mohon persempit filter tanggal.");
    }
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

const getHardwareReconciliation = async (req, res, next) => {
  try {
    const result = await reportsService.getHardwareReconciliation(req.query);
    return response.success(res, "Rekonsiliasi hardware berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getHardwareReconciliationPerTiket = async (req, res, next) => {
  try {
    const result = await reportsService.getHardwareReconciliationPerTiket(req.query);
    return response.success(res, "Rekonsiliasi per Tiket berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getHardwareReconciliationDetailed = async (req, res, next) => {
  try {
    const result = await reportsService.getHardwareReconciliationDetailed(req.query);
    return response.success(res, "Rekonsiliasi hardware detail berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getZoneUtilizationHistory = async (req, res, next) => {
  try {
    const result = await reportsService.getZoneUtilizationHistory(req.query);
    return response.success(res, "Riwayat utilisasi zona berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getZoneUtilization = async (req, res, next) => {
  try {
    const result = await reportsService.getZoneUtilization(req.query);
    return response.success(res, "Data utilisasi zona berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const backfillReconciliation = async (req, res, next) => {
  try {
    const result = await reportsService.backfillReconciliation(req.user?.user_id);
    return response.success(res, "Backfill rekonsiliasi berhasil.", result);
  } catch (err) {
    next(err);
  }
};

const uploadDir = path.join(__dirname, "../../uploads/reconciliation");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `reconciliation-${uniqueSuffix}${ext}`);
  },
});

const excelFileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(xlsx|xls)$/i;
  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",
  ];
  const ext = allowedExtensions.test(path.extname(file.originalname));
  const mime = allowedMimeTypes.includes(file.mimetype);
  const looseMime = !file.mimetype || file.mimetype === "application/octet-stream";

  if (ext && (mime || looseMime)) {
    cb(null, true);
  } else {
    const received = `${path.extname(file.originalname) || "(tanpa ekstensi)"} / ${file.mimetype || "(tanpa mimetype)"}`;
    cb(new Error(`File harus berformat .xlsx atau .xls (yang Anda upload: ${received}).`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: excelFileFilter,
});

const uploadReconciliationFile = async (req, res, next) => {
  upload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return response.error(res, "File too large. Max 10MB.", 400);
      }
      return response.error(res, err.message, 400);
    } else if (err) {
      return response.error(res, err.message, 400);
    }

    if (!req.file) {
      return response.error(res, "No file uploaded.", 400);
    }

    try {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData.length) {
        fs.unlinkSync(req.file.path);
        return response.error(res, "File Excel kosong.", 400);
      }

      const firstRowKeys = Object.keys(jsonData[0] || {});
      const missingColumns = RECONCILIATION_REQUIRED_COLUMNS
        .filter((col) => !col.aliases.some((alias) => firstRowKeys.includes(alias)))
        .map((col) => col.name);

      if (missingColumns.length > 0) {
        fs.unlinkSync(req.file.path);
        const missingText = missingColumns.join(", ");
        return response.error(res, `Kolom ${missingText} tidak ditemukan. Gunakan template resmi.`, 400);
      }

      const tikets = await prisma.tiket_material.findMany({
        select: {
          kode_tiket: true,
          tiket_id: true,
          project_id: true,
          project: {
            select: {
              nama_project: true,
              cluster_id: true,
              area: true,
            },
          },
          boq: {
            include: {
              cluster: {
                select: {
                  cluster_id: true,
                },
              },
            },
          },
        },
      });

      const normalizedTiketsFromDb = tikets
        .map((t) => ({
          ...t,
          normalizedKodeTiket: String(t.kode_tiket)
            .normalize("NFKC")
            .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, "")
            .trim()
            .toUpperCase(),
        }))
        .filter((t) => {
          const status = t.boq?.status;
          return typeof status === "string" && ["draft", "aktif", "selesai"].includes(status);
        });
      const tiketMap = new Map(normalizedTiketsFromDb.map((t) => [t.normalizedKodeTiket, t]));
      const barangLookupCache = new Map();

      const preview = [];
      const failed = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rawKodeTiket = row["Kode Tiket"] || row["kode_tiket"] || row["KODE_TIKET"];
        const kodeTiket = rawKodeTiket
          ? String(rawKodeTiket)
              .normalize("NFKC")
              .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, "")
              .trim()
              .toUpperCase()
          : null;
        const projectName = row["Project"] || row["project"] || row["Nama Project"] || null;
        const used = Number(row["Used"] || row["used"] || 0);
        const namaBarang = row["Nama Barang"] || row["nama_barang"] || row["Barang"] || null;
        const kondisi = row["Kondisi"] || row["kondisi"] || row["KONDISI"] || null;
        const catatan = row["Catatan"] || row["catatan"] || row["Keterangan"] || null;

        if (!kodeTiket) {
          failed.push({ row: i + 2, used, nama_barang: namaBarang, kondisi, reason: "Kode Tiket tidak ditemukan" });
          continue;
        }

        const tiket = tiketMap.get(kodeTiket || "");
        if (!tiket) {
          failed.push({ row: i + 2, kode_tiket: kodeTiket, used, nama_barang: namaBarang, kondisi, reason: "Kode Tiket tidak terdaftar" });
          continue;
        }

        let barangId = null;
        const namaBarangTrimmed = namaBarang ? String(namaBarang).trim() : "";
        if (namaBarangTrimmed) {
          if (barangLookupCache.has(namaBarangTrimmed)) {
            barangId = barangLookupCache.get(namaBarangTrimmed);
          } else {
            const barang = await prisma.barang.findFirst({
              where: { nama_barang: namaBarangTrimmed },
              select: { barang_id: true },
            });
            barangId = barang ? String(barang.barang_id) : null;
            barangLookupCache.set(namaBarangTrimmed, barangId);
          }
        }

        if (!barangId) {
          failed.push({ row: i + 2, kode_tiket, used, nama_barang: namaBarang, kondisi, reason: `Barang "${namaBarangTrimmed}" tidak terdaftar` });
          continue;
        }

        const boq = await prisma.boq.findFirst({
          where: { tiket_id: BigInt(tiket.tiket_id), status: { in: ["draft", "aktif", "selesai"] } },
          include: { items: { where: { barang_id: BigInt(barangId) } } },
        });
        if (!boq || !boq.items.length) {
          failed.push({ row: i + 2, kode_tiket, used, nama_barang: namaBarang, kondisi, reason: `Barang "${namaBarangTrimmed}" tidak terdaftar di BOQ tiket ${tiket.kode_tiket}` });
          continue;
        }

        preview.push({
          tiket_id: String(tiket.tiket_id),
          kode_tiket: tiket.kode_tiket,
          project_nama: projectName || tiket.project?.nama_project || "-",
          cluster_id: tiket.boq?.cluster?.cluster_id || tiket.project?.cluster_id || "-",
          area: tiket.project?.area || "-",
          nama_barang: namaBarang,
          barang_id: barangId,
          used,
          catatan,
          kondisi,
        });
      }

      const protocol = req.protocol;
      const host = req.get("host");
      const fileUrl = `${protocol}://${host}/uploads/reconciliation/${req.file.filename}`;

      return response.success(res, "File berhasil diunggah dan diparsing.", {
        filename: req.file.filename,
        url: fileUrl,
        totalRows: jsonData.length,
        preview,
        failed,
      });
    } catch (parseErr) {
      fs.unlinkSync(req.file.path);
      return response.error(res, "Gagal memproses file Excel: " + parseErr.message, 400);
    }
  });
};

const confirmReconciliationUpload = async (req, res, next) => {
  try {
    const {
      filename,
      preview,
      failed,
      actorId,
      tanggal_laporan,
      pic_mitra,
      nama_barang,
      catatan,
      kondisi,
    } = req.body;

    if (!filename || !Array.isArray(preview) || !actorId) {
      return response.error(res, "Data tidak lengkap untuk konfirmasi.", 400);
    }

    const actor = await prisma.user_account.findUnique({
      where: { user_id: BigInt(actorId) },
      select: { nama: true, email: true, role: true },
    });

    if (!actor) {
      return response.error(res, "Pengguna tidak ditemukan.", 404);
    }

    const jenisLaporan = filename === "manual-input" ? "manual" : "excel";

    const uploadLog = await prisma.reconciliation_upload_log.create({
      data: {
        filename,
        file_url: `/uploads/reconciliation/${filename}`,
        uploaded_by: BigInt(actorId),
        total_rows: preview.length + failed.length,
        success_rows: 0,
        failed_rows: 0,
      },
    });

    let successCount = 0;
    let failedCount = 0;
    let updatedTikets = [];
    const affectedTiketIds = new Set();
    const failedItems = [];

    await prisma.$transaction(async (tx) => {
      for (const item of preview) {
        let tiketId = item.tiket_id;
        let kodeTiket = item.kode_tiket;

        if (!tiketId && kodeTiket) {
          const tiket = await tx.tiket_material.findUnique({
            where: { kode_tiket: kodeTiket },
            select: { tiket_id: true, kode_tiket: true, project_id: true, project: { select: { nama_project: true } } },
          });
          if (tiket) {
            tiketId = tiket.tiket_id;
            kodeTiket = tiket.kode_tiket;
          }
        }

        if (!tiketId) {
          await tx.reconciliation_upload_detail.create({
            data: {
              upload_id: uploadLog.upload_id,
              kode_tiket: kodeTiket || "-",
              mos: 0,
              remains_lapangan: 0,
              used: Number(item.used || 0),
              status: "gagal",
              reason: "Tiket tidak terdaftar",
              kondisi: normalizeKondisi(item.kondisi),
              nama_barang: item.nama_barang || null,
              kode_barang: null,
              project_nama: null,
              tanggal_laporan: tanggal_laporan ? new Date(tanggal_laporan) : new Date(),
              pic_mitra: pic_mitra || null,
              catatan: catatan || item.catatan || null,
            },
          });
          failedCount++;
          failedItems.push({ kode_tiket: kodeTiket || "-", nama_barang: "-", used: Number(item.used || 0), reason: "Tiket tidak terdaftar" });
          continue;
        }

        const tiket = await tx.tiket_material.findUnique({
          where: { tiket_id: BigInt(tiketId) },
          select: {
            tiket_id: true,
            kode_tiket: true,
            project_id: true,
            mos: true,
            used: true,
            project: { select: { nama_project: true } },
          },
        });

        if (!tiket) {
          await tx.reconciliation_upload_detail.create({
            data: {
              upload_id: uploadLog.upload_id,
              kode_tiket: kodeTiket || "-",
              mos: 0,
              remains_lapangan: 0,
              used: Number(item.used || 0),
              status: "gagal",
              reason: "Tiket tidak terdaftar",
              kondisi: normalizeKondisi(item.kondisi),
              nama_barang: item.nama_barang || null,
              kode_barang: null,
              project_nama: null,
              tanggal_laporan: tanggal_laporan ? new Date(tanggal_laporan) : new Date(),
              pic_mitra: pic_mitra || null,
              catatan: catatan || item.catatan || null,
            },
          });
          failedCount++;
          failedItems.push({ kode_tiket: kodeTiket || "-", nama_barang: "-", used: Number(item.used || 0), reason: "Tiket tidak terdaftar" });
          continue;
        }

        const dataSebelum = {
          mos: tiket.mos ? Number(tiket.mos) : null,
          used: tiket.used ? Number(tiket.used) : null,
        };

        if (!item.barang_id) {
          await tx.reconciliation_upload_detail.create({
            data: {
              upload_id: uploadLog.upload_id,
              kode_tiket: tiket.kode_tiket,
              mos: 0,
              remains_lapangan: 0,
              used: Number(item.used || 0),
              status: "gagal",
              reason: "Barang tidak terdaftar",
              kondisi: normalizeKondisi(item.kondisi),
              nama_barang: item.nama_barang || null,
              kode_barang: null,
              project_nama: tiket.project?.nama_project || null,
              tanggal_laporan: tanggal_laporan ? new Date(tanggal_laporan) : new Date(),
              pic_mitra: pic_mitra || null,
              catatan: catatan || item.catatan || null,
            },
          });
          failedCount++;
          failedItems.push({ kode_tiket: tiket.kode_tiket, nama_barang: item.nama_barang || "-", used: Number(item.used || 0), reason: "Barang tidak terdaftar" });
          continue;
        }

        const boq = await tx.boq.findFirst({
          where: { tiket_id: BigInt(tiketId), status: { in: ["draft", "aktif", "selesai"] } },
          include: { items: { where: { barang_id: BigInt(item.barang_id) }, include: { barang: { select: { kode_perangkat: true } } } } },
        });
        if (!boq || !boq.items.length) {
            await tx.reconciliation_upload_detail.create({
              data: {
                upload_id: uploadLog.upload_id,
                kode_tiket: tiket.kode_tiket,
                mos: 0,
                remains_lapangan: 0,
                used: Number(item.used || 0),
                status: "gagal",
                reason: `Barang tidak terdaftar di BOQ tiket ${tiket.kode_tiket}`,
                kondisi: normalizeKondisi(item.kondisi),
                nama_barang: item.nama_barang || null,
                kode_barang: null,
                project_nama: tiket.project?.nama_project || null,
                tanggal_laporan: tanggal_laporan ? new Date(tanggal_laporan) : new Date(),
                pic_mitra: pic_mitra || null,
                catatan: catatan || item.catatan || null,
              },
            });
            failedCount++;
            failedItems.push({ kode_tiket: tiket.kode_tiket, nama_barang: item.nama_barang || "-", used: Number(item.used || 0), reason: `Barang tidak terdaftar di BOQ tiket ${tiket.kode_tiket}` });
            continue;
          }

        try {
          const clusterFromTiket = await tx.cluster.findFirst({ where: { cluster_id: tiket.cluster_id }, select: { cluster_id: true } });
          await tx.laporan_mitra.create({
            data: {
              tiket_id: BigInt(tiketId),
              kode_tiket: tiket.kode_tiket,
              project_id: tiket.project_id,
              jenis_laporan: jenisLaporan,
              tanggal_laporan: tanggal_laporan ? new Date(tanggal_laporan) : new Date(),
              pic_mitra: pic_mitra || null,
              nama_barang: nama_barang || item.nama_barang || null,
              barang_id: item.barang_id ? BigInt(item.barang_id) : null,
              mos: 0,
              remains_lapangan: 0,
              used: Number(item.used || 0),
              catatan: catatan || item.catatan || null,
              kondisi: normalizeKondisi(kondisi || item.kondisi),
              cluster_id: clusterFromTiket?.cluster_id || null,
              uploaded_by: BigInt(actorId),
              is_aktif: true,
            },
          });

          await tx.reconciliation_upload_detail.create({
            data: {
              upload_id: uploadLog.upload_id,
              kode_tiket: tiket.kode_tiket,
              mos: 0,
              remains_lapangan: 0,
              used: Number(item.used || 0),
              status: "berhasil",
              reason: null,
              kondisi: normalizeKondisi(kondisi || item.kondisi),
              nama_barang: nama_barang || item.nama_barang || null,
              kode_barang: boq.items[0]?.barang?.kode_perangkat || null,
              project_nama: tiket.project?.nama_project || null,
              tanggal_laporan: tanggal_laporan ? new Date(tanggal_laporan) : new Date(),
              pic_mitra: pic_mitra || null,
              catatan: catatan || item.catatan || null,
            },
          });
          successCount++;
          affectedTiketIds.add(String(tiketId));
          updatedTikets.push({
            tiket_id: tiketId,
            kode_tiket: tiket.kode_tiket,
            remains_lapangan: 0,
            used: item.used,
          });
        } catch (insertErr) {
          await tx.reconciliation_upload_detail.create({
            data: {
              upload_id: uploadLog.upload_id,
              kode_tiket: tiket.kode_tiket,
              mos: 0,
              remains_lapangan: 0,
              used: Number(item.used || 0),
              status: "gagal",
              reason: insertErr.message || "Gagal menyimpan laporan mitra",
              kondisi: normalizeKondisi(kondisi || item.kondisi),
              nama_barang: nama_barang || item.nama_barang || null,
              kode_barang: boq.items[0]?.barang?.kode_perangkat || null,
              project_nama: tiket.project?.nama_project || null,
              tanggal_laporan: tanggal_laporan ? new Date(tanggal_laporan) : new Date(),
              pic_mitra: pic_mitra || null,
              catatan: catatan || item.catatan || null,
            },
          });
          failedCount++;
          failedItems.push({ kode_tiket: tiket.kode_tiket, nama_barang: item.nama_barang || "-", used: Number(item.used || 0), reason: insertErr.message || "Gagal menyimpan laporan mitra" });
        }

        await tx.audit_log.create({
          data: {
            entity_type: "reconciliation",
            entity_id: BigInt(tiketId),
            aksi: "input_rekonsiliasi",
            actor_id: BigInt(actorId),
            data_sebelum: dataSebelum,
            data_sesudah: {
              remains_lapangan: 0,
              used: item.used,
              source_file: filename,
              jenis_laporan: jenisLaporan,
            },
          },
        });
      }

        for (const item of failed) {
          await tx.reconciliation_upload_detail.create({
            data: {
              upload_id: uploadLog.upload_id,
              kode_tiket: item.kode_tiket || "-",
              mos: 0,
              remains_lapangan: 0,
              used: Number(item.used || 0),
              status: "gagal",
              reason: item.reason || "Gagal memproses baris",
              kondisi: normalizeKondisi(item.kondisi),
              nama_barang: item.nama_barang || null,
              kode_barang: null,
              project_nama: null,
              tanggal_laporan: tanggal_laporan ? new Date(tanggal_laporan) : new Date(),
              pic_mitra: pic_mitra || null,
              catatan: null,
            },
          });
          failedCount++;
          failedItems.push({ kode_tiket: item.kode_tiket || "-", nama_barang: item.nama_barang || "-", used: Number(item.used || 0), reason: item.reason || "Gagal memproses baris" });
        }

      for (const tiketId of affectedTiketIds) {
        await reconciliationService.refreshTiketMosUsed(tiketId, tx);
      }
    });

    await prisma.reconciliation_upload_log.update({
      where: { upload_id: uploadLog.upload_id },
      data: {
        success_rows: successCount,
        failed_rows: failedCount,
      },
    });

    return response.success(res, "Rekonsiliasi berhasil disimpan.", {
      updatedCount: updatedTikets.length,
      failedCount,
      failedItems: failedItems.slice(0, 10),
      updatedTikets,
      uploadedBy: actor.nama,
      filename,
    });
  } catch (err) {
    next(err);
  }
};

const downloadReconciliationTemplate = async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");

    const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    const headerFont = { bold: true, color: { argb: "FFFFFFFF" } };
    const borderStyle = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    const headers = ["Kode Tiket", "Project", "Nama Barang", "Used", "Kondisi", "Catatan"];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = header;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderStyle;
    });

    const exampleRow = ["TIKET-001", "Project A", "Kabel Fiber Optik", 3, "Baik", "Contoh catatan opsional"];
    exampleRow.forEach((value, colIndex) => {
      const cell = worksheet.getCell(2, colIndex + 1);
      cell.value = value;
      cell.border = borderStyle;
      cell.alignment = { vertical: "middle" };
    });

    worksheet.getRow(1).height = 22;
    for (let i = 1; i <= headers.length; i++) {
      worksheet.getColumn(i).width = 28;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = "Template_Rekonsiliasi.xlsx";
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

const getReconciliationUploadLogs = async (req, res, next) => {
  try {
    const filters = {
      search: req.query.search || "",
      actorId: req.query.actorId || "all",
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
      page: req.query.page || 1,
      limit: req.query.limit || 20,
    };

    const result = await reportsRepository.getReconciliationUploadLogs(filters);
    return response.success(res, "Data riwayat upload berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStockHistory,
  exportStockHistoryExcel,
  getAuditLogs,
  exportAuditLogExcel,
  getHardwareReconciliation,
  getHardwareReconciliationPerTiket,
  getHardwareReconciliationDetailed,
  getZoneUtilizationHistory,
  getZoneUtilization,
  backfillReconciliation,
  uploadReconciliationFile,
  confirmReconciliationUpload,
  getReconciliationUploadLogs,
  downloadReconciliationTemplate,
};
