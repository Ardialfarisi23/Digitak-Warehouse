const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const { Decimal } = require("@prisma/client");

/**
 * Shared utility helpers for reconciliation metric calculations.
 *
 * These pure functions exist to provide a single source of truth for the
 * BOQ/MOS/Used/Remains formulas and reconciliation status logic.
 *
 * - `reconciliation.repository.getInventory` (per-barang) — memakai helper
 *   MOS kanonik di bawah.
 * - `dashboard.repository.getProjectSummary` (per-project aggregate) — uses
 *   `aggregateProjectStatus` on the per-barang statuses returned by
 *   `reconciliation.repository.getInventory`, so the admin dashboard stays
 *   numerically & logically consistent with `/dashboard/reconciliation`.
 */

/**
 * DEFINISI FINAL MOS SISTEM (K5) — BUG-06.
 *
 * MOS (Material On Site) adalah material yang sudah masuk ke sistem untuk
 * project/cluster tersebut, yaitu:
 *   1. inbound dari vendor EKSTERNAL yang sudah disetujui/diterima, dan
 *   2. ditambah saldo awal hasil import BOQ (`boq_item.qty_mos`).
 *
 * Tidak termasuk:
 *   - transfer internal antar gudang (`tipe_pengirim` bukan "external"),
 *   - inbound yang belum disetujui/diterima (mis. masih `ready_putaway`,
 *     masih di jalan, atau masih diverifikasi),
 *   - outbound ke lapangan (material keluar dari gudang, bukan penambahan).
 *
 * `Used` BUKAN bagian dari MOS: nilainya berasal dari input laporan mitra
 * (upload Excel / input manual) dan `Remains` = MOS - (BOQ Plan + Additional).
 *
 * Semua modul (reconciliation, reports, boq, dashboard) WAJIB memakai definisi
 * ini supaya angka MOS pada tabel rekonsiliasi, ringkasan, dan riwayat laporan
 * mitra tidak pernah berbeda.
 */
const MOS_INBOUND_STATUSES = ["disetujui", "diterima_didistribusikan"];

const MOS_SISTEM_DEFINITION =
  "MOS Sistem (K5) = inbound vendor eksternal (status disetujui/diterima) + saldo awal (import qty_mos); " +
  "Used = input laporan mitra; Remains = MOS - (BOQ Plan + Additional).";

/** Bulatkan ke 2 desimal & hilangkan "-0". */
function roundQty(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return 0;
  const rounded = Math.round(num * 100) / 100;
  return rounded === -0 ? 0 : rounded;
}

/**
 * MOS Sistem kanonik = inbound (vendor eksternal) + saldo awal.
 * Fungsi ini adalah satu-satunya tempat rumus MOS formed.
 */
function computeMosSistem(inboundQty, openingBalanceQty) {
  return roundQty(Number(inboundQty || 0) + Number(openingBalanceQty || 0));
}

/** Remains = MOS (Sistem) - (BOQ Plan + Additional) */
function computeRemains(mos, boq, additional) {
  const val = Number(mos || 0) - (Number(boq || 0) + Number(additional || 0));
  const rounded = Math.round(val * 100) / 100;
  return rounded === -0 ? 0 : rounded;
}

/**
 * Per-barang reconciliation status based on final remains.
 *   sesuai   : remains === 0
 *   perhatian : remains !== 0
 */
function computeReconciliationStatus(remains, boq) {
  return Number(remains) === 0 ? "sesuai" : "perhatian";
}

/**
 * Agregasi status ke level per-project dari kumpulan status per-barang.
 *
 * Aturan (dapatkan dari keputusan akhir):
 *   - "perhatian"      : ADA minimal 1 barang berstatus "perhatian"
 *   - "sesuai"         : SEMUA barang berstatus "sesuai" (dan ada >= 1 barang)
 *   - "belum_ada_data" : tidak ada data rekonsiliasi untuk project ini
 *
 * Catatan penting: ini MENGAGGREGASI berdasarkan status per-barang, BUKAN
 * dari nilai aggregate `remains`. Alasannya: sebuah project bisa memiliki
 * aggregate `remains` positif (akaren surplus barang lain) padahal satu
 * barangnya bernilai `remains < 0` (perhatian). Dengan mengecek per-barang,
 * project tetap akan ditandai "perhatian".
 *
 * @param {Array<"sesuai"|"perhatian">} statuses
 * @returns {"sesuai"|"perhatian"|"belum_ada_data"}
 */
function aggregateProjectStatus(statuses) {
  const arr = Array.isArray(statuses) ? statuses : [];
  if (arr.length === 0) return "belum_ada_data";
  if (arr.some((s) => s === "perhatian")) return "perhatian";
  if (arr.every((s) => s === "sesuai")) return "sesuai";
  return "perhatian";
}

