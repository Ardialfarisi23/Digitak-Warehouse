"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Search, PackageCheck, PackageMinus, Package, ClipboardCheck, X, AlertTriangle, Download, History, CheckCircle, Clock, AlertCircle } from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const RECONCILIATION_ENDPOINT = `${API_BASE}/api/reconciliation/inventory`;
const HISTORY_ENDPOINT = `${API_BASE}/api/reports/reconciliation/history`;

interface ReconciliationRecord {
  id: string;
  project_id: string;
  project_nama: string;
  cluster_id: string;
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
  mos_sistem: number;
  mos_mitra: number;
  selisih: number;
  used: number;
  remains: number;
  status: "sesuai" | "berjalan" | "perhatian";
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
    case "berjalan":
      return { label: "Berjalan", bg: "bg-blue-50", text: "text-blue-600", icon: Package };
    case "perhatian":
      return { label: "Perhatian", bg: "bg-amber-50", text: "text-amber-600", icon: AlertTriangle };
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
  const { get } = useApi();

  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<"rekonsiliasi" | "riwayat">("rekonsiliasi");

  // State Rekonsiliasi
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State Riwayat Input Laporan Mitra
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const fetchReconciliation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());

      const response = await get(`${RECONCILIATION_ENDPOINT}?${params.toString()}`);

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
        const mosSistem = Number(item.mos_sistem ?? item.hardware_on_site ?? item.qty_on_site ?? 0);
        const mosMitra = Number(item.mos_mitra ?? 0);
        const used = Number(item.used ?? item.qty_used ?? 0);
        const remains = mosSistem - (boq + additional);
        const selisih = mosSistem - mosMitra;

        let recStatus: ReconciliationRecord["status"] = "berjalan";
        if (remains < 0) {
          recStatus = "perhatian";
        } else if (mosSistem >= boq + additional && boq > 0) {
          recStatus = "sesuai";
        }

        return {
          id: String(item.id ?? ""),
          project_id: String(item.project_id ?? ""),
          project_nama: item.project_nama ?? "-",
          cluster_id: item.cluster_id ?? "-",
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
          mos_sistem: mosSistem,
          mos_mitra: mosMitra,
          selisih,
          used,
          remains,
          status: recStatus,
        };
      });

      setRecords(mapped);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Terjadi kesalahan saat mengambil data rekonsiliasi.");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

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
    fetchReconciliation();
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchReconciliation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const projectOptions = useMemo(() => {
    return Array.from(new Map(records.map((item) => [item.project_id, item.project_nama])).entries());
  }, [records]);

  const warehouseOptions = useMemo(() => {
    return Array.from(new Set(records.map((item) => item.gudang_nama).filter(Boolean)));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesProject = projectFilter === "all" || record.project_id === projectFilter;
      const matchesWarehouse = warehouseFilter === "all" || record.gudang_nama === warehouseFilter;
      return matchesProject && matchesWarehouse;
    });
  }, [records, projectFilter, warehouseFilter]);

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
    return records.reduce(
      (total, item) => {
        total.boq += item.boq;
        total.additional += item.additional;
        total.mos_sistem += item.mos_sistem;
        total.mos_mitra += item.mos_mitra;
        total.selisih += item.selisih;
        total.used += item.used;
        total.remains += item.remains;
        return total;
      },
      { boq: 0, additional: 0, mos_sistem: 0, mos_mitra: 0, selisih: 0, used: 0, remains: 0 },
    );
  }, [records]);

  const totalPerhatian = useMemo(() => filteredRecords.filter((r) => r.status === "perhatian").length, [filteredRecords]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = ["Project", "Area", "Cluster", "Kode Tiket", "Kode Perangkat", "Nama Barang", "Gudang", "Satuan", "BOQ", "Additional", "MOS Sistem", "MOS Mitra", "Selisih", "Used", "Remains", "Status"];

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
          r.mos_sistem,
          r.mos_mitra,
          r.selisih,
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
            <h1 className="text-2xl font-bold text-slate-900">Rekonsiliasi Inventory (Supervisor)</h1>
            <p className="mt-1 text-sm text-slate-500">Pantau kesesuaian BOQ dengan realisasi hardware di gudang yang menjadi tanggung jawab Anda.</p>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="mb-6 flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("rekonsiliasi")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "rekonsiliasi" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <ClipboardCheck size={16} />
            Rekonsiliasi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("riwayat")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "riwayat" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
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
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-7">
              <KpiCard title="BOQ" value={formatNumber(summary.boq)} description="Rencana awal" icon={ClipboardCheck} tone="slate" />
              <KpiCard title="Additional" value={formatNumber(summary.additional)} description="Tambahan di luar BOQ" icon={Package} tone="slate" />
              <KpiCard title="MOS Sistem" value={formatNumber(summary.mos_sistem)} description="Material on Site (Sistem)" icon={PackageCheck} tone="slate" />
              <KpiCard title="MOS Mitra" value={formatNumber(summary.mos_mitra)} description="Material on Site (Mitra)" icon={PackageCheck} tone="slate" />
              <KpiCard title="Selisih" value={formatNumber(summary.selisih)} description="MOS Mitra - MOS Sistem" icon={AlertTriangle} tone={summary.selisih !== 0 ? "rose" : "slate"} />
              <KpiCard title="Used" value={formatNumber(summary.used)} description="Sudah digunakan" icon={PackageMinus} tone="slate" />
              <KpiCard title="Remains" value={formatNumber(summary.remains)} description="Sisa ketersediaan" icon={Package} tone={summary.remains < 0 ? "rose" : "slate"} />
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari project, tiket, kode perangkat..."
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>

              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400">
                <option value="all">Semua Project</option>
                {projectOptions.map(([id, nama]) => (
                  <option key={id} value={id}>
                    {nama}
                  </option>
                ))}
              </select>

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
                <option value="berjalan">Berjalan</option>
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

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project</th>
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kode Tiket</th>
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Barang</th>
                      <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">BOQ</th>
                      <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Additional</th>
                      <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">MOS Sistem</th>
                      <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">MOS Mitra</th>
                      <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Selisih</th>
                      <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Used</th>
                      <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Remains</th>
                      <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                      <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Aksi</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      Array.from({ length: 7 }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                          {Array.from({ length: 12 }).map((_, colIndex) => (
                            <td key={colIndex} className="px-6 py-4">
                              <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-6 py-16 text-center">
                          <Package size={28} className="mx-auto text-slate-300" />
                          <p className="mt-3 text-sm font-medium text-slate-600">Tidak ada data rekonsiliasi</p>
                          <p className="mt-1 text-xs text-slate-400">Coba ubah filter, atau pastikan Anda sudah ditugaskan sebagai PIC gudang.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => {
                        const statusBadge = getStatusBadge(record.status);
                        const isSelisih = record.selisih !== 0;
                        return (
                          <tr key={record.id} className={`group transition-colors ${isSelisih ? "bg-yellow-50" : "hover:bg-slate-50"}`}>
                            <td className="px-6 py-4">
                              <p className="font-medium text-slate-900">{record.project_nama}</p>
                              <p className="text-xs text-slate-400">
                                {record.area}
                                {record.cluster_id !== "-" && ` • ${record.cluster_id}`}
                              </p>
                            </td>

                            <td className="px-6 py-4">
                              <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{record.kode_tiket}</span>
                            </td>

                            <td className="px-6 py-4">
                              <p className="font-medium text-slate-800">{record.nama_barang}</p>
                              <p className="text-xs text-slate-400">
                                {record.kode_perangkat} • {record.gudang_nama}
                              </p>
                            </td>

                            <td className="px-6 py-4 text-right font-medium text-slate-700">{formatNumber(record.boq)}</td>
                            <td className="px-6 py-4 text-right text-slate-600">{formatNumber(record.additional)}</td>
                            <td className="px-6 py-4 text-right font-medium text-slate-700">{formatNumber(record.mos_sistem)}</td>
                            <td className="px-6 py-4 text-right font-medium text-slate-700">{formatNumber(record.mos_mitra)}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={isSelisih ? "font-semibold text-amber-700" : "font-semibold text-slate-700"}>{formatNumber(record.selisih)}</span>
                            </td>

                            <td className="px-6 py-4 text-right text-slate-600">{formatNumber(record.used)}</td>

                            <td className="px-6 py-4 text-right">
                              <span className={record.remains < 0 ? "font-semibold text-rose-600" : "font-semibold text-emerald-700"}>{formatNumber(record.remains)}</span>
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
                  <p className="mt-2 text-xs leading-relaxed text-indigo-800/90">Tambahan material di luar rencana BOQ awal (misal kelebihan kiriman atau kebutuhan tambahan).</p>
                </div>
                <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-4">
                  <p className="text-xs font-bold text-blue-900">MOS Sistem</p>
                  <p className="mt-2 text-xs leading-relaxed text-blue-800/90">Jumlah material yang tercatat masuk ke project menurut sistem (otomatis dari surat jalan inbound).</p>
                </div>
                <div className="rounded-xl border border-orange-200/80 bg-orange-50/50 p-4">
                  <p className="text-xs font-bold text-orange-900">MOS Mitra</p>
                  <p className="mt-2 text-xs leading-relaxed text-orange-800/90">Jumlah material yang dikonfirmasi diterima oleh mitra di lapangan, diinput manual oleh Admin dari laporan mitra.</p>
                </div>
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
                  <p className="text-xs font-bold text-amber-900">Selisih</p>
                  <p className="mt-2 text-xs leading-relaxed text-amber-800/90">Perbedaan antara catatan sistem dan laporan mitra (MOS Sistem − MOS Mitra). Jika ≠ 0, berarti ada ketidakcocokan yang perlu dicek ulang.</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <p className="text-xs font-bold text-slate-900">Used</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-800/90">Jumlah material yang sudah dikirim ke lapangan untuk dipasang (otomatis dari surat jalan outbound yang disetujui).</p>
                </div>
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
                  <p className="text-xs font-bold text-emerald-900">Remains</p>
                  <p className="mt-2 text-xs leading-relaxed text-emerald-800/90">Sisa material yang masih tersedia setelah dikurangi rencana. Rumus: MOS − (BOQ Plan + Additional). Jika minus, berarti pemakaian sudah melebihi rencana.</p>
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
                    <DetailRow label="MOS Sistem" value={selectedRecord.mos_sistem} />
                    <DetailRow label="MOS Mitra" value={selectedRecord.mos_mitra} />
                    <DetailRow label="Used" value={selectedRecord.used} />
                    <div className="border-t border-slate-100 pt-2">
                      <DetailRow label="Remains" value={selectedRecord.remains} highlight />
                    </div>
                  </div>
              </div>

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
    </div>
  );
}
