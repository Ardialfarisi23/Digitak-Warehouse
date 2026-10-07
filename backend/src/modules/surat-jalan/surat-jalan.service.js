const suratJalanRepository = require("./surat-jalan.repository");
const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const { PrismaClientKnownRequestError } = require("@prisma/client");
const notificationService = require("../notifications/notifications.service");
const capacityService = require("../capacity/capacity.service");
const {
  resolveGudangIds,
  assertGudangDiizinkan,
  assertAdaGudangDiizinkan,
  assertZonaMilikGudang,
  PESAN_GUDANG_DIARANG,
} = require("../../middlewares/gudang-scope.middleware");

const KONDISI_LABEL = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_berat: "Rusak Berat",
  tidak_sesuai_spek: "Tidak Sesuai Spek",
  doa: "DOA",
};

const buildItemPickSummary = (picks = []) => {
  const summary = new Map();
  for (const pick of picks) {
    const key = Number(pick.surat_jalan_item_id);
    const current = summary.get(key) || { totalQty: 0, kondisiList: [] };
    const qty = Number(pick.qty || 0);
    const kondisi = pick.kondisi_diambil || null;
    current.totalQty += qty;
    if (kondisi) {
      const existing = current.kondisiList.find((k) => k.kondisi === kondisi);
      if (existing) {
        existing.qty += qty;
      } else {
        current.kondisiList.push({ kondisi, qty });
      }
    }
    summary.set(key, current);
  }
  return summary;
};

const getRelatedUserIdsByGudang = async (gudangIds, roles) => {
  if (!Array.isArray(gudangIds) || gudangIds.length === 0 || !Array.isArray(roles) || roles.length === 0) {
    return [];
  }
  const numericGudangIds = gudangIds.map(Number).filter((id) => !Number.isNaN(id));
  if (numericGudangIds.length === 0) return [];

  const personnel = await prisma.personil.findMany({
    where: {
      gudang_id: { in: numericGudangIds },
      user: {
        role: { in: roles },
        is_aktif: true,
      },
    },
    select: { user_id: true },
  });

  return personnel.map((p) => Number(p.user_id)).filter((id) => !Number.isNaN(id) && id > 0);
};

const getRelatedSupervisorIds = async (excludeUserId = null) => {
  const supervisors = await prisma.user_account.findMany({
    where: { role: "supervisor", is_aktif: true },
    select: { user_id: true },
  });
  let ids = supervisors.map((s) => s.user_id).filter((id) => id != null);
  if (excludeUserId != null) {
    const numericExclude = Number(excludeUserId);
    return ids.filter((id) => id !== numericExclude);
  }
  return ids;
};

const getRelatedStaffIds = async (gudangIds) => {
  return await getRelatedUserIdsByGudang(gudangIds, ["staf_gudang"]);
};

const getAllAdminIds = async (excludeUserId = null) => {
  const admins = await prisma.user_account.findMany({
    where: { role: "admin_general", is_aktif: true },
    select: { user_id: true },
  });
  let ids = admins.map((a) => Number(a.user_id)).filter((id) => !Number.isNaN(id) && id > 0);
  if (excludeUserId != null) {
    const numericExclude = Number(excludeUserId);
    ids = ids.filter((id) => id !== numericExclude);
  }
  return ids;
};

const collectShipmentGudangIds = (shipment) => {
  const ids = [shipment.gudang_asal_id, shipment.gudang_tujuan_id].filter(Boolean);
  return [...new Set(ids)];
};

/**
 * Scope gudang efektif untuk satu permintaan.
 *
 * Kalau route sudah memasang `attachGudangScope`, scope-nya dipakai apa adanya.
 * Kalau tidak (mis. pemanggilan internal dari service lain), daftar gudang staf
 * dibaca ulang dari database supaya pemeriksaannya tetap konsisten dan tetap
 * mengikuti aturan satu staf boleh punya satu atau banyak gudang.
 *
 * admin_general dan supervisor selalu `dibatasi: false`, jadi seluruh guard di
 * bawah meloloskan mereka tanpa perubahan perilaku.
 */
const scopeEfektif = async (actor, scope) => {
  if (scope && typeof scope === "object" && typeof scope.dibatasi === "boolean") {
    return scope;
  }

  if (!actor || actor.role !== "staf_gudang") {
    return { dibatasi: false, sudahDitugaskan: true, gudangIds: [], gudangUtamaId: null };
  }

  const gudangIds = await resolveGudangIds(actor.id, actor.role);

  // Sama seperti attachGudangScope: staf tanpa penugasan tidak diblokir, supaya
  // perilakunya tetap sama seperti sebelum fitur ini ada sampai admin mengisi data.
  if (gudangIds.length === 0) {
    return { dibatasi: false, sudahDitugaskan: false, gudangIds: [], gudangUtamaId: null };
  }

  return { dibatasi: true, sudahDitugaskan: true, gudangIds, gudangUtamaId: gudangIds[0] };
};

/**
 * Scope wajib untuk endpoint tulis (putaway, retrieve, receive, delivery, foto).
 *
 * Kalau route lupa memasang `attachGudangScope`, kita gagal tertutup dengan 403
 * supaya tidak ada jalur yang diam-diam lolos tanpa pemeriksaan gudang.
 * Route yang sudah memasang middleware selalu mengirim scope dengan bentuk di sini.
 */
const scopeWajib = (scope) => {
  if (!scope || typeof scope !== "object" || typeof scope.dibatasi !== "boolean") {
    throw new AppError(PESAN_GUDANG_DIARANG, 403);
  }
  return scope;
};

/**
 * Penjaga gudang untuk satu surat jalan.
 *
 * Aturan lama dipertahankan apa adanya: staf yang membuat surat jalan itu sendiri
 * tetap boleh membukanya (`created_by`), apa pun gudang yang terkait. Selain itu,
 * staf hanya boleh menyentuh surat jalan yang gudang asal ATAU gudang tujuannya
 * termasuk dalam daftar penugasannya.
 */
const jagaGudangSuratJalan = async (actor, scope, shipment) => {
  const finalScope = await scopeEfektif(actor, scope);

  if (!finalScope.dibatasi) return finalScope;

  const actorId = Number(actor?.id);
  if (Number.isInteger(actorId) && actorId > 0 && Number(shipment?.created_by) === actorId) {
    return finalScope;
  }

  assertAdaGudangDiizinkan(finalScope, [shipment?.gudang_asal_id, shipment?.gudang_tujuan_id]);

  return finalScope;
};

const normalizeSerial = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed.toUpperCase();
};

const buildPickDecision = ({
  requestedKondisi,
  pickedKondisi,
  qty,
  stockDiminta,
  stockDiambil,
  fallbackStocks,
  barangNama,
  zonaNama,
  kondisiLabel,
  catatanKondisi,
}) => {
  const isOverride = Boolean(pickedKondisi && pickedKondisi !== requestedKondisi);
  const effectiveKondisi = pickedKondisi || requestedKondisi;
  const targetStock = isOverride ? stockDiambil : stockDiminta;

  if (qty <= 0) {
    return {
      ok: false,
      code: "INVALID_QTY",
      message: `Qty harus lebih dari 0 untuk ${barangNama}.`,
    };
  }

  if (!targetStock) {
    const alternatives = (fallbackStocks || [])
      .filter((s) => s.qty > 0)
      .map((s) => `${kondisiLabel[s.kondisi] || s.kondisi} (${Number(s.qty || 0)})`)
      .join(", ");
    const altText = alternatives ? ` Tersedia: ${alternatives}.` : " Tidak ada stok kondisi lain di zona ini.";

    if (isOverride) {
      return {
        ok: false,
        code: "OVERRIDE_NO_STOCK",
        message: `Override ditolak: stok kondisi ${effectiveKondisi} untuk ${barangNama} tidak tersedia di zona ${zonaNama}.${altText}`,
      };
    }

    return {
      ok: false,
      code: "NO_STOCK",
      message: `Stok ${barangNama} dengan kondisi ${effectiveKondisi} tidak tersedia di zona ${zonaNama}.${altText}`,
    };
  }

  const existingQty = Number(targetStock.qty || 0);
  if (existingQty < qty) {
    return {
      ok: false,
      code: "INSUFFICIENT_STOCK",
      message: `Stok barang ${barangNama} di zona tidak mencukupi (Tersedia: ${existingQty}, Dibutuhkan: ${qty}).`,
    };
  }

  const catatanFinal = isOverride
    ? catatanKondisi?.trim() || `Auto: kondisi ${requestedKondisi} tidak tersedia, diambil ${effectiveKondisi}`
    : catatanKondisi?.trim() || null;

  return { ok: true, mode: isOverride ? "override" : "normal", isOverride, catatanFinal };
};

const mapPickRow = ({
  suratJalanItemId,
  gudangId,
  zonaId,
  requestedKondisi,
  pickedKondisi,
  qty,
  catatanKondisi,
  actorId,
}) => {
  const isOverride = Boolean(pickedKondisi && pickedKondisi !== requestedKondisi);

  return {
    surat_jalan_item_id: suratJalanItemId,
    gudang_id: gudangId,
    zona_id: zonaId,
    kondisi_diminta: requestedKondisi,
    kondisi_diambil: pickedKondisi || requestedKondisi,
    qty: qty,
    is_override: isOverride,
    catatan_override: catatanKondisi || null,
    picked_by: actorId ? BigInt(actorId) : null,
  };
};

