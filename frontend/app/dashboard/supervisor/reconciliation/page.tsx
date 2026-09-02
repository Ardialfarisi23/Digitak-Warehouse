"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Search, PackageCheck, PackageMinus, Package, ClipboardCheck, X, ArrowUpRight, AlertTriangle, Loader2, Upload, FileSpreadsheet, CheckCircle2, FileText, Plus, Trash2, Download } from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const RECONCILIATION_ENDPOINT = `${API_BASE}/api/reconciliation/inventory`;

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

  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showMitraModal, setShowMitraModal] = useState(false);
  const [mitraFlow, setMitraFlow] = useState<"select" | "upload" | "manual">("select");
  const [mitraFile, setMitraFile] = useState<File | null>(null);
  const [mitraPreview, setMitraPreview] = useState<any>(null);
  const [mitraLoading, setMitraLoading] = useState(false);
  const [mitraError, setMitraError] = useState<string | null>(null);
  const [mitraConfirming, setMitraConfirming] = useState(false);
  const [manualRows, setManualRows] = useState<any[]>([]);
  const [manualForm, setManualForm] = useState({ kode_tiket: "", project_nama: "", mos: "", used: "" });

  const fetchReconciliation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await get(`${RECONCILIATION_ENDPOINT}?${params.toString()}`);

      if (response.status === 403) {
        setError("Anda tidak memiliki akses ke data rekonsiliasi ini.");
        setRecords([]);
        return;
      }

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || "Gagal mengambil data rekonsiliasi inventory.");
      }

      const payload = json?.data ?? [];
      const list: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

      const mapped: ReconciliationRecord[] = list.map((item: any) => ({
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
        boq: Number(item.boq ?? 0),
        additional: Number(item.additional ?? 0),
        mos_sistem: Number(item.mos_sistem ?? 0),
        mos_mitra: Number(item.mos_mitra ?? 0),
        selisih: Number(item.selisih ?? 0),
        used: Number(item.used ?? 0),
        remains: Number(item.remains ?? 0),
        status: (item.status as ReconciliationRecord["status"]) ?? "berjalan",
      }));

      setRecords(mapped);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Terjadi kesalahan saat mengambil data rekonsiliasi.");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchReconciliation();
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
      { boq: 0, additional: 0, mos_sistem: 0, mos_mitra: 0, selisih: 0, used: 0, remains: 0 },
    );
  }, [filteredRecords]);

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

        {error && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
          <KpiCard title="BOQ" value={formatNumber(summary.boq)} description="Rencana awal" icon={ClipboardCheck} tone="slate" />
          <KpiCard title="Additional" value={formatNumber(summary.additional)} description="Tambahan di luar BOQ" icon={Package} tone="slate" />
          <KpiCard title="MOS Sistem" value={formatNumber(summary.mos_sistem)} description="Material on Site (Sistem)" icon={PackageCheck} tone="slate" />
          <KpiCard title="MOS Mitra" value={formatNumber(summary.mos_mitra)} description="Material on Site (Mitra)" icon={PackageCheck} tone="slate" />
          <KpiCard title="Selisih" value={formatNumber(summary.selisih)} description="MOS Mitra - MOS Sistem" icon={AlertTriangle} tone={summary.selisih !== 0 ? "rose" : "slate"} />
          <KpiCard title="Used" value={formatNumber(summary.used)} description="Sudah digunakan" icon={PackageMinus} tone="slate" />
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
              <button type="button" onClick={openMitraModal} className="flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600">
                <Upload size={16} />
                Input laporan mitra
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

        {/* Catatan / Keterangan Rumus */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Catatan & Rumus Kalkulasi</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">Selisih = MOS Mitra - MOS Sistem</p>
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
      </div>

      {/* Detail Modal */}
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
                    <p className="mt-1 text-xs leading-relaxed text-rose-600">Qty Used melebihi Hardware on Site. Kondisi ini perlu diperiksa sebelum transaksi outbound berikutnya diproses.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setSelectedRecord(null)} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Laporan Mitra Modal */}
      {showMitraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={closeMitraModal}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Input Laporan Mitra</h2>
                <p className="text-xs text-slate-500">Pilih metode input untuk memperbarui nilai MOS Mitra.</p>
              </div>
              <button type="button" onClick={closeMitraModal} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {mitraError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{mitraError}</div>}

              {mitraFlow === "select" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMitraFlow("upload")}
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition-colors hover:border-orange-400 hover:bg-orange-50/50"
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
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                  >
                    <FileText size={36} className="text-blue-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Input Manual Data</p>
                      <p className="mt-1 text-xs text-slate-400">Masukkan data laporan mitra secara manual per kode tiket.</p>
                    </div>
                  </button>
                </div>
              )}

              {mitraFlow === "upload" && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMitraFlow("select");
                      setMitraFile(null);
                      setMitraPreview(null);
                      setMitraError(null);
                    }}
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
                        <input type="file" accept=".xlsx, .xls" onChange={handleMitraFileChange} className="hidden" />
                      </label>

                      {mitraFile && <p className="mt-3 text-xs font-medium text-slate-600">File terpilih: {mitraFile.name}</p>}

                      {mitraFile && (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={handleMitraUpload}
                            disabled={mitraLoading}
                            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            {mitraLoading && <Loader2 size={14} className="animate-spin" />}
                            {mitraLoading ? "Memproses..." : "Pratinjau Data"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                        <span className="flex items-center gap-2 font-medium">
                          <CheckCircle2 size={16} className="text-emerald-600" /> File berhasil diproses
                        </span>
                        <span className="font-semibold">{mitraPreview?.preview?.length || 0} baris ditemukan</span>
                      </div>

                      <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 bg-slate-100">
                            <tr>
                              <th className="p-2.5">Kode Tiket</th>
                              <th className="p-2.5">Project</th>
                              <th className="p-2.5 text-right">MOS</th>
                              <th className="p-2.5 text-right">Used</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(mitraPreview?.preview || []).map((row: any, idx: number) => (
                              <tr key={idx}>
                                <td className="p-2.5 font-medium">{row.kode_tiket}</td>
                                <td className="p-2.5">{row.project_nama}</td>
                                <td className="p-2.5 text-right">{formatNumber(row.mos || 0)}</td>
                                <td className="p-2.5 text-right">{formatNumber(row.used || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mitraFlow === "manual" && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMitraFlow("select");
                      setManualRows([]);
                      setMitraError(null);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    <ArrowUpRight size={12} className="-rotate-90" />
                    Kembali ke pilihan
                  </button>

                  <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-4">
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Kode Tiket</label>
                      <input
                        type="text"
                        value={manualForm.kode_tiket}
                        onChange={(e) => setManualForm({ ...manualForm, kode_tiket: e.target.value })}
                        placeholder="TKT-..."
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Project</label>
                      <input
                        type="text"
                        value={manualForm.project_nama}
                        onChange={(e) => setManualForm({ ...manualForm, project_nama: e.target.value })}
                        placeholder="Nama project"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">MOS Mitra</label>
                      <input
                        type="number"
                        value={manualForm.mos}
                        onChange={(e) => setManualForm({ ...manualForm, mos: e.target.value })}
                        placeholder="0"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-500">Used Mitra</label>
                      <input
                        type="number"
                        value={manualForm.used}
                        onChange={(e) => setManualForm({ ...manualForm, used: e.target.value })}
                        placeholder="0"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400"
                      />
                    </div>
                    <div className="col-span-2 flex items-end sm:col-span-4">
                      <button type="button" onClick={handleAddManualRow} className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600">
                        <Plus size={14} />
                        Tambah Baris Data
                      </button>
                    </div>
                  </div>

                  {manualRows.length > 0 && (
                    <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-100">
                          <tr>
                            <th className="p-2.5">Kode Tiket</th>
                            <th className="p-2.5">Project</th>
                            <th className="p-2.5 text-right">MOS</th>
                            <th className="p-2.5 text-right">Used</th>
                            <th className="p-2.5 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {manualRows.map((row, idx) => (
                            <tr key={idx}>
                              <td className="p-2.5 font-medium">{row.kode_tiket}</td>
                              <td className="p-2.5">{row.project_nama}</td>
                              <td className="p-2.5 text-right">{formatNumber(row.mos)}</td>
                              <td className="p-2.5 text-right">{formatNumber(row.used)}</td>
                              <td className="p-2.5 text-center">
                                <button type="button" onClick={() => handleRemoveManualRow(idx)} className="text-rose-500 hover:text-rose-700">
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

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={closeMitraModal} className="rounded-full border border-slate-200 px-5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                Batal
              </button>
              {(mitraPreview || manualRows.length > 0) && (
                <button type="button" onClick={handleMitraConfirm} disabled={mitraConfirming} className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
                  {mitraConfirming && <Loader2 size={14} className="animate-spin" />}
                  {mitraConfirming ? "Menyimpan..." : "Simpan & Konfirmasi"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
