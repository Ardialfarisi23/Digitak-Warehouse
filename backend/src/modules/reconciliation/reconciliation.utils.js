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

/** Remains = MOS (Sistem) - (BOQ Plan + Additional) - Used - ApprovedReturnQty */
function computeRemains(mosSistem, boq, additional, used, approvedReturnQty) {
  return Number(mosSistem || 0) - (Number(boq || 0) + Number(additional || 0)) - Number(used || 0) - Number(approvedReturnQty || 0);
}

/**
 * Per-barang reconciliation status based on final remains.
 *   perhatian : remains < 0 atau (remains >= 0 tapi BOQ = 0)
 *   sesuai   : remains >= 0 dan BOQ > 0
 *   berjalan : selain kasus di atas
 */
function computeReconciliationStatus(remains, boq) {
  if (remains < 0 || boq <= 0) return "perhatian";
  return "sesuai";
}

/**
 * Agregasi status ke level per-project dari kumpulan status per-barang.
 *
 * Aturan (dapatkan dari keputusan akhir):
 *   - "perhatian"  : ADA minimal 1 barang berstatus "perhatian"
 *   - "sesuai"     : SEMUA barang berstatus "sesuai" (dan ada >= 1 barang)
 *   - "berjalan"   : tidak memenuhi di atas
 *
 * Catatan penting: ini MENGAGGREGASI berdasarkan status per-barang, BUKAN
 * dari nilai aggregate `remains`. Alasannya: sebuah project bisa memiliki
 * aggregate `remains` positif (akaren surplus barang lain) padahal satu
 * barangnya bernilai `remains < 0` (perhatian). Dengan mengecek per-barang,
 * project tetap akan ditandai "perhatian".
 *
 * @param {Array<"sesuai"|"perhatian"|"berjalan">} statuses
 * @returns {"sesuai"|"perhatian"|"berjalan"}
 */
function aggregateProjectStatus(statuses) {
  const arr = Array.isArray(statuses) ? statuses : [];
  if (arr.length === 0) return "berjalan";
  if (arr.some((s) => s === "perhatian")) return "perhatian";
  if (arr.every((s) => s === "sesuai")) return "sesuai";
  return "berjalan";
}

module.exports = {
  computeRemains,
  computeReconciliationStatus,
  aggregateProjectStatus,
};