const create = async (data, actorId) => {
  if (!data.tipe || !["inbound", "outbound"].includes(data.tipe)) {
    throw new AppError("Tipe surat jalan harus inbound atau outbound.", 400);
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new AppError("Minimal satu item harus diisi.", 400);
  }

  for (const item of data.items) {
    if (!item.satuan_id) {
      throw new AppError("Setiap item harus memiliki satuan_id.", 400);
    }
    if (item.is_non_master) {
      if (!item.nama_barang_teks || String(item.nama_barang_teks).trim() === "") {
        throw new AppError("Nama barang wajib diisi untuk barang non-master.", 400);
      }
      if (!item.kategori_id) {
        throw new AppError("Kategori wajib diisi untuk barang non-master.", 400);
      }
    } else if (!item.barang_id) {
      throw new AppError("Setiap item harus memiliki barang_id dan satuan_id.", 400);
    }
  }

   if (data.boq_id) {
     const boq = await prisma.boq.findUnique({
       where: { boq_id: Number(data.boq_id) },
       select: { boq_id: true, status: true, boq_number: true },
     });
     if (!boq) {
       throw new AppError("BOQ yang dipilih tidak ditemukan.", 400);
     }
     if (boq.status !== "aktif") {
       throw new AppError(`BOQ berstatus ${boq.status} tidak dapat diajukan Surat Jalan.`, 400);
     }
   }

   if (data.tujuan_tipe === "lapangan" && data.titik_lapangan_id) {
     const titik = await prisma.titik_lapangan.findUnique({
       where: { titik_lapangan_id: Number(data.titik_lapangan_id) },
       select: { titik_lapangan_id: true, is_aktif: true, project_id: true },
     });
     if (!titik) {
       throw new AppError("Titik lapangan yang dipilih tidak ditemukan.", 400);
     }
     if (!titik.is_aktif) {
       throw new AppError("Titik lapangan yang dipilih tidak aktif.", 400);
     }
     if (data.project_id && Number(titik.project_id) !== Number(data.project_id)) {
       throw new AppError("Titik lapangan tidak sesuai dengan project yang dipilih.", 400);
     }
   }

   const normalizedItems = data.items.map((item) => ({
    ...item,
    serial_number: normalizeSerial(item.serial_number),
  }));

  const normalizedKendaraan = {
    kendaraan_id: data.kendaraan_id || null,
    kendaraan_nama_teks: data.kendaraan_id ? null : data.kendaraan_nama_teks ? String(data.kendaraan_nama_teks).trim() : null,
    kendaraan_jenis_teks: data.kendaraan_id ? null : data.kendaraan_jenis_teks ? String(data.kendaraan_jenis_teks).trim() : null,
    kendaraan_no_polisi_teks: data.kendaraan_id
      ? null
      : data.kendaraan_no_polisi_teks
        ? String(data.kendaraan_no_polisi_teks).trim().replace(/\s+/g, " ").toUpperCase()
        : null,
    personil_pengantar_id: data.personil_pengantar_id || null,
    driver_nama_teks: data.personil_pengantar_id ? null : data.driver_nama_teks ? String(data.driver_nama_teks).trim() : null,
  };

  // Item non-master: buat record barang di master data lebih dulu supaya
  // surat_jalan_item tetap punya barang_id yang valid (kolomnya non-null).
  for (const item of normalizedItems) {
    if (!item.is_non_master) continue;

    const barang = await suratJalanRepository.createAdhocBarang({
      nama_barang: item.nama_barang_teks,
      kategori_id: item.kategori_id,
      satuan_id: item.satuan_id,
      actorId,
    });

    item.barang_id = String(barang.barang_id);
    item.is_di_luar_boq = true;
    item.catatan = item.catatan && item.catatan.trim() !== "" ? item.catatan : "Di luar BOQ";
  }

  const seen = new Map();
  for (const item of normalizedItems) {
    if (!item.serial_number) continue;
    const key = `${item.serial_number}::${item.barang_id}`;
    if (seen.has(key)) {
      throw new AppError(`Serial number ${item.serial_number} diinput lebih dari sekali.`, 409);
    }
    seen.set(key, item);
  }

  const MAX_ATTEMPTS = 5;
  let attempt = 0;

  while (attempt < MAX_ATTEMPTS) {
    attempt += 1;
    try {
      const suratJalan = await prisma.$transaction(async (tx) => {
        const checksByBarang = new Map();
        for (const item of normalizedItems) {
          if (!item.serial_number) continue;
          const barangId = Number(item.barang_id);
          if (!checksByBarang.has(barangId)) {
            checksByBarang.set(barangId, new Set());
          }
          checksByBarang.get(barangId).add(item.serial_number);
        }

        for (const [barangId, serials] of checksByBarang) {
          const existing = await suratJalanRepository.findInboundItemsBySerial(
            Array.from(serials),
            { barangId, tx },
            tx
          );
          if (existing.length > 0) {
            const nomor = existing[0].surat_jalan?.nomor_surat_jalan || "...";
            throw new AppError(`Serial number ${existing[0].serial_number} sudah tercatat pada surat jalan ${nomor}.`, 409);
          }
        }

        const created = await suratJalanRepository.create({ ...data, ...normalizedKendaraan, items: normalizedItems }, actorId, tx);

        const aksi = data.tipe === "inbound" ? "create_inbound" : "create_outbound";

        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(created.surat_jalan_id),
            aksi: aksi,
            actor_id: BigInt(actorId),
            data_sebelum: null,
            data_sesudah: {
              status: created.status,
              surat_jalan_id: created.surat_jalan_id,
              tipe: created.tipe,
              nomor_surat_jalan: created.nomor_surat_jalan,
              kendaraan_id: created.kendaraan_id,
              kendaraan_nama_teks: created.kendaraan_nama_teks,
              kendaraan_jenis_teks: created.kendaraan_jenis_teks,
              kendaraan_no_polisi_teks: created.kendaraan_no_polisi_teks,
              personil_pengantar_id: created.personil_pengantar_id,
              driver_nama_teks: created.driver_nama_teks,
              ...(created.tipe === "inbound"
                ? { gudang_tujuan_id: created.gudang_tujuan_id }
                : {
                    gudang_asal_id: created.gudang_asal_id,
                    gudang_tujuan_id: created.gudang_tujuan_id,
                  }),
            },
          },
        });

        return created;
      });

      if (data.tipe === "outbound") {
        const actor = await prisma.user_account.findUnique({
          where: { user_id: BigInt(actorId) },
          select: { nama: true, role: true },
        });

        const gudangIds = collectShipmentGudangIds(suratJalan);

        if (actor?.role === "admin_general") {
          const supervisorIds = await getRelatedSupervisorIds();

          if (supervisorIds.length > 0) {
            await notificationService.create({
              userId: supervisorIds,
              type: "approval",
              title: "Outbound Menunggu Approval",
              message: `Pengajuan outbound ${suratJalan.nomor_surat_jalan} menunggu persetujuan.`,
              link: `/dashboard/supervisor/approval/outbound/${suratJalan.surat_jalan_id}`,
            });
          }
        } else if (actor?.role === "staf_gudang") {
          const supervisorIds = await getRelatedSupervisorIds();

          if (supervisorIds.length > 0) {
            await notificationService.create({
              userId: supervisorIds,
              type: "approval",
              title: "Outbound Menunggu Approval",
              message: `Pengajuan outbound ${suratJalan.nomor_surat_jalan} menunggu persetujuan.`,
              link: `/dashboard/supervisor/approval/outbound/${suratJalan.surat_jalan_id}`,
            });
          }
        }
      }

      return suratJalan;
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === "P2002" && attempt < MAX_ATTEMPTS) {
        const target = err.meta?.target;
        const isNomor =
          (Array.isArray(target) && target.includes("nomor_surat_jalan")) ||
          target === "nomor_surat_jalan";
        if (isNomor) {
          continue;
        }
      }
      if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
        throw new AppError("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.", 400);
      }
      throw err;
    }
  }

  throw new AppError("Nomor surat jalan sudah digunakan. Silakan gunakan nomor lain.", 400);
};

const createStaffInbound = async (data, actorId) => {
  const payload = {
    ...data,
    tipe: "inbound",
    status: "menunggu_verifikasi",
  };

  const result = await create(payload, actorId);

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(actorId) },
    select: { nama: true, role: true },
  });

  const gudangIds = collectShipmentGudangIds(result);

  try {
    if (actor?.role === "admin_general" || actor?.role === "staf_gudang") {
      const supervisorIds = await getRelatedSupervisorIds();

      if (supervisorIds.length > 0) {
        await notificationService.create({
          userId: supervisorIds,
          type: "approval",
          title: "Inbound Menunggu Verifikasi",
          message: `Pengajuan inbound ${result?.nomor_surat_jalan || ""} menunggu verifikasi supervisor.`,
          link: "/dashboard/supervisor/approval/inbound",
        });
      }
    }
  } catch (notifErr) {
    console.error("Gagal membuat notifikasi create staff inbound:", notifErr);
  }

  return result;
};

