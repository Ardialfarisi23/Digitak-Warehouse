"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, ChevronLeft, ChevronRight, Users, Package, FolderKanban, Truck, Warehouse as WarehouseIcon, Eye, Pencil, Trash2, X, Loader2, AlertCircle, ImageOff, Building2, Ban, RotateCcw, MapPin } from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { PERSONNEL_PERMISSIONS, canPerformPersonnelAction } from "@/lib/permissions";
import Image from "next/image";
import { MobileCardList } from "@/components/MobileCardList";

// ---------------------------------------------------------------------------
// Roles & Permissions (PRD Bagian 5 & 8.3)
// ---------------------------------------------------------------------------
// ASUMSI: sesuaikan value di bawah ini dengan enum role yang benar-benar
// dikirim backend (mis. bisa jadi huruf besar / snake_case berbeda).
// Ini satu-satunya tempat yang perlu diubah kalau ternyata beda.
const ROLE = {
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  STAFF: "staff",
} as const;

function normalizeRole(role: string | undefined | null): string {
  if (!role) return "";
  return String(role).toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MasterDataType = "items" | "projects" | "personnel" | "vehicles" | "warehouses" | "suppliers" | "clusters";

interface MasterDataTab {
  key: MasterDataType;
  label: string;
  singularLabel: string;
  endpoint: string;
  icon: React.ElementType;
  idField: string;
  idFields?: string[];
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Item {
  id: string;
  barang_id?: string;
  kode_perangkat?: string;
  nama_barang?: string;
  kategori_id?: number;
  satuan_default_id?: number;
  kategori?: { nama_kategori?: string } | null;
  satuan_default?: { kode_satuan?: string } | null;
  quantity?: number;
  unit?: string;
  status?: string;
  warehouseId?: string;
  warehouse?: {
    name?: string;
    code?: string;
  } | null;
  isActive?: boolean;
  [key: string]: unknown;
}

interface GenericRecord {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  [key: string]: unknown;
}

type FieldType = "text" | "number" | "textarea" | "checkbox" | "select" | "file";

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: Array<string | { value: string; label: string }>;
  helperText?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 15;

const MASTER_DATA_TABS: MasterDataTab[] = [
  {
    key: "items",
    label: "Barang",
    singularLabel: "Barang",
    endpoint: "/api/items",
    icon: Package,
    idField: "id",
    idFields: ["id", "barang_id"],
  },
  {
    key: "projects",
    label: "Project",
    singularLabel: "Project",
    endpoint: "/api/projects",
    icon: FolderKanban,
    idField: "project_id",
    idFields: ["project_id", "id"],
  },
  {
    key: "clusters",
    label: "Cluster",
    singularLabel: "Cluster",
    endpoint: "/api/clusters/all",
    icon: MapPin,
    idField: "cluster_id",
    idFields: ["cluster_id"],
  },
  {
    key: "personnel",
    label: "Personil",
    singularLabel: "Personil",
    endpoint: "/api/personnels",
    icon: Users,
    idField: "personil_id",
    idFields: ["personil_id", "id"],
  },
  {
    key: "vehicles",
    label: "Kendaraan",
    singularLabel: "Kendaraan",
    endpoint: "/api/vehicles",
    icon: Truck,
    idField: "kendaraan_id",
    idFields: ["kendaraan_id", "id"],
  },
  {
    key: "warehouses",
    label: "Gudang",
    singularLabel: "Gudang",
    endpoint: "/api/warehouses",
    icon: WarehouseIcon,
    idField: "gudang_id",
    idFields: ["gudang_id", "id"],
  },
  {
    key: "suppliers",
    label: "Supplier",
    singularLabel: "Supplier",
    endpoint: "/api/suppliers",
    icon: Building2,
    idField: "kode",
    idFields: ["kode"],
  },
];

// Kategori barang sesuai PRD 7.1
const ITEM_CATEGORIES = ["Server", "Networking", "Endpoint/Laptop", "Storage", "Power/UPS", "Kabel & Aksesoris"];

const TAB_PERMISSIONS: Record<MasterDataType, { create: string[]; edit: string[]; delete: string[] }> = {
  items: {
    create: [ROLE.ADMIN],
    edit: [ROLE.ADMIN],
    delete: [ROLE.ADMIN],
  },
  warehouses: {
    create: [ROLE.ADMIN],
    edit: [ROLE.ADMIN],
    delete: [ROLE.ADMIN],
  },
  projects: {
    create: [ROLE.ADMIN, ROLE.SUPERVISOR],
    edit: [ROLE.ADMIN, ROLE.SUPERVISOR],
    delete: [ROLE.ADMIN, ROLE.SUPERVISOR],
  },
  personnel: {
    create: PERSONNEL_PERMISSIONS.create,
    edit: PERSONNEL_PERMISSIONS.edit,
    delete: PERSONNEL_PERMISSIONS.delete,
  },
  vehicles: {
    create: [ROLE.ADMIN],
    edit: [ROLE.ADMIN, ROLE.SUPERVISOR],
    delete: [ROLE.ADMIN, ROLE.SUPERVISOR],
  },
  suppliers: {
    create: [ROLE.ADMIN],
    edit: [ROLE.ADMIN],
    delete: [ROLE.ADMIN],
  },
  clusters: {
    create: [ROLE.ADMIN, ROLE.SUPERVISOR],
    edit: [ROLE.ADMIN, ROLE.SUPERVISOR],
    delete: [ROLE.ADMIN, ROLE.SUPERVISOR],
  },
};

// Field form Tambah/Edit per tab. Diambil dari kolom yang sudah ada di
// tabel supaya konsisten dengan skema backend saat ini, kecuali "category"
// pada Barang yang baru (PRD 7.1) — sesuaikan key-nya kalau nama kolom
// asli di backend berbeda.
const TAB_FIELDS: Record<MasterDataType, FieldConfig[]> = {
  items: [
    { key: "kode_perangkat", label: "Kode Perangkat", type: "text", required: true },
    { key: "nama_barang", label: "Nama Barang", type: "text", required: true },
    { key: "kategori_id", label: "Kategori", type: "select", required: true, options: [] },
    { key: "satuan_default_id", label: "Satuan Default", type: "select", required: true, options: [] },
    { key: "foto", label: "Foto Barang", type: "file" },
    { key: "wajib_sn", label: "Wajib Serial Number", type: "checkbox" },
  ],
  projects: [
    { key: "nama_project", label: "Nama Project", type: "text", required: true },
    { key: "title", label: "Judul", type: "text" },
    { key: "area", label: "Area", type: "text" },
    { key: "klien", label: "Klien", type: "text" },
    { key: "kecamatan", label: "Kecamatan", type: "text" },
    { key: "desa_kelurahan", label: "Desa/Kelurahan", type: "text" },
    { key: "kota_kabupaten", label: "Kota/Kabupaten", type: "text" },
    { key: "provinsi", label: "Provinsi", type: "text" },
    { key: "status_aktif", label: "Status Aktif", type: "checkbox" },
  ],
  personnel: [
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "posisi", label: "Jabatan", type: "select", options: ["Supervisor", "Staf Gudang"] },
    { key: "no_hp", label: "Telepon", type: "text" },
    { key: "nik", label: "NIK", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "gudang_id", label: "Gudang Penugasan", type: "select", options: [] },
    { key: "bisa_menyetir", label: "Punya SIM", type: "checkbox" },
    { key: "is_material_handler", label: "Material Handler", type: "checkbox" },
    { key: "foto", label: "Foto Personil", type: "file" },
  ],
  vehicles: [
    { key: "jenis_kendaraan", label: "Jenis Kendaraan", type: "text", required: true },
    { key: "merk", label: "Merk", type: "text" },
    { key: "no_polisi", label: "No. Polisi", type: "text", required: true },
    { key: "kapasitas_angkut", label: "Kapasitas Angkut (kg)", type: "text" },
    { key: "gudang_id", label: "Gudang Penempatan", type: "select", options: [] },
    { key: "keterangan", label: "Keterangan", type: "textarea" },
    { key: "foto", label: "Foto Kendaraan", type: "file" },
  ],
  warehouses: [
    { key: "nama_gudang", label: "Nama Gudang", type: "text", required: true },
    { key: "tipe", label: "Tipe", type: "select", required: true, helperText: "Gudang Tetap: lokasi permanen (Kantor Pusat/Cabang). Gudang Dadakan: staging sementara di lokasi klien.", options: [
      { value: "tetap", label: "Tetap" },
      { value: "dadakan", label: "Dadakan" },
    ] },
    { key: "project_id", label: "Project", type: "select", required: false, options: [] },
    { key: "alamat", label: "Alamat", type: "textarea" },
    { key: "latitude", label: "Latitude", type: "text" },
    { key: "longitude", label: "Longitude", type: "text" },
    { key: "keterangan", label: "Keterangan", type: "textarea" },
    { key: "is_aktif", label: "Status Aktif", type: "checkbox" },
  ],
  suppliers: [
    { key: "kode", label: "Kode", type: "text", required: true },
    { key: "nama", label: "Nama", type: "text", required: true },
    { key: "deskripsi", label: "Deskripsi", type: "textarea" },
  ],
  clusters: [
    { key: "project_id", label: "Project", type: "select", required: true, options: [] },
    { key: "nama_cluster", label: "Nama Cluster", type: "text", required: true },
    { key: "cluster_type", label: "Tipe Cluster", type: "text" },
    { key: "alamat_lengkap", label: "Alamat Lengkap", type: "textarea" },
    { key: "homepass_plan", label: "Homepass Plan", type: "number" },
    { key: "cluster_id", label: "Cluster ID", type: "text", required: true },
    { key: "status_aktif", label: "Status", type: "select", required: false, options: [
      { value: "true", label: "Aktif" },
      { value: "false", label: "Non-Aktif" },
    ]},
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBadge(item: Item) {
  const qty = item.quantity ?? 0;
  const status = String(item.status ?? "").toLowerCase();

  if (status === "habis" || qty === 0) {
    return { label: "Habis", bg: "bg-slate-100", text: "text-slate-500" };
  }

  if (status === "menipis" || qty < 10) {
    return { label: "Menipis", bg: "bg-amber-50", text: "text-amber-600" };
  }

  return { label: "Tersedia", bg: "bg-emerald-50", text: "text-emerald-600" };
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Aktif" : "Tidak Aktif";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatCheckboxValue(fieldKey: string, value: unknown): string {
  const boolVal = Boolean(value);
  if (fieldKey === "bisa_menyetir") {
    return boolVal ? "Bisa" : "Tidak";
  }
  if (fieldKey === "is_material_handler") {
    return boolVal ? "Ya" : "Tidak";
  }
  return boolVal ? "Aktif" : "Tidak Aktif";
}

function formatDateTime(value: unknown): string {
  if (!value) return "-";
  try {
    return new Date(String(value)).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
}

function getRecordTitle(tab: MasterDataType, record: GenericRecord | null) {
  if (!record) return "";
  const candidates: Record<MasterDataType, string[]> = {
    items: ["kode_perangkat", "nama_barang"],
    projects: ["nama_project", "title", "cluster_id"],
    personnel: ["nama", "posisi"],
    vehicles: ["no_polisi", "jenis_kendaraan"],
    warehouses: ["nama_gudang", "tipe"],
    suppliers: ["kode", "nama"],
    clusters: ["nama_cluster", "cluster_id"],
  };
  for (const key of candidates[tab]) {
    if (record[key]) return String(record[key]);
  }
  return String(record.id ?? "");
}

const PHOTO_FIELD_NAMES = ["photo", "photoUrl", "image", "imageUrl", "picture", "pictureUrl", "foto", "fotoUrl", "gambar", "gambarUrl"];

function getPhotoUrl(record: GenericRecord | null): string | null {
  if (!record) return null;

  for (const key of PHOTO_FIELD_NAMES) {
    const value = record[key];

    if (!value) continue;

    const str = String(value).trim();

    if (!str) continue;

    if (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("data:")) {
      return str;
    }

    if (str.startsWith("/uploads/") || str.includes("/uploads/")) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const trimmed = str.replace(/^\/+/, "");
      const apiHost = baseUrl.replace(/\/$/, "");
      return `${apiHost}/${trimmed}`;
    }

    return str;
  }

  return null;
}

function getAdditionalPhotos(record: GenericRecord | null): { label: string; url: string }[] {
  if (!record) return [];
  const photos: { label: string; url: string }[] = [];
  const seen = new Set<string>();

  for (const key of PHOTO_FIELD_NAMES) {
    const value = record[key];
    if (!value) continue;
    const str = String(value).trim();
    if (!str) continue;
    if (!str.startsWith("http://") && !str.startsWith("data:")) continue;
    if (seen.has(str)) continue;
    seen.add(str);
    photos.push({ label: key, url: str });
  }

  return photos;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];

  if (totalPages <= 6) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1, 2);

    if (page > 4) {
      pages.push("...");
    }

    const start = Math.max(3, page - 1);
    const end = Math.min(totalPages - 2, page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 3) {
      pages.push("...");
    }

    pages.push(totalPages - 1, totalPages);
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30">
        <ChevronLeft size={15} />
      </button>

      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-sm text-slate-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(Number(p))}
            className={["flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors", page === p ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"].join(" ")}
          >
            {p}
          </button>
        ),
      )}

      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30">
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic Modal shell
// ---------------------------------------------------------------------------

