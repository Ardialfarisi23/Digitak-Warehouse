"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Search, X } from "lucide-react";

import { API_BASE, ensureOk, useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import {
  BELUM_DIKONFIRMASI_BADGE_CLASS,
  BELUM_DIKONFIRMASI_LABEL,
  getJenisLaporanMeta,
  isBelumDikonfirmasiMitra,
} from "@/lib/laporan-mitra";

export interface LaporanMitraRow {
  laporan_id: string;
  kode_tiket: string;
  nama_barang: string | null;
  pic_mitra: string | null;
  tanggal_laporan: string | null;
  used: number;
  mos: number;
  kondisi: string | null;
  jenis_laporan: string | null;
  is_aktif: boolean;
  uploaded_at: string;
  project?: { nama_project: string } | null;
  cluster?: { cluster_id: string; nama_cluster: string } | null;
  barang?: { nama_barang: string; kode_perangkat: string } | null;
}

const PAGE_SIZE = 20;

export function LaporanMitraTable({ onChanged }: { onChanged?: () => void }) {
  const { get, post } = useApi();
  const { user } = useAuth();
  // Hanya Admin yang boleh menonaktifkan (hapus) laporan mitra.
  const isAdmin = mapRole(user?.role) === "admin";
  const [rows, setRows] = useState<LaporanMitraRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [target, setTarget] = useState<LaporanMitraRow | null>(null);
  const [alasan, setAlasan] = useState("");
  const [alasanError, setAlasanError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      if (search.trim()) params.set("search", search.trim());
      // Admin boleh melihat laporan yang sudah dinonaktifkan (include_inactive).
      // Backend mengabaikan parameter ini untuk role selain Admin.
      if (isAdmin) params.set("include_inactive", "true");
      const res = await get(`${API_BASE}/api/reports/reconciliation/laporan-mitra?${params.toString()}`);
      const okRes = await ensureOk(res, "Gagal mengambil daftar laporan mitra.");
      const json = await okRes.json();
      setRows(Array.isArray(json?.data?.data) ? json.data.data : []);
      setTotal(Number(json?.data?.total || 0));
      setTotalPages(Math.max(1, Number(json?.data?.totalPages || 1)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil daftar laporan mitra.");
    } finally {
      setLoading(false);
    }
  }, [get, page, search, isAdmin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const openDialog = (row: LaporanMitraRow) => {
    if (!isAdmin) return;
    setTarget(row);
    setAlasan("");
    setAlasanError(null);
  };

  const closeDialog = () => {
    if (saving) return;
    setTarget(null);
    setAlasan("");
    setAlasanError(null);
  };

  const handleDeactivate = async () => {
    if (!target) return;
    if (!alasan.trim()) {
      setAlasanError("Alasan wajib diisi untuk menonaktifkan laporan.");
      return;
    }
    setSaving(true);
    setAlasanError(null);
    try {
      const res = await post(
        `${API_BASE}/api/reports/reconciliation/laporan-mitra/${target.laporan_id}/nonaktifkan`,
        { alasan: alasan.trim() }
      );
      const okRes = await ensureOk(res, "Gagal menonaktifkan laporan.");
      const json = await okRes.json();
      setTarget(null);
      setAlasan("");
      setToast({
        message: json?.message || "Laporan mitra berhasil dinonaktifkan.",
        type: "success",
      });
      await fetchData();
      onChanged?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menonaktifkan laporan.";
      setAlasanError(message);
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-700">
        Daftar laporan mitra yang sudah disubmit. Laporan berstatus nonaktif tetap tampil di sini, tetapi tidak dihitung
        pada rekonsiliasi.
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 px-6">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                setSearch(searchInput.trim());
              }
            }}
            placeholder="Cari kode tiket, nama barang, atau PIC mitra..."
            className="w-full min-h-9 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setSearch(searchInput.trim());
          }}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cari
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto overscroll-x-contain max-h-[calc(100vh-340px)] rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full table-fixed border-separate border-spacing-0 md:table-auto md:border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-10 text-center">No</th>
              <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Tanggal</th>
              <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Kode Tiket</th>
              <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Nama Barang</th>
              <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">PIC Mitra</th>
              <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap text-right">Used</th>
              <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Jenis</th>
              <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Status</th>
              <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-28 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5" colSpan={9}>
                    <div className="h-3 animate-pulse rounded-lg bg-slate-100" />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td className="px-6 py-16 text-center text-xs text-rose-500" colSpan={9}>
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-6 py-16 text-center text-xs text-slate-400" colSpan={9}>
                  Belum ada laporan mitra.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const jenis = getJenisLaporanMeta(row.jenis_laporan);
                return (
                  <tr key={row.laporan_id} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 whitespace-nowrap text-center text-[10px] text-slate-500 tabular-nums w-10">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-mono text-[10px] text-slate-500">
                      {row.tanggal_laporan || "-"}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-mono font-semibold text-slate-700">{row.kode_tiket}</td>
                    <td className="px-3 py-1.5">
                      <div className="truncate max-w-[220px] text-slate-700" title={row.nama_barang || row.barang?.nama_barang || "-"}>
                        {row.nama_barang || row.barang?.nama_barang || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-slate-700">{row.pic_mitra || "-"}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-right font-mono text-slate-600">{row.used}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${jenis.badgeClass}`}>
                          {jenis.label}
                        </span>
                        {isBelumDikonfirmasiMitra(row) && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${BELUM_DIKONFIRMASI_BADGE_CLASS}`}>
                            {BELUM_DIKONFIRMASI_LABEL}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {row.is_aktif ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {row.is_aktif && isAdmin ? (
                        <button
                          type="button"
                          onClick={() => openDialog(row)}
                          className="rounded-full border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Nonaktifkan
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between px-6 pb-4 text-xs text-slate-500">
          <span>
            Menampilkan {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} laporan
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="rounded-full border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              Sebelumnya
            </button>
            <span className="font-mono">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="rounded-full border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={closeDialog}>
          <div
            className="w-full w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Nonaktifkan Laporan Mitra</h3>
                <p className="text-xs text-slate-500">
                  Tiket {target.kode_tiket} · {target.tanggal_laporan || "-"} · Used {target.used}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600">
                Laporan ini tidak akan dihitung pada rekonsiliasi. Laporan tetap tampil di riwayat dengan label nonaktif.
              </p>
              <label className="mt-4 block text-xs font-medium text-slate-500">Alasan penonaktifan (wajib)</label>
              <textarea
                value={alasan}
                onChange={(e) => {
                  setAlasan(e.target.value);
                  if (alasanError) setAlasanError(null);
                }}
                rows={3}
                placeholder="Contoh: salah input angka Used"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-400"
              />
              {alasanError && (
                <p className="mt-2 flex items-center gap-1 text-xs text-rose-600">
                  <AlertCircle size={12} />
                  {alasanError}
                </p>
              )}
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={saving}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-rose-600 disabled:opacity-60"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Nonaktifkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-[130] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-full p-1 opacity-60 hover:opacity-100"
            aria-label="Tutup notifikasi"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
