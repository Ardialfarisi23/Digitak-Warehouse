"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Search, PackageCheck, PackageMinus, Package, ClipboardCheck, X, AlertTriangle, Download, History, CheckCircle, Clock, AlertCircle, Plus, Wallet } from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AdditionalAdjustmentModal } from "@/components/additional/AdditionalAdjustmentModal";
import { RemainsNoteForm } from "@/components/reconciliation/RemainsNoteForm";
import { RemainsNoteBadge } from "@/components/reconciliation/RemainsNoteBadge";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const RECONCILIATION_ENDPOINT = `${API_BASE}/api/reconciliation/inventory`;
const FILTER_OPTIONS_ENDPOINT = `${API_BASE}/api/reconciliation/filter-options`;
const HISTORY_ENDPOINT = `${API_BASE}/api/reports/reconciliation/history`;

interface ReconciliationRecord {
  id: string;
  project_id: string;
  project_nama: string;
  cluster_id: string;
  nama_cluster: string;
  cluster_type: string | null;
  project_type: string | null;
  alamat_lengkap: string | null;
  kso_partner: string | null;
  kso_contact: string | null;
  no_tiket_release: string | null;
  vendor: string | null;
  homepass_plan: number | null;
  status_aktif: boolean | null;
  area: string;
  tiket_id: string;
  kode_tiket: string;
  barang_id: string;
  kode_perangkat: string;
  nama_barang: string;
  gudang_nama: string;
  satuan: string;
  boq: number;
  additional: number;
  mos: number;
  used: number;
  approved_return_qty: number;
  remains: number;
  status: "sesuai" | "perhatian" | "belum_ada_data";
  remains_note: string | null;
  remains_note_updated_at: string | null;
}

interface HistoryRecord {
  id: string;
  filename: string;
  actor_nama: string;
  created_at: string;
  total_items: number;
  success_count: number;
  failed_count: number;
  status: "processed" | "pending" | "failed" | "completed" | "success";
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
};

function getStatusBadge(status: ReconciliationRecord["status"]) {
  switch (status) {
    case "sesuai":
      return { label: "Sesuai", bg: "bg-emerald-50", text: "text-emerald-600", icon: PackageCheck };
    case "perhatian":
      return { label: "Perhatian", bg: "bg-amber-50", text: "text-amber-600", icon: AlertTriangle };
    case "belum_ada_data":
      return { label: "Belum Ada Data", bg: "bg-slate-50", text: "text-slate-500", icon: Package };
    default:
      return { label: status, bg: "bg-slate-100", text: "text-slate-600", icon: Package };
  }
}

function getHistoryStatusBadge(status: HistoryRecord["status"]) {
  switch (status) {
    case "processed":
    case "completed":
    case "success":
      return { label: "Selesai", bg: "bg-emerald-50", text: "text-emerald-600", icon: CheckCircle };
    case "pending":
      return { label: "Menunggu", bg: "bg-amber-50", text: "text-amber-600", icon: Clock };
    case "failed":
      return { label: "Gagal", bg: "bg-rose-50", text: "text-rose-600", icon: AlertCircle };
    default:
      return { label: status, bg: "bg-slate-100", text: "text-slate-600", icon: Clock };
  }
}

function KpiCard({ title, value, description, icon: Icon, tone = "slate" }: { title: string; value: string; description: string; icon: any; tone?: "slate" | "rose" }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone === "rose" ? "border-rose-200 bg-rose-50/50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        <Icon size={18} className={tone === "rose" ? "text-rose-500" : "text-slate-400"} />
      </div>
      <p className={`mt-2 text-xl font-bold ${tone === "rose" ? "text-rose-700" : "text-slate-900"}`}>{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{description}</p>
    </div>
  );
}

function DetailRow({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={highlight ? "font-semibold text-slate-900" : "text-slate-500"}>{label}</span>
      <span className={highlight ? "font-bold text-slate-900" : "font-medium text-slate-700"}>{formatNumber(value)}</span>
    </div>
  );
}