function Modal({ open, onClose, title, subtitle, widthClass = "max-w-lg", children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; widthClass?: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className={`w-full ${widthClass} max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>

          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Modal (read-only)
// ---------------------------------------------------------------------------

function DetailModal({ open, onClose, tab, tabLabel, record }: { open: boolean; onClose: () => void; tab: MasterDataType; tabLabel: string; record: GenericRecord | null }) {
  if (!record) return null;

  const fields = TAB_FIELDS[tab].filter((field) => field.type !== "file");
  const hasAudit = (record as any)?.created_at || (record as any)?.updated_at || record.createdAt || record.updatedAt;
  const showPhoto = tab !== "projects";
  const primaryPhoto = showPhoto ? getPhotoUrl(record) : null;
  const additionalPhotos = showPhoto ? getAdditionalPhotos(record) : [];

  return (
    <Modal open={open} onClose={onClose} title={`Detail ${tabLabel}`} subtitle={getRecordTitle(tab, record)}>
      {primaryPhoto && (
        <div className="mb-5 flex justify-center">
          <img src={primaryPhoto} alt={tabLabel} className="max-h-56 max-w-full rounded-2xl border border-slate-100 object-contain" />
        </div>
      )}

      <dl className="divide-y divide-slate-50">
        {fields.map((field) => {
          if (field.key === "project_id" && tab === "clusters") {
            const label = (record as any)?.project?.nama_project || (record as any)?.project_id || "-";

            return (
              <div key={field.key} className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-xs font-medium text-slate-400">{field.label}</dt>
                <dd className="text-right text-sm font-medium text-slate-800">{label}</dd>
              </div>
            );
          }

          if (field.key === "kategori_id" || field.key === "satuan_default_id" || field.key === "gudang_id") {
            const label = field.key === "kategori_id"
              ? (record as any)?.kategori?.nama_kategori
              : field.key === "satuan_default_id"
                ? (record as any)?.satuan_default?.kode_satuan
                : (record as any)?.gudang?.nama_gudang || (record as any)?.gudang_id;

            return (
              <div key={field.key} className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-xs font-medium text-slate-400">{field.label}</dt>
                <dd className="text-right text-sm font-medium text-slate-800">{label || "-"}</dd>
              </div>
            );
          }

          return (
            <div key={field.key} className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-xs font-medium text-slate-400">{field.label}</dt>
              <dd className="text-right text-sm font-medium text-slate-800">{field.type === "checkbox" ? formatCheckboxValue(field.key, record[field.key]) : formatValue(record[field.key])}</dd>
            </div>
          );
        })}
      </dl>

      {additionalPhotos.length > 1 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Foto Tambahan</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {additionalPhotos.slice(1).map((photo, idx) => (
              <div key={idx} className="overflow-hidden rounded-xl border border-slate-100">
                <img src={photo.url} alt={photo.label} className="h-32 w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {hasAudit && (
        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Riwayat Perubahan</p>
          <div className="space-y-1 text-xs text-slate-500">
            <p>
              Dibuat: {formatDateTime((record as any)?.created_at ?? record.createdAt)}
              {(record as any)?.created_by ? ` oleh ${(record as any).created_by}` : ""}
            </p>
            <p>
              Diubah terakhir: {formatDateTime((record as any)?.updated_at ?? record.updatedAt)}
              {(record as any)?.updated_by ? ` oleh ${(record as any).updated_by}` : ""}
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Tutup
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Add / Edit Form Modal
// ---------------------------------------------------------------------------

function FormModal({
  open,
  onClose,
  mode,
  tab,
  tabLabel,
  endpoint,
  record,
  onSuccess,
  onShowToast,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  tab: MasterDataType;
  tabLabel: string;
  endpoint: string;
  record: GenericRecord | null;
  onSuccess: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}) {
  const { post, put, get } = useApi();
  const fields = TAB_FIELDS[tab];

  const buildInitialForm = useCallback(() => {
    const initial: Record<string, unknown> = {};
    fields.forEach((field) => {
      if (field.type === "checkbox") {
        initial[field.key] = record ? Boolean(record[field.key]) : (field.key === "wajib_sn" ? false : true);
      } else if (field.type === "file") {
        if (mode === "edit") {
          const existingUrl = getPhotoUrl(record);
          initial[field.key] = existingUrl || "";
        } else {
          initial[field.key] = "";
        }
      } else if (field.key === "gudang_id" && (tab === "personnel" || tab === "vehicles")) {
        const direct = (record as any)?.gudang_id;
        const nested = (record as any)?.gudang?.gudang_id;
        initial[field.key] = direct ?? nested ?? "";
      } else if (field.key === "project_id" && tab === "clusters") {
        const direct = (record as any)?.project_id;
        const nested = (record as any)?.project?.project_id;
        initial[field.key] = direct ?? nested ?? "";
      } else if (field.key === "cluster_id" && tab === "clusters") {
        initial[field.key] = (record as any)?.cluster_id || "";
      } else if (field.key === "status_aktif" && tab === "clusters" && mode === "create") {
        initial[field.key] = "true";
      } else if (field.key === "tipe" && tab === "warehouses" && mode === "create") {
        initial[field.key] = "tetap";
      } else {
        initial[field.key] = record?.[field.key] ?? "";
      }
    });
    return initial;
  }, [fields, record, mode, tab]);

  const [form, setForm] = useState<Record<string, unknown>>(buildInitialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [unitOptions, setUnitOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ value: number; label: string; tipe?: string }>>([]);
  const [projectOptions, setProjectOptions] = useState<Array<{ value: number; label: string }>>([]);

  useEffect(() => {
    if (open && tab === "items") {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      let cancelled = false;

      Promise.all([
        get(`${baseUrl}/api/categories`)
          .then((res) => res.json())
          .then((result) => {
            if (cancelled) return;
            const list = Array.isArray(result?.data?.data) ? result.data.data : Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
            setCategoryOptions(list.map((cat: any) => ({ value: Number(cat.kategori_id), label: cat.nama_kategori })));
          })
          .catch(() => {
            if (!cancelled) setCategoryOptions([]);
          }),
        get(`${baseUrl}/api/units`)
          .then((res) => res.json())
          .then((result) => {
            if (cancelled) return;
            const list = Array.isArray(result?.data?.data) ? result.data.data : Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
            setUnitOptions(list.map((u: any) => ({ value: Number(u.satuan_id), label: u.kode_satuan })));
          })
          .catch(() => {
            if (!cancelled) setUnitOptions([]);
          }),
      ]);

      return () => {
        cancelled = true;
      };
    }

    if (open && tab === "personnel") {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      let cancelled = false;

      get(`${baseUrl}/api/warehouses`)
        .then((res) => res.json())
        .then((result) => {
          if (cancelled) return;
          const list = Array.isArray(result?.data?.data) ? result.data.data : Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
          setWarehouseOptions(list.map((w: any) => ({ value: Number(w.gudang_id), label: w.nama_gudang + (w.tipe === "dadakan" ? " (Dadakan)" : ""), tipe: w.tipe })));
        })
        .catch(() => {
          if (!cancelled) setWarehouseOptions([]);
        });

      return () => {
        cancelled = true;
      };
    }

    if (open && tab === "vehicles") {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      let cancelled = false;

      get(`${baseUrl}/api/warehouses?is_aktif=true`)
        .then((res) => res.json())
        .then((result) => {
          if (cancelled) return;
          const list = Array.isArray(result?.data?.data) ? result.data.data : Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
          setWarehouseOptions(list.map((w: any) => ({ value: Number(w.gudang_id), label: w.nama_gudang + (w.tipe === "dadakan" ? " (Dadakan)" : ""), tipe: w.tipe })));
        })
        .catch(() => {
          if (!cancelled) setWarehouseOptions([]);
        });

      return () => {
        cancelled = true;
      };
    }

    if (open && tab === "warehouses") {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      let cancelled = false;

      get(`${baseUrl}/api/projects`)
        .then((res) => res.json())
        .then((result) => {
          if (cancelled) return;
          const list = Array.isArray(result?.data?.data) ? result.data.data : Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
          setProjectOptions(list.map((p: any) => ({ value: Number(p.project_id), label: p.nama_project || p.title || `Project ${p.project_id}` })));
        })
        .catch(() => {
          if (!cancelled) setProjectOptions([]);
        });

      return () => {
        cancelled = true;
      };
    }

    if (open && tab === "clusters") {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      let cancelled = false;

      get(`${baseUrl}/api/projects`)
        .then((res) => res.json())
        .then((result) => {
          if (cancelled) return;
          const list = Array.isArray(result?.data?.data) ? result.data.data : Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
          setProjectOptions(list.map((p: any) => ({ value: Number(p.project_id), label: p.nama_project || p.title || `Project ${p.project_id}` })));
        })
        .catch(() => {
          if (!cancelled) setProjectOptions([]);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [open, tab, get]);

  const formFields = useMemo(() => {
    if (tab === "items") {
      return fields.map((field) => {
        if (field.key === "kategori_id") return { ...field, options: categoryOptions };
        if (field.key === "satuan_default_id") return { ...field, options: unitOptions };
        return field;
      });
    }

    if (tab === "personnel") {
      return fields.map((field) => {
        if (field.key === "gudang_id") return { ...field, options: warehouseOptions };
        return field;
      });
    }

    if (tab === "vehicles") {
      return fields.map((field) => {
        if (field.key === "gudang_id") return { ...field, options: warehouseOptions };
        return field;
      });
    }

    if (tab === "warehouses") {
      return fields.map((field) => {
        if (field.key === "project_id") return { ...field, options: projectOptions };
        return field;
      });
    }

    if (tab === "clusters") {
      return fields.map((field) => {
        if (field.key === "project_id") return { ...field, options: projectOptions };
        return field;
      });
    }

    return fields;
  }, [tab, fields, categoryOptions, unitOptions, warehouseOptions, projectOptions, mode]);

  const visibleFormFields = useMemo(() => {
    if (tab === "warehouses") {
      return formFields.filter((field) => {
        if (field.key === "project_id") {
          return form.tipe === "dadakan";
        }
        return true;
      });
    }

    if (tab === "clusters") {
      return formFields.filter((field) => {
        if (field.key === "project_id") {
          return form.tipe === "dadakan";
        }
        return true;
      });
    }

    return formFields;
  }, [tab, formFields, form.tipe, mode]);

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm());
      setError(null);
    }
  }, [open, buildInitialForm]);

  useEffect(() => {
    if (form.posisi === "Supervisor" && form.gudang_id !== "" && form.gudang_id != null) {
      setForm((prev) => ({ ...prev, gudang_id: "" }));
    }
  }, [form.posisi, form.gudang_id]);

  function handleChange(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadFile(file: File): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const formData = new FormData();
    formData.append("file", file);

    const response = await post(`${baseUrl}/api/upload`, formData);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.message || "Gagal upload foto.");
    }

    const result = await response.json();
    return result?.data?.url || result?.data?.filename || "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const missing = fields.find((f) => f.required && !String(form[f.key] ?? "").trim());

    if (missing) {
      setError(`${missing.label} wajib diisi.`);
      return;
    }

    if (tab === "warehouses" && form.tipe === "dadakan" && (!form.project_id || String(form.project_id).trim() === "")) {
      setError("Gudang Dadakan wajib memiliki Project terkait.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const submitData: Record<string, unknown> = { ...form };

      for (const field of fields) {
        if (field.type === "file") {
          const currentValue = submitData[field.key];

          if (currentValue instanceof File) {
            const photoUrl = await uploadFile(currentValue);
            submitData[field.key] = photoUrl;
          } else if (currentValue && typeof currentValue === "string") {
            submitData[field.key] = currentValue;
          } else {
            delete submitData[field.key];
          }
        } else if (field.type === "checkbox") {
          submitData[field.key] = Boolean(submitData[field.key]);
        } else if (field.key === "status_aktif" && tab === "clusters" && submitData[field.key] !== undefined && submitData[field.key] !== "") {
          submitData[field.key] = submitData[field.key] === "true" || submitData[field.key] === true || submitData[field.key] === 1;
        } else if (field.type === "select" && submitData[field.key] !== undefined && submitData[field.key] !== "") {
          const numericValue = Number(submitData[field.key]);
          if (!Number.isNaN(numericValue)) {
            submitData[field.key] = numericValue;
          }
        } else if (field.key === "kapasitas_angkut" && submitData[field.key] !== undefined && submitData[field.key] !== "") {
          submitData[field.key] = String(submitData[field.key]).trim();
        } else if (field.key === "gudang_id" && submitData[field.key] !== undefined && submitData[field.key] !== "") {
          const numVal = Number(submitData[field.key]);
          if (!Number.isNaN(numVal) && numVal > 0) {
            submitData[field.key] = numVal;
          } else {
            delete submitData[field.key];
          }
        } else if (field.key === "project_id" && submitData[field.key] !== undefined && submitData[field.key] !== "") {
          const numVal = Number(submitData[field.key]);
          if (!Number.isNaN(numVal) && numVal > 0) {
            submitData[field.key] = numVal;
          } else {
            delete submitData[field.key];
          }
        }
      }

      for (const key of Object.keys(submitData)) {
        if (submitData[key] === "") {
          delete submitData[key];
        }
      }

      let url: string;
      if (tab === "items") {
        const itemCode = (record as Item | null)?.kode_perangkat;
        url = mode === "create" ? new URL(endpoint, baseUrl).toString() : new URL(`${endpoint}/${encodeURIComponent(String(itemCode))}`, baseUrl).toString();
      } else if (tab === "personnel") {
        const personnelId = (record as { personil_id?: string | number } | null)?.personil_id;
        url = mode === "create" ? new URL(endpoint, baseUrl).toString() : new URL(`${endpoint}/${encodeURIComponent(String(personnelId))}`, baseUrl).toString();
      } else if (tab === "vehicles") {
        const vehicleNoPolisi = (record as { no_polisi?: string } | null)?.no_polisi;
        url = mode === "create" ? new URL(endpoint, baseUrl).toString() : new URL(`${endpoint}/${encodeURIComponent(String(vehicleNoPolisi))}`, baseUrl).toString();
      } else if (tab === "projects") {
        const projectId = (record as { project_id?: string | number } | null)?.project_id;
        url = mode === "create" ? new URL(endpoint, baseUrl).toString() : new URL(`${endpoint}/${encodeURIComponent(String(projectId))}`, baseUrl).toString();
      } else if (tab === "warehouses") {
        const warehouseName = (record as { nama_gudang?: string } | null)?.nama_gudang;
        url = mode === "create" ? new URL(endpoint, baseUrl).toString() : new URL(`${endpoint}/${encodeURIComponent(String(warehouseName))}`, baseUrl).toString();
      } else if (tab === "clusters") {
        const clusterBase = "/api/clusters";
        const clusterId = (record as { cluster_id?: string } | null)?.cluster_id;
        url = mode === "create" ? new URL(clusterBase, baseUrl).toString() : new URL(`${clusterBase}/${encodeURIComponent(String(clusterId))}`, baseUrl).toString();
      } else if (tab === "suppliers") {
        const supplierKode = (record as { kode?: string } | null)?.kode;
        url = mode === "create" ? new URL(endpoint, baseUrl).toString() : new URL(`${endpoint}/${encodeURIComponent(String(supplierKode))}`, baseUrl).toString();
      } else {
        url = mode === "create" ? new URL(endpoint, baseUrl).toString() : new URL(`${endpoint}/${encodeURIComponent(String(record?.id))}`, baseUrl).toString();
      }

      const response = mode === "create" ? await post(url, submitData) : await put(url, submitData);

      if (!response.ok) {
        let result: unknown = null;
        let rawText: string | null = null;

        try {
          result = await response.json();
        } catch {
          try {
            rawText = await response.text();
          } catch {
            rawText = null;
          }
          result = null;
        }

        const resultObj = result && typeof result === "object" ? result : null;
        const message =
          (resultObj as any)?.message ||
          rawText ||
          `Gagal ${mode === "create" ? "menambah" : "menyimpan"} ${tabLabel.toLowerCase()}.`;

        const validationDetails =
          (resultObj as any)?.errors || (resultObj as any)?.details || null;

        const fullMessage = validationDetails
          ? `${message} Detail: ${JSON.stringify(validationDetails)}`
          : message;

        if ([400, 404, 409, 422].includes(response.status)) {
          onShowToast(fullMessage, "error");
          return;
        }

        if (response.status >= 500) {
          console.error(
            `[FormModal] ${tabLabel} ${mode} failed: status=${response.status} body=${JSON.stringify(
              resultObj
            )} raw=${rawText}`
          );

          if (tab === "personnel" && mode === "edit") {
            console.error("[Edit Master Data Validation Error - Personil]:", resultObj);
          } else if (tab === "vehicles" && mode === "edit") {
            console.error("[Edit Master Data Validation Error - Kendaraan]:", resultObj);
          }
        } else {
          console.error(
            `[FormModal] ${tabLabel} ${mode} failed: status=${response.status} body=${JSON.stringify(
              resultObj
            )} raw=${rawText}`
          );
        }

        throw new Error(fullMessage);
      }

      onSuccess();
      onShowToast(`${tabLabel} berhasil ${mode === "create" ? "ditambahkan" : "diperbarui"}.`, "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(msg);
      onShowToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === "create" ? `Tambah ${tabLabel}` : `Edit ${tabLabel}`} subtitle={mode === "edit" ? getRecordTitle(tab, record) : undefined}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {visibleFormFields.map((field) => (
          <div key={field.key}>
            {field.type === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={Boolean(form[field.key])} onChange={(e) => handleChange(field.key, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                {field.label}
              </label>
            ) : field.type === "file" ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">{field.label}</label>

                {mode === "edit" && typeof form[field.key] === "string" && form[field.key] ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                        <img src={String(form[field.key])} alt="Preview" className="h-full w-full object-contain" />
                      </div>
                      <div className="text-xs text-slate-500">
                        <p className="font-medium text-slate-700">Foto saat ini</p>
                        <p>{tab === "personnel" ? "Foto dapat diubah melalui halaman profil personil." : "Klik ganti foto untuk mengubah"}</p>
                      </div>
                    </div>

                    {tab !== "personnel" && (
                      <button type="button" onClick={() => handleChange(field.key, null)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                        Ganti Foto
                      </button>
                    )}

                    {form[field.key] instanceof File && <p className="text-[11px] text-slate-400">File terpilih: {(form[field.key] as File).name}</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleChange(field.key, file);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400 file:mr-4 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-orange-600 hover:file:bg-orange-100"
                    />
                    {form[field.key] instanceof File && <p className="text-[11px] text-slate-400">File terpilih: {(form[field.key] as File).name}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  {field.label}
                  {(field.required || (field.key === "project_id" && form.tipe === "dadakan")) && <span className="text-rose-500"> *</span>}
                </label>

                {field.helperText && <p className="mb-2 text-[11px] text-slate-400">{field.helperText}</p>}

                {mode === "edit" && tab === "clusters" && field.key === "cluster_id" && (
                  <p className="mb-2 text-[11px] text-slate-400">Cluster ID tidak dapat diubah karena menjadi kunci relasi.</p>
                )}

                {mode === "edit" && field.key === "tipe" && record?.dapat_ubah_tipe === false && (
                  <p className="mb-2 text-[11px] text-amber-600">Tipe tidak dapat diubah karena gudang ini sudah memiliki stok atau lebih dari 1 zona.</p>
                )}

                {field.type === "select" ? (
                  <select
                    value={String(form[field.key] ?? "")}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={field.key === "gudang_id" && form.posisi === "Supervisor" || field.key === "tipe" && mode === "edit" && record?.dapat_ubah_tipe === false}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400 disabled:opacity-60 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Pilih {field.label.toLowerCase()}</option>
                    {(field.options || []).map((opt) => {
                      const optValue = typeof opt === "string" ? opt : String((opt as any).value);
                      const optLabel = typeof opt === "string" ? opt : (opt as any).label;
                      return (
                        <option key={optValue} value={optValue}>
                          {optLabel}
                        </option>
                      );
                    })}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    value={String(form[field.key] ?? "")}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                  />
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={String(form[field.key] ?? "")}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={mode === "edit" && tab === "clusters" && field.key === "cluster_id"}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400 disabled:opacity-60 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Batal
          </button>

          <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-60">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {mode === "create" ? "Simpan" : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirm Modal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  open,
  onClose,
  tabLabel,
  endpoint,
  record,
  idField,
  idFields,
  onSuccess,
  onShowToast,
}: {
  open: boolean;
  onClose: () => void;
  tabLabel: string;
  endpoint: string;
  record: GenericRecord | null;
  idField?: string;
  idFields?: string[];
  onSuccess: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}) {
  const { del } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPersonnel = tabLabel.toLowerCase() === "personil";
  const isActivePersonnel = isPersonnel && Boolean((record as any)?.is_aktif ?? (record as any)?.status_aktif ?? true);

  async function handleDelete() {
    if (!record) return;

    if (isActivePersonnel) {
      onShowToast("Gagal menghapus! Personil harus dinonaktifkan terlebih dahulu di Halaman Operasional.", "error");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const candidates = idFields && idFields.length > 0 ? idFields : [idField || "id"];
      const rawId = candidates.map((field) => record?.[field]).find((value) => value !== undefined && value !== null && value !== "");
      const validId = rawId !== undefined && rawId !== null && rawId !== "" ? String(rawId) : null;

      console.log(`[DeleteConfirmModal] tab=${tabLabel} endpoint=${endpoint} record keys=${Object.keys(record || {})} candidates=${candidates.join(",")} rawId=${rawId} validId=${validId}`);

      if (!validId) {
        throw new Error(`ID tidak valid untuk ${tabLabel.toLowerCase()}.`);
      }

      const url = new URL(`${endpoint}/${encodeURIComponent(validId)}`, baseUrl).toString();

      const response = await del(url);

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || `Gagal menghapus ${tabLabel.toLowerCase()}.`);
      }

      onSuccess();
      onShowToast(`${tabLabel} berhasil dihapus.`, "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(msg);
      onShowToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Hapus ${tabLabel}`} widthClass="max-w-sm">
      {isActivePersonnel ? (
        <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">Personil masih aktif! Harap nonaktifkan terlebih dahulu di Halaman Operasional sebelum menghapus.</div>
      ) : (
        <p className="text-sm text-slate-600">Yakin ingin menghapus ? Tindakan ini tidak dapat dibatalkan.</p>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Batal
        </button>

        <button onClick={handleDelete} disabled={submitting || isActivePersonnel} className="flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Hapus
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Nonaktif Confirm Modal
// ---------------------------------------------------------------------------

function NonaktifConfirmModal({
  open,
  onClose,
  record,
  onSuccess,
  onShowToast,
}: {
  open: boolean;
  onClose: () => void;
  record: GenericRecord | null;
  onSuccess: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}) {
  const { put } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!record) return;

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const personilId = record.personil_id ?? record.id;
      const url = new URL(`/api/personnels/${personilId}`, baseUrl).toString();

      const response = await put(url, { is_aktif: false });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Gagal menonaktifkan personil.");
      }

      onSuccess();
      onShowToast("Personil berhasil dinonaktifkan.", "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(msg);
      onShowToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nonaktifkan Personil" widthClass="max-w-sm">
      <p className="text-sm text-slate-600">
        Nonaktifkan personil <span className="font-semibold text-slate-800">{record ? String(record.nama || record.id) : ""}</span>?
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Batal
        </button>

        <button onClick={handleConfirm} disabled={submitting} className="flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Nonaktifkan
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Aktif Confirm Modal
// ---------------------------------------------------------------------------

function AktifConfirmModal({ open, onClose, record, onSuccess, onShowToast }: { open: boolean; onClose: () => void; record: GenericRecord | null; onSuccess: () => void; onShowToast: (message: string, type: "success" | "error") => void }) {
  const { put } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!record) return;

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const personilId = record.personil_id ?? record.id;
      const url = new URL(`/api/personnels/${personilId}`, baseUrl).toString();

      const response = await put(url, { is_aktif: true });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Gagal mengaktifkan kembali personil.");
      }

      onSuccess();
      onShowToast("Personil berhasil diaktifkan kembali.", "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(msg);
      onShowToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Aktifkan Kembali Personil" widthClass="max-w-sm">
      <p className="text-sm text-slate-600">
        Aktifkan kembali personil <span className="font-semibold text-slate-800">{record ? String(record.nama || record.id) : ""}</span>?
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Batal
        </button>

        <button onClick={handleConfirm} disabled={submitting} className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Aktifkan
        </button>
      </div>
    </Modal>
   );
}

// ---------------------------------------------------------------------------
// Supplier Nonaktif Confirm Modal
// ---------------------------------------------------------------------------

function SupplierNonaktifModal({
  open,
  onClose,
  record,
  onSuccess,
  onShowToast,
}: {
  open: boolean;
  onClose: () => void;
  record: GenericRecord | null;
  onSuccess: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}) {
  const { put } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!record) return;

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const supplierKode = record.kode ?? record.id;
      const url = new URL(`/api/suppliers/${supplierKode}`, baseUrl).toString();

      const response = await put(url, { is_aktif: false });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Gagal menonaktifkan supplier.");
      }

      onSuccess();
      onShowToast("Supplier berhasil dinonaktifkan.", "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(msg);
      onShowToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nonaktifkan Supplier" widthClass="max-w-sm">
      <p className="text-sm text-slate-600">
        Nonaktifkan supplier <span className="font-semibold text-slate-800">{record ? String(record.nama || record.id) : ""}</span>?
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Batal
        </button>

        <button onClick={handleConfirm} disabled={submitting} className="flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Nonaktifkan
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Supplier Aktif Confirm Modal
// ---------------------------------------------------------------------------

function SupplierAktifModal({
  open,
  onClose,
  record,
  onSuccess,
  onShowToast,
}: {
  open: boolean;
  onClose: () => void;
  record: GenericRecord | null;
  onSuccess: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}) {
  const { put } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!record) return;

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const supplierKode = record.kode ?? record.id;
      const url = new URL(`/api/suppliers/${supplierKode}`, baseUrl).toString();

      const response = await put(url, { is_aktif: true });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Gagal mengaktifkan kembali supplier.");
      }

      onSuccess();
      onShowToast("Supplier berhasil diaktifkan kembali.", "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(msg);
      onShowToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Aktifkan Kembali Supplier" widthClass="max-w-sm">
      <p className="text-sm text-slate-600">
        Aktifkan kembali supplier <span className="font-semibold text-slate-800">{record ? String(record.nama || record.id) : ""}</span>?
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Batal
        </button>

        <button onClick={handleConfirm} disabled={submitting} className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Aktifkan
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Project Nonaktif Confirm Modal
// ---------------------------------------------------------------------------

function ProjectNonaktifModal({
  open,
  onClose,
  record,
  onSuccess,
  onShowToast,
}: {
  open: boolean;
  onClose: () => void;
  record: GenericRecord | null;
  onSuccess: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}) {
  const { put } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!record) return;

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const projectId = record.project_id ?? record.id;
      const url = new URL(`/api/projects/${projectId}/nonaktifkan`, baseUrl).toString();

      const response = await put(url, {});

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Gagal menonaktifkan project.");
      }

      onSuccess();
      onShowToast("Project berhasil dinonaktifkan.", "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(msg);
      onShowToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nonaktifkan Project" widthClass="max-w-sm">
      <p className="text-sm text-slate-600">
        Nonaktifkan project <span className="font-semibold text-slate-800">{record ? String(record.nama_project || record.title || record.id) : ""}</span>?
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Batal
        </button>

        <button onClick={handleConfirm} disabled={submitting} className="flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Nonaktifkan
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Project Aktif Confirm Modal
// ---------------------------------------------------------------------------

function ProjectAktifModal({
  open,
  onClose,
  record,
  onSuccess,
  onShowToast,
}: {
  open: boolean;
  onClose: () => void;
  record: GenericRecord | null;
  onSuccess: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}) {
  const { put } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!record) return;

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const projectId = record.project_id ?? record.id;
      const url = new URL(`/api/projects/${projectId}/restore`, baseUrl).toString();

      const response = await put(url, {});

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Gagal mengaktifkan kembali project.");
      }

      onSuccess();
      onShowToast("Project berhasil diaktifkan kembali.", "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(msg);
      onShowToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Aktifkan Kembali Project" widthClass="max-w-sm">
      <p className="text-sm text-slate-600">
        Aktifkan kembali project <span className="font-semibold text-slate-800">{record ? String(record.nama_project || record.title || record.id) : ""}</span>?
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Batal
        </button>

        <button onClick={handleConfirm} disabled={submitting} className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Aktifkan
        </button>
      </div>
    </Modal>
  );
}

