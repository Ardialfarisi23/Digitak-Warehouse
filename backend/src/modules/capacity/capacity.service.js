/**
 * capacity.service.js
 * ---------------------------------------------------------------------------
 * Logic utama monitoring kapasitas gudang & zona otomatis.
 *
 * ATURAN:
 *   - SISA = kapasitas_maksimum - SUM(qty)
 *   - Threshold ambil dari capacity.config.js (satu-satunya sumber kebenaran).
 *   - recalculateZonaStatus() dipanggil dari titik mutasi stok dengan
 *     transaction client (tx) yang sama. JANGAN buka transaksi baru.
 *   - Zona dengan status_kecukupan_source = 'MANUAL' di-SKIP total
 *     (override supervisor/admin menang).
 *   - Zona tanpa kapasitas_maksimum (NULL) → CUKUP, tidak dihitung.
 * ---------------------------------------------------------------------------
 */

const prisma = require("../../config/prisma");
const CFG = require("../../config/capacity.config");

/**
 * Klasifikasi sisa kapasitas menjadi status_kecukupan_zona.
 * Pure function, tidak butuh DB — dipakai juga di unit test.
 *
 * @param {number|null} kapasitasMaksimum
 * @param {number} qtyTerpakai
 * @returns {"CUKUP"|"MENDEKATI_PENUH"|"TIDAK_CUKUP"}
 */
function classifyRemaining(kapasitasMaksimum, qtyTerpakai) {
  if (kapasitasMaksimum == null || kapasitasMaksimum <= 0) {
    // Kapasitas belum diatur → default aman.
    return "CUKUP";
  }
  const sisa = kapasitasMaksimum - Number(qtyTerpakai || 0);
  if (sisa <= CFG.REMAINING_TIDAK_CUKUP) return "TIDAK_CUKUP";
  if (sisa <= CFG.REMAINING_MENDEKATI_PENUH) return "MENDEKATI_PENUH";
  return "CUKUP";
}

/**
 * Hitung total qty di sebuah zona (hanya stok dengan zona_id = zonaId).
 * Mengabaikan stok generic (zona_id = null).
 *
 * @param {object} tx  Prisma transaction client
 * @param {BigInt|number} gudangId
 * @param {BigInt|number} zonaId
 * @returns {Promise<number>}
 */
async function sumQtyInZona(tx, gudangId, zonaId) {
  const agg = await tx.stok_gudang.aggregate({
    where: {
      gudang_id: Number(gudangId),
      zona_id: Number(zonaId),
    },
    _sum: { qty: true },
  });
  return Number(agg._sum.qty || 0);
}

/**
 * Hitung ulang status_kecukupan satu zona, dengan aturan:
 *   1. Ambil zona (cek source).
 *   2. Hitung SUM(qty) di zona.
 *   3. Klasifikasi berdasarkan SISA.
 *   4. Jika source = MANUAL → SKIP (tidak ditimpa sistem).
 *   5. Update hanya bila source = AUTO atau NULL.
 *
 * Aman dipanggil dari dalam transaksi manapun — TIDAK membuat transaksi baru.
 *
 * @param {object} tx            Prisma transaction client (wajib)
 * @param {BigInt|number} gudangId
 * @param {BigInt|number|null} zonaId   null = skip
 * @param {BigInt|number|null} actorId  optional, untuk audit/log (tidak dipakai di tahap ini)
 * @returns {Promise<{updated: boolean, source: string|null, status: string, sisa: number|null, kapasitas: number|null, reason: string}>}
 */
async function recalculateZonaStatus(tx, gudangId, zonaId, actorId = null) {
  if (!tx) {
    throw new Error("recalculateZonaStatus: tx (transaction client) wajib diberikan");
  }
  if (zonaId == null) {
    return {
      updated: false,
      source: null,
      status: null,
      sisa: null,
      kapasitas: null,
      reason: "zonaId null (stok generic — tidak dihitung)",
    };
  }

  const zona = await tx.zona_gudang.findUnique({
    where: { zona_id: Number(zonaId) },
    select: {
      zona_id: true,
      gudang_id: true,
      kapasitas_maksimum: true,
      status_kecukupan: true,
      status_kecukupan_source: true,
    },
  });

  if (!zona || Number(zona.gudang_id) !== Number(gudangId)) {
    return {
      updated: false,
      source: null,
      status: null,
      sisa: null,
      kapasitas: null,
      reason: "zona tidak ditemukan atau gudang_id tidak cocok",
    };
  }

  // Override manual menang — sistem tidak boleh menimpa.
  if (zona.status_kecukupan_source === "MANUAL") {
    return {
      updated: false,
      source: "MANUAL",
      status: zona.status_kecukupan,
      sisa: null,
      kapasitas: zona.kapasitas_maksimum,
      reason: "skip: source=MANUAL (override menang)",
    };
  }

  const qty = await sumQtyInZona(tx, zona.gudang_id, zona.zona_id);
  const kapasitas = zona.kapasitas_maksimum;
  const newStatus = classifyRemaining(kapasitas, qty);
  const sisa = kapasitas == null ? null : kapasitas - qty;

  // Kalau status sudah sama & source sudah AUTO → no-op (hemat write).
  if (zona.status_kecukupan === newStatus && zona.status_kecukupan_source === "AUTO") {
    return {
      updated: false,
      source: "AUTO",
      status: newStatus,
      sisa,
      kapasitas,
      reason: "no-op: status sudah sama",
    };
  }

  await tx.zona_gudang.update({
    where: { zona_id: zona.zona_id },
    data: {
      status_kecukupan: newStatus,
      status_kecukupan_source: "AUTO",
    },
  });

  return {
    updated: true,
    source: "AUTO",
    status: newStatus,
    sisa,
    kapasitas,
    reason: "ok",
  };
}

/**
 * Hitung agregasi worst-case status gudang dari zona-zonanya.
 * Ranking: TIDAK_CUKUP > MENDEKATI_PENUH > CUKUP.
 * Dipakai untuk mengisi status_kecukupan_gudang (cache opsional)
 * dan untuk response dashboard.
 *
 * @param {object} tx
 * @param {BigInt|number} gudangId
 * @returns {Promise<{status: string, totalZona: number, totalZonaDinilai: number}>}
 */
async function aggregateWarehouseStatus(tx, gudangId) {
  const zonas = await tx.zona_gudang.findMany({
    where: { gudang_id: Number(gudangId) },
    select: { status_kecukupan: true },
  });
  if (zonas.length === 0) {
    return { status: "CUKUP", totalZona: 0, totalZonaDinilai: 0 };
  }
  let worst = "CUKUP";
  for (const z of zonas) {
    const s = z.status_kecukupan || "CUKUP";
    if (CFG.RANK[s] > CFG.RANK[worst]) worst = s;
  }
  return { status: worst, totalZona: zonas.length, totalZonaDinilai: zonas.length };
}

module.exports = {
  classifyRemaining,
  sumQtyInZona,
  recalculateZonaStatus,
  aggregateWarehouseStatus,
};