export default function SupervisorReconciliationPage() {
  const { user } = useAuth();
  const { get, post } = useApi();

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<"rekonsiliasi" | "riwayat">("rekonsiliasi");

  // State Rekonsiliasi
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [filterOptions, setFilterOptions] = useState<{ projects: Array<{ project_id: string; project_nama: string; clusters: Array<{ cluster_id: string; nama_cluster: string }> }> } | null>(null);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);
  const [filterOptionsError, setFilterOptionsError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [clusterFilter, setClusterFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);
  const [adjustmentRecord, setAdjustmentRecord] = useState<ReconciliationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

// State Riwayat Input Laporan Mitra
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const isSelectionComplete = useMemo(
    () => projectFilter !== "all" && clusterFilter !== "all",
    [projectFilter, clusterFilter]
  );

  const fetchFilterOptions = useCallback(async () => {
    setFilterOptionsLoading(true);
    setFilterOptionsError(null);
    try {
      const response = await get(FILTER_OPTIONS_ENDPOINT);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Gagal mengambil opsi filter.");
      }
      setFilterOptions(json?.data ?? { projects: [] });
    } catch (caughtError) {
      setFilterOptionsError(caughtError instanceof Error ? caughtError.message : "Terjadi kesalahan saat mengambil opsi filter.");
    } finally {
      setFilterOptionsLoading(false);
    }
  }, [get]);

  const fetchReconciliation = useCallback(async () => {
    // Only fetch if both project and cluster are selected
    if (!isSelectionComplete) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    // Race condition prevention: increment fetch ID and capture it
    const currentFetchId = ++fetchIdRef.current;

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("groupBy", "cluster");
      params.set("projectId", projectFilter);
      params.set("clusterId", clusterFilter);
      if (search.trim()) params.set("search", search.trim());

      const response = await get(`${RECONCILIATION_ENDPOINT}?${params.toString()}`);

      // Check if this request is still the latest
      if (currentFetchId !== fetchIdRef.current) {
        return; // A newer request has been started, discard this response
      }

      if (response.status === 403) {
        setError("Anda tidak memiliki akses ke data rekonsiliasi ini.");
        setRecords([]);
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Endpoint Rekonsiliasi mengembalikan respons non-JSON (404/500).");
      }

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Gagal mengambil data rekonsiliasi inventory.");
      }

      const payload = json?.data ?? [];
      const list: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

      const mapped: ReconciliationRecord[] = list.map((item: any) => {
        const boq = Number(item.boq ?? item.qty_boq ?? item.qty_rencana ?? 0);
        const additional = Number(item.additional ?? item.qty_additional ?? 0);
        const mos = Number(item.mos ?? item.hardware_on_site ?? item.qty_on_site ?? 0);
        const used = Number(item.used ?? item.qty_used ?? 0);
        const approvedReturnQty = Number(item.approved_return_qty ?? 0);
        const remains = Number(item.remains ?? (mos - (boq + additional)));

        const recStatus: ReconciliationRecord["status"] =
          item.status === "sesuai" || item.status === "perhatian" || item.status === "belum_ada_data"
            ? item.status
            : Number(remains) === 0
              ? "sesuai"
              : "perhatian";

        return {
          id: String(item.id ?? ""),
          project_id: String(item.project_id ?? ""),
          project_nama: item.project_nama ?? "-",
          cluster_id: item.cluster_id ?? "-",
          nama_cluster: item.nama_cluster ?? null,
          cluster_type: item.cluster_type ?? null,
          project_type: item.project_type ?? null,
          alamat_lengkap: item.alamat_lengkap ?? null,
          kso_partner: item.kso_partner ?? null,
          kso_contact: item.kso_contact ?? null,
          no_tiket_release: item.no_tiket_release ?? null,
          vendor: item.vendor ?? null,
          homepass_plan: item.homepass_plan ?? null,
          status_aktif: item.status_aktif ?? null,
          area: item.area ?? "-",
          tiket_id: String(item.tiket_id ?? ""),
          kode_tiket: item.kode_tiket ?? "-",
          barang_id: String(item.barang_id ?? ""),
          kode_perangkat: item.kode_perangkat ?? "-",
          nama_barang: item.nama_barang ?? "-",
          gudang_nama: item.gudang_nama ?? "-",
          satuan: item.satuan ?? "-",
          boq,
          additional,
          mos,
          used,
          approved_return_qty: approvedReturnQty,
          remains,
          status: recStatus,
          remains_note: item.remains_note ?? null,
          remains_note_updated_at: item.remains_note_updated_at ?? null,
        };
      });

      setRecords(mapped);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Terjadi kesalahan saat mengambil data rekonsiliasi.");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [get, projectFilter, clusterFilter, search, isSelectionComplete]);

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await get(HISTORY_ENDPOINT);

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        setHistoryRecords([]);
        return;
      }

      const json = await res.json();
      const payload = json?.data ?? [];
      const list: any[] = Array.isArray(payload) ? payload : [];
      setHistoryRecords(
        list.map((item: any) => ({
          id: String(item.id ?? ""),
          filename: item.filename ?? "laporan_mitra.xlsx",
          actor_nama: item.actor_nama ?? item.actor?.name ?? "-",
          created_at: item.created_at ?? new Date().toISOString(),
          total_items: Number(item.total_items ?? item.total ?? 0),
          success_count: Number(item.success_count ?? item.berhasil ?? item.total_items ?? 0),
          failed_count: Number(item.failed_count ?? item.gagal ?? 0),
          status: item.status ?? "processed",
        })),
      );
    } catch (err) {
      console.error("Gagal mengambil riwayat input mitra:", err);
      setHistoryRecords([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchFilterOptions();
    fetchHistory();
  }, [user, fetchFilterOptions]);

  useEffect(() => {
    if (!user) return;
    fetchReconciliation();
  }, [user, projectFilter, clusterFilter, fetchReconciliation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchReconciliation();
  }, [search, statusFilter, fetchReconciliation]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchReconciliation();
      }
    };
    const onFocus = () => {
      fetchReconciliation();
    };
    window.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchReconciliation, projectFilter, clusterFilter]);

  useEffect(() => {
    // If project changed (and not reset to "all"), reset cluster filter to "all"
    if (projectFilter !== "all") {
      setClusterFilter("all");
    }
  }, [projectFilter]);

  // Reset warehouse filter when project or cluster changes
  useEffect(() => {
    if (warehouseFilter !== "all") {
      setWarehouseFilter("all");
    }
  }, [projectFilter, clusterFilter]);

  const projectOptions = useMemo((): [string, string][] => {
    if (!filterOptions) return [];
    // For main filter dropdown: all projects from filterOptions
    // For adjustmentRecord (mitra modal): filter by barang_id and cluster_id
    const projects = filterOptions.projects;
    if (adjustmentRecord) {
      // Filter projects that have the specific barang_id in the selected cluster
      // Since filterOptions doesn't have barang info, we need to check records
      const baseRecords = records.filter((item) => {
        const matchesBarang = item.barang_id === adjustmentRecord.barang_id;
        const matchesCluster =
          !adjustmentRecord.cluster_id || adjustmentRecord.cluster_id === "-"
            ? true
            : item.cluster_id === adjustmentRecord.cluster_id;
        return matchesBarang && matchesCluster;
      });
      return Array.from(new Map(baseRecords.map((item) => [item.project_id, item.project_nama] as [string, string])).entries());
    }
    return projects.map((p) => [p.project_id, p.project_nama] as [string, string]);
  }, [filterOptions, records, adjustmentRecord]);

  const warehouseOptions = useMemo(() => {
    return Array.from(new Set(records.map((item) => item.gudang_nama).filter(Boolean)));
  }, [records]);

  const clusterOptions = useMemo(() => {
    if (projectFilter === "all" || !filterOptions) return [];
    const project = filterOptions.projects.find((p) => p.project_id === projectFilter);
    if (!project) return [];
    return project.clusters
      .map((c) => [c.cluster_id, c.nama_cluster])
      .sort(([, a], [, b]) => a.localeCompare(b));
  }, [filterOptions, projectFilter]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesProject = projectFilter === "all" || record.project_id === projectFilter;
      const matchesCluster = clusterFilter === "all" || record.cluster_id === clusterFilter;
      const matchesWarehouse = warehouseFilter === "all" || record.gudang_nama === warehouseFilter;
      return matchesProject && matchesCluster && matchesWarehouse;
    });
  }, [records, projectFilter, clusterFilter, warehouseFilter]);

  const filteredHistoryRecords = useMemo(() => {
    return historyRecords.filter((item) => {
      if (!startDate && !endDate) return true;
      const itemDate = new Date(item.created_at).getTime();
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
      return itemDate >= start && itemDate <= end;
    });
  }, [historyRecords, startDate, endDate]);

  const summary = useMemo(() => {
    return filteredRecords.reduce(
      (total, item) => {
        total.boq += item.boq;
        total.additional += item.additional;
        total.mos += item.mos;
        total.used += item.used;
        total.remains += item.remains;
        return total;
      },
      { boq: 0, additional: 0, mos: 0, used: 0, remains: 0 }
    );
  }, [filteredRecords]);

  const totalPerhatian = useMemo(() => filteredRecords.filter((r) => r.status === "perhatian").length, [filteredRecords]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = ["Project", "Area", "Cluster", "Kode Tiket", "Kode Perangkat", "Nama Barang", "Gudang", "Satuan", "BOQ", "Additional", "MOS", "Used", "Sisa Lapangan", "Status"];

    const csvRows = [
      headers.join(","),
      ...filteredRecords.map((r) =>
        [
          `"${r.project_nama}"`,
          `"${r.area}"`,
          `"${r.cluster_id}"`,
          `"${r.kode_tiket}"`,
          `"${r.kode_perangkat}"`,
          `"${r.nama_barang}"`,
          `"${r.gudang_nama}"`,
          `"${r.satuan}"`,
          r.boq,
          r.additional,
          r.mos,
          r.used,
          r.remains,
          `"${r.status}"`,
        ].join(","),
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rekonsiliasi_inventory_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`${plusJakartaSans.className}`}>
      <div className="flex flex-1 flex-col p-6">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Rekonsiliasi Inventory (Supervisor)</h1>
            <p className="mt-1 text-sm text-slate-500">Pantau kesesuaian BOQ dengan realisasi hardware di gudang yang menjadi tanggung jawab Anda.</p>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="mb-6 flex w-full gap-2 border-b border-slate-100 sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("rekonsiliasi")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 border-b-2 px-3 py-2 text-sm sm:px-4 sm:py-2.5 font-medium transition-colors whitespace-normal leading-tight min-h-11 text-center ${
              activeTab === "rekonsiliasi" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ClipboardCheck size={16} />
            Rekonsiliasi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("riwayat")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 border-b-2 px-3 py-2 text-sm sm:px-4 sm:py-2.5 font-medium transition-colors whitespace-normal leading-tight min-h-11 text-center ${
              activeTab === "riwayat" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <History size={16} />
            Riwayat Input Laporan Mitra
          </button>
        </div>

        {/* Tab Content 1: Rekonsiliasi Inventory */}
        {activeTab === "rekonsiliasi" && (
          <>
            {error && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

            {/* KPI Cards */}
             <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6">
               <KpiCard title="BOQ" value={formatNumber(summary.boq)} description="Rencana awal" icon={ClipboardCheck} tone="slate" />
               <KpiCard title="Additional" value={formatNumber(summary.additional)} description="Tambahan di luar BOQ" icon={Package} tone="slate" />
               <KpiCard title="MOS" value={formatNumber(summary.mos)} description="Material on Site (termasuk inbound disetujui)" icon={PackageCheck} tone="slate" />
               <KpiCard title="Used" value={formatNumber(summary.used)} description="Sudah digunakan" icon={PackageMinus} tone="slate" />
               <KpiCard title="Sisa Lapangan" value={formatNumber(summary.remains)} description="Sisa di lapangan setelah dikurangi BOQ, Additional, Used, dan Return" icon={Wallet} tone={summary.remains < 0 ? "rose" : "slate"} />
             </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
              <div className="col-span-2 flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari project, tiket, kode perangkat..."
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>

              {filterOptionsError && (
                <div className="col-span-2 flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-3 py-1.5">
                  <AlertCircle size={12} />
                  <span>{filterOptionsError}</span>
                  <button
                    type="button"
                    onClick={fetchFilterOptions}
                    className="text-rose-600 hover:underline"
                  >
                    Coba lagi
                  </button>
                </div>
              )}

              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} disabled={filterOptionsLoading} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="all">Semua Project</option>
                {filterOptionsLoading ? (
                  <option value="" disabled>Memuat...</option>
                ) : (
                  projectOptions.map(([id, nama]) => (
                    <option key={id} value={id}>
                      {nama}
                    </option>
                  ))
                )}
              </select>

              {projectFilter !== "all" && (
                <select
                  value={clusterFilter}
                  onChange={(e) => setClusterFilter(e.target.value)}
                  className="w-full min-w-0 min-h-11 text-base sm:text-sm truncate sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-slate-600 shadow-sm outline-none focus:border-orange-400"
                  disabled={clusterOptions.length === 0 || filterOptionsLoading}
                >
                  <option value="all">Semua Cluster</option>
                  {filterOptionsLoading ? (
                    <option value="" disabled>Memuat...</option>
                  ) : clusterOptions.length > 0 ? (
                    clusterOptions.map(([id, nama]) => (
                      <option key={id} value={id}>
                        {nama}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      Tidak ada cluster
                    </option>
                  )}
                </select>
              )}

              <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400">
                <option value="all">Semua Gudang</option>
                {warehouseOptions.map((warehouse) => (
                  <option key={warehouse} value={warehouse}>
                    {warehouse}
                  </option>
                ))}
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400">
                <option value="all">Semua Status</option>
                <option value="sesuai">Sesuai</option>
                <option value="belum_ada_data">Belum Ada Data</option>
                <option value="perhatian">Perhatian</option>
              </select>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Daftar Rekonsiliasi</h2>
                  <p className="text-xs text-slate-400">
                    {filteredRecords.length} data
                    {totalPerhatian > 0 && <span className="ml-2 text-amber-600">{totalPerhatian} perhatian</span>}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={filteredRecords.length === 0}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download size={16} />
                    Export
                  </button>
                </div>
              </div>

              {isSelectionComplete && filteredRecords.length > 0 && (() => {
                const firstRecord = filteredRecords[0];
                const uniqueKodeTiket = Array.from(new Set(filteredRecords.map((r) => r.kode_tiket).filter(Boolean)));
                return (
                  <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Project</p>
                        <p className="font-medium text-slate-900 truncate">{firstRecord.project_nama}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Cluster</p>
                        <p className="font-medium text-slate-900 truncate">
                          {firstRecord.nama_cluster}
                          {firstRecord.cluster_id && (
                            <span className="ml-1.5 text-[10px] text-slate-400 font-normal">{firstRecord.cluster_id}</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Kode Tiket</p>
                        <p className="font-medium text-slate-900 truncate">
                          {uniqueKodeTiket.length > 0 ? uniqueKodeTiket.join(", ") : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="overflow-x-auto overscroll-x-contain">
                 <table className="w-full min-w-[700px] text-left text-sm">
<thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-3 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-12 text-center">No</th>
                        <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Barang</th>
                        <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">BOQ</th>
                        <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Additional</th>
                        <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">MOS</th>
                        <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Used</th>
                        <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sisa Lapangan</th>
                        <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                        <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Aksi</th>
                      </tr>
                    </thead>

<tbody className="divide-y divide-slate-50">
{isLoading ? (
                        Array.from({ length: 7 }).map((_, rowIndex) => (
                          <tr key={rowIndex}>
                            {Array.from({ length: 9 }).map((_, colIndex) => (
                              <td key={colIndex} className="px-6 py-4">
                                <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                              </td>
                            ))}
                          </tr>
                        ))
) : filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-16 text-center">
                           <Package size={28} className="mx-auto text-slate-300" />
                           <p className="mt-3 text-sm font-medium text-slate-600">Tidak ada data rekonsiliasi</p>
                           <p className="mt-1 text-xs text-slate-400">Coba ubah filter, atau pastikan Anda sudah ditugaskan sebagai PIC gudang.</p>
                          </td>
                        </tr>
                      ) : (
filteredRecords.map((record, index) => {
                          const statusBadge = getStatusBadge(record.status);
                          return (
                            <tr key={record.id} className={`group transition-colors hover:bg-slate-50`}>
                              <td className="px-3 py-4 whitespace-nowrap text-center text-xs text-slate-500">{index + 1}</td>
                              <td className="px-6 py-4">
                                <p className={` ${record.status === "perhatian" ? "font-semibold text-amber-600" : "font-medium text-slate-800"}`}>{record.nama_barang}</p>
                                <p className="text-xs text-slate-400">
                                  {record.kode_perangkat} • {record.gudang_nama}
                                </p>
                              </td>

<td className="px-6 py-4 text-right font-medium text-slate-700">{formatNumber(record.boq)}</td>
                              <td className="px-6 py-4 text-right text-slate-600">{formatNumber(record.additional)}</td>
                               <td className="px-6 py-4 text-right font-medium text-slate-700">{formatNumber(record.mos)}</td>
                               <td className="px-6 py-4 text-right text-slate-600">{formatNumber(record.used)}</td>

<td className="px-6 py-4 text-right">
                                <span className="flex items-center justify-end gap-1">
                                  <span className={record.remains < 0 ? "font-semibold text-rose-600" : "font-semibold text-emerald-700"}>{formatNumber(record.remains)}</span>
                                  <RemainsNoteBadge note={record.remains_note} />
                                </span>
                              </td>

                             <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                                  <statusBadge.icon size={12} />
                                  {statusBadge.label}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center justify-end gap-1">
                                  <button type="button" onClick={() => setSelectedRecord(record)} title="Lihat detail" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                    <ClipboardCheck size={15} />
                                  </button>
                                  <button type="button" onClick={() => setAdjustmentRecord(record)} title="Sesuaikan additional" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-orange-600">
                                    <Plus size={15} />
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

            {/* Section Catatan & Rumus Kalkulasi */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">CATATAN & RUMUS KALKULASI</h3>
              <p className="text-xs text-slate-500 mb-4">Penjelasan cara menghitung setiap kolom pada tabel rekonsiliasi.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <p className="text-xs font-bold text-slate-900">BOQ Plan</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-800/90">Jumlah material yang direncanakan sejak awal untuk project ini.</p>
                </div>
                <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-4">
                  <p className="text-xs font-bold text-indigo-900">Additional</p>
                   <p className="mt-2 text-xs leading-relaxed text-indigo-800/90">Tambahan material yang diajukan karena kekurangan dari rencana BOQ awal, setelah disetujui dan ditambahkan resmi ke sistem.</p>
                </div>
                <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-4">
                  <p className="text-xs font-bold text-blue-900">MOS</p>
                   <p className="mt-2 text-xs leading-relaxed text-blue-800/90">Material yang sudah dikirim dan terkonfirmasi diterima di lapangan.</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
                  <p className="text-xs font-bold text-slate-900">Used</p>
                   <p className="mt-2 text-xs leading-relaxed text-slate-800/90">Jumlah material yang sudah dipasang/digunakan di lapangan, berdasarkan laporan harian dari mitra.</p>
                </div>
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
                  <p className="text-xs font-bold text-emerald-900">Remains</p>
                   <p className="mt-2 text-xs leading-relaxed text-emerald-800/90">Rumus: MOS − (BOQ Plan + Additional). Menghitung sisi pengiriman, bukan pemakaian di lapangan.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab Content 2: Riwayat Input Laporan Mitra */}
        {activeTab === "riwayat" && (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            {/* Banner Informasi Oranye */}
            <div className="border-b border-orange-100 bg-orange-50/60 px-6 py-3.5 text-xs text-orange-700">Tabel ini menampilkan histori upload laporan mitra. Setiap baris merepresentasikan 1 sesi upload file Excel.</div>

            <div className="p-6">
              {/* Date Filters */}
              <div className="mb-6 flex items-center gap-3">
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="dd/mm/yyyy"
                    className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs text-slate-600 shadow-sm outline-none focus:border-orange-400"
                  />
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="dd/mm/yyyy"
                    className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs text-slate-600 shadow-sm outline-none focus:border-orange-400"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
<tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] uppercase tracking-wider text-slate-400">
                       <th className="py-3 px-4 font-semibold w-12 text-center">No</th>
                       <th className="py-3 px-4 font-semibold">Waktu Upload</th>
                      <th className="py-3 px-4 font-semibold">Nama File</th>
                      <th className="py-3 px-4 font-semibold">Diunggah Oleh</th>
                      <th className="py-3 px-4 font-semibold">Total</th>
                      <th className="py-3 px-4 font-semibold">Berhasil</th>
                      <th className="py-3 px-4 font-semibold">Gagal</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isHistoryLoading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx}>
                          {Array.from({ length: 7 }).map((_, cIdx) => (
                            <td key={cIdx} className="p-4">
                              <div className="h-4 animate-pulse rounded bg-slate-100" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filteredHistoryRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-20 text-center text-sm font-medium text-slate-400">
                          Belum ada riwayat upload laporan mitra.
                        </td>
                      </tr>
                    ) : (
                      filteredHistoryRecords.map((item) => {
                        const badge = getHistoryStatusBadge(item.status);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 text-slate-600">
                              {new Date(item.created_at).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-800">{item.filename}</td>
                            <td className="py-3.5 px-4 text-slate-600">{item.actor_nama}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">{item.total_items}</td>
                            <td className="py-3.5 px-4 font-medium text-emerald-600">{item.success_count}</td>
                            <td className="py-3.5 px-4 font-medium text-rose-500">{item.failed_count}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
                                <badge.icon size={11} />
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal Rekonsiliasi */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setSelectedRecord(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Detail Rekonsiliasi</h2>
                <p className="text-xs text-slate-500">Rincian BOQ dan realisasi hardware.</p>
              </div>
              <button type="button" onClick={() => setSelectedRecord(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">Master Cluster</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-slate-400">Nama Cluster</p>
                    <p className="text-sm font-medium text-slate-900">{selectedRecord.nama_cluster || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Cluster ID</p>
                    <p className="text-sm font-medium text-slate-900">{selectedRecord.cluster_id || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Tipe Cluster</p>
                    <p className="text-sm font-medium text-slate-900">{selectedRecord.cluster_type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Tipe Project</p>
                    <p className="text-sm font-medium text-slate-900">{selectedRecord.project_type || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] text-slate-400">Alamat Lengkap</p>
                    <p className="text-sm font-medium text-slate-900">{selectedRecord.alamat_lengkap || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">No. Tiket Release</p>
                    <p className="text-sm font-medium text-slate-900">{selectedRecord.no_tiket_release || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Homepass Plan</p>
                    <p className="text-sm font-medium text-slate-900">{selectedRecord.homepass_plan ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Status</p>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedRecord.status_aktif === true ? "Aktif" : selectedRecord.status_aktif === false ? "Nonaktif" : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">Project</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedRecord.project_nama}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] text-slate-500">Tiket: {selectedRecord.kode_tiket}</span>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] text-slate-500">Area: {selectedRecord.area}</span>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] text-slate-500">Gudang: {selectedRecord.gudang_nama}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">Perangkat</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedRecord.nama_barang}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedRecord.kode_perangkat} • Satuan: {selectedRecord.satuan}
                </p>
              </div>

<div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Rekonsiliasi</p>
                    <div className="space-y-2">
                      <DetailRow label="BOQ" value={selectedRecord.boq} />
                      <DetailRow label="Additional" value={selectedRecord.additional} />
                      <DetailRow label="MOS" value={selectedRecord.mos} />
                      <DetailRow label="Used" value={selectedRecord.used} />
                      <div className="border-t border-slate-100 pt-2">
                        <DetailRow label="Remains" value={selectedRecord.remains} highlight />
                      </div>
                    </div>
              </div>

              <RemainsNoteForm
                record={selectedRecord}
                onClose={() => {}}
                onSuccess={fetchReconciliation}
                isClusterMode={false}
              />

              <div>
                <p className="text-xs font-medium text-slate-400">Status Rekonsiliasi</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusBadge(selectedRecord.status).bg} ${getStatusBadge(selectedRecord.status).text}`}>
                  {getStatusBadge(selectedRecord.status).label}
                </span>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setSelectedRecord(null)} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {adjustmentRecord && (
        <AdditionalAdjustmentModal
          open={!!adjustmentRecord}
          onClose={() => setAdjustmentRecord(null)}
          onSuccess={() => {
            fetchReconciliation();
            setAdjustmentRecord(null);
          }}
          projectOptions={projectOptions}
          defaultProjectId={adjustmentRecord.project_id}
          barangId={adjustmentRecord.barang_id}
          barangNama={adjustmentRecord.nama_barang}
          clusterId={adjustmentRecord.cluster_id}
          clusterNama={adjustmentRecord.nama_cluster}
        />
      )}
    </div>
  );
}