function ClusterNonaktifModal({
  open,
  onClose,
  record,
  onSuccess,
  onShowToast,
}: {
  open: boolean;
  onClose: () => void;
  record: GenericRecord | null;
  onSuccess: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}) {
  const { patch } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!record) return;

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const clusterId = record.cluster_id ?? record.id;
      const url = new URL(`/api/clusters/${clusterId}/toggle-status`, baseUrl).toString();

      const response = await patch(url, {});

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Gagal menonaktifkan cluster.");
      }

      onSuccess();
      onShowToast("Cluster berhasil dinonaktifkan.", "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(msg);
      onShowToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nonaktifkan Cluster" widthClass="max-w-sm">
      <p className="text-sm text-slate-600">
        Nonaktifkan cluster <span className="font-semibold text-slate-800">{record ? String(record.nama_cluster || record.cluster_id || record.id) : ""}</span>?
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Batal
        </button>

        <button onClick={handleConfirm} disabled={submitting} className="flex items-center gap-2 rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Nonaktifkan
        </button>
      </div>
    </Modal>
  );
}

function ClusterAktifModal({
  open,
  onClose,
  record,
  onSuccess,
  onShowToast,
}: {
  open: boolean;
  onClose: () => void;
  record: GenericRecord | null;
  onSuccess: () => void;
  onShowToast: (message: string, type: "success" | "error") => void;
}) {
  const { patch } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!record) return;

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const clusterId = record.cluster_id ?? record.id;
      const url = new URL(`/api/clusters/${clusterId}/toggle-status`, baseUrl).toString();

      const response = await patch(url, {});

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Gagal mengaktifkan cluster.");
      }

      onSuccess();
      onShowToast("Cluster berhasil diaktifkan kembali.", "success");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setError(msg);
      onShowToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Aktifkan Kembali Cluster" widthClass="max-w-sm">
      <p className="text-sm text-slate-600">
        Aktifkan kembali cluster <span className="font-semibold text-slate-800">{record ? String(record.nama_cluster || record.cluster_id || record.id) : ""}</span>?
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Batal
        </button>

        <button onClick={handleConfirm} disabled={submitting} className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Aktifkan
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Content
// ---------------------------------------------------------------------------

