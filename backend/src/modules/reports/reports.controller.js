const reportsService = require("./reports.service");
const response = require("../../shared/response");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const ExcelJS = require("exceljs");
const prisma = require("../../config/prisma");
const reportsRepository = require("./reports.repository");

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
        row.gudang_tujuan || "-",
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
    const result = await reportsService.backfillReconciliation();
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
  const allowedTypes = /xlsx|xls/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files are allowed (xlsx, xls)."), false);
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
        },
      });

      const tiketMap = new Map(tikets.map((t) => [t.kode_tiket, t]));

      const preview = [];
      const failed = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const kodeTiket = row["Kode Tiket"] || row["kode_tiket"] || row["KODE_TIKET"];
        const mos = Number(row["MOS"] || row["mos"] || row["Material on Site"] || 0);
        const used = Number(row["Used"] || row["used"] || 0);
        const usedTerpasang = Number(row["Used Terpasang"] || row["used_terpasang"] || row["Qty Terpasang"] || row["Terpasang"] || 0);

        if (!kodeTiket) {
          failed.push({ row: i + 2, reason: "Kode Tiket tidak ditemukan" });
          continue;
        }

        const tiket = tiketMap.get(String(kodeTiket).trim());
        if (!tiket) {
          failed.push({ row: i + 2, kode_tiket: kodeTiket, reason: "Kode Tiket tidak terdaftar" });
          continue;
        }

        preview.push({
          tiket_id: tiket.tiket_id,
          kode_tiket: tiket.kode_tiket,
          project_nama: tiket.project?.nama_project || "-",
          cluster_id: tiket.project?.cluster_id || "-",
          area: tiket.project?.area || "-",
          mos,
          used,
          used_terpasang: usedTerpasang,
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
    const { filename, preview, actorId } = req.body;

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

    const uploadLog = await prisma.reconciliation_upload_log.create({
      data: {
        filename,
        file_url: `/uploads/reconciliation/${filename}`,
        uploaded_by: BigInt(actorId),
        total_rows: preview.length,
        success_rows: 0,
        failed_rows: 0,
      },
    });

    let successCount = 0;
    let failedCount = 0;
    const updatedTikets = [];

    for (const item of preview) {
      const tiket = await prisma.tiket_material.findUnique({
        where: { tiket_id: BigInt(item.tiket_id) },
        include: {
          boq: true,
        },
      });

      if (!tiket) {
        await prisma.reconciliation_upload_detail.create({
          data: {
            upload_id: uploadLog.upload_id,
            kode_tiket: item.kode_tiket || "-",
            mos: Number(item.mos || 0),
            used: Number(item.used || 0),
            status: "gagal",
            reason: "Tiket tidak terdaftar",
          },
        });
        failedCount++;
        continue;
      }

      const dataSebelum = {
        mos: tiket.mos ? Number(tiket.mos) : null,
        used: tiket.used ? Number(tiket.used) : null,
        used_terpasang: tiket.used_terpasang ? Number(tiket.used_terpasang) : null,
      };

      try {
        await prisma.tiket_material.update({
          where: { tiket_id: BigInt(item.tiket_id) },
          data: {
            mos: item.mos,
            used: item.used,
            used_terpasang: item.used_terpasang,
          },
        });

        await prisma.reconciliation_upload_detail.create({
          data: {
            upload_id: uploadLog.upload_id,
            kode_tiket: tiket.kode_tiket,
            mos: Number(item.mos || 0),
            used: Number(item.used || 0),
            used_terpasang: Number(item.used_terpasang || 0),
            status: "berhasil",
            reason: null,
          },
        });
        successCount++;
        updatedTikets.push({
          tiket_id: item.tiket_id,
          kode_tiket: tiket.kode_tiket,
          mos: item.mos,
          used: item.used,
          used_terpasang: item.used_terpasang,
        });
      } catch (updateErr) {
        await prisma.reconciliation_upload_detail.create({
          data: {
            upload_id: uploadLog.upload_id,
            kode_tiket: tiket.kode_tiket,
            mos: Number(item.mos || 0),
            used: Number(item.used || 0),
            used_terpasang: Number(item.used_terpasang || 0),
            status: "gagal",
            reason: updateErr.message || "Gagal memperbarui tiket",
          },
        });
        failedCount++;
      }

      await prisma.audit_log.create({
        data: {
          entity_type: "reconciliation",
          entity_id: BigInt(item.tiket_id),
          aksi: "update",
          actor_id: BigInt(actorId),
          data_sebelum: dataSebelum,
          data_sesudah: {
            mos: item.mos,
            used: item.used,
            used_terpasang: item.used_terpasang,
            source_file: filename,
          },
        },
      });
    }

    await prisma.reconciliation_upload_log.update({
      where: { upload_id: uploadLog.upload_id },
      data: {
        success_rows: successCount,
        failed_rows: failedCount,
      },
    });

    return response.success(res, "Rekonsiliasi berhasil disimpan.", {
      updatedCount: updatedTikets.length,
      updatedTikets,
      uploadedBy: actor.nama,
      filename,
    });
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
};
