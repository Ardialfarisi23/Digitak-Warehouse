const reportsService = require("./reports.service");
const response = require("../../shared/response");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { parseReconciliationFileExceljs } = require("./upload-parse");
const { validateUploadFile } = require("./upload-validate");
const ExcelJS = require("exceljs");
const prisma = require("../../config/prisma");
const reportsRepository = require("./reports.repository");
const reconciliationService = require("../reconciliation/reconciliation.service");

const RECONCILIATION_REQUIRED_COLUMNS = [
  { name: "Kode Tiket", aliases: ["Kode Tiket", "kode_tiket", "KODE_TIKET"] },
  { name: "Project Name", aliases: ["Project Name", "Project", "project", "Nama Project"] },
  { name: "Nama Barang", aliases: ["Nama Barang", "nama_barang", "Barang"] },
  { name: "Angka Used", aliases: ["Angka Used", "Used", "used"] },
  { name: "Kondisi", aliases: ["Kondisi", "kondisi", "KONDISI"] },
  { name: "Keterangan", aliases: ["Keterangan", "Catatan", "catatan"] },
];

// Kolom opsional: hanya informasi di file upload, tidak dipakai untuk mencocokkan data sistem.
const RECONCILIATION_OPTIONAL_COLUMNS = [
  { name: "Cluster ID", aliases: ["Cluster ID", "cluster_id"] },
  { name: "Cluster Name", aliases: ["Cluster Name", "cluster_name", "Nama Cluster", "nama_cluster"] },
];

// Pencocokan nama header tidak sensitif huruf besar/kecil dan spasi berlebih.
const normalizeHeaderKey = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const RECONCILIATION_COLUMN_ALIASES = {};
[...RECONCILIATION_REQUIRED_COLUMNS, ...RECONCILIATION_OPTIONAL_COLUMNS].forEach((col) => {
  RECONCILIATION_COLUMN_ALIASES[col.name] = col.aliases;
});

const findMissingReconciliationColumns = (rowKeys) => {
  const normalizedKeys = rowKeys.map(normalizeHeaderKey);
  return RECONCILIATION_REQUIRED_COLUMNS.filter(
    (col) => !col.aliases.some((alias) => normalizedKeys.includes(normalizeHeaderKey(alias)))
  ).map((col) => col.name);
};

const pickRowValue = (row, aliases) => {
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeaderKey(alias);
    for (const key of Object.keys(row)) {
      if (normalizeHeaderKey(key) === normalizedAlias) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== "") return value;
      }
    }
  }
  return null;
};

const readReconciliationRow = (row) => {
  const usedRaw = pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Angka Used"]);
  return {
    kodeTiket: pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Kode Tiket"]),
    projectName: pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Project Name"]),
    namaBarang: pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Nama Barang"]),
    used: usedRaw === null ? 0 : Number(usedRaw),
    kondisi: pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Kondisi"]),
    catatan: pickRowValue(row, RECONCILIATION_COLUMN_ALIASES["Keterangan"]),
  };
};

// Normalisasi kunci kode_tiket agar pencocokan tahan terhadap spasi/karakter tak terlihat
// dan perbedaan huruf besar/kecil (pola yang sama dipakai saat parsing file upload).
const normalizeTicketKey = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toUpperCase();