const receiveInbound = async (id, items, actorId, scope) => {
  const scopeFinal = scopeWajib(scope);

  const shipment = await suratJalanRepository.findById(id);

  if (!shipment) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (shipment.tipe !== "inbound") {
    throw new AppError("Surat Jalan ini bukan inbound.", 400);
  }

  // Staf hanya boleh mencatat penerimaan inbound untuk gudang tujuan yang
  // ditugaskan kepadanya. admin_general dan supervisor tidak dibatasi.
  assertGudangDiizinkan(scopeFinal, shipment.gudang_tujuan_id);

  if (shipment.status === "disetujui" || shipment.status === "diterima_didistribusikan") {
    throw new AppError("Inbound ini sudah diproses.", 400);
  }

  const normalizedItems = items.map((item) => ({
    ...item,
    serial_number: normalizeSerial(item.serial_number),
  }));

  const barangMap = new Map(shipment.items.map((si) => [String(si.item_id), Number(si.barang_id)]));
  const seen = new Map();
  for (const item of normalizedItems) {
    if (!item.serial_number) continue;
    const barangId = barangMap.get(String(item.item_id));
    if (!barangId) continue;
    const key = `${item.serial_number}::${barangId}`;
    if (seen.has(key)) {
      throw new AppError(`Serial number ${item.serial_number} diinput lebih dari sekali.`, 409);
    }
    seen.set(key, item);
  }

  await prisma.$transaction(async (tx) => {
    const itemToBarang = new Map(shipment.items.map((si) => [String(si.item_id), Number(si.barang_id)]));
    const barangIds = [...new Set(shipment.items.map((si) => Number(si.barang_id)).filter((id) => Number.isFinite(id) && id > 0))];
    const barangs = await tx.barang.findMany({
      where: { barang_id: { in: barangIds } },
      select: { barang_id: true, nama_barang: true, wajib_sn: true },
    });
    const barangMap = new Map(barangs.map((b) => [Number(b.barang_id), b]));

    for (const item of normalizedItems) {
      if (item.serial_number) continue;
      const barangId = itemToBarang.get(String(item.item_id));
      if (!barangId) continue;
      const barang = barangMap.get(barangId);
      if (barang?.wajib_sn) {
        throw new AppError(`Serial number wajib diisi untuk barang ${barang.nama_barang}.`, 422);
      }
    }

    const checksByBarang = new Map();
    const excludeItemIds = normalizedItems.map((item) => Number(item.item_id));
    for (const item of normalizedItems) {
      if (!item.serial_number) continue;
      const barangId = barangMap.get(String(item.item_id));
      if (!barangId) continue;
      if (!checksByBarang.has(barangId)) {
        checksByBarang.set(barangId, new Set());
      }
      checksByBarang.get(barangId).add(item.serial_number);
    }

    for (const [barangId, serials] of checksByBarang) {
      const existing = await suratJalanRepository.findInboundItemsBySerial(
        Array.from(serials),
        { barangId, excludeItemIds, tx },
        tx
      );
      if (existing.length > 0) {
        const nomor = existing[0].surat_jalan?.nomor_surat_jalan || "...";
        throw new AppError(`Serial number ${existing[0].serial_number} sudah tercatat pada surat jalan ${nomor}.`, 409);
      }
    }

    // Mapping label UI → enum Prisma kondisi_barang
    const KONDISI_MAP = {
      "Baik": "baik",
      "Rusak Ringan": "rusak_ringan",
      "Rusak Berat": "rusak_berat",
      "Tidak Sesuai Spek": "tidak_sesuai_spek",
      "DOA": "doa",
      // Sudah lowercase (dari sumber lain)
      "baik": "baik",
      "rusak_ringan": "rusak_ringan",
      "rusak_berat": "rusak_berat",
      "tidak_sesuai_spek": "tidak_sesuai_spek",
      "doa": "doa",
    };

    // Urutan tingkat keparahan kondisi. Dipakai hanya untuk item yang punya
    // penilaian per unit, supaya kolom kondisi ringkasan item terisi nilai
    // terburuk dan stok_gudang tetap terkelompok dengan benar.
    const KONDISI_SEVERITY = {
      baik: 0,
      rusak_ringan: 1,
      tidak_sesuai_spek: 2,
      rusak_berat: 3,
      doa: 4,
    };

    for (const item of normalizedItems) {
      const updateData = {};

      if (typeof item.qty === "number") {
        updateData.qty = item.qty;
      }
      if (typeof item.kondisi === "string") {
        const kondisiMapped = KONDISI_MAP[item.kondisi];
        if (kondisiMapped) {
          updateData.kondisi = kondisiMapped;
        }
      }
      if (typeof item.serial_number === "string") {
        updateData.serial_number = item.serial_number;
      }
      if (typeof item.catatan === "string") {
        updateData.catatan = item.catatan;
      }
      if (typeof item.zona_id === "number" && item.zona_id > 0) {
        updateData.zona_id = Number(item.zona_id);
      }

      const itemId = Number(item.item_id);
      const units = Array.isArray(item.units) ? item.units : [];

      if (units.length > 0) {
        const kondisiTerburuk = units.reduce((worst, unit) => {
          const candidate = KONDISI_MAP[unit.kondisi] || unit.kondisi;
          return (KONDISI_SEVERITY[candidate] ?? -1) > (KONDISI_SEVERITY[worst] ?? -1)
            ? candidate
            : worst;
        }, units[0].kondisi);
        updateData.kondisi = kondisiTerburuk;

        // Simpan ulang seluruh unit item ini supaya idempoten saat staf
        // menyimpan penerimaan lebih dari sekali.
        await tx.surat_jalan_item_unit.deleteMany({
          where: { surat_jalan_item_id: itemId },
        });

        await tx.surat_jalan_item_unit.createMany({
          data: units.map((unit) => ({
            surat_jalan_item_id: itemId,
            nomor_unit: Number(unit.nomor_unit),
            kondisi: KONDISI_MAP[unit.kondisi] || unit.kondisi,
            catatan: unit.catatan && String(unit.catatan).trim() !== "" ? unit.catatan : null,
          })),
        });
      } else if (typeof item.qty === "number" && item.qty <= 1) {
        // Qty turun ke 0/1 unit: assessment per unit lama harus dibuang biar
        // tidak nyangkut dengan qty terbaru.
        await tx.surat_jalan_item_unit.deleteMany({
          where: { surat_jalan_item_id: itemId },
        });
      }

      if (Object.keys(updateData).length > 0) {
        await tx.surat_jalan_item.update({
          where: { item_id: Number(item.item_id) },
          data: updateData,
        });
      }
    }

    await suratJalanRepository.createApprovalLog(id, actorId, "inbound_putaway", "menunggu", "Penerimaan dicatat staf.", tx);
    await tx.audit_log.create({
      data: {
        entity_type: "surat_jalan",
        entity_id: BigInt(id),
        aksi: "receive_inbound",
        actor_id: BigInt(actorId),
        data_sebelum: { status: shipment.status },
        data_sesudah: { status: "draft_diajukan", items_updated: items.length, surat_jalan_id: id },
      },
    });
  });

  return await suratJalanRepository.findById(id);
};

const findOutboundQueue = async (filters = {}) => {
  return await suratJalanRepository.findOutboundQueue(filters);
};

const findStaffHistory = async (userId, query = {}) => {
  return await suratJalanRepository.findStaffHistory(userId, query);
};

const findOutboundApprovalHistory = async (query = {}) => {
  return await suratJalanRepository.findOutboundApprovalHistory(query);
};

const findRejectedList = async (query = {}) => {
  return await suratJalanRepository.findRejectedList(query);
};

const findInboundList = async (filters = {}) => {
  return await suratJalanRepository.findInboundList(filters);
};

const findVerificationQueue = async (query = {}) => {
  return await suratJalanRepository.findVerificationQueue(query);
};

const findOutboundForApproval = async (params = {}) => {
  return await suratJalanRepository.findOutboundForApproval(params);
};

const findOutboundForDelivery = async (params = {}) => {
  return await suratJalanRepository.findOutboundForDelivery(params);
};

const findOutboundDetail = async (id, actor, scope) => {
  const record = await suratJalanRepository.findOutboundDetail(id);

  if (!record) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (record.tipe !== "outbound") {
    throw new AppError("Surat Jalan ini bukan outbound.", 400);
  }

  const approvalVerification = await suratJalanRepository.getApprovalVerification(id);
  const transitCheckpoints = await suratJalanRepository.findTransitCheckpoints(id);

  if (!actor || ["admin_general", "supervisor"].includes(actor.role)) {
    return {
      ...record,
      approval_verification: approvalVerification,
      riwayat_perjalanan: transitCheckpoints,
    };
  }

  if (actor.role === "staf_gudang") {
    // admin_general dan supervisor tidak dibatasi, jadi penjaga gudang di bawah
    // hanya berlaku untuk staf_gudang.
    await jagaGudangSuratJalan(actor, scope, record);

    return {
      ...record,
      approval_verification: approvalVerification,
      riwayat_perjalanan: transitCheckpoints,
    };
  }

  throw new AppError("Anda tidak memiliki akses ke surat jalan ini.", 403);
};

const findById = async (id, actor, scope) => {
  const record = await suratJalanRepository.findById(id);

  if (!record) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (record.items?.length > 0) {
    const itemIds = record.items.map((it) => Number(it.item_id));
    const picks = await prisma.surat_jalan_item_pick.findMany({
      where: { surat_jalan_item_id: { in: itemIds } },
      select: { surat_jalan_item_id: true, qty: true, kondisi_diambil: true },
    });
    const pickSummary = buildItemPickSummary(picks);
    const itemsWithPick = record.items.map((item) => {
      const summary = pickSummary.get(Number(item.item_id)) || { totalQty: 0, kondisiList: [] };
      return {
        ...item,
        qty_dipick_total: summary.totalQty,
        kondisi_diambil_list: summary.kondisiList,
      };
    });
    record.items = itemsWithPick;
  }

  const approvalVerification = await suratJalanRepository.getApprovalVerification(id);
  const transitCheckpoints = await suratJalanRepository.findTransitCheckpoints(id);

  if (!actor || ["admin_general", "supervisor"].includes(actor.role)) {
    return {
      ...record,
      approval_verification: approvalVerification,
      riwayat_perjalanan: transitCheckpoints,
    };
  }

  if (actor.role === "staf_gudang") {
    // Sama seperti findOutboundDetail: admin_general dan supervisor tidak
    // dibatasi, jadi penjaga gudang di bawah hanya berlaku untuk staf_gudang.
    await jagaGudangSuratJalan(actor, scope, record);

    return {
      ...record,
      approval_verification: approvalVerification,
      riwayat_perjalanan: transitCheckpoints,
    };
  }

  throw new AppError("Anda tidak memiliki akses ke surat jalan ini.", 403);
};

const approveInbound = async (id, itemAdjustments = [], actorId) => {
  const shipment = await suratJalanRepository.findById(id);

  if (!shipment) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (shipment.tipe !== "inbound") {
    throw new AppError("Surat Jalan ini bukan inbound.", 400);
  }

  if (shipment.status === "ready_putaway" || shipment.status === "disetujui" || shipment.status === "diterima_didistribusikan") {
    return shipment;
  }

  if (shipment.boq_id && shipment.boq?.status !== "aktif") {
    throw new AppError("Tidak dapat menyetujui inbound — BOQ/Project terkait belum diaktifkan oleh Admin.", 400);
  }

  if (Array.isArray(itemAdjustments) && itemAdjustments.length > 0) {
    await suratJalanRepository.updateInboundItems(itemAdjustments);
  }

  await prisma.$transaction(async (tx) => {
    await suratJalanRepository.addInboundStock(shipment, tx);
    await suratJalanRepository.updateStatus(id, "ready_putaway", tx);

    // NOTE: Auto-increment tiket.mos saat inbound DIHAPUS (2026-09-12).
    // tiket.mos sekarang murni representasi "MOS Mitra" — hanya diisi via laporan mitra (Excel/manual).
    // MOS Sistem (dari inbound) dihitung on-the-fly di reconciliation.repository.js, TIDAK disimpan di kolom ini.

    if (actorId) {
      await suratJalanRepository.createApprovalLog(id, actorId, "inbound_verifikasi", "disetujui", null, tx);
      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: "approve_inbound",
          actor_id: BigInt(actorId),
          data_sebelum: { status: shipment.status },
          data_sesudah: { status: "ready_putaway", surat_jalan_id: id },
        },
      });
    }
  });

  const updatedShipment = await suratJalanRepository.findById(id);

  const actor = await prisma.user_account.findUnique({
    where: { user_id: BigInt(actorId) },
    select: { nama: true, role: true },
  });

  const gudangIds = collectShipmentGudangIds(updatedShipment);

  const sendNotification = async (users, link) => {
    if (!Array.isArray(users) || users.length === 0) return;
    try {
      await notificationService.create({
        userId: users,
        type: "success",
        title: "Inbound Disetujui",
        message: `Pengajuan inbound ${updatedShipment.nomor_surat_jalan} telah disetujui oleh ${actor?.nama || "Supervisor"}.`,
        link,
      });
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi approve inbound:", notifErr);
    }
  };

  if (actor?.role === "supervisor") {
    const creatorId = updatedShipment.created_by ? [Number(updatedShipment.created_by)] : [];
    await sendNotification(creatorId, `/staff/inbound/${updatedShipment.surat_jalan_id}`);
  }

  return await suratJalanRepository.findById(id);
};

