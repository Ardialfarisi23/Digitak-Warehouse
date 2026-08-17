"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ChevronDown, Filter, X, Eye, CheckSquare, AlertTriangle } from "lucide-react";
import { useApi } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  stok_kurang: "Stok Tidak Cukup",
  melewati_batas: "Melewati Limit Kuota",
  manual_override: "Manual / Direct Outbound",
};

const STATUS_BADGE: Record<string, string> = {
  stok_kurang: "bg-amber-50 text-amber-700 border-amber-200",
  melewati_batas: "bg-rose-50 text-rose-700 border-rose-200",
  manual_override: "bg-slate-100 text-slate-700 border-slate-200",
};

interface OutboundItem {
  item_id: number;
  qty: number;
  serial_number?: string | null;
  kondisi?: string | null;
  catatan?: string | null;
  barang?: { nama_barang?: string; kode_perangkat?: string; satuan_default?: { kode_satuan?: string } } | null;
  satuan?: { kode_satuan?: string } | null;
}

interface OutboundRow {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  created_at: string;
  kategori_approval?: string;
  project?: { nama_project?: string } | null;
  gudang_asal?: { nama_gudang?: string } | null;
  gudang_tujuan?: { nama_gudang?: string } | null;
  personil_pengantar?: { nama?: string } | null;
  kendaraan?: { jenis_kendaraan?: string; no_polisi?: string } | null;
  creator?: { nama?: string } | null;
  items?: OutboundItem[];
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_10px_1fr] items-start leading-snug">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-500">:</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

