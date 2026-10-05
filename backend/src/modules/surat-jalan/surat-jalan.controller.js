const suratJalanService = require("./surat-jalan.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await suratJalanService.create(req.body, req.user.id);
    return response.success(res, "Surat Jalan berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const createStaffInbound = async (req, res, next) => {
  try {
    const result = await suratJalanService.createStaffInbound(req.body, req.user.id);
    return response.success(res, "Pengajuan inbound berhasil dibuat dan menunggu verifikasi supervisor.", result, 201);
  } catch (err) {
    next(err);
  }
};

const receiveInbound = async (req, res, next) => {
  try {
    const result = await suratJalanService.receiveInbound(req.params.id, req.body.items, req.user.id, req.gudangScope);
    return response.success(res, "Penerimaan inbound berhasil disimpan.", result);
  } catch (err) {
    next(err);
  }
};

const findOutboundQueue = async (req, res, next) => {
  try {
    const result = await suratJalanService.findOutboundQueue(req.query);
    return response.success(res, "Daftar pengajuan outbound berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findInboundList = async (req, res, next) => {
  try {
    const result = await suratJalanService.findInboundList(req.query);
    return response.success(res, "Daftar inbound yang menunggu approval berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findVerificationQueue = async (req, res, next) => {
  try {
    const result = await suratJalanService.findVerificationQueue(req.query);
    return response.success(res, "Daftar verifikasi surat jalan berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findOutboundForApproval = async (req, res, next) => {
  try {
    const result = await suratJalanService.findOutboundForApproval(req.query);
    return response.success(res, "Daftar outbound untuk approval (status Menunggu Approval) berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findOutboundForDelivery = async (req, res, next) => {
  try {
    const result = await suratJalanService.findOutboundForDelivery(req.query);
    return response.success(res, "Daftar outbound untuk delivery tracking (Approved / Dalam Pengiriman / Selesai) berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findStaffHistory = async (req, res, next) => {
  try {
    const result = await suratJalanService.findStaffHistory(req.user.id, req.query);
    return response.success(res, "Riwayat aktivitas staf berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findOutboundApprovalHistory = async (req, res, next) => {
  try {
    const result = await suratJalanService.findOutboundApprovalHistory(req.query);
    return response.success(res, "Daftar riwayat approval outbound berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findRejectedList = async (req, res, next) => {
  try {
    const result = await suratJalanService.findRejectedList(req.query);
    return response.success(res, "Daftar surat jalan yang ditolak berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findById = async (req, res, next) => {
  try {
    const result = await suratJalanService.findById(req.params.id, req.user, req.gudangScope);
    return response.success(res, "Detail Surat Jalan berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findOutboundDetail = async (req, res, next) => {
  try {
    const result = await suratJalanService.findOutboundDetail(req.params.id, req.user, req.gudangScope);
    return response.success(res, "Detail Surat Jalan Outbound berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const approveInbound = async (req, res, next) => {
  try {
    const result = await suratJalanService.approveInbound(req.params.id, req.body.itemAdjustments, req.user.id);
    return response.success(res, "Inbound berhasil diverifikasi dan siap untuk putaway.", result);
  } catch (err) {
    next(err);
  }
};

const approveOutbound = async (req, res, next) => {
  try {
    const result = await suratJalanService.approveOutbound(req.params.id, req.user.id);
    return response.success(res, "Outbound berhasil disetujui.", result);
  } catch (err) {
    next(err);
  }
};

const confirmDistributed = async (req, res, next) => {
  try {
    const result = await suratJalanService.confirmDistributed(req.params.id, req.user.id);
    return response.success(res, "Surat Jalan berhasil ditandai sebagai diterima/didistribusikan.", result);
  } catch (err) {
    next(err);
  }
};

const rejectInbound = async (req, res, next) => {
  try {
    const result = await suratJalanService.rejectInbound(req.params.id, req.body.catatan, req.user.id);
    return response.success(res, "Inbound berhasil ditolak.", result);
  } catch (err) {
    next(err);
  }
};

const rejectOutbound = async (req, res, next) => {
  try {
    const result = await suratJalanService.rejectOutbound(req.params.id, req.body.catatan, req.user.id);
    return response.success(res, "Outbound berhasil ditolak.", result);
  } catch (err) {
    next(err);
  }
};

const cancelDraft = async (req, res, next) => {
  try {
    const result = await suratJalanService.cancelDraft(req.params.id, req.body.catatan, req.user.id);
    return response.success(res, "Draft surat jalan berhasil dibatalkan.", result);
  } catch (err) {
    next(err);
  }
};

const putaway = async (req, res, next) => {
  try {
    const { tahap, items } = req.body;

    if (tahap === 1 || tahap === "1") {
      return response.success(res, "Pengecekan fisik berhasil divalidasi. Lanjutkan ke pemilihan zona.", { items });
    }

    const normalizedItems = items.map((item) => ({
      ...item,
      zona_id: item.zona_id,
      qty_ditempatkan: item.qty_ditempatkan || item.qty,
    }));

    const result = await suratJalanService.putaway(req.params.id, normalizedItems, req.user.id, req.gudangScope);
    return response.success(res, "Putaway berhasil diproses.", result);
  } catch (err) {
    next(err);
  }
};

const retrieve = async (req, res, next) => {
  try {
    const result = await suratJalanService.retrieve(req.params.id, req.body.items, req.user.id, req.gudangScope);
    return response.success(res, "Retrieval berhasil diproses.", result);
  } catch (err) {
    next(err);
  }
};

const updateDeliveryStatus = async (req, res, next) => {
  try {
    const result = await suratJalanService.updateDeliveryStatus(req.params.id, req.body, req.user.id, req.gudangScope);
    return response.success(res, "Status distribusi berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

// Gudang Transit — aksi staf gudang dari halaman staff.
const tibaDiTransit = async (req, res, next) => {
  try {
    const result = await suratJalanService.tibaDiTransit(req.params.id, req.body, req.user.id, req.gudangScope);
    return response.success(res, "Barang berhasil dititipkan di Gudang Transit.", result);
  } catch (err) {
    next(err);
  }
};

const lanjutDariTransit = async (req, res, next) => {
  try {
    const result = await suratJalanService.lanjutDariTransit(req.params.id, req.body, req.user.id, req.gudangScope);
    return response.success(res, "Perjalanan dilanjutkan dari Gudang Transit.", result);
  } catch (err) {
    next(err);
  }
};

const addItemFoto = async (req, res, next) => {
  try {
    const result = await suratJalanService.addItemFoto(req.params.id, req.params.itemId, req.body, req.user.id, req.gudangScope);
    return response.success(res, "Foto berhasil diunggah.", result, 201);
  } catch (err) {
    next(err);
  }
};

const deleteItemFoto = async (req, res, next) => {
  try {
    const result = await suratJalanService.deleteItemFoto(req.params.id, req.params.itemId, req.params.fotoId, req.user.id, req.gudangScope);
    return response.success(res, "Foto berhasil dihapus.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  createStaffInbound,
  receiveInbound,
  findOutboundQueue,
  findInboundList,
  findById,
  findOutboundDetail,
  findVerificationQueue,
  findOutboundForApproval,
  findOutboundForDelivery,
  approveInbound,
  approveOutbound,
  confirmDistributed,
  rejectInbound,
  rejectOutbound,
  cancelDraft,
  putaway,
  retrieve,
  updateDeliveryStatus,
  tibaDiTransit,
  lanjutDariTransit,
  addItemFoto,
  deleteItemFoto,
  findOutboundApprovalHistory,
  findStaffHistory,
  findRejectedList,
};
