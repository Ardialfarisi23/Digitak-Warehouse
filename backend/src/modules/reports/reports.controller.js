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
const {
  normalizeKondisi,
  validateReportRow,
  validateReportDateValue,
  validateKondisiValue,
} = require("./report-row-validator");

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
    // Nilai Used disimpan apa adanya; validasi angka dilakukan di report-row-validator.
    used: usedRaw,
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

      // Tanggal & PIC mitra (dikirim bersama file) dipakai untuk deteksi duplikat saat preview.
      const tanggalLaporanPreview = req.body?.tanggal_laporan ? parseReportDate(req.body.tanggal_laporan) : null;
      const picMitraPreview = req.body?.pic_mitra ? String(req.body.pic_mitra).trim() || null : null;
      const seenLaporanKeys = new Set();

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

        // Validasi angka Used dan kondisi barang sebelum baris masuk ke preview.
        const rowValidation = validateReportRow({ used, kondisi });
        const usedValue = rowValidation.values.used;

        if (!kodeTiket) {
          failed.push({ row: i + 2, used: usedValue, nama_barang: namaBarang, kondisi, reason: "Kode Tiket tidak ditemukan" });
          continue;
        }

        if (!rowValidation.valid) {
          failed.push({
            row: i + 2,
            kode_tiket: kodeTiket,
            used: usedValue,
            nama_barang: namaBarang,
            kondisi,
            reason: rowValidation.errors.join(" "),
          });
          continue;
        }

        const tiket = tiketMap.get(kodeTiket || "");
        if (!tiket) {
          failed.push({ row: i + 2, kode_tiket: kodeTiket, used: usedValue, nama_barang: namaBarang, kondisi, reason: "Kode Tiket tidak terdaftar" });
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
          failed.push({ row: i + 2, kode_tiket: kodeTiket, used: usedValue, nama_barang: namaBarang, kondisi, reason: `Barang "${namaBarangTrimmed}" tidak terdaftar` });
          continue;
        }

        const boq = await prisma.boq.findFirst({
          where: { tiket_id: BigInt(tiket.tiket_id), status: { in: ["aktif", "selesai"] } },
          include: { items: { where: { barang_id: BigInt(barangId) } } },
        });
        if (!boq || !boq.items.length) {
          failed.push({ row: i + 2, kode_tiket: kodeTiket, used: usedValue, nama_barang: namaBarang, kondisi, reason: `Barang "${namaBarangTrimmed}" tidak terdaftar di BOQ tiket ${tiket.kode_tiket}` });
          continue;
        }

        // Deteksi duplikat: laporan aktif yang sama sudah ada, atau duplikat di dalam file ini.
        if (tanggalLaporanPreview) {
          const laporanKey = buildLaporanMitraKey({
            tiketId: String(tiket.tiket_id),
            kodeTiket: kodeTiket,
            tanggalLaporan: tanggalLaporanPreview,
            picMitra: picMitraPreview,
            barangId,
          });
          if (seenLaporanKeys.has(laporanKey)) {
            failed.push({ row: i + 2, kode_tiket: kodeTiket, used: usedValue, nama_barang: namaBarang, kondisi, reason: "Laporan mitra duplikat dalam file yang sama" });
            continue;
          }
          seenLaporanKeys.add(laporanKey);

          const duplikat = await findActiveLaporanMitra(prisma, {
            tiketId: BigInt(tiket.tiket_id),
            tanggalLaporan: tanggalLaporanPreview,
            picMitra: picMitraPreview,
            barangId,
          });
          if (duplikat) {
            failed.push({ row: i + 2, kode_tiket: kodeTiket, used: usedValue, nama_barang: namaBarang, kondisi, reason: "Laporan mitra untuk tiket, tanggal, PIC, dan barang yang sama sudah ada" });
            continue;
          }
        }

        preview.push({
          tiket_id: String(tiket.tiket_id),
          kode_tiket: tiket.kode_tiket,
          project_nama: projectName || tiket.project?.nama_project || "-",
          cluster_id: tiket.boq?.cluster?.cluster_id || tiket.project?.cluster_id || "-",
          area: tiket.project?.area || "-",
          nama_barang: namaBarang,
          barang_id: barangId,
          used: usedValue,
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
  used: toSafeNumber(used),
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
  // Kolom lain (cluster_id, area, mos, used) nullable -> null.
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

// Angka pada payload laporan selalu disimpan sebagai angka valid (0 bila tidak valid).
const toSafeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

// Resolusi tanggal laporan: dipakai untuk cek duplikat dan penyimpanan agar konsisten.
const parseReportDate = (value) => {
  if (!value) return new Date();
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    value = value.toISOString();
  }
  // Normalisasi ke tanggal saja berdasarkan timezone Asia/Jakarta (WIB).
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const wib = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
  return new Date(`${wib}T00:00:00+07:00`);
};


// Kunci unik laporan mitra aktif: tiket + tanggal laporan + PIC mitra + barang.
// Sesuai unique index parsial "laporan_mitra_active_unique" di database.
const buildLaporanMitraKey = ({ tiketId, kodeTiket, tanggalLaporan, picMitra, barangId }) =>
  [
    tiketId ? `tiket:${tiketId}` : `kode:${normalizeTicketKey(kodeTiket)}`,
    tanggalLaporan ? new Date(tanggalLaporan).toISOString().slice(0, 10) : "",
    (picMitra || "").trim().toLowerCase(),
    barangId ? `barang:${barangId}` : "barang:-",
  ].join("|");

const REPORT_TIKET_SELECT = {
  tiket_id: true,
  kode_tiket: true,
  project_id: true,
  cluster_id: true,
  mos: true,
  used: true,
  project: { select: { nama_project: true } },
};

// Pencarian laporan mitra aktif untuk mendeteksi duplikat.
const findActiveLaporanMitra = async (client, { tiketId, tanggalLaporan, picMitra, barangId }) => {
  const picFilter = picMitra ? { pic_mitra: picMitra } : { OR: [{ pic_mitra: null }, { pic_mitra: "" }] };

  return client.laporan_mitra.findFirst({
    where: {
      is_aktif: true,
      tiket_id: tiketId,
      tanggal_laporan: tanggalLaporan,
      barang_id: barangId ? BigInt(barangId) : null,
      AND: [picFilter],
    },
    select: { laporan_id: true },
  });
};

// TAHAP 1 (di luar transaksi): validasi seluruh baris laporan sebelum disimpan.
// Semua query pada tahap ini hanya membaca data, sehingga baris bermasalah tidak pernah
// ditulis ke dalam transaksi dan tidak dapat membuat transaksi gagal (tx aborted).
const prepareReportRows = async ({ rows, tanggalLaporan, picMitra, kondisi }) => {
  const kodeTikets = [...new Set(rows.map((row) => (row.kode_tiket ? String(row.kode_tiket) : "")).filter(Boolean))];
  const ticketsByKode = new Map();
  if (kodeTikets.length > 0) {
    const tickets = await prisma.tiket_material.findMany({
      where: { kode_tiket: { in: kodeTikets } },
      select: REPORT_TIKET_SELECT,
    });
    tickets.forEach((tiket) => ticketsByKode.set(tiket.kode_tiket, tiket));
  }

  const ticketIds = [...new Set(rows.map((row) => (row.tiket_id ? String(row.tiket_id) : "")).filter(Boolean))];
  const ticketsById = new Map();
  if (ticketIds.length > 0) {
    const tickets = await prisma.tiket_material.findMany({
      where: { tiket_id: { in: ticketIds.map((id) => BigInt(id)) } },
      select: REPORT_TIKET_SELECT,
    });
    tickets.forEach((tiket) => ticketsById.set(String(tiket.tiket_id), tiket));
  }

  const prepared = [];
  const seenKeys = new Map();

  for (const item of rows) {
    // Validasi angka Used, kondisi barang, dan tanggal laporan.
    const rowValidation = validateReportRow({
      used: item.used,
      kondisi: kondisi || item.kondisi,
      tanggal_laporan: tanggalLaporan,
    });
    const usedValue = rowValidation.values.used;
    if (!rowValidation.valid) {
      prepared.push({ item, tiket: null, used: null, reject: rowValidation.errors.join(" ") });
      continue;
    }

    let tiket = item.tiket_id ? ticketsById.get(String(item.tiket_id)) || null : null;
    if (!tiket && item.kode_tiket) {
      tiket = ticketsByKode.get(String(item.kode_tiket)) || null;
    }

    if (!tiket && !item.boq_id) {
      prepared.push({ item, tiket: null, used: usedValue, reject: "Tiket tidak terdaftar" });
      continue;
    }

    // Validasi barang terdaftar di BOQ tiket (hanya untuk tiket yang sudah ada).
    let boqItem = null;
    if (tiket) {
      if (!item.barang_id) {
        prepared.push({ item, tiket, used: usedValue, reject: "Barang tidak terdaftar" });
        continue;
      }
      const boq = await prisma.boq.findFirst({
        where: { tiket_id: BigInt(tiket.tiket_id), status: { in: ["aktif", "selesai"] } },
        include: { items: { where: { barang_id: BigInt(item.barang_id) }, include: { barang: { select: { kode_perangkat: true } } } } },
      });
      if (!boq || !boq.items.length) {
        prepared.push({
          item,
          tiket,
          used: usedValue,
          reject: `Barang tidak terdaftar di BOQ tiket ${tiket.kode_tiket}`,
        });
        continue;
      }
      boqItem = boq.items[0];
    }

    // Deteksi duplikat: terhadap laporan aktif yang sudah ada dan duplikat di dalam file yang sama.
    const key = buildLaporanMitraKey({
      tiketId: tiket ? String(tiket.tiket_id) : null,
      kodeTiket: item.kode_tiket,
      tanggalLaporan,
      picMitra,
      barangId: item.barang_id,
    });
    if (seenKeys.has(key)) {
      prepared.push({ item, tiket, used: usedValue, reject: "Laporan mitra duplikat dalam file yang sama" });
      continue;
    }
    seenKeys.set(key, true);

    if (tiket) {
      const duplikat = await findActiveLaporanMitra(prisma, {
        tiketId: BigInt(tiket.tiket_id),
        tanggalLaporan,
        picMitra,
        barangId: item.barang_id,
      });
      if (duplikat) {
        prepared.push({
          item,
          tiket,
          used: usedValue,
          reject: "Laporan mitra untuk tiket, tanggal, PIC, dan barang yang sama sudah ada",
        });
        continue;
      }
    }

    prepared.push({ item, tiket, used: usedValue, boqItem, reject: null });
  }

  return prepared;
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

    // Tanggal laporan maksimal hari ini (tidak boleh di masa depan).
    const dateValidation = validateReportDateValue(tanggal_laporan);
    if (dateValidation.error) {
      return response.error(res, dateValidation.error, 400);
    }
    const tanggalLaporan = parseReportDate(tanggal_laporan);
    if (!tanggalLaporan) {
      return response.error(res, "Tanggal laporan tidak valid.", 400);
    }
    const picMitra = pic_mitra ? String(pic_mitra).trim() || null : null;

    // Kondisi barang (bila diisi di tingkat permintaan) harus nilai yang dikenal.
    const kondisiValidation = validateKondisiValue(kondisi);
    if (kondisiValidation.error) {
      return response.error(res, kondisiValidation.error, 400);
    }
    const failedRows = Array.isArray(failed) ? failed : [];

    // TAHAP 1: validasi semua baris di luar transaksi (hanya query baca).
    const preparedRows = await prepareReportRows({ rows: preview, tanggalLaporan, picMitra, kondisi });

    let uploadLog;
    let successCount = 0;
    let failedCount = 0;
    const updatedTikets = [];
    const affectedTiketIds = new Set();
    const failedItems = [];

    try {
      await prisma.$transaction(async (tx) => {
      uploadLog = await tx.reconciliation_upload_log.create({
        data: {
          filename,
          file_url: `/uploads/reconciliation/${filename}`,
          uploaded_by: BigInt(actorId),
          total_rows: preview.length + failedRows.length,
          success_rows: 0,
          failed_rows: 0,
        },
      });

      // Catat baris gagal (hasil validasi tahap 1) sebagai detail upload berstatus "gagal".
      const catatGagal = async (row) => {
        await tx.reconciliation_upload_detail.create({
          data: buildFailedUploadDetail({
            uploadId: uploadLog.upload_id,
            kodeTiket: row.kode_tiket,
            used: row.used,
            kondisi: row.kondisi,
            namaBarang: row.nama_barang,
            projectNama: row.project_nama,
            tanggalLaporan,
            picMitra,
            catatan: row.catatan,
            reason: row.reason,
          }),
        });
        failedCount += 1;
        failedItems.push({
          kode_tiket: row.kode_tiket || "-",
          nama_barang: row.nama_barang || "-",
          used: toSafeNumber(row.used),
          reason: row.reason,
        });
      };

      for (const prepared of preparedRows) {
        const { item } = prepared;
        let tiket = prepared.tiket;
        let kodeTiket = item.kode_tiket || (tiket ? tiket.kode_tiket : null);
        let autoTiketNote = null;
        let boqItem = prepared.boqItem || null;

        // Baris yang sudah ditolak pada tahap validasi (angka tidak valid, duplikat, dsb).
        if (prepared.reject) {
          await catatGagal({
            kode_tiket: kodeTiket,
            used: prepared.used ?? item.used,
            kondisi: item.kondisi,
            nama_barang: item.nama_barang,
            project_nama: tiket ? tiket.project?.nama_project || null : null,
            catatan: catatan || item.catatan || null,
            reason: prepared.reject,
          });
          continue;
        }

        // Baris manual yang hanya membawa boq_id/boq_number: siapkan tiket otomatis.
        // Alur upload file dan manual dengan tiket asli tetap melewati blok di atas.
        if (!tiket && item.boq_id) {
          const resolved = await resolveOrCreateTiketForBoq(tx, {
            boqId: item.boq_id,
            actorId,
          });
          if (resolved.error || !resolved.tiket) {
            await catatGagal({
              kode_tiket: kodeTiket,
              used: prepared.used ?? item.used,
              kondisi: item.kondisi,
              nama_barang: item.nama_barang,
              project_nama: null,
              catatan: catatan || item.catatan || null,
              reason: resolved.error || "Tiket tidak terdaftar",
            });
            continue;
          }

          tiket = resolved.tiket;
          kodeTiket = resolved.tiket.kode_tiket;
          autoTiketNote = resolved.note || null;

          if (!item.barang_id) {
            await catatGagal({
              kode_tiket: kodeTiket,
              used: prepared.used ?? item.used,
              kondisi: item.kondisi,
              nama_barang: item.nama_barang,
              project_nama: tiket.project?.nama_project || null,
              catatan: catatan || item.catatan || null,
              reason: "Barang tidak terdaftar",
            });
            continue;
          }

          const boq = await tx.boq.findFirst({
            where: { tiket_id: BigInt(tiket.tiket_id), status: { in: ["aktif", "selesai"] } },
            include: { items: { where: { barang_id: BigInt(item.barang_id) }, include: { barang: { select: { kode_perangkat: true } } } } },
          });
          if (!boq || !boq.items.length) {
            await catatGagal({
              kode_tiket: kodeTiket,
              used: prepared.used ?? item.used,
              kondisi: item.kondisi,
              nama_barang: item.nama_barang,
              project_nama: tiket.project?.nama_project || null,
              catatan: catatan || item.catatan || null,
              reason: `Barang tidak terdaftar di BOQ tiket ${tiket.kode_tiket}`,
            });
            continue;
          }
          boqItem = boq.items[0];
        }

        // Cegah duplikat sekali lagi di dalam transaksi (perlindungan submit bersamaan).
        const duplikat = await findActiveLaporanMitra(tx, {
          tiketId: BigInt(tiket.tiket_id),
          tanggalLaporan,
          picMitra,
          barangId: item.barang_id,
        });
        if (duplikat) {
          await catatGagal({
            kode_tiket: kodeTiket,
            used: prepared.used ?? item.used,
            kondisi: item.kondisi,
            nama_barang: item.nama_barang,
            project_nama: tiket.project?.nama_project || null,
            catatan: catatan || item.catatan || null,
            reason: "Laporan mitra untuk tiket, tanggal, PIC, dan barang yang sama sudah ada",
          });
          continue;
        }

        const dataSebelum = {
          mos: tiket.mos ? Number(tiket.mos) : null,
          used: tiket.used ? Number(tiket.used) : null,
        };

        await tx.laporan_mitra.create({
          data: {
            tiket_id: BigInt(tiket.tiket_id),
            kode_tiket: tiket.kode_tiket,
            project_id: tiket.project_id,
            jenis_laporan: jenisLaporan,
            tanggal_laporan: tanggalLaporan,
            pic_mitra: picMitra,
            nama_barang: nama_barang || item.nama_barang || null,
            barang_id: item.barang_id ? BigInt(item.barang_id) : null,
            mos: 0,
            remains_lapangan: 0,
            used: prepared.used,
            catatan: catatan || item.catatan || null,
            kondisi: normalizeKondisi(kondisi || item.kondisi),
            cluster_id: tiket.cluster_id || null,
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
            used: prepared.used,
            status: "berhasil",
            reason: null,
            kondisi: normalizeKondisi(kondisi || item.kondisi),
            nama_barang: nama_barang || item.nama_barang || null,
            kode_barang: boqItem?.barang?.kode_perangkat || null,
            project_nama: tiket.project?.nama_project || null,
            tanggal_laporan: tanggalLaporan,
            pic_mitra: picMitra,
            catatan: catatan || item.catatan || null,
          },
        });

        await tx.audit_log.create({
          data: {
            entity_type: "reconciliation",
            entity_id: BigInt(tiket.tiket_id),
            aksi: "input_rekonsiliasi",
            actor_id: BigInt(actorId),
            data_sebelum: dataSebelum,
            data_sesudah: {
              remains_lapangan: 0,
              used: prepared.used,
              source_file: filename,
              jenis_laporan: jenisLaporan,
              ...(autoTiketNote ? { catatan: autoTiketNote } : {}),
            },
          },
        });

        successCount += 1;
        affectedTiketIds.add(String(tiket.tiket_id));
        updatedTikets.push({
          tiket_id: String(tiket.tiket_id),
          kode_tiket: tiket.kode_tiket,
          remains_lapangan: 0,
          used: prepared.used,
        });
      }

      for (const item of failedRows) {
        await tx.reconciliation_upload_detail.create({
          data: {
            upload_id: uploadLog.upload_id,
            kode_tiket: item.kode_tiket || "-",
            mos: 0,
            remains_lapangan: 0,
            used: toSafeNumber(item.used),
            status: "gagal",
            reason: item.reason || "Gagal memproses baris",
            kondisi: normalizeKondisi(item.kondisi),
            nama_barang: item.nama_barang || null,
            kode_barang: null,
            project_nama: null,
            tanggal_laporan: tanggalLaporan,
            pic_mitra: picMitra,
            catatan: null,
          },
        });
        failedCount += 1;
        failedItems.push({
          kode_tiket: item.kode_tiket || "-",
          nama_barang: item.nama_barang || "-",
          used: toSafeNumber(item.used),
          reason: item.reason || "Gagal memproses baris",
        });
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
    } catch (err) {
      // P2002 = pelanggaran unique index laporan_mitra (tiket+tanggal+PIC+barang).
      if (err?.code === "P2002") {
        return response.error(res, "Laporan mitra untuk tiket, tanggal, PIC, dan barang yang sama sudah ada.", 409);
      }
      throw err;
    }

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

const getReconciliationUploadLogBarang = async (req, res, next) => {
  try {
    const data = await reportsRepository.getReconciliationUploadLogBarang(req.params.id);
    if (!data) return response.error(res, "Data tidak ditemukan.", 404);
    return response.success(res, "Data barang berhasil diambil.", data);
  } catch (err) {
    next(err);
  }
};

// Daftar laporan mitra untuk Riwayat: menampilkan status aktif/nonaktif tiap laporan.
const getReconciliationReports = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || "").trim();

    // Laporan yang sudah dinonaktifkan (is_aktif=false) tidak lagi dihitung pada
    // rekonsiliasi. Secara default endpoint ini hanya mengembalikan laporan aktif.
    // Admin boleh meminta laporan nonaktif (include_inactive=true) untuk keperluan audit.
    const isAdmin = String(req.user?.role || "") === "admin_general";
    const includeInactive =
      isAdmin && String(req.query.include_inactive || "").toLowerCase() === "true";

    const where = {};
    if (!includeInactive) {
      where.is_aktif = true;
    }
    if (search) {
      where.OR = [
        { kode_tiket: { contains: search, mode: "insensitive" } },
        { nama_barang: { contains: search, mode: "insensitive" } },
        { pic_mitra: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.laporan_mitra.count({ where }),
      prisma.laporan_mitra.findMany({
        where,
        orderBy: [{ uploaded_at: "desc" }, { laporan_id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          laporan_id: true,
          kode_tiket: true,
          nama_barang: true,
          pic_mitra: true,
          tanggal_laporan: true,
          used: true,
          mos: true,
          kondisi: true,
          jenis_laporan: true,
          is_aktif: true,
          uploaded_at: true,
          project: { select: { nama_project: true } },
          cluster: { select: { cluster_id: true, nama_cluster: true } },
          barang: { select: { nama_barang: true, kode_perangkat: true } },
        },
      }),
    ]);

    return response.success(res, "Daftar laporan mitra berhasil diambil.", {
      data: rows.map((row) => ({
        ...row,
        laporan_id: String(row.laporan_id),
        used: Number(row.used || 0),
        mos: Number(row.mos || 0),
        tanggal_laporan: row.tanggal_laporan
          ? new Date(row.tanggal_laporan).toISOString().slice(0, 10)
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    next(err);
  }
};

// Nonaktifkan laporan mitra: set is_aktif=false, hitung ulang agregasi Used/MOS, catat audit log.
const deactivateReconciliationReport = async (req, res, next) => {
  try {
    const actorId = req.user?.id;
    const laporanId = req.params.laporan_id;
    const alasan = String(req.body?.alasan || "").trim();

    if (!actorId) {
      return response.error(res, "Pengguna tidak dikenal.", 401);
    }
    if (!alasan) {
      return response.error(res, "Alasan wajib diisi untuk menonaktifkan laporan.", 400);
    }

    let laporanIdBig;
    try {
      laporanIdBig = BigInt(laporanId);
    } catch (err) {
      return response.error(res, "ID laporan tidak valid.", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const laporan = await tx.laporan_mitra.findUnique({ where: { laporan_id: laporanIdBig } });
      if (!laporan) {
        return { error: "Laporan mitra tidak ditemukan.", status: 404 };
      }
      if (!laporan.is_aktif) {
        // Idempoten: menonaktifkan laporan yang sudah nonaktif tidak menghasilkan error.
        return { alreadyInactive: true, updated: laporan };
      }

      const updated = await tx.laporan_mitra.update({
        where: { laporan_id: laporanIdBig },
        data: { is_aktif: false },
      });

      await tx.audit_log.create({
        data: {
          entity_type: "laporan_mitra",
          entity_id: laporanIdBig,
          aksi: "soft_delete",
          actor_id: BigInt(actorId),
          data_sebelum: {
            is_aktif: true,
            tiket_id: String(laporan.tiket_id),
            kode_tiket: laporan.kode_tiket,
            project_id: String(laporan.project_id),
            barang_id: laporan.barang_id ? String(laporan.barang_id) : null,
            nama_barang: laporan.nama_barang || null,
            pic_mitra: laporan.pic_mitra,
            tanggal_laporan: laporan.tanggal_laporan
              ? new Date(laporan.tanggal_laporan).toISOString().slice(0, 10)
              : null,
            jenis_laporan: laporan.jenis_laporan,
            used: Number(laporan.used || 0),
            mos: Number(laporan.mos || 0),
          },
          data_sesudah: {
            is_aktif: false,
            alasan,
          },
        },
      });

      // Agregasi Used/MOS tiket dihitung ulang agar laporan nonaktif tidak ikut terhitung.
      await reconciliationService.refreshTiketMosUsed(String(laporan.tiket_id), tx);

      return { updated };
    });

    if (result.error) {
      return response.error(res, result.error, result.status);
    }

    if (result.alreadyInactive) {
      return response.success(res, "Laporan mitra sudah berstatus nonaktif.", {
        laporan_id: String(result.updated.laporan_id),
        is_aktif: false,
      });
    }

    return response.success(res, "Laporan mitra berhasil dinonaktifkan.", {
      laporan_id: String(result.updated.laporan_id),
      is_aktif: result.updated.is_aktif,
    });
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
  getReconciliationReports,
  deactivateReconciliationReport,
  getReconciliationUploadLogs,
  getReconciliationUploadLogBarang,
  downloadReconciliationTemplate,
  RECONCILIATION_REQUIRED_COLUMNS,
  RECONCILIATION_OPTIONAL_COLUMNS,
  findMissingReconciliationColumns,
  readReconciliationRow,
  resolveOrCreateTiketForBoq,
};
