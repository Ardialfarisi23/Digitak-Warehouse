const { z } = require("zod");

const createSuratJalanSchema = z
  .object({
    tipe: z.enum(["inbound", "outbound"]),
    nomor_surat_jalan: z.string().optional().nullable(),
    gudang_asal_id: z.string().optional().nullable(),
    gudang_tujuan_id: z.string().optional().nullable(),
    kendaraan_id: z.string().optional().nullable(),
    personil_pengantar_id: z.string().optional().nullable(),
    // Free text (inbound). Kalau kosong, reader fallback ke relasi di atas.
    kendaraan_nama_teks: z.string().trim().max(200, "Nama kendaraan maksimal 200 karakter.").optional().nullable(),
    kendaraan_jenis_teks: z.string().trim().max(100, "Jenis kendaraan maksimal 100 karakter.").optional().nullable(),
    kendaraan_no_polisi_teks: z.string().trim().max(50, "Nomor polisi maksimal 50 karakter.").optional().nullable(),
    driver_nama_teks: z.string().trim().max(200, "Nama driver maksimal 200 karakter.").optional().nullable(),
    project_id: z.string().optional().nullable(),
    boq_id: z.string().optional().nullable(),
    cluster_id: z.string().optional().nullable(),
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
          // Item "non-master" (barang di luar master data) tidak punya barang_id.
          // Backend membuat record barang baru dari nama_barang_teks + kategori_id.
          barang_id: z.string().optional().nullable(),
          nama_barang_teks: z.string().trim().max(150, "Nama barang maksimal 150 karakter.").optional().nullable(),
          kategori_id: z.string().optional().nullable(),
          is_non_master: z.boolean().optional().default(false),
          qty: z.number().positive("Qty harus lebih dari 0."),
          qty_diterima: z.coerce.number().nonnegative("Qty aktual tidak boleh negatif.").optional().nullable(),
          satuan_id: z.string().min(1, "Satuan wajib diisi."),
          kondisi: z.string().optional().nullable(),
          kondisi_diterima: z.string().optional().nullable(),
          serial_number: z.string().optional().nullable(),
          foto_url: z.string().optional().nullable(),
          is_kelebihan: z.boolean().optional().default(false),
          is_di_luar_boq: z.boolean().optional().default(false),
          catatan: z.string().optional().nullable(),
          catatan_penerimaan: z.string().optional().nullable(),
          zona_id: z.coerce.number().positive().nullable().optional(),
        }),
      )
      .min(1, "Minimal satu item harus diisi.")
      .superRefine((items, ctx) => {
        items.forEach((item, index) => {
          if (item.is_non_master) {
            if (!item.nama_barang_teks || item.nama_barang_teks.trim() === "") {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Nama barang wajib diisi untuk barang non-master.",
                path: [index, "nama_barang_teks"],
              });
            }
            if (!item.kategori_id || item.kategori_id === "") {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Kategori wajib diisi untuk barang non-master.",
                path: [index, "kategori_id"],
              });
            }
            return;
          }

          if (!item.barang_id || item.barang_id === "") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Barang wajib diisi.",
              path: [index, "barang_id"],
            });
          }
        });
      }),
  })
  .superRefine((data, ctx) => {
    if (data.tujuan_tipe === "lapangan") {
      const hasTitik = !!data.titik_lapangan_id && data.titik_lapangan_id !== "" && data.titik_lapangan_id !== "0";
      const hasAlamat = !!data.alamat_lapangan && data.alamat_lapangan.trim() !== "";
      if (!hasTitik && !hasAlamat) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pilih titik lapangan atau isi alamat lapangan.",
          path: ["titik_lapangan_id"],
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

    // Kendaraan + driver inbound diisi bebas (bisa kendaraan/supir vendor eksternal
    // yang tidak ada di master data), jadi wajib lewat kolom teks -- bukan lewat
    // relasi master data.
    //
    // KHUSUS inbound. Outbound tetap memakai kendaraan_id / personil_pengantar_id
    // dari master data dan tidak boleh ikut tervalidasi oleh blok ini.
    if (data.tipe === "inbound") {
      const wajibTeks = [
        ["kendaraan_nama_teks", "Nama kendaraan wajib diisi."],
        ["kendaraan_no_polisi_teks", "Nomor polisi wajib diisi."],
        ["driver_nama_teks", "Nama driver wajib diisi."],
      ];

      for (const [field, message] of wajibTeks) {
        const value = data[field];
        if (!value || value.trim() === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message,
            path: [field],
          });
        }
      }
    }

    if (data.tipe === "outbound") {
      const hasMasterKendaraan = !!data.kendaraan_id && data.kendaraan_id !== "" && data.kendaraan_id !== "0";

      if (hasMasterKendaraan) {
      } else {
        const nama = (data.kendaraan_nama_teks || "").trim();
        const jenis = (data.kendaraan_jenis_teks || "").trim();
        const nopol = (data.kendaraan_no_polisi_teks || "").trim();
        const hasAnyManual = nama !== "" || jenis !== "" || nopol !== "";

        if (hasAnyManual) {
          if (!nama) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Nama kendaraan, jenis kendaraan, dan nomor polisi wajib diisi semua untuk input manual.",
              path: ["kendaraan_nama_teks"],
            });
          }
          if (!jenis) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Nama kendaraan, jenis kendaraan, dan nomor polisi wajib diisi semua untuk input manual.",
              path: ["kendaraan_jenis_teks"],
            });
          }
          if (!nopol) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Nama kendaraan, jenis kendaraan, dan nomor polisi wajib diisi semua untuk input manual.",
              path: ["kendaraan_no_polisi_teks"],
            });
          }
        }
      }

      const hasMasterDriver = !!data.personil_pengantar_id && data.personil_pengantar_id !== "" && data.personil_pengantar_id !== "0";
      const driverTeks = (data.driver_nama_teks || "").trim();

      if (!hasMasterDriver && driverTeks !== "") {
        if (driverTeks === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Nama driver wajib diisi untuk input manual driver.",
            path: ["driver_nama_teks"],
          });
        }
      }
    }
  });

