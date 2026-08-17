const reportsService = require("./reports.service");
const response = require("../../shared/response");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const prisma = require("../../config/prisma");

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

const getRackUtilization = async (req, res, next) => {
  try {
    const result = await reportsService.getRackUtilization();
    return response.success(res, "Utilisasi rak berhasil diambil.", result);
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

    const updatedTikets = [];
    for (const item of preview) {
      const tiket = await prisma.tiket_material.findUnique({
        where: { tiket_id: BigInt(item.tiket_id) },
        include: {
          boq: true,
        },
      });

      if (!tiket) continue;

      const dataSebelum = {
        mos: tiket.mos ? Number(tiket.mos) : null,
        used: tiket.used ? Number(tiket.used) : null,
      };

      await prisma.tiket_material.update({
        where: { tiket_id: BigInt(item.tiket_id) },
        data: {
          mos: item.mos,
          used: item.used,
        },
      });

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
            source_file: filename,
          },
        },
      });

      updatedTikets.push({
        tiket_id: item.tiket_id,
        kode_tiket: item.kode_tiket,
        mos: item.mos,
        used: item.used,
      });
    }

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

module.exports = {
  getStockHistory,
  getAuditLogs,
  getRackUtilization,
  getHardwareReconciliation,
  getHardwareReconciliationPerTiket,
  getHardwareReconciliationDetailed,
  getZoneUtilizationHistory,
  getZoneUtilization,
  backfillReconciliation,
  uploadReconciliationFile,
  confirmReconciliationUpload,
};
