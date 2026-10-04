const boqService = require("./boq.service");
const response = require("../../shared/response");
const ExcelJS = require("exceljs");

const transformBoq = (boq) => {
  if (!boq) return null;
  
  return {
    ...boq,
    id: String(boq.boq_id),
    boqNumber: boq.boq_number || `BOQ-${boq.boq_id}`,
    ticketNumber: boq.tiket?.kode_tiket || "",
    projectId: boq.tiket?.project?.project_id ? String(boq.tiket.project.project_id) : "",
    project: boq.tiket?.project ? {
      projectId: String(boq.tiket.project.project_id),
      projectName: boq.tiket.project.nama_project,
      title: boq.tiket.project.title,
      status_aktif: boq.tiket.project.status_aktif,
    } : null,
    clusterId: boq.cluster?.cluster_id || boq.cluster?.project?.cluster_id || boq.tiket?.project?.cluster_id || "",
    cluster: boq.cluster ? {
      clusterId: boq.cluster.cluster_id,
      nama_cluster: boq.cluster.nama_cluster,
      cluster_type: boq.cluster.cluster_type,
      project: boq.cluster.project ? {
        projectId: String(boq.cluster.project.project_id),
        nama_project: boq.cluster.project.nama_project,
        area: boq.cluster.project.area,
      } : null,
    } : null,
    area: boq.tiket?.area || "",
    status: boq.status,
    source: boq.source,
    externalVerificationStatus: boq.external_verification_status,
    notes: boq.catatan || "",
    referenceFile: boq.reference_file || "",
    emailReference: boq.email_reference || "",
    createdAt: boq.created_at,
    updatedAt: boq.updated_at,
    createdBy: boq.creator?.nama || (boq.created_by ? String(boq.created_by) : ""),
    updatedBy: boq.updater?.nama || (boq.updated_by ? String(boq.updated_by) : ""),
    items: (boq.items || []).map((item) => ({
      ...item,
      id: String(item.boq_item_id),
      itemCode: item.barang?.kode_perangkat || "",
      itemName: item.barang?.nama_barang || "",
      unit: item.satuan?.kode_satuan || "",
      destinationWarehouseId: item.gudang_tujuan_id ? String(item.gudang_tujuan_id) : "",
      destinationWarehouse: item.gudang_tujuan ? {
        id: String(item.gudang_tujuan.gudang_id),
        name: item.gudang_tujuan.nama_gudang,
      } : null,
      quantity: Number(item.qty_rencana || 0),
    })),
    suratJalanHistory: (boq.surat_jalans || []).map((sj) => ({
      id: String(sj.surat_jalan_id),
      number: sj.nomor_surat_jalan,
      date: sj.tanggal,
      qty: (sj.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0),
    })),
  };
};

const transformBoqList = (data) => {
  if (!Array.isArray(data)) return [];
  return data.map(transformBoq);
};

