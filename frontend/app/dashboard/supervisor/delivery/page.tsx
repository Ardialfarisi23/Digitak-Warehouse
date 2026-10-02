"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, ChevronDown, Filter, X, Eye, CheckSquare, AlertTriangle, Clock, PackageCheck, Truck, XCircle } from "lucide-react";
import { useApi } from "@/lib/api";
import { DetailSuratJalanDocument } from "@/components/surat-jalan/DetailSuratJalanDocument";
import { getItemFotoUrls } from "@/lib/surat-jalan-item-foto";

const STATUS_LABEL: Record<string, string> = {
  stok_kurang: "Stok Tidak Cukup",
  melewati_batas: "Melewati Limit Kuota",
  manual_override: "Manual Outbound",
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
  barang?: { nama_barang?: string; kode_perangkat?: string; satuan_default?: { kode_satuan?: string }; kategori?: { is_kritis?: boolean } } | null;
  satuan?: { kode_satuan?: string } | null;
  approval_verification?: {
    approver_nama: string | null;
    waktu_verifikasi: string | null;
  } | null;
}

interface OutboundRow {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  created_at: string;
  tanggal?: string;
  kategori_approval?: string;
  status?: string;
  project?: { nama_project?: string } | null;
  gudang_asal?: { nama_gudang?: string } | null;
  gudang_tujuan?: { nama_gudang?: string } | null;
  personil_pengantar?: { nama?: string } | null;
  kendaraan?: { jenis_kendaraan?: string; no_polisi?: string } | null;
  creator?: { nama?: string } | null;
  items?: OutboundItem[];
  boq_id?: number | null;
  boq?: { boq_number?: string; tiket?: { kode_tiket?: string } } | null;
  tipe?: string;
  pic_pemohon_nama?: string;
}

interface HistoryRow {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  tanggal: string | null;
  gudang_asal: { nama_gudang?: string } | null;
  gudang_tujuan: { nama_gudang?: string } | null;
  keputusan: string;
  catatan: string | null;
  penyetuju: string | null;
  waktu_keputusan: string | null;
  status_surat_jalan: string | null;
}

