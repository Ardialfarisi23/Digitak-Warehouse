const prisma = require("../../config/prisma");
const AppError = require("../../shared/errors");
const capacityService = require("../capacity/capacity.service");

const baseInclude = {
  items: {
    include: {
      // baseInclude TIDAK diubah — tetap dipakai inbound/verifikasi
      fotos: true,
      units: {
        orderBy: {
          nomor_unit: "asc",
        },
      },
      zona: {
        select: {
          zona_id: true,
          kode_zona: true,
          nama_zona: true,
          tipe_zona: true,
          gudang: {
            select: {
              nama_gudang: true,
            },
          },
        },
      },
      barang: {
        include: {
          satuan_default: true,
          kategori: {
            select: {
              kategori_id: true,
              nama_kategori: true,
              is_kritis: true,
            },
          },
        },
      },
      satuan: {
        select: {
          satuan_id: true,
          kode_satuan: true,
        },
      },
    },
  },
  boq: {
    include: {
      tiket: true,
      cluster: {
        select: {
          cluster_id: true,
          nama_cluster: true,
        },
      },
      items: {
        include: {
          barang: {
            include: {
              satuan_default: true,
              kategori: {
                select: {
                  kategori_id: true,
                  nama_kategori: true,
                  is_kritis: true,
                },
              },
            },
          },
          satuan: {
            select: {
              satuan_id: true,
              kode_satuan: true,
            },
          },
        },
      },
    },
  },
  gudang_asal: true,
  gudang_tujuan: true,
  kendaraan: true,
  personil_pengantar: true,
  project: true,
  creator: true,
  titik_lapangan: true,
  supplier: true,
  dilaporkan_tiba: {
    select: {
      user_id: true,
      nama: true,
    },
  },
  dikonfirmasi_tiba: {
    select: {
      user_id: true,
      nama: true,
    },
  },
};

const findByIdInclude = {
  ...baseInclude,
  personil_pengantar: {
    select: {
      personil_id: true,
      nama: true,
      jenis: true,
      no_hp: true,
    },
  },
  items: {
    ...baseInclude.items,
    include: {
      ...baseInclude.items.include,
      picks: {
        select: {
          pick_id: true,
          gudang_id: true,
          zona_id: true,
          kondisi_diminta: true,
          kondisi_diambil: true,
          qty: true,
          is_override: true,
          catatan_override: true,
          picked_by: true,
          picked_at: true,
        },
      },
      diperiksa_oleh_user: {
        select: {
          user_id: true,
          nama: true,
        },
      },
    },
  },
};

const stokKritisConfig = require("../../config/stok-kritis.config");

const outboundInclude = {
  ...baseInclude,
  items: {
    ...baseInclude.items,
    include: {
      ...baseInclude.items.include,
      diperiksa_oleh_user: {
        select: {
          user_id: true,
          nama: true,
        },
      },
      barang: {
        ...baseInclude.items.include.barang,
        include: {
          ...baseInclude.items.include.barang.include,
          stok_gudangs: {
            select: {
              qty: true,
              gudang_id: true,
              zona_id: true,
              kondisi: true,
            },
          },
        },
      },
    },
  },
};

const modalListInclude = {
  ...baseInclude,
  items: {
    ...baseInclude.items,
    include: {
      ...baseInclude.items.include,
      diperiksa_oleh_user: {
        select: {
          user_id: true,
          nama: true,
        },
      },
    },
  },
};

const APPROVAL_STATUS = "draft_diajukan";
// Dipakai daftar pengiriman supervisor. `tiba_di_transit` ikut disertakan supaya
// Surat Jalan yang sedang dititipkan di Gudang Transit tidak hilang dari daftar
// itu (regresi visibilitas), tanpa mengubah keputusan approve/confirm siapapun.
const DELIVERY_STATUSES = [
  "disetujui",
  "sedang_dikirim",
  "tiba_di_transit",
  "tiba_menunggu_konfirmasi",
  "diterima_didistribusikan",
];

const parseIdFilter = (value, fieldName) => {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw || raw === "all") return null;
  if (!/^\d+$/.test(raw)) {
    throw new AppError(`Parameter "${fieldName}" harus berupa ID numerik.`, 400);
  }
  return BigInt(raw);
};

function applyListFilters(where, params = {}) {
  const { kategori_approval, search, startDate, endDate } = params;

  if (kategori_approval && kategori_approval !== "all") {
    where.kategori_approval = kategori_approval;
  }

  if (search) {
    where.OR = [
      { nomor_surat_jalan: { contains: search, mode: "insensitive" } },
      { boq: { boq_number: { contains: search, mode: "insensitive" } } },
      { boq: { tiket: { kode_tiket: { contains: search, mode: "insensitive" } } } },
    ];
  }

  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(startDate);
    if (endDate) where.created_at.lte = new Date(endDate);
  }

  return where;
}

function sanitizePagination(page, limit) {
  const sanitizedPage = Math.max(parseInt(page, 10) || 1, 1);
  const sanitizedLimit = Math.max(parseInt(limit, 10) || 10, 1);
  return { page: sanitizedPage, limit: sanitizedLimit };
}

const buildListMeta = (total, { page, limit }) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

