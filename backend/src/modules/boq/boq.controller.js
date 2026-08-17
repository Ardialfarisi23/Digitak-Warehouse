const boqService = require("./boq.service");
const response = require("../../shared/response");

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
    } : null,
    area: boq.tiket?.area || "",
    status: boq.status,
    source: boq.source,
    externalVerificationStatus: boq.external_verification_status,
    notes: boq.catatan || "",
    referenceFile: boq.reference_file || "",
    createdAt: boq.created_at,
    updatedAt: boq.updated_at,
    createdBy: boq.creator?.nama || boq.created_by ? String(boq.created_by) : "",
    updatedBy: boq.updater?.nama || boq.updated_by ? String(boq.updated_by) : "",
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
    await boqService.softDelete(req.params.id);
    return response.success(res, "BOQ berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await boqService.restore(req.params.id);
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
    if (!projectId) {
      return response.success(res, "Daftar item BOQ berhasil diambil.", []);
    }
    const result = await boqService.getItems(projectId);
    return response.success(res, "Daftar item BOQ berhasil diambil.", result);
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
};