const approveOutbound = async (id, actorId) => {
  const shipment = await suratJalanRepository.findById(id);

  if (!shipment) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (shipment.tipe !== "outbound") {
    throw new AppError("Surat Jalan ini bukan outbound.", 400);
  }

  if (shipment.status === "disetujui" || shipment.status === "diterima_didistribusikan") {
    return shipment;
  }

  if (shipment.boq_id && shipment.boq?.status !== "aktif") {
    throw new AppError("Tidak dapat menyetujui outbound — BOQ/Project terkait belum diaktifkan oleh Admin.", 400);
  }

  await prisma.$transaction(async (tx) => {
    await suratJalanRepository.reduceBoqAllocation(shipment, tx);
    await suratJalanRepository.updateStatus(id, "disetujui", tx);

    // NOTE: Auto-increment tiket_material.used saat outbound disetujui DIHAPUS (2026-09-12).
    // used sekarang murni merepresentasikan "Qty Terpasang" dari laporan mitra — hanya diisi via laporan mitra (Excel/manual).
    // Verifikasi SPV outbound tetap berfungsi sebagai tracking status surat jalan, TIDAK menulis ke kolom used.

    if (actorId) {
      await suratJalanRepository.createApprovalLog(id, actorId, "outbound_approval", "disetujui", null, tx);
      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: "approve_outbound",
          actor_id: BigInt(actorId),
          data_sebelum: { status: shipment.status },
          data_sesudah: { status: "disetujui", surat_jalan_id: id },
        },
      });
    }

    const actor = await prisma.user_account.findUnique({
      where: { user_id: BigInt(actorId) },
      select: { nama: true, role: true },
    });

    const gudangIds = collectShipmentGudangIds(shipment);

    const sendNotification = async (users, link) => {
      if (!Array.isArray(users) || users.length === 0) return;
      try {
        await notificationService.create({
          userId: users,
          type: "approval",
          title: "Surat Jalan Disetujui",
          message: `Surat Jalan ${shipment.nomor_surat_jalan} telah disetujui dan siap diproses.`,
          link,
        });
      } catch (notifErr) {
        console.error("Gagal membuat notifikasi approve outbound:", notifErr);
      }
    };

    if (actor?.role === "supervisor") {
      const creatorId = shipment.created_by ? [Number(shipment.created_by)] : [];
      await sendNotification(creatorId, `/staff/outbound/${shipment.surat_jalan_id}`);
    }
  });

  // Ambil data terbaru setelah transaksi berhasil untuk dikembalikan ke controller
  const updatedShipment = await suratJalanRepository.findById(id);
  return updatedShipment;
};

  const confirmDistributed = async (id, actorId, catatanKonfirmasi) => {
    const shipment = await suratJalanRepository.findById(id);

    if (!shipment) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    if (shipment.tipe !== "outbound") {
      throw new AppError("Hanya outbound yang dapat ditandai diterima/didistribusikan.", 400);
    }

    if (shipment.status === "diterima_didistribusikan") {
      return shipment;
    }

    const allowedOrigins = ["tiba_menunggu_konfirmasi"];
    if (!allowedOrigins.includes(shipment.status)) {
      throw new AppError(`Transisi konfirmasi tidak diizinkan dari status ${shipment.status}. Status yang diizinkan: tiba_menunggu_konfirmasi.`, 400);
    }

    if (shipment.picking_selesai === false) {
      throw new AppError("Picking belum selesai. Selesaikan proses picking terlebih dahulu sebelum melakukan distribusi.", 400);
    }

    const approvalNote = catatanKonfirmasi?.trim() || (actorId ? `Dikonfirmasi oleh supervisor (user ${actorId}).` : null);

    await prisma.$transaction(async (tx) => {
      const updated = await tx.surat_jalan.updateMany({
        where: {
          surat_jalan_id: Number(id),
          status: shipment.status,
        },
        data: {
          status: "diterima_didistribusikan",
          dikonfirmasi_oleh: BigInt(actorId),
          dikonfirmasi_at: new Date(),
        },
      });

      if (updated.count === 0) {
        throw new AppError("Status surat jalan sudah berubah. Muat ulang data.", 400);
      }

      if (shipment.status === "tiba_menunggu_konfirmasi" && shipment.items.length > 0) {
        const itemIds = shipment.items.map((it) => Number(it.item_id));
        const picks = await tx.surat_jalan_item_pick.findMany({
          where: { surat_jalan_item_id: { in: itemIds } },
          select: { surat_jalan_item_id: true, qty: true, kondisi_diambil: true },
        });

        const pickSummary = buildItemPickSummary(picks);

        const mismatches = [];
        for (const item of shipment.items) {
          const key = Number(item.item_id);
          const summary = pickSummary.get(key) || { totalQty: 0, kondisiList: [] };
          const totalPick = summary.totalQty;
          const kondisiList = summary.kondisiList || [];
          const qtyDiterima = item.qty_diterima != null ? Number(item.qty_diterima) : null;
          const kondisiDiterima = item.kondisi_diterima || null;

          const qtyMatch = qtyDiterima === null || qtyDiterima === totalPick;
          const kondisiMatch = !kondisiDiterima || (kondisiList.length === 1 && kondisiList.some((k) => k.kondisi === kondisiDiterima));

          if (!qtyMatch || !kondisiMatch) {
            mismatches.push({
              item_id: key,
              qty_diterima: qtyDiterima,
              total_pick: totalPick,
              kondisi_diterima: kondisiDiterima,
              kondisi_diambil: kondisiList.map((k) => k.kondisi),
            });
          }
        }

        if (mismatches.length > 0) {
          if (!catatanKonfirmasi?.trim()) {
            const detail = mismatches.map((m) => `item ${m.item_id}: diterima ${m.qty_diterima}/${m.total_pick}, kondisi ${m.kondisi_diterima} vs ${m.kondisi_diambil}`).join("; ");
            throw new AppError(`Ditemukan selisih antara yang diterima dan yang di-pick. ${detail}`, 400);
          }
        }
      }

      await suratJalanRepository.createApprovalLog(id, actorId, "outbound_delivery", "disetujui", approvalNote, tx);
      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: "confirm_distributed",
          actor_id: BigInt(actorId),
          data_sebelum: { status: shipment.status },
          data_sesudah: { status: "diterima_didistribusikan", surat_jalan_id: id },
        },
      });
    });

    const updatedShipment = await suratJalanRepository.findById(id);

    const actor = await prisma.user_account.findUnique({
      where: { user_id: BigInt(actorId) },
      select: { nama: true, role: true },
    });

    const gudangIds = collectShipmentGudangIds(updatedShipment);

    const sendNotification = async (users, link) => {
      if (!Array.isArray(users) || users.length === 0) return;
      try {
        await notificationService.create({
          userId: users,
          type: "success",
          title: "Outbound Diterima",
          message: `Surat Jalan ${updatedShipment.nomor_surat_jalan} telah diterima/didistribusikan oleh ${actor?.nama || "Supervisor"}.`,
          link,
        });
      } catch (notifErr) {
        console.error("Gagal membuat notifikasi confirm distributed:", notifErr);
      }
    };

    if (actor?.role === "supervisor") {
      const adminIds = await getAllAdminIds(Number(actorId));
      const supervisorIds = await getRelatedSupervisorIds(Number(actorId));
      const staffIds = await getRelatedStaffIds(gudangIds);

      try {
        await sendNotification(adminIds, `/dashboard`);
        await sendNotification(supervisorIds, `/dashboard/supervisor/approval/outbound/${id}`);
        await sendNotification(staffIds, `/staff/outbound/${id}`);
      } catch (notifErr) {
        console.error("Gagal memproses notifikasi confirm distributed:", notifErr);
      }
    }

    return updatedShipment;
  };

