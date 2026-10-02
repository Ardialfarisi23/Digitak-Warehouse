"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  ClipboardList,
  ClipboardCheck,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  FileText,
  Truck,
  Package,
  Filter,
  Mail,
  ShieldCheck,
  ShieldAlert,
  ThumbsDown,
  ExternalLink,
  History,
  Warehouse as WarehouseIcon,
  Download,
  Lock,
  Building2,
  ChevronDown,
  Info,
} from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import BarangPicker, { type BarangPickerItem } from "@/components/BarangPicker";
import { ConfirmModal } from "@/components/ConfirmModal";
import Image from "next/image";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type BoqStatus = "draft" | "aktif" | "selesai" | "ditolak";
type BoqSource = "top_down" | "bottom_up";
type ExternalVerificationStatus = "terverifikasi" | "menunggu" | "tidak_berlaku";

interface Project {
  projectId: string;
  title: string;
  projectName: string;
  area?: string;
  cluster_id?: string;
  kecamatan?: string;
  desa_kelurahan?: string;
  kota_kabupaten?: string;
  provinsi?: string;
  status_aktif?: boolean;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface BoqItem {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit?: string;
  destinationWarehouseId?: string;
  destinationWarehouse?: Warehouse;
  barang?: {
    barang_id: string;
    kode_perangkat: string;
    nama_barang: string;
    kategori_id?: number;
    kategori?: { nama_kategori: string; is_kritis?: boolean };
    satuan_default_id?: number;
    satuan_default?: { kode_satuan: string };
    foto?: string;
  };
  satuan?: { satuan_id: string; kode_satuan: string };
  notes?: string;
}

interface SuratJalanRef {
  id: string;
  number: string;
  date: string;
  qty: number;
}

interface ReconciliationSummary {
  boqQty: number;
  hardwareOnSite: number;
  used: number;
  approved_return_qty?: number;
  remains: number;
  additional?: number;
  mosSistem?: number;
}

interface Boq {
  id: string;
  boqNumber: string;
  ticketNumber: string;
  projectId: string;
  project: Project;
  area: string;
  status: BoqStatus;
  source: BoqSource;
  emailReference?: string;
  externalVerificationStatus: ExternalVerificationStatus;
  notes?: string;
  referenceFile?: string;
  items: BoqItem[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  suratJalanHistory?: SuratJalanRef[];
  reconciliation?: ReconciliationSummary;
}

interface SummaryCounts {
  aktif: number;
  draft: number;
  selesai: number;
  proyekBerjalan: number;
}

type TabType = "aktif" | "draft" | "selesai" | "ditolak";
type SectionType = TabType;

/* ------------------------------------------------------------------ */
/* Role helpers                                                        */
/* ------------------------------------------------------------------ */

function useRoleAccess() {
  const { user } = useAuth();
  const role = mapRole(user?.role);

  const isStaffGudang = role === "staff";
  const canManage = role === "admin" || role === "supervisor";

  return { role, isStaffGudang, canManage };
}

/* ------------------------------------------------------------------ */
/* Badge helpers                                                       */
/* ------------------------------------------------------------------ */

function getStatusBadge(status: BoqStatus) {
  switch (status) {
    case "draft":
      return { label: "Draft", bg: "bg-amber-50", text: "text-amber-600", icon: Clock };
    case "aktif":
      return { label: "Aktif", bg: "bg-emerald-50", text: "text-emerald-600", icon: CheckCircle2 };
    case "selesai":
      return { label: "Selesai", bg: "bg-slate-100", text: "text-slate-700", icon: ClipboardCheck };
    case "ditolak":
      return { label: "Ditolak", bg: "bg-rose-50", text: "text-rose-600", icon: XCircle };
    default:
      return { label: status, bg: "bg-slate-100", text: "text-slate-600", icon: FileText };
  }
}

function getSourceBadge(source: BoqSource) {
  switch (source) {
    case "top_down":
      return { label: "PO Internal", bg: "bg-sky-50", text: "text-sky-600", icon: Mail };
    case "bottom_up":
      return { label: "Bottom Up", bg: "bg-violet-50", text: "text-violet-600", icon: ClipboardList };
    default:
      return { label: source, bg: "bg-slate-100", text: "text-slate-600", icon: FileText };
  }
}

function getVerificationBadge(status: ExternalVerificationStatus) {
  switch (status) {
    case "terverifikasi":
      return { label: "Terverifikasi", bg: "bg-emerald-50", text: "text-emerald-600", icon: ShieldCheck };
    case "menunggu":
      return { label: "Menunggu verifikasi", bg: "bg-amber-50", text: "text-amber-600", icon: ShieldAlert };
    default:
      return { label: "Tidak berlaku", bg: "bg-slate-100", text: "text-slate-400", icon: ShieldAlert };
  }
}

const TABS: { key: TabType; label: string; icon: React.ElementType }[] = [
  { key: "aktif", label: "BOQ Aktif", icon: CheckCircle2 },
  { key: "draft", label: "BOQ Draft", icon: Clock },
  { key: "selesai", label: "Selesai", icon: ClipboardCheck },
  { key: "ditolak", label: "Ditolak", icon: XCircle },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function BoqPage() {
  const router = useRouter();
  const { get, post, put, del } = useApi();
  const { isStaffGudang, canManage } = useRoleAccess();

  // Staf Gudang only ever sees the Aktif tab, read-only.
  const [activeTab, setActiveTab] = useState<SectionType>("aktif");

  const [boqs, setBoqs] = useState<Boq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryCounts>({
    aktif: 0,
    draft: 0,
    selesai: 0,
    proyekBerjalan: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedBoq, setSelectedBoq] = useState<Boq | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBoq, setDetailBoq] = useState<Boq | null>(null);
  const detailBoqRef = useRef(detailBoq);
  useEffect(() => {
    detailBoqRef.current = detailBoq;
  }, [detailBoq]);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [confirmSelesaiOpen, setConfirmSelesaiOpen] = useState(false);
  const [confirmSelesaiBoq, setConfirmSelesaiBoq] = useState<Boq | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [items, setItems] = useState<{ id: string; kode_perangkat: string; nama_barang: string; satuan?: { kode_satuan: string } }[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});

  const [form, setForm] = useState({
    projectId: "",
    area: "",
    cluster_id: "",
    kecamatan: "",
    desa_kelurahan: "",
    kota_kabupaten: "",
    provinsi: "",
    ticketNumber: "",
    emailReference: "",
    externalVerificationStatus: "menunggu" as ExternalVerificationStatus,
    notes: "",
    referenceFile: "",
    items: [{ itemCode: "", itemName: "", quantity: 1, unit: "", destinationWarehouseId: "", notes: "" }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [clusters, setClusters] = useState<{ cluster_id: string; nama_cluster: string }[]>([]);
  const [clusterModalOpen, setClusterModalOpen] = useState(false);
  const [clusterForm, setClusterForm] = useState({ cluster_id: "", nama_cluster: "", cluster_type: "", project_type: "", kso_partner: "", kso_contact: "", no_tiket_release: "", vendor: "", alamat_lengkap: "" });
  const [clusterSubmitting, setClusterSubmitting] = useState(false);
  const [clusterError, setClusterError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmReopenOpen, setConfirmReopenOpen] = useState(false);
  const [boqToReopen, setBoqToReopen] = useState<Boq | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const displayUser = (value: string | null | undefined): string => {
    if (!value) return "-";
    if (/^\d+$/.test(value)) return `User #${value}`;
    return value;
  };

  /* ---------------------------------------------------------------- */
  /* Data fetching                                                      */
  /* ---------------------------------------------------------------- */

  const fetchBoqs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "50");

      params.set("status", activeTab);

      if (projectFilter) params.set("projectId", projectFilter);
      if (areaFilter) params.set("area", areaFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await get(`${API_BASE}/api/boqs?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengambil data BOQ.");
      }

      const data = json?.data?.data || json?.data || [];
      const nextBoqs = Array.isArray(data) ? data : [];
      setBoqs(nextBoqs);

      if (detailBoqRef.current && detailOpen) {
        const updated = nextBoqs.find((b) => String(b.id) === String(detailBoqRef.current?.id));
        if (updated) {
          setDetailBoq(updated);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setBoqs([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, projectFilter, areaFilter, search, get]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await get(`${API_BASE}/api/boqs/stats`);
      const json = await res.json();
      if (res.ok && json?.data) {
        setSummary({
          aktif: json.data.aktif || 0,
          draft: json.data.draft || 0,
          selesai: json.data.selesai || 0,
          proyekBerjalan: json.data.proyekBerjalan || 0,
        });
      }
    } catch {
      // ignore summary fetch errors, KPI cards just show 0
    }
  }, [get]);

  const fetchMasterData = useCallback(async () => {
    try {
      const [projectsRes, itemsRes] = await Promise.all([
        get(`${API_BASE}/api/projects?all=true`),
        get(`${API_BASE}/api/items?limit=100`),
      ]);

      const projectsJson = await projectsRes.json();
      const itemsJson = await itemsRes.json();

      if (projectsRes.ok) {
        const rawList = Array.isArray(projectsJson?.data)
          ? projectsJson.data
          : Array.isArray(projectsJson?.data?.data)
            ? projectsJson.data.data
            : [];
        const list = rawList.map((p: any) => ({
          projectId: String(p.project_id || p.projectId || ""),
          projectName: p.nama_project || p.projectName || "",
          title: p.title || "",
          area: p.area || "",
          cluster_id: p.cluster_id || "",
          kecamatan: p.kecamatan || "",
          desa_kelurahan: p.desa_kelurahan || "",
          kota_kabupaten: p.kota_kabupaten || "",
          provinsi: p.provinsi || "",
        }));
        setProjects(list);
      }

      if (itemsRes.ok) {
        const rawList = Array.isArray(itemsJson?.data)
          ? itemsJson.data
          : Array.isArray(itemsJson?.data?.data)
            ? itemsJson.data.data
            : [];
        const list = rawList.map((item: any) => ({
          id: String(item.barang_id || item.id || ""),
          kode_perangkat: item.kode_perangkat || item.code || "",
          nama_barang: item.nama_barang || item.name || "",
          satuan: item.satuan_default ? { kode_satuan: item.satuan_default.kode_satuan || "" } : undefined,
        }));
        setItems(list);
      }
    } catch {
      // ignore master data fetch errors
    }
  }, [get]);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await get(`${API_BASE}/api/boqs/areas`);
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data)) {
        setAreas(json.data);
      }
    } catch {
      // ignore, area filter falls back to free text if this fails
    }
  }, [get]);

  async function handleRestoreBoq(boq: Boq) {
    try {
      const res = await put(`${API_BASE}/api/boqs/${boq.id}/status`, { status: "DRAFT" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Gagal memulihkan BOQ.");
      }
      fetchBoqs();
      fetchSummary();
      setToast({ message: "BOQ berhasil dipulihkan ke draft.", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal memulihkan BOQ.", type: "error" });
    }
  }

  async function handleRejectBoq(boq: Boq) {
    try {
      const res = await put(`${API_BASE}/api/boqs/${boq.id}/status`, { status: "DITOLAK" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Gagal menolak BOQ.");
      }
      fetchBoqs();
      fetchSummary();
      setToast({ message: "BOQ berhasil ditolak.", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal menolak BOQ.", type: "error" });
    }
  }

  async function handleMarkSelesai(boq: Boq) {
    setConfirmSelesaiBoq(boq);
    setConfirmSelesaiOpen(true);
  }

  async function handleConfirmSelesai() {
    if (!confirmSelesaiBoq) return;

    const boq = confirmSelesaiBoq;
    setConfirmSelesaiOpen(false);
    setConfirmSelesaiBoq(null);

    try {
      const res = await put(`${API_BASE}/api/boqs/${boq.id}/status`, { status: "SELESAI" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Gagal menandai BOQ sebagai Selesai.");
      }
      setDetailOpen(false);
      fetchBoqs();
      fetchSummary();
      setToast({ message: "BOQ berhasil ditandai sebagai Selesai.", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal menandai Selesai.", type: "error" });
    }
  }

  function handleCancelSelesai() {
    setConfirmSelesaiOpen(false);
    setConfirmSelesaiBoq(null);
  }

  function openReopenConfirm(boq: Boq) {
    setBoqToReopen(boq);
    setConfirmReopenOpen(true);
  }

  async function doReopenBoq() {
    if (!boqToReopen) return;
    const boq = boqToReopen;
    setConfirmReopenOpen(false);
    setBoqToReopen(null);

    try {
      const res = await put(`${API_BASE}/api/boqs/${boq.id}/status`, { status: "AKTIF" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Gagal membuka kembali BOQ.");
      }
      setDetailOpen(false);
      fetchBoqs();
      fetchSummary();
      setToast({ message: "BOQ berhasil dibuka kembali ke Aktif.", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal membuka kembali BOQ.", type: "error" });
    }
  }

  // Staf Gudang is locked to the Aktif tab — never let it switch away.
  useEffect(() => {
    if (isStaffGudang && activeTab !== "aktif") {
      setActiveTab("aktif");
    }
  }, [isStaffGudang, activeTab]);

  useEffect(() => {
    fetchBoqs();
  }, [fetchBoqs, activeTab]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchMasterData();
    fetchAreas();
  }, [fetchMasterData, fetchAreas]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  /* ---------------------------------------------------------------- */
  /* Modal handlers                                                     */
  /* ---------------------------------------------------------------- */

  function openCreateModal() {
    setModalMode("create");
    setSelectedBoq(null);
    setForm({
      projectId: "",
      area: "",
      cluster_id: "",
      kecamatan: "",
      desa_kelurahan: "",
      kota_kabupaten: "",
      provinsi: "",
      ticketNumber: "",
      emailReference: "",
      externalVerificationStatus: "menunggu",
      notes: "",
      referenceFile: "",
      items: [{ itemCode: "", itemName: "", quantity: 1, unit: "", destinationWarehouseId: "", notes: "" }],
    });
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(boq: Boq) {
    setModalMode("edit");
    setSelectedBoq(boq);
    const selectedProject = projects.find((p) => p.projectId === boq.projectId);
    setForm({
      projectId: boq.projectId,
      area: boq.area,
      cluster_id: selectedProject?.cluster_id || "",
      kecamatan: selectedProject?.kecamatan || "",
      desa_kelurahan: selectedProject?.desa_kelurahan || "",
      kota_kabupaten: selectedProject?.kota_kabupaten || "",
      provinsi: selectedProject?.provinsi || "",
      ticketNumber: boq.ticketNumber,
      emailReference: boq.emailReference || "",
      externalVerificationStatus: boq.externalVerificationStatus,
      notes: boq.notes || "",
      referenceFile: boq.referenceFile || "",
      items: boq.items.map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit || "",
        destinationWarehouseId: item.destinationWarehouseId || "",
        notes: item.notes || "",
      })),
    });
    setFormError(null);
    setModalOpen(true);
  }

  function openDetailModal(boq: Boq) {
    setDetailBoq(boq);
    setDetailOpen(true);
  }

  async function handleProjectChange(projectId: string) {
    setForm((prev) => ({ ...prev, projectId, cluster_id: "" }));

    const selected = projects.find((p) => p.projectId === projectId);
    if (!selected) return;

    setForm((prev) => ({
      ...prev,
      area: selected.area || prev.area,
      cluster_id: "",
      kecamatan: selected.kecamatan || "",
      desa_kelurahan: selected.desa_kelurahan || "",
      kota_kabupaten: selected.kota_kabupaten || "",
      provinsi: selected.provinsi || "",
    }));

    try {
      const res = await get(`${API_BASE}/api/clusters?project_id=${projectId}`);
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data)) {
        setClusters(json.data);
      } else {
        setClusters([]);
      }
    } catch {
      setClusters([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.projectId.trim()) {
      setFormError("Project wajib dipilih.");
      return;
    }
    if (!form.cluster_id.trim()) {
      setFormError("Cluster wajib dipilih.");
      return;
    }
    if (!form.area.trim()) {
      setFormError("Area wajib diisi.");
      return;
    }
    if (!form.ticketNumber.trim()) {
      setFormError("Kode tiket wajib diisi.");
      return;
    }

    const validItems = form.items.filter(
      (item) => item.itemCode.trim() && item.itemName.trim() && item.quantity > 0
    );

    if (validItems.length === 0) {
      setFormError("Minimal satu item dengan kode, nama, dan qty harus diisi.");
      return;
    }

    const itemErrorMessages = Object.values(itemErrors);
    if (itemErrorMessages.length > 0) {
      setFormError(itemErrorMessages[0]);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const url = `${API_BASE}/api/boqs${modalMode === "edit" && selectedBoq ? `/${selectedBoq.id}` : ""}`;

      const payload = {
        projectId: form.projectId,
        clusterId: form.cluster_id,
        area: form.area,
        ticketNumber: form.ticketNumber,
        status: "DRAFT",
        source: "TOP_DOWN",
        externalVerificationStatus: "MENUNGGU",
        notes: form.notes || null,
        referenceFile: form.referenceFile || null,
        emailReference: form.emailReference || null,
        items: validItems.map((item) => ({
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit || null,
          destinationWarehouseId: item.destinationWarehouseId || null,
          notes: item.notes || null,
        })),
      };

      const res = modalMode === "create" ? await post(url, payload) : await put(url, payload);

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || `Gagal ${modalMode === "create" ? "menambah" : "menyimpan"} BOQ.`);
      }

      setModalOpen(false);
      fetchBoqs();
      fetchSummary();
      if (modalMode === "create") {
        setToast({ message: "BOQ berhasil disimpan sebagai Draft.", type: "success" });
      } else {
        setToast({ message: "Perubahan BOQ berhasil disimpan.", type: "success" });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCluster(e: React.FormEvent) {
    e.preventDefault();
    setClusterSubmitting(true);
    setClusterError(null);

    try {
      const res = await post(`${API_BASE}/api/clusters`, {
        cluster_id: clusterForm.cluster_id,
        project_id: form.projectId,
        nama_cluster: clusterForm.nama_cluster,
        cluster_type: clusterForm.cluster_type || null,
        project_type: clusterForm.project_type || null,
        kso_partner: clusterForm.kso_partner || null,
        kso_contact: clusterForm.kso_contact || null,
        no_tiket_release: clusterForm.no_tiket_release || null,
        vendor: clusterForm.vendor || null,
        alamat_lengkap: clusterForm.alamat_lengkap || null,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "Gagal membuat cluster.");
      }

      const newCluster = json.data;
      setClusters((prev) => [...prev, newCluster]);
      setForm((prev) => ({ ...prev, cluster_id: newCluster.cluster_id }));
      setClusterModalOpen(false);
      setClusterForm({ cluster_id: "", nama_cluster: "", cluster_type: "", project_type: "", kso_partner: "", kso_contact: "", no_tiket_release: "", vendor: "", alamat_lengkap: "" });
    } catch (err) {
      setClusterError(err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.");
    } finally {
      setClusterSubmitting(false);
    }
  }

  async function handleUploadReference(file: File) {
    setUploadingRef(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await post(`${API_BASE}/api/upload/boq-reference`, formData, {
        // Don't set Content-Type for FormData; browser will set it with boundary
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengunggah file referensi.");
      }

      const fileUrl = json?.data?.url;
      if (fileUrl) {
        setForm((prev) => ({ ...prev, referenceFile: fileUrl }));
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal mengunggah file referensi.");
    } finally {
      setUploadingRef(false);
    }
  }

  async function handleActivate(boq: Boq) {
    if (boq.source === "top_down" && boq.externalVerificationStatus !== "terverifikasi") {
      setToast({
        message: "BOQ ini belum ditandai terverifikasi oleh tim eksternal gudang. Konfirmasikan verifikasinya terlebih dahulu sebelum diaktifkan.",
        type: "error",
      });
      return;
    }

    try {
      const res = await put(`${API_BASE}/api/boqs/${boq.id}/status`, { status: "aktif" });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Gagal mengaktifkan BOQ.");
      }

      fetchBoqs();
      fetchSummary();
      setToast({ message: "BOQ berhasil diaktifkan.", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal mengaktifkan BOQ.", type: "error" });
    }
  }

  async function handleMarkVerified(boq: Boq) {
    try {
      const res = await put(`${API_BASE}/api/boqs/${boq.id}`, {
        externalVerificationStatus: "terverifikasi",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Gagal menandai verifikasi.");
      }

      fetchBoqs();
      if (detailBoq?.id === boq.id) {
        setDetailBoq({ ...detailBoq, externalVerificationStatus: "terverifikasi" });
      }
      setToast({ message: "BOQ berhasil ditandai terverifikasi.", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal menandai verifikasi.", type: "error" });
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await get(`${API_BASE}/api/boqs/export-matrix`);
      if (!res.ok) throw new Error("Gagal mengekspor laporan BOQ.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BOQ-Export-Matrix_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setToast({ message: "Laporan BOQ berhasil diekspor.", type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal mengekspor BOQ.", type: "error" });
    } finally {
      setExporting(false);
    }
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { itemCode: "", itemName: "", quantity: 1, unit: "", destinationWarehouseId: "", notes: "" },
      ],
    }));
  }

  function addItemFromMaster(itemCode: string, itemName: string, unit?: string) {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { itemCode: itemCode, itemName: itemName, quantity: 1, unit: unit || "", destinationWarehouseId: "", notes: "" },
      ],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function updateItem(index: number, field: string, value: unknown) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));

    if (field === "itemCode") {
      const code = String(value || "");
      if (!code.trim()) {
        setItemErrors((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
        return;
      }
      const exists = items.some(
        (it) => it.kode_perangkat.toLowerCase() === code.trim().toLowerCase()
      );
      if (!exists) {
        setItemErrors((prev) => ({
          ...prev,
          [index]: `Kode barang "${code}" belum terdaftar di master data. Hubungi Admin untuk menambahkan.`,
        }));
      } else {
        setItemErrors((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    }
  }

  const totalQty = useMemo(() => {
    return form.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [form.items]);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase();
    return items.filter(
      (item) =>
        item.kode_perangkat.toLowerCase().includes(q) ||
        item.nama_barang.toLowerCase().includes(q)
    );
  }, [items, itemSearch]);

  /* ---------------------------------------------------------------- */
  /* Render                                                             */
  /* ---------------------------------------------------------------- */

  return (
    <div className={`${plusJakartaSans.className}`}>
      <div className="flex flex-1 flex-col p-6">
        {/* 1. Header */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">BOQ & Surat Tiket</h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelola BOQ (Bill of Quantity) dan Surat Tiket proyek.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? "Mengekspor..." : "Ekspor"}
            </button>

            {canManage && (
              <button
                type="button"
                onClick={openCreateModal}
                className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600"
              >
                <Plus size={16} />
                Input BOQ
              </button>
            )}
          </div>
        </header>

        {isStaffGudang && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
            <Lock size={14} className="shrink-0" />
            Anda melihat mode baca-saja untuk BOQ Aktif sebagai rujukan Surat Jalan.
          </div>
        )}

        {/* 2. Kartu ringkasan (KPI) */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-400">BOQ Aktif</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.aktif}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-400">BOQ Draft</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.draft}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
              Proyek Berjalan
              <Info size={12} className="text-slate-400" />
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.proyekBerjalan}</p>
          </div>
        </div>

        {/* 4. Tabs */}
        <div className="mb-6 flex items-center gap-2 border-b border-slate-100">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tab.key === "draft" ? summary.draft : tab.key === "selesai" ? summary.selesai : tab.key === "ditolak" ? undefined : null;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {count !== null && count !== undefined && count > 0 && (
                  <span className="ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. Filter & pencarian */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari kode tiket, referensi email, atau nama barang..."
              className="w-full bg-transparent outline-none placeholder:text-slate-300 text-sm"
            />
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
          >
            <option value="">Semua Project/Cluster</option>
            {projects.map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {project.projectName || project.title}
              </option>
            ))}
          </select>

          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
          >
            <option value="">Semua Area</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

        </div>

        {/* 5. Tabel BOQ */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Nomor BOQ / Tiket
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Sumber
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Project
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Verifikasi Eksternal
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Item
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Total Qty
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Dokumen
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: 7 }).map((_, colIndex) => (
                        <td key={colIndex} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-sm text-rose-500">
                      {error}
                    </td>
                  </tr>
                ) : boqs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-400">
                      {activeTab === "draft"
                        ? "Belum ada BOQ draft. BOQ baru dari email/PO akan muncul di sini."
                        : "Tidak ada data BOQ."}
                    </td>
                  </tr>
                ) : (
                  boqs.map((boq) => {
                    const statusBadge = getStatusBadge(boq.status);
                    const sourceBadge = getSourceBadge(boq.source);
                    const verificationBadge = getVerificationBadge(boq.externalVerificationStatus);
                    const totalQty = boq.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                    const totalItems = boq.items.length;
                    const blockedFromActivation =
                      boq.externalVerificationStatus !== "terverifikasi";

                    return (
                      <tr
                        key={boq.id}
                        className="group cursor-pointer transition-colors hover:bg-slate-50"
                        onClick={() => openDetailModal(boq)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-orange-500">{boq.boqNumber}</div>
                          <div className="text-xs text-slate-400">{boq.ticketNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${sourceBadge.bg} ${sourceBadge.text}`}
                          >
                            <sourceBadge.icon size={12} />
                            {sourceBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          <div className="flex items-center gap-2">
                            <span>{boq.project?.projectName || boq.project?.title || "-"}</span>
                            {boq.project?.status_aktif === false && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                                <AlertCircle size={10} />
                                Project Nonaktif
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{boq.area}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${verificationBadge.bg} ${verificationBadge.text}`}
                          >
                            <verificationBadge.icon size={12} />
                            {verificationBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-slate-800">
                          {totalItems} barang
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-800">{totalQty}</td>
                        <td className="px-6 py-4">
                          {boq.referenceFile ? (
                            <a
                              href={boq.referenceFile}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100"
                              title="Lihat dokumen referensi BOQ"
                            >
                              <FileText size={14} />
                              PDF
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}
                          >
                            <statusBadge.icon size={12} />
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetailModal(boq);
                              }}
                              title="Lihat detail"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Eye size={15} />
                            </button>

                             {canManage && boq.status !== "aktif" && boq.status !== "selesai" && boq.status !== "ditolak" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(boq);
                                }}
                                title="Edit"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-orange-600"
                              >
                                <Pencil size={15} />
                              </button>
                            )}

                            {canManage && boq.status === "ditolak" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreBoq(boq);
                                }}
                                title="Pulihkan ke Draft"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-orange-600"
                              >
                                <RefreshCw size={15} />
                              </button>
                            )}

                            {canManage && activeTab === "draft" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActivate(boq);
                                }}
                                title={
                                  blockedFromActivation
                                    ? "Belum bisa diaktifkan — menunggu verifikasi eksternal"
                                    : "Aktifkan BOQ"
                                }
                                className={`rounded-lg p-1.5 ${
                                  blockedFromActivation
                                    ? "text-slate-300 hover:bg-slate-50"
                                    : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                                }`}
                              >
                                <CheckCircle2 size={15} />
                              </button>
                            )}
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

        {/* Create/Edit Modal — "Input BOQ dari Email" */}
        {modalOpen && canManage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {modalMode === "create" ? "Input BOQ" : "Edit BOQ"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {modalMode === "edit" && selectedBoq
                      ? selectedBoq.boqNumber
                      : "Masukkan data BOQ secara manual. Data akan tersimpan di Draft BOQ."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Project <span className="text-rose-500">*</span>
                    </label>
                     <select
                       value={form.projectId}
                       onChange={(e) => handleProjectChange(e.target.value)}
                       className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                     >
                      <option value="">Pilih project</option>
                      {projects.map((project) => (
                        <option key={project.projectId} value={project.projectId}>
                          {project.projectName || project.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Area <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.area}
                      disabled
                      placeholder="Contoh: Bandung, Cimahi"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-orange-400 cursor-not-allowed"
                    />
                  </div>

                  {form.projectId && (
                    <>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-500">
                          Cluster <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={form.cluster_id}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "__new__") {
                              setClusterModalOpen(true);
                            } else {
                              setForm((prev) => ({ ...prev, cluster_id: value }));
                              const selected = clusters.find((c) => c.cluster_id === value);
                              if (selected) {
                                setForm((prev) => ({
                                  ...prev,
                                  cluster_id: value,
                                }));
                              }
                            }
                          }}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                        >
                          <option value="">Pilih Cluster</option>
                          {clusters.map((cluster) => (
                            <option key={cluster.cluster_id} value={cluster.cluster_id}>
                              {cluster.nama_cluster}
                            </option>
                          ))}
                          <option value="__new__">+ Tambah Cluster Baru</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-400">
                          Kecamatan
                        </label>
                        <input
                          type="text"
                          value={form.kecamatan}
                          disabled
                          placeholder="Otomatis dari cluster"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-orange-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-400">
                          Desa/Kelurahan
                        </label>
                        <input
                          type="text"
                          value={form.desa_kelurahan}
                          disabled
                          placeholder="Otomatis dari cluster"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-orange-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-400">
                          Kota/Kabupaten
                        </label>
                        <input
                          type="text"
                          value={form.kota_kabupaten}
                          disabled
                          placeholder="Otomatis dari cluster"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-orange-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-slate-400">
                          Provinsi
                        </label>
                        <input
                          type="text"
                          value={form.provinsi}
                          disabled
                          placeholder="Otomatis dari cluster"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-orange-400 cursor-not-allowed"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Kode Tiket <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.ticketNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, ticketNumber: e.target.value }))}
                      placeholder="Nomor tiket material"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Referensi Email/PO
                    </label>
                    <input
                      type="text"
                      value={form.emailReference}
                      onChange={(e) => setForm((prev) => ({ ...prev, emailReference: e.target.value }))}
                      placeholder="Opsional: subjek email atau nomor PO"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Dokumen Referensi BOQ (Foto/PDF)
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadReference(file);
                        }
                      }}
                      disabled={uploadingRef}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                    />
                    {uploadingRef && (
                      <p className="mt-1 text-xs text-slate-400">Mengunggah file...</p>
                    )}
                    {form.referenceFile && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={form.referenceFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-orange-600 hover:text-orange-700"
                        >
                          Lihat file referensi
                        </a>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, referenceFile: "" }))}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">
                      Verifikasi Tim Eksternal Gudang
                    </label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                      <input
                        id="verified"
                        type="checkbox"
                        checked={form.externalVerificationStatus === "terverifikasi"}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            externalVerificationStatus: e.target.checked ? "terverifikasi" : "menunggu",
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                      />
                      <label htmlFor="verified" className="text-sm text-slate-600">
                        Sudah dikonfirmasi terverifikasi oleh tim eksternal gudang
                      </label>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      BOQ tidak dapat diaktifkan sebelum status ini "Terverifikasi".
                    </p>
                  </div>

                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Catatan</label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Catatan tambahan"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                    />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-500">
                      Daftar Barang <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={itemSearch}
                          onChange={(e) => setItemSearch(e.target.value)}
                          placeholder="Cari kode/nama..."
                          className="rounded-lg border border-slate-200 pl-8 pr-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400 w-40"
                        />
                      </div>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            const selected = filteredItems.find((it) => it.id === e.target.value);
                            if (selected) {
                              addItemFromMaster(selected.kode_perangkat, selected.nama_barang, selected.satuan?.kode_satuan);
                            }
                            e.target.value = "";
                          }
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                      >
                        <option value="">Pilih Barang...</option>
                        {filteredItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.kode_perangkat} - {item.nama_barang}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600"
                      >
                        <Plus size={14} />
                        Tambah Item
                      </button>
                    </div>
                  </div>

                   <div className="space-y-2">
                     {form.items.map((item, index) => (
                       <div key={index} className="grid grid-cols-12 gap-2 rounded-xl border border-slate-100 p-3">
                           <div className="col-span-3">
                             <BarangPicker
                               value={item.itemCode}
                               onSelect={(picked: BarangPickerItem) => {
                                 if (picked.id) {
                                   updateItem(index, "itemCode", picked.kode_perangkat);
                                   updateItem(index, "itemName", picked.nama_barang);
                                   updateItem(
                                     index,
                                     "unit",
                                     picked.satuan_default_kode || "",
                                   );
                                 } else {
                                   updateItem(index, "itemCode", picked.kode_perangkat);
                                 }
                               }}
                               placeholder="Kode perangkat"
                             />
                             {itemErrors[index] && (
                               <p className="mt-1 text-[10px] text-rose-600">{itemErrors[index]}</p>
                             )}
                           </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => updateItem(index, "itemName", e.target.value)}
                            placeholder="Nama barang"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                            placeholder="Qty"
                            min="1"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400"
                          />
                        </div>
                         <div className="col-span-3">
                           <input
                             type="text"
                             value={item.unit}
                             onChange={(e) => updateItem(index, "unit", e.target.value)}
                             placeholder="Satuan"
                             className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400"
                           />
                         </div>
                         <div className="col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
          </div>
        </div>

                    ))}
                  </div>

                  {form.items.length > 0 && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>
                          Total Item:{" "}
                          {form.items.filter((i) => i.itemCode && i.itemName && i.quantity > 0).length}
                        </span>
                        <span>Total Qty: {totalQty}</span>
                      </div>
                    </div>
                  )}
                </div>

                {formError && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-60"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {modalMode === "create" ? "Simpan" : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. Detail drawer/modal */}
        {detailOpen && detailBoq && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={() => setDetailOpen(false)}
          >
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Detail BOQ</h3>
                  <p className="text-xs text-slate-500">
                    {detailBoq.boqNumber} • {detailBoq.ticketNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Ringkasan atas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400">Project</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        {detailBoq.project?.projectName || detailBoq.project?.title || "-"}
                      </span>
                      {detailBoq.project?.status_aktif === false && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                          <AlertCircle size={10} />
                          Project Nonaktif
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400">Area</p>
                    <p className="text-sm font-medium text-slate-800">{detailBoq.area}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400">Status</p>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        getStatusBadge(detailBoq.status).bg
                      } ${getStatusBadge(detailBoq.status).text}`}
                    >
                      {getStatusBadge(detailBoq.status).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400">Sumber</p>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        getSourceBadge(detailBoq.source).bg
                      } ${getSourceBadge(detailBoq.source).text}`}
                    >
                      {getSourceBadge(detailBoq.source).label}
                    </span>
                  </div>
                </div>

                {/* Referensi email/PO */}
                {detailBoq.source === "top_down" && (
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs font-medium text-slate-400">Referensi Email/PO</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-sm text-slate-700">{detailBoq.emailReference || "-"}</p>
                      {detailBoq.emailReference && (
                        <a
                          href={`mailto:?subject=${encodeURIComponent(detailBoq.emailReference)}`}
                          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600"
                        >
                          <ExternalLink size={12} />
                          Telusuri
                        </a>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          getVerificationBadge(detailBoq.externalVerificationStatus).bg
                        } ${getVerificationBadge(detailBoq.externalVerificationStatus).text}`}
                      >
                        {getVerificationBadge(detailBoq.externalVerificationStatus).label}
                      </span>
                      {canManage && detailBoq.externalVerificationStatus !== "terverifikasi" && (
                        <button
                          type="button"
                          onClick={() => handleMarkVerified(detailBoq)}
                          className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          <ShieldCheck size={13} />
                          Tandai sudah diverifikasi
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Dokumen Referensi BOQ - visible for all sources */}
                {(() => {
                  let attachment: { url?: string; filename?: string } | null = null;
                  try {
                    const parsed = JSON.parse(detailBoq.notes || "{}");
                    if (parsed.url || parsed.filename) attachment = parsed;
                  } catch {
                    if (detailBoq.referenceFile) attachment = { url: detailBoq.referenceFile };
                  }
                  if (!attachment) return null;
                  return (
                    <div className="rounded-xl border border-slate-100 p-3">
                      <p className="text-xs font-medium text-slate-400">Dokumen Referensi BOQ</p>
                      <div className="mt-2 flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-orange-600 hover:text-orange-700"
                        >
                          {attachment.filename || "Lihat dokumen referensi BOQ"}
                        </a>
                      </div>
                    </div>
                  );
                })()}

                {detailBoq.notes && (
                  <div>
                    <p className="text-xs font-medium text-slate-400">Catatan</p>
                    <p className="text-sm text-slate-700">{detailBoq.notes}</p>
                  </div>
                )}

                {/* Daftar barang */}
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-2">Daftar Barang</p>
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-4 py-2 text-[11px] font-semibold text-slate-400">Kode</th>
                          <th className="px-4 py-2 text-[11px] font-semibold text-slate-400">Nama</th>
                          <th className="px-4 py-2 text-[11px] font-semibold text-slate-400 text-right">Qty</th>
                          <th className="px-4 py-2 text-[11px] font-semibold text-slate-400">Satuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {detailBoq.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2.5 text-slate-700">{item.itemCode}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">
                              <div className="flex items-center gap-2">
                                {item.barang?.foto && !brokenImages.has(item.barang.foto) && (
                                  <Image
                                    src={item.barang.foto}
                                    alt={item.itemName}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 rounded-lg border border-slate-100 object-contain"
                                    onError={() => {
                                      const fotoUrl = item.barang?.foto;
                                      if (fotoUrl) setBrokenImages((prev) => new Set(prev).add(fotoUrl));
                                    }}
                                  />
                                )}
                                <span>{item.itemName}</span>
                                {item.barang?.kategori?.is_kritis && (
                                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                                    Kritis
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{item.unit || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Riwayat Surat Jalan */}
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2">
                    <History size={13} />
                    Riwayat Surat Jalan
                  </p>
                  {detailBoq.suratJalanHistory && detailBoq.suratJalanHistory.length > 0 ? (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-4 py-2 text-[11px] font-semibold text-slate-400">Nomor Surat Jalan</th>
                            <th className="px-4 py-2 text-[11px] font-semibold text-slate-400">Tanggal</th>
                            <th className="px-4 py-2 text-[11px] font-semibold text-slate-400 text-right">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {detailBoq.suratJalanHistory.map((sj) => (
                            <tr key={sj.id}>
                              <td className="px-4 py-2.5 text-slate-700">{sj.number}</td>
                              <td className="px-4 py-2.5 text-slate-500">
                                {new Date(sj.date).toLocaleDateString("id-ID")}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{sj.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Belum ada Surat Jalan yang merealisasikan BOQ ini.</p>
                  )}
                </div>

                {/* Ringkasan mini rekonsiliasi */}
                {detailBoq.reconciliation && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">Ringkasan Rekonsiliasi</p>
                    <div className="grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                      <div>
                        <p className="text-[11px] text-slate-400">BOQ</p>
                        <p className="text-sm font-semibold text-slate-800">{detailBoq.reconciliation.boqQty}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">MOS (Sistem)</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {detailBoq.reconciliation.hardwareOnSite}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Used</p>
                        <p className="text-sm font-semibold text-slate-800">{detailBoq.reconciliation.used}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Remains</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {detailBoq.reconciliation.remains}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata audit */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
                  <span>
                    Dibuat: {new Date(detailBoq.createdAt).toLocaleString("id-ID")}
                    {` oleh ${displayUser(detailBoq.createdBy)}`}
                  </span>
                  <span>
                    Diubah: {new Date(detailBoq.updatedAt).toLocaleString("id-ID")}
                    {` oleh ${displayUser(detailBoq.updatedBy)}`}
                  </span>
                </div>

                {/* Aksi kontekstual */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  {canManage && detailBoq.status === "draft" && detailBoq.source === "top_down" && detailBoq.externalVerificationStatus !== "terverifikasi" && (
                    <button
                      type="button"
                      onClick={() => handleMarkVerified(detailBoq)}
                      className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-600"
                    >
                      <ShieldCheck size={16} />
                      Tandai Terverifikasi
                    </button>
                  )}

                  {canManage && detailBoq.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailOpen(false);
                        handleActivate(detailBoq);
                      }}
                      disabled={detailBoq.source === "top_down" && detailBoq.externalVerificationStatus !== "terverifikasi"}
                      className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      Aktifkan BOQ
                    </button>
                  )}

                  {canManage && detailBoq.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailOpen(false);
                        handleRejectBoq(detailBoq);
                      }}
                      className="flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"
                    >
                      <ThumbsDown size={16} />
                      Tolak BOQ
                    </button>
                  )}

                   {canManage && detailBoq.status === "aktif" && (
                     <button
                       type="button"
                       onClick={() => handleMarkSelesai(detailBoq)}
                       className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                     >
                       <ClipboardCheck size={16} />
                       Tandai Selesai
                     </button>
                   )}

                    {canManage && detailBoq.status === "selesai" && (
                      <button
                        type="button"
                        onClick={() => openReopenConfirm(detailBoq)}
                        className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-600"
                      >
                        <CheckCircle2 size={16} />
                        Buka Kembali ke Aktif
                      </button>
                    )}

                   {canManage && detailBoq.status === "ditolak" && (
                    <button
                      type="button"
                      onClick={() => {
                        setDetailOpen(false);
                        handleRestoreBoq(detailBoq);
                      }}
                      className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-orange-600"
                    >
                      <RefreshCw size={16} />
                      Pulihkan ke Draft
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmSelesaiOpen && confirmSelesaiBoq && (() => {
        const boq = confirmSelesaiBoq;
        const totalBoq = boq.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        const totalAdditional = boq.reconciliation?.additional || 0;
        const mosSistem = boq.reconciliation?.mosSistem || 0;
        const used = boq.reconciliation?.used || 0;
        const approvedReturnQty = boq.reconciliation?.approved_return_qty || 0;
        const remains = mosSistem - (totalBoq + totalAdditional) - used - approvedReturnQty;
        const hasWarning = remains !== 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-base font-semibold text-slate-900">Tandai BOQ sebagai Selesai?</h3>
              <p className="mt-1 text-sm text-slate-500">
                BOQ <span className="font-semibold text-slate-700">{boq.boqNumber || boq.id}</span> akan diubah menjadi status Selesai.
              </p>

              {hasWarning && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Perhatian: BOQ ini masih memiliki sisa material.</p>
                     <p className="mt-0.5 text-xs">
                       Remains = <span className="font-semibold">{remains}</span> (MOS Sistem: {mosSistem}, BOQ: {totalBoq}, Additional: {totalAdditional}, Used: {used}, Return: {approvedReturnQty})
                     </p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelSelesai}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSelesai}
                  className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-600"
                >
                  Ya, Tandai Selesai
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
       <ConfirmModal
         open={confirmReopenOpen}
         onClose={() => setConfirmReopenOpen(false)}
         onConfirm={doReopenBoq}
         title="Buka Kembali ke Aktif"
         description="Yakin ingin membuka kembali BOQ ini ke status Aktif?"
         confirmText="Ya, Buka Kembali"
         cancelText="Batal"
         variant="default"
       />

       {clusterModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop:blur-sm p-4">
           <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
             <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
               <h3 className="text-base font-semibold text-slate-900">Tambah Cluster Baru</h3>
               <button
                 type="button"
                 onClick={() => setClusterModalOpen(false)}
                 className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
               >
                 <X size={16} />
               </button>
             </div>

              <form onSubmit={handleCreateCluster} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Cluster ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clusterForm.cluster_id}
                    onChange={(e) => setClusterForm((prev) => ({ ...prev, cluster_id: e.target.value.toUpperCase() }))}
                    placeholder="Contoh: CL001, NET-H-005502"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Nama Cluster <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clusterForm.nama_cluster}
                    onChange={(e) => setClusterForm((prev) => ({ ...prev, nama_cluster: e.target.value }))}
                    placeholder="Contoh: RW 05, Cluster A"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Tipe Cluster
                  </label>
                  <input
                    type="text"
                    value={clusterForm.cluster_type}
                    onChange={(e) => setClusterForm((prev) => ({ ...prev, cluster_type: e.target.value }))}
                    placeholder="Opsional"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Alamat Lengkap
                  </label>
                  <textarea
                    value={clusterForm.alamat_lengkap}
                    onChange={(e) => setClusterForm((prev) => ({ ...prev, alamat_lengkap: e.target.value }))}
                    placeholder="Opsional"
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                  />
                </div>

                {clusterError && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {clusterError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setClusterModalOpen(false)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={clusterSubmitting}
                    className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-60"
                  >
                    {clusterSubmitting && <Loader2 size={14} className="animate-spin" />}
                    Buat Cluster
                  </button>
                </div>
              </form>
           </div>
         </div>
       )}
     </div>
   );
 }