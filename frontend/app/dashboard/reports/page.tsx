"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  Search,
  ChevronDown,
  FileClock,
  PackageSearch,
  BarChart3,
  Circle,
  Eye,
  X,
} from "lucide-react";
import { useApi } from "@/lib/api";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const statusColor = {
  draft_diajukan: { fg: "#6B7280", bg: "#F3F4F6" },
  disetujui: { fg: "#1E7A4C", bg: "#E4F5EC" },
  digenerate: { fg: "#6B7280", bg: "#F3F4F6" },
  diterima_didistribusikan: { fg: "#2E9E6D", bg: "#E4F5EC" },
};

function Badge({ children, color }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap"
      style={{ color, backgroundColor: color + "18" }}
    >
      <Circle size={12} fill={color} stroke="none" />
      {children}
    </span>
  );
}

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

  const aksiList = ["create", "update", "delete", "approve"];

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
                      <td className="px-6 py-4 text-xs text-slate-500">{r.actor_role}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {r.aksi}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {getEntityLabel(r)}
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
  const [jenis, setJenis] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [detailTiket, setDetailTiket] = useState(null);

  const jenisList = ["inbound", "outbound"];
  const statusList = ["draft_diajukan", "disetujui", "digenerate", "diterima_didistribusikan"];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      if (gudang) params.set("warehouseId", gudang);
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

      const gudangSet = [...new Set(rows.map((r) => r.gudang).filter(Boolean))];
      setWarehouses(gudangSet);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [get, gudang, jenis, status, q, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const jenisLabel = {
    inbound: "Inbound",
    outbound: "Outbound",
  };

  const statusLabel = {
    draft_diajukan: "Draft",
    disetujui: "Disetujui",
    digenerate: "Digenerate",
    diterima_didistribusikan: "Diterima/Didistribusikan",
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
            {warehouses.map((o) => (
              <option key={o} value={o}>{o}</option>
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
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gudang</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Diproses Oleh</th>
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
                    Tidak ada pergerakan stok yang cocok dengan filter ini.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr
                    key={r.ledger_id}
                    className="group cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => r.kode_tiket && r.kode_tiket !== "-" && setDetailTiket(r)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
                      {new Date(r.waktu_mutasi).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-orange-500">
                      {r.kode_tiket || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={r.tipe_surat_jalan === "inbound" ? "#2E9E6D" : r.tipe_surat_jalan === "outbound" ? "#D9822B" : "#7C8698"}>
                        {r.tipe_surat_jalan === "inbound" ? "Inbound" : r.tipe_surat_jalan === "outbound" ? "Outbound" : r.tipe_surat_jalan || "-"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{r.gudang}</td>
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
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        onClick={(e) => { e.stopPropagation(); r.kode_tiket && r.kode_tiket !== "-" && setDetailTiket(r); }}
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
          title="Detail Tiket Gudang"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-400">Kode Tiket</p>
                <p className="text-sm font-semibold text-slate-800">{detailTiket.kode_tiket}</p>
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
                <p className="text-xs font-medium text-slate-400">Gudang</p>
                <p className="text-sm text-slate-800">{detailTiket.gudang}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Jenis Transaksi</p>
                <p className="text-sm text-slate-800">{detailTiket.tipe_surat_jalan}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Status</p>
                <p className="text-sm text-slate-800">{detailTiket.status_surat_jalan}</p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-400">Surat Jalan</p>
              <p className="text-sm font-mono text-slate-700">{detailTiket.nomor_surat_jalan}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TabUtilisasi({ get }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gudang, setGudang] = useState("");
  const [gudangs, setGudangs] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get(`${API_BASE}/api/reports/zone-utilization`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengambil data utilisasi zona.");
      }

      const rows = Array.isArray(json?.data) ? json.data : [];
      let filtered = rows;
      if (gudang) {
        filtered = rows.filter((r) => r.gudang_nama === gudang);
      }
      setData(filtered);

      const gudangSet = [...new Set(rows.map((r) => r.gudang_nama).filter(Boolean))];
      setGudangs(gudangSet);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [get, gudang]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value={gudang}
            onChange={(e) => setGudang(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none focus:border-orange-400 appearance-none"
          >
            <option value="">Semua gudang</option>
            {gudangs.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gudang</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Zona</th>
                <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tipe Zona</th>
                <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Utilisasi (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4" colSpan={4}>
                      <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-rose-500" colSpan={4}>{error}</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={4}>
                    Tidak ada data utilisasi untuk filter ini.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.zona_id} className="group transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">{r.gudang_nama}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-orange-600">{r.zona_kode}</td>
                    <td className="px-6 py-4 text-slate-700">{r.gudang_tipe === "tetap" ? "Indoor" : "Outdoor"}</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-slate-900">
                      {r.utilisasi_persen !== null && r.utilisasi_persen !== undefined ? `${r.utilisasi_persen}%` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function LaporanAuditPage() {
  const [tab, setTab] = useState("audit");
  const { get } = useApi();

  const tabs = [
    { key: "audit", label: "Audit Log", icon: FileClock },
    { key: "stok", label: "Riwayat Stok", icon: PackageSearch },
    { key: "utilisasi", label: "Utilisasi", icon: BarChart3 },
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
          {tab === "utilisasi" && <TabUtilisasi get={get} />}
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Data pada halaman ini bersifat append-only dan tidak dapat diubah dari sini, termasuk oleh Admin General.
        </div>
      </div>
    </div>
  );
}
