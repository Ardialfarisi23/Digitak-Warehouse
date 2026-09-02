"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Search, Eye, X, ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, FileText, Loader2, AlertCircle, PackageCheck, Truck, ChevronDown } from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { DetailSuratJalanDocument } from "@/components/surat-jalan/DetailSuratJalanDocument";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type TipeSuratJalan = "INBOUND" | "OUTBOUND";

interface SuratJalanRecord {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  tipe: TipeSuratJalan;
  status: string;
  tanggal: string;
  project?: {
    nama_project: string;
    area?: string;
  };
  gudang_asal?: {
    nama_gudang: string;
  };
  gudang_tujuan?: {
    nama_gudang: string;
  };
  personil_pengantar?: {
    nama: string;
  };
  kendaraan?: {
    jenis_kendaraan: string;
    no_polisi: string;
  };
  creator?: {
    nama: string;
  };
  items: {
    item_id: number;
    barang: {
      kode_perangkat: string;
      nama_barang: string;
      satuan_default?: {
        kode_satuan: string;
      };
    };
    qty: number;
    satuan: {
      kode_satuan: string;
    };
    kondisi?: string;
  }[];
}

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  draft_diajukan: { label: "Draft Diajukan", bg: "bg-slate-100", text: "text-slate-700" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", bg: "bg-amber-50", text: "text-amber-700" },
  disetujui: { label: "Disetujui", bg: "bg-emerald-50", text: "text-emerald-700" },
  digenerate: { label: "Digenerate", bg: "bg-blue-50", text: "text-blue-700" },
  diterima_didistribusikan: { label: "Diterima / Didistribusikan", bg: "bg-emerald-50", text: "text-emerald-700" },
  sedang_dikirim: { label: "Sedang Dikirim", bg: "bg-amber-50", text: "text-amber-700" },
  ditolak: { label: "Ditolak", bg: "bg-rose-50", text: "text-rose-700" },
};

type TabType = "SEMUA" | "INBOUND" | "OUTBOUND";