const KONDISI_ENUM = z.enum(["baik", "rusak_ringan", "rusak_berat", "tidak_sesuai_spek", "doa"]);

const receiveInboundSchema = z.object({
  items: z
    .array(
      z
        .object({
          item_id: z.coerce.number(),
          qty: z.coerce.number().nonnegative("Qty tidak boleh negatif.").optional(),
          qty_diterima: z.coerce.number().nonnegative("Qty diterima tidak boleh negatif.").optional(),
          qty_ditolak: z.coerce.number().nonnegative("Qty ditolak tidak boleh negatif.").optional(),
          alasan_penolakan: z.string().max(500).optional().nullable(),
          kondisi: z.string().optional().nullable(),
          serial_number: z.string().optional().nullable(),
          catatan: z.string().max(500).optional().nullable(),
          zona_id: z.preprocess((val) => (val === null || val === undefined || val === "" || val === 0 ? null : Number(val)), z.number().positive().nullable().optional()),
          // Penilaian kondisi per unit. Wajib lengkap (1..qty) bila dikirim.
          units: z
            .array(
              z.object({
                nomor_unit: z.coerce.number().int().positive("Nomor unit harus berupa angka bulat positif."),
                kondisi: KONDISI_ENUM,
                catatan: z.string().max(500).optional().nullable(),
              }),
            )
            .optional()
            .nullable(),
        })
        .superRefine((item, ctx) => {
          if (!item.units || item.units.length === 0) return;

          const qty = Number(item.qty);
          if (!Number.isFinite(qty) || qty <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Qty item harus diisi sebelum assessing kondisi per unit.",
              path: ["qty"],
            });
            return;
          }

          const totalUnit = Math.floor(qty);
          if (item.units.length !== totalUnit) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Jumlah unit yang dinilai (${item.units.length}) harus sama dengan qty diterima (${totalUnit}).`,
              path: ["units"],
            });
          }

          const seen = new Set();
          for (const unit of item.units) {
            if (seen.has(unit.nomor_unit)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Nomor unit ${unit.nomor_unit} duplikat.`,
                path: ["units"],
              });
            }
            seen.add(unit.nomor_unit);

            if (unit.nomor_unit < 1 || unit.nomor_unit > totalUnit) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Nomor unit ${unit.nomor_unit} harus antara 1 sampai ${totalUnit}.`,
                path: ["units"],
              });
            }
          }
        }),
    )
    .min(1, "Minimal satu item harus diupdate."),
});

const rejectOutboundSchema = z.object({
  catatan: z.string().max(500).optional().nullable(),
});

const cancelDraftSchema = z.object({
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
        kondisi: z.string().optional().nullable(),
        catatan_kondisi: z.string().optional().nullable(),
      }),
    )
    .min(1, "Minimal satu item harus di-retrieve."),
});

const deliveryStatusSchema = z.object({
  status: z.enum(["sedang_dikirim", "tiba_menunggu_konfirmasi", "diterima_didistribusikan"]),
  estimasi_tiba: z.string().optional().nullable(),
  catatan_distribusi: z.string().optional().nullable(),
  catatan_tiba: z.string().optional().nullable(),
  bukti_tiba_url: z.string().url("URL bukti tidak valid.").optional().nullable(),
  items: z
    .array(
      z.object({
        item_id: z.coerce.number(),
        qty_diterima: z.coerce.number().nonnegative("Qty diterima harus >= 0."),
        kondisi_diterima: z.string().optional().nullable(),
        catatan_penerimaan: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

const itemFotoSchema = z.object({
  url: z.string().url("URL foto tidak valid."),
  filename: z.string().optional().nullable(),
  mimetype: z.string().optional().nullable(),
  ukuran_bytes: z.coerce.number().positive().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Gudang Transit (gudang bertipe dadakan).
// Checkpoint pertama — staf menitipkan barang di Gudang Transit.
// Bisa dipanggil berulang (0..n) selama status masih "sedang_dikirim".
// Qty boleh sebagian; kalau ada penilaian per unit, jumlahnya harus sama qty.
// ---------------------------------------------------------------------------
const tibaTransitSchema = z.object({
  gudang_id: z.coerce.number().positive("Gudang Transit wajib dipilih."),
  catatan_tiba: z.string().trim().max(500).optional().nullable(),
  bukti_url: z.string().url("URL bukti tidak valid.").optional().nullable(),
  items: z
    .array(
      z.object({
        item_id: z.coerce.number().positive(),
        qty: z.number().positive("Qty dititipkan harus lebih dari 0."),
        kondisi: z.string().optional().nullable(),
        catatan: z.string().trim().max(500).optional().nullable(),
        units: z
          .array(
            z.object({
              nomor_unit: z.coerce.number().int().positive(),
              kondisi: KONDISI_ENUM,
              catatan: z.string().trim().max(500).optional().nullable(),
            }),
          )
          .optional()
          .nullable(),
      }),
    )
    .min(1, "Minimal satu barang harus dititipkan."),
  })
  .superRefine((data, ctx) => {
    const dipakai = new Set();
    data.items.forEach((item, index) => {
      if (dipakai.has(item.item_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Barang yang dititipkan tidak boleh dobel pada satu checkpoint.",
          path: ["items", index, "item_id"],
        });
      }
      dipakai.add(item.item_id);

      const units = item.units || [];
      if (units.length === 0) return;

      const totalUnit = Math.floor(item.qty);
      if (units.length !== totalUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Jumlah unit yang dinilai (${units.length}) harus sama dengan qty dititipkan (${totalUnit}).`,
          path: ["items", index, "units"],
        });
        return;
      }

      const nomorDipakai = new Set();
      units.forEach((unit, unitIndex) => {
        if (nomorDipakai.has(unit.nomor_unit)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Nomor unit ${unit.nomor_unit} duplikat.`,
            path: ["items", index, "units", unitIndex, "nomor_unit"],
          });
        }
        nomorDipakai.add(unit.nomor_unit);

        if (unit.nomor_unit < 1 || unit.nomor_unit > totalUnit) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Nomor unit ${unit.nomor_unit} harus antara 1 sampai ${totalUnit}.`,
            path: ["items", index, "units", unitIndex, "nomor_unit"],
          });
        }
      });
    });
  });

// Checkpoint keberangkatan dari Gudang Transit ke tujuan akhir (leg penuh).
// Qty tidak dikirim: backend mengambil sisa titipan yang masih tercatat terbuka.
const lanjutDariTransitSchema = z.object({
  catatan_berangkat: z.string().trim().max(500).optional().nullable(),
});

module.exports = {
  createSuratJalanSchema,
  receiveInboundSchema,
  rejectOutboundSchema,
  cancelDraftSchema,
  putawaySchema,
  retrieveSchema,
  deliveryStatusSchema,
  itemFotoSchema,
  tibaTransitSchema,
  lanjutDariTransitSchema,
};
