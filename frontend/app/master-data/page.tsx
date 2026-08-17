"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Package,
  FolderKanban,
  Truck,
  Warehouse as WarehouseIcon,
  Eye,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  ImageOff,
} from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import Image from "next/image";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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

type MasterDataType =
  | "items"
  | "projects"
  | "personnel"
  | "vehicles"
  | "warehouses";

interface MasterDataTab {
  key: MasterDataType;
  label: string;
  singularLabel: string;
  endpoint: string;
  icon: React.ElementType;
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
  options?: string[];
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
  },
  {
    key: "projects",
    label: "Project",
    singularLabel: "Project",
    endpoint: "/api/projects",
    icon: FolderKanban,
  },
  {
    key: "personnel",
    label: "Personil",
    singularLabel: "Personil",
    endpoint: "/api/personnels",
    icon: Users,
  },
  {
    key: "vehicles",
    label: "Kendaraan",
    singularLabel: "Kendaraan",
    endpoint: "/api/vehicles",
    icon: Truck,
  },
  {
    key: "warehouses",
    label: "Gudang",
    singularLabel: "Gudang",
    endpoint: "/api/warehouses",
    icon: WarehouseIcon,
  },
];

// Kategori barang sesuai PRD 7.1
const ITEM_CATEGORIES = [
  "Server",
  "Networking",
  "Endpoint/Laptop",
  "Storage",
  "Power/UPS",
  "Kabel & Aksesoris",
];

const TAB_PERMISSIONS: Record<
  MasterDataType,
  { create: string[]; edit: string[]; delete: string[] }
> = {
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
    delete: [ROLE.ADMIN],
  },
  personnel: {
    create: [ROLE.ADMIN, ROLE.SUPERVISOR],
    edit: [ROLE.ADMIN, ROLE.SUPERVISOR],
    delete: [ROLE.ADMIN],
  },
  vehicles: {
    create: [ROLE.ADMIN, ROLE.SUPERVISOR],
    edit: [ROLE.ADMIN, ROLE.SUPERVISOR],
    delete: [ROLE.ADMIN],
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
    { key: "foto", label: "Foto Barang", type: "file" },
  ],
  projects: [
    { key: "nama_project", label: "Nama Project", type: "text", required: true },
    { key: "title", label: "Judul", type: "text" },
    { key: "cluster_id", label: "Cluster ID", type: "text" },
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
    { key: "posisi", label: "Jabatan", type: "text" },
    { key: "no_hp", label: "Telepon", type: "text" },
    { key: "nik", label: "NIK", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "bisa_menyetir", label: "Bisa Menyetir", type: "checkbox" },
    { key: "is_material_handler", label: "Material Handler", type: "checkbox" },
    { key: "foto", label: "Foto Personil", type: "file" },
  ],
  vehicles: [
    { key: "jenis_kendaraan", label: "Jenis Kendaraan", type: "text", required: true },
    { key: "merk", label: "Merk", type: "text" },
    { key: "no_polisi", label: "No. Polisi", type: "text", required: true },
    { key: "kapasitas_angkut", label: "Kapasitas Angkut (kg)", type: "text" },
    { key: "keterangan", label: "Keterangan", type: "textarea" },
    { key: "foto", label: "Foto Kendaraan", type: "file" },
  ],
  warehouses: [
    { key: "nama_gudang", label: "Nama Gudang", type: "text", required: true },
    { key: "tipe", label: "Tipe", type: "text" },
    { key: "alamat", label: "Alamat", type: "textarea" },
    { key: "latitude", label: "Latitude", type: "text" },
    { key: "longitude", label: "Longitude", type: "text" },
    { key: "keterangan", label: "Keterangan", type: "textarea" },
    { key: "is_aktif", label: "Status Aktif", type: "checkbox" },
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
  };
  for (const key of candidates[tab]) {
    if (record[key]) return String(record[key]);
  }
  return String(record.id ?? "");
}

