"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Filter, FileText, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useApi } from "@/lib/api";

type GudangLite = { gudang_id: number; nama_gudang: string } | null;
type ProjectLite = { project_id: number; nama_project: string } | null;
type PenolakLite = { user_id: number; nama: string; email: string } | null;

interface RejectedRecord {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  tipe: "inbound" | "outbound";
  status: string;
  tanggal: string;
  kategori_approval?: string | null;
  pic_pemohon_nama?: string | null;
  project?: ProjectLite;
  gudang_asal?: GudangLite;
  gudang_tujuan?: GudangLite;
  catatan: string | null;
  ditolak_oleh: PenolakLite;
  ditolak_pada: string | null;
  created_at: string;
  updated_at: string;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const PREVIEW_LEN = 100;

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateShort = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const tipeBadge = (tipe: string) => {
  if (tipe === "inbound") {
    return "border-sky-100 bg-sky-50 text-sky-700";
  }
  if (tipe === "outbound") {
    return "border-orange-100 bg-orange-50 text-orange-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
};

export default function SupervisorRejectedListPage() {
  const router = useRouter();
  const { get } = useApi();

  const [records, setRecords] = useState<RejectedRecord[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [tipe, setTipe] = useState<"all" | "inbound" | "outbound">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const buildQuery = (overrides?: Partial<{ q: string; t: string; s: string; e: string; p: number; l: number }>) => {
    const q = overrides?.q ?? query;
    const t = overrides?.t ?? tipe;
    const s = overrides?.s ?? startDate;
    const e = overrides?.e ?? endDate;
    const p = overrides?.p ?? page;
    const l = overrides?.l ?? limit;
    const params = new URLSearchParams();
    if (q.trim()) params.set("search", q.trim());
    if (t && t !== "all") params.set("tipe", t);
    if (s) params.set("startDate", s);
    if (e) params.set("endDate", e);
    params.set("page", String(p));
    params.set("limit", String(l));
    return params.toString();
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const qs = buildQuery();
      const res = await get(`${API_BASE_URL}/api/surat-jalan/rejected?${qs}`);
      const json = await res.json();
      const payload = json?.data ?? {};
      const list = Array.isArray(payload?.data) ? payload.data : [];
      setRecords(list as RejectedRecord[]);
      setMeta(payload?.meta ?? { total: list.length, page: 1, limit, totalPages: 1 });
    } catch (err) {
      console.error("Gagal memuat riwayat surat jalan ditolak:", err);
      setRecords([]);
      setMeta({ total: 0, page: 1, limit, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleApplyFilters = () => {
    if (page !== 1) {
      setPage(1);
    } else {
      fetchList();
    }
  };

  const handleResetFilters = () => {
    setQuery("");
    setTipe("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
    // trigger via state change in effect would re-fetch; do explicit:
    setTimeout(() => {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", String(limit));
      (async () => {
        setLoading(true);
        try {
          const res = await get(`${API_BASE_URL}/api/surat-jalan/rejected?${params.toString()}`);
          const json = await res.json();
          const payload = json?.data ?? {};
          setRecords(Array.isArray(payload?.data) ? payload.data : []);
          setMeta(payload?.meta ?? { total: 0, page: 1, limit, totalPages: 0 });
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
  };

  const totalLabel = useMemo(() => {
    if (meta.total === 0) return "0";
    return `${meta.total}`;
  }, [meta.total]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[#FAFAFA] min-h-screen text-slate-800">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/supervisor/approval")}
          className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-600"
          title="Kembali ke halaman persetujuan"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-rose-600 uppercase">
            <span>SUPERVISOR PORTAL</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 font-normal capitalize">Riwayat Penolakan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Riwayat Surat Jalan Ditolak
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Daftar transaksi inbound &amp; outbound yang pernah ditolak beserta alasan penolakannya.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
              Total Ditolak
            </p>
            <h3 className="text-3xl font-bold text-slate-900 mb-1">{totalLabel}</h3>
            <p className="text-xs text-slate-400">Seluruh periode</p>
          </div>
          <div className="p-2 bg-rose-50 rounded-lg text-rose-500">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
              Outbound Ditolak
            </p>
            <h3 className="text-3xl font-bold text-orange-600 mb-1">
              {records.filter((r) => r.tipe === "outbound").length}
              <span className="text-base font-medium text-slate-400"> / {meta.total}</span>
            </h3>
            <p className="text-xs text-slate-400">Halaman ini</p>
          </div>
          <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari No. SJ, Project, atau Gudang..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyFilters();
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/60 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 placeholder-slate-400"
              />
            </div>
            <div className="relative w-full md:w-48">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={tipe}
                onChange={(e) => setTipe(e.target.value as "all" | "inbound" | "outbound")}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50/60 border-none rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none font-medium"
              >
                <option value="all">Semua Tipe</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2.5 bg-slate-50/60 border-none rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                title="Dari tanggal"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2.5 bg-slate-50/60 border-none rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                title="Sampai tanggal"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-emerald-600/20"
              >
                Terapkan
              </button>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 rounded-xl text-xs font-semibold transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 font-medium">
          Memuat data riwayat penolakan...
        </div>
      ) : records.length > 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                  <th className="px-6 py-4 font-medium">Nomor SJ</th>
                  <th className="px-6 py-4 font-medium">Tipe</th>
                  <th className="px-6 py-4 font-medium">Tanggal</th>
                  <th className="px-6 py-4 font-medium">Asal / Tujuan</th>
                  <th className="px-6 py-4 font-medium">Alasan Penolakan</th>
                  <th className="px-6 py-4 font-medium">Ditolak Oleh</th>
                  <th className="px-6 py-4 font-medium">Ditolak Pada</th>
                  <th className="px-6 py-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const alasanFull = r.catatan ?? "";
                  const alasanPreview =
                    alasanFull.length > PREVIEW_LEN
                      ? alasanFull.slice(0, PREVIEW_LEN).trimEnd() + "…"
                      : alasanFull;
                  const asal = r.gudang_asal?.nama_gudang;
                  const tujuan = r.gudang_tujuan?.nama_gudang;
                  return (
                    <tr key={r.surat_jalan_id} className="border-t border-slate-100 align-top">
                      <td className="px-6 py-4 font-semibold text-slate-800 whitespace-nowrap">
                        {r.nomor_surat_jalan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tipeBadge(
                            r.tipe
                          )}`}
                        >
                          {r.tipe === "inbound" ? "Inbound" : "Outbound"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {formatDateShort(r.tanggal)}
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-[220px]">
                        <div className="text-xs text-slate-500">Asal</div>
                        <div className="font-medium text-slate-700">
                          {asal || <span className="text-slate-400">-</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Tujuan</div>
                        <div className="font-medium text-slate-700">
                          {tujuan || <span className="text-slate-400">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 max-w-[280px]">
                        {alasanPreview ? (
                          <span title={alasanFull}>{alasanPreview}</span>
                        ) : (
                          <span className="italic text-slate-400">Tanpa alasan tercatat</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-700 whitespace-nowrap">
                        {r.ditolak_oleh?.nama ?? (
                          <span className="italic text-slate-400">Tidak diketahui</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {formatDate(r.ditolak_pada)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/supervisor/approval/rejected/${r.surat_jalan_id}`
                            )
                          }
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 font-medium shadow-sm">
          <XCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-600 font-semibold">Belum ada surat jalan yang ditolak</p>
          <p className="mt-1 text-xs text-slate-400">
            Riwayat penolakan akan muncul di sini setelah supervisor menolak pengajuan inbound atau outbound.
          </p>
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-500">
            Menampilkan halaman <strong>{meta.page}</strong> dari <strong>{meta.totalPages}</strong>
            {" "}({meta.total} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={meta.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Sebelumnya
            </button>
            <button
              disabled={meta.page >= meta.totalPages || loading}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Berikutnya
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}