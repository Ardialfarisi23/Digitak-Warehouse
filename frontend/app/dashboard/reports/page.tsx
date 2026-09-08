"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
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
} from "lucide-react";
import { useApi } from "@/lib/api";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const statusColor = {
  draft_diajukan: { fg: "#6B7280", bg: "#F3F4F6" },
  menunggu_verifikasi: { fg: "#92400E", bg: "#FEF3C7" },
  ready_putaway: { fg: "#1E40AF", bg: "#DBEAFE" },
  disetujui: { fg: "#1E7A4C", bg: "#E4F5EC" },
  digenerate: { fg: "#6B7280", bg: "#F3F4F6" },
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

function Badge({ label, icon: Icon, variant = "gray" }: { label: string; icon?: React.ComponentType<{ size?: number; className?: string }>; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${badgeStyles[variant]}`}>
      {Icon && <Icon size={14} />}
      {label}
    </span>
  );
}

const aksiMap: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; variant: BadgeVariant }> = {
  create: { label: "Dibuat", icon: Plus, variant: "green" },
  update: { label: "Diperbarui", icon: Pencil, variant: "blue" },
  delete: { label: "Dihapus", icon: Trash2, variant: "red" },
  approve: { label: "Disetujui", icon: CheckCircle, variant: "green" },
  receive_inbound: { label: "Terima Inbound", icon: ArrowDownToLine, variant: "purple" },
  approve_inbound: { label: "Setujui Inbound", icon: CheckCircle, variant: "green" },
  approve_outbound: { label: "Setujui Outbound", icon: CheckCircle, variant: "green" },
  confirm_distributed: { label: "Dikonfirmasi", icon: PackageCheck, variant: "purple" },
  reject_inbound: { label: "Tolak Inbound", icon: XCircle, variant: "red" },
  reject_outbound: { label: "Tolak Outbound", icon: XCircle, variant: "red" },
};

const roleMap: Record<string, { label: string; variant: BadgeVariant }> = {
  admin_general: { label: "Admin General", variant: "outline-orange" },
  supervisor: { label: "Supervisor", variant: "outline-blue" },
  staf_gudang: { label: "Staf Gudang", variant: "outline-gray" },
};

function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    const handleKey = (e) => {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function TabAuditLog({ get }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [actorRole, setActorRole] = useState("");
  const [aksi, setAksi] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailRow, setDetailRow] = useState(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDetailRow(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      if (q.trim()) params.set("kodeTiket", q.trim());
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
  }, [get, q, actorRole, aksi, startDate, endDate, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const aksiList = ["create", "update", "delete", "approve", "receive_inbound", "approve_inbound", "approve_outbound", "confirm_distributed", "reject_inbound", "reject_outbound"];

  const formatDateTime = (iso) => {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const day = d.getDate();
    const mon = months[d.getMonth()];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${mon}, ${hh}:${mm}`;
  };

  const getEntityLabel = (row) => {
    const kode = row.data_sesudah?.kode_tiket || row.data_sebelum?.kode_tiket;
    if (kode) return kode;
    if (row.entity_type && row.entity_id && row.entity_id !== "0") {
      return `${row.entity_type} #${row.entity_id}`;
    }
    return row.entity_type || "-";
  };

  const getExtraRef = (row) => {
    const ds = row.data_sesudah || {};
    const parts = [];
    if (ds.source_file || ds.filename || ds.nama_file) {
      parts.push(ds.source_file || ds.filename || ds.nama_file);
    }
    if (ds.username_target || ds.target_user || ds.user_target) {
      parts.push(`user: ${ds.username_target || ds.target_user || ds.user_target}`);
    }
    if (ds.catatan) {
      parts.push(ds.catatan);
    }
    return parts.length > 0 ? parts.join(" | ") : "—";
  };

  const renderStructuredData = (label, data) => {
    if (!data || typeof data !== "object") {
      return <p className="text-sm text-slate-500">-</p>;
    }

    const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (entries.length === 0) {
      return <p className="text-sm text-slate-500">-</p>;
    }

    const labelMap = {
      mos: "MOS",
      used: "Used",
      source_file: "File Sumber",
      filename: "Nama File",
      nama_file: "Nama File",
      role: "Peran",
      catatan: "Catatan",
      nomor_surat_jalan: "Nomor Surat Jalan",
      status: "Status",
      kode_tiket: "Kode Tiket",
      username_target: "Username Target",
      target_user: "Username Target",
      user_target: "Username Target",
    };

    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => {
          const displayKey = labelMap[key] || key;
          const displayValue = typeof value === "object" ? JSON.stringify(value) : String(value);
          return (
            <div key={key} className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-500">{displayKey}</span>
              <span className="text-xs font-semibold text-slate-800 text-right break-all">{displayValue}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-700">
        Tabel ini bersifat <strong>append-only</strong>. Semua entri dicatat otomatis dan tidak dapat diubah atau dihapus, termasuk oleh Admin General.
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Cari Kode Tiket, aksi, atau entitas…"
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
          />
        </div>

        <div className="relative">
          <select
            value={actorRole}
            onChange={(e) => { setActorRole(e.target.value); setPage(1); }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">Semua peran</option>
            <option value="admin_general">Admin General</option>
            <option value="supervisor">Supervisor</option>
            <option value="staf_gudang">Staf Gudang</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={aksi}
            onChange={(e) => { setAksi(e.target.value); setPage(1); }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">Semua jenis aksi</option>
            {aksiList.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          />
        </div>

        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Waktu</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pengguna</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Peran</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Aksi</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Entitas Terkait</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Referensi Tambahan</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4" colSpan={7}>
                      <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-rose-500" colSpan={7}>{error}</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={7}>
                    Tidak ada entri audit yang cocok dengan filter ini.
                  </td>
                </tr>
              ) : (
                data.map((r) => {
                  const extraRef = getExtraRef(r);
                  return (
                    <tr
                      key={r.audit_id}
                      className="group cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => setDetailRow(r)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
                        {formatDateTime(r.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{r.actor_nama}</div>
                      </td>
                      <td className="px-6 py-4">
                        {roleMap[r.actor_role] ? (
                          <Badge label={roleMap[r.actor_role].label} variant={roleMap[r.actor_role].variant} />
                        ) : (
                          <span className="text-xs text-slate-500">{r.actor_role}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {aksiMap[r.aksi] ? (
                          <Badge label={aksiMap[r.aksi].label} icon={aksiMap[r.aksi].icon} variant={aksiMap[r.aksi].variant} />
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {r.aksi}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge label={getEntityLabel(r)} variant="gray" />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {extraRef !== "—" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-mono">
                            {extraRef}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}
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
      </div>

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
                <p className="text-sm font-semibold text-slate-800">{detailRow.actor_nama}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Peran</p>
                <p className="text-sm text-slate-800">{detailRow.actor_role}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Aksi</p>
                <p className="text-sm text-slate-800">{detailRow.aksi}</p>
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
                      <p className="text-xs font-medium text-slate-400 mb-2">Data Sebelum</p>
                      {renderStructuredData("Sebelum", detailRow.data_sebelum)}
                    </div>
                  )}
                  {detailRow.data_sesudah && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 mb-2">Data Sesudah</p>
                      {renderStructuredData("Sesudah", detailRow.data_sesudah)}
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

function TabRiwayatStok({ get }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gudang, setGudang] = useState("");
  const [zona, setZona] = useState("");
  const [project, setProject] = useState("");
  const [kategori, setKategori] = useState("");
  const [jenis, setJenis] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [warehouses, setWarehouses] = useState<{ id: string; nama: string }[]>([]);
  const [zonas, setZonas] = useState<{ id: string; gudangId: string; label: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; label: string }[]>([]);
  const [kategoris, setKategoris] = useState<{ id: string; nama: string }[]>([]);
  const [detailTiket, setDetailTiket] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const warehouseId = params.get("warehouseId");
    if (warehouseId) {
      setGudang(warehouseId);
    }
  }, []);

  const jenisList = ["inbound", "outbound"];
  const statusList = ["draft_diajukan", "menunggu_verifikasi", "ready_putaway", "disetujui", "digenerate", "diterima_didistribusikan", "sedang_dikirim", "ditolak"];

  // Semua dropdown filter diisi dari master data supaya value-nya berupa ID
  // numerik (backend memfilter pakai ID, bukan nama). Limit dikirim eksplisit
  // karena endpoint master default-nya limit=10.
  useEffect(() => {
    let cancelled = false;

    const readList = (json) =>
      Array.isArray(json?.data?.data)
        ? json.data.data
        : Array.isArray(json?.data)
        ? json.data
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
            readList(whJson).map((w) => ({ id: String(w.gudang_id), nama: w.nama_gudang }))
          );
        }

        if (zonaRes.ok) {
          // Label selalu menyertakan nama gudang: kode_zona hanya unik per gudang
          // (@@unique([gudang_id, kode_zona])), jadi "Zona A" ada di >1 gudang.
          // Value tetap zona_id (PK) supaya filter tidak pernah ambigu.
          setZonas(
            readList(zonaJson)
              .map((z) => ({
                id: String(z.zona_id),
                gudangId: String(z.gudang_id ?? z.gudang?.gudang_id ?? ""),
                label: `${z.gudang?.nama_gudang || "Gudang ?"} — ${z.nama_zona || `Zona ${z.kode_zona}`}`,
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
            (a, b) => Number(a.project_id) - Number(b.project_id)
          )) {
            const cluster = p.cluster_id || "";
            const key = `${p.nama_project}||${cluster}`;
            if (seen.has(key)) continue;
            seen.add(key);
            list.push({
              id: String(p.project_id),
              label: cluster ? `${p.nama_project} (${cluster})` : p.nama_project,
            });
          }
          setProjects(list);
        }

        if (katRes.ok) {
          setKategoris(
            readList(katJson).map((k) => ({
              id: String(k.kategori_id),
              nama: k.nama_kategori,
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
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", "1");
      params.set("limit", "100");

      const res = await get(`${API_BASE}/api/reports/stock-history?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengambil riwayat stok.");
      }

      const rows = Array.isArray(json?.data?.data) ? json.data.data : [];
      setData(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [get, gudang, zona, project, kategori, jenis, status, q, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const jenisLabel = {
    inbound: "Inbound",
    outbound: "Outbound",
  };

  const statusLabel = {
    draft_diajukan: "Draft",
    menunggu_verifikasi: "Menunggu Verifikasi",
    ready_putaway: "Siap Putaway",
    disetujui: "Disetujui",
    digenerate: "Digenerate",
    diterima_didistribusikan: "Diterima/Didistribusikan",
    sedang_dikirim: "Sedang Dikirim",
    ditolak: "Ditolak",
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari Kode Tiket…"
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
          />
        </div>

        <div className="relative">
          <select
            value={gudang}
            onChange={(e) => setGudang(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">Semua gudang</option>
            {warehouseOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.nama}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">{gudang ? "Semua zona di gudang ini" : "Semua zona"}</option>
            {zonaOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">Semua project/cluster</option>
            {projects.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">Semua kategori perangkat</option>
            {kategoris.map((o) => (
              <option key={o.id} value={o.id}>{o.nama}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={jenis}
            onChange={(e) => setJenis(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">Semua jenis transaksi</option>
            {jenisList.map((o) => (
              <option key={o} value={o}>{jenisLabel[o] || o}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">Semua status</option>
            {statusList.map((o) => (
              <option key={o} value={o}>{statusLabel[o] || o}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          />
        </div>

        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tanggal</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kode Tiket</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Jenis Transaksi</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Diproses Oleh</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kode Perangkat</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nama Barang</th>
                <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Qty</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Zona</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Asal → Tujuan</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4" colSpan={11}>
                      <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-rose-500" colSpan={11}>{error}</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={11}>
                    Tidak ada pergerakan stok yang cocok dengan filter ini.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr
                    key={r.ledger_id}
                    className="group cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => setDetailTiket(r)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
                      {new Date(r.waktu_mutasi).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-orange-500">
                      {r.kode_tiket || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        label={r.tipe_surat_jalan === "inbound" ? "Inbound" : r.tipe_surat_jalan === "outbound" ? "Outbound" : r.tipe_surat_jalan || "-"}
                        variant={r.tipe_surat_jalan === "inbound" ? "green" : r.tipe_surat_jalan === "outbound" ? "orange" : "gray"}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                        style={{
                          color: statusColor[r.status_surat_jalan]?.fg || "#6B7280",
                          backgroundColor: statusColor[r.status_surat_jalan]?.bg || "#F3F4F6",
                        }}
                      >
                        {statusLabel[r.status_surat_jalan] || r.status_surat_jalan || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{r.diproses_oleh || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-slate-700">
                      {r.kode_perangkat || "-"}
                    </td>
                    <td className="px-6 py-4 max-w-[260px] truncate text-slate-700" title={r.nama_barang || "-"}>
                      {r.nama_barang || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-slate-900">
                      <span className="font-semibold">{r.qty}</span>
                      {r.satuan && r.satuan !== "-" && (
                        <span className="ml-1 text-xs font-normal text-slate-400">{r.satuan}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                      {r.zona_kode && r.zona_kode !== "-" ? (
                        <span>
                          <span className="text-slate-500">{r.zona_gudang}</span>
                          <span className="mx-1 text-slate-300">/</span>
                          <span className="font-mono font-semibold text-slate-800">{r.zona_kode}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300" title="Zona baru terisi setelah item melewati proses putaway">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                      <span className={r.gudang_asal === "-" ? "text-slate-300" : ""}>{r.gudang_asal}</span>
                      <span className="mx-1.5 text-slate-400">→</span>
                      <span className={r.gudang_tujuan === "-" ? "text-slate-300" : ""}>{r.gudang_tujuan}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        onClick={(e) => { e.stopPropagation(); setDetailTiket(r); }}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                    <span className="ml-2 text-xs text-slate-400">
                      ({detailTiket.jenis_mutasi === "in" ? "masuk" : "keluar"})
                    </span>
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

function TabRiwayatInputMitra({ get }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [actorId, setActorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailRow, setDetailRow] = useState(null);
  const [actors, setActors] = useState([]);
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

  const formatDateTime = (iso) => {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const day = d.getDate();
    const mon = months[d.getMonth()];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${mon}, ${hh}:${mm}`;
  };

  const statusBadge = (status) => {
    if (status === "berhasil") return <Badge label="Berhasil" variant="green" />;
    if (status === "gagal") return <Badge label="Gagal" variant="red" />;
    return <Badge label={status} variant="gray" />;
  };

  return (
    <div>
      <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-700">
        Tabel ini menampilkan histori upload laporan mitra. Setiap baris merepresentasikan 1 sesi upload file Excel.
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Cari nama file atau pengguna…"
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-300"
          />
        </div>

        <div className="relative">
          <select
            value={actorId}
            onChange={(e) => { setActorId(e.target.value); setPage(1); }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">Semua pengguna</option>
            {actors.map((a) => (
              <option key={a.user_id} value={String(a.user_id)}>{a.nama}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          />
        </div>

        <div className="relative">
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4" colSpan={8}>
                      <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-rose-500" colSpan={8}>{error}</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={8}>
                    Belum ada riwayat upload laporan mitra.
                  </td>
                </tr>
              ) : (
                data.map((r) => {
                  const allSuccess = r.failed_rows === 0 && r.success_rows > 0;
                  const hasFailed = r.failed_rows > 0;
                  const overallStatus = allSuccess ? "berhasil" : hasFailed ? "sebagian_gagal" : "draft";
                  return (
                    <tr
                      key={r.upload_id}
                      className="group cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => setDetailRow(r)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
                        {formatDateTime(r.uploaded_at)}
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
                        {overallStatus === "berhasil" && <Badge label="Berhasil" variant="green" />}
                        {overallStatus === "sebagian_gagal" && <Badge label="Sebagian Gagal" variant="orange" />}
                        {overallStatus === "draft" && <Badge label="Draft" variant="gray" />}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={(e) => { e.stopPropagation(); setDetailRow(r); }}
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
      </div>

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
        title="Detail Upload Laporan Mitra"
      >
        {detailRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-400">Nama File</p>
                <p className="text-sm font-semibold text-slate-800">{detailRow.filename}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Waktu Upload</p>
                <p className="text-sm font-semibold text-slate-800">{formatDateTime(detailRow.uploaded_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Diunggah Oleh</p>
                <p className="text-sm font-semibold text-slate-800">{detailRow.uploaded_by_nama}</p>
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
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-right">MOS</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 text-right">Used</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Alasan Gagal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detailRow.details.map((d) => (
                        <tr key={d.detail_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">{d.kode_tiket}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">{d.mos}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">{d.used}</td>
                          <td className="px-3 py-2">{statusBadge(d.status)}</td>
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
        )}
      </Modal>
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

  return (
    <div className={`${plusJakartaSans.className} flex flex-1 flex-col p-6`}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-orange-500">Admin General</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Laporan &amp; Audit Menyeluruh</h1>
          <p className="mt-1 text-sm text-slate-500">
            Visibilitas penuh atas seluruh transaksi dan perubahan data di sistem — bersifat read-only, tanpa aksi ubah/hapus.
          </p>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-100">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  active ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
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