const rejectInbound = async (id, catatan = null, actorId) => {
  const shipment = await suratJalanRepository.findById(id);

  if (!shipment) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (shipment.tipe !== "inbound") {
    throw new AppError("Surat Jalan ini bukan inbound.", 400);
  }

    await prisma.$transaction(async (tx) => {
      await suratJalanRepository.updateStatus(id, "ditolak", { catatan }, tx);

      if (actorId) {
        await suratJalanRepository.createApprovalLog(id, actorId, "inbound_verifikasi", "ditolak", catatan, tx);
        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(id),
            aksi: "reject_inbound",
            actor_id: BigInt(actorId),
            data_sebelum: { status: shipment.status },
            data_sesudah: { status: "ditolak", surat_jalan_id: id, catatan },
          },
        });
      }
    });

    const updatedShipment = await suratJalanRepository.findById(id);

    const actor = await prisma.user_account.findUnique({
      where: { user_id: BigInt(actorId) },
      select: { nama: true, role: true },
    });

    const gudangIds = collectShipmentGudangIds(updatedShipment);

    const sendNotification = async (users, link) => {
      if (!Array.isArray(users) || users.length === 0) return;
      try {
        await notificationService.create({
          userId: users,
          type: "warning",
          title: "Inbound Ditolak",
          message: `Pengajuan inbound ${updatedShipment.nomor_surat_jalan} telah ditolak oleh ${actor?.nama || "Supervisor"}.${catatan ? ` Catatan: ${catatan}` : ""}`,
          link,
        });
      } catch (notifErr) {
        console.error("Gagal membuat notifikasi reject inbound:", notifErr);
      }
    };

    if (actor?.role === "supervisor") {
      const creatorId = updatedShipment.created_by ? [Number(updatedShipment.created_by)] : [];
      await sendNotification(creatorId, `/staff/inbound/${updatedShipment.surat_jalan_id}`);
    }

    return updatedShipment;
  };

  const rejectOutbound = async (id, catatan = null, actorId) => {
  const shipment = await suratJalanRepository.findById(id);

  if (!shipment) {
    throw new AppError("Surat Jalan tidak ditemukan.", 404);
  }

  if (shipment.tipe !== "outbound") {
    throw new AppError("Surat Jalan ini bukan outbound.", 400);
  }

    await prisma.$transaction(async (tx) => {
      await suratJalanRepository.updateStatus(id, "ditolak", { catatan }, tx);

      if (actorId) {
        await suratJalanRepository.createApprovalLog(id, actorId, "outbound_approval", "ditolak", catatan, tx);
        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(id),
            aksi: "reject_outbound",
            actor_id: BigInt(actorId),
            data_sebelum: { status: shipment.status },
            data_sesudah: { status: "ditolak", surat_jalan_id: id, catatan },
          },
        });
      }
    });

    const updatedShipment = await suratJalanRepository.findById(id);

    const actor = await prisma.user_account.findUnique({
      where: { user_id: BigInt(actorId) },
      select: { nama: true, role: true },
    });

    const gudangIds = collectShipmentGudangIds(updatedShipment);

    const sendNotification = async (users, link) => {
      if (!Array.isArray(users) || users.length === 0) return;
      try {
        await notificationService.create({
          userId: users,
          type: "warning",
          title: "Outbound Ditolak",
          message: `Pengajuan outbound ${updatedShipment.nomor_surat_jalan} telah ditolak oleh ${actor?.nama || "Supervisor"}.${catatan ? ` Catatan: ${catatan}` : ""}`,
          link,
        });
      } catch (notifErr) {
        console.error("Gagal membuat notifikasi reject outbound:", notifErr);
      }
    };

    if (actor?.role === "supervisor") {
      const creatorId = updatedShipment.created_by ? [Number(updatedShipment.created_by)] : [];
      await sendNotification(creatorId, `/staff/outbound/${updatedShipment.surat_jalan_id}`);
    }

    return updatedShipment;
  };

  const cancelDraft = async (id, catatan = null, actorId) => {
    const shipment = await suratJalanRepository.findById(id);

    if (!shipment) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    if (shipment.status !== "draft_diajukan") {
      throw new AppError("Hanya draft yang belum diproses yang bisa dibatalkan.", 400);
    }

    const actor = await prisma.user_account.findUnique({
      where: { user_id: BigInt(actorId) },
      select: { nama: true, role: true },
    });

    if (actor?.role === "staf_gudang" && Number(shipment.created_by) !== Number(actorId)) {
      throw new AppError("Anda tidak berhak membatalkan draft yang bukan milik Anda.", 403);
    }

    const tahap = shipment.tipe === "inbound" ? "inbound_verifikasi" : "outbound_approval";

    await prisma.$transaction(async (tx) => {
      await suratJalanRepository.updateStatus(id, "ditolak", { catatan }, tx);

      await suratJalanRepository.createApprovalLog(id, actorId, tahap, "ditolak", catatan, tx);

      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: "cancel_draft",
          actor_id: BigInt(actorId),
          data_sebelum: { status: shipment.status },
          data_sesudah: { status: "ditolak", surat_jalan_id: id, catatan },
        },
      });
    });

    return suratJalanRepository.findById(id);
  };

  const putaway = async (suratJalanId, items = [], actorId, scope) => {
    const scopeFinal = scopeWajib(scope);

    const shipment = await suratJalanRepository.findById(suratJalanId);

    if (!shipment) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    if (shipment.tipe !== "inbound") {
      throw new AppError("Hanya inbound yang dapat diproses putaway.", 400);
    }

if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("Daftar item putaway kosong.", 400);
    }

    if (shipment.status === "diterima_didistribusikan") {
      throw new AppError(
        `Surat jalan ini sudah selesai diproses (status: ${shipment.status}), tidak bisa dilakukan putaway ulang.`,
        400
      );
    }

    const gudangTujuanId = Number(shipment.gudang_tujuan_id);

    // Staf hanya boleh melakukan putaway untuk gudang tujuan yang ditugaskan
    // kepadanya. admin_general dan supervisor tidak dibatasi.
    assertGudangDiizinkan(scopeFinal, shipment.gudang_tujuan_id);

    // `zona_id` berasal dari body client, jadi tiap zona harus dipastikan benar
    // milik gudang tujuan surat jalan ini. Tanpa ini staf bisa menaruh stok di
    // zona gudang lain hanya dengan mengarang angka zona.
    if (scopeFinal.dibatasi) {
      for (const item of items) {
        if (item.zona_id === null || item.zona_id === undefined) continue;
        await assertZonaMilikGudang(item.zona_id, gudangTujuanId);
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const qty = Number(item.qty_ditempatkan || 0);
        const zonaId = item.zona_id ? Number(item.zona_id) : null;

        if (qty <= 0) continue;
        if (!zonaId) continue;

        const suratItem = shipment.items.find((si) => Number(si.item_id) === Number(item.item_id));
        if (!suratItem) continue;

        const barangId = Number(suratItem.barang_id);

        const genericStock = await tx.stok_gudang.findFirst({
          where: {
            gudang_id: gudangTujuanId,
            barang_id: barangId,
            kondisi: suratItem.kondisi || "baik",
            zona_id: null,
          },
          orderBy: { stok_id: "asc" },
        });

        if (!genericStock || Number(genericStock.qty || 0) < qty) {
          throw new AppError(
            `Stok generic untuk barang ${barangId} tidak mencukupi untuk putaway (Dibutuhkan: ${qty}, Tersedia: ${genericStock ? Number(genericStock.qty) : 0}).`,
            400
          );
        }

        const newGenericQty = Number(genericStock.qty || 0) - qty;

        if (newGenericQty <= 0) {
          await tx.stok_gudang.delete({
            where: { stok_id: genericStock.stok_id },
          });
        } else {
          await tx.stok_gudang.update({
            where: { stok_id: genericStock.stok_id },
            data: { qty: newGenericQty, updated_at: new Date() },
          });
        }

        await tx.stok_ledger.create({
          data: {
            surat_jalan_item_id: suratItem.item_id,
            barang_id: barangId,
            cluster_id: suratItem.cluster_id || null,
            jenis_mutasi: "out",
            qty: qty,
            saldo_setelah: Math.max(0, newGenericQty),
          },
        });

        const zonaStock = await tx.stok_gudang.findFirst({
          where: {
            gudang_id: gudangTujuanId,
            barang_id: barangId,
            zona_id: zonaId,
            kondisi: suratItem.kondisi || "baik",
          },
          orderBy: { stok_id: "asc" },
        });

        let saldoSetelahZona = qty;
        if (zonaStock) {
          saldoSetelahZona = Number(zonaStock.qty || 0) + qty;
          await tx.stok_gudang.update({
            where: { stok_id: zonaStock.stok_id },
            data: { qty: saldoSetelahZona, updated_at: new Date() },
          });
        } else {
          const created = await tx.stok_gudang.create({
            data: {
              gudang_id: gudangTujuanId,
              barang_id: barangId,
              zona_id: zonaId,
              project_id: null,
              kondisi: suratItem.kondisi || "baik",
              qty: qty,
            },
          });
          saldoSetelahZona = Number(created.qty);
        }

        await tx.stok_ledger.create({
          data: {
            surat_jalan_item_id: suratItem.item_id,
            barang_id: barangId,
            cluster_id: suratItem.cluster_id || null,
            jenis_mutasi: "in",
            qty: qty,
            saldo_setelah: saldoSetelahZona,
          },
        });

        await tx.surat_jalan_item.update({
          where: { item_id: suratItem.item_id },
          data: { zona_id: zonaId },
        });

        await capacityService.recalculateZonaStatus(tx, gudangTujuanId, zonaId);
      }

      await suratJalanRepository.updateStatus(suratJalanId, "diterima_didistribusikan", tx);

      if (actorId) {
        await suratJalanRepository.createApprovalLog(suratJalanId, actorId, "inbound_putaway", "disetujui", null, tx);
        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(suratJalanId),
            aksi: "putaway",
            actor_id: BigInt(actorId),
            data_sebelum: { status: shipment.status },
            data_sesudah: { status: "diterima_didistribusikan", surat_jalan_id: suratJalanId },
          },
        });
      }
    });

    const actor = await prisma.user_account.findUnique({
      where: { user_id: BigInt(actorId) },
      select: { nama: true, role: true },
    });

    const gudangIds = [gudangTujuanId];
    const targets = new Set();

    const adminIds = await getAllAdminIds(Number(actorId));
    adminIds.forEach((id) => targets.add(id));
    const supervisorIds = await getRelatedSupervisorIds(Number(actorId));
    supervisorIds.forEach((id) => targets.add(id));
    const staffIds = await getRelatedStaffIds(gudangIds);
    staffIds.forEach((id) => targets.add(id));

    try {
      if (targets.size > 0) {
        await notificationService.create({
          userId: Array.from(targets),
          type: "success",
          title: "Putaway Selesai",
          message: `Putaway untuk surat jalan ${shipment.nomor_surat_jalan} telah selesai diproses.`,
          link: `/staff/inbound/${suratJalanId}`,
        });
      }
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi putaway:", notifErr);
    }

    return await suratJalanRepository.findById(suratJalanId);
  };

  const retrieve = async (suratJalanId, items = [], actorId, scope) => {
    const scopeFinal = scopeWajib(scope);

    const shipment = await suratJalanRepository.findById(suratJalanId);

    if (!shipment) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    if (shipment.tipe !== "outbound") {
      throw new AppError("Hanya outbound yang dapat diproses retrieval.", 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError("Daftar item retrieval kosong.", 400);
    }

    const gudangAsalId = Number(shipment.gudang_asal_id);
    if (!shipment.gudang_asal_id || Number.isNaN(gudangAsalId) || gudangAsalId <= 0) {
      throw new AppError("Gudang asal tidak valid pada surat jalan ini. Silakan hubungi admin.", 400);
    }

    // Staf hanya boleh melakukan picking dari gudang asal yang ditugaskan
    // kepadanya. admin_general dan supervisor tidak dibatasi.
    assertGudangDiizinkan(scopeFinal, shipment.gudang_asal_id);

    // `zona_id` berasal dari body client, jadi tiap zona harus dipastikan benar
    // milik gudang asal surat jalan ini.
    if (scopeFinal.dibatasi) {
      for (const item of items) {
        if (item.zona_id === null || item.zona_id === undefined) continue;
        await assertZonaMilikGudang(item.zona_id, gudangAsalId);
      }
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await suratJalanRepository.claimPicking(suratJalanId, tx);
      if (!claimed) {
        throw new AppError("Surat jalan ini sudah selesai di-picking.", 400, "ALREADY_PICKED");
      }

      const shipmentInTx = await tx.surat_jalan.findUnique({
        where: { surat_jalan_id: Number(suratJalanId) },
        select: { status: true, picking_selesai: true, gudang_asal_id: true, project_id: true, nomor_surat_jalan: true, items: true },
      });
      if (!shipmentInTx || shipmentInTx.status !== "disetujui") {
        throw new AppError("Surat jalan tidak dalam status disetujui.", 400);
      }

      const pickStockRow = (rows, neededQty) => {
        if (!rows.length) return null;
        const needed = Number(neededQty || 0);
        const withQty = rows.map((r) => ({ ...r, qtyNum: Number(r.qty || 0) }));

        const enoughRow = withQty.find((r) => r.qtyNum >= needed);
        if (enoughRow) return enoughRow;

        return withQty.sort((a, b) => b.qtyNum - a.qtyNum)[0] || null;
      };

      const seenItemIds = new Set();
      const pickedTotals = new Map();

      for (const item of items) {
        const qty = Number(item.qty || 0);
        const zonaId = item.zona_id ? Number(item.zona_id) : null;
        const pickedKondisi = item.kondisi ? String(item.kondisi).toLowerCase() : null;
        const itemId = Number(item.item_id);

        if (qty <= 0) continue;
        if (!zonaId) continue;
        if (!itemId || seenItemIds.has(itemId)) {
          throw new AppError(`Item duplikat atau tidak valid: ${itemId}.`, 400);
        }
        seenItemIds.add(itemId);

        const suratItem = shipmentInTx.items.find((si) => Number(si.item_id) === itemId);
        if (!suratItem) continue;

        const previousPicked = pickedTotals.get(itemId) || 0;
        if (previousPicked + qty > Number(suratItem.qty || 0)) {
          throw new AppError(
            `Qty picking melebihi sisa kebutuhan untuk item ${itemId} (diminta: ${suratItem.qty}, sudah dipick: ${previousPicked}, tambahan: ${qty}).`,
            400,
            "OVER_PICK"
          );
        }
        pickedTotals.set(itemId, previousPicked + qty);

        const barangId = Number(suratItem.barang_id);
        const requestedKondisi = (suratItem.kondisi || "baik").toLowerCase();
        const effectiveKondisi = pickedKondisi || requestedKondisi;

        const stockDimintaRows = await tx.stok_gudang.findMany({
          where: {
            gudang_id: gudangAsalId,
            barang_id: barangId,
            zona_id: zonaId,
            kondisi: requestedKondisi,
          },
          orderBy: { qty: "desc" },
        });
        const stockDiminta = pickStockRow(stockDimintaRows, qty);

        const stockDiambilRows = await tx.stok_gudang.findMany({
          where: {
            gudang_id: gudangAsalId,
            barang_id: barangId,
            zona_id: zonaId,
            kondisi: effectiveKondisi,
          },
          orderBy: { qty: "desc" },
        });
        const stockDiambil = pickStockRow(stockDiambilRows, qty);

        const fallbackStocks = await tx.stok_gudang.findMany({
          where: {
            gudang_id: gudangAsalId,
            barang_id: barangId,
            zona_id: zonaId,
          },
          select: {
            kondisi: true,
            qty: true,
          },
          orderBy: { qty: "desc" },
        });

        const zona = await tx.zona_gudang.findUnique({
          where: { zona_id: zonaId },
          select: { nama_zona: true, kode_zona: true },
        });
        const zonaNama = zona?.nama_zona || zona?.kode_zona || `Zona ${zonaId}`;

        const barangNama =
          suratItem.barang?.nama_barang || suratItem.barang?.kode_perangkat || `Barang ${barangId}`;

        const decision = buildPickDecision({
          requestedKondisi,
          pickedKondisi,
          qty,
          stockDiminta,
          stockDiambil,
          fallbackStocks,
          barangNama,
          zonaNama,
          kondisiLabel: KONDISI_LABEL,
          catatanKondisi: item.catatan_kondisi,
        });

        if (!decision.ok) {
          throw new AppError(decision.message, 400, decision.code);
        }

        const targetStock = decision.isOverride ? stockDiambil : stockDiminta;
        const existingQty = Number(targetStock.qty || 0);
        const deductQty = qty;

        const updated = await tx.stok_gudang.updateMany({
          where: {
            stok_id: targetStock.stok_id,
            qty: { gte: deductQty },
          },
          data: {
            qty: { decrement: deductQty },
            updated_at: new Date(),
          },
        });

        if (updated.count !== 1) {
          throw new AppError(
            `Stok barang ${barangNama} di zona tidak mencukupi (Tersedia: ${existingQty}, Dibutuhkan: ${deductQty}).`,
            400,
            "INSUFFICIENT_STOCK"
          );
        }

        const updatedStock = await tx.stok_gudang.findFirst({
          where: { stok_id: targetStock.stok_id },
        });
        const newQty = updatedStock ? Number(updatedStock.qty || 0) : 0;

        if (newQty <= 0 && updatedStock) {
          await tx.stok_gudang.delete({
            where: { stok_id: targetStock.stok_id },
          });
        }

        await tx.stok_ledger.create({
          data: {
            surat_jalan_item_id: suratItem.item_id,
            barang_id: barangId,
            cluster_id: suratItem.cluster_id || null,
            jenis_mutasi: "out",
            qty: qty,
            saldo_setelah: Math.max(0, newQty),
          },
        });

        await tx.surat_jalan_item_pick.create({
          data: mapPickRow({
            suratJalanItemId: suratItem.item_id,
            gudangId: gudangAsalId,
            zonaId: zonaId,
            requestedKondisi,
            pickedKondisi: effectiveKondisi,
            qty,
            catatanKondisi: decision.catatanFinal,
            actorId,
          }),
        });

        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(suratJalanId),
            aksi: "retrieve",
            actor_id: BigInt(actorId),
            data_sebelum: null,
            data_sesudah: {
              surat_jalan_id: Number(suratJalanId),
              surat_jalan_item_id: Number(suratItem.item_id),
              barang_id: Number(barangId),
              zona_id: Number(zonaId),
              qty: Number(qty),
              kondisi_diminta: requestedKondisi,
              kondisi_diambil: effectiveKondisi,
              override: decision.isOverride,
              catatan_kondisi: decision.catatanFinal,
            },
          },
        });

        await capacityService.recalculateZonaStatus(tx, gudangAsalId, zonaId);
      }

      if (actorId) {
        await suratJalanRepository.createApprovalLog(suratJalanId, actorId, "outbound_approval", "disetujui", null, tx);
        await tx.audit_log.create({
          data: {
            entity_type: "surat_jalan",
            entity_id: BigInt(suratJalanId),
            aksi: "retrieve",
            actor_id: BigInt(actorId),
             data_sebelum: { status: shipmentInTx.status },
             data_sesudah: { status: "disetujui", surat_jalan_id: suratJalanId },
          },
        });
      }
    });

    try {
      const actor = await prisma.user_account.findUnique({
        where: { user_id: BigInt(actorId) },
        select: { nama: true, role: true },
      });

      const gudangIds = [gudangAsalId];

      const sendNotification = async (users, link) => {
        if (!Array.isArray(users) || users.length === 0) return;
        try {
          await notificationService.create({
            userId: users,
            type: "success",
            title: "Retrieval Selesai",
            message: `Retrieval untuk surat jalan ${shipment.nomor_surat_jalan} telah selesai diproses.`,
            link,
          });
        } catch (notifErr) {
          console.error("Gagal membuat notifikasi retrieval:", notifErr);
        }
      };

      const adminIds = await getAllAdminIds(Number(actorId));
      const supervisorIds = await getRelatedSupervisorIds(Number(actorId));
      const staffIds = await getRelatedStaffIds(gudangIds);

      await sendNotification(adminIds, `/dashboard`);
      await sendNotification(supervisorIds, `/dashboard/supervisor/approval/outbound/${suratJalanId}`);
      await sendNotification(staffIds, `/staff/outbound/${suratJalanId}`);
    } catch (notifErr) {
      console.error("Gagal memproses notifikasi retrieval:", notifErr);
    }

    return await suratJalanRepository.findById(suratJalanId);
  };

  const updateDeliveryStatus = async (id, body, actorId, scope) => {
    const scopeFinal = scopeWajib(scope);

    const shipment = await suratJalanRepository.findById(id);

    if (!shipment) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    if (shipment.tipe !== "outbound") {
      throw new AppError("Hanya surat jalan outbound yang dapat diubah status distribusinya.", 400);
    }

    // Staf boleh mengubah status distribusi bila gudang asal ATAU gudang tujuannya
    // termasuk dalam daftar penugasannya. admin_general dan supervisor tidak
    // dibatasi.
    assertAdaGudangDiizinkan(scopeFinal, [shipment.gudang_asal_id, shipment.gudang_tujuan_id]);

    const allowedOrigins = ["disetujui", "sedang_dikirim"];
    if (!allowedOrigins.includes(shipment.status)) {
      throw new AppError(`Status surat jalan saat ini (${shipment.status}) tidak dapat diubah ke status distribusi.`, 400);
    }

    if (shipment.status === "disetujui" && shipment.picking_selesai === false) {
      throw new AppError("Picking belum selesai. Selesaikan proses picking terlebih dahulu sebelum melakukan distribusi.", 400);
    }

    if (!actorId) {
      throw new AppError("Actor tidak valid untuk melakukan perubahan status distribusi.", 400);
    }

    const newStatus = body.status;
    if (!["sedang_dikirim", "tiba_menunggu_konfirmasi", "diterima_didistribusikan"].includes(newStatus)) {
      throw new AppError("Status distribusi tidak valid.", 400);
    }

    if (shipment.status === newStatus) {
      return shipment;
    }

    // Laporan tiba oleh STAF kini langsung menutup Surat Jalan
    // (`diterima_didistribusikan`) tanpa menunggu konfirmasi supervisor
    // — keputusan bisnis. Dari `tiba_menunggu_konfirmasi` (SJ lama yang
    // sudah terlanjur masuk status itu), konfirmasi tetap HANYA lewat
    // endpoint supervisor `confirm-distributed` — tidak diubah di sini.
    const validTransitions = {
      disetujui: ["sedang_dikirim"],
      sedang_dikirim: ["tiba_menunggu_konfirmasi", "diterima_didistribusikan", "sedang_dikirim"],
    };
    if (!validTransitions[shipment.status]?.includes(newStatus)) {
      if (newStatus === "diterima_didistribusikan") {
        throw new AppError("Konfirmasi diterima hanya dapat dilakukan oleh supervisor melalui konfirmasi distribusi.", 400);
      }
      throw new AppError(
        `Transisi status tidak diizinkan: ${shipment.status} -> ${newStatus}.`,
        400
      );
    }

    const updateData = {
      status: newStatus,
    };

    // Laporan tiba staf yang langsung final: catat waktu terima juga.
    // (`dikonfirmasi_oleh` sengaja TIDAK diisi — kolom itu khusus konfirmasi
    // supervisor lewat endpoint terpisah, dan jalur ini bukan konfirmasi.)
    if (newStatus === "diterima_didistribusikan") {
      updateData.tanggal_diterima = new Date();
    }

    if (body.estimasi_tiba) {
      updateData.estimasi_tiba = new Date(body.estimasi_tiba);
    }

    if (body.catatan_distribusi !== undefined && body.catatan_distribusi !== "") {
      updateData.catatan_distribusi = body.catatan_distribusi;
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.surat_jalan.updateMany({
        where: {
          surat_jalan_id: Number(id),
          status: shipment.status,
        },
        data: updateData,
      });

      if (updated.count === 0) {
        throw new AppError("Status surat jalan sudah berubah. Muat ulang data.", 400);
      }

      // Jalur lapor tiba staf: baik status antara (`tiba_menunggu_konfirmasi`,
      // dipakai SJ lama) maupun status final (`diterima_didistribusikan`,
      // laporan baru) sama-sama menyimpan data kedatangan per item.
      if (newStatus === "tiba_menunggu_konfirmasi" || newStatus === "diterima_didistribusikan") {
        if (!Array.isArray(body.items) || body.items.length === 0) {
          throw new AppError("Daftar item lapor tiba kosong.", 400);
        }

        const itemIds = shipment.items.map((it) => Number(it.item_id));
        const requestedIds = body.items.map((it) => Number(it.item_id));
        const uniqueRequested = new Set(requestedIds);
        if (uniqueRequested.size !== requestedIds.length) {
          throw new AppError("Daftar item lapor tiba mengandung duplikat.", 400);
        }
        if (!itemIds.every((id) => uniqueRequested.has(id)) || uniqueRequested.size !== itemIds.length) {
          throw new AppError("Daftar item lapor tiba tidak sama dengan item surat jalan.", 400);
        }

        const itemIdToPickQty = new Map();
        const pickRows = await tx.surat_jalan_item_pick.findMany({
          where: { surat_jalan_item_id: { in: itemIds } },
          select: { surat_jalan_item_id: true, qty: true },
        });
        for (const pick of pickRows) {
          const prev = itemIdToPickQty.get(Number(pick.surat_jalan_item_id)) || 0;
          itemIdToPickQty.set(Number(pick.surat_jalan_item_id), prev + Number(pick.qty || 0));
        }

        for (const incoming of body.items) {
          const itemId = Number(incoming.item_id);
          const suratItem = shipment.items.find((it) => Number(it.item_id) === itemId);
          if (!suratItem) {
            throw new AppError(`Item ${itemId} tidak ditemukan di surat jalan.`, 400);
          }
          const qtyDiterima = Number(incoming.qty_diterima || 0);
          if (qtyDiterima < 0) {
            throw new AppError(`Qty diterima untuk item ${itemId} tidak boleh negatif.`, 400);
          }
          const totalPick = itemIdToPickQty.get(itemId) || 0;
          if (qtyDiterima > totalPick) {
            throw new AppError(`Qty diterima item ${itemId} (${qtyDiterima}) melebihi total yang di-pick (${totalPick}).`, 400);
          }
        }

        await tx.surat_jalan.update({
          where: { surat_jalan_id: Number(id) },
          data: {
            dilaporkan_tiba_oleh: BigInt(actorId),
            dilaporkan_tiba_at: new Date(),
            catatan_tiba: body.catatan_tiba || null,
            bukti_tiba_url: body.bukti_tiba_url || null,
          },
        });

        for (const incoming of body.items) {
          const itemId = Number(incoming.item_id);
          await tx.surat_jalan_item.update({
            where: { item_id: itemId },
            data: {
              qty_diterima: incoming.qty_diterima != null ? incoming.qty_diterima : null,
              kondisi_diterima: incoming.kondisi_diterima || null,
              catatan_penerimaan: incoming.catatan_penerimaan || null,
            },
          });
        }
      }

      // `confirm_distributed` TIDAK ditulis di sini lagi — jalur konfirmasi
      // supervisor tetap menulisnya sendiri lewat confirmDistributed().
      await suratJalanRepository.createApprovalLog(id, actorId, "outbound_delivery", "disetujui", body.catatan_distribusi || null, tx);
      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: newStatus === "sedang_dikirim" ? "start_delivery" : "report_arrival",
          actor_id: BigInt(actorId),
          data_sebelum: { status: shipment.status },
          data_sesudah: { status: newStatus, surat_jalan_id: id },
        },
      });
    });

    // --- Notifikasi info ke supervisor & admin (HANYA setelah transaksi sukses).
    // Laporan baru oleh staf langsung menutup SJ; tidak ada aksi konfirmasi —
    // notifikasi murni informasi. (Laporan SJ lama di status
    // tiba_menunggu_konfirmasi tetap dikonfirmasi lewat jalur supervisor lama,
    // dan tidak melewati blok ini — statusnya tidak berubah menjadi final di
    // sini.)
    if (shipment.status === "sedang_dikirim" && newStatus === "diterima_didistribusikan") {
      try {
        const pelapor = await prisma.user_account.findUnique({
          where: { user_id: BigInt(actorId) },
          select: { nama: true },
        });
        const waktuTiba = new Date();
        const projectInfo = shipment.project?.nama_project
          ? shipment.project.nama_project
          : shipment.project_id
            ? `project #${shipment.project_id}`
            : "-";

        const pesan = `Surat Jalan ${shipment.nomor_surat_jalan} (Project ${projectInfo}) dilaporkan tiba oleh ${pelapor?.nama || "staf"} pada ${waktuTiba.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} WIB.`;

        // Dua panggilan per role (bukan gabungan), karena target link berbeda
        // dan GlobalHeader merender link notification untuk role tersebut.
        await notificationService.create({
          role: "supervisor",
          type: "success",
          title: "Barang Tiba (Laporan Staf)",
          message: pesan,
          link: `/dashboard/supervisor/approval/outbound/${id}`,
        });
        await notificationService.create({
          role: "admin_general",
          type: "success",
          title: "Barang Tiba (Laporan Staf)",
          message: pesan,
          link: `/dashboard`,
        });
      } catch (notifErr) {
        // Notifikasi bersifat pelengkap: kegagalannya tidak boleh membatalkan
        // laporan tiba yang sudah tersimpan (pola yang sama dengan blok di bawah).
        console.error("Gagal membuat notifikasi laporan tiba:", notifErr);
      }
    }

    if (newStatus === "sedang_dikirim") {
      const actor = await prisma.user_account.findUnique({
        where: { user_id: BigInt(actorId) },
        select: { nama: true, role: true },
      });

      const gudangIds = [shipment.gudang_asal_id, shipment.gudang_tujuan_id].filter(Boolean);

      const sendNotification = async (users, link) => {
        if (!Array.isArray(users) || users.length === 0) return;
        try {
          await notificationService.create({
            userId: users,
            type: "info",
            title: "Outbound Dalam Pengiriman",
            message: `Surat jalan ${shipment.nomor_surat_jalan} sedang dalam pengiriman.`,
            link,
          });
        } catch (notifErr) {
          console.error("Gagal membuat notifikasi delivery status:", notifErr);
        }
      };

      const adminIds = await getAllAdminIds(Number(actorId));
      const supervisorIds = await getRelatedSupervisorIds(Number(actorId));
      const staffIds = await getRelatedStaffIds(gudangIds);

      try {
        await sendNotification(adminIds, `/dashboard`);
        await sendNotification(supervisorIds, `/dashboard/supervisor/approval/outbound/${id}`);
        await sendNotification(staffIds, `/staff/outbound/${id}`);
      } catch (notifErr) {
        console.error("Gagal memproses notifikasi delivery status:", notifErr);
      }
    }

    return await suratJalanRepository.findById(id);
  };

  // -------------------------------------------------------------------------
  // Gudang Transit (gudang bertipe dadakan) — checkpoint perjalanan pada SJ
  // yang SAMA. Satu SJ tetap menunjuk tujuan akhir; titipan berikutnya dicatat
  // sebagai stok GUDANG TRANSIT sungguhan (stok_gudang + stok_ledger).
  // Aksi ini hanya dipanggil staf gudang dari halaman staff.
  // -------------------------------------------------------------------------

  /**
   * Validasi keputusan: barang hanya boleh dititipkan di gudang `dadakan`
   * yang project_id-nya sama dengan project Surat Jalan. Berlaku umum di
   * backend (validasi data, bukan kebijakan role).
   */
  const validasiGudangTransit = async (shipment, gudangId) => {
    const gudang = await prisma.gudang.findUnique({
      where: { gudang_id: Number(gudangId) },
      select: { gudang_id: true, nama_gudang: true, tipe: true, is_aktif: true, project_id: true },
    });

    if (!gudang) {
      throw new AppError("Gudang Transit tidak ditemukan.", 404);
    }

    if (gudang.tipe !== "dadakan") {
      throw new AppError(
        `Hanya Gudang Transit (gudang bertipe dadakan) yang boleh menerima titipan barang. Gudang "${gudang.nama_gudang}" bertipe ${gudang.tipe}.`,
        400
      );
    }

    if (gudang.is_aktif === false) {
      throw new AppError(`Gudang Transit "${gudang.nama_gudang}" sudah tidak aktif.`, 400);
    }

    if (shipment.project_id === null || shipment.project_id === undefined) {
      throw new AppError(
        "Surat Jalan ini tidak memiliki project sehingga barang tidak dapat dititipkan di Gudang Transit.",
        400
      );
    }

    if (String(gudang.project_id) !== String(shipment.project_id)) {
      const [projectTransit, projectSj] = await Promise.all([
        gudang.project_id ? prisma.project.findUnique({ where: { project_id: Number(gudang.project_id) }, select: { nama_project: true } }) : null,
        prisma.project.findUnique({ where: { project_id: Number(shipment.project_id) }, select: { nama_project: true } }),
      ]);

      throw new AppError(
        `Gudang Transit "${gudang.nama_gudang}" terhubung ke project ${projectTransit?.nama_project || gudang.project_id}, sedangkan Surat Jalan ini project ${projectSj?.nama_project || shipment.project_id}. Titipan dibatalkan.`,
        400
      );
    }

    return gudang;
  };

  /**
   * Total qty per item yang SEDANG dititipkan (checkpoint yang masih terbuka).
   *
   * Checkpoint yang sudah `berangkat_at` tidak dihitung: qty-nya sudah kembali
   * ke perjalanan (leg penuh), jadi boleh dititipkan lagi di transit berikutnya.
   * Kalau dihitung semua, satu SJ cuma boleh sekali titip sepanjang perjalanan.
   */
  const hitungSudahDititipkan = (checkpoints) => {
    const total = new Map();
    for (const checkpoint of checkpoints || []) {
      if (checkpoint.berangkat_at) continue;
      const items = Array.isArray(checkpoint.items) ? checkpoint.items : [];
      for (const item of items) {
        const key = Number(item.item_id);
        total.set(key, (total.get(key) || 0) + Number(item.qty || 0));
      }
    }
    return total;
  };

  /** Qty yang masih boleh dititipkan = total pick − yang sudah dititipkan. */
  const hitungSisaTitipan = async (shipment) => {
    const itemIds = shipment.items.map((it) => Number(it.item_id));
    const picks = await prisma.surat_jalan_item_pick.findMany({
      where: { surat_jalan_item_id: { in: itemIds } },
      select: { surat_jalan_item_id: true, qty: true },
    });
    const pickSummary = buildItemPickSummary(picks);

    const checkpoints = await suratJalanRepository.findTransitCheckpoints(shipment.surat_jalan_id);
    const sudahDititipkan = hitungSudahDititipkan(checkpoints);

    const sisa = new Map();
    for (const item of shipment.items) {
      const key = Number(item.item_id);
      const totalPick = pickSummary.get(key)?.totalQty || 0;
      sisa.set(key, Math.max(0, totalPick - (sudahDititipkan.get(key) || 0)));
    }
    return sisa;
  };

  /** Titipan barang ke Gudang Transit — stok transit MASUK. */
  const tibaDiTransit = async (id, body, actorId, scope) => {
    const scopeFinal = scopeWajib(scope);

    const shipment = await suratJalanRepository.findById(id);
    if (!shipment) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }
    if (shipment.tipe !== "outbound") {
      throw new AppError("Hanya surat jalan outbound yang dapat menitipkan barang di Gudang Transit.", 400);
    }
    if (shipment.status !== "sedang_dikirim") {
      throw new AppError(
        `Barang baru dapat dititipkan saat sedang dikirim. Status saat ini: ${shipment.status}.`,
        400
      );
    }

    // Staf harus ditugaskan ke gudang terkait (asal, transit, atau tujuan).
    assertAdaGudangDiizinkan(scopeFinal, [shipment.gudang_asal_id, shipment.gudang_tujuan_id, body.gudang_id]);

    // Validasi gudang transit terhadap project SJ — sebelum transaksi.
    await validasiGudangTransit(shipment, body.gudang_id);

    // Validasi item: harus ada di SJ, dan qty tidak melebihi sisa titipan.
    const sisa = await hitungSisaTitipan(shipment);
    const itemsPayload = [];

    for (const incoming of body.items) {
      const suratItem = shipment.items.find((it) => Number(it.item_id) === Number(incoming.item_id));
      if (!suratItem) {
        throw new AppError(`Item ${incoming.item_id} tidak ditemukan di surat jalan.`, 400);
      }

      const qty = Number(incoming.qty || 0);
      if (qty <= 0) {
        throw new AppError(`Qty dititipkan untuk item ${incoming.item_id} harus lebih dari 0.`, 400);
      }

      const sisaQty = sisa.get(Number(incoming.item_id)) || 0;
      if (qty > sisaQty) {
        throw new AppError(
          `Qty dititipkan item ${incoming.item_id} (${qty}) melebihi sisa yang dapat dititipkan (${sisaQty}).`,
          400
        );
      }

      const units = Array.isArray(incoming.units) ? incoming.units : [];
      let kondisi = (incoming.kondisi || suratItem.kondisi || "baik").toLowerCase();
      if (!KONDISI_LABEL[kondisi]) {
        throw new AppError(`Kondisi "${kondisi}" tidak dikenal.`, 400);
      }

      // Kondisi ringkasan = kondisi TERBURUK dari penilaian per unit
      // (pola yang sama dengan receiveInbound), supaya stok transit terkelompok
      // dengan benar. Detail per unit disimpan di checkpoint.
      if (units.length > 0) {
        const KONDISI_SEVERITY = { baik: 0, rusak_ringan: 1, tidak_sesuai_spek: 2, rusak_berat: 3, doa: 4 };
        kondisi = units.reduce((terburuk, unit) => {
          const kandidat = String(unit.kondisi || "").toLowerCase();
          return (KONDISI_SEVERITY[kandidat] ?? -1) > (KONDISI_SEVERITY[terburuk] ?? -1) ? kandidat : terburuk;
        }, kondisi);
      }

      itemsPayload.push({
        item_id: Number(incoming.item_id),
        barang_id: Number(suratItem.barang_id),
        qty,
        kondisi,
        catatan: incoming.catatan || null,
        units: units.map((u) => ({
          nomor_unit: Number(u.nomor_unit),
          kondisi: String(u.kondisi || "").toLowerCase(),
          catatan: u.catatan || null,
        })),
      });
    }

    const urutanTransit = await prisma.surat_jalan_transit.aggregate({
      where: { surat_jalan_id: Number(id) },
      _max: { urutan: true },
    });
    const urutanBerikut = (urutanTransit._max.urutan || 0) + 1;

    await prisma.$transaction(async (tx) => {
      // Claim atomik: hanya satu request boleh melewati status ini.
      const claimed = await suratJalanRepository.claimStatusTransit(
        id,
        "sedang_dikirim",
        "tiba_di_transit",
        tx
      );
      if (!claimed) {
        throw new AppError("Status Surat Jalan sudah berubah. Muat ulang data.", 400);
      }

      // Stok transit masuk — pola addInboundStock (stok generic + ledger in).
      await suratJalanRepository.addInboundStock(shipment, tx, {
        gudangId: Number(body.gudang_id),
        items: itemsPayload,
      });

      try {
        await suratJalanRepository.createTransitCheckpoint(
          {
            surat_jalan_id: Number(id),
            gudang_id: Number(body.gudang_id),
            urutan: urutanBerikut,
            tiba_by: BigInt(actorId),
            catatan_tiba: body.catatan_tiba || null,
            bukti_url: body.bukti_url || null,
            items: itemsPayload,
          },
          tx
        );
      } catch (err) {
        if (err && err.code === "P2002") {
          throw new AppError("Checkpoint Gudang Transit untuk Surat Jalan ini sudah tercatat.", 409);
        }
        throw err;
      }

      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: "tiba_di_transit",
          actor_id: BigInt(actorId),
          data_sebelum: { status: "sedang_dikirim" },
          data_sesudah: {
            surat_jalan_id: Number(id),
            status: "tiba_di_transit",
            urutan: urutanBerikut,
            gudang_id: Number(body.gudang_id),
            total_qty: itemsPayload.reduce((sum, it) => sum + it.qty, 0),
          },
        },
      });
    });

    return await suratJalanRepository.findById(id);
  };

  /** Berangkat dari Gudang Transit ke tujuan akhir — leg penuh, stok transit KELUAR. */
  const lanjutDariTransit = async (id, body, actorId, scope) => {
    const scopeFinal = scopeWajib(scope);

    const shipment = await suratJalanRepository.findById(id);
    if (!shipment) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }
    if (shipment.tipe !== "outbound") {
      throw new AppError("Hanya surat jalan outbound yang dapat diteruskan dari Gudang Transit.", 400);
    }
    if (shipment.status !== "tiba_di_transit") {
      throw new AppError(
        `Perjalanan baru dapat dilanjutkan saat barang sedang dititipkan di Gudang Transit. Status saat ini: ${shipment.status}.`,
        400
      );
    }

    const checkpoint =
      await suratJalanRepository.findOpenTransitCheckpoint(shipment.surat_jalan_id);
    if (!checkpoint) {
      throw new AppError("Checkpoint Gudang Transit masih terbuka pada Surat Jalan ini.", 400);
    }

    assertAdaGudangDiizinkan(scopeFinal, [
      shipment.gudang_asal_id,
      shipment.gudang_tujuan_id,
      checkpoint.gudang_id,
    ]);

    const checkpointItems = Array.isArray(checkpoint.items) ? checkpoint.items : [];
    if (checkpointItems.length === 0) {
      throw new AppError("Data titipan pada checkpoint Gudang Transit kosong. Hubungi admin.", 400);
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await suratJalanRepository.claimStatusTransit(
        id,
        "tiba_di_transit",
        "sedang_dikirim",
        tx
      );
      if (!claimed) {
        throw new AppError("Status Surat Jalan sudah berubah. Muat ulang data.", 400);
      }

      // Leg penuh: keluarkan seluruh sisa titipan checkpoint ini.
      await suratJalanRepository.deductTransitStock(
        {
          checkpoint,
          items: checkpointItems,
          projectId: shipment.project_id,
          actorId,
        },
        tx
      );

      const closed = await suratJalanRepository.updateTransitDeparture(
        checkpoint.transit_id,
        actorId,
        body?.catatan_berangkat,
        tx
      );
      if (!closed) {
        throw new AppError("Titipan Gudang Transit ini sudah pernah diberangkatkan.", 409);
      }

      await tx.audit_log.create({
        data: {
          entity_type: "surat_jalan",
          entity_id: BigInt(id),
          aksi: "lanjut_dari_transit",
          actor_id: BigInt(actorId),
          data_sebelum: { status: "tiba_di_transit" },
          data_sesudah: {
            surat_jalan_id: Number(id),
            status: "sedang_dikirim",
            urutan: Number(checkpoint.urutan),
            gudang_id: Number(checkpoint.gudang_id),
            total_qty: checkpointItems.reduce((sum, it) => sum + Number(it.qty || 0), 0),
          },
        },
      });
    });

    return await suratJalanRepository.findById(id);
  };

  const addItemFoto = async (suratJalanId, itemId, body, actorId, scope) => {
    const scopeFinal = scopeWajib(scope);

    const suratJalan = await suratJalanRepository.findById(suratJalanId);

    if (!suratJalan) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    // Staf hanya boleh menambah foto pada surat jalan yang gudang asal atau gudang
    // tujuannya ditugaskan kepadanya. admin_general dan supervisor tidak dibatasi.
    assertAdaGudangDiizinkan(scopeFinal, [suratJalan.gudang_asal_id, suratJalan.gudang_tujuan_id]);

    const item = suratJalan.items.find((i) => Number(i.item_id) === Number(itemId));

    if (!item) {
      throw new AppError("Item surat jalan tidak ditemukan.", 404);
    }

    const { url, filename, mimetype, ukuran_bytes } = body;

    if (!url) {
      throw new AppError("URL foto wajib diisi.", 400);
    }

    const foto = await suratJalanRepository.addItemFoto(itemId, {
      url,
      filename,
      mimetype,
      ukuran_bytes: ukuran_bytes ? Number(ukuran_bytes) : null,
    });

    await suratJalanRepository.updateItemVerification(itemId, {
      diperiksa_oleh: actorId,
      diperiksa_pada: new Date(),
    });

    return foto;
  };

  const deleteItemFoto = async (suratJalanId, itemId, fotoId, actorId, scope) => {
    const scopeFinal = scopeWajib(scope);

    const suratJalan = await suratJalanRepository.findById(suratJalanId);

    if (!suratJalan) {
      throw new AppError("Surat Jalan tidak ditemukan.", 404);
    }

    // Sama seperti addItemFoto: hanya staf yang gudang asal atau tujuan surat
    // jalan ini termasuk penugasannya boleh menghapus foto.
    assertAdaGudangDiizinkan(scopeFinal, [suratJalan.gudang_asal_id, suratJalan.gudang_tujuan_id]);

    const item = suratJalan.items.find((i) => Number(i.item_id) === Number(itemId));

    if (!item) {
      throw new AppError("Item surat jalan tidak ditemukan.", 404);
    }

    const foto = item.fotos?.find((f) => Number(f.foto_id) === Number(fotoId));

    if (!foto) {
      throw new AppError("Foto tidak ditemukan untuk item ini.", 404);
    }

    await suratJalanRepository.deleteItemFoto(fotoId);

    return { deleted: true };
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
    buildPickDecision,
    mapPickRow,
    buildItemPickSummary,
  };