// Pesan penanda bahwa tiket dibuat otomatis dari BOQ (mis. masuk audit_log).
const AUTO_TIKET_FROM_BOQ_NOTE = "Dibuat otomatis dari BOQ";

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

    const headers = ["Waktu", "Pengguna", "Peran", "Aksi", "Entitas Terkait", "Referensi Tambahan", "Detail"];
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
        row.created_at ? new Date(row.created_at).toLocaleString("id-ID") : "-",
        row.actor_nama || "Tidak dikenal",
        row.actor_role || "Tidak dikenal",
        row.aksi || "-",
        row.entity_name || "-",
        row.extra_ref || "—",
        row.detail || "-",
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

    const headers = ["Tanggal", "Kode Tiket", "No. Surat Jalan", "Jenis Transaksi", "Status", "Diproses Oleh", "Kode Perangkat", "Nama Barang", "Qty", "Zona", "Asal", "Tujuan"];
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
        row.nomor_surat_jalan && row.nomor_surat_jalan !== "-" ? row.nomor_surat_jalan : row.return_transaction_id ? `Return #${row.return_transaction_id}` : "",
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

    const validation = validateUploadFile({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      buffer: fs.readFileSync(req.file.path),
    });
    if (!validation.ok) {
      fs.unlinkSync(req.file.path);
      console.error(
        `[upload-validate] ditolak: ${req.file.originalname} | mimetype=${req.file.mimetype} | reason=${validation.reason}`,
      );
      return response.error(
        res,
        `File tidak valid: ${validation.reason}`,
        400,
      );
    }

    try {
      const { jsonData } = await parseReconciliationFileExceljs(req.file.path);

      if (!jsonData.length) {
        fs.unlinkSync(req.file.path);
        return response.error(res, "File Excel kosong.", 400);
      }

      const firstRowKeys = Object.keys(jsonData[0] || {});
      const missingColumns = findMissingReconciliationColumns(firstRowKeys);

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
        const {
          kodeTiket: rawKodeTiket,
          projectName,
          namaBarang,
          used,
          kondisi,
          catatan,
        } = readReconciliationRow(row);
        const kodeTiket = rawKodeTiket
          ? String(rawKodeTiket)
              .normalize("NFKC")
              .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, "")
              .trim()
              .toUpperCase()
          : null;

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

// Payload baris reconciliation_upload_detail berstatus gagal (dipakai beberapa jalur).
const buildFailedUploadDetail = ({
  uploadId,
  kodeTiket,
  used,
  kondisi,
  namaBarang,
  projectNama,
  tanggalLaporan,
  picMitra,
  catatan,
  reason,
}) => ({
  upload_id: uploadId,
  kode_tiket: kodeTiket || "-",
  mos: 0,
  remains_lapangan: 0,
  used: Number(used || 0),
  status: "gagal",
  reason,
  kondisi: normalizeKondisi(kondisi),
  nama_barang: namaBarang || null,
  kode_barang: null,
  project_nama: projectNama || null,
  tanggal_laporan: tanggalLaporan ? new Date(tanggalLaporan) : new Date(),
  pic_mitra: picMitra || null,
  catatan: catatan || null,
});