// Fallback tampilan kendaraan & driver.
//
// Aturan: kolom free text (isi manual, mis. vendor eksternal) adalah sumber utama.
// Kalau kosong, turunkan dari relasi master data supaya record lama / outbound yang
// masih pakai dropdown tidak kehilangan informasi di PDF maupun halaman detail.
//
// Menghasilkan field turunan (bukan menimpa `kendaraan` / `personil_pengantar`) supaya
// konsumen lama yang membaca `record.kendaraan.no_polisi` tetap bekerja apa adanya.
function withKendaraanDriverFallback(record) {
  if (!record) return record;

  const namaKendaraan = (record.kendaraan_nama_teks || "").trim();
  const noPolisi = (record.kendaraan_no_polisi_teks || "").trim();
  const namaDriver = (record.driver_nama_teks || "").trim();

  const kendaraan = record.kendaraan;
  const personil = record.personil_pengantar;

  return {
    ...record,
    kendaraan_teks: namaKendaraan || null,
    no_polisi_teks: noPolisi || null,
    driver_teks: namaDriver || null,
    // Label siap pakai supaya frontend tidak perlu logika fallback berulang.
    kendaraan_label:
      [namaKendaraan || [kendaraan?.merk, kendaraan?.jenis_kendaraan].filter(Boolean).join(" - "), noPolisi || kendaraan?.no_polisi]
        .filter(Boolean)
        .join(" — ") || null,
    driver_label: namaDriver || personil?.nama || null,
  };
}

function withKendaraanDriverFallbackList(records) {
  return Array.isArray(records) ? records.map(withKendaraanDriverFallback) : records;
}

const create = async (data, actorId, tx = prisma) => {
  const count = await tx.surat_jalan.count();
  const year = new Date().getFullYear();
  const nomor = data.nomor_surat_jalan?.trim() || `001/SJ/${data.tipe.toUpperCase()}/DIGITAK/${String(year).slice(-2)}/${String(count + 1).padStart(3, "0")}`;

  const status = data.status || (data.tipe === "inbound" ? "menunggu_verifikasi" : "draft_diajukan");
  const tanggal = data.tanggal ? new Date(data.tanggal) : new Date();

  const suratJalan = await tx.surat_jalan.create({
    data: {
      nomor_surat_jalan: nomor,
      tipe: data.tipe,
      boq_id: data.boq_id || null,
      gudang_asal_id: data.gudang_asal_id ? Number(data.gudang_asal_id) : null,
      gudang_tujuan_id: data.gudang_tujuan_id ? Number(data.gudang_tujuan_id) : null,
      kendaraan_id: data.kendaraan_id ? Number(data.kendaraan_id) : null,
      personil_pengantar_id: data.personil_pengantar_id ? Number(data.personil_pengantar_id) : null,
      kendaraan_nama_teks: data.kendaraan_nama_teks || null,
      kendaraan_no_polisi_teks: data.kendaraan_no_polisi_teks || null,
      driver_nama_teks: data.driver_nama_teks || null,
      status: status,
      kategori_approval: data.kategori_approval || null,
      pic_pemohon_nama: data.pic_pemohon_nama || null,
      project_id: data.project_id ? Number(data.project_id) : null,
      surat_jalan_url: data.surat_jalan_url || null,
      tanggal: tanggal,
      created_by: Number(actorId),
      updated_by: Number(actorId),
      titik_lapangan_id: data.titik_lapangan_id ? Number(data.titik_lapangan_id) : null,
      tujuan_tipe: data.tujuan_tipe || null,
      alamat_lapangan: data.alamat_lapangan || null,
      tipe_pengirim: data.tipe_pengirim || null,
      pengirim_eksternal_nama: data.pengirim_eksternal_nama || null,
      supplier_id: data.supplier_id ? Number(data.supplier_id) : null,
      items: {
        create: data.items.map((item) => ({
          barang_id: Number(item.barang_id),
          qty: Number(item.qty),
          satuan_id: Number(item.satuan_id),
          kondisi: item.kondisi || null,
          serial_number: item.serial_number || null,
          foto_url: item.foto_url || null,
          is_kelebihan: Boolean(item.is_kelebihan),
          is_di_luar_boq: Boolean(item.is_di_luar_boq),
          catatan: item.catatan || null,
          zona_id: item.zona_id ? Number(item.zona_id) : null,
        })),
      },
    },
    include: baseInclude,
  });

  return suratJalan;
};

/**
 * Membuat record barang di master data untuk item inbound "non-master"
 * (barang di luar master data yang diinput staf lewat form).
 * kode_perangkat digenerate otomatis & dijamin unik.
 */
const createAdhocBarang = async ({ nama_barang, kategori_id, satuan_id, actorId, tx = prisma }) => {
  const baseName = String(nama_barang || "").trim().slice(0, 150) || "Barang Tanpa Nama";
  const kategoriId = Number(kategori_id);
  const satuanId = Number(satuan_id);
  const actor = BigInt(actorId);

  const attempts = 5;
  for (let i = 0; i < attempts; i += 1) {
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    const kode = `DI-LUAR-BOQ-${suffix}`;

    try {
      return await tx.barang.create({
        data: {
          kode_perangkat: kode,
          nama_barang: baseName,
          kategori_id: kategoriId,
          satuan_default_id: satuanId,
          wajib_sn: false,
          created_by: actor,
          updated_by: actor,
        },
      });
    } catch (err) {
      // Retry hanya kalau bentrok kode unik.
      if (err?.code === "P2002" && i < attempts - 1) continue;
      throw err;
    }
  }

  throw new AppError("Gagal membuat barang non-master. Silakan coba lagi.", 500);
};