function MasterDataPageContent() {
  const router = useRouter();
  const { get } = useApi();
  const { logout, user } = useAuth();

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [activeTab, setActiveTab] = useState<MasterDataType>("items");

  const [data, setData] = useState<GenericRecord[]>([]);

  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: ITEMS_PER_PAGE,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const [posisiFilter, setPosisiFilter] = useState("");
  const [gudangFilter, setGudangFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tipeFilter, setTipeFilter] = useState("");
  const [gudangStatusFilter, setGudangStatusFilter] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("");
  const [satuanFilter, setSatuanFilter] = useState("");
  const [jenisKendaraanFilter, setJenisKendaraanFilter] = useState("");
  const [kendaraanGudangFilter, setKendaraanGudangFilter] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] = useState("");
  const [clusterProjectFilter, setClusterProjectFilter] = useState("");
  const [supplierStatusFilter, setSupplierStatusFilter] = useState("");
  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [unitOptions, setUnitOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [projectOptions, setProjectOptions] = useState<Array<{ value: number; label: string }>>([]);

  // Modal state
  const [formModal, setFormModal] = useState<{
    mode: "create" | "edit";
    record: GenericRecord | null;
  } | null>(null);
  const [detailRecord, setDetailRecord] = useState<GenericRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<GenericRecord | null>(null);
  const [nonaktifRecord, setNonaktifRecord] = useState<GenericRecord | null>(null);
  const [aktifRecord, setAktifRecord] = useState<GenericRecord | null>(null);
  const [supplierNonaktifRecord, setSupplierNonaktifRecord] = useState<GenericRecord | null>(null);
  const [supplierAktifRecord, setSupplierAktifRecord] = useState<GenericRecord | null>(null);
  const [projectNonaktifRecord, setProjectNonaktifRecord] = useState<GenericRecord | null>(null);
  const [projectAktifRecord, setProjectAktifRecord] = useState<GenericRecord | null>(null);
  const [clusterNonaktifRecord, setClusterNonaktifRecord] = useState<GenericRecord | null>(null);
  const [clusterAktifRecord, setClusterAktifRecord] = useState<GenericRecord | null>(null);

  // -------------------------------------------------------------------------
  // Toast state
  // -------------------------------------------------------------------------

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    get(new URL("/api/warehouses", baseUrl).toString())
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        setWarehouseOptions(list.map((w: any) => ({ value: Number(w.gudang_id), label: w.nama_gudang })));
      })
      .catch(() => setWarehouseOptions([]));
  }, [get]);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    get(new URL("/api/categories", baseUrl).toString())
      .then((res) => res.json())
      .then((result) => {
        const list = Array.isArray(result?.data?.data) ? result.data.data : Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
        setCategoryOptions(list.map((cat: any) => ({ value: Number(cat.kategori_id), label: cat.nama_kategori })));
      })
      .catch(() => setCategoryOptions([]));
  }, [get]);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    get(new URL("/api/units", baseUrl).toString())
      .then((res) => res.json())
      .then((result) => {
        const list = Array.isArray(result?.data?.data) ? result.data.data : Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
        setUnitOptions(list.map((u: any) => ({ value: Number(u.satuan_id), label: u.kode_satuan })));
      })
      .catch(() => setUnitOptions([]));
  }, [get]);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    get(new URL("/api/projects", baseUrl).toString())
      .then((res) => res.json())
      .then((result) => {
        const list = Array.isArray(result?.data?.data) ? result.data.data : Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
        setProjectOptions(list.map((p: any) => ({ value: Number(p.project_id), label: p.nama_project || p.title || `Project ${p.project_id}` })));
      })
      .catch(() => setProjectOptions([]));
  }, [get]);

  // -------------------------------------------------------------------------
  // Active tab config & permissions
  // -------------------------------------------------------------------------

  const activeConfig = MASTER_DATA_TABS.find((tab) => tab.key === activeTab);

  const permissions = TAB_PERMISSIONS[activeTab];
  const role = mapRole(user?.role);

  const canCreate = permissions.create.includes(role);
  const canEdit = permissions.edit.includes(role);
  const canDelete = permissions.delete.includes(role);

  const columns = useMemo(() => {
    switch (activeTab) {
      case "items":
        return ["kode_perangkat", "nama_barang", "kategori", "satuan_default", "foto"];
      case "projects":
        return ["project_id", "title", "nama_project", "kecamatan", "desa_kelurahan", "cluster_count", "status_aktif"];
      case "personnel":
        return ["nama", "email", "nik", "posisi", "no_hp", "gudang", "bisa_menyetir", "is_aktif", "foto"];
      case "vehicles":
        return ["kendaraan_id", "jenis_kendaraan", "merk", "no_polisi", "gudang", "foto"];
      case "warehouses":
        return ["nama_gudang", "alamat", "tipe", "is_aktif"];
      case "suppliers":
        return ["kode", "nama", "deskripsi", "is_aktif"];
      case "clusters":
        return ["nama_project", "nama_cluster", "cluster_id", "cluster_type", "alamat_lengkap", "homepass_plan", "status_aktif"];
      default:
        return ["id"];
    }
  }, [activeTab]);

  function getColumnLabel(column: string) {
    const labels: Record<string, string> = {
      kode_perangkat: "Kode",
      nama_barang: "Nama Barang",
      kategori: "Kategori",
      satuan_default: "Satuan",
      project_id: "ID Project",
      title: "Judul",
      nama_project: "Nama Project",
      kecamatan: "Kecamatan",
      desa_kelurahan: "Desa/Kelurahan",
      status_aktif: "Status",
      personil_id: "ID Personnel",
      nama: "Nama",
      posisi: "Jabatan",
      no_hp: "Telepon",
      email: "Email",
      nik: "NIK",
      bisa_menyetir: "Punya SIM",
      gudang: "Gudang Asal",
      kendaraan_id: "ID Kendaraan",
      jenis_kendaraan: "Tipe",
      merk: "Merk",
      no_polisi: "No. Polisi",
      nama_gudang: "Nama Gudang",
      alamat: "Alamat",
      tipe: "Tipe",
      is_aktif: "Status",
      foto: "Foto",
      kode: "Kode",
deskripsi: "Deskripsi",
      nama_cluster: "Nama Cluster",
      cluster_id: "Cluster ID",
      cluster_type: "Tipe Cluster",
      alamat_lengkap: "alamat_lengkap",
      homepass_plan: "Homepass Plan",
      cluster_count: "Jumlah Cluster",
    };

    return labels[column] || column;
  }

  // -------------------------------------------------------------------------
  // Fetch master data
  // -------------------------------------------------------------------------

  const fetchMasterData = useCallback(async () => {
    const config = MASTER_DATA_TABS.find((tab) => tab.key === activeTab);

    if (!config) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const url = new URL(config.endpoint, baseUrl);

      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(ITEMS_PER_PAGE));

      const trimmedSearch = search.trim();

      if (trimmedSearch) {
        url.searchParams.set("search", trimmedSearch);
      }

      if (activeTab === "personnel") {
        if (posisiFilter) url.searchParams.set("posisi", posisiFilter);
        if (gudangFilter) url.searchParams.set("gudang_id", gudangFilter);
        if (statusFilter) url.searchParams.set("is_aktif", statusFilter);
      }

      if (activeTab === "warehouses") {
        if (tipeFilter) url.searchParams.set("tipe", tipeFilter);
        if (gudangStatusFilter) url.searchParams.set("is_aktif", gudangStatusFilter);
      }

      if (activeTab === "items") {
        if (kategoriFilter) url.searchParams.set("kategori_id", kategoriFilter);
        if (satuanFilter) url.searchParams.set("satuan_default_id", satuanFilter);
      }

      if (activeTab === "vehicles") {
        if (jenisKendaraanFilter) url.searchParams.set("jenis_kendaraan", jenisKendaraanFilter);
        if (kendaraanGudangFilter) url.searchParams.set("gudang_id", kendaraanGudangFilter);
      }

      if (activeTab === "projects") {
        if (projectStatusFilter) url.searchParams.set("status_aktif", projectStatusFilter);
      }

      if (activeTab === "clusters") {
        if (clusterProjectFilter) url.searchParams.set("project_id", clusterProjectFilter);
      }

      if (activeTab === "suppliers") {
        if (supplierStatusFilter) url.searchParams.set("is_aktif", supplierStatusFilter);
      }

      const response = await get(url.toString());
      const result = await response.json();

      if (!response.ok) {
        const message = result?.message || `Gagal mengambil data ${config.label}.`;
        const lowerMessage = String(message).toLowerCase();

        if (lowerMessage.includes("jwt") || lowerMessage.includes("expired") || lowerMessage.includes("unauthorized") || lowerMessage.includes("token") || lowerMessage.includes("session")) {
          logout();
          router.replace("/");
          throw new Error("Sesi berakhir. Silakan login kembali.");
        }

        throw new Error(message);
      }

      const payload = result?.data;

      let dataArr: GenericRecord[] = [];

      if (Array.isArray(payload)) {
        dataArr = payload;
      } else if (Array.isArray(payload?.data)) {
        dataArr = payload.data;
      }

      const metaObj: PaginationMeta = payload?.meta || {
        total: dataArr.length,
        page,
        limit: ITEMS_PER_PAGE,
        totalPages: Math.max(1, Math.ceil(dataArr.length / ITEMS_PER_PAGE)),
      };

      setData(dataArr);
      setMeta({
        total: Number(metaObj.total ?? dataArr.length),
        page: Number(metaObj.page ?? page),
        limit: Number(metaObj.limit ?? ITEMS_PER_PAGE),
        totalPages: Number(metaObj.totalPages ?? Math.max(1, Math.ceil(dataArr.length / ITEMS_PER_PAGE))),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengambil data.");

      setData([]);

      setMeta({
        total: 0,
        page: 1,
        limit: ITEMS_PER_PAGE,
        totalPages: 1,
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search, posisiFilter, gudangFilter, statusFilter, tipeFilter, gudangStatusFilter, kategoriFilter, satuanFilter, jenisKendaraanFilter, kendaraanGudangFilter, projectStatusFilter, clusterProjectFilter, supplierStatusFilter]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // -------------------------------------------------------------------------
  // Change tab
  // -------------------------------------------------------------------------

  function handleTabChange(type: MasterDataType) {
    setActiveTab(type);
    setPage(1);
    setSearch("");
    setSearchInput("");
    setPosisiFilter("");
    setGudangFilter("");
    setStatusFilter("");
    setTipeFilter("");
    setGudangStatusFilter("");
    setKategoriFilter("");
    setSatuanFilter("");
    setJenisKendaraanFilter("");
    setKendaraanGudangFilter("");
    setProjectStatusFilter("");
    setClusterProjectFilter("");
    setSupplierStatusFilter("");
    setError(null);
  }

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div>
      <div className="flex flex-1 flex-col p-6">
        {/* Header */}

        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Master Data</h1>
            <p className="mt-1 text-sm text-slate-500 line-clamp-2 md:line-clamp-none">Kelola dan pantau seluruh data utama dalam sistem warehouse.</p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex w-full md:w-80 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <Search size={16} className="shrink-0 text-slate-400" />

            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`Cari ${activeConfig?.label.toLowerCase()}...`}
              className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </form>
        </header>

        {/* Tabs */}

        <div className="mb-5 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MASTER_DATA_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={["flex shrink-0 whitespace-nowrap min-h-10 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all", active ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"].join(" ")}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Action Row */}