const PHOTO_FIELD_NAMES = [
  "photo",
  "photoUrl",
  "image",
  "imageUrl",
  "picture",
  "pictureUrl",
  "foto",
  "fotoUrl",
  "gambar",
  "gambarUrl",
];

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

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
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
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
      >
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
            className={[
              "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              page === p
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100",
            ].join(" ")}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic Modal shell
// ---------------------------------------------------------------------------

function Modal({
  open,
  onClose,
  title,
  subtitle,
  widthClass = "max-w-lg",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  widthClass?: string;
  children: React.ReactNode;
}) {
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
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

function DetailModal({
  open,
  onClose,
  tab,
  tabLabel,
  record,
}: {
  open: boolean;
  onClose: () => void;
  tab: MasterDataType;
  tabLabel: string;
  record: GenericRecord | null;
}) {
  if (!record) return null;

  const fields = TAB_FIELDS[tab];
  const hasAudit = (record as any)?.created_at || (record as any)?.updated_at || record.createdAt || record.updatedAt;
  const showPhoto = tab !== "projects";
  const primaryPhoto = showPhoto ? getPhotoUrl(record) : null;
  const additionalPhotos = showPhoto ? getAdditionalPhotos(record) : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Detail ${tabLabel}`}
      subtitle={getRecordTitle(tab, record)}
    >
      {primaryPhoto && (
        <div className="mb-5 flex justify-center">
          <img
            src={primaryPhoto}
            alt={tabLabel}
            className="max-h-56 max-w-full rounded-2xl border border-slate-100 object-contain"
          />
        </div>
      )}

      <dl className="divide-y divide-slate-50">
        {fields.map((field) => {
          if (field.key === "photo") {
            const photoUrl = getPhotoUrl(record);

            return (
              <div key={field.key} className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-xs font-medium text-slate-400">{field.label}</dt>
                <dd className="text-right text-sm font-medium text-slate-800">
                  {photoUrl ? (
                    <span className="text-slate-700">Ada foto</span>
                  ) : (
                    <span className="text-slate-400">Tidak ada foto</span>
                  )}
                </dd>
              </div>
            );
          }

          return (
            <div key={field.key} className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-xs font-medium text-slate-400">{field.label}</dt>
              <dd className="text-right text-sm font-medium text-slate-800">
                {field.type === "checkbox"
                  ? formatValue(Boolean(record[field.key]))
                  : formatValue(record[field.key])}
              </dd>
            </div>
          );
        })}
      </dl>

      {additionalPhotos.length > 1 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Foto Tambahan
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {additionalPhotos.slice(1).map((photo, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-slate-100"
              >
                <img
                  src={photo.url}
                  alt={photo.label}
                  className="h-32 w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {hasAudit && (
        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Riwayat Perubahan
          </p>
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
        <button
          onClick={onClose}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
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
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  tab: MasterDataType;
  tabLabel: string;
  endpoint: string;
  record: GenericRecord | null;
  onSuccess: () => void;
}) {
  const { post, put } = useApi();
  const fields = TAB_FIELDS[tab];

  const buildInitialForm = useCallback(() => {
    const initial: Record<string, unknown> = {};
    fields.forEach((field) => {
      if (field.type === "checkbox") {
        initial[field.key] = record ? Boolean(record[field.key]) : true;
      } else if (field.type === "file") {
        if (mode === "edit") {
          const existingUrl = getPhotoUrl(record);
          initial[field.key] = existingUrl || "";
        } else {
          initial[field.key] = "";
        }
      } else {
        initial[field.key] = record?.[field.key] ?? "";
      }
    });
    return initial;
  }, [fields, record, mode]);

  const [form, setForm] = useState<Record<string, unknown>>(buildInitialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm());
      setError(null);
    }
  }, [open, buildInitialForm]);

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

    const missing = fields.find(
      (f) => f.required && !String(form[f.key] ?? "").trim()
    );

    if (missing) {
      setError(`${missing.label} wajib diisi.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const submitData: Record<string, unknown> = { ...form };

      for (const field of fields) {
        if (field.type === "file") {
          const currentValue = submitData[field.key];

          if (currentValue instanceof File) {
            const photoUrl = await uploadFile(currentValue);
            submitData[field.key] = photoUrl;
          } else if (mode === "edit" && !currentValue) {
            const originalUrl = record?.[field.key];
            if (typeof originalUrl === "string" && originalUrl) {
              submitData[field.key] = originalUrl;
            }
          }
        }
      }

      let url: string;
      if (tab === "items") {
        const itemCode = (record as Item | null)?.kode_perangkat;
        url =
          mode === "create"
            ? new URL(endpoint, baseUrl).toString()
            : new URL(`${endpoint}/${encodeURIComponent(String(itemCode))}`, baseUrl).toString();
      } else if (tab === "personnel") {
        const personnelId = (record as { personil_id?: string | number } | null)?.personil_id;
        url =
          mode === "create"
            ? new URL(endpoint, baseUrl).toString()
            : new URL(`${endpoint}/${encodeURIComponent(String(personnelId))}`, baseUrl).toString();
      } else if (tab === "vehicles") {
        const vehicleNoPolisi = (record as { no_polisi?: string } | null)?.no_polisi;
        url =
          mode === "create"
            ? new URL(endpoint, baseUrl).toString()
            : new URL(`${endpoint}/${encodeURIComponent(String(vehicleNoPolisi))}`, baseUrl).toString();
      } else if (tab === "projects") {
        const projectId = (record as { project_id?: string | number } | null)?.project_id;
        url =
          mode === "create"
            ? new URL(endpoint, baseUrl).toString()
            : new URL(`${endpoint}/${encodeURIComponent(String(projectId))}`, baseUrl).toString();
      } else if (tab === "warehouses") {
        const warehouseName = (record as { nama_gudang?: string } | null)?.nama_gudang;
        url =
          mode === "create"
            ? new URL(endpoint, baseUrl).toString()
            : new URL(`${endpoint}/${encodeURIComponent(String(warehouseName))}`, baseUrl).toString();
      } else {
        url =
          mode === "create"
            ? new URL(endpoint, baseUrl).toString()
            : new URL(`${endpoint}/${encodeURIComponent(String(record?.id))}`, baseUrl).toString();
      }

      const response =
        mode === "create" ? await post(url, submitData) : await put(url, submitData);

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          result?.message ||
            `Gagal ${mode === "create" ? "menambah" : "menyimpan"} ${tabLabel.toLowerCase()}.`
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan tak terduga."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? `Tambah ${tabLabel}` : `Edit ${tabLabel}`}
      subtitle={mode === "edit" ? getRecordTitle(tab, record) : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            {field.type === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form[field.key])}
                  onChange={(e) => handleChange(field.key, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
                {field.label}
              </label>
            ) : field.type === "file" ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  {field.label}
                </label>

                {mode === "edit" && typeof form[field.key] === "string" && form[field.key] ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                        <img
                          src={String(form[field.key])}
                          alt="Preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="text-xs text-slate-500">
                        <p className="font-medium text-slate-700">Foto saat ini</p>
                        <p>Klik ganti foto untuk mengubah</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleChange(field.key, null)}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Ganti Foto
                    </button>

                    {form[field.key] instanceof File && (
                      <p className="text-[11px] text-slate-400">
                        File terpilih: {(form[field.key] as File).name}
                      </p>
                    )}
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
                    {form[field.key] instanceof File && (
                      <p className="text-[11px] text-slate-400">
                        File terpilih: {(form[field.key] as File).name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  {field.label}
                  {field.required && <span className="text-rose-500"> *</span>}
                </label>

                {field.type === "select" ? (
                  <select
                    value={String(form[field.key] ?? "")}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                  >
                    <option value="">Pilih {field.label.toLowerCase()}</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
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
          <button
            type="button"
            onClick={onClose}
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
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  tabLabel: string;
  endpoint: string;
  record: GenericRecord | null;
  onSuccess: () => void;
}) {
  const { del } = useApi();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!record) return;

    setSubmitting(true);
    setError(null);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const url = new URL(`${endpoint}/${record.id}`, baseUrl).toString();

      const response = await del(url);

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          result?.message || `Gagal menghapus ${tabLabel.toLowerCase()}.`
        );
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan tak terduga."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Hapus ${tabLabel}`} widthClass="max-w-sm">
      <p className="text-sm text-slate-600">
        Yakin ingin menghapus{" "}
        <span className="font-semibold text-slate-800">
          {record ? getRecordTitle("items", record) : ""}
        </span>
        ? Tindakan ini tidak dapat dibatalkan.
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Batal
        </button>

        <button
          onClick={handleDelete}
          disabled={submitting}
          className="flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Hapus
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

  // Modal state
  const [formModal, setFormModal] = useState<{
    mode: "create" | "edit";
    record: GenericRecord | null;
  } | null>(null);
  const [detailRecord, setDetailRecord] = useState<GenericRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<GenericRecord | null>(null);

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
        return ["kode_perangkat", "nama_barang", "foto"];
      case "projects":
        return ["project_id", "title", "nama_project", "kecamatan", "desa_kelurahan", "status_aktif"];
      case "personnel":
        return ["personil_id", "nama", "posisi", "no_hp", "foto"];
      case "vehicles":
        return ["kendaraan_id", "jenis_kendaraan", "merk", "no_polisi", "foto"];
      case "warehouses":
        return ["nama_gudang", "alamat", "tipe", "is_aktif"];
      default:
        return ["id"];
    }
  }, [activeTab]);

  function getColumnLabel(column: string) {
    const labels: Record<string, string> = {
      kode_perangkat: "Kode",
      nama_barang: "Nama Barang",
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
      kendaraan_id: "ID Kendaraan",
      jenis_kendaraan: "Tipe",
      merk: "Merk",
      no_polisi: "No. Polisi",
      nama_gudang: "Nama Gudang",
      alamat: "Alamat",
      tipe: "Tipe",
      is_aktif: "Status",
      foto: "Foto",
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
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const url = new URL(config.endpoint, baseUrl);

      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(ITEMS_PER_PAGE));

      const trimmedSearch = search.trim();

      if (trimmedSearch) {
        url.searchParams.set("search", trimmedSearch);
      }

      const response = await get(url.toString());
      const result = await response.json();

      if (!response.ok) {
        const message = result?.message || `Gagal mengambil data ${config.label}.`;
        const lowerMessage = String(message).toLowerCase();

        if (
          lowerMessage.includes("jwt") ||
          lowerMessage.includes("expired") ||
          lowerMessage.includes("unauthorized") ||
          lowerMessage.includes("token") ||
          lowerMessage.includes("session")
        ) {
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

      const metaObj: PaginationMeta =
        payload?.meta || {
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
        totalPages: Number(
          metaObj.totalPages ??
            Math.max(1, Math.ceil(dataArr.length / ITEMS_PER_PAGE))
        ),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat mengambil data."
      );

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
  }, [activeTab, page, search]);

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
    <div className={`${plusJakartaSans.className}`}>
      <div className="flex flex-1 flex-col p-6">
        {/* Header */}

        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Master Data</h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelola dan pantau seluruh data utama dalam sistem warehouse.
            </p>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex w-80 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm"
          >
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

        <div className="mb-5 flex items-center gap-2 overflow-x-auto">
          {MASTER_DATA_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={[
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Action Row */}

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              {activeConfig?.label}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{meta.total} data</p>
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => setFormModal({ mode: "create", record: null })}
              className="flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition-colors hover:bg-orange-600"
            >
              <Plus size={16} />
              Tambah
            </button>
          )}
        </div>

        {/* Table */}

        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                    >
                      {getColumnLabel(column)}
                    </th>
                  ))}

                  <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 7 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: columns.length + 1 }).map((_, colIndex) => (
                        <td key={colIndex} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-6 py-16 text-center text-sm text-rose-500">
                      {error}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-6 py-16 text-center text-sm text-slate-400">
                      Tidak ada data {activeConfig?.label.toLowerCase()}.
                    </td>
                  </tr>
                ) : (
                  data.map((record) => {
                    const item = record as Item;

                    const primaryKey =
                      activeTab === "projects"
                        ? (record as any)?.project_id
                        : activeTab === "personnel"
                        ? (record as any)?.personil_id
                        : activeTab === "vehicles"
                        ? (record as any)?.kendaraan_id
                        : activeTab === "warehouses"
                        ? (record as any)?.gudang_id
                        : activeTab === "items"
                        ? (record as any)?.barang_id
                        : record.id;

                    return (
                      <tr
                        key={String(primaryKey ?? record.id ?? Math.random())}
                        onClick={() => setDetailRecord(record)}
                        className="group cursor-pointer transition-colors hover:bg-slate-50"
                      >
                        {columns.map((column) => {
                          let value = record[column];

                          if (column === "status_aktif" || column === "is_aktif") {
                            const active = Boolean(value);

                            return (
                              <td key={column} className="px-6 py-4">
                                <span
                                  className={[
                                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                                    active
                                      ? "bg-emerald-50 text-emerald-600"
                                      : "bg-slate-100 text-slate-500",
                                  ].join(" ")}
                                >
                                  {active ? "Aktif" : "Tidak Aktif"}
                                </span>
                              </td>
                            );
                          }

                          if (column === "foto") {
                            const photoUrl = String(value || "");

                            return (
                              <td key={column} className="px-6 py-4">
                                {photoUrl ? (
                                  <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                                    <img
                                      src={photoUrl}
                                      alt="Foto"
                                      className="h-full w-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                        (e.target as HTMLImageElement).nextElementSibling?.dispatchEvent(new Event("show-placeholder"));
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

                          return (
                            <td
                              key={column}
                              className={[
                                "px-6 py-4",
                                column === "kode_perangkat" || column === "project_id" || column === "personil_id" || column === "kendaraan_id"
                                  ? "font-semibold text-orange-500"
                                  : "text-slate-500",
                                column === "nama_barang" || column === "nama_project" || column === "nama" || column === "jenis_kendaraan" || column === "nama_gudang"
                                  ? "font-medium text-slate-800"
                                  : "",
                              ].join(" ")}
                            >
                              {formatValue(value)}
                            </td>
                          );
                        })}

                        {/* Aksi */}
                        <td className="px-4 py-4">
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

                            {canDelete && (
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
                  {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1}
                  –{Math.min(meta.page * meta.limit, meta.total)}
                </span>{" "}
                dari <span className="font-medium text-slate-700">{meta.total}</span>{" "}
                {activeConfig?.label.toLowerCase()}
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
          <DetailModal
            open={!!detailRecord}
            onClose={() => setDetailRecord(null)}
            tab={activeTab}
            tabLabel={activeConfig.singularLabel}
            record={detailRecord}
          />

          <FormModal
            open={!!formModal}
            onClose={() => setFormModal(null)}
            mode={formModal?.mode ?? "create"}
            tab={activeTab}
            tabLabel={activeConfig.singularLabel}
            endpoint={activeConfig.endpoint}
            record={formModal?.record ?? null}
            onSuccess={fetchMasterData}
          />

          <DeleteConfirmModal
            open={!!deleteRecord}
            onClose={() => setDeleteRecord(null)}
            tabLabel={activeConfig.singularLabel}
            endpoint={activeConfig.endpoint}
            record={deleteRecord}
            onSuccess={fetchMasterData}
          />
        </>
      )}
    </div>
  );
}

export default function MasterDataPage() {
  // Komponen ProtectedRoute sekarang ada di layout,
  // jadi tidak perlu lagi di sini.
  return <MasterDataPageContent />;
}