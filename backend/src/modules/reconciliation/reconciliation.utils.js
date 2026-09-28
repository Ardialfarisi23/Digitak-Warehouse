const AppError = require("../../shared/errors");

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
function computeRemains(mosSistem, boq, additional, used, approvedReturnQty) {
  return Number(mosSistem || 0) - (Number(boq || 0) + Number(additional || 0));
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

module.exports = {
  computeRemains,
  computeReconciliationStatus,
  aggregateProjectStatus,
};
