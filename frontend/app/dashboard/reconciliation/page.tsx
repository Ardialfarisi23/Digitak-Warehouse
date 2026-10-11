"use client";

import { useEffect, useMemo, useState } from "react";
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
  AlertCircle,
} from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole, formatRole } from "@/lib/navigation";
import BoqPicker, { type BoqPickerItem } from "@/components/BoqPicker";
import BarangPicker, { type BarangPickerItem } from "@/components/BarangPicker";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useAccountStatusGuard } from "@/hooks/use-account-status-guard";
import { exportReconciliationXlsx } from "@/lib/exportReconciliationXlsx";
import { AdditionalAdjustmentModal } from "@/components/additional/AdditionalAdjustmentModal";
import { RemainsNoteForm } from "@/components/reconciliation/RemainsNoteForm";
import { RemainsNoteBadge } from "@/components/reconciliation/RemainsNoteBadge";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const RECONCILIATION_ENDPOINT =
  `${API_BASE}/api/reconciliation/inventory`;

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
  pic_nama: string | null;
  pic_sumber: string | null;
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
  remains: number;
  status: "sesuai" | "perhatian" | "belum_ada_data";
  boq_list: Array<{ boq_id: string; kode_boq: string; status: string }>;
  ada_boq_selesai: boolean;
  remains_note: string | null;
  remains_note_updated_at: string | null;
  temuan_penerimaan?: {
    jumlah_item_bertemuan_selisih: number;
    total_selisih_qty: number;
    detail?: Array<{
      item_id: number;
      qty_dipick_total: number;
      qty_diterima: number;
      selisih_qty: number;
      kondisi_diterima: string | null;
      kondisi_diambil_list: Array<{ kondisi: string; qty: number }>;
      is_kondisi_diambil: boolean;
      has_mismatch: boolean;
      surat_jalan_status: string | null;
    }>;
  } | null;
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
    case "perhatian":
      return { label: "Perhatian", bg: "bg-amber-50", text: "text-amber-600", icon: AlertTriangle };
    case "belum_ada_data":
      return { label: "Belum Ada Data", bg: "bg-slate-50", text: "text-slate-500", icon: Package };
    default:
      return { label: status, bg: "bg-slate-100", text: "text-slate-600", icon: Package };
  }
}

const DUPLICATE_REASON_PREFIX = "duplikat: ";

function isDuplicateReason(reason?: string | null) {
  return Boolean(reason && reason.startsWith(DUPLICATE_REASON_PREFIX));
}

function stripDuplicatePrefix(reason?: string | null) {
  if (!reason) return "-";
  if (reason.startsWith(DUPLICATE_REASON_PREFIX)) {
    return reason.slice(DUPLICATE_REASON_PREFIX.length);
  }
  return reason;
}

