const AppError = require("../../shared/errors");
const prisma = require("../../config/prisma");
const { Decimal } = require("@prisma/client");

/**
 * Shared utility helpers for reconciliation metric calculations.
 *
 * These pure functions exist to provide a single source of truth for the
 * BOQ/MOS/Used/Remains formulas and reconciliation status logic.
 *
 * - `reconciliation.repository.getInventory` (per-barang) — SHOULD use these
 *   in a follow-up refactor (currently inlined; noted as tech-debt).
 * - `dashboard.repository.getProjectSummary` (per-project aggregate) — uses
 *   `aggregateProjectStatus` on the per-barang statuses returned by
 *   `reconciliation.repository.getInventory`, so the admin dashboard stays
 *   numerically & logically consistent with `/dashboard/reconciliation`.
 */

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
 * Menentukan apakah inbound SJ layak menambah MOS.
 * - Hanya inbound (bukan outbound)
 * - Status approved: ready_putaway, disetujui, diterima_didistribusikan
 * - Memiliki project_id atau cluster_id (barang ditujukan untuk project/cluster)
 * - WAJIB tipe_pengirim === "external" (vendor/supplier, gudang_asal_id null)
 */
function isMosEligibleInbound(sj) {
  if (!sj || sj.tipe !== "inbound") return false;
  const APPROVED_INBOUND_STATUSES = ["ready_putaway", "disetujui", "diterima_didistribusikan"];
  if (!APPROVED_INBOUND_STATUSES.includes(sj.status)) return false;
  if (!sj.project_id && !sj.cluster_id) return false;
  if (sj.tipe_pengirim !== "external") return false;
  return true;
}

module.exports = {
  computeRemains,
  computeReconciliationStatus,
  aggregateProjectStatus,
  buildPickSummary,
  buildItemPickSummary,
  isMosEligibleInbound,
};