// Menyelesaikan tiket untuk baris laporan manual yang hanya punya boq_id/boq_number.
// Idempoten: pemanggilan berikutnya memakai tiket yang sama tanpa membuat duplikat.
const resolveOrCreateTiketForBoq = async (tx, { boqId, actorId }) => {
  if (!boqId) {
    return { error: "BOQ tidak ditemukan" };
  }

  const boq = await tx.boq.findUnique({
    where: { boq_id: BigInt(boqId) },
    include: {
      cluster: { select: { cluster_id: true, project_id: true } },
    },
  });

  if (!boq) {
    return { error: "BOQ tidak ditemukan" };
  }

  if (boq.tiket_id) {
    const existingOnBoq = await tx.tiket_material.findUnique({
      where: { tiket_id: BigInt(boq.tiket_id) },
      select: {
        tiket_id: true,
        kode_tiket: true,
        project_id: true,
        mos: true,
        used: true,
        cluster_id: true,
        project: { select: { nama_project: true } },
      },
    });
    if (existingOnBoq) {
      return { tiket: existingOnBoq };
    }
  }

  const boqNumber = boq.boq_number ? String(boq.boq_number).trim() : "";
  if (!boqNumber) {
    return { error: "BOQ tidak memiliki nomor tiket" };
  }

  // Cari tiket dengan kode yang sama. Karena kolom kode_tiket bertipe Text + unique,
  // normalisasi dilakukan di sisi aplikasi: pakai `contains` (case-insensitive) sebagai
  // filter superset, lalu Wajib lolos pemeriksaan normalizeTicketKey di bawah.
  const normalizedKey = normalizeTicketKey(boqNumber);
  const BOQ_TIKET_SELECT = {
    tiket_id: true,
    kode_tiket: true,
    project_id: true,
    mos: true,
    used: true,
    cluster_id: true,
    project: { select: { nama_project: true } },
  };
  const candidateRows = await tx.tiket_material.findMany({
    where: { kode_tiket: { contains: boqNumber, mode: "insensitive" } },
    select: BOQ_TIKET_SELECT,
  });

  const matchByKey = candidateRows.find(
    (candidate) => normalizeTicketKey(candidate.kode_tiket) === normalizedKey
  );

  if (matchByKey) {
    if (matchByKey.cluster_id && boq.cluster_id && matchByKey.cluster_id !== boq.cluster_id) {
      return { error: "Kode tiket bentrok dengan cluster lain" };
    }

    // cluster_id tiket null/belum diisi: lengkapi agar rekonsiliasi per cluster terhitung.
    if (!matchByKey.cluster_id && boq.cluster_id) {
      await tx.tiket_material.update({
        where: { tiket_id: BigInt(matchByKey.tiket_id) },
        data: { cluster_id: boq.cluster_id },
      });
      matchByKey.cluster_id = boq.cluster_id;
    }

    if (!boq.tiket_id) {
      await tx.boq.update({
        where: { boq_id: boq.boq_id },
        data: { tiket_id: BigInt(matchByKey.tiket_id) },
      });
    }

    return { tiket: matchByKey, note: AUTO_TIKET_FROM_BOQ_NOTE };
  }

  if (!boq.cluster?.project_id) {
    return { error: "Cluster BOQ tidak memiliki project" };
  }

  // Kolom NOT NULL tiket_material: kode_tiket, project_id, created_by.
  // Kolom lain (cluster_id, area, mos, used, used_terpasang) nullable -> null.
  let created;
  try {
    created = await tx.tiket_material.create({
      data: {
        kode_tiket: boqNumber,
        project_id: BigInt(boq.cluster.project_id),
        cluster_id: boq.cluster_id,
        created_by: BigInt(actorId),
      },
      select: {
        tiket_id: true,
        kode_tiket: true,
        project_id: true,
        mos: true,
        used: true,
        cluster_id: true,
        project: { select: { nama_project: true } },
      },
    });
  } catch (createErr) {
    // P2002 = unique violation: tiket sudah dibuat oleh request lain, ambil ulang.
    if (createErr?.code === "P2002") {
      const existing = await tx.tiket_material.findMany({
        where: { kode_tiket: { contains: boqNumber, mode: "insensitive" } },
        select: BOQ_TIKET_SELECT,
      });
      const match = existing.find(
        (candidate) => normalizeTicketKey(candidate.kode_tiket) === normalizedKey
      );
      if (!match) {
        return { error: "Gagal menyiapkan tiket dari BOQ" };
      }
      return { tiket: match, note: AUTO_TIKET_FROM_BOQ_NOTE };
    }
    throw createErr;
  }

  await tx.boq.update({
    where: { boq_id: boq.boq_id },
    data: { tiket_id: BigInt(created.tiket_id) },
  });

  return { tiket: created, note: AUTO_TIKET_FROM_BOQ_NOTE };
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

    // --- MOS Mitra: sumber angka tunggal -------------------------------
    // Angka MOS pada laporan mitra harus PERSIS sama dengan angka MOS pada
    // tabel/ringkasan rekonsiliasi (BUG-06). Karena itu metrik rekonsiliasi
    // (MOS + Remains) diambil dari tabel rekonsiliasi SEBELUM baris laporan
    // disimpan, lalu disimpan bersama laporan mitra & detail upload.
    const preTiketIds = preview
      .map((item) => item.tiket_id)
      .filter((id) => id !== null && id !== undefined && id !== "");
    const preKodeTikets = preview.map((item) => item.kode_tiket).filter(Boolean);
    const preBoqIds = preview
      .map((item) => item.boq_id)
      .filter((id) => id !== null && id !== undefined && id !== "");

    const preTiketFilters = [];
    if (preTiketIds.length) {
      preTiketFilters.push({ tiket_id: { in: preTiketIds.map((id) => BigInt(id)) } });
    }
    if (preKodeTikets.length) {
      preTiketFilters.push({ kode_tiket: { in: preKodeTikets } });
    }

    const preTikets = preTiketFilters.length
      ? await prisma.tiket_material.findMany({
          where: { OR: preTiketFilters },
          select: {
            tiket_id: true,
            kode_tiket: true,
            project_id: true,
            cluster_id: true,
            boq: { select: { cluster_id: true, cluster: { select: { project_id: true } } } },
          },
        })
      : [];

    const preBoqs = preBoqIds.length
      ? await prisma.boq.findMany({
          where: { boq_id: { in: preBoqIds.map((id) => BigInt(id)) } },
          select: { boq_id: true, cluster_id: true, cluster: { select: { project_id: true } } },
        })
      : [];

    const preProjectIds = new Set();
    for (const t of preTikets) {
      if (t.project_id) preProjectIds.add(String(t.project_id));
      if (t.boq?.cluster?.project_id) preProjectIds.add(String(t.boq.cluster.project_id));
    }
    for (const b of preBoqs) {
      if (b.cluster?.project_id) preProjectIds.add(String(b.cluster.project_id));
    }

    const rekonsiliasiMetrics = await reconciliationService.getRekonsiliasiMetricsByCluster(
      Array.from(preProjectIds)
    );

    // MOS & Remains kanonik untuk satu baris laporan (cluster + barang).
    const resolveMosMetrics = (barangId, clusterId) => {
      if (!barangId || !clusterId) return { mos: 0, remains: 0 };
      const metrics = rekonsiliasiMetrics.get(`${clusterId}-${String(barangId)}`);
      return {
        mos: Number(metrics?.mos || 0),
        remains: Number(metrics?.remains || 0),
      };
    };

    let uploadLog;
    let successCount = 0;
    let failedCount = 0;
    let updatedTikets = [];
    const affectedTiketIds = new Set();
    const failedItems = [];

    await prisma.$transaction(async (tx) => {
      uploadLog = await tx.reconciliation_upload_log.create({
        data: {
          filename,
          file_url: `/uploads/reconciliation/${filename}`,
          uploaded_by: BigInt(actorId),
          total_rows: preview.length + failed.length,
          success_rows: 0,
          failed_rows: 0,
        },
      });
      for (const item of preview) {
        let tiketId = item.tiket_id;
        let kodeTiket = item.kode_tiket;
        let autoTiketNote = null;

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

        // Baris manual yang hanya membawa boq_id/boq_number: siapkan tiket otomatis.
        // Alur upload file dan manual dengan tiket asli tetap melewati blok di atas.
        if (!tiketId && item.boq_id) {
          const resolved = await resolveOrCreateTiketForBoq(tx, {
            boqId: item.boq_id,
            actorId,
          });

          if (resolved.error || !resolved.tiket) {
            await tx.reconciliation_upload_detail.create({
              data: buildFailedUploadDetail({
                uploadId: uploadLog.upload_id,
                kodeTiket,
                used: item.used,
                kondisi: item.kondisi,
                namaBarang: item.nama_barang,
                projectNama: null,
                tanggalLaporan: tanggal_laporan,
                picMitra: pic_mitra,
                catatan: item.catatan,
                reason: resolved.error || "Tiket tidak terdaftar",
              }),
            });
            failedCount++;
            failedItems.push({
              kode_tiket: kodeTiket || "-",
              nama_barang: item.nama_barang || "-",
              used: Number(item.used || 0),
              reason: resolved.error || "Tiket tidak terdaftar",
            });
            continue;
          }

          tiketId = resolved.tiket.tiket_id;
          kodeTiket = resolved.tiket.kode_tiket;
          autoTiketNote = resolved.note || null;
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
            cluster_id: true,
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
          select: {
            cluster_id: true,
            items: {
              where: { barang_id: BigInt(item.barang_id) },
              select: { barang: { select: { kode_perangkat: true } } },
            },
          },
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

        let mosValue = 0;
        let remainsValue = 0;
        try {
          const clusterFromTiket = await tx.cluster.findFirst({ where: { cluster_id: tiket.cluster_id }, select: { cluster_id: true } });
          const clusterIdBarang = tiket.cluster_id || boq.cluster_id || null;
          const metrics = resolveMosMetrics(item.barang_id, clusterIdBarang);
          mosValue = metrics.mos;
          remainsValue = metrics.remains;

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
              mos: mosValue,
              remains_lapangan: remainsValue,
              used: Number(item.used || 0),
              catatan: catatan || item.catatan || null,
              kondisi: normalizeKondisi(kondisi || item.kondisi),
              cluster_id: clusterFromTiket?.cluster_id || clusterIdBarang || null,
              uploaded_by: BigInt(actorId),
              is_aktif: true,
            },
          });

          await tx.reconciliation_upload_detail.create({
            data: {
              upload_id: uploadLog.upload_id,
              kode_tiket: tiket.kode_tiket,
              mos: mosValue,
              remains_lapangan: remainsValue,
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
            remains_lapangan: remainsValue,
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
              mos: mosValue,
              remains_lapangan: remainsValue,
              used: item.used,
              source_file: filename,
              jenis_laporan: jenisLaporan,
              ...(autoTiketNote ? { catatan: autoTiketNote } : {}),
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

      await tx.reconciliation_upload_log.update({
        where: { upload_id: uploadLog.upload_id },
        data: {
          success_rows: successCount,
          failed_rows: failedCount,
        },
      });
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

    const templateColumns = [
      { header: "Cluster ID", example: "CL-0001", width: 18 },
      { header: "Cluster Name", example: "Cluster Contoh", width: 24 },
      { header: "Project Name", example: "Project A", width: 24 },
      { header: "Kode Tiket", example: "TIKET-001", width: 18 },
      { header: "Nama Barang", example: "Kabel Fiber Optik", width: 28 },
      { header: "Angka Used", example: 3, width: 14, numeric: true },
      { header: "Kondisi", example: "Baik", width: 16 },
      { header: "Keterangan", example: "Contoh catatan opsional", width: 32 },
    ];

    templateColumns.forEach((column, index) => {
      const cell = worksheet.getCell(1, index + 1);
      cell.value = column.header;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderStyle;
    });

    templateColumns.forEach((column, index) => {
      const cell = worksheet.getCell(2, index + 1);
      cell.value = column.example;
      cell.border = borderStyle;
      cell.alignment = { vertical: "middle" };
      if (column.numeric) {
        cell.numFmt = "0";
      }
    });

    worksheet.getRow(1).height = 22;
    templateColumns.forEach((column, index) => {
      worksheet.getColumn(index + 1).width = column.width;
    });

    // Sheet petunjuk — menegaskan bahwa MOS dihitung sistem (satu-satunya acuan)
    // dan tidak boleh diisi mitra, sehingga angka MOS pada ringkasan
    // rekonsiliasi, form input, dan template Excel selalu sama.
    const guideSheet = workbook.addWorksheet("Petunjuk");
    const guideRows = [
      ["Kolom", "Keterangan"],
      ["Angka Used", "Diisi mitra. Jumlah material yang sudah terpasang di lapangan."],
      ["MOS", "DIHITUNG OTOMATIS oleh sistem (tidak diisi). MOS = inbound vendor eksternal yang sudah disetujui/diterima + saldo awal import."],
      ["Remains", "DIHITUNG OTOMATIS oleh sistem. Remains = MOS - (BoQ Plan + Additional)."],
      ["Kondisi", "Baik / Rusak / Rusak Ringan / Rusak Berat."],
      ["Keterangan", "Catatan opsional."],
    ];
    guideRows.forEach((row, index) => {
      const guideRow = guideSheet.getRow(index + 1);
      row.forEach((value, colIndex) => {
        const cell = guideRow.getCell(colIndex + 1);
        cell.value = value;
        cell.border = borderStyle;
        cell.alignment = { vertical: "middle", wrapText: true };
        if (index === 0) {
          cell.font = headerFont;
          cell.fill = headerFill;
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      });
    });
    guideSheet.getColumn(1).width = 18;
    guideSheet.getColumn(2).width = 96;

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
  RECONCILIATION_REQUIRED_COLUMNS,
  RECONCILIATION_OPTIONAL_COLUMNS,
  findMissingReconciliationColumns,
  readReconciliationRow,
  resolveOrCreateTiketForBoq,
};