export default function SupervisorApprovalOutboundPage() {
  const router = useRouter();
  const { get, put } = useApi();
  const [requests, setRequests] = useState<OutboundRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocItem, setSelectedDocItem] = useState<any>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  const [historyData, setHistoryData] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyKeputusan, setHistoryKeputusan] = useState<string>("all");

  const openDocModal = (item: any) => {
    setSelectedDocItem(item);
    setIsDocModalOpen(true);
  };

  const closeDocModal = () => {
    setIsDocModalOpen(false);
    setSelectedDocItem(null);
  };

  const openPreview = (url: string) => setPreviewImage(url);
  const closePreview = () => setPreviewImage(null);

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

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const params = new URLSearchParams();
      params.set("page", String(historyPage));
      params.set("limit", "10");
      if (query.trim()) params.set("search", query.trim());
      if (historyKeputusan !== "all") params.set("keputusan", historyKeputusan);

      const response = await get(`${baseUrl}/api/surat-jalan/outbound/riwayat-approval?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Gagal mengambil riwayat approval outbound.");
      }
      const json = await response.json();
      const result = json?.data ?? json ?? {};
      const list = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];
      setHistoryData(list as HistoryRow[]);
      setHistoryTotalPages((result?.meta?.totalPages as number) || 1);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat riwayat.");
    } finally {
      setHistoryLoading(false);
    }
  }, [get, historyPage, query, historyKeputusan]);

  useEffect(() => {
    fetchApprovalQueue();
  }, [fetchApprovalQueue]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab === "pending") {
        return r.status === "draft_diajukan";
      }
      return ["disetujui", "ditolak"].includes(r.status || "");
    }).filter((r) => {
      const matchCat =
        selectedCategory === "all" ||
        (r.kategori_approval || "manual_override") === selectedCategory;
      return matchCat;
    });
  }, [requests, selectedCategory, activeTab]);

  const filteredHistory = useMemo(() => {
    return historyData.filter((r) => {
      if (historyKeputusan === "all") return true;
      return r.keputusan === historyKeputusan;
    });
  }, [historyData, historyKeputusan]);

  const formatDateTime = (value: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stats = useMemo(() => {
    const tabRequests = requests.filter((r) => {
      if (activeTab === "pending") {
        return r.status === "draft_diajukan";
      }
      return ["disetujui", "ditolak"].includes(r.status || "");
    });

    const totalAntrean = tabRequests.length;
    const stokTidakCukup = tabRequests.filter((r) => {
      const item = r as any;
      return (
        (typeof item.stockAvailable === "number" && typeof item.requestedQty === "number" && item.stockAvailable < item.requestedQty) ||
        item.isInsufficient === true ||
        item.stockStatus === "INSUFFICIENT" ||
        item.kategori_approval === "stok_kurang"
      );
    }).length;
    const melewatiLimit = tabRequests.filter((r) => {
      const item = r as any;
      return (
        item.exceedsLimit === true ||
        (typeof item.qty === "number" && typeof item.maxLimit === "number" && item.qty > item.maxLimit) ||
        item.limitStatus === "EXCEEDED" ||
        item.kategori_approval === "melewati_batas"
      );
    }).length;
    const manualOutbound = tabRequests.filter((r) => {
      const item = r as any;
      return (
        item.isManual === true ||
        item.statusType === "Manual Outbound" ||
        item.tipe === "MANUAL" ||
        item.status === "Manual Outbound" ||
        item.kategori_approval === "manual_override"
      );
    }).length;

    return { totalAntrean, stokTidakCukup, melewatiLimit, manualOutbound };
  }, [requests, activeTab]);

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
      setRequests((prev) => prev.map((r) => r.surat_jalan_id === id ? { ...r, status: "disetujui" } : r));
      setToast({ message: "Surat Jalan berhasil diverifikasi dan disetujui.", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal menyetujui outbound.", type: "error" });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const openRejectDialog = (id: number) => {
    setRejectTargetId(id);
    setRejectReason("");
    setShowRejectDialog(true);
  };

  const closeRejectDialog = () => {
    setShowRejectDialog(false);
    setRejectTargetId(null);
    setRejectReason("");
  };

  const executeReject = async () => {
    if (!rejectTargetId) return;
    const id = rejectTargetId;
    const alasan = rejectReason.trim();
    if (alasan.length < 5) {
      setToast({ message: "Alasan penolakan minimal 5 karakter.", type: "error" });
      return;
    }
    setActionLoading(String(id));
    closeRejectDialog();
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await put(`${baseUrl}/api/surat-jalan/${id}/reject-outbound`, { catatan: alasan });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal menolak outbound.");
      }
      setRequests((prev) => prev.map((r) => r.surat_jalan_id === id ? { ...r, status: "ditolak" } : r));
      setToast({ message: "Permintaan outbound berhasil ditolak.", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal menolak outbound.", type: "error" });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6">
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
            Form Persetujuan Pengeluaran Barang (Outbound)
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Total Antrean</p>
            <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.totalAntrean}</h3>
            <p className="text-xs text-slate-400">Menunggu persetujuan</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-5 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-wider text-rose-600 uppercase mb-2">Stok Tidak Cukup</p>
            <h3 className="text-3xl font-bold text-rose-600 mb-1">{stats.stokTidakCukup}</h3>
            <p className="text-xs text-rose-500 font-medium">Perlu penyesuaian stok</p>
          </div>
          <div className="p-2 bg-rose-100/50 rounded-lg text-rose-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-orange-50/40 border border-orange-100 rounded-2xl p-5 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-wider text-orange-600 uppercase mb-2">Melewati Limit</p>
            <h3 className="text-3xl font-bold text-orange-600 mb-1">{stats.melewatiLimit}</h3>
            <p className="text-xs text-orange-500 font-medium">Melebihi kuota</p>
          </div>
          <div className="p-2 bg-orange-100/50 rounded-lg text-orange-500">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Manual Outbound</p>
            <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.manualOutbound}</h3>
            <p className="text-xs text-slate-400">Tanpa persetujuan otomatis</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari No. SJ, Project, Gudang..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/60 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 placeholder-slate-400"
          />
        </div>

        <div className="relative w-full sm:w-56">
          <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-slate-50/60 border-none rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none font-medium"
          >
            <option value="all">Semua Kategori</option>
            <option value="stok_kurang">Stok Tidak Cukup</option>
            <option value="melewati_batas">Melewati Limit Kuota</option>
            <option value="manual_override">Manual</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {activeTab === "history" && (
          <div className="relative w-full sm:w-56">
            <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={historyKeputusan}
              onChange={(e) => {
                setHistoryKeputusan(e.target.value);
                setHistoryPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50/60 border-none rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none font-medium"
            >
              <option value="all">Semua Keputusan</option>
              <option value="disetujui">Disetujui</option>
              <option value="ditolak">Ditolak</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === "pending"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Perlu Persetujuan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === "history"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Riwayat Persetujuan
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 break-all">No. Surat Jalan</th>
                <th className="px-4 py-3">Tanggal</th>
                {activeTab === "history" ? (
                  <>
                    <th className="px-4 py-3">Asal / Tujuan</th>
                    <th className="px-4 py-3">Keputusan</th>
                    <th className="px-4 py-3">Catatan</th>
                    <th className="px-4 py-3">Oleh</th>
                    <th className="px-4 py-3">Waktu Keputusan</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Gudang</th>
                    <th className="px-4 py-3">Status</th>
                  </>
                )}
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && activeTab === "pending" ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                    <p className="mt-2 text-sm">Memuat data outbound...</p>
                  </td>
                </tr>
              ) : historyLoading && activeTab === "history" ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                    <p className="mt-2 text-sm">Memuat riwayat...</p>
                  </td>
                </tr>
              ) : activeTab === "pending" && filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold text-slate-700">Tidak ada pengajuan outbound yang menunggu persetujuan</p>
                    <p className="text-xs text-slate-400">Ganti kata kunci atau pilih filter lain.</p>
                  </td>
                </tr>
              ) : activeTab === "history" && filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold text-slate-700">Tidak ada riwayat persetujuan outbound</p>
                    <p className="text-xs text-slate-400">Setujui atau tolak pengajuan untuk melihat riwayat.</p>
                  </td>
                </tr>
              ) : activeTab === "pending" ? (
                filteredRequests.map((r) => {
                  const kategori = r.kategori_approval || "manual_override";
                  const badgeClass = STATUS_BADGE[kategori] || STATUS_BADGE.manual_override;
                  const label = STATUS_LABEL[kategori] || "Manual Outbound";
                  const isKritis = r.items?.some((item) => item.barang?.kategori?.is_kritis === true);

                  return (
                    <tr key={r.surat_jalan_id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 break-all">
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
                        {isKritis && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                            Kritis
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/supervisor/approval/outbound/${r.surat_jalan_id}`)}
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
                            title="Setujui"
                          >
                            <CheckSquare size={14} />
                            <span className="hidden sm:inline">Setujui</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openRejectDialog(r.surat_jalan_id)}
                            disabled={actionLoading === String(r.surat_jalan_id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-100 disabled:opacity-50"
                            title="Tolak"
                          >
                            <XCircle size={14} />
                            <span className="hidden sm:inline">Tolak</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                filteredHistory.map((r) => {
                  const keputusanBadge =
                    r.keputusan === "disetujui"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : r.keputusan === "ditolak"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-slate-100 text-slate-700 border-slate-200";
                  const keputusanLabel =
                    r.keputusan === "disetujui"
                      ? "Disetujui"
                      : r.keputusan === "ditolak"
                        ? "Ditolak"
                        : r.keputusan || "-";

                  return (
                    <tr key={`${r.surat_jalan_id}-${r.waktu_keputusan}`} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 break-all">
                        {r.nomor_surat_jalan || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate((r.tanggal || r.waktu_keputusan || "") as string)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {(r.gudang_asal?.nama_gudang || "-") + " / " + (r.gudang_tujuan?.nama_gudang || "-")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${keputusanBadge}`}>
                          {keputusanLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.catatan || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.penyetuju || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDateTime((r.waktu_keputusan || "") as string)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/supervisor/approval/outbound/${r.surat_jalan_id}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
                            title="Detail"
                          >
                            <Eye size={14} />
                            <span className="hidden sm:inline">Detail</span>
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

      {activeTab === "pending" && totalPages > 1 && (
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

      {activeTab === "history" && historyTotalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <button
            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
            disabled={historyPage === 1}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-xs text-slate-500">
            Halaman {historyPage} dari {historyTotalPages}
          </span>
          <button
            onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
            disabled={historyPage === historyTotalPages}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Selanjutnya
          </button>
        </div>
      )}

      {isDocModalOpen && selectedDocItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Dokumentasi Barang</h3>
                <p className="text-xs text-slate-500">
                  {selectedDocItem?.barang?.nama_barang || selectedDocItem?.barang?.kode_perangkat || "Item"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDocModal}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Kondisi</p>
                  <p className="font-medium text-slate-900">{selectedDocItem?.kondisi || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">QTY</p>
                  <p className="font-medium text-slate-900">{selectedDocItem?.qty || 0}</p>
                </div>
                <div>
                   <p className="text-xs text-slate-500">Diperiksa Oleh</p>
                   <p className="font-medium text-slate-900">
                     {(selectedDocItem as any)?.approval_verification?.approver_nama ||
                       (selectedDocItem as any)?.diperiksa_oleh_user?.nama ||
                       "-"}
                   </p>
                 </div>
                 <div>
                   <p className="text-xs text-slate-500">Waktu Verifikasi</p>
                   <p className="font-medium text-slate-900">
                     {(selectedDocItem as any)?.approval_verification?.waktu_verifikasi
                       ? new Date((selectedDocItem as any).approval_verification.waktu_verifikasi).toLocaleString("id-ID")
                       : (selectedDocItem as any)?.diperiksa_pada
                         ? new Date((selectedDocItem as any).diperiksa_pada).toLocaleString("id-ID")
                         : "-"}
                   </p>
                 </div>
              </div>
               <div>
                   <p className="mb-2 text-xs text-slate-500">Foto Dokumentasi</p>
                   {(() => {
                     const item = selectedDocItem as any;
                     const fotoUrls = getItemFotoUrls(item);
                     if (fotoUrls.length === 0) {
                       return <p className="text-xs text-slate-400">Belum ada foto dokumentasi untuk item ini.</p>;
                     }
                     return (
                       <div className="grid grid-cols-3 gap-2">
                         {fotoUrls.map((url, idx) => (
                           <img
                             key={idx}
                             src={url}
                             alt={`Foto ${idx + 1}`}
                             className="h-24 w-full rounded-lg border border-slate-100 object-cover cursor-pointer"
                             onClick={() => openPreview(url)}
                           />
                         ))}
                       </div>
                     );
                   })()}
                 </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={closeDocModal}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Kembali ke Detail
              </button>
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
                  Konfirmasi Setujui Surat Jalan
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Apakah Anda yakin ingin menyetujui Surat Jalan ini? Tindakan ini akan mengurangi stok gudang dan tidak dapat dibatalkan.
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
                 {actionLoading !== null ? "Memproses..." : "Ya, Setujui"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Tolak Permintaan Outbound
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Berikan alasan penolakan untuk permintaan ini. Minimal 5 karakter.
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Stok barang tidak mencukupi untuk memenuhi permintaan ini."
                  rows={4}
                  className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeRejectDialog}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeReject}
                disabled={actionLoading !== null || rejectReason.trim().length < 5}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading !== null ? "Memproses..." : "Ya, Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={[
            "fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-medium shadow-2xl backdrop-blur-sm animate-in slide-in-from-right-full fade-in duration-300 max-w-sm",
            toast.type === "success"
              ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-800"
              : "border-rose-200/80 bg-rose-50/95 text-rose-800",
          ].join(" ")}
        >
          <div
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              toast.type === "success" ? "bg-emerald-100" : "bg-rose-100",
            ].join(" ")}
          >
            {toast.type === "success" ? (
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6h12" />
              </svg>
            )}
          </div>
          <p className="flex-1 leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className={[
              "ml-2 shrink-0 rounded-full p-1 transition-colors",
              toast.type === "success"
                ? "text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600"
                : "text-rose-400 hover:bg-rose-100 hover:text-rose-600",
            ].join(" ")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6h12" />
            </svg>
          </button>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm" onClick={closePreview}>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Preview Dokumentasi" className="max-w-full max-h-[85vh] rounded-2xl border border-slate-200 shadow-2xl object-contain" />
            <button type="button" onClick={closePreview} className="absolute -top-3 -right-3 rounded-full bg-white p-2 text-slate-500 shadow hover:text-slate-800">
              <X size={18} />
            </button>
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