const findOutboundQueue = async (filters = {}) => {
  const { gudangTujuanId, status, startDate, endDate, search } = filters;
  const where = { tipe: "outbound" };

  if (status && status !== "all") {
    where.status = status;
  }

  const andConditions = [];

  const gudangFilter = parseIdFilter(gudangTujuanId, "gudangTujuanId");
  if (gudangFilter !== null) {
    andConditions.push({
      OR: [
        { gudang_asal_id: gudangFilter },
        { gudang_tujuan_id: gudangFilter },
      ],
    });
  }

  if (startDate || endDate) {
    const dateCondition = {};
    if (startDate) dateCondition.gte = new Date(startDate);
    if (endDate) dateCondition.lte = new Date(endDate + "T23:59:59");
    andConditions.push({ tanggal: dateCondition });
  }

  if (search && search.trim()) {
    const s = search.trim();
    andConditions.push({
      OR: [
        { nomor_surat_jalan: { contains: s, mode: "insensitive" } },
        { project: { nama_project: { contains: s, mode: "insensitive" } } },
        { gudang_asal: { nama_gudang: { contains: s, mode: "insensitive" } } },
        { gudang_tujuan: { nama_gudang: { contains: s, mode: "insensitive" } } },
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const data = await prisma.surat_jalan.findMany({
    where,
    include: modalListInclude,
    orderBy: [{ updated_at: "desc" }],
  });

  const verifications = await getBatchApprovalVerifications(data.map((item) => Number(item.surat_jalan_id)));

  return withKendaraanDriverFallbackList(
    data.map((item) => ({
      ...item,
      approval_verification: verifications.get(String(item.surat_jalan_id)) || null,
    }))
  );
};

const findInboundList = async (filters = {}) => {
  const { gudangTujuanId, status, startDate, endDate, search } = filters;
  const where = { tipe: "inbound" };

  if (status && status !== "all") {
    where.status = status;
  } else {
    where.status = {
      in: ["draft_diajukan", "menunggu_verifikasi", "ready_putaway", "disetujui", "digenerate", "diterima_didistribusikan"],
    };
  }

  const andConditions = [];

  const gudangFilter = parseIdFilter(gudangTujuanId, "gudangTujuanId");
  if (gudangFilter !== null) {
    andConditions.push({
      OR: [
        { gudang_asal_id: gudangFilter },
        { gudang_tujuan_id: gudangFilter },
      ],
    });
  }

  if (startDate || endDate) {
    const dateCondition = {};
    if (startDate) dateCondition.gte = new Date(startDate);
    if (endDate) dateCondition.lte = new Date(endDate + "T23:59:59");
    andConditions.push({ tanggal: dateCondition });
  }

  if (search && search.trim()) {
    const s = search.trim();
    andConditions.push({
      OR: [
        { nomor_surat_jalan: { contains: s, mode: "insensitive" } },
        { project: { nama_project: { contains: s, mode: "insensitive" } } },
        { gudang_asal: { nama_gudang: { contains: s, mode: "insensitive" } } },
        { gudang_tujuan: { nama_gudang: { contains: s, mode: "insensitive" } } },
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const data = await prisma.surat_jalan.findMany({
    where,
    include: outboundInclude,
    orderBy: [{ updated_at: "desc" }],
  });

  const verifications = await getBatchApprovalVerifications(data.map((item) => Number(item.surat_jalan_id)));

  return withKendaraanDriverFallbackList(
    data.map((item) => ({
      ...item,
      approval_verification: verifications.get(String(item.surat_jalan_id)) || null,
    }))
  );
};

const findOutboundForApproval = async (params = {}) => {
  const { kategori_approval, search, startDate, endDate, page, limit } = params;

  const where = applyListFilters(
    { tipe: "outbound", status: APPROVAL_STATUS },
    { kategori_approval, search, startDate, endDate }
  );

  const { page: sanitizedPage, limit: sanitizedLimit } = sanitizePagination(page, limit);

  const [total, data] = await Promise.all([
    prisma.surat_jalan.count({ where }),
    prisma.surat_jalan.findMany({
      where,
      include: modalListInclude,
      orderBy: [{ created_at: "desc" }],
      skip: (sanitizedPage - 1) * sanitizedLimit,
      take: sanitizedLimit,
    }),
  ]);

  const verifications = await getBatchApprovalVerifications(data.map((item) => Number(item.surat_jalan_id)));

  return {
    data: withKendaraanDriverFallbackList(
      data.map((item) => ({
        ...item,
        approval_verification: verifications.get(String(item.surat_jalan_id)) || null,
      }))
    ),
    meta: buildListMeta(total, { page: sanitizedPage, limit: sanitizedLimit }),
  };
};

const findOutboundForDelivery = async (params = {}) => {
  const { search, startDate, endDate, page, limit } = params;

  const where = applyListFilters(
    { tipe: "outbound", status: { in: DELIVERY_STATUSES } },
    { search, startDate, endDate }
  );

  const { page: sanitizedPage, limit: sanitizedLimit } = sanitizePagination(page, limit);

  const [total, data] = await Promise.all([
    prisma.surat_jalan.count({ where }),
    prisma.surat_jalan.findMany({
      where,
      include: modalListInclude,
      orderBy: [{ created_at: "desc" }],
      skip: (sanitizedPage - 1) * sanitizedLimit,
      take: sanitizedLimit,
    }),
  ]);

  const verifications = await getBatchApprovalVerifications(data.map((item) => Number(item.surat_jalan_id)));

  return {
    data: withKendaraanDriverFallbackList(
      data.map((item) => ({
        ...item,
        approval_verification: verifications.get(String(item.surat_jalan_id)) || null,
      }))
    ),
    meta: buildListMeta(total, { page: sanitizedPage, limit: sanitizedLimit }),
  };
};

/**
 * Sisipkan info zona (nama/kode) ke setiap pick.
 * `surat_jalan_item_pick` hanya menyimpan `zona_id` polos (tanpa relasi Prisma
 * ke `zona_gudang`), jadi namanya di-lookup terpisah sekali di sini — dipakai
 * tabel halaman staf (distribusi & picking) untuk readback zona pengambilan.
 */
const attachPickZonaInfo = async (record) => {
  if (!record || !Array.isArray(record.items)) return record;

  const zonaIds = [
    ...new Set(
      record.items
        .flatMap((item) => (Array.isArray(item.picks) ? item.picks : []))
        .map((pick) => Number(pick.zona_id))
        .filter((zonaId) => Number.isFinite(zonaId) && zonaId > 0)
    ),
  ];
  if (zonaIds.length === 0) return record;

  const zonas = await prisma.zona_gudang.findMany({
    where: { zona_id: { in: zonaIds } },
    select: { zona_id: true, nama_zona: true, kode_zona: true },
  });
  const zonaMap = new Map(zonas.map((z) => [Number(z.zona_id), z]));

  return {
    ...record,
    items: record.items.map((item) =>
      Array.isArray(item.picks) && item.picks.length > 0
        ? {
            ...item,
            picks: item.picks.map((pick) => {
              const zona = zonaMap.get(Number(pick.zona_id));
              return zona ? { ...pick, zona } : pick;
            }),
          }
        : item
    ),
  };
};

const findById = async (id) => {
  const record = await prisma.surat_jalan.findUnique({
    where: {
      surat_jalan_id: Number(id),
    },
    include: findByIdInclude,
  });

  return withKendaraanDriverFallback(await attachPickZonaInfo(record));
};

const findOutboundDetail = async (id) => {
  const record = await prisma.surat_jalan.findUnique({
    where: {
      surat_jalan_id: Number(id),
    },
    include: outboundInclude,
  });

  return withKendaraanDriverFallback(record);
};

const updateStatus = async (id, status, options = {}, tx = prisma) => {
  const data = {
    status,
  };

  if (status === "disetujui") {
    data.tanggal_disetujui = new Date();
  }

  if (status === "diterima_didistribusikan") {
    data.tanggal_diterima = new Date();
  }

  if (status === "ditolak" && options && options.catatan !== undefined) {
    data.catatan = options.catatan || null;
  }

  if (options && options.picking_selesai !== undefined) {
    data.picking_selesai = options.picking_selesai;
  }

  return await tx.surat_jalan.update({
    where: {
      surat_jalan_id: Number(id),
    },
    data,
  });
};

const claimPicking = async (id, tx = prisma) => {
  const result = await tx.surat_jalan.updateMany({
    where: {
      surat_jalan_id: Number(id),
      picking_selesai: false,
    },
    data: {
      picking_selesai: true,
    },
  });

  return result.count === 1;
};

// Claim transisi status secara atomik. Tepat satu request boleh melewati
// status yang diharapkan; request ganda akan melihat count = 0.
const claimStatusTransit = async (id, dariStatus, keStatus, tx = prisma) => {
  const result = await tx.surat_jalan.updateMany({
    where: {
      surat_jalan_id: Number(id),
      tipe: "outbound",
      status: dariStatus,
    },
    data: { status: keStatus },
  });
  return result.count === 1;
};

const createTransitCheckpoint = async (data, tx = prisma) =>
  tx.surat_jalan_transit.create({ data, select: { transit_id: true, urutan: true } });

const findOpenTransitCheckpoint = async (suratJalanId, tx = prisma) =>
  tx.surat_jalan_transit.findFirst({
    where: { surat_jalan_id: Number(suratJalanId), berangkat_at: null },
    orderBy: { urutan: "desc" },
  });

const findTransitCheckpoints = async (suratJalanId, tx = prisma) =>
  tx.surat_jalan_transit.findMany({
    where: { surat_jalan_id: Number(suratJalanId) },
    orderBy: { urutan: "asc" },
    include: {
      gudang: { select: { gudang_id: true, nama_gudang: true, tipe: true, project_id: true } },
      tiba_oleh: { select: { user_id: true, nama: true } },
      berangkat_oleh: { select: { user_id: true, nama: true } },
    },
  });

// Kurangi stok transit yang terkait dengan checkpoint terbuka.
// Pilihan (a): TIDAK mengunci zona — ambil baris stok di gudang transit
// apa adanya (generic maupun yang sudah di-putaway ke zona), tetap batasi
// tiap baris dengan qty >= yang akan diambil lewat decrement atomik.
const deductTransitStock = async ({ checkpoint, items, projectId, actorId }, tx = prisma) => {
  const transitItems = Array.isArray(items) && items.length > 0 ? items : checkpoint.items;

  for (const deposited of transitItems) {
    const itemId = Number(deposited.item_id);
    const barangId = Number(deposited.barang_id);
    const kondisi = deposited.kondisi || "baik";
    const qtyDiminta = Number(deposited.qty || 0);
    if (!Number.isInteger(itemId) || itemId <= 0 || !Number.isInteger(barangId) || barangId <= 0 || qtyDiminta <= 0) {
      throw new AppError("Data barang titipan di Gudang Transit tidak valid.", 400);
    }

    let sisa = qtyDiminta;
    const kandidat = await tx.stok_gudang.findMany({
      where: {
        gudang_id: Number(checkpoint.gudang_id),
        barang_id: barangId,
        project_id: projectId,
        kondisi,
      },
      orderBy: [{ zona_id: "asc" }, { stok_id: "asc" }],
      select: { stok_id: true, qty: true, zona_id: true },
    });

    for (const stok of kandidat) {
      if (sisa <= 0) break;
      const tersedia = Number(stok.qty || 0);
      const qtyAmbil = Math.min(sisa, tersedia);
      if (qtyAmbil <= 0) continue;

      const updated = await tx.stok_gudang.updateMany({
        where: { stok_id: stok.stok_id, qty: { gte: qtyAmbil } },
        data: { qty: { decrement: qtyAmbil }, updated_at: new Date() },
      });
      if (updated.count !== 1) {
        throw new AppError("Stok Gudang Transit berubah saat diproses. Muat ulang data sebelum melanjutkan.", 409);
      }

      const setelah = await tx.stok_gudang.findUnique({
        where: { stok_id: stok.stok_id },
        select: { qty: true },
      });
      const saldo = Number(setelah?.qty || 0);
      if (!setelah || saldo <= 0) {
        await tx.stok_gudang.deleteMany({ where: { stok_id: stok.stok_id, qty: { lte: 0 } } });
      }
      await tx.stok_ledger.create({
        data: {
          surat_jalan_item_id: itemId,
          barang_id: barangId,
          jenis_mutasi: "out",
          qty: qtyAmbil,
          saldo_setelah: Math.max(0, saldo),
        },
      });
      sisa -= qtyAmbil;

      await capacityService.recalculateZonaStatus(tx, Number(checkpoint.gudang_id), stok.zona_id, actorId);
    }

    if (sisa > 0) {
      throw new AppError(
        `Stok transit barang ${barangId} tidak mencukupi untuk Surat Jalan ini (Tersedia: ${qtyDiminta - sisa}, Dibutuhkan: ${qtyDiminta}).`,
        400
      );
    }
  }
};

const updateTransitDeparture = async (transitId, actorId, catatan, tx = prisma) => {
  const result = await tx.surat_jalan_transit.updateMany({
    where: { transit_id: Number(transitId), berangkat_at: null },
    data: {
      berangkat_at: new Date(),
      berangkat_by: BigInt(actorId),
      catatan_berangkat: catatan || null,
    },
  });
  return result.count === 1;
};

/**
 * Menambah stok masuk ke sebuah gudang (default: gudang tujuan Surat Jalan).
 *
 * Dipakai dua jalur dengan implementasi yang sama, jangan dibuat paralel:
 *  1. approval inbound          -> addInboundStock(shipment, tx)
 *  2. titipan di Gudang Transit -> addInboundStock(shipment, tx, { gudangId, items })
 *
 * `gudangId` : tujuan penambahan (gudang transit pada jalur 2).
 * `items`    : daftar item yang dimasukkan. Default memakai item Surat Jalan;
 *              jalur transit mengirim sendiri karena qty/kondisi dilaporkan
 *              staf di lapangan dan bisa berbeda dari yang tercatat di SJ.
 *              Bentuk per item: { item_id, barang_id, qty, kondisi }.
 *
 * Selalu menulis stok generic (zona_id = null) + ledger `in`, sama seperti
 * alur inbound — penempatan ke zona mengikuti putaway seperti biasanya.
 */
const addInboundStock = async (suratJalan, tx = prisma, options = {}) => {
  const gudangTujuanId = Number(
    options.gudangId !== undefined && options.gudangId !== null
      ? options.gudangId
      : suratJalan.gudang_tujuan_id
  );

  const daftarItem =
    Array.isArray(options.items) && options.items.length > 0
      ? options.items
      : suratJalan.items;

  if (!gudangTujuanId) {
    throw new AppError("Gudang tujuan tidak tersedia untuk penambahan stok.", 400);
  }

  for (const item of daftarItem) {
    const qty = Number(item.qty || 0);

    if (qty <= 0) {
      continue;
    }

    const existingStock = await tx.stok_gudang.findFirst({
      where: {
        gudang_id: gudangTujuanId,
        barang_id: item.barang_id,
        kondisi: item.kondisi || "baik",
        zona_id: null,
      },
      orderBy: { stok_id: "asc" },
    });

    if (existingStock) {
      const newQty = Number(existingStock.qty || 0) + qty;

      await tx.stok_gudang.update({
        where: {
          stok_id: existingStock.stok_id,
        },
        data: {
          qty: newQty,
          updated_at: new Date(),
        },
      });

      await tx.stok_ledger.create({
        data: {
          surat_jalan_item_id: item.item_id,
          barang_id: item.barang_id,
          jenis_mutasi: "in",
          qty: qty,
          saldo_setelah: newQty,
        },
      });
    } else {
      const newStock = await tx.stok_gudang.create({
        data: {
          gudang_id: gudangTujuanId,
          barang_id: item.barang_id,
          project_id: null,
          kondisi: item.kondisi || "baik",
          qty: qty,
          zona_id: null,
        },
      });

      await tx.stok_ledger.create({
        data: {
          surat_jalan_item_id: item.item_id,
          barang_id: item.barang_id,
          jenis_mutasi: "in",
          qty: qty,
          saldo_setelah: Number(newStock.qty),
        },
      });
    }

    // Hook recalculateZonaStatus: addInboundStock selalu menulis ke zona_id=null
    // (stok generic, belum di-putaway). Fungsi akan otomatis skip karena zonaId null.
    // Dipanggil di sini supaya alur recalc terdokumentasi eksplisit untuk tahap audit.
    for (const item of suratJalan.items) {
      await capacityService.recalculateZonaStatus(tx, gudangTujuanId, null);
    }
  }
};

const createApprovalLog = async (suratJalanId, approverId, tahap, approvalStatus, catatan = null, tx = prisma) => {
  await tx.approval_log.create({
    data: {
      entity_type: "surat_jalan",
      entity_id: Number(suratJalanId),
      tahap: tahap,
      status: approvalStatus,
      approver_id: Number(approverId),
      catatan: catatan || null,
    },
  });
};

const getApprovalVerification = async (suratJalanId) => {
  const log = await prisma.approval_log.findFirst({
    where: {
      entity_type: "surat_jalan",
      entity_id: Number(suratJalanId),
      tahap: "outbound_approval",
      status: "disetujui",
    },
    orderBy: {
      created_at: "desc",
    },
    include: {
      approver: {
        select: {
          nama: true,
        },
      },
    },
  });

  if (!log) {
    return null;
  }

  return {
    approver_nama: log.approver?.nama || null,
    waktu_verifikasi: log.created_at,
  };
};

const getBatchApprovalVerifications = async (suratJalanIds) => {
  const numericIds = suratJalanIds.map(Number).filter((id) => Number.isFinite(id) && id > 0);
  if (numericIds.length === 0) {
    return {};
  }

  const logs = await prisma.approval_log.findMany({
    where: {
      entity_type: "surat_jalan",
      entity_id: { in: numericIds },
      tahap: "outbound_approval",
      status: "disetujui",
    },
    orderBy: {
      created_at: "desc",
    },
    include: {
      approver: {
        select: {
          nama: true,
        },
      },
    },
  });

  const latestById = new Map();
  for (const log of logs) {
    const key = String(log.entity_id);
    if (!latestById.has(key)) {
      latestById.set(key, {
        approver_nama: log.approver?.nama || null,
        waktu_verifikasi: log.created_at,
      });
    }
  }

  return latestById;
};

const deductOutboundStock = async (suratJalan, tx = prisma) => {
  const gudangAsalId = Number(suratJalan.gudang_asal_id);

  if (!gudangAsalId) {
    throw new AppError("Gudang asal tidak tersedia untuk pemotongan stok.", 400);
  }

  const gudangAsal = suratJalan.gudang_asal;
  const gudangAsalNama = gudangAsal?.nama_gudang || `Gudang ID ${gudangAsalId}`;

  for (const item of suratJalan.items) {
    const qty = Number(item.qty || 0);

    if (qty <= 0) {
      continue;
    }

    const barang = item.barang;
    const barangNama = barang?.nama_barang || barang?.kode_perangkat || `Barang ID ${item.barang_id}`;

    const stockWhere = {
      gudang_id: gudangAsalId,
      barang_id: item.barang_id,
      kondisi: item.kondisi || "baik",
    };

    if (suratJalan.project_id) {
      stockWhere.project_id = suratJalan.project_id;
    }

    if (item.zona_id) {
      stockWhere.zona_id = item.zona_id;
    }

    let stockRecord = await tx.stok_gudang.findFirst({
      where: {
        ...stockWhere,
        zona_id: { not: null },
      },
      orderBy: {
        qty: "desc",
      },
    });

    if (!stockRecord) {
      stockRecord = await tx.stok_gudang.findFirst({
        where: stockWhere,
        orderBy: {
          qty: "desc",
        },
      });
    }

    if (!stockRecord) {
      throw new AppError(
        `Stok barang ${barangNama} di ${gudangAsalNama} tidak ditemukan.`,
        400
      );
    }

    const existingQty = Number(stockRecord.qty || 0);
    if (existingQty < qty) {
      throw new AppError(
        `Stok barang ${barangNama} di ${gudangAsalNama} tidak mencukupi (Tersedia: ${existingQty}, Dibutuhkan: ${qty}).`,
        400
      );
    }

    const updatedQty = existingQty - qty;

    await tx.stok_gudang.update({
      where: {
        stok_id: stockRecord.stok_id,
      },
      data: {
        qty: updatedQty,
        updated_at: new Date(),
      },
    });

    await tx.stok_ledger.create({
      data: {
        surat_jalan_item_id: item.item_id,
        barang_id: item.barang_id,
        jenis_mutasi: "out",
        qty: qty,
        saldo_setelah: updatedQty,
      },
    });

    // Hook recalculateZonaStatus: hanya zona yang baru saja ter-mutasi.
    // Jika item.zona_id null (stok generic) → fungsi skip otomatis.
    await capacityService.recalculateZonaStatus(tx, gudangAsalId, item.zona_id ?? null);
  }
};

const reduceBoqAllocation = async (suratJalan, tx = prisma) => {
  if (!suratJalan.boq_id || !suratJalan.boq?.items?.length) {
    return;
  }

  const barangToQty = new Map();

  for (const item of suratJalan.items) {
    const qty = Number(item.qty || 0);
    if (qty <= 0) continue;
    const current = barangToQty.get(item.barang_id) || 0;
    barangToQty.set(item.barang_id, current + qty);
  }

  for (const [barangId, totalQty] of barangToQty) {
    const boqItem = suratJalan.boq.items.find(
      (bi) => Number(bi.barang_id) === Number(barangId)
    );
    if (!boqItem) continue;

    const currentQty = Number(boqItem.qty_rencana || 0);
    const newQty = currentQty - totalQty;

    if (newQty < 0) {
      throw new AppError(
        `Sisa alokasi BOQ untuk barang ${barangId} tidak mencukupi. Sisa: ${currentQty}, Dibutuhkan: ${totalQty}.`,
        400
      );
    }

    await tx.boq_item.update({
      where: { boq_item_id: Number(boqItem.boq_item_id) },
      data: { qty_rencana: newQty },
    });
  }
};

const updateDeliveryStatus = async (id, updateData, tx = prisma) => {
  return await tx.surat_jalan.update({
    where: { surat_jalan_id: Number(id) },
    data: updateData,
  });
};

const addItemFoto = async (itemId, fotoData) => {
  return await prisma.surat_jalan_item_foto.create({
    data: {
      item_id: Number(itemId),
      url: fotoData.url,
      filename: fotoData.filename || null,
      mimetype: fotoData.mimetype || null,
      ukuran_bytes: fotoData.ukuran_bytes,
    },
  });
};

const updateItemVerification = async (itemId, data) => {
  return await prisma.surat_jalan_item.update({
    where: { item_id: Number(itemId) },
    data: {
      diperiksa_oleh: data.diperiksa_oleh ? Number(data.diperiksa_oleh) : null,
      diperiksa_pada: data.diperiksa_pada || new Date(),
    },
  });
};

const deleteItemFoto = async (fotoId) => {
  return await prisma.surat_jalan_item_foto.delete({
    where: { foto_id: Number(fotoId) },
  });
};

const findInboundItemsBySerial = async (serials, { barangId, excludeItemIds = [], tx = prisma }) => {
  if (!Array.isArray(serials) || serials.length === 0) {
    return [];
  }

  const where = {
    surat_jalan: {
      tipe: "inbound",
      status: { not: "ditolak" },
    },
    barang_id: Number(barangId),
    serial_number: { in: serials, mode: "insensitive" },
    ...(excludeItemIds.length > 0
      ? { item_id: { notIn: excludeItemIds.map(Number) } }
      : {}),
  };

  return await tx.surat_jalan_item.findMany({
    where,
    include: {
      surat_jalan: {
        select: {
          nomor_surat_jalan: true,
          tipe: true,
          status: true,
        },
      },
    },
  });
};

const findOutboundApprovalHistory = async ({ search = "", keputusan, page = 1, limit = 10, startDate, endDate } = {}) => {
  const approvalWhere = {
    entity_type: "surat_jalan",
    tahap: "outbound_approval",
    status: { in: ["disetujui", "ditolak"] },
  };

  if (keputusan && ["disetujui", "ditolak"].includes(keputusan)) {
    approvalWhere.status = keputusan;
  }

  if (startDate || endDate) {
    const dateCondition = {};
    if (startDate) dateCondition.gte = new Date(startDate);
    if (endDate) dateCondition.lte = new Date(endDate + "T23:59:59");
    approvalWhere.created_at = dateCondition;
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const sanitizedPage = Math.max(parseInt(page, 10) || 1, 1);

  let sjIdFilter = null;
  if (search && search.trim()) {
    const s = search.trim();
    const matchingSjs = await prisma.surat_jalan.findMany({
      where: {
        tipe: "outbound",
        OR: [
          { nomor_surat_jalan: { contains: s, mode: "insensitive" } },
          { project: { nama_project: { contains: s, mode: "insensitive" } } },
          { gudang_asal: { nama_gudang: { contains: s, mode: "insensitive" } } },
          { gudang_tujuan: { nama_gudang: { contains: s, mode: "insensitive" } } },
        ],
      },
      select: { surat_jalan_id: true },
    });
    sjIdFilter = matchingSjs.map((sj) => Number(sj.surat_jalan_id));
    if (sjIdFilter.length === 0) {
      return { data: [], meta: buildListMeta(0, { page: sanitizedPage, limit: safeLimit }) };
    }
    approvalWhere.entity_id = { in: sjIdFilter };
  }

  const [total, logs] = await Promise.all([
    prisma.approval_log.count({ where: approvalWhere }),
    prisma.approval_log.findMany({
      where: approvalWhere,
      orderBy: { created_at: "desc" },
      skip: (sanitizedPage - 1) * safeLimit,
      take: safeLimit,
      include: {
        approver: { select: { nama: true } },
      },
    }),
  ]);

  if (logs.length === 0) {
    return { data: [], meta: buildListMeta(total, { page: sanitizedPage, limit: safeLimit }) };
  }

  const sjIds = logs.map((l) => Number(l.entity_id));
  const suratJalans = await prisma.surat_jalan.findMany({
    where: { surat_jalan_id: { in: sjIds } },
    select: {
      surat_jalan_id: true,
      nomor_surat_jalan: true,
      tipe: true,
      status: true,
      tanggal: true,
      updated_at: true,
      catatan: true,
      kategori_approval: true,
      pic_pemohon_nama: true,
      project: { select: { project_id: true, nama_project: true } },
      gudang_asal: { select: { gudang_id: true, nama_gudang: true } },
      gudang_tujuan: { select: { gudang_id: true, nama_gudang: true } },
    },
  });

  const sjMap = new Map(suratJalans.map((sj) => [String(sj.surat_jalan_id), sj]));

  const data = logs.map((log) => {
    const sj = sjMap.get(String(Number(log.entity_id)));
    return {
      surat_jalan_id: Number(log.entity_id),
      nomor_surat_jalan: sj?.nomor_surat_jalan ?? null,
      tanggal: sj?.tanggal ?? null,
      gudang_asal: sj?.gudang_asal ?? null,
      gudang_tujuan: sj?.gudang_tujuan ?? null,
      keputusan: log.status,
      catatan: log.catatan ?? sj?.catatan ?? null,
      penyetuju: log.approver?.nama ?? null,
      waktu_keputusan: log.created_at,
      status_surat_jalan: sj?.status ?? null,
    };
  });

  return { data, meta: buildListMeta(total, { page: sanitizedPage, limit: safeLimit }) };
};

const findRejectedList = async ({ tipe = "all", search = "", startDate, endDate, page = 1, limit = 10 } = {}) => {
  const where = { status: "ditolak" };

  if (tipe && tipe !== "all" && ["inbound", "outbound"].includes(tipe)) {
    where.tipe = tipe;
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { nomor_surat_jalan: { contains: s, mode: "insensitive" } },
      { project: { nama_project: { contains: s, mode: "insensitive" } } },
      { gudang_asal: { nama_gudang: { contains: s, mode: "insensitive" } } },
      { gudang_tujuan: { nama_gudang: { contains: s, mode: "insensitive" } } },
    ];
  }

  if (startDate || endDate) {
    const dateCondition = {};
    if (startDate) dateCondition.gte = new Date(startDate);
    if (endDate) dateCondition.lte = new Date(endDate + "T23:59:59");
    where.updated_at = dateCondition;
  }

  const { page: sanitizedPage, limit: sanitizedLimit } = sanitizePagination(page, limit);

  const [total, rows] = await Promise.all([
    prisma.surat_jalan.count({ where }),
    prisma.surat_jalan.findMany({
      where,
      orderBy: [{ updated_at: "desc" }],
      skip: (sanitizedPage - 1) * sanitizedLimit,
      take: sanitizedLimit,
      select: {
        surat_jalan_id: true,
        nomor_surat_jalan: true,
        tipe: true,
        status: true,
        tanggal: true,
        updated_at: true,
        created_at: true,
        catatan: true,
        kategori_approval: true,
        pic_pemohon_nama: true,
        project: { select: { project_id: true, nama_project: true } },
        gudang_asal: { select: { gudang_id: true, nama_gudang: true } },
        gudang_tujuan: { select: { gudang_id: true, nama_gudang: true } },
      },
    }),
  ]);

  if (rows.length === 0) {
    return { data: [], meta: buildListMeta(total, { page: sanitizedPage, limit: sanitizedLimit }) };
  }

  const ids = rows.map((r) => Number(r.surat_jalan_id));
  const rejectLogs = await prisma.approval_log.findMany({
    where: {
      entity_type: "surat_jalan",
      entity_id: { in: ids },
      status: "ditolak",
      tahap: { in: ["inbound_verifikasi", "outbound_approval"] },
    },
    orderBy: { created_at: "desc" },
    include: {
      approver: { select: { user_id: true, nama: true, email: true } },
    },
  });

  const latestBySj = new Map();
  for (const log of rejectLogs) {
    const key = String(log.entity_id);
    if (!latestBySj.has(key)) {
      latestBySj.set(key, log);
    }
  }

  const data = rows.map((r) => {
    const log = latestBySj.get(String(Number(r.surat_jalan_id)));
    return {
      surat_jalan_id: Number(r.surat_jalan_id),
      nomor_surat_jalan: r.nomor_surat_jalan,
      tipe: r.tipe,
      status: r.status,
      tanggal: r.tanggal,
      kategori_approval: r.kategori_approval,
      pic_pemohon_nama: r.pic_pemohon_nama,
      project: r.project,
      gudang_asal: r.gudang_asal,
      gudang_tujuan: r.gudang_tujuan,
      catatan: r.catatan ?? log?.catatan ?? null,
      ditolak_oleh: log?.approver
        ? {
            user_id: Number(log.approver.user_id),
            nama: log.approver.nama,
            email: log.approver.email,
          }
        : null,
      ditolak_pada: log?.created_at ?? r.updated_at ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  return { data, meta: buildListMeta(total, { page: sanitizedPage, limit: sanitizedLimit }) };
};

const findStaffHistory = async (userId, { page = 1, pageSize = 50 } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(200, Math.max(1, Number(pageSize) || 50));
  const skip = (safePage - 1) * safePageSize;

  const whereClause = {
    actor_id: Number(userId),
    entity_type: "surat_jalan",
  };

  const [logs, total] = await Promise.all([
    prisma.audit_log.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      skip,
      take: safePageSize,
      include: {
        actor: { select: { user_id: true, nama: true, email: true } },
      },
    }),
    prisma.audit_log.count({ where: whereClause }),
  ]);

  const suratJalanIds = logs
    .map((log) => Number(log.entity_id))
    .filter((id) => Number.isFinite(id) && id > 0);

  const suratJalans = suratJalanIds.length
    ? await prisma.surat_jalan.findMany({
        where: { surat_jalan_id: { in: suratJalanIds } },
        select: {
          surat_jalan_id: true,
          nomor_surat_jalan: true,
          tipe: true,
          status: true,
          tanggal: true,
        },
      })
    : [];

  const sjMap = new Map(suratJalans.map((sj) => [String(sj.surat_jalan_id), sj]));

  const items = logs.map((log) => {
    const sj = sjMap.get(String(log.entity_id));
    return {
      audit_id: log.audit_id,
      aksi: log.aksi,
      created_at: log.created_at,
      surat_jalan: sj || null,
    };
  });

  return { items, total, page: safePage, pageSize: safePageSize };
};

module.exports = {
  create,
  findOutboundQueue,
  findInboundList,
  findById,
  findOutboundDetail,
  findOutboundForApproval,
  findOutboundForDelivery,
  updateStatus,
  deductOutboundStock,
  addInboundStock,
  createApprovalLog,
  reduceBoqAllocation,
  createAdhocBarang,
  updateDeliveryStatus,
  addItemFoto,
  updateItemVerification,
  deleteItemFoto,
  findOutboundApprovalHistory,
  findStaffHistory,
  findRejectedList,
  getApprovalVerification,
  getBatchApprovalVerifications,
  claimPicking,
  claimStatusTransit,
  createTransitCheckpoint,
  findOpenTransitCheckpoint,
  findTransitCheckpoints,
  deductTransitStock,
  updateTransitDeparture,
};