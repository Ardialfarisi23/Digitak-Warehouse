const { z } = require("zod");

const createSuratJalanSchema = z
  .object({
    tipe: z.enum(["inbound", "outbound"]),
    nomor_surat_jalan: z.string().optional().nullable(),
    gudang_asal_id: z.string().optional().nullable(),
    gudang_tujuan_id: z.string().optional().nullable(),
    kendaraan_id: z.string().optional().nullable(),
    personil_pengantar_id: z.string().optional().nullable(),
    project_id: z.string().optional().nullable(),
    boq_id: z.string().optional().nullable(),
    kategori_approval: z.string().optional().nullable(),
    pic_pemohon_nama: z.string().optional().nullable(),
    nomor_tiket: z.string().optional().nullable(),
    tanggal: z.string().optional().nullable(),
    surat_jalan_url: z.string().url("URL surat jalan tidak valid.").optional().nullable(),
    tujuan_tipe: z.enum(["lapangan", "gudang"]).optional().nullable(),
    titik_lapangan_id: z.string().optional().nullable(),
    alamat_lapangan: z.string().optional().nullable(),
    tipe_pengirim: z.enum(["internal", "external"]).optional().nullable(),
    pengirim_eksternal_nama: z.string().optional().nullable(),
    supplier_id: z.string().optional().nullable(),
    items: z
      .array(
        z.object({
          barang_id: z.string().min(1, "Barang wajib diisi."),
          qty: z.number().positive("Qty harus lebih dari 0."),
          satuan_id: z.string().min(1, "Satuan wajib diisi."),
          kondisi: z.string().optional().nullable(),
          serial_number: z.string().optional().nullable(),
          foto_url: z.string().optional().nullable(),
          is_kelebihan: z.boolean().optional().default(false),
          is_di_luar_boq: z.boolean().optional().default(false),
          catatan: z.string().optional().nullable(),
          zona_id: z.coerce.number().positive().nullable().optional(),
        }),
      )
      .min(1, "Minimal satu item harus diisi."),
  })
  .superRefine((data, ctx) => {
    if (data.tujuan_tipe === "lapangan") {
      if (!data.alamat_lapangan || data.alamat_lapangan.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "alamat_lapangan wajib diisi jika tujuan_tipe adalah lapangan.",
          path: ["alamat_lapangan"],
        });
      }
    }

    if (data.tujuan_tipe === "gudang") {
      if (!data.gudang_tujuan_id || data.gudang_tujuan_id === "" || data.gudang_tujuan_id === "0") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "gudang_tujuan_id wajib diisi jika tujuan_tipe adalah gudang.",
          path: ["gudang_tujuan_id"],
        });
      }
    }

    if (data.tipe === "outbound" || data.tipe === "inbound") {
      if (data.tipe_pengirim === "external") {
        if (!data.supplier_id && (!data.pengirim_eksternal_nama || data.pengirim_eksternal_nama.trim() === "")) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Pilih supplier atau isi nama vendor eksternal jika tipe pengirim adalah external.",
            path: ["supplier_id"],
          });
        }
      }

      if (data.tipe_pengirim === "internal") {
        if (!data.gudang_asal_id || data.gudang_asal_id === "" || data.gudang_asal_id === "0") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "gudang_asal_id wajib diisi jika tipe_pengirim adalah internal.",
            path: ["gudang_asal_id"],
          });
        }
      }
    }
  });

const receiveInboundSchema = z.object({
  items: z
    .array(
      z.object({
        item_id: z.coerce.number(),
        qty: z.coerce.number().nonnegative("Qty tidak boleh negatif.").optional(),
        kondisi: z.string().optional().nullable(),
        serial_number: z.string().optional().nullable(),
        catatan: z.string().max(500).optional().nullable(),
        zona_id: z.preprocess((val) => (val === null || val === undefined || val === "" || val === 0 ? null : Number(val)), z.number().positive().nullable().optional()),
      }),
    )
    .min(1, "Minimal satu item harus diupdate."),
});

const approveInboundSchema = z.object({
  itemAdjustments: z
    .array(
      z.object({
        item_id: z.coerce.number(),
        wajar: z.boolean().optional(),
        catatan: z.string().max(500).optional().nullable(),
      }),
    )
    .optional(),
});

const rejectInboundSchema = z.object({
  catatan: z.string().max(500).optional().nullable(),
});

const rejectOutboundSchema = z.object({
  catatan: z.string().max(500).optional().nullable(),
});

const putawaySchema = z
  .object({
    tahap: z.coerce.number().optional().default(2),
    items: z
      .array(
        z.object({
          item_id: z.coerce.number(),
          // Tahap 1 fields
          qty_fisik: z.number().nonnegative().optional(),
          status_kesesuaian: z.string().optional(),
          // Tahap 2 fields
          zona_id: z.coerce.number().positive("Zona wajib diisi."),
          qty_ditempatkan: z.coerce.number().positive("Qty harus lebih dari 0."),
          qty: z.coerce.number().positive().optional(),
        }),
      )
      .min(1, "Minimal satu item harus di-putaway."),
  })
  .superRefine((data, ctx) => {
    const isTahap1 = data.tahap === 1;

    data.items.forEach((item, index) => {
      if (isTahap1) {
        if (item.qty_fisik === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "qty_fisik wajib diisi pada Tahap 1.",
            path: ["items", index, "qty_fisik"],
          });
        }
        if (!item.status_kesesuaian) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "status_kesesuaian wajib diisi pada Tahap 1.",
            path: ["items", index, "status_kesesuaian"],
          });
        }
      } else {
        const hasZona = item.zona_id > 0;
        const hasQty = item.qty_ditempatkan !== undefined && item.qty_ditempatkan > 0;

        if (!hasZona) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "zona_id wajib diisi pada Tahap 2.",
            path: ["items", index, "zona_id"],
          });
        }
        if (!hasQty) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "qty_ditempatkan wajib diisi pada Tahap 2.",
            path: ["items", index, "qty_ditempatkan"],
          });
        }
      }
    });
  });

const retrieveSchema = z.object({
  items: z
    .array(
      z.object({
        item_id: z.coerce.number(),
        zona_id: z.coerce.number().positive("Zona wajib diisi."),
        qty: z.coerce.number().positive("Qty harus lebih dari 0."),
      }),
    )
    .min(1, "Minimal satu item harus di-retrieve."),
});

const deliveryStatusSchema = z.object({
  status: z.enum(["sedang_dikirim", "diterima_didistribusikan"]),
  estimasi_tiba: z.string().optional().nullable(),
  catatan_distribusi: z.string().optional().nullable(),
});

const itemFotoSchema = z.object({
  url: z.string().url("URL foto tidak valid."),
  filename: z.string().optional().nullable(),
  mimetype: z.string().optional().nullable(),
  ukuran_bytes: z.coerce.number().positive().optional().nullable(),
});

module.exports = {
  createSuratJalanSchema,
  receiveInboundSchema,
  approveInboundSchema,
  rejectInboundSchema,
  rejectOutboundSchema,
  putawaySchema,
  retrieveSchema,
  deliveryStatusSchema,
  itemFotoSchema,
};