<div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">{activeConfig?.label}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{meta.total} data</p>
          </div>

            {canCreate && activeTab !== "personnel" && (
              <button
                type="button"
                onClick={() => setFormModal({ mode: "create", record: null })}
                className="flex shrink-0 min-h-10 items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-colors hover:bg-orange-600"
              >
                <Plus size={16} />
                Tambah
              </button>
            )}
          </div>

        {activeTab === "personnel" && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              value={posisiFilter}
              onChange={(e) => { setPosisiFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Posisi</option>
              <option value="Supervisor">Supervisor</option>
              <option value="Staf Gudang">Staf Gudang</option>
            </select>

            <select
              value={gudangFilter}
              onChange={(e) => { setGudangFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Gudang</option>
              {warehouseOptions.map((w) => (
                <option key={w.value} value={String(w.value)}>{w.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="col-span-2 sm:col-auto w-full sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Tidak Aktif</option>
            </select>
          </div>
        )}

        {activeTab === "warehouses" && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              value={tipeFilter}
              onChange={(e) => { setTipeFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Tipe</option>
              <option value="tetap">Tetap</option>
              <option value="transit">Transit</option>
            </select>

            <select
              value={gudangStatusFilter}
              onChange={(e) => { setGudangStatusFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
        )}

        {activeTab === "items" && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              value={kategoriFilter}
              onChange={(e) => { setKategoriFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Kategori</option>
              {categoryOptions.map((cat) => (
                <option key={cat.value} value={String(cat.value)}>{cat.label}</option>
              ))}
            </select>

            <select
              value={satuanFilter}
              onChange={(e) => { setSatuanFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Satuan</option>
              {unitOptions.map((u) => (
                <option key={u.value} value={String(u.value)}>{u.label}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === "vehicles" && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              value={jenisKendaraanFilter}
              onChange={(e) => { setJenisKendaraanFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Jenis Kendaraan</option>
              <option value="truk">Truk</option>
              <option value="pickup">Pickup</option>
              <option value="van">Van</option>
              <option value="motor">Motor</option>
              <option value="lainnya">Lainnya</option>
            </select>

            <select
              value={kendaraanGudangFilter}
              onChange={(e) => { setKendaraanGudangFilter(e.target.value); setPage(1); }}
              className="w-full sm:w-auto rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Gudang</option>
              {warehouseOptions.map((w) => (
                <option key={w.value} value={String(w.value)}>{w.label}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === "projects" && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={projectStatusFilter}
              onChange={(e) => { setProjectStatusFilter(e.target.value); setPage(1); }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
        )}

        {activeTab === "clusters" && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={clusterProjectFilter}
              onChange={(e) => { setClusterProjectFilter(e.target.value); setPage(1); }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Project</option>
              {projectOptions.map((p) => (
                <option key={p.value} value={String(p.value)}>{p.label}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === "suppliers" && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={supplierStatusFilter}
              onChange={(e) => { setSupplierStatusFilter(e.target.value); setPage(1); }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
            >
              <option value="">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>
        )}

        {/* Table */}

        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {columns.map((column) => (
                    <th key={column} className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {getColumnLabel(column)}
                    </th>
                  ))}

                  <th className="px-2 py-2 whitespace-nowrap text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 7 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: columns.length + 1 }).map((_, colIndex) => (
                        <td key={colIndex} className="px-3 py-3">
                          <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-3 py-16 text-center text-sm text-rose-500">
                      {error}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-3 py-16 text-center text-sm text-slate-400">
                      Tidak ada data {activeConfig?.label.toLowerCase()}.
                    </td>
                  </tr>
                ) : (
                   data.map((record, index) => {
                     const item = record as Item;

                      const idFields = activeConfig?.idFields || [activeConfig?.idField || "id"];
                     const rawId = idFields.map((field) => (record as any)?.[field]).find((value) => value !== undefined && value !== null && value !== "");
                     const basePrimaryKey = rawId !== undefined && rawId !== null && rawId !== "" ? String(rawId) : String((record as any)?.id ?? `record-${index}`);
                     const primaryKey = `${basePrimaryKey}-${index}`;

                     return (
                       <tr key={primaryKey} onClick={() => setDetailRecord(record)} className="group cursor-pointer transition-colors hover:bg-slate-50">
                         {columns.map((column) => {
                           let value = record[column];

                           if (column === "cluster_count") {
                             const count = (record as any)?._count?.clusters;
                             return (
                               <td key={column} className="px-3 py-3 text-sm font-semibold text-slate-800">
                                 {count !== undefined ? count : "-"}
                               </td>
                             );
                           }

                           if (column === "status_aktif" || column === "is_aktif") {
                            const active = Boolean(value);

                            return (
                              <td key={column} className="px-3 py-3">
                                <span className={["inline-flex rounded-full px-3 py-1 text-xs font-semibold", active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"].join(" ")}>{active ? "Aktif" : "Tidak Aktif"}</span>
                              </td>
                            );
                          }

                           if (column === "foto") {
                             const photoUrl = String(value || "");

                             return (
                               <td key={column} className="px-3 py-3">
                                 {photoUrl ? (
                                   <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                                     <img
                                       src={photoUrl}
                                       alt="Foto"
                                       className="h-full w-full object-contain"
                                       onError={(e) => {
                                         const img = e.target as HTMLImageElement;
                                         img.style.display = "none";
                                         const placeholder = img.nextElementSibling as HTMLDivElement | null;
                                         if (placeholder) {
                                           placeholder.classList.remove("hidden");
                                           placeholder.classList.add("flex");
                                         }
                                       }}
                                     />
                                     <div className="hidden absolute inset-0 items-center justify-center text-slate-300">
                                       <ImageOff size={16} />
                                     </div>
                                   </div>
                                 ) : (
                                   <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                                     <ImageOff size={16} />
                                   </div>
                                 )}
                               </td>
                             );
                           }

                           if (column === "bisa_menyetir") {
                             return (
                               <td key={column} className="px-3 py-3 text-sm text-slate-600">
                                 {value === true ? "Ya" : "Tidak"}
                               </td>
                             );
                           }

                           if (column === "tipe" && activeTab === "warehouses") {
                             const tipeVal = String(value || "").toLowerCase();
                             const isDadakan = tipeVal === "dadakan";

                             return (
                               <td key={column} className="px-3 py-3">
                                 <span className={["inline-flex rounded-full px-3 py-1 text-xs font-semibold", isDadakan ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"].join(" ")}>
                                   {isDadakan ? "Dadakan" : (value ? formatValue(value) : "-")}
                                 </span>
                               </td>
                             );
                           }

                            if (column === "gudang") {
                             const gudangNama = (record as any)?.gudang?.nama_gudang;
                             return (
                               <td key={column} className="px-6 py-4 text-sm text-slate-600">
                                 {gudangNama || "-"}
                               </td>
                             );
                           }

                            if (column === "nama_project" && activeTab === "clusters") {
                              const projectName = (record as any)?.project?.nama_project || "-";

                              return (
                                <td key={column} className="px-3 py-3 text-sm font-medium text-slate-800">
                                  {projectName}
                                </td>
                              );
                            }

                            if (column === "alamat_lengkap" && activeTab === "clusters") {
                              const alamat = (record as any)?.alamat_lengkap || "-";

                              return (
                                <td key={column} className="px-3 py-3 text-sm text-slate-500 max-w-[220px] truncate" title={String(alamat)}>
                                  {alamat}
                                </td>
                              );
                            }

                            if (column === "homepass_plan" && activeTab === "clusters") {
                              const raw = (record as any)?.homepass_plan;
                              const display = raw === null || raw === undefined || raw === "" ? "-" : Number(raw).toLocaleString("id-ID");

                              return (
                                <td key={column} className="px-3 py-3 text-sm text-slate-600 text-right tabular-nums">
                                  {display}
                                </td>
                              );
                            }

                           if (column === "kategori" || column === "satuan_default") {
                            const label = column === "kategori" ? item.kategori?.nama_kategori : item.satuan_default?.kode_satuan;

                            return (
                              <td key={column} className="px-3 py-3 text-sm text-slate-600">
                                {label || "-"}
                              </td>
                            );
                          }

                            return (
                              <td
                                key={column}
                                className={[
                                  "px-3 py-3",
                                  column === "kode_perangkat" || column === "kode" || column === "project_id" || column === "personil_id" || column === "kendaraan_id" ? "font-semibold text-orange-500" : "text-slate-500",
                                  column === "nama_barang" || column === "nama" || column === "nama_project" || column === "jenis_kendaraan" || column === "nama_gudang" ? "font-medium text-slate-800" : "",
                                  column === "email" || column === "nik" ? "truncate max-w-[150px]" : "",
                                ].join(" ")}
                              >
                                {formatValue(value)}
                              </td>
                            );
                        })}

                        {/* Aksi */}
                        <td className="px-2 py-2 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailRecord(record);
                              }}
                              title="Lihat detail"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Eye size={15} />
                            </button>

                            {canEdit && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormModal({ mode: "edit", record });
                                }}
                                title="Edit"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-orange-600"
                              >
                                <Pencil size={15} />
                              </button>
                            )}

                            {activeTab === "personnel" &&
                              (() => {
                                const rawStatus = (record as any).status || "";
                                const isActive = (record as any).is_active === true || (record as any).is_aktif === true || rawStatus.toLowerCase() === "aktif";

                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isActive) {
                                        setDeleteRecord(record);
                                      }
                                    }}
                                    title={isActive ? "Nonaktifkan personil di Halaman Operasional sebelum menghapus" : "Hapus permanen"}
                                    disabled={isActive}
                                    className={`rounded-lg p-1.5 transition-colors ${isActive ? "text-slate-300 opacity-30 cursor-not-allowed" : "text-red-500 cursor-pointer hover:bg-rose-50 hover:text-red-700"}`}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                );
                              })()}

                            {activeTab !== "personnel" && activeTab !== "suppliers" && canDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteRecord(record);
                                }}
                                title="Hapus"
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}

                            {activeTab === "suppliers" && canDelete && (() => {
                              const isActive = Boolean((record as any).is_aktif ?? true);

                              return (
                                <>
                                  {isActive && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSupplierNonaktifRecord(record);
                                      }}
                                      title="Nonaktifkan"
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                                    >
                                      <Ban size={15} />
                                    </button>
                                  )}
                                  {!isActive && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSupplierAktifRecord(record);
                                      }}
                                      title="Aktifkan"
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                                    >
                                      <RotateCcw size={15} />
                                    </button>
                                  )}
                                </>
                              );
                            })()}

                             {activeTab === "projects" && canDelete && (() => {
                               const isActive = Boolean((record as any).status_aktif ?? true);

                               return (
                                 <>
                                   {isActive && (
                                     <button
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setProjectNonaktifRecord(record);
                                       }}
                                       title="Nonaktifkan"
                                       className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                                     >
                                       <Ban size={15} />
                                     </button>
                                   )}
                                   {!isActive && (
                                     <button
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setProjectAktifRecord(record);
                                       }}
                                       title="Aktifkan"
                                       className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                                     >
                                       <RotateCcw size={15} />
                                     </button>
                                   )}
                                 </>
                               );
                             })()}

                             {activeTab === "clusters" && canDelete && (() => {
                               const isActive = Boolean((record as any).status_aktif ?? true);

                               return (
                                 <>
                                   {isActive && (
                                     <button
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setClusterNonaktifRecord(record);
                                       }}
                                       title="Nonaktifkan"
                                       className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                                     >
                                       <Ban size={15} />
                                     </button>
                                   )}
                                   {!isActive && (
                                     <button
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setClusterAktifRecord(record);
                                       }}
                                       title="Aktifkan"
                                       className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                                     >
                                       <RotateCcw size={15} />
                                     </button>
                                   )}
                                 </>
                               );
                             })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}

          {!loading && !error && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-slate-400">
                Menampilkan{" "}
                <span className="font-medium text-slate-700">
                  {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)}
                </span>{" "}
                dari <span className="font-medium text-slate-700">{meta.total}</span> {activeConfig?.label.toLowerCase()}
              </p>

              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                onPageChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 0 });
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}

      {activeConfig && (
        <>
          <DetailModal open={!!detailRecord} onClose={() => setDetailRecord(null)} tab={activeTab} tabLabel={activeConfig.singularLabel} record={detailRecord} />

          <FormModal
            open={!!formModal}
            onClose={() => setFormModal(null)}
            mode={formModal?.mode ?? "create"}
            tab={activeTab}
            tabLabel={activeConfig.singularLabel}
            endpoint={activeConfig.endpoint}
            record={formModal?.record ?? null}
            onSuccess={fetchMasterData}
            onShowToast={showToast}
          />

          <DeleteConfirmModal
            open={!!deleteRecord}
            onClose={() => setDeleteRecord(null)}
            tabLabel={activeConfig.singularLabel}
            endpoint={activeTab === "clusters" ? "/api/clusters" : activeConfig.endpoint}
            record={deleteRecord}
            idField={activeConfig.idField}
            idFields={activeConfig.idFields}
            onSuccess={fetchMasterData}
            onShowToast={showToast}
          />

          <NonaktifConfirmModal open={!!nonaktifRecord} onClose={() => setNonaktifRecord(null)} record={nonaktifRecord} onSuccess={fetchMasterData} onShowToast={showToast} />

          <AktifConfirmModal open={!!aktifRecord} onClose={() => setAktifRecord(null)} record={aktifRecord} onSuccess={fetchMasterData} onShowToast={showToast} />

          <SupplierNonaktifModal open={!!supplierNonaktifRecord} onClose={() => setSupplierNonaktifRecord(null)} record={supplierNonaktifRecord} onSuccess={fetchMasterData} onShowToast={showToast} />

          <SupplierAktifModal open={!!supplierAktifRecord} onClose={() => setSupplierAktifRecord(null)} record={supplierAktifRecord} onSuccess={fetchMasterData} onShowToast={showToast} />

           <ProjectNonaktifModal open={!!projectNonaktifRecord} onClose={() => setProjectNonaktifRecord(null)} record={projectNonaktifRecord} onSuccess={fetchMasterData} onShowToast={showToast} />

           <ProjectAktifModal open={!!projectAktifRecord} onClose={() => setProjectAktifRecord(null)} record={projectAktifRecord} onSuccess={fetchMasterData} onShowToast={showToast} />

           <ClusterNonaktifModal open={!!clusterNonaktifRecord} onClose={() => setClusterNonaktifRecord(null)} record={clusterNonaktifRecord} onSuccess={fetchMasterData} onShowToast={showToast} />

           <ClusterAktifModal open={!!clusterAktifRecord} onClose={() => setClusterAktifRecord(null)} record={clusterAktifRecord} onSuccess={fetchMasterData} onShowToast={showToast} />
         </>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={[
            "fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-medium shadow-2xl backdrop-blur-sm animate-in slide-in-from-right-full fade-in duration-300 max-w-sm",
            toast.type === "success" ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-800" : "border-rose-200/80 bg-rose-50/95 text-rose-800",
          ].join(" ")}
        >
          <div className={["flex h-8 w-8 shrink-0 items-center justify-center rounded-full", toast.type === "success" ? "bg-emerald-100" : "bg-rose-100"].join(" ")}>
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
            className={["ml-2 shrink-0 rounded-full p-1 transition-colors", toast.type === "success" ? "text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600" : "text-rose-400 hover:bg-rose-100 hover:text-rose-600"].join(" ")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function MasterDataPage() {
  // Komponen ProtectedRoute sekarang ada di layout,
  // jadi tidak perlu lagi di sini.
  return <MasterDataPageContent />;
}