export default function ReconciliationInventoryPage() {
  const { user } = useAuth();
  const { get, post } = useApi();

  const { showDeactivatedModal, handleReturnToLogin } = useAccountStatusGuard();

  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [clusterFilter, setClusterFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [boqStatusFilter, setBoqStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);
  const [adjustmentRecord, setAdjustmentRecord] = useState<ReconciliationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [showMitraModal, setShowMitraModal] = useState(false);
  const [mitraFlow, setMitraFlow] = useState<"select" | "upload" | "manual">("select");
  const [mitraFile, setMitraFile] = useState<File | null>(null);
  const [mitraPreview, setMitraPreview] = useState<any>(null);
  const [mitraLoading, setMitraLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [mitraError, setMitraError] = useState<string | null>(null);
  const [mitraConfirming, setMitraConfirming] = useState(false);
  const [manualRows, setManualRows] = useState<Array<{
    id: string;
    barang_id: string;
    nama_barang: string;
    used: string;
    catatan: string;
    kondisi: string;
    expanded: boolean;
  }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedBoqId, setSelectedBoqId] = useState("");
  const [selectedKodeTiket, setSelectedKodeTiket] = useState("");

  const boqItemsQueryParams = useMemo(() => ({ projectId: selectedProjectId }), [selectedProjectId]);
  const manualBoqItemsQueryParams = useMemo(
    () => ({ projectId: selectedProjectId, statuses: "draft,aktif,selesai" }),
    [selectedProjectId]
  );
  const [exporting, setExporting] = useState(false);
  const [mitraReportMeta, setMitraReportMeta] = useState({ tanggal_laporan: new Date().toISOString().slice(0, 10), pic_mitra: "" });

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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20);
  }, [search, projectFilter, clusterFilter, warehouseFilter, statusFilter, boqStatusFilter]);

  const projectOptions = useMemo(() => {
    const baseRecords = adjustmentRecord
      ? records.filter((item) => {
          const matchesBarang = item.barang_id === adjustmentRecord.barang_id;
          const matchesCluster =
            !adjustmentRecord.cluster_id || adjustmentRecord.cluster_id === "-"
              ? true
              : item.cluster_id === adjustmentRecord.cluster_id;
          return matchesBarang && matchesCluster;
        })
      : records;

    return Array.from(new Map(baseRecords.map((item) => [item.project_id, item.project_nama])).entries());
  }, [records, adjustmentRecord]);

  useEffect(() => {
    if (!user) return;

    const currentRole = mapRole(user.role);

    if (currentRole !== "admin") {
      setToast({ message: "Anda tidak memiliki akses ke halaman ini.", type: "error" });

      setTimeout(() => {
        if (currentRole === "supervisor") {
          window.location.href = "/dashboard/supervisor";
        } else if (currentRole === "staff") {
          window.location.href = "/staff/dashboard";
        } else {
          window.location.href = "/dashboard";
        }
      }, 800);
    }
  }, [user]);

  const fetchReconciliation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await get(`${RECONCILIATION_ENDPOINT}?groupBy=cluster`);
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
          const mos = Number(item.mos ?? item.hardware_on_site ?? item.qty_on_site ?? 0);
          const used = Number(item.used ?? item.qty_used ?? 0);
         const remains = Number(item.remains ?? (mos - (boq + additional)));

        const recStatus: ReconciliationRecord["status"] =
          item.status === "sesuai" || item.status === "perhatian" || item.status === "belum_ada_data"
            ? item.status
            : Number(remains) === 0
              ? "sesuai"
              : "perhatian";

        return {
          id: String(item.id ?? item.reconciliation_id ?? item.boq_id ?? ""),
          project_id: String(item.project_id ?? ""),
          project_nama: item.project_nama ?? item.project?.nama_project ?? "-",
          cluster_id: item.cluster_id ?? item.project?.cluster_id ?? "-",
          nama_cluster: item.nama_cluster ?? "-",
          cluster_type: item.cluster_type ?? null,
          project_type: item.project_type ?? null,
          alamat_lengkap: item.alamat_lengkap ?? null,
          kso_partner: item.kso_partner ?? null,
          kso_contact: item.kso_contact ?? null,
          no_tiket_release: item.no_tiket_release ?? null,
          vendor: item.vendor ?? null,
          homepass_plan: item.homepass_plan ?? null,
          status_aktif: item.status_aktif ?? null,
          pic_nama: item.pic_nama ?? null,
          pic_sumber: item.pic_sumber ?? null,
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
          mos,
          used,
          remains,
          status: recStatus,
          boq_list: Array.isArray(item.boq_list) ? item.boq_list : [],
          ada_boq_selesai: Boolean(item.ada_boq_selesai),
          temuan_penerimaan: item.temuan_penerimaan || null,
          remains_note: item.remains_note ?? null,
          remains_note_updated_at: item.remains_note_updated_at ?? null,
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

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    setMitraError(null);
    try {
      const response = await get(`${API_BASE}/api/reports/reconciliation/template`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Gagal mengunduh template.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Template_Rekonsiliasi.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMitraError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunduh template.");
    } finally {
      setDownloadingTemplate(false);
    }
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
    setMitraError(null);

    if (!mitraReportMeta.tanggal_laporan.trim()) {
      setMitraError("Tanggal Laporan wajib diisi.");
      return;
    }
    if (!mitraReportMeta.pic_mitra.trim()) {
      setMitraError("Nama PIC Mitra wajib diisi.");
      return;
    }
    if (!mitraPreview && !selectedProjectId) {
      setMitraError("Pilih project terlebih dahulu.");
      return;
    }
    if (!mitraPreview && !selectedKodeTiket) {
      setMitraError("Kode Tiket wajib dipilih.");
      return;
    }
    if (!mitraPreview && manualRows.length === 0) {
      setMitraError("Minimal 1 item harus ditambahkan.");
      return;
    }
    for (const row of manualRows) {
      if (!row.nama_barang.trim()) {
        setMitraError("Setiap item harus memiliki Nama Barang.");
        return;
      }
      if (!row.barang_id) {
        setMitraError("Setiap item harus memilih Barang dari daftar BOQ.");
        return;
      }
      if (Number(row.used) <= 0) {
        setMitraError("Setiap item harus memiliki Qty Used > 0.");
        return;
      }
    }

    setMitraConfirming(true);
    try {
      let preview: any[];

      if (mitraPreview) {
        preview = mitraPreview.preview || [];
      } else {
        const projectName = projectOptions.find(([id]) => id === selectedProjectId)?.[1] || "";
        preview = manualRows.map((row) => ({
          kode_tiket: selectedKodeTiket,
          project_nama: projectName,
          nama_barang: row.nama_barang.trim(),
          barang_id: row.barang_id || null,
          used: Number(row.used) || 0,
          catatan: row.catatan.trim() || null,
          kondisi: row.kondisi.trim() || null,
        }));
      }

      const payload = {
        filename: mitraPreview?.filename || "manual-input",
        preview,
        failed: mitraPreview?.failed || [],
        actorId: user.id,
        tanggal_laporan: mitraReportMeta.tanggal_laporan,
        pic_mitra: mitraReportMeta.pic_mitra,
      };

      const res = await post(`${API_BASE}/api/reports/reconciliation/confirm`, payload);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal menyimpan hasil laporan mitra.");
      }

      const failedCount = json?.data?.failedCount || 0;
      const failedItems = json?.data?.failedItems || [];

      if (failedCount > 0 && failedCount >= (preview?.length || 0)) {
        const reasons = failedItems.slice(0, 3).map((it: any) => it.reason).filter(Boolean).join("; ");
        setMitraError(`Gagal menyimpan semua item (${failedCount}). ${reasons}`);
        setToast({ message: `Gagal menyimpan semua item (${failedCount}). ${reasons}`, type: "error" });
      } else if (failedCount > 0) {
        const reasons = failedItems.slice(0, 3).map((it: any) => it.reason).filter(Boolean).join("; ");
        setMitraError(null);
        closeMitraModal();
        fetchReconciliation();
        setToast({ message: `${preview?.length - failedCount} berhasil, ${failedCount} gagal. ${reasons}`, type: "warning" });
      } else {
        setMitraError(null);
        closeMitraModal();
        fetchReconciliation();
        setToast({ message: "Laporan mitra berhasil disimpan.", type: "success" });
      }
    } catch (err) {
      setMitraError(err instanceof Error ? err.message : "Terjadi kesalahan saat konfirmasi.");
      setToast({ message: err instanceof Error ? err.message : "Terjadi kesalahan saat konfirmasi.", type: "error" });
    } finally {
      setMitraConfirming(false);
    }
  };

  const addManualRow = () => {
    setMitraError(null);
    setManualRows((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        barang_id: "",
        nama_barang: "",
        used: "",
        catatan: "",
        kondisi: "",
        expanded: false,
      },
    ]);
  };

  const removeManualRow = (id: string) => {
    setManualRows((prev) => prev.filter((row) => row.id !== id));
  };

  const updateManualRow = (id: string, field: string, value: string) => {
    setManualRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const toggleRowExpanded = (id: string) => {
    setManualRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, expanded: !row.expanded } : row))
    );
  };

  const openMitraModal = () => {
    setShowMitraModal(true);
    setMitraFlow("select");
    setMitraFile(null);
    setMitraPreview(null);
    setMitraError(null);
    setMitraConfirming(false);
    setManualRows([]);
    setSelectedProjectId("");
    setSelectedBoqId("");
    setSelectedKodeTiket("");
    setMitraReportMeta({ tanggal_laporan: new Date().toISOString().slice(0, 10), pic_mitra: "" });
  };

  const closeMitraModal = () => {
    setShowMitraModal(false);
    setMitraFlow("select");
    setMitraFile(null);
    setMitraPreview(null);
    setMitraError(null);
    setMitraConfirming(false);
    setManualRows([]);
    setSelectedProjectId("");
    setSelectedBoqId("");
    setSelectedKodeTiket("");
    setMitraReportMeta({ tanggal_laporan: new Date().toISOString().slice(0, 10), pic_mitra: "" });
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
    const handleRefresh = () => {
      fetchReconciliation();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchReconciliation();
      }
    };
    const onFocus = () => {
      fetchReconciliation();
    };
    window.addEventListener("reconciliation:refresh", handleRefresh);
    window.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("reconciliation:refresh", handleRefresh);
      window.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [get, post]);

  useEffect(() => {
    if (projectFilter !== "all" && clusterFilter !== "all") {
      // If project changed, reset cluster filter to "all"
      setClusterFilter("all");
    }
  }, [projectFilter]);

  const warehouseOptions = useMemo(() => {
    return Array.from(new Set(records.map((item) => item.gudang_nama).filter(Boolean)));
  }, [records]);

  const clusterOptions = useMemo(() => {
    if (projectFilter === "all") return [];
    const projectRecords = records.filter((r) => r.project_id === projectFilter);
    return Array.from(
      new Map(projectRecords.map((item) => [item.cluster_id, item.nama_cluster || "-"])).entries()
    ).sort(([, a], [, b]) => a.localeCompare(b));
  }, [records, projectFilter]);

  const filteredRecords = useMemo(() => {
    const query = search.toLowerCase();
    return records.filter((record) => {
      const boqCodes = (record.boq_list || [])
        .map((boq) => [boq.kode_boq, boq.status].filter(Boolean).join(" "))
        .join(" ");
      const matchesSearch =
        !query ||
        [record.project_nama, record.nama_cluster, record.cluster_id, record.pic_nama, record.area, record.kode_tiket, record.kode_perangkat, record.nama_barang, record.gudang_nama, boqCodes]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesProject = projectFilter === "all" || record.project_id === projectFilter;
      const matchesCluster = clusterFilter === "all" || record.cluster_id === clusterFilter;
      const matchesWarehouse = warehouseFilter === "all" || record.gudang_nama === warehouseFilter;
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesBoqStatus =
        boqStatusFilter === "all" ||
        (boqStatusFilter === "selesai" ? record.ada_boq_selesai : record.boq_list.some((boq) => boq.status === boqStatusFilter));

      return matchesSearch && matchesProject && matchesCluster && matchesWarehouse && matchesStatus && matchesBoqStatus;
    });
  }, [records, search, projectFilter, clusterFilter, warehouseFilter, statusFilter, boqStatusFilter]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportReconciliationXlsx(filteredRecords);
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
        total.mos += item.mos;
        total.used += item.used;
        total.remains += item.remains;
        total.temuan_jumlah_item += item.temuan_penerimaan?.jumlah_item_bertemuan_selisih || 0;
        total.temuan_total_selisih += item.temuan_penerimaan?.total_selisih_qty || 0;
        return total;
      },
      { boq: 0, additional: 0, mos: 0, used: 0, remains: 0, temuan_jumlah_item: 0, temuan_total_selisih: 0 }
    );
  }, [filteredRecords]);

  const totalPerhatian = useMemo(
    () => filteredRecords.filter((r) => r.status === "perhatian").length,
    [filteredRecords]
  );

  return (
      <div>
      <div className="flex flex-1 flex-col p-6">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Rekonsiliasi Inventory</h1>
              <p className="mt-1 text-sm text-slate-500">
               Pantau kesesuaian BOQ dengan realisasi hardware pada setiap cluster dan tiket.
             </p>
          </div>
        </header>

{/* KPI Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6">
           <KpiCard title="BOQ" value={formatNumber(summary.boq)} description="Rencana awal" icon={ClipboardCheck} tone="slate" />
           <KpiCard title="Additional" value={formatNumber(summary.additional)} description="Tambahan di luar BOQ" icon={Package} tone="slate" />
           <KpiCard title="MOS" value={formatNumber(summary.mos)} description="Material on Site (termasuk inbound disetujui)" icon={PackageCheck} tone="slate" />
           <KpiCard title="Used" value={formatNumber(summary.used)} description="Sudah digunakan" icon={PackageMinus} tone="slate" />
           <KpiCard title="Remains" value={formatNumber(summary.remains)} description="Sisa pengiriman (MOS - BOQ)" icon={Wallet} tone="slate" />
           {summary.temuan_jumlah_item > 0 && (
             <KpiCard title="Temuan Penerimaan" value={`${summary.temuan_jumlah_item} item`} description={`Kekurangan ${formatNumber(summary.temuan_total_selisih)}`} icon={AlertTriangle} tone="rose" />
           )}
         </div>

        {/* Tabs */}
        <div className="mb-6 flex w-full gap-2 sm:w-auto border-b border-slate-100">
          <button
            type="button"
            onClick={() => setReconcTab("inventory")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 border-b-2 px-3 py-2 text-sm sm:px-4 sm:py-2.5 font-medium transition-colors whitespace-normal leading-tight min-h-11 text-center ${
              reconcTab === "inventory" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ClipboardCheck size={16} />
            Rekonsiliasi
          </button>
          <button
            type="button"
            onClick={() => { setReconcTab("history"); setHistoryPage(1); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 border-b-2 px-3 py-2 text-sm sm:px-4 sm:py-2.5 font-medium transition-colors whitespace-normal leading-tight min-h-11 text-center ${
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
        <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          <div className="col-span-2 flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari project, cluster, tiket, kode perangkat..."
              className="w-full min-h-11 bg-transparent text-base sm:text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full min-w-0 min-h-11 text-base sm:text-sm truncate sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-slate-600 shadow-sm outline-none focus:border-orange-400"
          >
            <option value="all">Semua Project</option>
            {projectOptions.map(([id, nama]) => (
              <option key={id} value={id}>
                {nama}
              </option>
            ))}
          </select>

          {projectFilter !== "all" && (
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="w-full min-w-0 min-h-11 text-base sm:text-sm truncate sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-slate-600 shadow-sm outline-none focus:border-orange-400"
              disabled={clusterOptions.length === 0}
            >
              <option value="all">Semua Cluster</option>
              {clusterOptions.length > 0 ? (
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

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full min-w-0 min-h-11 text-base sm:text-sm truncate sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-slate-600 shadow-sm outline-none focus:border-orange-400"
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
            className="w-full min-w-0 min-h-11 text-base sm:text-sm truncate sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-slate-600 shadow-sm outline-none focus:border-orange-400"
          >
            <option value="all">Semua Status</option>
            <option value="sesuai">Sesuai</option>
            <option value="belum_ada_data">Belum Ada Data</option>
            <option value="perhatian">Perhatian</option>
          </select>

          <select
            value={boqStatusFilter}
            onChange={(e) => setBoqStatusFilter(e.target.value)}
            className="col-span-2 w-full min-w-0 min-h-11 text-base sm:text-sm truncate sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-slate-600 shadow-sm outline-none focus:border-orange-400"
          >
            <option value="all">Semua Status BOQ</option>
            <option value="aktif">Aktif</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex flex-wrap gap-x-3 items-baseline">
              <h2 className="text-base font-semibold text-slate-900">Daftar Rekonsiliasi</h2>
              <p className="text-xs text-slate-400">
                {filteredRecords.length} data
                {totalPerhatian > 0 && (
                  <span className="ml-2 text-amber-600">{totalPerhatian} perhatian</span>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 w-full">
              {lastRefreshed && (
                <span className="text-xs text-slate-400 w-full sm:w-auto">
                  Terakhir diperbarui: {lastRefreshed.toLocaleTimeString("id-ID")}
                </span>
              )}
              <div className="grid grid-cols-2 gap-2 sm:flex w-full">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full sm:w-auto min-h-11 flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
                >
                  {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {exporting ? "Mengekspor..." : "Ekspor"}
                </button>
                <button
                  type="button"
                  onClick={openMitraModal}
                  className="w-full sm:w-auto min-h-11 flex items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 whitespace-nowrap"
                >
                  <Upload size={16} />
                  Input laporan mitra
                </button>
              </div>
            </div>
          </div>

<<<<<<< HEAD
<div className="overflow-x-auto overflow-y-auto overscroll-x-contain max-h-[calc(100vh-260px)] rounded-2xl border border-slate-200 bg-white shadow-sm">
               <table className="w-max min-w-full table-fixed border-separate border-spacing-0 md:w-full md:table-auto md:border-collapse md:min-w-[1080px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50">
                     <tr className="border-b border-slate-100 bg-slate-50">
<th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-10 text-center">No</th>
                        <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 min-w-[130px]">Project</th>
                        <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 min-w-[120px]">Cluster Name</th>
                        <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">PIC</th>
                        <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Kode Tiket</th>
                        <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">BOQ</th>
                        <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 min-w-[120px] sticky left-0 z-20 bg-slate-50">Barang</th>
                        <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400 min-w-[48px]">BOQ</th>
                        <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400 min-w-[48px]">Additional</th>
                        <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400 min-w-[48px]">MOS</th>
                        <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400 min-w-[48px]">Used</th>
                        <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400 min-w-[56px]">Remains</th>
                        <th className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap min-w-[84px]">Status</th>
                        <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400 min-w-[56px] sticky right-0 z-20 bg-slate-50 border-l border-slate-100">
                          Aksi
                        </th>
                     </tr>
                   </thead>
=======
<div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-max min-w-full table-fixed border-separate border-spacing-0 md:w-full md:table-auto md:border-collapse md:min-w-[1250px] text-left text-sm">
<thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-3 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-12 text-center">No</th>
                      <th className="hidden md:table-cell px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 min-w-[160px] w-[160px]">Project</th>
                      <th className="hidden md:table-cell px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 min-w-[150px] w-[150px]">Cluster Name</th>
                      <th className="hidden md:table-cell px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 min-w-[80px] w-[80px]">PIC</th>
                      <th className="hidden md:table-cell px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap w-[80px]">Kode Tiket</th>
                      <th className="hidden md:table-cell px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap w-[80px]">BOQ</th>
                      <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sticky left-0 z-20 bg-slate-50 md:static md:z-auto md:bg-transparent w-[160px] min-w-[160px] max-w-[160px] md:w-auto md:min-w-[150px] md:max-w-none">Barang</th>
                      <th className="px-3 py-3 text-right text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-[56px] min-w-[56px] md:w-auto md:min-w-[44px] md:max-w-none">BOQ</th>
                      <th className="px-3 py-3 text-right text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-[56px] min-w-[56px] md:w-auto md:min-w-[44px] md:max-w-none">ADD</th>
                      <th className="px-3 py-3 text-right text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-[56px] min-w-[56px] md:w-auto md:min-w-[44px] md:max-w-none">MOS</th>
                      <th className="px-3 py-3 text-right text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-[56px] min-w-[56px] md:w-auto md:min-w-[44px] md:max-w-none">USED</th>
                      <th className="px-3 py-3 text-right text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-[64px] min-w-[64px] md:w-auto md:min-w-[80px] md:max-w-none">REMAINS</th>
                      <th className="px-3 py-3 text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap w-[104px] min-w-[104px] md:w-auto md:min-w-[100px] md:max-w-none">Status</th>
                      <th className="px-3 py-3 text-right text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-[80px] min-w-[80px] sticky right-0 z-10 bg-slate-50 md:bg-slate-50 border-l border-slate-100 md:border-l">Aksi</th>
                    </tr>
                  </thead>
>>>>>>> origin/develop

<tbody className="divide-y divide-slate-50">
                  {isLoading ? (
                    Array.from({ length: 7 }).map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="px-2 py-1">
                          <div className="h-3 animate-pulse rounded-lg bg-slate-100" />
                        </td>
                        {Array.from({ length: 12 }).map((_, colIndex) => (
                          <td key={colIndex} className="px-2 py-1 hidden md:table-cell align-middle">
                            <div className="h-3 animate-pulse rounded-lg bg-slate-100" />
                        </td>
                        ))}
                        <td key="barang" className="px-2 py-1 sticky left-0 z-10 bg-white md:static md:z-auto md:bg-transparent w-[130px] min-w-[130px] max-w-[130px] md:w-auto md:min-w-[120px] md:max-w-none border-r border-slate-100 md:border-r-0 align-middle">
                          <div className="h-3 animate-pulse rounded-lg bg-slate-100 w-[110px]" />
                        </td>
                        <td key="boq" className="px-2 py-1 text-right text-xs md:px-2 md:text-xs font-medium text-slate-700 w-[48px] min-w-[48px] max-w-[48px] md:w-auto md:min-w-0 md:max-w-none align-middle">
                          <div className="h-3 animate-pulse rounded-lg bg-slate-100 w-[36px]" />
                        </td>
                        <td key="additional" className="px-2 py-1 text-right text-xs md:px-2 md:text-xs text-slate-600 w-[48px] min-w-[48px] max-w-[48px] md:w-auto md:min-w-0 md:max-w-none align-middle">
                          <div className="h-3 animate-pulse rounded-lg bg-slate-100 w-[36px]" />
                        </td>
                        <td key="mos" className="px-2 py-1 text-right text-xs md:px-2 md:text-xs font-medium text-slate-700 w-[48px] min-w-[48px] max-w-[48px] md:w-auto md:min-w-0 md:max-w-none align-middle">
                          <div className="h-3 animate-pulse rounded-lg bg-slate-100 w-[36px]" />
                        </td>
                        <td key="used" className="px-2 py-1 text-right text-xs md:px-2 md:text-xs text-slate-600 w-[48px] min-w-[48px] max-w-[48px] md:w-auto md:min-w-0 md:max-w-none align-middle">
                          <div className="h-3 animate-pulse rounded-lg bg-slate-100 w-[36px]" />
                        </td>
                        <td key="remains" className="px-2 py-1 text-right text-xs md:px-2 md:text-xs font-semibold w-[56px] min-w-[56px] max-w-[56px] md:w-auto md:min-w-[64px] md:max-w-none align-middle">
                          <div className="h-3 animate-pulse rounded-lg bg-slate-100 w-[36px]" />
                        </td>
                        <td key="status" className="px-2 py-1 whitespace-nowrap w-[96px] min-w-[96px] max-w-[96px] md:w-auto md:min-w-[84px] md:max-w-none align-middle">
                          <div className="h-3 animate-pulse rounded-lg bg-slate-100 w-[52px]" />
                        </td>
                        <td key="aksi" className="px-2 py-1 sticky right-0 z-10 bg-white md:bg-slate-50 group-hover:bg-slate-50 border-l border-slate-100 md:border-l w-[64px] min-w-[64px] max-w-[64px] md:w-auto md:min-w-[56px] md:max-w-none align-middle">
                          <div className="h-3 animate-pulse rounded-lg bg-slate-100 w-[32px]" />
                        </td>
                     </tr>
                   ))
                 ) : error ? (
                   <tr>
                     <td colSpan={13} className="px-6 py-16 text-center text-sm text-rose-500">
                       {error}
                     </td>
                   </tr>
                 ) : filteredRecords.length === 0 ? (
                   <tr>
                     <td colSpan={13} className="px-6 py-16 text-center">
                       <Package size={28} className="mx-auto text-slate-300" />
                       <p className="mt-3 text-sm font-medium text-slate-600">Tidak ada data rekonsiliasi</p>
                       <p className="mt-1 text-xs text-slate-400">Coba ubah filter atau kata pencarian.</p>
                     </td>
                   </tr>
                 ) : (
                  filteredRecords.map((record, index) => {
                    const statusBadge = getStatusBadge(record.status);
                    const rowNumber = index + 1;
                    return (
<tr key={record.id} className={`group transition-colors hover:bg-slate-50`}>
                         <td className="px-2 py-1 whitespace-nowrap text-center text-[10px] text-slate-500 tabular-nums w-10">{rowNumber}</td>
<td className="px-2 py-1">
                            <div className="truncate font-medium text-slate-900 text-xs" title={`${record.projectNama || "-"}${record.area ? ` • ${record.area}` : ""}`}>
                              {record.projectNama || "-"}
                              {record.area && <span className="ml-1.5 text-[10px] text-slate-400">{record.area}</span>}
                            </div>
                          </td>

<td className="hidden md:table-cell px-2 py-1">
                            <div className="truncate font-medium text-slate-900 text-xs" title={`${record.nama_cluster || "-"}${record.cluster_id ? ` • ${record.cluster_id}` : ""}`}>
                              {record.nama_cluster || "-"}
                              {record.cluster_id && <span className="ml-1.5 text-[10px] text-slate-400">{record.cluster_id}</span>}
                            </div>
                          </td>

<td className="hidden md:table-cell px-2 py-1 text-xs text-slate-600 whitespace-nowrap">
                          {record.picNama || <span className="text-slate-400">-</span>}
                        </td>

<td className="hidden md:table-cell px-2 py-1 whitespace-nowrap">
                          <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            {record["kode_tiket"]}
                          </span>
                        </td>

<td className="hidden md:table-cell px-2 py-1 whitespace-nowrap">
                          <div className="flex flex-nowrap gap-1">
                            {(record.boq_list || []).slice(0, 2).map((boq) => (
                              <span
                                key={boq.boq_id}
                                className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0 text-[10px] font-semibold text-slate-700 whitespace-nowrap"
title={boq.status === "selesai" ? `${boq.kode_boq || `BOQ-${boq.boq_id}`} (Selesai)` : (boq.kode_boq || `BOQ-${boq.boq_id}`)}
>
                                {boq.kode_boq || `BOQ-${boq.boq_id}`}
                                {boq.status === "selesai" && (
                                  <span className="ml-0.5 rounded bg-slate-200 px-1 py-0 text-[9px] font-semibold text-slate-500">Selesai</span>
                                )}
                              </span>
                            ))}
                            {(record.boq_list || []).length > 2 && (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0 text-[10px] font-semibold text-slate-500 whitespace-nowrap" title={(record.boq_list || []).map(b => b.status === "selesai" ? `${b.kode_boq || `BOQ-${b.boq_id}`} (Selesai)` : (b.kode_boq || `BOQ-${b.boq_id}`)).join(", ")}>
                                +{(record.boq_list || []).length - 2}
                              </span>
                            )}
                            {(record.boq_list || []).length === 0 && <span className="text-xs text-slate-400">-</span>}
                          </div>
                        </td>

<td className="px-2 py-1 sticky left-0 z-10 bg-white md:static md:z-auto md:bg-transparent w-[130px] min-w-[130px] max-w-[130px] md:w-auto md:min-w-[120px] md:max-w-none border-r border-slate-100 md:border-r-0 align-middle">
                            <div className="flex items-center h-full overflow-hidden">
                              <div className="truncate font-medium text-slate-800 text-xs leading-4" title={`${record.barang_id || "-"} • ${record.gudangNama || "-"} • ${record.barang_id || "-"}`}>{record.barang_id || "-"}</div>
                            </div>
                          </td>

<td className="px-2 py-1 text-right text-xs font-medium text-slate-700 tabular-nums w-[48px] min-w-[48px] max-w-[48px] md:w-auto md:min-w-0 md:max-w-none align-middle">{formatNumber(record.boq)}</td>
                         <td className="px-2 py-1 text-right text-xs text-slate-600 tabular-nums w-[48px] min-w-[48px] max-w-[48px] md:w-auto md:min-w-0 md:max-w-none align-middle">{formatNumber(record.additional)}</td>
                         <td className="px-2 py-1 text-right text-xs font-medium text-slate-700 tabular-nums w-[48px] min-w-[48px] max-w-[48px] md:w-auto md:min-w-0 md:max-w-none align-middle">{formatNumber(record.mos)}</td>
                         <td className="px-2 py-1 text-right text-xs text-slate-600 tabular-nums w-[48px] min-w-[48px] max-w-[48px] md:w-auto md:min-w-0 md:max-w-none align-middle">{formatNumber(record.used)}</td>

                         <td className="px-2 py-1 text-right text-xs font-semibold tabular-nums w-[56px] min-w-[56px] max-w-[56px] md:w-auto md:min-w-[64px] md:max-w-none align-middle">
                           <span className="flex items-center justify-end gap-1">
                             <span className={record.remains < 0 ? "text-rose-600" : "text-emerald-700"}>
                               {formatNumber(record.remains)}
                             </span>
                             <RemainsNoteBadge note={record.remains_note} />
                           </span>
                         </td>

                         <td className="px-2 py-1 whitespace-nowrap w-[96px] min-w-[96px] max-w-[96px] md:w-auto md:min-w-[84px] md:max-w-none align-middle">
                           <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${statusBadge.bg} ${statusBadge.text}`} title={record.temuan_penerimaan && record.temuan_penerimaan.jumlah_item_bertemuan_selisih > 0 ? `Selisih terima: ${record.temuan_penerimaan.jumlah_item_bertemuan_selisih} item, kekurangan ${formatNumber(record.temuan_penerimaan.total_selisih_qty)}` : statusBadge.label}>
                             <statusBadge.icon size={11} />
                             {statusBadge.label}
                           </span>
                         </td>

                         <td className="px-2 py-1 sticky right-0 z-10 bg-white md:bg-slate-50 group-hover:bg-slate-50 border-l border-slate-100 md:border-l w-[64px] min-w-[64px] max-w-[64px] md:w-auto md:min-w-[56px] md:max-w-none align-middle">
                           <div className="flex items-center justify-end gap-0.5">
                             <button
                               type="button"
                               onClick={() => setSelectedRecord(record)}
                               title="Lihat detail"
                               className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                             >
                               <ClipboardCheck size={16} />
                             </button>
                             <button
                               type="button"
                               onClick={() => setAdjustmentRecord(record)}
                               title="Input Additional"
                               className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-orange-600"
                             >
                               <Plus size={16} />
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
          <p className="mt-1 text-xs text-slate-500">Penjelasan cara menghitung setiap kolom pada tabel rekonsiliasi.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-800">BOQ Plan</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">Jumlah material yang direncanakan sejak awal untuk project ini.</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-xs font-semibold text-indigo-800">Additional</p>
               <p className="mt-1 text-[11px] leading-relaxed text-indigo-700">Tambahan material yang diajukan karena kekurangan dari rencana BOQ awal, setelah disetujui dan ditambahkan resmi ke sistem.</p>
            </div>
<div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-semibold text-blue-800">MOS</p>
               <p className="mt-1 text-[11px] leading-relaxed text-blue-700">Material yang sudah dikirim ke lapangan (outbound) + barang masuk gudang yang sudah disetujui (inbound approved).</p>
             </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-800">Used</p>
               <p className="mt-1 text-[11px] leading-relaxed text-slate-600">Jumlah material yang sudah dipasang/digunakan di lapangan, berdasarkan laporan harian dari mitra.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-emerald-800">Remains</p>
               <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">Rumus: MOS − (BOQ Plan + Additional). Menghitung sisi pengiriman, bukan pemakaian di lapangan.</p>
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
            className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-xl"
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
                    <p className="text-[11px] text-slate-400">Project</p>
                    <p className="text-sm font-medium text-slate-900">{selectedRecord.project_nama || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Area</p>
                    <p className="text-sm font-medium text-slate-900">{selectedRecord.area || "-"}</p>
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
                  <div>
                    <p className="text-[11px] text-slate-400">PIC</p>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedRecord.pic_nama || "-"}
                      {selectedRecord.pic_sumber ? ` (${selectedRecord.pic_sumber})` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] text-slate-500">
                    Tiket: {selectedRecord.kode_tiket}
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
                isClusterMode={true}
              />

              <div>
                <p className="text-xs font-medium text-slate-400">Status Rekonsiliasi</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusBadge(selectedRecord.status).bg} ${getStatusBadge(selectedRecord.status).text}`}>
                  {getStatusBadge(selectedRecord.status).label}
                </span>
              </div>

              {selectedRecord.used > selectedRecord.mos && (
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

              {selectedRecord.used <= selectedRecord.mos && selectedRecord.remains < 0 && (
                <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Pengiriman belum memenuhi BOQ</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-700">
                      Kurang {formatNumber(Math.abs(selectedRecord.remains))} {selectedRecord.satuan} dari BOQ (MOS - BOQ).
                    </p>
                  </div>
                </div>
              )}

              {selectedRecord.temuan_penerimaan && selectedRecord.temuan_penerimaan.jumlah_item_bertemuan_selisih > 0 && (
                <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Temuan Penerimaan</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-700">
                      {selectedRecord.temuan_penerimaan.jumlah_item_bertemuan_selisih} item dengan kekurangan total {formatNumber(selectedRecord.temuan_penerimaan.total_selisih_qty)}.
                    </p>
                    {selectedRecord.temuan_penerimaan.detail && selectedRecord.temuan_penerimaan.detail.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {selectedRecord.temuan_penerimaan.detail.map((detail) => (
                          <div key={detail.item_id} className="text-xs text-amber-700">
                            <span className="font-semibold">Item {detail.item_id}:</span> Dipick {detail.qty_dipick_total}, diterima {detail.qty_diterima}, selisih {detail.selisih_qty}
                            {detail.kondisi_diterima && `, kondisi diterima ${detail.kondisi_diterima}`}
                            {detail.surat_jalan_status === "tiba_menunggu_konfirmasi" && (
                              <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Sementara, menunggu konfirmasi SPV</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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
            className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Input Laporan Mitra</h2>
                <p className="text-xs text-slate-500">Pilih metode input untuk memperbarui data pemakaian material (Used) di lapangan.</p>
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

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Laporan</label>
                      <input
                        type="date"
                        value={mitraReportMeta.tanggal_laporan}
                        onChange={(e) => setMitraReportMeta({ ...mitraReportMeta, tanggal_laporan: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Nama PIC Mitra</label>
                      <input
                        type="text"
                        value={mitraReportMeta.pic_mitra}
                        onChange={(e) => setMitraReportMeta({ ...mitraReportMeta, pic_mitra: e.target.value })}
                        placeholder="Nama PIC Mitra"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-400"
                      />
                    </div>
                  </div>

                  {!mitraPreview ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                      <FileSpreadsheet size={32} className="mx-auto text-slate-400" />
                      <p className="mt-2 text-sm font-semibold text-slate-700">Upload Laporan Compile Material</p>
                      <p className="mt-1 text-xs text-slate-400">Format Excel (.xlsx, .xls). Multi Kode Tiket dalam satu file didukung.</p>

                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        disabled={downloadingTemplate}
                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {downloadingTemplate && <Loader2 size={14} className="animate-spin" />}
                        {downloadingTemplate ? "Mengunduh..." : "Unduh Template"}
                      </button>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Gunakan template ini agar kolom terbaca sistem dengan benar.
                      </p>

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

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={handleMitraUpload}
                          disabled={!mitraFile || !mitraReportMeta.tanggal_laporan.trim() || !mitraReportMeta.pic_mitra.trim()}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {mitraLoading && <Loader2 size={14} className="animate-spin" />}
                          {mitraLoading ? "Memproses..." : "Proses File"}
                        </button>
                        <p className="mt-2 text-[11px] text-slate-400">
                          Tanggal Laporan dan Nama PIC Mitra wajib diisi sebelum memproses file.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Pratinjau Hasil Parsing</p>
                        <span className="text-xs text-slate-400">
                          {mitraPreview.preview?.length || 0} baris berhasil, {mitraPreview.failed?.length || 0} baris gagal
                        </span>
                      </div>

                        <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 overflow-x-auto overscroll-x-contain">
                          <table className="w-full min-w-[640px] text-left text-sm">
                           <thead>
                             <tr className="border-b border-slate-100 bg-slate-50">
                               <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-12 text-center">No</th>
                               <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kode Tiket</th>
                               <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project</th>
                                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nama Barang</th>
                                <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Used</th>
                                <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kondisi</th>
                               <th className="px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                             {(mitraPreview.preview || []).map((row: any, idx: number) => (
                               <tr key={idx} className="hover:bg-slate-50">
                                 <td className="px-4 py-2 whitespace-nowrap text-center text-xs text-slate-500">{idx + 1}</td>
                                 <td className="px-4 py-2 font-mono text-xs font-semibold text-orange-600">{row.kode_tiket}</td>
                                 <td className="px-4 py-2 text-slate-700">{row.project_nama}</td>
                                  <td className="px-4 py-2 text-slate-700">{row.nama_barang || "-"}</td>
                                   <td className="px-4 py-2 text-right font-mono text-slate-600">{row.used}</td>
                                   <td className="px-4 py-2 text-slate-700">{row.kondisi || "-"}</td>
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
                                  <td className="px-4 py-2 whitespace-nowrap text-center text-xs text-slate-500">{idx + 1}</td>
                                  <td className="px-4 py-2 font-mono text-xs font-semibold text-slate-700">{row.kode_tiket || "-"}</td>
                                 <td className="px-4 py-2 text-slate-700">-</td>
                                 <td className="px-4 py-2 text-slate-700">-</td>
                                  <td className="px-4 py-2 text-right font-mono text-slate-400">-</td>
                                  <td className="px-4 py-2 text-slate-700">-</td>
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
                    onClick={() => { setMitraFlow("select"); setManualRows([]); setMitraError(null); setSelectedProjectId(""); setSelectedBoqId(""); setSelectedKodeTiket(""); setMitraReportMeta({ tanggal_laporan: new Date().toISOString().slice(0, 10), pic_mitra: "" }); }}
                    className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    <ArrowUpRight size={12} className="-rotate-90" />
                    Kembali ke pilihan
                  </button>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Laporan</label>
                      <input
                        type="date"
                        value={mitraReportMeta.tanggal_laporan}
                        onChange={(e) => setMitraReportMeta({ ...mitraReportMeta, tanggal_laporan: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Nama PIC Mitra</label>
                      <input
                        type="text"
                        value={mitraReportMeta.pic_mitra}
                        onChange={(e) => setMitraReportMeta({ ...mitraReportMeta, pic_mitra: e.target.value })}
                        placeholder="Nama PIC Mitra"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Project</label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => {
                          setSelectedProjectId(e.target.value);
                          setSelectedBoqId("");
                          setSelectedKodeTiket("");
                          setManualRows([]);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                      >
                        <option value="">Pilih Project</option>
                        {projectOptions.map(([id, nama]) => (
                          <option key={id} value={id}>
                            {nama}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Kode Tiket</label>
                       <BoqPicker
                         value={selectedBoqId}
                         onSelect={(picked: BoqPickerItem) => {
                           setSelectedBoqId(picked.boq_id);
                           setSelectedKodeTiket(picked.kode_tiket);
                           if (picked.project_id) {
                             setSelectedProjectId(String(picked.project_id));
                           }
                         }}
                         placeholder="Pilih Kode Tiket"
                         disabled={!selectedProjectId}
                         projectId={selectedProjectId || undefined}
                         displayField="kode_tiket"
                       />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Daftar Item Barang</p>
                      <button
                        type="button"
                        onClick={addManualRow}
                        disabled={!selectedKodeTiket}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600 disabled:opacity-50"
                      >
                        <Plus size={14} />
                        Tambah Item
                      </button>
                    </div>

                    {manualRows.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                        {selectedKodeTiket ? "Belum ada barang. Klik 'Tambah Item' untuk menambah." : "Pilih Kode Tiket terlebih dahulu."}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {manualRows.map((row) => (
                          <div
                            key={row.id}
                            className="rounded-xl border border-slate-100 bg-white p-3"
                          >
                            <div className="grid grid-cols-12 gap-2">
                              <div className="col-span-12 sm:col-span-4">
                                <label className="mb-1 block text-[11px] font-medium text-slate-500">Nama Barang</label>
                                  <BarangPicker
                                    value={row.nama_barang}
                                    onSelect={(item) => {
                                      updateManualRow(row.id, "barang_id", item.id || "");
                                      updateManualRow(row.id, "nama_barang", item.nama_barang || item.kode_perangkat || "");
                                    }}
                                    placeholder="Pilih atau ketik nama barang"
                                    disabled={!selectedProjectId}
                                    fetchEndpoint="/api/boqs/items"
                                    queryParams={manualBoqItemsQueryParams}
                                    emptyMessage="Belum ada BOQ untuk project ini. Barang harus dipilih dari daftar BOQ."
                                  />
                              </div>
                              <div className="col-span-6 sm:col-span-3">
                                <label className="mb-1 block text-[11px] font-medium text-slate-500">Qty Terpasang (Used)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={row.used}
                                  onChange={(e) => updateManualRow(row.id, "used", e.target.value)}
                                  placeholder="0"
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400"
                                />
                               </div>
                               <div className="col-span-12 sm:col-span-2 flex items-end justify-between">
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleRowExpanded(row.id)}
                                    className={`rounded-lg px-2 py-1.5 text-xs font-medium ${row.expanded ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                                  >
                                    Detail
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeManualRow(row.id)}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                    title="Hapus baris"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {row.expanded && (
                              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Catatan</label>
                                  <input
                                    type="text"
                                    value={row.catatan}
                                    onChange={(e) => updateManualRow(row.id, "catatan", e.target.value)}
                                    placeholder="Catatan (opsional)"
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[11px] font-medium text-slate-500">Kondisi</label>
                                  <input
                                    type="text"
                                    value={row.kondisi}
                                    onChange={(e) => updateManualRow(row.id, "kondisi", e.target.value)}
                                    placeholder="Kondisi (opsional)"
                                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                  {mitraConfirming ? "Menyimpan…" : "Simpan Laporan"}
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

<div className="overflow-x-auto overflow-y-auto overscroll-x-contain max-h-[calc(100vh-300px)] rounded-2xl border border-slate-200 bg-white shadow-sm">
             <table className="min-w-full table-fixed border-separate border-spacing-0 md:table-auto md:border-collapse text-left text-xs">
               <thead className="sticky top-0 z-10 bg-slate-50">
                 <tr className="border-b border-slate-100 bg-slate-50">
                   <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-10 text-center">No</th>
                   <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Waktu Upload</th>
                   <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Nama File</th>
                   <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Diunggah Oleh</th>
                   <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Total</th>
                   <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Berhasil</th>
                   <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Gagal</th>
                   <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Status</th>
                   <th className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-8"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {historyLoading ? (
                   Array.from({ length: 5 }).map((_, i) => (
                     <tr key={i}>
                       <td className="px-3 py-1.5">
                         <div className="h-3 animate-pulse rounded-lg bg-slate-100" />
                       </td>
                       <td className="px-3 py-1.5" colSpan={8}>
                         <div className="h-3 animate-pulse rounded-lg bg-slate-100" />
                       </td>
                     </tr>
                   ))
                 ) : historyError ? (
                   <tr>
                     <td className="px-6 py-16 text-center text-xs text-rose-500" colSpan={9}>{historyError}</td>
                   </tr>
                 ) : historyData.length === 0 ? (
                   <tr>
                     <td className="px-6 py-16 text-center text-xs text-slate-400" colSpan={9}>
                       Belum ada riwayat upload laporan mitra.
                     </td>
                   </tr>
                 ) : (
                   historyData.map((r, index) => {
                     const allSuccess = r.failed_rows === 0 && r.success_rows > 0;
                     const hasFailed = r.failed_rows > 0;
                     const overallStatus = allSuccess ? "berhasil" : hasFailed ? "sebagian_gagal" : "draft";
                     const rowNumber = (historyPage - 1) * 20 + index + 1;
                     return (
                       <tr
                         key={r.upload_id}
                         className="group cursor-pointer transition-colors hover:bg-slate-50"
                         onClick={() => setHistoryDetail(r)}
                       >
                         <td className="px-3 py-1.5 whitespace-nowrap text-center text-[10px] text-slate-500 tabular-nums w-10">{rowNumber}</td>
                         <td className="px-3 py-1.5 whitespace-nowrap font-mono text-[10px] text-slate-400">
                           {new Date(r.uploaded_at).toLocaleString("id-ID")}
                         </td>
                         <td className="px-3 py-1.5">
                           <div className="truncate max-w-[220px] font-semibold text-slate-900 text-xs" title={r.filename || "-"}>{r.filename || "-"}</div>
                         </td>
                         <td className="px-3 py-1.5">
                           <div className="truncate max-w-[180px] font-semibold text-slate-900 text-xs" title={r.uploaded_byNama || "-"}>{r.uploaded_byNama || "-"}</div>
                           <div className="truncate max-w-[180px] text-[10px] text-slate-500" title={formatRole(r.uploaded_by_role)}>{formatRole(r.uploaded_by_role)}</div>
                         </td>
                         <td className="px-3 py-1.5 text-center font-mono text-[10px] text-slate-600 whitespace-nowrap">{r.total_rows}</td>
                         <td className="px-3 py-1.5 text-center font-mono text-[10px] text-emerald-600 whitespace-nowrap">{r.success_rows}</td>
                         <td className="px-3 py-1.5 text-center font-mono text-[10px] text-rose-600 whitespace-nowrap">{r.failed_rows}</td>
                         <td className="px-3 py-1.5 whitespace-nowrap">
                           {overallStatus === "berhasil" && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Berhasil</span>}
                           {overallStatus === "sebagian_gagal" && <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">Sebagian Gagal</span>}
                           {overallStatus === "draft" && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">Draft</span>}
                         </td>
                         <td className="px-3 py-1.5 text-right">
                           <button
                             type="button"
                             className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                             onClick={(e) => { e.stopPropagation(); setHistoryDetail(r); }}
                           >
                             <Eye size={14} />
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
            className="w-[calc(100vw-1.5rem)] max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-xl"
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
                    {(() => {
                      const dupCount = (historyDetail.details || []).filter((d: any) => isDuplicateReason(d.reason)).length;
                      return dupCount > 0 ? ` / ${dupCount} dilewati (duplikat)` : "";
                    })()}
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
                             <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-12 text-center">No</th>
                             <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kode Tiket</th>
                             <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-right">Used</th>
                             <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                             <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Alasan Gagal</th>
                           </tr>
                         </thead>
                        <tbody className="divide-y divide-slate-50">
                          {historyDetail.details.map((d: any, idx: number) => {
                            const duplicate = isDuplicateReason(d.reason);
                            return (
                              <tr key={d.detail_id} className="hover:bg-slate-50">
                                <td className="px-3 py-2 whitespace-nowrap text-center text-xs text-slate-500">{idx + 1}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-slate-700">{d.kode_tiket}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-600">{d.used}</td>
                                <td className="px-3 py-2">
                                  {duplicate ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                      Duplikat
                                    </span>
                                  ) : (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${d.status === "berhasil" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                                      {d.status === "berhasil" ? "Berhasil" : "Gagal"}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-500">{stripDuplicatePrefix(d.reason)}</td>
                              </tr>
                            );
                          })}
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

      {toast && (
        <div
          className={`fixed right-6 top-6 z-[130] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <AlertCircle size={17} className="shrink-0" />
          <span className="text-[13px] font-semibold">{toast.message}</span>
        </div>
      )}

      <ConfirmModal
        open={showDeactivatedModal}
        onConfirm={handleReturnToLogin}
        onClose={() => {}}
        title="Akun Anda Dinonaktifkan"
        description="Akun Anda telah dinonaktifkan oleh admin. Anda akan diarahkan ke halaman login."
        confirmText="Kembali ke Login"
        cancelText=""
        dismissProof
      />
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

