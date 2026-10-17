"use client";

import { useState, useCallback, useEffect, useMemo, Fragment, useRef } from "react";
import {
  Search,
  ChevronDown,
  FileClock,
  PackageSearch,
  BarChart3,
  Eye,
  X,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  PackageCheck,
  ArrowDownToLine,
  ArrowUpRight,
  XCircle,
  Upload,
  Download,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useApi } from "@/lib/api";
import { humanizeKey, humanizeValue, VALUE_LABELS, getAksiLabel, getRoleLabel, ENTITY_TYPE_LABELS, formatIp, formatUserAgent } from "@/lib/audit-labels";
import { KondisiBadge } from "@/components/common/KondisiBadge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const statusColor: Record<string, { fg: string; bg: string }> = {
  draft_diajukan: { fg: "#6B7280", bg: "#F3F4F6" },
  menunggu_verifikasi: { fg: "#92400E", bg: "#FEF3C7" },
  ready_putaway: { fg: "#1E40AF", bg: "#DBEAFE" },
  disetujui: { fg: "#1E7A4C", bg: "#E4F5EC" },
  digenerate: { fg: "#6B7280", bg: "#F3F4F6" },
  tiba_menunggu_konfirmasi: { fg: "#1E40AF", bg: "#DBEAFE" },
  diterima_didistribusikan: { fg: "#2E9E6D", bg: "#E4F5EC" },
  sedang_dikirim: { fg: "#92400E", bg: "#FEF3C7" },
  ditolak: { fg: "#991B1B", bg: "#FEE2E2" },
};

type BadgeVariant = "green" | "blue" | "red" | "purple" | "orange" | "gray" | "outline-green" | "outline-blue" | "outline-red" | "outline-purple" | "outline-orange" | "outline-gray";

const badgeStyles: Record<BadgeVariant, string> = {
  green: "bg-emerald-50 text-emerald-700",
  blue: "bg-blue-50 text-blue-700",
  red: "bg-rose-50 text-rose-700",
  purple: "bg-purple-50 text-purple-700",
  orange: "bg-orange-50 text-orange-700",
  gray: "bg-slate-100 text-slate-700",
  "outline-green": "bg-transparent border border-emerald-200 text-emerald-700",
  "outline-blue": "bg-transparent border border-blue-200 text-blue-700",
  "outline-red": "bg-transparent border border-rose-200 text-rose-700",
  "outline-purple": "bg-transparent border border-purple-200 text-purple-700",
  "outline-orange": "bg-transparent border border-orange-200 text-orange-700",
  "outline-gray": "bg-transparent border border-slate-200 text-slate-600",
};