function buildPickSummary(rows, sjQty) {
  const pickRows = Array.isArray(rows) ? rows : [];
  const total = pickRows.reduce((sum, r) => sum.plus(r.qty || 0), new Decimal(0));
  const breakdown = pickRows.map((r) => ({
    kondisi: r.kondisi_diambil,
    qty: Number(r.qty || 0),
    is_override: Boolean(r.is_override),
  }));
  const overrideTotal = pickRows.reduce((sum, r) => sum.plus(r.is_override ? r.qty || 0 : 0), new Decimal(0));
  const source = pickRows.length > 0 ? "pick" : "legacy";
  const mismatch = source === "pick" ? total.greaterThan(sjQty) || total.lessThan(sjQty) : false;

  return {
    pick_source: source,
    qty_picked_total: pickRows.length > 0 ? Number(total) : null,
    pick_breakdown: breakdown,
    qty_override_total: pickRows.length > 0 ? Number(overrideTotal) : null,
    pick_mismatch: mismatch,
  };
}

/**
 * Temuan penerimaan:bandingkan qty_diterima (input staff/SPV) dengan qty_dipick_total (aktual ter-pick).
 * - selisih_qty = qty_diterima - qty_dipick_total (<= 0 atau NaN jika belum dilaporkan).
 * - has_mismatch = true jika selisih_qty !== 0 atau kondisi_diterima tidak ada dalam kondisi_diambil_list.
 * - total_selisih_qty = jumlah absolut selisih_qty untuk semua item yang mismatch.
 */
function buildItemPickSummary(picks = []) {
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
}

/**
<<<<<<< HEAD
 * Menentukan apakah inbound SJ layak menambah MOS Sistem (K5).
 * - Hanya inbound (bukan outbound)
 * - Status approved & diterima: `disetujui` / `diterima_didistribusikan`
=======
 * Menentukan apakah inbound SJ layak menambah MOS.
 * MOS naik saat barang masuk gudang dan di-putaway oleh staf, yaitu
 * status diterima_didistribusikan (hasil putaway), BUKAN saat
 * distribusi ke lapangan dikonfirmasi.
 * - Hanya inbound (bukan outbound)
 * - Status: diterima_didistribusikan (putaway staf selesai)
>>>>>>> c5036e8 (Fix:Beres Beres error dan Bug)
 * - Memiliki project_id atau cluster_id (barang ditujukan untuk project/cluster)
 * - WAJIB tipe_pengirim === "external" (vendor/supplier, gudang_asal_id null)
 *
 * Catatan: `ready_putaway` (barang baru tiba di gudang, belum didistribusikan)
 * TIDAK dihitung sebagai MOS, dan transfer internal antar gudang juga tidak.
 */
function isMosEligibleInbound(sj) {
  if (!sj || sj.tipe !== "inbound") return false;
<<<<<<< HEAD
  if (!MOS_INBOUND_STATUSES.includes(sj.status)) return false;
=======
  if (sj.status !== "diterima_didistribusikan") return false;
>>>>>>> c5036e8 (Fix:Beres Beres error dan Bug)
  if (!sj.project_id && !sj.cluster_id) return false;
  if (sj.tipe_pengirim !== "external") return false;
  return true;
}

/**
<<<<<<< HEAD
 * Ambil baris terbaru per kunci (semantik snapshot laporan mitra).
 *
 * `laporan_mitra` berisi snapshot per tanggal laporan, bukan akumulasi. Satu
 * (tiket, barang) bisa punya beberapa baris bila mitra meng-upload laporan
 * lebih dari sekali, sehingga MOS/Used harus diambil dari snapshot TERAKHIR,
 * bukan dijumlahkan (mengavoid penghitungan ganda).
 *
 * @param {Array<object>} rows
 * @param {(row: object) => string} keyFn
 * @param {(row: object) => number} dateFn
 * @returns {Map<string, object>}
 */
function pickLatestPerKey(rows, keyFn, dateFn) {
  const latest = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = keyFn(row);
    if (key === null || key === undefined || key === "") continue;
    const current = latest.get(key);
    if (!current) {
      latest.set(key, row);
      continue;
    }
    const currentTime = Number(dateFn(current) || 0);
    const rowTime = Number(dateFn(row) || 0);
    if (rowTime >= currentTime) latest.set(key, row);
  }
  return latest;
=======
 * Bangun Map MOS per key dari daftar item surat jalan, menggunakan fungsi
 * bersama untuk mode project dan cluster. Hanya inbound yang lulus
 * isMosEligibleInbound (diterima_didistribusikan) yang dihitung.
 * @param {Array} shipmentItems
 * @param {Function} getKey(item) -> string|null
 */
function buildInboundMosMap(shipmentItems, getKey) {
  const mosMap = new Map();
  for (const item of shipmentItems) {
    const sj = item && item.surat_jalan;
    if (!sj || sj.tipe !== "inbound") continue;
    if (!isMosEligibleInbound(sj)) continue;
    const key = getKey(item);
    if (!key) continue;
    const qty = Number(item.qty || 0);
    mosMap.set(key, (mosMap.get(key) || 0) + qty);
  }
  return mosMap;
>>>>>>> c5036e8 (Fix:Beres Beres error dan Bug)
}

module.exports = {
  MOS_INBOUND_STATUSES,
  MOS_SISTEM_DEFINITION,
  roundQty,
  computeMosSistem,
  computeRemains,
  computeReconciliationStatus,
  aggregateProjectStatus,
  buildPickSummary,
  buildItemPickSummary,
  isMosEligibleInbound,
<<<<<<< HEAD
  pickLatestPerKey,
=======
  buildInboundMosMap,
>>>>>>> c5036e8 (Fix:Beres Beres error dan Bug)
};
