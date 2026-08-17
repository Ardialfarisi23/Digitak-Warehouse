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
    const result = await suratJalanService.receiveInbound(req.params.id, req.body.items, req.user.id);
    return response.success(res, "Penerimaan inbound berhasil disimpan.", result);
  } catch (err) {
    next(err);
  }
};

const findOutboundQueue = async (req, res, next) => {
  try {
    const result = await suratJalanService.findOutboundQueue();
    return response.success(res, "Daftar pengajuan outbound berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findInboundList = async (req, res, next) => {
  try {
    const result = await suratJalanService.findInboundList();
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

const findById = async (req, res, next) => {
  try {
    const result = await suratJalanService.findById(req.params.id);
    return response.success(res, "Detail Surat Jalan berhasil diambil.", result);
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

const putaway = async (req, res, next) => {
  try {
    const result = await suratJalanService.putaway(req.params.id, req.body.items, req.user.id);
    return response.success(res, "Putaway berhasil diproses.", result);
  } catch (err) {
    next(err);
  }
};

const retrieve = async (req, res, next) => {
  try {
    const result = await suratJalanService.retrieve(req.params.id, req.body.items, req.user.id);
    return response.success(res, "Retrieval berhasil diproses.", result);
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
  findVerificationQueue,
  findOutboundForApproval,
  findOutboundForDelivery,
  approveInbound,
  approveOutbound,
  confirmDistributed,
  rejectInbound,
  rejectOutbound,
  putaway,
  retrieve,
};
