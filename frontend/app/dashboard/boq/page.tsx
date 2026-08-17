"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  ClipboardList,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
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
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  History,
  Warehouse as WarehouseIcon,
  Download,
  Lock,
  Building2,
  ClipboardList as RequestIcon,
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

type BoqStatus = "draft" | "aktif" | "ditolak";
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
  remains: number;
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
  proyekBerjalan: number;
}

type TabType = "aktif" | "draft" | "ditolak";
type SectionType = TabType | "permintaan";

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
    case "ditolak":
      return { label: "Ditolak", bg: "bg-rose-50", text: "text-rose-600", icon: XCircle };
    default:
      return { label: status, bg: "bg-slate-100", text: "text-slate-600", icon: FileText };
  }
}

function getSourceBadge(source: BoqSource) {
  switch (source) {
    case "top_down":
      return { label: "Top Down", bg: "bg-sky-50", text: "text-sky-600", icon: Mail };
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
    proyekBerjalan: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedBoq, setSelectedBoq] = useState<Boq | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBoq, setDetailBoq] = useState<Boq | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [items, setItems] = useState<{ id: string; kode_perangkat: string; nama_barang: string; satuan?: { kode_satuan: string } }[]>([]);
  const [itemSearch, setItemSearch] = useState("");
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

  // Permintaan BOQ state
  const [permintaanBoqs, setPermintaanBoqs] = useState<any[]>([]);
  const [permintaanLoading, setPermintaanLoading] = useState(false);
  const [permintaanModalOpen, setPermintaanModalOpen] = useState(false);
  const [permintaanForm, setPermintaanForm] = useState({
    projectId: "",
    barangId: "",
    quantity: 1,
    alasan: "",
    referenceTicket: "",
  });
  const [permintaanSubmitting, setPermintaanSubmitting] = useState(false);
  const [permintaanFormError, setPermintaanFormError] = useState<string | null>(null);

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
      if (warehouseFilter) params.set("warehouseId", warehouseFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await get(`${API_BASE}/api/boqs?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengambil data BOQ.");
      }

      const data = json?.data?.data || json?.data || [];
      setBoqs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setBoqs([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, projectFilter, areaFilter, warehouseFilter, search, get]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await get(`${API_BASE}/api/boqs/stats`);
      const json = await res.json();
      if (res.ok && json?.data) {
        setSummary({
          aktif: json.data.aktif || 0,
          draft: json.data.draft || 0,
          proyekBerjalan: json.data.proyekBerjalan || 0,
        });
      }
    } catch {
      // ignore summary fetch errors, KPI cards just show 0
    }
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

      if (warehousesRes.ok) {
        const rawList = Array.isArray(warehousesJson?.data) ? warehousesJson.data : [];
        const list = rawList.map((w: any) => ({
          id: String(w.gudang_id || w.id || ""),
          name: w.nama_gudang || w.name || "",
          code: w.kode_gudang || w.code || "",
        }));
        setWarehouses(list);
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

  const fetchPermintaanBoqs = useCallback(async () => {
    setPermintaanLoading(true);
    try {
      const res = await get(`${API_BASE}/api/permintaan-boqs?limit=50`);
      const json = await res.json();
      if (res.ok && Array.isArray(json?.data?.data)) {
        setPermintaanBoqs(json.data.data);
      } else if (res.ok && Array.isArray(json?.data)) {
        setPermintaanBoqs(json.data);
      }
    } catch {
      // ignore
    } finally {
      setPermintaanLoading(false);
    }
  }, [get]);

  async function handlePermintaanSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPermintaanFormError(null);

    if (!permintaanForm.projectId) {
      setPermintaanFormError("Project wajib dipilih.");
      return;
    }
    if (!permintaanForm.barangId) {
      setPermintaanFormError("Barang wajib dipilih.");
      return;
    }
    if (!permintaanForm.quantity || permintaanForm.quantity < 1) {
      setPermintaanFormError("Qty harus lebih dari 0.");
      return;
    }

    setPermintaanSubmitting(true);
    try {
      const selectedItem = items.find((it) => it.id === permintaanForm.barangId);
      const payload = {
        projectId: permintaanForm.projectId,
        barangId: permintaanForm.barangId,
        qty: permintaanForm.quantity,
        alasan: permintaanForm.alasan || null,
        referenceTicket: permintaanForm.referenceTicket || null,
        itemCode: selectedItem?.kode_perangkat || "",
        itemName: selectedItem?.nama_barang || "",
        unit: selectedItem?.satuan?.kode_satuan || "Unit",
      };

      const res = await post(`${API_BASE}/api/permintaan-boqs`, payload);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Gagal mengajukan permintaan BOQ.");
      }

      setPermintaanModalOpen(false);
      setPermintaanForm({ projectId: "", barangId: "", quantity: 1, alasan: "", referenceTicket: "" });
      fetchPermintaanBoqs();
    } catch (err) {
      setPermintaanFormError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setPermintaanSubmitting(false);
    }
  }

  async function handleApprovePermintaan(record: any) {
    try {
      const res = await put(`${API_BASE}/api/permintaan-boqs/${record.permintaan_id}/status`, {
        status: "DISETUJUI",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Gagal menyetujui permintaan.");
      }
      fetchPermintaanBoqs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyetujui permintaan.");
    }
  }

  async function handleRestoreBoq(boq: Boq) {
    try {
      const res = await put(`${API_BASE}/api/boqs/${boq.id}/status`, { status: "DRAFT" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Gagal memulihkan BOQ.");
      }
      fetchBoqs();
      fetchSummary();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memulihkan BOQ.");
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menolak BOQ.");
    }
  }

  async function handleRejectPermintaan(record: any) {
    try {
      const res = await put(`${API_BASE}/api/permintaan-boqs/${record.permintaan_id}/status`, {
        status: "DITOLAK",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Gagal menolak permintaan.");
      }
      fetchPermintaanBoqs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menolak permintaan.");
    }
  }

  // Staf Gudang is locked to the Aktif tab — never let it switch away.
  useEffect(() => {
    if (isStaffGudang && activeTab !== "aktif") {
      setActiveTab("aktif");
    }
  }, [isStaffGudang, activeTab]);

  useEffect(() => {
    if (activeTab !== "permintaan") {
      fetchBoqs();
    }
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

  useEffect(() => {
    fetchPermintaanBoqs();
  }, [fetchPermintaanBoqs]);

  useEffect(() => {
    if (itemPickerIndex === null) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-item-picker]')) {
        setItemPickerIndex(null);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [itemPickerIndex]);

  useEffect(() => {
    if (itemPickerIndex === null) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setItemPickerIndex(null);
        setItemPickerSearch('');
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [itemPickerIndex]);

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

  function handleProjectChange(projectId: string) {
    setForm((prev) => ({ ...prev, projectId }));

    const selected = projects.find((p) => p.projectId === projectId);
    if (!selected) return;

    setForm((prev) => ({
      ...prev,
      area: selected.area || prev.area,
      cluster_id: selected.cluster_id || "",
      kecamatan: selected.kecamatan || "",
      desa_kelurahan: selected.desa_kelurahan || "",
      kota_kabupaten: selected.kota_kabupaten || "",
      provinsi: selected.provinsi || "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.projectId.trim()) {
      setFormError("Project wajib dipilih.");
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

    setSubmitting(true);
    setFormError(null);

    try {
      const url = `${API_BASE}/api/boqs${modalMode === "edit" && selectedBoq ? `/${selectedBoq.id}` : ""}`;

      const payload = {
        projectId: form.projectId,
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
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.");
    } finally {
      setSubmitting(false);
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
      alert(
        "BOQ ini belum ditandai terverifikasi oleh tim eksternal gudang. Konfirmasikan verifikasinya terlebih dahulu sebelum diaktifkan."
      );
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengaktifkan BOQ.");
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menandai verifikasi.");
    }
  }

  async function handleExport() {
    try {
      const params = new URLSearchParams();
      params.set("status", activeTab);
      if (projectFilter) params.set("projectId", projectFilter);
      if (areaFilter) params.set("area", areaFilter);
      if (warehouseFilter) params.set("warehouseId", warehouseFilter);

      const res = await get(`${API_BASE}/api/boqs/export?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengekspor laporan BOQ.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-boq-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengekspor laporan BOQ.");
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
  }

  const totalQty = useMemo(() => {
    return form.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [form.items]);

  const warehouseCount = useMemo(() => {
    const set = new Set(form.items.map((item) => item.destinationWarehouseId).filter(Boolean));
    return set.size;
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
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <Download size={16} />
              Ekspor
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
            <p className="text-xs font-medium text-slate-400">Proyek Berjalan</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.proyekBerjalan}</p>
          </div>
        </div>

        {/* 4. Tabs */}
        <div className="mb-6 flex items-center gap-2 border-b border-slate-100">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tab.key === "draft" ? summary.draft : tab.key === "ditolak" ? undefined : null;

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
          {canManage && (
            <button
              type="button"
              onClick={() => setActiveTab("permintaan")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "permintaan"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <RequestIcon size={16} />
              Permintaan BOQ
            </button>
          )}
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

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
          >
            <option value="">Semua Gudang Tujuan</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
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
                          <div>{boq.project?.projectName || boq.project?.title || "-"}</div>
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

                            {canManage && boq.status !== "aktif" && boq.status !== "ditolak" && (
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

        {/* Permintaan BOQ Section */}
        {activeTab === "permintaan" && canManage && (
          <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Permintaan BOQ</h3>
                <p className="text-xs text-slate-500">
                  Permintaan tambahan barang dari lapangan yang perlu disetujui Admin General.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPermintaanModalOpen(true)}
                className="flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600"
              >
                <Plus size={16} />
                Ajukan Permintaan
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Nomor Permintaan
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Project
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Barang
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Qty Usulan
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Tiket Rujukan
                    </th>
                    <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {permintaanLoading ? (
                    Array.from({ length: 3 }).map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        {Array.from({ length: 6 }).map((_, colIndex) => (
                          <td key={colIndex} className="px-6 py-4">
                            <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : permintaanBoqs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-400">
                        Belum ada permintaan BOQ.
                      </td>
                    </tr>
                  ) : (
                    permintaanBoqs.map((record) => {
                      const statusKey = String(record.status).toUpperCase();
                      const statusLabel = {
                        DIAJUKAN: "Diajukan",
                        DITINJAU: "Ditinjau",
                        DISETUJUI: "Disetujui",
                        DITOLAK: "Ditolak",
                      }[statusKey] || record.status;
                      const statusColor = {
                        DIAJUKAN: "bg-amber-50 text-amber-600",
                        DITINJAU: "bg-sky-50 text-sky-600",
                        DISETUJUI: "bg-emerald-50 text-emerald-600",
                        DITOLAK: "bg-rose-50 text-rose-600",
                      }[statusKey] || "bg-slate-100 text-slate-600";
                      const canProcess = statusKey === "DIAJUKAN" || statusKey === "DITINJAU";

                      return (
                        <tr key={record.permintaan_id} className="group transition-colors hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-orange-500">{record.requestNumber || `REQ-${record.permintaan_id}`}</div>
                            <div className="text-xs text-slate-400">{record.alasan || "-"}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            {record.project?.nama_project || "-"}
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            <div className="font-medium">{record.itemName || record.barang?.nama_barang || "-"}</div>
                            <div className="text-xs text-slate-400">{record.itemCode || record.barang?.kode_perangkat || "-"}</div>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-800">
                            {Number(record.qty_usulan || record.quantity || 0)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {record.referenceTicket || record.tiket_id || "-"}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {canProcess && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprovePermintaan(record)}
                                    title="Setujui"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                                  >
                                    <ThumbsUp size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectPermintaan(record)}
                                    title="Tolak"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <ThumbsDown size={15} />
                                  </button>
                                </>
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
        )}

        {/* Permintaan BOQ Modal */}
        {permintaanModalOpen && canManage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={() => setPermintaanModalOpen(false)}
          >
            <div
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Ajukan Permintaan BOQ</h3>
                  <p className="text-xs text-slate-500">
                    Usulkan penambahan barang yang dibutuhkan di lapangan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPermintaanModalOpen(false)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePermintaanSubmit} className="p-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Project <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={permintaanForm.projectId}
                    onChange={(e) => setPermintaanForm((prev) => ({ ...prev, projectId: e.target.value }))}
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
                    Barang <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={permintaanForm.barangId}
                    onChange={(e) => setPermintaanForm((prev) => ({ ...prev, barangId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                  >
                    <option value="">Pilih barang</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.kode_perangkat} - {item.nama_barang}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Qty <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={permintaanForm.quantity}
                    onChange={(e) => setPermintaanForm((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Alasan / Justifikasi</label>
                  <textarea
                    value={permintaanForm.alasan}
                    onChange={(e) => setPermintaanForm((prev) => ({ ...prev, alasan: e.target.value }))}
                    placeholder="Jelaskan alasan permintaan tambahan ini..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Tiket Rujukan (Opsional)</label>
                  <input
                    type="text"
                    value={permintaanForm.referenceTicket}
                    onChange={(e) => setPermintaanForm((prev) => ({ ...prev, referenceTicket: e.target.value }))}
                    placeholder="Nomor tiket material terkait"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                  />
                </div>

                {permintaanFormError && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {permintaanFormError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPermintaanModalOpen(false)}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={permintaanSubmitting}
                    className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-60"
                  >
                    {permintaanSubmitting && <Loader2 size={14} className="animate-spin" />}
                    Ajukan Permintaan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                         <label className="mb-1.5 block text-xs font-medium text-slate-400">
                           Cluster ID
                         </label>
                         <input
                           type="text"
                           value={form.cluster_id}
                           disabled
                           placeholder="Otomatis dari project"
                           className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-orange-400 cursor-not-allowed"
                         />
                       </div>

                       <div>
                         <label className="mb-1.5 block text-xs font-medium text-slate-400">
                           Kecamatan
                         </label>
                         <input
                           type="text"
                           value={form.kecamatan}
                           disabled
                           placeholder="Otomatis dari project"
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
                           placeholder="Otomatis dari project"
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
                           placeholder="Otomatis dari project"
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
                           placeholder="Otomatis dari project"
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

                <datalist id="boq-item-codes">
                  {items.map((item) => (
                    <option key={item.id} value={item.kode_perangkat} />
                  ))}
                </datalist>

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
                          <div className="col-span-3 relative">
                            <input
                              type="text"
                              value={item.itemCode}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateItem(index, "itemCode", val);
                                const matched = items.find((it) => it.kode_perangkat === val);
                                if (matched) {
                                  updateItem(index, "itemName", matched.nama_barang);
                                  updateItem(index, "unit", matched.satuan?.kode_satuan || "");
                                }
                              }}
                              onFocus={() => {
                                setItemPickerIndex(null);
                                setItemPickerSearch("");
                              }}
                              placeholder="Kode perangkat"
                              list="boq-item-codes"
                              className="w-full rounded-lg border border-slate-200 pl-2 pr-8 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400"
                            />
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => {
                                setItemPickerIndex(itemPickerIndex === index ? null : index);
                                setItemPickerSearch("");
                              }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                            >
                              <ChevronDown size={12} />
                            </button>

                            {itemPickerIndex === index && (
                              <div
                                data-item-picker
                                className="absolute left-0 top-full z-[60] mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                              >
                                <div className="p-1">
                                  <input
                                    type="text"
                                    value={itemPickerSearch}
                                    onChange={(e) => setItemPickerSearch(e.target.value)}
                                    placeholder="Cari barang..."
                                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-orange-400"
                                    autoFocus
                                  />
                                </div>
                                <div className="max-h-32 overflow-y-auto">
                                  {items
                                    .filter((it) => {
                                      const q = itemPickerSearch.toLowerCase();
                                      return (
                                        !q ||
                                        it.kode_perangkat.toLowerCase().includes(q) ||
                                        it.nama_barang.toLowerCase().includes(q)
                                      );
                                    })
                                    .map((it) => (
                                      <button
                                        key={it.id}
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        onClick={() => {
                                          updateItem(index, "itemCode", it.kode_perangkat);
                                          updateItem(index, "itemName", it.nama_barang);
                                          updateItem(index, "unit", it.satuan?.kode_satuan || "");
                                          setItemPickerIndex(null);
                                          setItemPickerSearch("");
                                        }}
                                        className="flex w-full items-center justify-between px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                                      >
                                        <span className="font-medium text-slate-700">{it.kode_perangkat}</span>
                                        <span className="truncate text-slate-500">{it.nama_barang}</span>
                                      </button>
                                    ))}
                                </div>
                              </div>
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
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateItem(index, "unit", e.target.value)}
                            placeholder="Satuan"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400"
                          />
                        </div>
                         <div className="col-span-2">
                           <select
                            value={item.destinationWarehouseId}
                            onChange={(e) => updateItem(index, "destinationWarehouseId", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-orange-400"
                          >
                            <option value="">Gudang</option>
                            {warehouses.map((wh) => (
                              <option key={wh.id} value={wh.id}>
                                {wh.name}
                              </option>
                            ))}
                          </select>
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
                        <span>Gudang Tujuan: {warehouseCount}</span>
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
                    <p className="text-sm font-medium text-slate-800">
                      {detailBoq.project?.projectName || detailBoq.project?.title || "-"}
                    </p>
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
                        <div className="mt-2 flex items-center gap-2">
                          <FileText size={14} className="text-slate-400" />
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-orange-600 hover:text-orange-700"
                          >
                            {attachment.filename || "Lihat file referensi"}
                          </a>
                        </div>
                      );
                    })()}
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
                  <p className="text-xs font-medium text-slate-400 mb-2">Daftar Barang (Master Data)</p>
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-4 py-2 text-[11px] font-semibold text-slate-400">Kode</th>
                          <th className="px-4 py-2 text-[11px] font-semibold text-slate-400">Nama</th>
                          <th className="px-4 py-2 text-[11px] font-semibold text-slate-400">Kategori</th>
                          <th className="px-4 py-2 text-[11px] font-semibold text-slate-400 text-right">Qty</th>
                          <th className="px-4 py-2 text-[11px] font-semibold text-slate-400">Satuan</th>
                          <th className="px-4 py-2 text-[11px] font-semibold text-slate-400">Gudang Tujuan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {detailBoq.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2.5 text-slate-700">{item.itemCode}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">
                              <div className="flex items-center gap-2">
                                {item.barang?.foto && (
                                  <Image
                                    src={item.barang.foto}
                                    alt={item.itemName}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 rounded-lg border border-slate-100 object-contain"
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
                            <td className="px-4 py-2.5 text-slate-500">
                              {item.barang?.kategori?.nama_kategori || "-"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{item.unit || "-"}</td>
                            <td className="px-4 py-2.5 text-slate-500">
                              {item.destinationWarehouse?.name || "-"}
                            </td>
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
                        <p className="text-[11px] text-slate-400">Hardware on Site</p>
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
                    {detailBoq.createdBy ? ` oleh ${detailBoq.createdBy}` : ""}
                  </span>
                  <span>
                    Diubah: {new Date(detailBoq.updatedAt).toLocaleString("id-ID")}
                    {detailBoq.updatedBy ? ` oleh ${detailBoq.updatedBy}` : ""}
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
    </div>
  );
}