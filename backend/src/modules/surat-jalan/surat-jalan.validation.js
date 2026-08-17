const { z } = require("zod");

const createSuratJalanSchema = z.object({
  tipe: z.enum(["inbound", "outbound"]),
  nomor_surat_jalan: z.string().min(1, "Nomor Surat Jalan wajib diisi."),
  gudang_asal_id: z.string().optional().nullable(),
  gudang_tujuan_id: z.string().optional().nullable(),
  kendaraan_id: z.string().optional().nullable(),
  personil_pengantar_id: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  kategori_approval: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  nomor_tiket: z.string().optional().nullable(),
  tanggal: z.string().optional().nullable(),
  surat_jalan_url: z.string().url("URL surat jalan tidak valid.").optional().nullable(),
  items: z.array(
    z.object({
      barang_id: z.string().min(1, "Barang wajib diisi."),
      qty: z.number().positive("Qty harus lebih dari 0."),
      satuan_id: z.string().min(1, "Satuan wajib diisi."),
      kondisi: z.string().optional().nullable(),
      serial_number: z.string().optional().nullable(),
      foto_url: z.string().optional().nullable(),
      is_kelebihan: z.boolean().optional().default(false),
      catatan: z.string().optional().nullable(),
      bin_lokasi_id: z.string().optional().nullable(),
    })
  ).min(1, "Minimal satu item harus diisi."),
});

const receiveInboundSchema = z.object({
  items: z.array(
    z.object({
      item_id: z.coerce.number(),
      qty: z.number().nonnegative("Qty tidak boleh negatif.").optional(),
      kondisi: z.string().optional().nullable(),
      serial_number: z.string().optional().nullable(),
      catatan: z.string().max(500).optional().nullable(),
    })
  ).min(1, "Minimal satu item harus diupdate."),
});

const approveInboundSchema = z.object({
  itemAdjustments: z
    .array(
      z.object({
        item_id: z.coerce.number(),
        wajar: z.boolean().optional(),
        catatan: z.string().max(500).optional().nullable(),
      })
    )
    .optional(),
});

const rejectInboundSchema = z.object({
  catatan: z.string().max(500).optional().nullable(),
});

const rejectOutboundSchema = z.object({
  catatan: z.string().max(500).optional().nullable(),
});

const putawaySchema = z.object({
  items: z.array(
    z.object({
      item_id: z.coerce.number(),
      bin_lokasi_id: z.coerce.number().positive("Bin lokasi wajib diisi."),
      qty: z.number().positive("Qty harus lebih dari 0."),
    })
  ).min(1, "Minimal satu item harus di-putaway."),
});

const retrieveSchema = z.object({
  items: z.array(
    z.object({
      item_id: z.coerce.number(),
      bin_lokasi_id: z.coerce.number().positive("Bin lokasi wajib diisi."),
      qty: z.number().positive("Qty harus lebih dari 0."),
    })
  ).min(1, "Minimal satu item harus di-retrieve."),
});

module.exports = {
  createSuratJalanSchema,
  receiveInboundSchema,
  approveInboundSchema,
  rejectInboundSchema,
  rejectOutboundSchema,
  putawaySchema,
  retrieveSchema,
};