const create = async (req, res, next) => {
  try {
    const result = await boqService.create(req.body, req.user.id);
    const transformed = transformBoq(result);
    return response.success(res, "BOQ berhasil dibuat.", transformed, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await boqService.findAll(req.query);
    const transformedData = {
      ...result,
      data: transformBoqList(result.data),
    };
    return response.success(res, "Daftar BOQ berhasil diambil.", transformedData);
  } catch (err) {
    next(err);
  }
};

const findById = async (req, res, next) => {
  try {
    const result = await boqService.findById(req.params.id);
    const transformed = transformBoq(result);
    return response.success(res, "Detail BOQ berhasil diambil.", transformed);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await boqService.update(req.params.id, req.body, req.user.id);
    const transformed = transformBoq(result);
    return response.success(res, "BOQ berhasil diperbarui.", transformed);
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await boqService.updateStatus(req.params.id, status, req.user.id);
    const transformed = transformBoq(result);
    return response.success(res, `BOQ berhasil di${status === "aktif" ? "aktifkan" : "diubah"}.`, transformed);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await boqService.softDelete(req.params.id, req.user.id);
    return response.success(res, "BOQ berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await boqService.restore(req.params.id, req.user.id);
    const transformed = transformBoq(result);
    return response.success(res, "BOQ berhasil dipulihkan.", transformed);
  } catch (err) {
    next(err);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const result = await boqService.getSummary(req.params.id);
    const transformed = transformBoq(result);
    return response.success(res, "Ringkasan BOQ berhasil diambil.", transformed);
  } catch (err) {
    next(err);
  }
};

const exportBoqs = async (req, res, next) => {
  try {
    const result = await boqService.exportBoqs(req.query);
    const transformed = transformBoqList(result);

    const escapeCsv = (value) => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      "Nomor BOQ",
      "Tiket",
      "Status",
      "Sumber",
      "Verifikasi Eksternal",
      "Area",
      "Project",
      "Total Item",
      "Total Qty",
      "Catatan",
      "Dibuat",
    ];

    const rows = transformed.map((row) => [
      escapeCsv(row.boqNumber),
      escapeCsv(row.ticketNumber),
      escapeCsv(row.status),
      escapeCsv(row.source),
      escapeCsv(row.externalVerificationStatus),
      escapeCsv(row.area),
      escapeCsv(row.project?.nama_project || row.project?.title || "-"),
      escapeCsv(row.items?.length || 0),
      escapeCsv(row.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0),
      escapeCsv(row.notes || ""),
      escapeCsv(new Date(row.createdAt).toISOString()),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=boq-export.csv");
    return res.send(csv);
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const result = await boqService.getStats();
    return response.success(res, "Statistik BOQ berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getAreas = async (req, res, next) => {
  try {
    const result = await boqService.getAreas();
    return response.success(res, "Daftar area berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getItems = async (req, res, next) => {
  try {
  const projectId = req.query.projectId;
  const statusesParam = req.query.statuses;
  const statuses = statusesParam
    ? String(statusesParam)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => ["draft", "aktif", "selesai"].includes(s))
    : ["aktif"];
  if (!statuses.length) {
    statuses.push("aktif");
  }
  if (!projectId) {
    return response.success(res, "Daftar item BOQ berhasil diambil.", []);
  }
  const result = await boqService.getItems(projectId, statuses);
    return response.success(res, "Daftar item BOQ berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const getExportMatrixData = async (req, res, next) => {
  try {
    const result = await boqService.getExportMatrixData();
    return response.success(res, "Data export matrix berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const exportMatrixExcel = async (req, res, next) => {
  try {
    const { projects, materials } = await boqService.getExportMatrixData();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("BOQ Matrix");

    const METRICS = ["BoQ Plan", "Additional", "MOS", "Used", "Remains"];
    const BASE_COLS = 3;

    const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    const headerFont = { bold: true, color: { argb: "FFFFFFFF" } };
    const subHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2FF" } };
    const subHeaderFont = { bold: true, color: { argb: "FF4F46E5" } };
    const borderStyle = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    worksheet.getCell(1, 1).value = "Kode Perangkat";
    worksheet.getCell(1, 2).value = "Nama Barang";
    worksheet.getCell(1, 3).value = "Satuan";

    for (let c = 1; c <= BASE_COLS; c++) {
      const cell = worksheet.getCell(1, c);
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderStyle;
    }

    for (let i = 0; i < projects.length; i++) {
      const col = BASE_COLS + i * METRICS.length + 1;
      const cell = worksheet.getCell(1, col);
      const projectLabel = `${projects[i].project_nama}${projects[i].cluster_id && projects[i].cluster_id !== "-" ? ` (${projects[i].cluster_id})` : ""}`;
      cell.value = projectLabel;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(1, col, 1, col + METRICS.length - 1);
    }

    for (let i = 0; i < projects.length; i++) {
      for (let j = 0; j < METRICS.length; j++) {
        const col = BASE_COLS + i * METRICS.length + j + 1;
        const cell = worksheet.getCell(2, col);
        cell.value = METRICS[j];
        cell.font = subHeaderFont;
        cell.fill = subHeaderFill;
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = borderStyle;
      }
    }

    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      const row = i + 3;
      const kodeCell = worksheet.getCell(row, 1);
      const namaCell = worksheet.getCell(row, 2);
      const satuanCell = worksheet.getCell(row, 3);

      kodeCell.value = material.kode_perangkat;
      namaCell.value = material.nama_barang;
      satuanCell.value = material.satuan;

      for (let j = 0; j < projects.length; j++) {
        const project = projects[j];
        const projData = material.projects[String(project.project_id)] || {
          boq: 0,
          additional: 0,
          mos: 0,
          used: 0,
          remains: 0,
        };
        const baseCol = BASE_COLS + j * METRICS.length;
        const values = [projData.boq, projData.additional, projData.mos, projData.used, projData.remains];
        for (let k = 0; k < METRICS.length; k++) {
          const cell = worksheet.getCell(row, baseCol + k + 1);
          cell.value = values[k];
          cell.numberFormat = "0.00";
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = borderStyle;
        }
      }

      kodeCell.border = borderStyle;
      namaCell.border = borderStyle;
      satuanCell.border = borderStyle;
    }

    worksheet.getColumn(1).width = 14;
    worksheet.getColumn(2).width = 32;
    worksheet.getColumn(3).width = 10;
    for (let i = 0; i < projects.length; i++) {
      for (let j = 0; j < METRICS.length; j++) {
        worksheet.getColumn(BASE_COLS + i * METRICS.length + j + 1).width = 12;
      }
    }

    worksheet.getRow(1).height = 22;
    worksheet.getRow(2).height = 18;

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `BOQ-Export-Matrix_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findById,
  update,
  updateStatus,
  softDelete,
  restore,
  getSummary,
  exportBoqs,
  getStats,
  getAreas,
  getItems,
  getExportMatrixData,
  exportMatrixExcel,
};