function Badge({ label, icon: Icon, variant = "gray", className }: { label: string; icon?: React.ComponentType<{ size?: number; className?: string }>; variant?: BadgeVariant; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${badgeStyles[variant]} ${className || ""}`}>
      {Icon && <Icon size={14} />}
      {label}
    </span>
  );
}

interface AuditLogEntry {
  audit_id: number | string;
  created_at: string;
  actor_nama: string | null;
  actor_role: string | null;
  aksi: string;
  entity_type?: string;
  entity_id?: string | number;
  entity_name?: string | null;
  entity_refs_resolved?: Record<string, string | null>;
  data_sebelum?: Record<string, unknown>;
  data_sesudah?: Record<string, unknown>;
  details?: Array<{
    detail_id: number | string;
    kode_tiket: string;
    mos?: number | string;
    remains_lapangan?: number | string;
    used: number | string;
    status: string;
    reason?: string | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface StockHistoryEntry {
  ledger_id: number | string;
  waktu_mutasi: string;
  jenis_mutasi: string;
  kode_tiket: string;
  tipe_surat_jalan: string;
  status_surat_jalan: string;
  diproses_oleh: string;
  diproses_oleh_role?: string;
  kode_perangkat: string;
  nama_barang: string;
  qty: number;
  satuan: string;
  zona_kode: string;
  zona_gudang: string;
  gudang_asal: string;
  gudang_tujuan: string;
  lapangan_tujuan?: string | null;
  nomor_surat_jalan?: string;
  return_transaction_id?: string | number | null;
  kondisi?: string;
  is_kelebihan?: boolean;
  saldo_setelah?: number;
  project_nama?: string;
  area?: string;
  zona_nama?: string;
  zona_tipe?: string;
  asal_label?: string | null;
  asal_tipe?: string | null;
  is_putaway?: boolean;
  [key: string]: unknown;
}

interface ReconciliationUploadLogEntry {
  upload_id: number | string;
  uploaded_at: string;
  filename: string;
  uploaded_by_nama: string;
  uploaded_by_role: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  details?: Array<{
    detail_id: number | string;
    kode_tiket?: string;
    mos?: string;
    remains_lapangan?: string;
    used?: string;
    status?: string;
    alasan_gagal?: string;
    reason?: string;
    kondisi?: string | null;
    nama_barang?: string | null;
    kode_barang?: string | null;
    project_nama?: string | null;
    tanggal_laporan?: string | null;
    pic_mitra?: string | null;
    catatan?: string | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

function Modal({ open, onClose, title, children, className }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleKey);
    }
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center sm:p-0"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl ${className || ""} sm:max-w-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 id="modal-title" className="text-base font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
function TabAuditLog({ get }: { get: (url: string) => Promise<Response> }) {
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [aksi, setAksi] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailRow, setDetailRow] = useState<AuditLogEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);
  const limit = 20;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const validasiRentangTanggal = useCallback(() => {
    if (startDate && endDate && endDate < startDate) {
      setDateError("Tanggal akhir tidak boleh lebih awal dari tanggal mulai.");
      return false;
    }
    setDateError("");
    return true;
  }, [startDate, endDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDetailRow(null);
    if (!validasiRentangTanggal()) {
      setLoading(false);
      setData([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      if (actorRole) params.set("actorRole", actorRole);
      if (aksi) params.set("action", aksi);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await get(`${API_BASE}/api/reports/audit-log?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengambil audit log.");
      }

      const rows = Array.isArray(json?.data?.data) ? json.data.data : [];
      setData(rows);
      setTotal(json?.data?.meta?.total || 0);
      setTotalPages(json?.data?.meta?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [get, q, actorRole, aksi, startDate, endDate, page, validasiRentangTanggal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportAuditLog = async () => {
    if (!validasiRentangTanggal()) return;
    setExporting(true);
    setToast(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      if (actorRole) params.set("actorRole", actorRole);
      if (aksi) params.set("action", aksi);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await get(`${API_BASE}/api/reports/audit-log/export?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || "Gagal mengekspor audit log.");
      }

      const truncated = res.headers.get("X-Export-Truncated") === "true";
      const truncatedMessage = res.headers.get("X-Export-Truncated-Message");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Audit-Log-Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      if (truncated && truncatedMessage) {
        setToast({ message: truncatedMessage, type: "warning" });
      } else {
        setToast({ message: "Audit Log berhasil diekspor.", type: "success" });
      }
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal mengekspor Audit Log.", type: "error" });
    } finally {
      setExporting(false);
    }
  };

  const aksiList = ["create", "update", "delete", "approve", "receive_inbound", "approve_inbound", "approve_outbound", "confirm_distributed", "reject_inbound", "reject_outbound", "putaway", "retrieve", "create_inbound", "create_outbound", "nonaktifkan_project", "aktifkan_project", "soft_delete", "restore", "start_delivery", "input_rekonsiliasi", "login_success", "login_failed", "reset_link_created", "report_arrival", "tiba_di_transit", "lanjut_dari_transit", "cancel_draft"];

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const day = d.getDate();
    const mon = months[d.getMonth()];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${mon}, ${hh}:${mm}`;
  };

  const LOGIN_ACTIONS = new Set(["login_success", "login_failed", "reset_link_created"]);

  function getDetailSectionTitle(aksi: string, kind: "sebelum" | "sesudah"): string {
    if (LOGIN_ACTIONS.has(aksi)) {
      if (aksi === "reset_link_created") return "Detail Reset Link";
      return "Detail Login";
    }
    return kind === "sebelum" ? "Data Sebelum" : "Data Sesudah";
  }

  const getEntityLabel = (row: AuditLogEntry): string => {
    const kode = row.data_sesudah?.kode_tiket || row.data_sebelum?.kode_tiket;
    if (kode) return String(kode);

    if (row.entity_name) {
      const label = ENTITY_TYPE_LABELS[row.entity_type || ""] || row.entity_type || "Entitas";
      return `${label}: ${row.entity_name}`;
    }

    if (row.entity_type === "user_account" && (!row.entity_id || String(row.entity_id) === "0")) {
      return "Akun tidak dikenal";
    }

    if (row.entity_type === "reconciliation") {
      return "Rekonsiliasi";
    }

    const snapshot = row.data_sesudah || row.data_sebelum || {};
    const fallbackName =
      (row.entity_type === "item" && (snapshot.nama_barang || snapshot.kode_perangkat)) ||
      (row.entity_type === "project" && snapshot.nama_project) ||
      (row.entity_type === "personil" && snapshot.nama) ||
      (row.entity_type === "vehicle" && (snapshot.no_polisi || snapshot.jenis_kendaraan)) ||
      (row.entity_type === "supplier" && (snapshot.nama || snapshot.kode)) ||
      (row.entity_type === "warehouse" && snapshot.nama_gudang) ||
      (row.entity_type === "cluster" && (snapshot.nama_cluster || snapshot.cluster_id)) ||
      null;

    if (fallbackName) {
      const label = ENTITY_TYPE_LABELS[row.entity_type || ""] || row.entity_type || "Entitas";
      return `${label}: ${fallbackName}`;
    }

    if (row.entity_type && row.entity_id && String(row.entity_id) !== "0") {
      const label = ENTITY_TYPE_LABELS[row.entity_type || ""] || row.entity_type;
      return `${label} #${row.entity_id} (data mungkin telah dihapus)`;
    }

    return ENTITY_TYPE_LABELS[row.entity_type || ""] || row.entity_type || "-";
  };

  const getExtraRef = (row: AuditLogEntry) => {
    const ds = row.data_sesudah || {};
    const parts: string[] = [];
    const getString = (obj: Record<string, unknown>, key: string): string | undefined =>
      typeof obj[key] === "string" ? (obj[key] as string) : undefined;

    if (getString(ds, "source_file") || getString(ds, "filename") || getString(ds, "nama_file")) {
      parts.push(getString(ds, "source_file") || getString(ds, "filename") || getString(ds, "nama_file") || "");
    }
    if (getString(ds, "username_target") || getString(ds, "target_user") || getString(ds, "user_target")) {
      parts.push(`user: ${getString(ds, "username_target") || getString(ds, "target_user") || getString(ds, "user_target") || ""}`);
    }
    const catatan = getString(ds, "catatan");
    if (catatan) {
      parts.push(catatan);
    }
    return parts.length > 0 ? parts.join(" | ") : "—";
  };

  const HIDDEN_AUDIT_FIELDS = new Set([
    "foto",
    "foto_url",
    "foto_path",
    "kategori_id",
    "wajib_sn",
  ]);

  const renderStructuredData = (
    label: string,
    data: Record<string, unknown>,
    resolvedRefs: Record<string, string | null> = {},
    aksi?: string
  ) => {
    if (!data || typeof data !== "object") {
      return <p className="text-sm text-slate-500">-</p>;
    }

    const entries = Object.entries(data).filter(([k, v]) => {
      if (v === null || v === undefined || v === "") return false;
      if (HIDDEN_AUDIT_FIELDS.has(k)) return false;
      return true;
    });

    const isLoginAction = aksi && LOGIN_ACTIONS.has(aksi);

    const loginOrder: Record<string, number> = { email: 1, reason: 2, ip: 3, userAgent: 4, user_agent: 4 };
    entries.sort((a, b) => {
      const oa = isLoginAction ? loginOrder[a[0]] : 0;
      const ob = isLoginAction ? loginOrder[b[0]] : 0;
      if (oa && ob) return oa - ob;
      if (oa) return -1;
      if (ob) return 1;
      return 0;
    });

    if (entries.length === 0) {
      return <p className="text-sm text-slate-500">-</p>;
    }

    const idRefKeys = new Set([
      "tiket_id",
      "surat_jalan_id",
      "gudang_asal_id",
      "gudang_tujuan_id",
      "project_id",
      "boq_id",
      "zona_id",
      "barang_id",
      "surat_jalan_item_id",
      "created_by",
      "updated_by",
      "kategori_id",
      "satuan_default_id",
      "gudang_id",
      "personil_id",
      "kendaraan_id",
      "supplier_id",
      "user_id",
      "pic_id",
    ]);

    const renderValue = (key: string, value: unknown): React.ReactNode => {
      if (idRefKeys.has(key)) {
        const resolved = resolvedRefs[key];
        if (resolved === null || resolved === undefined) {
          return "-";
        }
        return resolved;
      }

      if (key === "ip" || key === "ipAddress") {
        return <span className="text-xs font-semibold text-slate-800 text-right break-all">{formatIp(value as string)}</span>;
      }

      if (key === "userAgent" || key === "user_agent") {
        const ua = formatUserAgent(value as string);
        return (
          <span className="text-xs font-semibold text-slate-800 text-right break-all" title={ua.title}>
            {ua.text}
          </span>
        );
      }

      if (Array.isArray(value)) {
        if (value.length === 0) return "-";
        const allPrimitives = value.every((item) => item === null || item === undefined || typeof item !== "object");
        if (allPrimitives) {
          return humanizeValue(key, value);
        }
        return (
          <div className="mt-1 space-y-1">
            {value.map((item, idx) => {
              if (item === null || item === undefined) return null;
              if (typeof item === "object") {
                return (
                  <div key={idx} className="rounded bg-slate-100 px-2 py-1">
                    {renderStructuredData(`${key}[${idx}]`, item as Record<string, unknown>, resolvedRefs)}
                  </div>
                );
              }
              return (
                <span key={idx} className="text-xs text-slate-700">
                  {humanizeValue(key, item)}
                </span>
              );
            })}
          </div>
        );
      }

      if (typeof value === "object" && value !== null) {
        return renderStructuredData(key, value as Record<string, unknown>, resolvedRefs);
      }

      return humanizeValue(key, value);
    };

    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => {
          const displayKey = humanizeKey(key);
          const displayValue = renderValue(key, value);
          return (
            <div key={key} className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-500">{displayKey}</span>
              <span className="text-xs font-semibold text-slate-800 text-right break-all">{displayValue as string}</span>
            </div>
          );
        })}
      </div>
    );
};

  // Mobile card component for Audit Log
  function AuditLogCard({ row, onClick }: { row: AuditLogEntry; onClick: () => void }) {
    const extraRef = getExtraRef(row);
    const actorNama = row.actor_nama ?? (row.aksi === "login_failed" ? "Tidak dikenal" : "—");
    const actorRole = row.actor_role ?? (row.aksi === "login_failed" ? "Tidak dikenal" : "—");
    const roleLabel = getRoleLabel(actorRole);
    const roleBadge = actorRole ? (
      <Badge label={roleLabel} variant="outline-gray" className="whitespace-nowrap shrink-0" />
    ) : null;
    return (
      <div
        className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge label={getAksiLabel(row.aksi)} variant="gray" className="whitespace-nowrap shrink-0" />
              {roleBadge}
            </div>
            <p className="mt-1 font-mono font-semibold text-orange-500 truncate" title={getEntityLabel(row)}>
              {getEntityLabel(row)}
            </p>
          </div>
          <div className="shrink-0">
            <p className="font-mono text-xs text-slate-400 text-right whitespace-nowrap">
              {formatDateTime(row.created_at)}
            </p>
          </div>
        </div>

        <div className="mt-2 min-w-0">
          <p className="text-xs font-medium text-slate-400">Pengguna</p>
          <p className="font-semibold text-slate-900 truncate" title={actorNama}>
            {actorNama}
          </p>
        </div>

        {extraRef !== "—" && (
          <div className="mt-2 min-w-0">
            <p className="text-xs font-medium text-slate-400">Referensi</p>
            <p className="font-mono text-xs text-slate-500 truncate" title={extraRef}>
              {extraRef}
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label="Lihat detail"
          >
            <Eye size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Mobile card list (< md)
  if (loading) {
    return (
      <div className="md:hidden space-y-3" role="status" aria-label="Memuat audit log">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-full mb-2" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-3 bg-slate-200 rounded" />
              <div className="h-3 bg-slate-200 rounded" />
              <div className="h-3 bg-slate-200 rounded" />
              <div className="h-3 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="md:hidden rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-rose-500">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="md:hidden rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-400">Tidak ada entri audit yang cocok dengan filter ini.</p>
      </div>
    );
  }

  // Mobile cards
  const mobileCards = (
    <div className="md:hidden space-y-3" role="list" aria-label="Audit log">
      {data.map((r) => (
        <AuditLogCard key={r.audit_id} row={r} onClick={() => setDetailRow(r)} />
      ))}
    </div>
  );
  // Desktop table (md+)
  const desktopTable = (
    <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1260px] table-fixed text-left text-sm border-separate border-spacing-0">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="w-[160px] min-w-[160px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Waktu</th>
              <th className="w-[180px] min-w-[180px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pengguna</th>
              <th className="w-[140px] min-w-[140px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Peran</th>
              <th className="w-[160px] min-w-[160px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Aksi</th>
              <th className="w-[280px] min-w-[280px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Entitas Terkait</th>
              <th className="w-[300px] min-w-[300px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Referensi Tambahan</th>
              <th className="w-16 min-w-16 px-3 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((r) => {
              const extraRef = getExtraRef(r);
              return (
                <tr
                  key={r.audit_id}
                  className="group cursor-pointer transition-colors hover:bg-slate-50 min-h-16"
                  onClick={() => setDetailRow(r)}
                >
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400 overflow-hidden">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="px-6 py-4 min-w-0 overflow-hidden truncate" title={r.actor_nama ?? (r.aksi === "login_failed" ? "Tidak dikenal" : "—")}>
                    <div className="font-semibold text-slate-900 truncate">{r.actor_nama ?? (r.aksi === "login_failed" ? "Tidak dikenal" : "—")}</div>
                  </td>
                  <td className="px-6 py-4 overflow-hidden">
                    {r.actor_role ? (
                      <Badge label={getRoleLabel(r.actor_role)} variant="outline-gray" className="whitespace-nowrap shrink-0" />
                    ) : (
                      <span className="text-xs text-slate-500 whitespace-nowrap">Tidak dikenal</span>
                    )}
                  </td>
                  <td className="px-6 py-4 overflow-hidden">
                    <Badge label={getAksiLabel(r.aksi)} variant="gray" className="whitespace-nowrap shrink-0" />
                  </td>
                  <td className="px-6 py-4 min-w-0 overflow-hidden">
                    <Badge label={getEntityLabel(r)} variant="gray" className="whitespace-nowrap shrink-0" />
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 min-w-0 overflow-hidden truncate">
                    {extraRef !== "—" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono whitespace-nowrap shrink-0">
                        {extraRef}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <button
                      type="button"
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}
                      aria-label="Lihat detail audit log"
                      title="Lihat detail"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-slate-400">Pencarian</label>
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium text-slate-400">Rentang Tanggal Dari</label>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} max={endDate || undefined} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium text-slate-400">Sampai</label>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} min={startDate || undefined} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="min-w-[150px]">
          <label className="mb-1 block text-xs font-medium text-slate-400">Role</label>
          <select value={actorRole} onChange={(e) => { setActorRole(e.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Semua Role</option>
            {Object.keys(VALUE_LABELS.user_role).map((k) => (
              <option key={k} value={k}>{getRoleLabel(k)}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[120px]">
          <label className="mb-1 block text-xs font-medium text-slate-400">Aksi</label>
          <select value={aksi} onChange={(e) => { setAksi(e.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Semua</option>
            {aksiList.map((a) => <option key={a} value={a}>{getAksiLabel(a)}</option>)}
          </select>
        </div>
        <button type="button" onClick={() => { setQ(""); setActorRole(""); setAksi(""); setStartDate(""); setEndDate(""); setDateError(""); setPage(1); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Reset</button>
        <button type="button" onClick={handleExportAuditLog} disabled={exporting} className="rounded-lg bg-[#E8632C] text-white px-4 py-2 text-sm disabled:opacity-50">
          {exporting ? "Mengekspor..." : "Ekspor"}
        </button>
      </div>
      {dateError && (
        <div className="mb-2 p-2 rounded bg-red-50 border border-red-100 text-red-700 text-xs">
          {dateError}
        </div>
      )}
      {mobileCards}
      {desktopTable}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            Menampilkan {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} dari {total} entri
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="rounded-full border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              Sebelumnya
            </button>
            <span className="font-mono">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="rounded-full border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      <Modal
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        title="Detail Audit Log"
      >
        {detailRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-400">Waktu</p>
                <p className="text-sm font-semibold text-slate-800">{formatDateTime(detailRow.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Pengguna</p>
                <p className="text-sm font-semibold text-slate-800">{detailRow.actor_nama ?? (detailRow.aksi === "login_failed" ? "Tidak dikenal" : "—")}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Peran</p>
                <p className="text-sm text-slate-800">
                  {detailRow.actor_role ? getRoleLabel(detailRow.actor_role) : (detailRow.aksi === "login_failed" ? "Tidak dikenal" : "—")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Aksi</p>
                <p className="text-sm text-slate-800">
                  {getAksiLabel(detailRow.aksi)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Entitas Terkait</p>
                <p className="text-sm text-slate-800">{getEntityLabel(detailRow)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Referensi Tambahan</p>
                <p className="text-sm text-slate-800">{getExtraRef(detailRow)}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-400 mb-2">Detail Data</p>
              {detailRow.data_sebelum || detailRow.data_sesudah ? (
                <div className="space-y-4">
                  {detailRow.data_sebelum && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 mb-2">
                        {getDetailSectionTitle(detailRow.aksi, "sebelum")}
                      </p>
                      {renderStructuredData("Sebelum", detailRow.data_sebelum, detailRow.entity_refs_resolved, detailRow.aksi)}
                    </div>
                  )}
                  {detailRow.data_sesudah && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 mb-2">
                        {getDetailSectionTitle(detailRow.aksi, "sesudah")}
                      </p>
                      {renderStructuredData("Sesudah", detailRow.data_sesudah, detailRow.entity_refs_resolved, detailRow.aksi)}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Tidak ada detail tambahan untuk entri ini.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TabRiwayatStok({ get }: { get: (url: string) => Promise<Response> }) {
  const [data, setData] = useState<StockHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gudang, setGudang] = useState("");
  const [zona, setZona] = useState("");
  const [project, setProject] = useState("");
  const [kategori, setKategori] = useState("");
  const [jenis, setJenis] = useState("");
  const [status, setStatus] = useState("");
  const [includePutaway, setIncludePutaway] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 100;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [warehouses, setWarehouses] = useState<{ id: string; nama: string; tipe?: string }[]>([]);
  const [zonas, setZonas] = useState<{ id: string; gudangId: string; label: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; label: string }[]>([]);
  const [kategoris, setKategoris] = useState<{ id: string; nama: string }[]>([]);
  const [detailTiket, setDetailTiket] = useState<StockHistoryEntry | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(() => !!(zona || project || kategori));

  const ASAL_TIPE_LABEL: Record<string, string> = {
    gudang: "Gudang",
    pemasok: "Pemasok",
    project: "Project",
    gudang_stok: "Gudang",
    return: "Return",
  };

  const renderAsal = (row: StockHistoryEntry) => {
    const label = row.asal_label?.trim();
    if (label && label !== "-") {
      const badgeLabel = ASAL_TIPE_LABEL[row.asal_tipe || ""] || row.asal_tipe || "";
      return (
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="truncate block min-w-0" title={label}>
            {label}
          </span>
          {badgeLabel && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 whitespace-nowrap shrink-0">
              {badgeLabel}
            </span>
          )}
        </span>
      );
    }
    const fallback = row.gudang_asal || "-";
    return (
      <span className={fallback === "-" ? "text-slate-300" : ""}>
        {fallback}
      </span>
    );
  };

  const renderTujuan = (row: StockHistoryEntry) => {
    const gudang = row.gudang_tujuan || "-";
    if (gudang && gudang !== "-") {
      return <span className="truncate block" title={gudang}>{gudang}</span>;
    }
    const lapangan = row.lapangan_tujuan || "-";
    if (lapangan && lapangan !== "-") {
      return (
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className="truncate block min-w-0 max-w-[180px]" title={lapangan}>
            {lapangan}
          </span>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 whitespace-nowrap shrink-0">
            Lapangan
          </span>
        </span>
      );
    }
    return <span className="text-slate-300">-</span>;
  };

  // Table cell renderers: 2 lines (name + badge)
  const renderAsalCell = (row: StockHistoryEntry) => {
    const label = row.asal_label?.trim();
    if (label && label !== "-") {
      const badgeLabel = ASAL_TIPE_LABEL[row.asal_tipe || ""] || row.asal_tipe || "";
      return (
        <div className="leading-tight min-w-0">
          <span className="text-xs font-medium text-slate-900 line-clamp-2 break-words block" title={label}>
            {label}
          </span>
          {badgeLabel && (
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 bg-slate-100 whitespace-nowrap shrink-0 mt-0.5">
              {badgeLabel}
            </span>
          )}
        </div>
      );
    }
    const fallback = row.gudang_asal || "-";
    return (
      <div className="leading-tight">
        <span className="text-xs font-medium text-slate-900 line-clamp-2 break-words block" title={fallback}>
          {fallback}
        </span>
      </div>
    );
  };

  const renderTujuanCell = (row: StockHistoryEntry) => {
    const gudang = row.gudang_tujuan || "-";
    if (gudang && gudang !== "-") {
      return (
        <div className="leading-tight">
          <span className="text-xs font-medium text-slate-900 line-clamp-2 break-words block" title={gudang}>
            {gudang}
          </span>
        </div>
      );
    }
    const lapangan = row.lapangan_tujuan || "-";
    if (lapangan && lapangan !== "-") {
      return (
        <div className="leading-tight">
          <span className="text-xs font-medium text-slate-900 line-clamp-2 break-words block" title={lapangan}>
            {lapangan}
          </span>
          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 bg-slate-100 whitespace-nowrap shrink-0 mt-0.5">
            Lapangan
          </span>
        </div>
      );
    }
    return (
      <div className="leading-tight">
        <span className="text-xs text-slate-300">—</span>
      </div>
    );
  };

  // Formatters shared between table and card
  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const day = d.getDate();
    const mon = months[d.getMonth()];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${mon}, ${hh}:${mm}`;
  };

  const getJenisBadge = (r: StockHistoryEntry) => {
    const label = r.tipe_surat_jalan === "inbound" ? "Inbound" : r.tipe_surat_jalan === "outbound" ? "Outbound" : r.tipe_surat_jalan || "-";
    const variant = r.tipe_surat_jalan === "inbound" ? "green" : r.tipe_surat_jalan === "outbound" ? "orange" : "gray";
    return <Badge label={label} variant={variant} className="whitespace-nowrap shrink-0" />;
  };

  const getStatusBadge = (r: StockHistoryEntry) => (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0"
      style={{
        color: statusColor[r.status_surat_jalan]?.fg || "#6B7280",
        backgroundColor: statusColor[r.status_surat_jalan]?.bg || "#F3F4F6",
      }}
    >
      {statusLabel[r.status_surat_jalan] || r.status_surat_jalan || "-"}
    </span>
  );

  // Mobile card component
  function StokCard({ row, onClick }: { row: StockHistoryEntry; onClick: () => void }) {
    return (
      <div
        className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono font-semibold text-orange-500 truncate" title={row.kode_tiket || "-"}>
              {row.kode_tiket || "-"}
            </p>
          </div>
          <div className="shrink-0">
            <p className="font-mono text-xs text-slate-400 text-right whitespace-nowrap">
              {formatDateTime(row.waktu_mutasi)}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {getJenisBadge(row)}
          {getStatusBadge(row)}
        </div>

        <div className="mt-3 min-w-0">
          <p className="font-semibold text-slate-900 line-clamp-2 break-words" title={row.nama_barang || "-"}>
            {row.nama_barang || "-"}
          </p>
          <p className="font-mono text-xs text-slate-500 truncate" title={row.kode_perangkat || "-"}>
            {row.kode_perangkat || "-"}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-400">No. Surat Jalan</p>
            <p className="font-mono font-semibold text-slate-700 truncate" title={row.nomor_surat_jalan && row.nomor_surat_jalan !== "-" ? row.nomor_surat_jalan : row.return_transaction_id ? `Return #${row.return_transaction_id}` : "-"}>
              {row.nomor_surat_jalan && row.nomor_surat_jalan !== "-" ? row.nomor_surat_jalan : row.return_transaction_id ? `Return #${row.return_transaction_id}` : "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Diproses Oleh</p>
            <p className="font-semibold text-slate-900 truncate" title={row.diproses_oleh || "-"}>
              {row.diproses_oleh || "-"}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Qty</p>
            <p className="font-mono text-slate-900">
              <span className="font-semibold">{row.qty}</span>
              {row.satuan && row.satuan !== "-" && (
                <span className="ml-1 text-slate-400">{row.satuan}</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Zona</p>
            <p className="truncate" title={row.zona_kode && row.zona_kode !== "-" ? `${row.zona_gudang} / ${row.zona_kode}` : "Zona belum terisi"}>
              {row.zona_kode && row.zona_kode !== "-" ? (
                <>
                  <span className="text-slate-500">{row.zona_gudang}</span>
                  <span className="mx-1 text-slate-300">/</span>
                  <span className="font-mono font-semibold text-slate-800">{row.zona_kode}</span>
                </>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </p>
          </div>
        </div>

        {(row.asal_label || row.gudang_asal || row.gudang_tujuan || row.lapangan_tujuan) && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-400 mb-1">Alur</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-[10px] font-medium text-slate-400 mb-0.5">Asal</p>
                <div className="text-slate-700 break-words leading-tight">
                  {renderAsalCell(row)}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-400 mb-0.5">Tujuan</p>
                <div className="text-slate-700 break-words leading-tight">
                  {renderTujuanCell(row)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label="Lihat detail"
          >
            <Eye size={20} />
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const warehouseId = params.get("warehouseId");
    if (warehouseId) {
      setGudang(warehouseId);
    }
  }, []);

  const jenisList = ["inbound", "outbound"];
  const statusList = ["draft_diajukan", "menunggu_verifikasi", "ready_putaway", "disetujui", "digenerate", "diterima_didistribusikan", "sedang_dikirim", "tiba_menunggu_konfirmasi", "ditolak"];

  // Semua dropdown filter diisi dari master data supaya value-nya berupa ID
  // numerik (backend memfilter pakai ID, bukan nama). Limit dikirim eksplisit
  // karena endpoint master default-nya limit=10.
  useEffect(() => {
    let cancelled = false;

    const readList = (json: unknown): Record<string, unknown>[] =>
      Array.isArray((json as { data?: { data?: unknown[] } })?.data?.data)
        ? ((json as { data: { data: unknown[] } }).data.data as Record<string, unknown>[])
        : Array.isArray((json as { data?: unknown[] })?.data)
        ? ((json as { data: unknown[] }).data as Record<string, unknown>[])
        : [];

    (async () => {
      try {
        const [whRes, zonaRes, projRes, katRes] = await Promise.all([
          get(`${API_BASE}/api/warehouses`),
          get(`${API_BASE}/api/zones?limit=500`),
          get(`${API_BASE}/api/projects?all=true`),
          get(`${API_BASE}/api/categories?limit=500`),
        ]);

        const [whJson, zonaJson, projJson, katJson] = await Promise.all([
          whRes.json(),
          zonaRes.json(),
          projRes.json(),
          katRes.json(),
        ]);

        if (cancelled) return;

        if (whRes.ok) {
          setWarehouses(
            readList(whJson).map((w: Record<string, unknown>) => ({ id: String(w.gudang_id), nama: (w.nama_gudang as string) + (w.tipe === "dadakan" ? " (Transit)" : ""), tipe: w.tipe as string }))
          );
        }

        if (zonaRes.ok) {
          // Label selalu menyertakan nama gudang: kode_zona hanya unik per gudang
          // (@@unique([gudang_id, kode_zona])), jadi "Zona A" ada di >1 gudang.
          // Value tetap zona_id (PK) supaya filter tidak pernah ambigu.
          setZonas(
            readList(zonaJson)
              .map((z: Record<string, unknown>) => ({
                id: String(z.zona_id),
                gudangId: String((z.gudang_id ?? (z.gudang as Record<string, unknown>)?.gudang_id) ?? ""),
                label: `${(z.gudang as Record<string, unknown>)?.nama_gudang || "Gudang ?"} — ${z.nama_zona || `Zona ${z.kode_zona}`}`,
              }))
              .sort((a, b) => a.label.localeCompare(b.label))
          );
        }

        if (projRes.ok) {
          // Master project punya baris duplikat (nama+cluster sama). Dedup di UI
          // saja, ambil project_id terkecil; database tidak disentuh.
          const seen = new Set();
          const list = [];
          for (const p of readList(projJson).sort(
            (a: Record<string, unknown>, b: Record<string, unknown>) => Number(a.project_id) - Number(b.project_id)
          )) {
            const cluster = p.cluster_id || "";
            const key = `${p.nama_project}||${cluster}`;
            if (seen.has(key)) continue;
            seen.add(key);
            list.push({
              id: String(p.project_id),
              label: cluster ? `${String(p.nama_project)} (${cluster})` : String(p.nama_project),
            });
          }
          setProjects(list);
        }

        if (katRes.ok) {
          setKategoris(
            readList(katJson).map((k: Record<string, unknown>) => ({
              id: String(k.kategori_id),
              nama: k.nama_kategori as string,
            }))
          );
        }
      } catch {
        // Dropdown filter bersifat opsional: kegagalan load tidak boleh mematikan tabel.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [get]);

  useEffect(() => {
    setPage(1);
  }, [gudang, zona, project, kategori, jenis, status, includePutaway, q, startDate, endDate]);

  // Jaga-jaga untuk deep-link ?warehouseId=<id> yang tiba sebelum master data selesai load.
  const warehouseOptions = useMemo(() => {
    if (gudang && !warehouses.some((w) => w.id === gudang)) {
      return [...warehouses, { id: gudang, nama: `Gudang #${gudang}` }];
    }
    return warehouses;
  }, [warehouses, gudang]);

  // Auto-narrow: kalau Gudang sudah dipilih, opsi Zona menyempit ke gudang itu
  // saja supaya user tidak bisa memilih kombinasi mustahil (Gudang A + Zona
  // milik Gudang B) yang selalu menghasilkan 0 baris.
  const zonaOptions = useMemo(() => {
    if (!gudang) return zonas;
    return zonas.filter((z) => z.gudangId === gudang);
  }, [zonas, gudang]);

  // Kalau zona terpilih tidak lagi valid setelah Gudang berubah, reset supaya
  // tidak ada filter tersembunyi yang bikin tabel kosong tanpa sebab jelas.
  useEffect(() => {
    if (zona && !zonaOptions.some((z) => z.id === zona)) {
      setZona("");
    }
  }, [zonaOptions, zona]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      if (gudang) params.set("warehouseId", gudang);
      if (zona) params.set("zonaId", zona);
      if (project) params.set("projectId", project);
      if (kategori) params.set("kategoriId", kategori);
      if (jenis) params.set("type", jenis);
      if (status) params.set("status", status);
      if (includePutaway) params.set("include_putaway", "true");
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await get(`${API_BASE}/api/reports/stock-history?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengambil riwayat stok.");
      }

      const rows = Array.isArray(json?.data?.data) ? json.data.data : [];
      setData(rows);
      setTotal(json?.data?.meta?.total || 0);
      setTotalPages(json?.data?.meta?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [get, gudang, zona, project, kategori, jenis, status, includePutaway, q, startDate, endDate, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleExportRiwayatStok = async () => {
    setExporting(true);
    setToast(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      if (gudang) params.set("warehouseId", gudang);
      if (zona) params.set("zonaId", zona);
      if (project) params.set("projectId", project);
      if (kategori) params.set("kategoriId", kategori);
      if (jenis) params.set("type", jenis);
      if (status) params.set("status", status);
      if (includePutaway) params.set("include_putaway", "true");
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await get(`${API_BASE}/api/reports/stock-history/export?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || "Gagal mengekspor riwayat stok.");
      }

      const truncated = res.headers.get("X-Export-Truncated") === "true";
      const truncatedMessage = res.headers.get("X-Export-Truncated-Message");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Riwayat-Stok-Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      if (truncated && truncatedMessage) {
        setToast({ message: truncatedMessage, type: "warning" });
      } else {
        setToast({ message: "Riwayat Stok berhasil diekspor.", type: "success" });
      }
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal mengekspor Riwayat Stok.", type: "error" });
    } finally {
      setExporting(false);
    }
  };

  const jenisLabel: Record<string, string> = {
    inbound: "Inbound",
    outbound: "Outbound",
  };

  const statusLabel: Record<string, string> = {
    draft_diajukan: "Draft",
    menunggu_verifikasi: "Menunggu Verifikasi",
    ready_putaway: "Siap Putaway",
    disetujui: "Disetujui",
    digenerate: "Digenerate",
    tiba_menunggu_konfirmasi: "Menunggu Konfirmasi",
    diterima_didistribusikan: "Diterima/Didistribusikan",
    sedang_dikirim: "Sedang Dikirim",
    ditolak: "Ditolak",
  };

  return (
    <div className="pt-6">
      <div className="mb-6 grid grid-cols-1 gap-2">
        <div>
          <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Cari Kode Tiket…"
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={handleExportRiwayatStok}
            disabled={exporting}
            aria-label="Ekspor riwayat stok"
            title="Ekspor riwayat stok"
            className="w-full sm:w-auto h-10 sm:h-9 flex items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 shrink-0"
          >
            {exporting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mengekspor...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span>Ekspor</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-400">Gudang</label>
          <div className="relative">
            <select
              value={gudang}
              onChange={(e) => { setGudang(e.target.value); setPage(1); }}
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
            >
              <option value="">Semua gudang</option>
              {warehouseOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.nama}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-400">Jenis transaksi</label>
          <div className="relative">
            <select
              value={jenis}
              onChange={(e) => { setJenis(e.target.value); setPage(1); }}
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
            >
              <option value="">Semua jenis transaksi</option>
              {jenisList.map((o) => (
                <option key={o} value={o}>{jenisLabel[o] || o}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-400">Status</label>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
            >
              <option value="">Semua status</option>
              {statusList.map((o) => (
                <option key={o} value={o}>{statusLabel[o] || o}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div>
          <label htmlFor="startDate" className="mb-1 block text-[11px] font-medium text-slate-400">Dari</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label htmlFor="endDate" className="mb-1 block text-[11px] font-medium text-slate-400">Sampai</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <ChevronDown size={16} />
          </span>
          Filter lanjutan
          {(() => {
            const count = [zona, project, kategori].filter((v) => v && v !== "").length;
            return count > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-100 px-1.5 text-xs font-semibold text-orange-700">
                {count}
              </span>
            ) : null;
          })()}
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap sm:whitespace-normal">
          <input
            type="checkbox"
            checked={includePutaway}
            onChange={(e) => { setIncludePutaway(e.target.checked); setPage(1); }}
            className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
          />
          Tampilkan perpindahan internal (putaway)
        </label>
      </div>

      {advancedOpen && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-400">Zona</label>
            <div className="relative">
              <select
                value={zona}
                onChange={(e) => { setZona(e.target.value); setPage(1); }}
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
              >
                <option value="">{gudang ? "Semua zona di gudang ini" : "Semua zona"}</option>
                {zonaOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-400">Project/cluster</label>
            <div className="relative">
              <select
                value={project}
                onChange={(e) => { setProject(e.target.value); setPage(1); }}
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
              >
                <option value="">Semua project/cluster</option>
                {projects.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-400">Kategori perangkat</label>
            <div className="relative">
              <select
                value={kategori}
                onChange={(e) => { setKategori(e.target.value); setPage(1); }}
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
              >
                <option value="">Semua kategori perangkat</option>
                {kategoris.map((o) => (
                  <option key={o.id} value={o.id}>{o.nama}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={[
            "fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-medium shadow-2xl backdrop-blur-sm animate-in slide-in-from-right-full fade-in duration-300 max-w-sm",
            toast.type === "success"
              ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-800"
              : toast.type === "warning"
                ? "border-amber-200/80 bg-amber-50/95 text-amber-800"
                : "border-rose-200/80 bg-rose-50/95 text-rose-800",
          ].join(" ")}
        >
          <div
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              toast.type === "success"
                ? "bg-emerald-100"
                : toast.type === "warning"
                  ? "bg-amber-100"
                  : "bg-rose-100",
            ].join(" ")}
          >
            {toast.type === "success" ? (
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : toast.type === "warning" ? (
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
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
                : toast.type === "warning"
                  ? "text-amber-400 hover:bg-amber-100 hover:text-amber-600"
                  : "text-rose-400 hover:bg-rose-100 hover:text-rose-600",
            ].join(" ")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

            {/* Mobile card list (< md) */}
      {loading && (
        <div className="md:hidden space-y-3" role="status" aria-label="Memuat riwayat stok">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-full mb-2" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-3 bg-slate-200 rounded" />
                <div className="h-3 bg-slate-200 rounded" />
                <div className="h-3 bg-slate-200 rounded" />
                <div className="h-3 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="md:hidden rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-rose-500">{error}</p>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="md:hidden rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-400">Tidak ada pergerakan stok yang cocok dengan filter ini.</p>
        </div>
      )}

      {/* Mobile cards */}
      {!loading && !error && data.length > 0 && (
        <div className="md:hidden space-y-3" role="list" aria-label="Riwayat stok">
          {data.map((r) => (
            <StokCard key={r.ledger_id} row={r} onClick={() => setDetailTiket(r)} />
          ))}
        </div>
      )}

{/* Desktop table (md+) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full max-w-full table-auto text-left border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Tanggal / Tiket</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">No. Surat Jalan</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Jenis</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Asal</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap hidden lg:table-cell">Tujuan</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Status / Diproses</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Barang / Kode</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">Qty</th>
                <th className="px-3 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2.5" colSpan={9}>
                      <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td className="px-3 py-10 text-center text-sm text-rose-500" colSpan={9}>{error}</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td className="px-3 py-10 text-center text-sm text-slate-400" colSpan={9}>
                    Tidak ada pergerakan stok yang cocok dengan filter ini.
                  </td>
                </tr>
              ) : (
                data.map((r) => {
                  return (
                    <tr
                      key={r.ledger_id}
                      className="group cursor-pointer transition-colors hover:bg-slate-50 min-h-20"
                      onClick={() => setDetailTiket(r)}
                    >
                      <td className="px-3 py-2.5 min-w-[140px] max-w-[180px] truncate">
                        <div className="leading-tight">
                          <span className="font-mono text-xs text-slate-400 truncate block" title={formatDateTime(r.waktu_mutasi)}>
                            {formatDateTime(r.waktu_mutasi)}
                          </span>
                          <span className="font-mono font-semibold text-orange-500 text-xs truncate block" title={r.kode_tiket || "-"}>
                            {r.kode_tiket || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 min-w-[120px] max-w-[160px] truncate">
                        <span className="font-mono text-xs font-semibold text-slate-700 truncate block" title={r.nomor_surat_jalan && r.nomor_surat_jalan !== "-" ? r.nomor_surat_jalan : r.return_transaction_id ? `Return #${r.return_transaction_id}` : "-"}>
                          {r.nomor_surat_jalan && r.nomor_surat_jalan !== "-" ? r.nomor_surat_jalan : r.return_transaction_id ? `Return #${r.return_transaction_id}` : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap min-w-[80px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            label={r.tipe_surat_jalan === "inbound" ? "Inbound" : r.tipe_surat_jalan === "outbound" ? "Outbound" : r.tipe_surat_jalan || "-"}
                            variant={r.tipe_surat_jalan === "inbound" ? "green" : r.tipe_surat_jalan === "outbound" ? "orange" : "gray"}
                            className="whitespace-nowrap shrink-0"
                          />
                          {r.is_putaway && (
                            <span
                              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 whitespace-nowrap shrink-0"
                              title={
                                r.jenis_mutasi === "out"
                                  ? "Putaway · keluar (Generic)"
                                  : r.jenis_mutasi === "in"
                                    ? "Putaway · masuk (Zona)"
                                    : "Perpindahan Internal (Putaway)"
                              }
                            >
                              {r.jenis_mutasi === "out"
                                ? "Putaway Out"
                                : r.jenis_mutasi === "in"
                                  ? "Putaway In"
                                  : "Putaway"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 min-w-[140px] max-w-[180px]">
                        {renderAsalCell(r)}
                      </td>
                      <td className="px-3 py-2.5 min-w-[140px] max-w-[180px] hidden lg:table-cell">
                        {renderTujuanCell(r)}
                      </td>
                      <td className="px-3 py-2.5 min-w-[140px] max-w-[180px] truncate">
                        <div className="leading-tight">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0"
                            style={{
                              color: statusColor[r.status_surat_jalan]?.fg || "#6B7280",
                              backgroundColor: statusColor[r.status_surat_jalan]?.bg || "#F3F4F6",
                            }}
                          >
                            {statusLabel[r.status_surat_jalan] || r.status_surat_jalan || "-"}
                          </span>
                          <span className="text-xs text-slate-500 truncate block mt-0.5" title={r.diproses_oleh || "-"}>
                            {r.diproses_oleh || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 min-w-[160px] max-w-[220px] truncate">
                        <div className="leading-tight">
                          <span className="font-semibold text-slate-900 text-xs truncate block" title={r.nama_barang || "-"}>
                            {r.nama_barang || "-"}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 truncate block" title={r.kode_perangkat || "-"}>
                            {r.kode_perangkat || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono text-slate-700 min-w-[70px]">
                        <span className="font-semibold text-xs">{r.qty}</span>
                        {r.satuan && r.satuan !== "-" && (
                          <span className="ml-1 text-[10px] text-slate-400">{r.satuan}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={(e) => { e.stopPropagation(); setDetailTiket(r); }}
                          aria-label="Lihat detail"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span className="whitespace-nowrap">
            Menampilkan {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} dari {total} entri
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="rounded-full border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              Sebelumnya
            </button>
            <span className="font-mono whitespace-nowrap">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="rounded-full border border-slate-200 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {detailTiket && (
        <Modal
          open={!!detailTiket}
          onClose={() => setDetailTiket(null)}
          title="Detail Pergerakan Stok"
        >
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tiket &amp; Project</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">Kode Tiket</p>
                  <p className="text-sm font-mono font-semibold text-orange-600">{detailTiket.kode_tiket}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Project</p>
                  <p className="text-sm text-slate-800">{detailTiket.project_nama}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Area</p>
                  <p className="text-sm text-slate-800">{detailTiket.area}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Waktu Mutasi</p>
                  <p className="text-sm font-mono text-slate-700">
                    {new Date(detailTiket.waktu_mutasi).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Barang</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">Kode Perangkat</p>
                  <p className="text-sm font-mono font-semibold text-slate-800">{detailTiket.kode_perangkat}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Nama Barang</p>
                  <p className="text-sm text-slate-800">{detailTiket.nama_barang}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Qty</p>
                  <p className="text-sm font-mono text-slate-800">
                    <span className="font-semibold">{detailTiket.qty}</span>
                    {detailTiket.satuan && detailTiket.satuan !== "-" && (
                      <span className="ml-1 text-slate-400">{detailTiket.satuan}</span>
                    )}
                    {detailTiket.is_putaway ? (
                      <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {detailTiket.jenis_mutasi === "out"
                          ? "Putaway · keluar (Generic)"
                          : detailTiket.jenis_mutasi === "in"
                            ? "Putaway · masuk (Zona)"
                            : "Perpindahan Internal (Putaway)"}
                      </span>
                    ) : (
                      <span className="ml-2 text-xs text-slate-400">
                        ({detailTiket.jenis_mutasi === "in" ? "masuk" : "keluar"})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Saldo Setelah Mutasi</p>
                  <p className="text-sm font-mono text-slate-800">{detailTiket.saldo_setelah}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Kondisi</p>
                  <p className="text-sm text-slate-800">{detailTiket.kondisi}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Kelebihan Kirim</p>
                  <p className="text-sm text-slate-800">{detailTiket.is_kelebihan ? "Ya" : "Tidak"}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Lokasi</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">Gudang Asal</p>
                  <p className={`text-sm ${detailTiket.gudang_asal === "-" ? "text-slate-300" : "text-slate-800"}`}>
                    {detailTiket.gudang_asal}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Gudang Tujuan</p>
                  <p className={`text-sm ${detailTiket.gudang_tujuan === "-" ? "text-slate-300" : "text-slate-800"}`}>
                    {detailTiket.gudang_tujuan}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-slate-400">Zona Penempatan</p>
                  {detailTiket.zona_kode && detailTiket.zona_kode !== "-" ? (
                    <p className="text-sm text-slate-800">
                      <span className="text-slate-500">{detailTiket.zona_gudang}</span>
                      <span className="mx-1 text-slate-300">/</span>
                      <span className="font-mono font-semibold">{detailTiket.zona_kode}</span>
                      {detailTiket.zona_nama && detailTiket.zona_nama !== "-" && (
                        <span className="ml-2 text-slate-500">{detailTiket.zona_nama}</span>
                      )}
                      {detailTiket.zona_tipe && detailTiket.zona_tipe !== "-" && (
                        <span className="ml-2 text-xs text-slate-400">({detailTiket.zona_tipe})</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">
                      Belum ditempatkan — zona terisi setelah item melewati proses putaway.
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Gudang Asal/Tujuan menunjukkan pergerakan antar gudang; Zona adalah sub-lokasi di dalam gudang.
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dokumen</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">No. Surat Jalan</p>
                  <p className="text-sm font-mono text-slate-700">{detailTiket.nomor_surat_jalan}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Jenis Transaksi</p>
                  <p className="text-sm text-slate-800">{jenisLabel[detailTiket.tipe_surat_jalan] || detailTiket.tipe_surat_jalan}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Status</p>
                  <p className="text-sm text-slate-800">{statusLabel[detailTiket.status_surat_jalan] || detailTiket.status_surat_jalan}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Diproses Oleh</p>
                  <p className="text-sm text-slate-800">
                    {detailTiket.diproses_oleh}
                    {detailTiket.diproses_oleh_role && detailTiket.diproses_oleh_role !== "-" && (
                      <span className="ml-1 text-xs text-slate-400">({detailTiket.diproses_oleh_role})</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Dihilangkan - tab Utilisasi dipindah/dihapus sesuai PRD 7.12
// function TabUtilisasi({ get }) { ... } // seluruh komponen tab Utilisasi dihapus dari UI

function TabRiwayatInputMitra({ get }: { get: (url: string) => Promise<Response> }) {
  const [data, setData] = useState<ReconciliationUploadLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [actorId, setActorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailRow, setDetailRow] = useState<ReconciliationUploadLogEntry | null>(null);
  const [actors, setActors] = useState<{ user_id: number | string; nama: string }[]>([]);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await get(`${API_BASE}/api/users?role=admin_general&limit=100`);
        const json = await res.json();
        if (!cancelled && res.ok) {
          const list = Array.isArray(json?.data?.data) ? json.data.data : Array.isArray(json?.data) ? json.data : [];
          setActors(list);
        }
      } catch {
        // ignore actor fetch error
      }
    })();
    return () => { cancelled = true; };
  }, [get]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDetailRow(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      if (actorId) params.set("actorId", actorId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await get(`${API_BASE}/api/reports/reconciliation-upload-logs?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengambil riwayat upload.");
      }

      const rows = Array.isArray(json?.data?.data) ? json.data.data : [];
      setData(rows);
      setTotal(json?.data?.meta?.total || 0);
      setTotalPages(json?.data?.meta?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [get, q, actorId, startDate, endDate, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const day = d.getDate();
    const mon = months[d.getMonth()];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${mon}, ${hh}:${mm}`;
  };

  const statusBadge = (status: string) => {
    if (status === "berhasil") return <Badge label="Berhasil" variant="green" />;
    if (status === "gagal") return <Badge label="Gagal" variant="red" />;
    if (status === "sebagian_gagal") return <Badge label="Sebagian Gagal" variant="orange" />;
    if (status === "draft") return <Badge label="Draft" variant="gray" />;
    return <Badge label={status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} variant="gray" />;
  };

  const renderFilename = (filename: string) => {
    if (filename === "manual-input") {
      return <Badge label="Input Manual" variant="blue" className="whitespace-nowrap shrink-0" />;
    }
    return (
      <>
        <span className="truncate block" title={filename}>
          {filename}
        </span>
        {/\.(xlsx|xls|csv)$/i.test(filename) && <Badge label="Excel" variant="outline-gray" className="mt-1 whitespace-nowrap shrink-0" />}
      </>
    );
  };

  // Mobile card component
  function UploadLogCard({ row, onClick }: { row: ReconciliationUploadLogEntry; onClick: () => void }) {
    const allSuccess = row.failed_rows === 0 && row.success_rows > 0;
    const hasFailed = row.failed_rows > 0;
    const overallStatus = allSuccess ? "berhasil" : hasFailed ? "sebagian_gagal" : "draft";
    return (
      <div
        className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-slate-400 truncate">{formatDateTime(row.uploaded_at)}</p>
          </div>
          <div className="shrink-0">
            {overallStatus === "berhasil" && <Badge label="Berhasil" variant="green" className="whitespace-nowrap shrink-0" />}
            {overallStatus === "sebagian_gagal" && <Badge label="Sebagian Gagal" variant="orange" className="whitespace-nowrap shrink-0" />}
            {overallStatus === "draft" && <Badge label="Draft" variant="gray" className="whitespace-nowrap shrink-0" />}
          </div>
        </div>

        <div className="mt-2 min-w-0">
          <p className="font-semibold text-slate-900 line-clamp-2 break-words">{renderFilename(row.filename)}</p>
        </div>

        <div className="mt-2 min-w-0">
          <p className="text-xs font-medium text-slate-400">Diunggah Oleh</p>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900 truncate" title={row.uploaded_by_nama}>{row.uploaded_by_nama}</p>
            <Badge label={humanizeValue("user_role", row.uploaded_by_role)} variant="gray" className="whitespace-nowrap shrink-0" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-slate-400">Total</p>
            <p className="font-mono text-slate-900">{row.total_rows}</p>
          </div>
          <div>
            <p className="text-slate-400">Berhasil</p>
            <p className="font-mono text-emerald-600">{row.success_rows}</p>
          </div>
          <div>
            <p className="text-slate-400">Gagal</p>
            <p className="font-mono text-rose-600">{row.failed_rows}</p>
          </div>
        </div>

<div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            aria-label="Lihat detail"
          >
            <Eye size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Mobile card list (< md)
  if (loading) {
    return (
      <div className="md:hidden space-y-3" role="status" aria-label="Memuat riwayat upload">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
            <div className="h-3 bg-slate-200 rounded w-full mb-2" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-3 bg-slate-200 rounded" />
              <div className="h-3 bg-slate-200 rounded" />
              <div className="h-3 bg-slate-200 rounded" />
              <div className="h-3 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="md:hidden rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-rose-500">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="md:hidden rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-400">Belum ada riwayat upload laporan mitra.</p>
      </div>
    );
  }

  // Mobile cards
  const mobileCards = (
    <div className="md:hidden space-y-3" role="list" aria-label="Riwayat upload">
      {data.map((r) => (
        <UploadLogCard key={r.upload_id} row={r} onClick={() => setDetailRow(r)} />
      ))}
    </div>
  );

  // Desktop table (md+)
  const desktopTable = (
    <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] table-fixed text-left text-sm border-separate border-spacing-0">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="w-[160px] min-w-[160px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Waktu Upload</th>
              <th className="w-[300px] min-w-[300px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nama File</th>
              <th className="w-[240px] min-w-[240px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Diunggah Oleh</th>
              <th className="w-[80px] min-w-[80px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total</th>
              <th className="w-[80px] min-w-[80px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Berhasil</th>
              <th className="w-[80px] min-w-[80px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gagal</th>
              <th className="w-[140px] min-w-[140px] overflow-hidden px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
              <th className="w-16 min-w-16 px-3 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((r) => {
              const allSuccess = r.failed_rows === 0 && r.success_rows > 0;
              const hasFailed = r.failed_rows > 0;
              const overallStatus = allSuccess ? "berhasil" : hasFailed ? "sebagian_gagal" : "draft";
              return (
                <tr
                  key={r.upload_id}
                  className="group cursor-pointer transition-colors hover:bg-slate-50 min-h-16"
                  onClick={() => setDetailRow(r)}
                >
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400 overflow-hidden">
                    {formatDateTime(r.uploaded_at)}
                  </td>
                  <td className="px-6 py-4 min-w-0 overflow-hidden">
                    <div className="font-semibold text-slate-900 truncate">{renderFilename(r.filename)}</div>
                  </td>
                  <td className="px-6 py-4 min-w-0 overflow-hidden">
                    <div className="font-semibold text-slate-900 truncate" title={r.uploaded_by_nama}>{r.uploaded_by_nama}</div>
                    <div className="text-xs">
                      <Badge label={humanizeValue("user_role", r.uploaded_by_role)} variant="gray" className="whitespace-nowrap shrink-0" />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-xs text-slate-600 overflow-hidden">{r.total_rows}</td>
                  <td className="px-6 py-4 text-center font-mono text-xs text-emerald-600 overflow-hidden">{r.success_rows}</td>
                  <td className="px-6 py-4 text-center font-mono text-xs text-rose-600 overflow-hidden">{r.failed_rows}</td>
                  <td className="px-6 py-4 overflow-hidden">
                    {overallStatus === "berhasil" && <Badge label="Berhasil" variant="green" className="whitespace-nowrap shrink-0" />}
                    {overallStatus === "sebagian_gagal" && <Badge label="Sebagian Gagal" variant="orange" className="whitespace-nowrap shrink-0" />}
                    {overallStatus === "draft" && <Badge label="Draft" variant="gray" className="whitespace-nowrap shrink-0" />}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <button
                      type="button"
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}
                      aria-label="Lihat detail"
                      title="Lihat detail"
                    >
                      <Eye size={20} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        <div className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <div className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Cari nama file atau pengguna…"
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
            />
          </div>
        </div>

        <div>
          <select
            value={actorId}
            onChange={(e) => { setActorId(e.target.value); setPage(1); }}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">Semua pengguna</option>
            {actors.map((a) => (
              <option key={a.user_id} value={String(a.user_id)}>{a.nama}</option>
            ))}
          </select>
        </div>

        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          />
        </div>

        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          />
        </div>
      </div>

      {mobileCards}
      {desktopTable}

      {detailRow && (
        <Modal
          open={!!detailRow}
          onClose={() => setDetailRow(null)}
          title="Detail Upload Laporan Mitra"
          className="max-w-3xl"
        >
          {detailRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">Nama File</p>
                  <div className="text-sm font-semibold text-slate-800">{renderFilename(detailRow.filename)}</div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Waktu Upload</p>
                  <p className="text-sm font-semibold text-slate-800">{formatDateTime(detailRow.uploaded_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Diunggah Oleh</p>
                  <p className="text-sm font-semibold text-slate-800">{detailRow.uploaded_by_nama}</p>
                  {detailRow.uploaded_by_role && (
                    <div className="mt-1">
                      <Badge label={humanizeValue("user_role", detailRow.uploaded_by_role)} variant="gray" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Total / Berhasil / Gagal</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {detailRow.total_rows} / {detailRow.success_rows} / {detailRow.failed_rows}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-medium text-slate-400 mb-3">Detail Baris</p>
                {detailRow.details && detailRow.details.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kode Tiket</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-right">Used</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kondisi</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                          <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Alasan Gagal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {detailRow.details.map((d) => {
                          const hasDetail = d.nama_barang || d.kode_barang || d.project_nama || d.pic_mitra || d.tanggal_laporan || d.catatan;
                          const formatDate = (iso?: string | null) => {
                            if (!iso) return null;
                            const date = new Date(iso);
                            if (Number.isNaN(date.getTime())) return null;
                            return date.toLocaleDateString("id-ID", { dateStyle: "medium" });
                          };
                          const parts = hasDetail
                            ? [
                                d.nama_barang ? <span key="nama">Nama: <span className="font-semibold">{d.nama_barang}</span></span> : null,
                                d.kode_barang ? <span key="kode"><code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">{d.kode_barang}</code></span> : null,
                                d.project_nama ? <span key="project">Project: <span className="font-semibold">{d.project_nama}</span></span> : null,
                                d.pic_mitra ? <span key="pic">PIC: <span className="font-semibold">{d.pic_mitra}</span></span> : null,
                                d.tanggal_laporan ? <span key="tgl">Tgl: <span className="font-semibold">{formatDate(d.tanggal_laporan)}</span></span> : null,
                                d.catatan ? <span key="catatan">Catatan: <span className="font-semibold">{d.catatan}</span></span> : null,
                              ].filter(Boolean)
                            : [];
                          return (
                            <Fragment key={d.detail_id}>
                              <tr className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-mono font-semibold text-slate-700">{d.kode_tiket}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-600">{d.used}</td>
                                <td className="px-3 py-2">
                                  {d.kondisi ? (
                                    <KondisiBadge value={d.kondisi} />
                                  ) : (
                                    <span className="text-xs text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">{statusBadge(d.status || "-")}</td>
                                <td className="px-3 py-2 text-slate-500">{d.reason || "-"}</td>
                              </tr>
                              {parts.length > 0 && (
                                <tr className="bg-slate-50/60">
                                  <td colSpan={5} className="px-3 py-1.5 text-[11px] text-slate-500">
                                    {parts.map((part, idx) => (
                                      <span key={idx} className="mr-3">{part}</span>
                                    ))}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
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
          )}
        </Modal>
      )}
    </div>
  );
}

export default function LaporanAuditPage() {
  const [tab, setTab] = useState("audit");
  const { get } = useApi();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["audit", "stok", "reconciliation"].includes(tabParam)) {
      setTab(tabParam);
    }
  }, []);

  const tabs = [
    { key: "audit", label: "Audit Log", icon: FileClock },
    { key: "stok", label: "Riwayat Stok", icon: PackageSearch },
    { key: "reconciliation", label: "Riwayat Input Laporan Mitra", icon: Upload },
  ];

  // Scroll active tab into view
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    const activeTab = tabs.find((t) => t.key === tab);
    if (activeTab && tabRefs.current[activeTab.key]) {
      tabRefs.current[activeTab.key]!.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [tab, tabs]);


  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-orange-500">Admin General</div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">Laporan & Audit Menyeluruh</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visibilitas penuh atas seluruh transaksi dan perubahan data di sistem — bersifat read-only, tanpa aksi ubah/hapus.
          </p>
        </div>

                        <div className="overflow-x-auto pb-1 whitespace-nowrap border-b border-slate-100 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 min-w-max" role="tablist" aria-label="Tab laporan">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  ref={(el) => { tabRefs.current[t.key] = el; }}
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${t.key}`}
                  id={`tab-${t.key}`}
                  className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors min-h-[40px] ${
                    active ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}>
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          {tab === "audit" && <TabAuditLog get={get} />}
          {tab === "stok" && <TabRiwayatStok get={get} />}
          {tab === "reconciliation" && <TabRiwayatInputMitra get={get} />}
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Data pada halaman ini bersifat append-only dan tidak dapat diubah dari sini, termasuk oleh Admin General.
        </div>
      </div>
    </div>
  );
}