export default function SupervisorApprovalOutboundPage() {
  const { get, put } = useApi();
  const [requests, setRequests] = useState<OutboundRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedItem, setSelectedItem] = useState<OutboundRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);

  const fetchApprovalQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      if (query.trim()) params.set("search", query.trim());
      if (selectedCategory !== "all") params.set("kategori_approval", selectedCategory);

      const response = await get(`${baseUrl}/api/surat-jalan/outbound/approval?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Gagal mengambil daftar verifikasi surat jalan.");
      }
      const json = await response.json();
      const result = json?.data ?? json ?? {};
      const list = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
      setRequests(list as OutboundRow[]);
      setTotalPages((result?.meta?.totalPages as number) || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.");
    } finally {
      setIsLoading(false);
    }
  }, [get, currentPage, query, selectedCategory]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApprovalQueue();
  }, [fetchApprovalQueue]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchCat =
        selectedCategory === "all" ||
        (r.kategori_approval || "manual_override") === selectedCategory;
      return matchCat;
    });
  }, [requests, selectedCategory]);

  const formatDate = (value: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const openConfirmDialog = (id: number) => {
    setConfirmTargetId(id);
    setShowConfirmDialog(true);
  };

  const closeConfirmDialog = () => {
    setShowConfirmDialog(false);
    setConfirmTargetId(null);
  };

  const executeApprove = async () => {
    if (!confirmTargetId) return;
    const id = confirmTargetId;
    setActionLoading(String(id));
    closeConfirmDialog();
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await put(`${baseUrl}/api/surat-jalan/${id}/approve-outbound`, {});
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal menyetujui outbound.");
      }
      setToast({ message: "Surat Jalan berhasil diverifikasi dan disetujui.", type: "success" });
      setSelectedItem(null);
      fetchApprovalQueue();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal menyetujui outbound.", type: "error" });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const openDetail = (row: OutboundRow) => {
    setSelectedItem(row);
  };

  const closeDetail = () => {
    setSelectedItem(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/supervisor/approval"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Supervisor Portal
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500">
                Otorisasi Barang Keluar
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Approval Pengeluaran Barang (Outbound)
            </h1>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          <button
            onClick={fetchApprovalQueue}
            className="ml-3 rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-xl border px-4 py-3 shadow-lg ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {toast.type === "success" ? "✓" : "✕"}
            {toast.message}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari No. SJ, Proyek, Gudang..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="relative w-full sm:w-auto">
          <Filter size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-8 py-2 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
          >
            <option value="all">Semua Kategori</option>
            <option value="stok_kurang">Stok Tidak Cukup</option>
            <option value="melewati_batas">Melewati Limit Kuota</option>
            <option value="manual_override">Manual / Direct</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">No. Surat Jalan</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                    <p className="mt-2 text-sm">Memuat data outbound...</p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold text-slate-700">Tidak ada pengajuan outbound ditemukan</p>
                    <p className="text-xs text-slate-400">Ganti kata kunci atau pilih filter lain.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => {
                  const kategori = r.kategori_approval || "manual_override";
                  const badgeClass = STATUS_BADGE[kategori] || STATUS_BADGE.manual_override;
                  const label = STATUS_LABEL[kategori] || "Manual / Direct Outbound";

                  return (
                    <tr key={r.surat_jalan_id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {r.nomor_surat_jalan}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.project?.nama_project || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.gudang_asal?.nama_gudang || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetail(r)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                            title="Detail"
                          >
                            <Eye size={14} />
                            <span className="hidden sm:inline">Detail</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openConfirmDialog(r.surat_jalan_id)}
                            disabled={actionLoading === String(r.surat_jalan_id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50"
                            title="Verifikasi"
                          >
                            <CheckSquare size={14} />
                            <span className="hidden sm:inline">Verifikasi</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-xs text-slate-500">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Selanjutnya
          </button>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Detail Surat Jalan
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedItem.nomor_surat_jalan}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dokumen Surat Jalan — ini yang ke-print */}
            <div className="overflow-y-auto p-6">
              <div
                id="surat-jalan-document"
                className="mx-auto max-w-3xl rounded-2xl border border-[#F3D9C7] bg-white p-10 print:rounded-none print:border-0 print:p-0"
              >
                {/* Kop surat dengan logo */}
                <div className="mb-8 flex items-start justify-between border-b-2 border-[#E8632C] pb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo digitak grdasi.png"
                    alt="Digitak Studio — PT Metanouva Informatika"
                    className="h-16 w-auto object-contain"
                  />
                  <div className="flex flex-col items-end">
                    <h1 className="text-3xl font-bold tracking-wide text-gray-900">SURAT JALAN</h1>
                    <p className="mt-1 text-xs text-gray-500">Surat Jalan Internal — Digitak Studio</p>
                    <div className="mt-2 text-right">
                      <p className="text-xs font-bold text-[#E8632C]">PT Metanouva Informatika</p>
                      <p className="text-[10px] text-gray-400">Digitak Studio</p>
                    </div>
                  </div>
                </div>

                {/* Info grid — 2 kolom */}
                <div className="mb-8 grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
                  <div className="space-y-3">
                    <InfoRow label="No Surat Jalan" value={selectedItem.nomor_surat_jalan} />
                    <InfoRow label="Project" value={selectedItem.project?.nama_project || "-"} />
                    <InfoRow label="Gudang Asal" value={selectedItem.gudang_asal?.nama_gudang || "-"} />
                  </div>
                  <div className="space-y-3">
                    <InfoRow label="Tanggal" value={formatDate(selectedItem.created_at)} />
                    <InfoRow label="Gudang Tujuan" value={selectedItem.gudang_tujuan?.nama_gudang || "-"} />
                    <InfoRow label="Driver" value={selectedItem.personil_pengantar?.nama || "-"} />
                    <InfoRow label="Kendaraan" value={selectedItem.kendaraan?.jenis_kendaraan || "-"} />
                    <InfoRow label="No Polisi" value={selectedItem.kendaraan?.no_polisi || "-"} />
                  </div>
                </div>

                {/* Tabel item */}
                <table className="mb-10 w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FFF7ED]">
                      <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">No</th>
                      <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Kode Barang</th>
                      <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Nama Barang</th>
                      <th className="border border-[#F3D9C7] px-3 py-2 text-center font-semibold text-[#9a3412]">QTY</th>
                      <th className="border border-[#F3D9C7] px-3 py-2 text-center font-semibold text-[#9a3412]">UOM</th>
                      <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItem.items && selectedItem.items.length > 0 ? (
                      selectedItem.items.map((item, i) => (
                        <tr key={item.item_id || i} className="even:bg-gray-50">
                          <td className="border border-gray-200 px-3 py-2.5">{i + 1}</td>
                          <td className="border border-gray-200 px-3 py-2.5 font-medium">
                            {item.barang?.kode_perangkat || "-"}
                          </td>
                          <td className="border border-gray-200 px-3 py-2.5">
                            {item.barang?.nama_barang || "-"}
                          </td>
                          <td className="border border-gray-200 px-3 py-2.5 text-center font-semibold">
                            {item.qty}
                          </td>
                          <td className="border border-gray-200 px-3 py-2.5 text-center">
                            {item.satuan?.kode_satuan || item.barang?.satuan_default?.kode_satuan || "-"}
                          </td>
                          <td className="border border-gray-200 px-3 py-2.5 text-gray-500">
                            {item.catatan || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="border border-gray-200 px-3 py-6 text-center text-gray-400">
                          Tidak ada rincian barang.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Tanda tangan */}
                <div className="mb-8 grid grid-cols-3 gap-6 text-center text-sm">
                    <div>
                      <p className="mb-16 font-medium text-gray-700">Material Handler</p>
                      <div className="border-t border-gray-400 pt-1">
                        <p className="font-semibold text-gray-900">{selectedItem.creator?.nama || "-"}</p>
                      </div>
                    </div>
                  <div>
                    <p className="mb-16 font-medium text-gray-700">Driver</p>
                    <div className="border-t border-gray-400 pt-1">
                      <p className="font-semibold text-gray-900">
                        {selectedItem.personil_pengantar?.nama || "-"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-16 font-medium text-gray-700">PIC Pemohon (Penerima)</p>
                    <div className="border-t border-gray-400 pt-1">
                      <p className="font-semibold text-gray-900">-</p>
                    </div>
                  </div>
                </div>

                {/* Footer dokumen */}
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-[10px] text-gray-400">
                  <span>{selectedItem.nomor_surat_jalan} | {formatDate(selectedItem.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 print:hidden">
              <div>
                <button
                  type="button"
                  onClick={() => openConfirmDialog(selectedItem.surat_jalan_id)}
                  disabled={actionLoading === String(selectedItem.surat_jalan_id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50"
                >
                  <CheckSquare size={14} />
                  {actionLoading === String(selectedItem.surat_jalan_id) ? "Memproses..." : "Verifikasi / Setujui"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E8632C] bg-white px-4 py-2 text-xs font-semibold text-[#E8632C] shadow-sm transition hover:bg-[#E8632C] hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Cetak / PDF
                </button>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Konfirmasi Verifikasi Surat Jalan
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Apakah Anda yakin ingin memverifikasi dan menyetujui Surat Jalan ini? Tindakan ini akan mengurangi stok gudang dan tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirmDialog}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeApprove}
                disabled={actionLoading !== null}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading !== null ? "Memproses..." : "Ya, Verifikasi"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          aside, header, nav { display: none !important; }
          main { margin-left: 0 !important; margin-top: 0 !important; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