export default function AdminDeliveryPage() {
  const { user } = useAuth();
  const { get } = useApi();

  const [activeTab, setActiveTab] = useState<TabType>("SEMUA");
  const [searchQuery, setSearchQuery] = useState("");
  const [allRecords, setAllRecords] = useState<SuratJalanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SuratJalanRecord | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [gudangFilter, setGudangFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [warehouses, setWarehouses] = useState<{ gudang_id: number; nama_gudang: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const currentRole = mapRole(user.role);
    if (currentRole !== "admin") {
      window.location.href = "/";
    }
  }, [user]);

  useEffect(() => {
    get(`${API_BASE}/api/warehouses?limit=100`).then((r) => r.json()).then((json) => {
      setWarehouses(Array.isArray(json?.data) ? json.data : []);
    }).catch(() => {
      setWarehouses([]);
    });
  }, [get]);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (gudangFilter && gudangFilter !== "all") params.set("gudangTujuanId", gudangFilter);
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const qs = buildQueryParams();
      const endpoints = [
        `${API_BASE}/api/surat-jalan/outbound/queue${qs}`,
        `${API_BASE}/api/surat-jalan/inbound${qs}`,
      ];
      const responses = await Promise.all(endpoints.map((url) => get(url)));
      const jsonResults = await Promise.all(responses.map((r) => r.json()));

      const allRecords: SuratJalanRecord[] = [];

      for (const json of jsonResults) {
        const data = json?.data;
        if (Array.isArray(data)) {
          allRecords.push(...data);
        }
      }

      setAllRecords(allRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data surat jalan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, gudangFilter, statusFilter, startDate, endDate]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return allRecords.filter((record) => {
      const tipe = (record.tipe || "").toLowerCase();
      const matchesSearch =
        !q || record.nomor_surat_jalan.toLowerCase().includes(q) || (record.project?.nama_project || "").toLowerCase().includes(q) || (record.gudang_tujuan?.nama_gudang || record.gudang_asal?.nama_gudang || "").toLowerCase().includes(q);

      const matchesTab = activeTab === "SEMUA" || (activeTab === "INBOUND" && tipe === "inbound") || (activeTab === "OUTBOUND" && tipe === "outbound");

      return matchesSearch && matchesTab;
    });
  }, [allRecords, searchQuery, activeTab]);

  const inboundCount = useMemo(
    () => allRecords.filter((r) => (r.tipe || "").toLowerCase() === "inbound").length,
    [allRecords]
  );
  const outboundCount = useMemo(
    () => allRecords.filter((r) => (r.tipe || "").toLowerCase() === "outbound").length,
    [allRecords]
  );

  const totalInbound = inboundCount;
  const totalOutbound = outboundCount;
  const totalDelivery = allRecords.length;

  const stats = [
    {
      label: "Total Surat Jalan",
      value: totalDelivery,
      icon: FileText,
      bg: "bg-slate-50",
      text: "text-slate-700",
      iconColor: "text-slate-500",
    },
    {
      label: "Inbound",
      value: totalInbound,
      icon: ArrowDownLeft,
      bg: "bg-blue-50",
      text: "text-blue-700",
      iconColor: "text-blue-500",
    },
    {
      label: "Outbound",
      value: totalOutbound,
      icon: ArrowUpRight,
      bg: "bg-amber-50",
      text: "text-amber-700",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className={`${plusJakartaSans.className}`}>
      <div className="flex flex-1 flex-col p-6">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Surat Jalan</h1>
            <p className="mt-1 text-sm text-slate-500">Kelola dan verifikasi surat jalan inbound dan outbound.</p>
          </div>
        </header>

        {/* Tabs & Search */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            {[
              { key: "SEMUA", label: "Semua" },
              { key: "INBOUND", label: `Inbound (${inboundCount})` },
              { key: "OUTBOUND", label: `Outbound (${outboundCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab.key ? "bg-[#FF5500] text-white shadow-md shadow-orange-500/20" : "text-slate-600 hover:text-slate-900 hover:bg-white"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor surat jalan, project, atau lokasi..."
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={gudangFilter}
              onChange={(e) => setGudangFilter(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-orange-400"
            >
              <option value="all">Semua Gudang</option>
              {warehouses.map((w) => (
                <option key={w.gudang_id} value={String(w.gudang_id)}>
                  {w.nama_gudang}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-orange-400"
            >
              <option value="all">Semua Status</option>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-orange-400"
              />
            </div>
            <span className="text-slate-400 text-sm">sampai</span>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-orange-400"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tipe</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">No. Surat Jalan</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tanggal</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: 6 }).map((_, colIndex) => (
                        <td key={colIndex} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-rose-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <FileText size={28} className="mx-auto text-slate-300" />
                      <p className="mt-3 text-sm font-medium text-slate-600">Tidak ada data surat jalan</p>
                      <p className="mt-1 text-xs text-slate-400">Coba ubah filter atau kata pencarian.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const statusMeta = STATUS_META[record.status] || { label: record.status, bg: "bg-slate-100", text: "text-slate-600" };
                    const totalQty = record.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
                    const isOutbound = (record.tipe || "").toLowerCase() === "outbound";

                    return (
                      <tr key={record.surat_jalan_id} className="group transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isOutbound ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                            {isOutbound ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                            {isOutbound ? "Outbound" : "Inbound"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{record.nomor_surat_jalan}</p>
                          <p className="text-xs text-slate-400">{record.gudang_asal?.nama_gudang || record.gudang_tujuan?.nama_gudang || "-"}</p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{record.project?.nama_project || "-"}</p>
                          <p className="text-xs text-slate-400">
                            {[record.project?.area, record.gudang_asal?.nama_gudang || record.gudang_tujuan?.nama_gudang].filter(Boolean).join(" • ") || "-"}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-slate-500">{record.tanggal ? new Date(record.tanggal).toLocaleDateString("id-ID") : "-"}</td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.bg} ${statusMeta.text}`}>
                            {record.status === "draft_diajukan" && <Clock size={14} />}
                            {record.status === "menunggu_verifikasi" && <Clock size={14} />}
                            {record.status === "disetujui" && <CheckCircle2 size={14} />}
                            {record.status === "digenerate" && <Loader2 size={14} />}
                            {record.status === "diterima_didistribusikan" && <CheckCircle2 size={14} />}
                            {record.status === "sedang_dikirim" && <Truck size={14} />}
                            {record.status === "ditolak" && <AlertCircle size={14} />}
                            {statusMeta.label}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => setSelectedRecord(record)} title="Lihat detail" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                              <Eye size={15} />
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

        {/* Detail Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setSelectedRecord(null)}>
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              {/* Toolbar — hilang saat print */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Detail Surat Jalan</h2>
                  <p className="text-xs text-slate-500">{selectedRecord.nomor_surat_jalan}</p>
                </div>
                <button type="button" onClick={() => setSelectedRecord(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              {/* Dokumen Surat Jalan — ini yang ke-print */}
              <div className="p-6">
                <DetailSuratJalanDocument
                  data={selectedRecord}
                  variant="full"
                  renderItemAction={(item) => (
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      title="Lihat dokumentasi barang"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E8632C] bg-white px-4 py-2 text-xs font-semibold text-[#E8632C] shadow-sm transition hover:bg-[#E8632C] hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Cetak / PDF
                </button>
                <button type="button" onClick={() => setSelectedRecord(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setSelectedItem(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Dokumentasi Barang</h3>
                <p className="text-xs text-slate-500">{selectedItem.barang?.kode_perangkat} — {selectedItem.barang?.nama_barang}</p>
              </div>
              <button type="button" onClick={() => setSelectedItem(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Kondisi</p>
                  <p className="text-sm font-medium text-slate-900">{selectedItem.kondisi || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Qty</p>
                  <p className="text-sm font-medium text-slate-900">{Number(selectedItem.qty || 0)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Diperiksa Oleh</p>
                  <p className="text-sm font-medium text-slate-900">{selectedItem.diperiksa_oleh_user?.nama || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Waktu Verifikasi</p>
                  <p className="text-sm font-medium text-slate-900">{selectedItem.diperiksa_pada ? new Date(selectedItem.diperiksa_pada).toLocaleString("id-ID") : "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Foto Dokumentasi</p>
                {selectedItem.fotos && selectedItem.fotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedItem.fotos.map((foto: any) => (
                      <div key={foto.foto_id} className="overflow-hidden rounded-xl border border-slate-100">
                        <img src={foto.url} alt={foto.filename || "Foto barang"} className="h-32 w-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Belum ada foto dokumentasi untuk item ini.</p>
                )}
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => setSelectedItem(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                  Kembali ke Detail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          aside,
          header,
          nav {
            display: none !important;
          }
          main {
            margin-left: 0 !important;
            margin-top: 0 !important;
          }
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
