"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  Search,
  PackageCheck,
  PackageMinus,
  Package,
  ClipboardCheck,
  X,
  ArrowUpRight,
  AlertTriangle,
  Loader2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  Wallet,
  Eye,
  FileClock,
  Download,
} from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const RECONCILIATION_ENDPOINT =
  `${API_BASE}/api/reconciliation/inventory`;

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

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
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

export default function ReconciliationInventoryPage() {
  const { user } = useAuth();
  const { get, post } = useApi();

  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [showMitraModal, setShowMitraModal] = useState(false);
  const [mitraFlow, setMitraFlow] = useState<"select" | "upload" | "manual">("select");
  const [mitraFile, setMitraFile] = useState<File | null>(null);
  const [mitraPreview, setMitraPreview] = useState<any>(null);
  const [mitraLoading, setMitraLoading] = useState(false);
  const [mitraError, setMitraError] = useState<string | null>(null);
  const [mitraConfirming, setMitraConfirming] = useState(false);
  const [manualRows, setManualRows] = useState<any[]>([]);
  const [manualForm, setManualForm] = useState({ kode_tiket: "", project_nama: "", mos: "", used: "" });
  const [exporting, setExporting] = useState(false);

  const [reconcTab, setReconcTab] = useState<"inventory" | "history">("inventory");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyDetail, setHistoryDetail] = useState<any>(null);
  const [historyActor, setHistoryActor] = useState("");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");

  useEffect(() => {
    if (!user) return;
    const currentRole = mapRole(user.role);
    if (currentRole !== "admin") {
      window.location.href = "/";
    }
  }, [user]);

  const fetchReconciliation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await get(RECONCILIATION_ENDPOINT);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Gagal mengambil data rekonsiliasi inventory.");
      }

      const payload = json?.data ?? [];
      let list: any[] = [];
      if (Array.isArray(payload)) {
        list = payload;
      } else if (Array.isArray(payload?.data)) {
        list = payload.data;
      }

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
          id: String(item.id ?? item.reconciliation_id ?? item.boq_id ?? ""),
          project_id: String(item.project_id ?? ""),
          project_nama: item.project_nama ?? item.project?.nama_project ?? "-",
          cluster_id: item.cluster_id ?? item.project?.cluster_id ?? "-",
          area: item.area ?? item.project?.area ?? "-",
          tiket_id: String(item.tiket_id ?? item.tiket?.tiket_id ?? ""),
          kode_tiket: item.kode_tiket ?? item.tiket?.kode_tiket ?? "-",
          barang_id: String(item.barang_id ?? ""),
          kode_perangkat: item.kode_perangkat ?? item.barang?.kode_perangkat ?? "-",
          nama_barang: item.nama_barang ?? item.barang?.nama_barang ?? "-",
          gudang_nama: item.gudang_nama ?? item.gudang?.nama_gudang ?? "-",
          satuan: item.satuan ?? item.satuan?.kode_satuan ?? item.barang?.satuan_default?.kode_satuan ?? "-",
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
      setLastRefreshed(new Date());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Terjadi kesalahan saat mengambil data rekonsiliasi.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(historyPage));
      params.set("limit", "20");
      if (historyActor) params.set("actorId", historyActor);
      if (historyStartDate) params.set("startDate", historyStartDate);
      if (historyEndDate) params.set("endDate", historyEndDate);

      const response = await get(`${API_BASE}/api/reports/reconciliation-upload-logs?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Gagal mengambil riwayat upload.");
      }

      const rows = Array.isArray(json?.data?.data) ? json.data.data : [];
      setHistoryData(rows);
      setHistoryTotal(json?.data?.meta?.total || 0);
      setHistoryTotalPages(json?.data?.meta?.totalPages || 1);
    } catch (caughtError) {
      setHistoryError(caughtError instanceof Error ? caughtError.message : "Terjadi kesalahan saat mengambil riwayat upload.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleMitraFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMitraFile(file);
    setMitraError(null);
    setMitraPreview(null);
  };

  const handleMitraUpload = async () => {
    if (!mitraFile) return;
    setMitraLoading(true);
    setMitraError(null);
    setMitraPreview(null);
    try {
      const formData = new FormData();
      formData.append("file", mitraFile);

      const res = await post(`${API_BASE}/api/reports/reconciliation/upload`, formData);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengunggah file laporan mitra.");
      }

      setMitraPreview(json?.data || json);
    } catch (err) {
      setMitraError(err instanceof Error ? err.message : "Terjadi kesalahan saat upload.");
    } finally {
      setMitraLoading(false);
    }
  };

  const handleMitraConfirm = async () => {
    if (!mitraPreview && manualRows.length === 0) return;
    if (!user?.id) return;
    setMitraConfirming(true);
    setMitraError(null);
    try {
      const payload = {
        filename: mitraPreview?.filename || "manual-input",
        preview: mitraPreview?.preview || manualRows,
        actorId: user.id,
      };

      const res = await post(`${API_BASE}/api/reports/reconciliation/confirm`, payload);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal menyimpan hasil laporan mitra.");
      }

      closeMitraModal();
      fetchReconciliation();
    } catch (err) {
      setMitraError(err instanceof Error ? err.message : "Terjadi kesalahan saat konfirmasi.");
    } finally {
      setMitraConfirming(false);
    }
  };

  const handleAddManualRow = () => {
    if (!manualForm.kode_tiket.trim() || !manualForm.project_nama.trim() || !manualForm.mos.trim()) {
      setMitraError("Kode Tiket, Project, dan MOS wajib diisi.");
      return;
    }
    setMitraError(null);
    setManualRows([
      ...manualRows,
      {
        kode_tiket: manualForm.kode_tiket.trim(),
        project_nama: manualForm.project_nama.trim(),
        mos: Number(manualForm.mos) || 0,
        used: Number(manualForm.used) || 0,
      },
    ]);
    setManualForm({ kode_tiket: "", project_nama: "", mos: "", used: "" });
  };

  const handleRemoveManualRow = (idx: number) => {
    setManualRows(manualRows.filter((_, i) => i !== idx));
  };

  const openMitraModal = () => {
    setShowMitraModal(true);
    setMitraFlow("select");
    setMitraFile(null);
    setMitraPreview(null);
    setMitraError(null);
    setManualRows([]);
    setManualForm({ kode_tiket: "", project_nama: "", mos: "", used: "" });
  };

  const closeMitraModal = () => {
    setShowMitraModal(false);
    setMitraFlow("select");
    setMitraFile(null);
    setMitraPreview(null);
    setMitraError(null);
    setMitraConfirming(false);
    setManualRows([]);
    setManualForm({ kode_tiket: "", project_nama: "", mos: "", used: "" });
  };

  useEffect(() => {
    if (!user) return;
    fetchReconciliation();
  }, [user]);

  useEffect(() => {
    if (reconcTab === "history") {
      fetchHistory();
    }
  }, [reconcTab, historyPage, historyActor, historyStartDate, historyEndDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchReconciliation();
    }, 5000);

    const handleRefresh = () => {
      fetchReconciliation();
    };

    window.addEventListener("reconciliation:refresh", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("reconciliation:refresh", handleRefresh);
    };
  }, [get, post]);

  const projectOptions = useMemo(() => {
    return Array.from(
      new Map(records.map((item) => [item.project_id, item.project_nama])).entries()
    );
  }, [records]);

  const warehouseOptions = useMemo(() => {
    return Array.from(new Set(records.map((item) => item.gudang_nama).filter(Boolean)));
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = search.toLowerCase();
    return records.filter((record) => {
      const matchesSearch =
        !query ||
        [record.project_nama, record.cluster_id, record.area, record.kode_tiket, record.kode_perangkat, record.nama_barang, record.gudang_nama]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesProject = projectFilter === "all" || record.project_id === projectFilter;
      const matchesWarehouse = warehouseFilter === "all" || record.gudang_nama === warehouseFilter;
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;

      return matchesSearch && matchesProject && matchesWarehouse && matchesStatus;
    });
  }, [records, search, projectFilter, warehouseFilter, statusFilter]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const headers = [
        "Project",
        "Kode Tiket",
        "Barang",
        "Kode Perangkat",
        "Gudang",
        "Satuan",
        "BOQ",
        "Additional",
        "MOS Sistem",
        "MOS Mitra",
        "Selisih",
        "Used",
        "Remains",
        "Status",
      ];

      const escapeCsv = (value: string | number) => {
        const str = String(value ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = filteredRecords.map((r) => [
        escapeCsv(r.project_nama),
        escapeCsv(r.kode_tiket),
        escapeCsv(r.nama_barang),
        escapeCsv(r.kode_perangkat),
        escapeCsv(r.gudang_nama),
        escapeCsv(r.satuan),
        escapeCsv(r.boq),
        escapeCsv(r.additional),
        escapeCsv(r.mos_sistem),
        escapeCsv(r.mos_mitra),
        escapeCsv(r.selisih),
        escapeCsv(r.used),
        escapeCsv(r.remains),
        escapeCsv(r.status),
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rekoncilasi-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengekspor rekonsiliasi:", err);
    } finally {
      setExporting(false);
    }
  };

  const summary = useMemo(() => {
    return filteredRecords.reduce(
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
      { boq: 0, additional: 0, mos_sistem: 0, mos_mitra: 0, selisih: 0, used: 0, remains: 0 }
    );
  }, [filteredRecords]);

  const totalPerhatian = useMemo(
    () => filteredRecords.filter((r) => r.status === "perhatian").length,
    [filteredRecords]
  );

  return (
    <div className={`${plusJakartaSans.className}`}>
      <div className="flex flex-1 flex-col p-6">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Rekonsiliasi Inventory</h1>
            <p className="mt-1 text-sm text-slate-500">
              Pantau kesesuaian BOQ dengan realisasi hardware pada setiap project dan tiket.
            </p>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-7">
          <KpiCard title="BOQ" value={formatNumber(summary.boq)} description="Rencana awal" icon={ClipboardCheck} tone="slate" />
          <KpiCard title="Additional" value={formatNumber(summary.additional)} description="Tambahan di luar BOQ" icon={Package} tone="slate" />
          <KpiCard title="MOS Sistem" value={formatNumber(summary.mos_sistem)} description="Material on Site (Sistem)" icon={PackageCheck} tone="slate" />
          <KpiCard title="MOS Mitra" value={formatNumber(summary.mos_mitra)} description="Material on Site (Mitra)" icon={PackageCheck} tone="slate" />
          <KpiCard
            title="Selisih"
            value={formatNumber(summary.selisih)}
             description="MOS Sistem - MOS Mitra"
            icon={AlertTriangle}
            tone={summary.selisih !== 0 ? "rose" : "slate"}
          />
          <KpiCard title="Used" value={formatNumber(summary.used)} description="Sudah digunakan" icon={PackageMinus} tone="slate" />
          <KpiCard title="Remains" value={formatNumber(summary.remains)} description="Sisa setelah used" icon={Wallet} tone="slate" />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setReconcTab("inventory")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              reconcTab === "inventory" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ClipboardCheck size={16} />
            Rekonsiliasi
          </button>
          <button
            type="button"
            onClick={() => { setReconcTab("history"); setHistoryPage(1); }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              reconcTab === "history" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileClock size={16} />
            Riwayat Input Laporan Mitra
          </button>
        </div>

        {reconcTab === "inventory" && (
          <>
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

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
          >
            <option value="all">Semua Project</option>
            {projectOptions.map(([id, nama]) => (
              <option key={id} value={id}>
                {nama}
              </option>
            ))}
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
          >
            <option value="all">Semua Gudang</option>
            {warehouseOptions.map((warehouse) => (
              <option key={warehouse} value={warehouse}>
                {warehouse}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
          >
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
                {totalPerhatian > 0 && (
                  <span className="ml-2 text-amber-600">{totalPerhatian} perhatian</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {lastRefreshed && (
                <span className="text-xs text-slate-400">
                  Terakhir diperbarui: {lastRefreshed.toLocaleTimeString("id-ID")}
                </span>
              )}
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {exporting ? "Mengekspor..." : "Ekspor"}
              </button>
              <button
                type="button"
                onClick={openMitraModal}
                className="flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600"
              >
                <Upload size={16} />
                Input laporan mitra
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
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
                ) : error ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-16 text-center text-sm text-rose-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-16 text-center">
                      <Package size={28} className="mx-auto text-slate-300" />
                      <p className="mt-3 text-sm font-medium text-slate-600">Tidak ada data rekonsiliasi</p>
                      <p className="mt-1 text-xs text-slate-400">Coba ubah filter atau kata pencarian.</p>
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
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {record.kode_tiket}
                          </span>
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
                          <span className={isSelisih ? "font-semibold text-amber-700" : "font-semibold text-slate-700"}>
                            {formatNumber(record.selisih)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right text-slate-600">{formatNumber(record.used)}</td>

                        <td className="px-6 py-4 text-right">
                          <span className={record.remains < 0 ? "font-semibold text-rose-600" : "font-semibold text-emerald-700"}>
                            {formatNumber(record.remains)}
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
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(record)}
                              title="Lihat detail"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
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

        {/* Catatan / Keterangan Rumus */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Catatan & Rumus Kalkulasi</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">Selisih = MOS Sistem - MOS Mitra</p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                Menampilkan perbedaan jumlah material yang tercatat mitra dibanding sistem. Jika <span className="font-semibold">Selisih ≠ 0</span>, baris akan diberi highlight kuning sebagai tanda ketidaksesuaian data.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-emerald-800">Remains = MOS - (BOQ Plan + Additional)</p>
              <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">
                Sisa material yang masih tersedia setelah memenuhi rencana BOQ dan tambahan. Jika <span className="font-semibold">Remains &lt; 0</span>, berarti material yang digunakan melebihi yang tersedia.
              </p>
            </div>
          </div>
        </div>
      </>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Detail Rekonsiliasi</h2>
                <p className="text-xs text-slate-500">Rincian BOQ dan realisasi hardware.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-400">Project</p>
                <p className="mt-1 font-semibold text-slate-900">{selectedRecord.project_nama}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] text-slate-500">
                    Tiket: {selectedRecord.kode_tiket}
                  </span>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] text-slate-500">
                    Area: {selectedRecord.area}
                  </span>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] text-slate-500">
                    Gudang: {selectedRecord.gudang_nama}
                  </span>
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

              {selectedRecord.remains < 0 && (
                <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-600" />
                  <div>
                    <p className="text-sm font-semibold text-rose-800">Remains tidak valid</p>
                    <p className="mt-1 text-xs leading-relaxed text-rose-600">
                      Qty Used melebihi MOS (Sistem). Kondisi ini perlu diperiksa sebelum transaksi outbound berikutnya diproses.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          INPUT LAPORAN MITRA MODAL
      ===================================================== */}

      {showMitraModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeMitraModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Input Laporan Mitra</h2>
                <p className="text-xs text-slate-500">Pilih metode input untuk memperbarui nilai MOS Mitra.</p>
              </div>
              <button
                type="button"
                onClick={closeMitraModal}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Flow Selection */}
              {mitraFlow === "select" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMitraFlow("upload")}
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center hover:border-orange-400 hover:bg-orange-50/50 transition-colors"
                  >
                    <FileSpreadsheet size={36} className="text-orange-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Upload File Excel</p>
                      <p className="mt-1 text-xs text-slate-400">Unggah file Excel laporan compile material mitra untuk diproses otomatis.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMitraFlow("manual")}
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                  >
                    <FileText size={36} className="text-blue-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Input Manual Data</p>
                      <p className="mt-1 text-xs text-slate-400">Masukkan data laporan mitra secara manual per kode tiket.</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Upload Flow */}
              {mitraFlow === "upload" && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => { setMitraFlow("select"); setMitraFile(null); setMitraPreview(null); setMitraError(null); }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    <ArrowUpRight size={12} className="-rotate-90" />
                    Kembali ke pilihan
                  </button>

                  {!mitraPreview ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                      <FileSpreadsheet size={32} className="mx-auto text-slate-400" />
                      <p className="mt-2 text-sm font-semibold text-slate-700">Upload Laporan Compile Material</p>
                      <p className="mt-1 text-xs text-slate-400">Format Excel (.xlsx, .xls). Multi Kode Tiket dalam satu file didukung.</p>

                      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600">
                        <Upload size={16} />
                        Pilih File
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleMitraFileChange}
                          className="hidden"
                        />
                      </label>

                      {mitraFile && (
                        <p className="mt-3 text-xs text-slate-600">
                          File terpilih: <span className="font-semibold">{mitraFile.name}</span> ({(mitraFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Pratinjau Hasil Parsing</p>
                        <span className="text-xs text-slate-400">
                          {mitraPreview.preview?.length || 0} baris berhasil, {mitraPreview.failed?.length || 0} baris gagal
                        </span>
                      </div>

                      <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kode Tiket</th>
                              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project</th>
                              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">MOS</th>
                              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Used</th>
                              <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {(mitraPreview.preview || []).map((row: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-mono text-xs font-semibold text-orange-600">{row.kode_tiket}</td>
                                <td className="px-4 py-2 text-slate-700">{row.project_nama}</td>
                                <td className="px-4 py-2 text-right font-mono text-slate-600">{row.mos}</td>
                                <td className="px-4 py-2 text-right font-mono text-slate-600">{row.used}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    <CheckCircle2 size={12} />
                                    OK
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {(mitraPreview.failed || []).map((row: any, idx: number) => (
                              <tr key={`fail-${idx}`} className="bg-rose-50/50 hover:bg-rose-50">
                                <td className="px-4 py-2 font-mono text-xs font-semibold text-slate-700">{row.kode_tiket || "-"}</td>
                                <td className="px-4 py-2 text-slate-700">-</td>
                                <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
                                <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
                                <td className="px-4 py-2 text-center">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                    <AlertTriangle size={12} />
                                    {row.reason}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Flow */}
              {mitraFlow === "manual" && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => { setMitraFlow("select"); setManualRows([]); setMitraError(null); setManualForm({ kode_tiket: "", project_nama: "", mos: "", used: "" }); }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    <ArrowUpRight size={12} className="-rotate-90" />
                    Kembali ke pilihan
                  </button>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Tambah Data Manual</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <input
                        type="text"
                        value={manualForm.kode_tiket}
                        onChange={(e) => setManualForm({ ...manualForm, kode_tiket: e.target.value })}
                        placeholder="Kode Tiket"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                      />
                      <input
                        type="text"
                        value={manualForm.project_nama}
                        onChange={(e) => setManualForm({ ...manualForm, project_nama: e.target.value })}
                        placeholder="Project"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                      />
                      <input
                        type="number"
                        value={manualForm.mos}
                        onChange={(e) => setManualForm({ ...manualForm, mos: e.target.value })}
                        placeholder="MOS"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                      />
                      <input
                        type="number"
                        value={manualForm.used}
                        onChange={(e) => setManualForm({ ...manualForm, used: e.target.value })}
                        placeholder="Used (opsional)"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddManualRow}
                      className="mt-3 flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-600"
                    >
                      <Plus size={14} />
                      Tambah Baris
                    </button>
                  </div>

                  {manualRows.length > 0 && (
                    <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kode Tiket</th>
                            <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project</th>
                            <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">MOS</th>
                            <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Used</th>
                            <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {manualRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-mono text-xs font-semibold text-orange-600">{row.kode_tiket}</td>
                              <td className="px-4 py-2 text-slate-700">{row.project_nama}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-600">{row.mos}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-600">{row.used}</td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveManualRow(idx)}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                  title="Hapus baris"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error */}
            {mitraError && (
              <div className="mx-6 mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertTriangle size={16} className="shrink-0" />
                {mitraError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={closeMitraModal}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              {(mitraPreview || manualRows.length > 0) && mitraFlow !== "select" && (
                <button
                  type="button"
                  onClick={handleMitraConfirm}
                  disabled={mitraConfirming}
                  className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-60"
                >
                  {mitraConfirming && <Loader2 size={14} className="animate-spin" />}
                  {mitraConfirming ? "Menyimpan…" : "Konfirmasi & Simpan"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {reconcTab === "history" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-700">
            Tabel ini menampilkan histori upload laporan mitra. Setiap baris merepresentasikan 1 sesi upload file Excel.
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-2 px-6">
            <div className="relative">
              <input
                type="date"
                value={historyStartDate}
                onChange={(e) => { setHistoryStartDate(e.target.value); setHistoryPage(1); }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
              />
            </div>
            <div className="relative">
              <input
                type="date"
                value={historyEndDate}
                onChange={(e) => { setHistoryEndDate(e.target.value); setHistoryPage(1); }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Waktu Upload</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nama File</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Diunggah Oleh</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Berhasil</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gagal</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4" colSpan={8}>
                        <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : historyError ? (
                  <tr>
                    <td className="px-6 py-16 text-center text-sm text-rose-500" colSpan={8}>{historyError}</td>
                  </tr>
                ) : historyData.length === 0 ? (
                  <tr>
                    <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={8}>
                      Belum ada riwayat upload laporan mitra.
                    </td>
                  </tr>
                ) : (
                  historyData.map((r) => {
                    const allSuccess = r.failed_rows === 0 && r.success_rows > 0;
                    const hasFailed = r.failed_rows > 0;
                    const overallStatus = allSuccess ? "berhasil" : hasFailed ? "sebagian_gagal" : "draft";
                    return (
                      <tr
                        key={r.upload_id}
                        className="group cursor-pointer transition-colors hover:bg-slate-50"
                        onClick={() => setHistoryDetail(r)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
                          {new Date(r.uploaded_at).toLocaleString("id-ID")}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{r.filename}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{r.uploaded_by_nama}</div>
                          <div className="text-xs text-slate-500">{r.uploaded_by_role}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-600">{r.total_rows}</td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-emerald-600">{r.success_rows}</td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-rose-600">{r.failed_rows}</td>
                        <td className="px-6 py-4">
                          {overallStatus === "berhasil" && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Berhasil</span>}
                          {overallStatus === "sebagian_gagal" && <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700">Sebagian Gagal</span>}
                          {overallStatus === "draft" && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Draft</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            onClick={(e) => { e.stopPropagation(); setHistoryDetail(r); }}
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {historyTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-between px-6 pb-4 text-xs text-slate-500">
              <span>
                Menampilkan {((historyPage - 1) * 20) + 1}–{Math.min(historyPage * 20, historyTotal)} dari {historyTotal} entri
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage === 1 || historyLoading}
                  className="rounded-full border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
                >
                  Sebelumnya
                </button>
                <span className="font-mono">
                  {historyPage} / {historyTotalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                  disabled={historyPage === historyTotalPages || historyLoading}
                  className="rounded-full border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {historyDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setHistoryDetail(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Detail Upload Laporan Mitra</h2>
                <p className="text-xs text-slate-500">Rincian sesi upload dan status per baris.</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDetail(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">Nama File</p>
                  <p className="text-sm font-semibold text-slate-800">{historyDetail.filename}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Waktu Upload</p>
                  <p className="text-sm font-semibold text-slate-800">{new Date(historyDetail.uploaded_at).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Diunggah Oleh</p>
                  <p className="text-sm font-semibold text-slate-800">{historyDetail.uploaded_by_nama}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Total / Berhasil / Gagal</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {historyDetail.total_rows} / {historyDetail.success_rows} / {historyDetail.failed_rows}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-400 mb-3">Detail Baris</p>
                {historyDetail.details && historyDetail.details.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kode Tiket</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-right">MOS</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-right">Used</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Alasan Gagal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {historyDetail.details.map((d: any) => (
                          <tr key={d.detail_id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-semibold text-slate-700">{d.kode_tiket}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600">{d.mos}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600">{d.used}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${d.status === "berhasil" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                {d.status === "berhasil" ? "Berhasil" : "Gagal"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500">{d.reason || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Tidak ada detail baris untuk upload ini.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setHistoryDetail(null)}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                 Tutup
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   </div>
   );
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
    <div className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-slate-50">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={highlight ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-slate-800"}>
        {formatNumber(value)}
      </span>
    </div>
  );
}
