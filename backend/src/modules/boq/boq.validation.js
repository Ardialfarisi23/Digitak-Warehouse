const { z } = require("zod");

const boqItemSchema = z.object({
  itemCode: z.string().min(1, "Kode perangkat wajib diisi."),
  itemName: z.string().min(1, "Nama barang wajib diisi."),
  quantity: z.number().positive("Qty harus lebih dari 0."),
  unit: z.string().optional().nullable(),
  destinationWarehouseId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const normalizeStatus = (val) => {
  if (!val) return undefined;
  const map = { DRAFT: "DRAFT", AKTIF: "AKTIF", DITOLAK: "DITOLAK", draft: "DRAFT", aktif: "AKTIF", ditolak: "DITOLAK" };
  return map[val.toUpperCase()] || map[val] || val;
};

const normalizeSource = (val) => {
  if (!val) return undefined;
  const map = { TOP_DOWN: "TOP_DOWN", BOTTOM_UP: "BOTTOM_UP", EMAIL_PO: "TOP_DOWN", SUPERVISOR_REQUEST: "BOTTOM_UP", top_down: "TOP_DOWN", bottom_up: "BOTTOM_UP" };
  return map[val.toUpperCase()] || map[val] || val;
};

const normalizeVerification = (val) => {
  if (!val) return undefined;
  const map = { TERVERIFIKASI: "TERVERIFIKASI", MENUNGGU: "MENUNGGU", VERIFIED: "TERVERIFIKASI", PENDING: "MENUNGGU", terverifikasi: "TERVERIFIKASI", menunggu: "MENUNGGU", tidak_berlaku: "TIDAK_BERLAKU" };
  return map[val.toUpperCase()] || map[val] || val;
};

const createBoqSchema = z.object({
  projectId: z.string().min(1, "Project wajib dipilih."),
  area: z.string().min(1, "Area wajib diisi."),
  ticketNumber: z.string().min(1, "Kode tiket wajib diisi."),
  status: z.enum(["DRAFT", "AKTIF", "DITOLAK"]).optional().default("DRAFT"),
  source: z.enum(["TOP_DOWN", "BOTTOM_UP", "EMAIL_PO", "SUPERVISOR_REQUEST"]).optional().default("TOP_DOWN"),
  externalVerificationStatus: z.enum(["TERVERIFIKASI", "MENUNGGU", "VERIFIED", "PENDING"]).optional().default("MENUNGGU"),
  notes: z.string().optional().nullable(),
  referenceFile: z.string().optional().nullable(),
  items: z.array(boqItemSchema).min(1, "Minimal satu item harus diisi."),
});

const updateBoqSchema = z.object({
  projectId: z.string().optional().nullable(),
  area: z.string().optional().nullable(),
  ticketNumber: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "AKTIF", "DITOLAK", "draft", "aktif", "ditolak"]).optional().nullable(),
  source: z.enum(["TOP_DOWN", "BOTTOM_UP", "EMAIL_PO", "SUPERVISOR_REQUEST", "top_down", "bottom_up"]).optional().nullable(),
  externalVerificationStatus: z.enum(["TERVERIFIKASI", "MENUNGGU", "VERIFIED", "PENDING", "terverifikasi", "menunggu", "tidak_berlaku"]).optional().nullable(),
  notes: z.string().optional().nullable(),
  referenceFile: z.string().optional().nullable(),
  items: z.array(boqItemSchema).optional().nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

const updateBoqStatusSchema = z.object({
  status: z.enum(["DRAFT", "AKTIF", "DITOLAK", "draft", "aktif", "ditolak"]),
});

module.exports = {
  createBoqSchema,
  updateBoqSchema,
  updateBoqStatusSchema,
};
