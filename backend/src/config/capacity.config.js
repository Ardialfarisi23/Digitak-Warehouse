/**
 * capacity.config.js
 * ---------------------------------------------------------------------------
 * Konstanta ambang batas SISA KAPASITAS absolut untuk fitur monitoring
 * kapasitas gudang & zona otomatis.
 *
 * ATURAN (sesuai keputusan produk):
 *   - Status dihitung dari SISA KAPASITAS = kapasitas_maksimum - qty terpakai
 *     (bukan persentase, bukan qty terpakai).
 *   - Angka di file ini adalah SATU-SATUNYA sumber kebenaran untuk threshold.
 *     Jika perlu disesuaikan (mis. setelah analisa utilisasi ulang), cukup
 *     ubah nilai di sini — TIDAK perlu migration, TIDAK perlu redeploy besar.
 *   - Satuan: UNIT (sama dengan kolom stok_gudang.qty, Decimal(14,2)).
 *
 * REKOMENDASI ANGKA AWAL (berdasarkan skala data per 2026-09-05):
 *   - 2 gudang aktif, total stok 4818 unit, rata-rata per gudang ~2409,
 *     zona per gudang ~4. Rata-rata per zona ≈ 600 unit.
 *   - Kapasitas tipikal diasumsikan ~1000–1500 unit per zona.
 *   - Sisa di bawah 250 unit → zona sudah sangat sesak (TIDAK_CUKUP).
 *   - Sisa di bawah 500 unit → mulai menipis (MENDEKATI_PENUH).
 *   - Sisa >= 500 unit → dianggap CUKUP.
 *
 *   Angka-angka ini KONSERVATIF untuk skala kecil. Jika admin kemudian
 *   menaikkan kapasitas_maksimum per zona, threshold bisa tetap atau dinaikkan
 *   tanpa migration.
 * ---------------------------------------------------------------------------
 */

module.exports = {
  /**
   * Sisa kapasitas <= REMAINING_TIDAK_CUKUP  → status TIDAK_CUKUP (rose).
   * Termasuk kasus sisa = 0 (zona penuh).
   */
  REMAINING_TIDAK_CUKUP: 250,

  /**
   * Sisa kapasitas <= REMAINING_MENDEKATI_PENUH (dan > REMAINING_TIDAK_CUKUP)
   * → status MENDEKATI_PENUH (amber).
   */
  REMAINING_MENDEKATI_PENUH: 500,

  /**
   * Konstanta tambahan untuk konsistensi (tidak wajib dipakai, contoh
   * helper di capacity.service.js akan memilih default ini bila
   * kapasitas_maksimum NULL → dianggap CUKUP + label "Belum Diatur").
   */
  RANK: {
    CUKUP: 0,
    MENDEKATI_PENUH: 1,
    TIDAK_CUKUP: 2,
  },
};