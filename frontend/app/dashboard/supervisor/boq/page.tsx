"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Mail,
  ShieldCheck,
  ShieldAlert,
  ThumbsDown,
  ExternalLink,
  History,
  Download,
  Lock,
  Info,
  ChevronDown,
} from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
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
  clusterId?: string;
  cluster?: { cluster_id: string; nama_cluster?: string; cluster_type?: string } | null;
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

export default function BoqPage() {
  const router = useRouter();
  const { get, post, put } = useApi();
  const { user } = useAuth();
  const role = mapRole(user?.role);
  const isSupervisor = role === "supervisor";

  const [activeTab, setActiveTab] = useState<SectionType>("aktif");
  const [boqs, setBoqs] = useState<Boq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryCounts>({ aktif: 0, draft: 0, selesai: 0, proyekBerjalan: 0 });

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedBoq, setSelectedBoq] = useState<Boq | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBoq, setDetailBoq] = useState<Boq | null>(null);
  const [confirmSelesaiOpen, setConfirmSelesaiOpen] = useState(false);
  const [confirmSelesaiBoq, setConfirmSelesaiBoq] = useState<Boq | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [items, setItems] = useState<{ id: string; kode_perangkat: string; nama_barang: string; satuan?: { kode_satuan: string } }[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [itemPickerIndex, setItemPickerIndex] = useState<number | null>(null);
  const [itemPickerSearch, setItemPickerSearch] = useState("");

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
  const [ticketChecking, setTicketChecking] = useState(false);
  const [ticketDuplicateError, setTicketDuplicateError] = useState<string | null>(null);

  const [clusters, setClusters] = useState<{ cluster_id: string; nama_cluster: string }[]>([]);
  const [clusterModalOpen, setClusterModalOpen] = useState(false);
  const [clusterForm, setClusterForm] = useState({ cluster_id: "", nama_cluster: "", cluster_type: "", project_type: "", kso_partner: "", kso_contact: "", no_tiket_release: "", vendor: "", alamat_lengkap: "" });
  const [clusterSubmitting, setClusterSubmitting] = useState(false);
  const [clusterError, setClusterError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!form.ticketNumber.trim()) {
      setTicketDuplicateError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setTicketChecking(true);
      setTicketDuplicateError(null);
      try {
        const params = new URLSearchParams({ ticketNumber: form.ticketNumber.trim() });
        if (modalMode === "edit" && selectedBoq?.id) {
          params.set("excludeBoqId", selectedBoq.id);
        }
        const res = await get(`${API_BASE}/api/boqs/check-ticket?${params.toString()}`);
        const json = await res.json();
        if (!res.ok || json?.data?.available === false) {
          const message = json?.message || json?.data?.message || `Nomor tiket "${form.ticketNumber.trim()}" sudah digunakan.`;
          setTicketDuplicateError(message);
        } else {
          setTicketDuplicateError(null);
        }
      } catch {
        // ignore validation check error
      } finally {
        setTicketChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.ticketNumber, modalMode, selectedBoq?.id, get]);

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
      if (!res.ok) throw new Error(json?.message || "Gagal mengambil data BOQ.");
      const data = json?.data?.data || json?.data || [];
      setBoqs(Array.isArray(data) ? data : []);
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
    } catch {}
  }, [get]);

  const fetchMasterData = useCallback(async () => {
    try {
      const [projectsRes, warehousesRes, itemsRes] = await Promise.all([
        get(`${API_BASE}/api/projects?all=true`),
        get(`${API_BASE}/api/warehouses`),
        get(`${API_BASE}/api/items?limit=100`),
      ]);
      const projectsJson = await projectsRes.json();
      const warehousesJson = await warehousesRes.json();
      const itemsJson = await itemsRes.json();

      if (projectsRes.ok) {
        const rawList = Array.isArray(projectsJson?.data)
          ? projectsJson.data
          : Array.isArray(projectsJson?.data?.data) ? projectsJson.data.data : [];
        setProjects(rawList.map((p: any) => ({
          projectId: String(p.project_id || p.projectId || ""),
          projectName: p.nama_project || p.projectName || "",
          title: p.title || "",
          area: p.area || "",
          cluster_id: p.cluster_id || "",
          kecamatan: p.kecamatan || "",
          desa_kelurahan: p.desa_kelurahan || "",
          kota_kabupaten: p.kota_kabupaten || "",
          provinsi: p.provinsi || "",
        })));
      }
      if (warehousesRes.ok) {
        const rawList = Array.isArray(warehousesJson?.data) ? warehousesJson.data : [];
        setWarehouses(rawList.map((w: any) => ({
          id: String(w.gudang_id || w.id || ""),
          name: w.nama_gudang || w.name || "",
          code: w.kode_gudang || w.code || "",
        })));
      }
      if (itemsRes.ok) {
        const rawList = Array.isArray(itemsJson?.data)
          ? itemsJson.data
          : Array.isArray(itemsJson?.data?.data) ? itemsJson.data.data : [];
        setItems(rawList.map((item: any) => ({
          id: String(item.barang_id || item.id || ""),
          kode_perangkat: item.kode_perangkat || item.code || "",
          nama_barang: item.nama_barang || item.name || "",
          satuan: item.satuan_default ? { kode_satuan: item.satuan_default.kode_satuan || "" } : undefined,
        })));
      }
    } catch {}
  }, [get]);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await get(`${API_BASE}/api/boqs/areas`);
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data)) setAreas(json.data);
    } catch {}
  }, [get]);

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

  useEffect(() => { fetchBoqs(); }, [fetchBoqs, activeTab]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchMasterData(); fetchAreas(); }, [fetchMasterData, fetchAreas]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (itemPickerIndex === null) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-item-picker]')) setItemPickerIndex(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [itemPickerIndex]);

  useEffect(() => {
    if (itemPickerIndex === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setItemPickerIndex(null); setItemPickerSearch(''); }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [itemPickerIndex]);

  function openCreateModal() {
    setModalMode("create");
    setSelectedBoq(null);
    setForm({
      projectId: "", area: "", cluster_id: "", kecamatan: "", desa_kelurahan: "",
      kota_kabupaten: "", provinsi: "", ticketNumber: "", emailReference: "",
      externalVerificationStatus: "menunggu", notes: "", referenceFile: "",
      items: [{ itemCode: "", itemName: "", quantity: 1, unit: "", destinationWarehouseId: "", notes: "" }],
    });
    setItemPickerIndex(null);
    setItemPickerSearch("");
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
    setItemPickerIndex(null);
    setItemPickerSearch("");
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
    if (!form.projectId.trim()) { setFormError("Project wajib dipilih."); return; }
    if (!form.cluster_id.trim()) { setFormError("Cluster wajib dipilih."); return; }
    if (!form.area.trim()) { setFormError("Area wajib diisi."); return; }
    if (!form.ticketNumber.trim()) { setFormError("Kode tiket wajib diisi."); return; }

    if (ticketDuplicateError) {
      setFormError(ticketDuplicateError);
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
      setToast({ message: "BOQ berhasil disimpan sebagai Draft.", type: "success" });
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
      const res = await post(`${API_BASE}/api/upload/boq-reference`, formData, {});
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Gagal mengunggah file referensi.");
      const fileUrl = json?.data?.url;
      if (fileUrl) setForm((prev) => ({ ...prev, referenceFile: fileUrl }));
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
      const res = await put(`${API_BASE}/api/boqs/${boq.id}/status`, { status: "AKTIF" });
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
      items: [...prev.items, { itemCode: "", itemName: "", quantity: 1, unit: "", destinationWarehouseId: "", notes: "" }],
    }));
  }

  function addItemFromMaster(itemCode: string, itemName: string, unit?: string) {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { itemCode, itemName, quantity: 1, unit: unit || "", destinationWarehouseId: "", notes: "" }],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
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

  const totalQty = useMemo(() => form.items.reduce((s, i) => s + (i.quantity || 0), 0), [form.items]);

  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase();
    return items.filter((i) => i.kode_perangkat.toLowerCase().includes(q) || i.nama_barang.toLowerCase().includes(q));
  }, [items, itemSearch]);

  return (
    <div className={`${plusJakartaSans.className}`}>
      <div className="flex flex-1 flex-col p-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">BOQ & Surat Tiket</h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelola BOQ (Bill of Quantity) dan Surat Tiket untuk area supervisi Anda.
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
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600"
            >
              <Plus size={16} />
              Input BOQ
            </button>
          </div>
        </header>

        {isSupervisor && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-xs text-sky-700">
            <Lock size={14} className="shrink-0" />
            Anda login sebagai Supervisor. BOQ baru akan otomatis berstatus <b>Draft</b> dengan sumber <b>Top-Down (PO Internal)</b>.
          </div>
        )}

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
                  activeTab === tab.key ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {count !== null && count !== undefined && count > 0 && (
                  <span className="ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600">{count}</span>
                )}
              </button>
            );
          })}
        </div>

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
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400">
            <option value="">Semua Project/Cluster</option>
            {projects.map((project) => (
              <option key={project.projectId} value={project.projectId}>{project.projectName || project.title}</option>
            ))}
          </select>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400">
            <option value="">Semua Area</option>
            {areas.map((area) => (<option key={area} value={area}>{area}</option>))}
          </select>
        </div>

        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nomor BOQ / Tiket</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sumber</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Verifikasi Eksternal</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Item</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total Qty</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dokumen</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cluster</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: 10 }).map((_, colIndex) => (
                        <td key={colIndex} className="px-6 py-4"><div className="h-4 animate-pulse rounded-lg bg-slate-100" /></td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr><td colSpan={10} className="px-6 py-16 text-center text-sm text-rose-500">{error}</td></tr>
                ) : boqs.length === 0 ? (
                  <tr><td colSpan={10} className="px-6 py-16 text-center text-sm text-slate-400">
                    {activeTab === "draft" ? "Belum ada BOQ draft. BOQ baru dari email/PO akan muncul di sini." : "Tidak ada data BOQ."}
                  </td></tr>
                ) : (
                  boqs.map((boq) => {
                    const statusBadge = getStatusBadge(boq.status);
                    const sourceBadge = getSourceBadge(boq.source);
                    const verificationBadge = getVerificationBadge(boq.externalVerificationStatus);
                    const rowQty = boq.items.reduce((s, i) => s + (i.quantity || 0), 0);
                    const totalItems = boq.items.length;
                    const blockedFromActivation = boq.externalVerificationStatus !== "terverifikasi";
                    return (
                      <tr key={boq.id} className="group cursor-pointer transition-colors hover:bg-slate-50" onClick={() => openDetailModal(boq)}>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-orange-500">{boq.boqNumber}</div>
                          <div className="text-xs text-slate-400">{boq.ticketNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${sourceBadge.bg} ${sourceBadge.text}`}>
                            <sourceBadge.icon size={12} />{sourceBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          <div>{boq.project?.projectName || boq.project?.title || "-"}</div>
                          <div className="text-xs text-slate-400">{boq.area}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${verificationBadge.bg} ${verificationBadge.text}`}>
                            <verificationBadge.icon size={12} />{verificationBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-slate-800">{totalItems} barang</td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-800">{rowQty}</td>
                        <td className="px-6 py-4">
                          {boq.referenceFile ? (
                            <a href={boq.referenceFile} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100">
                              <FileText size={14} />PDF
                            </a>
                          ) : (<span className="text-xs text-slate-300">-</span>)}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          <div className="text-sm font-medium text-slate-800">
                            {boq.clusterId || boq.cluster?.cluster_id || "-"}
                          </div>
                          {boq.cluster?.nama_cluster && (
                            <div className="text-xs text-slate-400">{boq.cluster.nama_cluster}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                            <statusBadge.icon size={12} />{statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={(e) => { e.stopPropagation(); openDetailModal(boq); }} title="Lihat detail" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                              <Eye size={15} />
                            </button>
                            {boq.status === "draft" && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); openEditModal(boq); }} title="Edit" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-orange-600">
                                <Pencil size={15} />
                              </button>
                            )}
                            {activeTab === "draft" && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleActivate(boq); }} title={blockedFromActivation ? "Belum bisa diaktifkan — menunggu verifikasi eksternal" : "Aktifkan BOQ"} className={`rounded-lg p-1.5 ${blockedFromActivation ? "text-slate-300 hover:bg-slate-50" : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"}`}>
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
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{modalMode === "create" ? "Input BOQ" : "Edit BOQ"}</h3>
                <p className="text-xs text-slate-500">
                  {modalMode === "edit" && selectedBoq ? selectedBoq.boqNumber : "Masukkan data BOQ. Otomatis berstatus Draft dengan sumber Top-Down."}
                </p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Project <span className="text-rose-500">*</span></label>
                  <select value={form.projectId} onChange={(e) => handleProjectChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400">
                    <option value="">Pilih project</option>
                    {projects.map((project) => (<option key={project.projectId} value={project.projectId}>{project.projectName || project.title}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Area <span className="text-rose-500">*</span></label>
                  <input type="text" value={form.area} disabled placeholder="Contoh: Bandung, Cimahi" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-orange-400 cursor-not-allowed" />
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
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">Kecamatan</label>
                      <input type="text" value={form.kecamatan} disabled placeholder="Otomatis dari cluster" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-orange-400 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">Desa/Kelurahan</label>
                      <input type="text" value={form.desa_kelurahan} disabled placeholder="Otomatis dari cluster" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-orange-400 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">Kota/Kabupaten</label>
                      <input type="text" value={form.kota_kabupaten} disabled placeholder="Otomatis dari cluster" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-orange-400 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-400">Provinsi</label>
                      <input type="text" value={form.provinsi} disabled placeholder="Otomatis dari cluster" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-orange-400 cursor-not-allowed" />
                    </div>
                  </>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Kode Tiket <span className="text-rose-500">*</span></label>
                  <input type="text" value={form.ticketNumber} onChange={(e) => setForm((p) => ({ ...p, ticketNumber: e.target.value }))} placeholder="Nomor tiket material" className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400 ${ticketDuplicateError ? "border-rose-400 bg-rose-50" : "border-slate-200"}`} />
                  {ticketChecking && (
                    <p className="mt-1 text-[11px] text-slate-400">Memeriksa kode tiket...</p>
                  )}
                  {ticketDuplicateError && !ticketChecking && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600">
                      <AlertCircle size={12} />
                      {ticketDuplicateError}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Referensi Email/PO</label>
                  <input type="text" value={form.emailReference} onChange={(e) => setForm((p) => ({ ...p, emailReference: e.target.value }))} placeholder="Opsional: subjek email atau nomor PO" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Dokumen Referensi BOQ (Foto/PDF)</label>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadReference(file); }} disabled={uploadingRef} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                  {uploadingRef && <p className="mt-1 text-xs text-slate-400">Mengunggah file...</p>}
                  {form.referenceFile && (
                    <div className="mt-2 flex items-center gap-2">
                      <a href={form.referenceFile} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-orange-600 hover:text-orange-700">Lihat file referensi</a>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, referenceFile: "" }))} className="text-xs text-slate-400 hover:text-slate-600">Hapus</button>
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Catatan</label>
                  <input type="text" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Catatan tambahan" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
              </div>

              <datalist id="boq-item-codes">
                  {items.map((item) => (<option key={item.id} value={item.kode_perangkat} />))}
                </datalist>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-500">Daftar Barang <span className="text-rose-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Cari kode/nama..." className="rounded-lg border border-slate-200 pl-8 pr-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400 w-40" />
                    </div>
                    <select onChange={(e) => { if (e.target.value) { const selected = filteredItems.find((it) => it.id === e.target.value); if (selected) addItemFromMaster(selected.kode_perangkat, selected.nama_barang, selected.satuan?.kode_satuan); e.target.value = ""; } }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400">
                      <option value="">Pilih Barang...</option>
                      {filteredItems.map((item) => (<option key={item.id} value={item.id}>{item.kode_perangkat} - {item.nama_barang}</option>))}
                    </select>
                    <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600">
                      <Plus size={14} />Tambah Item
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {form.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 rounded-xl border border-slate-100 p-3">
                      <div className="col-span-3 relative">
                        <input type="text" value={item.itemCode} onChange={(e) => { const val = e.target.value; updateItem(index, "itemCode", val); const matched = items.find((it) => it.kode_perangkat === val); if (matched) { updateItem(index, "itemName", matched.nama_barang); updateItem(index, "unit", matched.satuan?.kode_satuan || ""); } }} onFocus={() => { setItemPickerIndex(null); setItemPickerSearch(""); }} placeholder="Kode perangkat" list="boq-item-codes" className="w-full rounded-lg border border-slate-200 pl-2 pr-8 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400" />
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={() => { setItemPickerIndex(itemPickerIndex === index ? null : index); setItemPickerSearch(""); }} className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600">
                          <ChevronDown size={12} />
                        </button>
                        {itemErrors[index] && (
                          <p className="mt-1 text-[10px] text-rose-600">{itemErrors[index]}</p>
                        )}
                        {itemPickerIndex === index && (
                          <div data-item-picker className="absolute left-0 top-full z-[60] mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                            <div className="p-1">
                              <input type="text" value={itemPickerSearch} onChange={(e) => setItemPickerSearch(e.target.value)} placeholder="Cari barang..." className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-orange-400" autoFocus />
                            </div>
                            <div className="max-h-32 overflow-y-auto">
                              {items.filter((it) => { const q = itemPickerSearch.toLowerCase(); return !q || it.kode_perangkat.toLowerCase().includes(q) || it.nama_barang.toLowerCase().includes(q); }).map((it) => (
                                <button key={it.id} type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={() => { updateItem(index, "itemCode", it.kode_perangkat); updateItem(index, "itemName", it.nama_barang); updateItem(index, "unit", it.satuan?.kode_satuan || ""); setItemPickerIndex(null); setItemPickerSearch(""); }} className="flex w-full items-center justify-between px-2 py-1.5 text-left text-xs hover:bg-slate-50">
                                  <span className="font-medium text-slate-700">{it.kode_perangkat}</span>
                                  <span className="truncate text-slate-500">{it.nama_barang}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="col-span-3"><input type="text" value={item.itemName} onChange={(e) => updateItem(index, "itemName", e.target.value)} placeholder="Nama barang" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400" /></div>
                      <div className="col-span-2"><input type="number" value={item.quantity} onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)} placeholder="Qty" min="1" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400" /></div>
                      <div className="col-span-2"><input type="text" value={item.unit} onChange={(e) => updateItem(index, "unit", e.target.value)} placeholder="Satuan" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400" /></div>
                      <div className="col-span-2"><select value={item.destinationWarehouseId} onChange={(e) => updateItem(index, "destinationWarehouseId", e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400"><option value="">Gudang</option>{warehouses.map((wh) => (<option key={wh.id} value={wh.id}>{wh.name}</option>))}</select></div>
                      <div className="col-span-1 flex items-center justify-end"><button type="button" onClick={() => removeItem(index)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button></div>
                    </div>
                  ))}
                </div>

                {form.items.length > 0 && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Total Item: {form.items.filter((i) => i.itemCode && i.itemName && i.quantity > 0).length}</span>
                      <span>Total Qty: {totalQty}</span>
                    </div>
                  </div>
                )}
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />{formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-60">
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {modalMode === "create" ? "Simpan" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailOpen && detailBoq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setDetailOpen(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Detail BOQ</h3>
                <p className="text-xs text-slate-500">{detailBoq.boqNumber} • {detailBoq.ticketNumber}</p>
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">Project</p>
                  <p className="text-sm font-medium text-slate-800">{detailBoq.project?.projectName || detailBoq.project?.title || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Area</p>
                  <p className="text-sm font-medium text-slate-800">{detailBoq.area}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Status</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadge(detailBoq.status).bg} ${getStatusBadge(detailBoq.status).text}`}>{getStatusBadge(detailBoq.status).label}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Sumber</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getSourceBadge(detailBoq.source).bg} ${getSourceBadge(detailBoq.source).text}`}>{getSourceBadge(detailBoq.source).label}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Cluster ID</p>
                  <p className="text-sm font-medium text-slate-800">{detailBoq.clusterId || detailBoq.cluster?.cluster_id || "-"}</p>
                </div>
                {detailBoq.cluster?.nama_cluster && (
                  <div>
                    <p className="text-xs font-medium text-slate-400">Nama Cluster</p>
                    <p className="text-sm font-medium text-slate-800">{detailBoq.cluster.nama_cluster}</p>
                  </div>
                )}
              </div>

              {detailBoq.source === "top_down" && detailBoq.emailReference && (
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="text-xs font-medium text-slate-400">Referensi Email/PO</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-700">{detailBoq.emailReference}</p>
                    <a href={`mailto:?subject=${encodeURIComponent(detailBoq.emailReference)}`} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600"><ExternalLink size={12} />Telusuri</a>
                  </div>
                </div>
              )}

              {detailBoq.referenceFile && (
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="text-xs font-medium text-slate-400">Dokumen Referensi BOQ</p>
                  <div className="mt-2 flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" />
                    <a href={detailBoq.referenceFile} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-orange-600 hover:text-orange-700">Lihat dokumen referensi</a>
                  </div>
                </div>
              )}

              {detailBoq.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-400">Catatan</p>
                  <p className="text-sm text-slate-700">{detailBoq.notes}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">Daftar Barang</p>
                 <div className="rounded-xl border border-slate-100 overflow-hidden">
                   <div className="overflow-x-auto overscroll-x-contain">
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
                              {item.barang?.foto && (
                                <Image src={item.barang.foto} alt={item.itemName} width={32} height={32} className="h-8 w-8 rounded-lg border border-slate-100 object-contain" />
                              )}
                              <span>{item.itemName}</span>
                              {item.barang?.kategori?.is_kritis && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">Kritis</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-slate-500">{item.unit || "-"}</td>
                        </tr>
                       ))}
                     </tbody>
                   </table>
                   </div>
                 </div>
               </div>

              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2"><History size={13} />Riwayat Surat Jalan</p>
                 {detailBoq.suratJalanHistory && detailBoq.suratJalanHistory.length > 0 ? (
                   <div className="rounded-xl border border-slate-100 overflow-hidden">
                     <div className="overflow-x-auto overscroll-x-contain">
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
                            <td className="px-4 py-2.5 text-slate-500">{new Date(sj.date).toLocaleDateString("id-ID")}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{sj.qty}</td>
                          </tr>
                           ))}
                         </tbody>
                       </table>
                       </div>
                     </div>
                   ) : (
                  <p className="text-xs text-slate-400">Belum ada Surat Jalan yang merealisasikan BOQ ini.</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
                <span>Dibuat: {new Date(detailBoq.createdAt).toLocaleString("id-ID")}</span>
                <span>Diubah: {new Date(detailBoq.updatedAt).toLocaleString("id-ID")}</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {detailBoq.status === "aktif" && (
                  <button type="button" onClick={() => handleMarkSelesai(detailBoq)} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                    <ClipboardCheck size={16} />Tandai Selesai
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmSelesaiOpen && confirmSelesaiBoq && (() => {
        const boq = confirmSelesaiBoq;
        const totalBoq = boq.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
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
              <p className="mt-1 text-sm text-slate-500">BOQ <span className="font-semibold text-slate-700">{boq.boqNumber || boq.id}</span> akan diubah menjadi status Selesai.</p>
              {hasWarning && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Perhatian: BOQ ini masih memiliki sisa material.</p>
                     <p className="mt-0.5 text-xs">Remains = <span className="font-semibold">{remains}</span> (MOS Sistem: {mosSistem}, BOQ: {totalBoq}, Additional: {totalAdditional}, Used: {used}, Return: {approvedReturnQty})</p>
                  </div>
                </div>
              )}
              <div className="mt-6 flex items-center justify-end gap-2">
                <button type="button" onClick={handleCancelSelesai} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="button" onClick={handleConfirmSelesai} className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-600">Ya, Tandai Selesai</button>
              </div>
            </div>
          </div>
        );
      })()}

      {toast && (
        <div className={["fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-medium shadow-2xl backdrop-blur-sm max-w-sm", toast.type === "success" ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-800" : "border-rose-200/80 bg-rose-50/95 text-rose-800"].join(" ")}>
          <div className={["flex h-8 w-8 shrink-0 items-center justify-center rounded-full", toast.type === "success" ? "bg-emerald-100" : "bg-rose-100"].join(" ")}>
            {toast.type === "success" ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
          </div>
          <p className="flex-1 leading-snug">{toast.message}</p>
          <button type="button" onClick={() => setToast(null)} className={["ml-2 shrink-0 rounded-full p-1 transition-colors", toast.type === "success" ? "text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600" : "text-rose-400 hover:bg-rose-100 hover:text-rose-600"].join(" ")}>
            <X size={14} />
          </button>
        </div>
      )}

      {clusterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop:blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900">Tambah Cluster Baru</h3>
              <button type="button" onClick={() => setClusterModalOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
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
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Nama Cluster <span className="text-rose-500">*</span></label>
                <input type="text" value={clusterForm.nama_cluster} onChange={(e) => setClusterForm((prev) => ({ ...prev, nama_cluster: e.target.value }))} placeholder="Contoh: RW 05, Cluster A" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" required />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Tipe Cluster</label>
                <input type="text" value={clusterForm.cluster_type} onChange={(e) => setClusterForm((prev) => ({ ...prev, cluster_type: e.target.value }))} placeholder="Opsional" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Alamat Lengkap</label>
                <textarea value={clusterForm.alamat_lengkap} onChange={(e) => setClusterForm((prev) => ({ ...prev, alamat_lengkap: e.target.value }))} placeholder="Opsional" rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
              </div>

              {clusterError && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {clusterError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setClusterModalOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={clusterSubmitting} className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-60">
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