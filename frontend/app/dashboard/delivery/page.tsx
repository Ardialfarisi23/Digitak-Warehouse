"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Eye, X, ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, FileText, Loader2, AlertCircle, PackageCheck, Truck, ChevronDown } from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { DetailSuratJalanDocument, DetailSuratJalanData } from "@/components/surat-jalan/DetailSuratJalanDocument";
import { getItemFotoUrls } from "@/lib/surat-jalan-item-foto";
import { Button } from "@/components/ui/button";
import TablePagination from "@/components/TablePagination";

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
    status_aktif?: boolean;
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
  // Kolom teks bebas, sudah di-fallback-kan di backend
  kendaraan_teks?: string | null;
  no_polisi_teks?: string | null;
  driver_teks?: string | null;
  creator?: {
    nama: string;
  };
  approval_verification?: {
    approver_nama: string | null;
    waktu_verifikasi: string | null;
  } | null;
  estimasi_tiba?: string | null;
  catatan_distribusi?: string | null;
  dilaporkan_tiba_oleh?: { nama: string } | null;
  dilaporkan_tiba_at?: string | null;
  catatan_tiba?: string | null;
  dikonfirmasi_oleh?: { nama: string } | null;
  dikonfirmasi_at?: string | null;
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
    approval_verification?: {
      approver_nama: string | null;
      waktu_verifikasi: string | null;
    } | null;
    qty_diterima?: number | null;
    kondisi_diterima?: string | null;
    catatan_penerimaan?: string | null;
    qty_dipick_total?: number | null;
    kondisi_diambil_list?: { kondisi: string; qty: number }[];
  }[];
}

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  draft_diajukan: { label: "Draft Diajukan", bg: "bg-slate-100", text: "text-slate-700" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", bg: "bg-amber-50", text: "text-amber-700" },
  disetujui: { label: "Disetujui", bg: "bg-emerald-50", text: "text-emerald-700" },
  digenerate: { label: "Digenerate", bg: "bg-blue-50", text: "text-blue-700" },
  tiba_menunggu_konfirmasi: { label: "Menunggu Konfirmasi", bg: "bg-blue-50", text: "text-blue-700" },
  diterima_didistribusikan: { label: "Diterima / Didistribusikan", bg: "bg-emerald-50", text: "text-emerald-700" },
  sedang_dikirim: { label: "Sedang Dikirim", bg: "bg-amber-50", text: "text-amber-700" },
  ditolak: { label: "Ditolak", bg: "bg-rose-50", text: "text-rose-700" },
};

type TabType = "SEMUA" | "INBOUND" | "OUTBOUND";

export default function AdminDeliveryPage() {
  const { user } = useAuth();
  const { get, put } = useApi();

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
  const [warehouses, setWarehouses] = useState<{ gudang_id: number; nama_gudang: string; tipe?: string }[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [catatanKonfirmasi, setCatatanKonfirmasi] = useState("");
  const [page, setPage] = useState(1);
  const tableRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 25;

  useEffect(() => {
    if (!user) return;

    const currentRole = mapRole(user.role);

    if (currentRole !== "admin") {
      setToast({ message: "Anda tidak memiliki akses ke halaman ini.", type: "error" });

      setTimeout(() => {
        if (currentRole === "supervisor") {
          window.location.href = "/dashboard/supervisor";
        } else if (currentRole === "staff") {
          window.location.href = "/staff/dashboard";
        } else {
          window.location.href = "/dashboard";
        }
      }, 800);
    }
  }, [user]);

  useEffect(() => {
    get(`${API_BASE}/api/warehouses?limit=100`).then((r) => r.json()).then((json) => {
      setWarehouses(Array.isArray(json?.data) ? json.data.map((w: any) => ({ ...w, nama_gudang: w.nama_gudang + (w.tipe === "dadakan" ? " (Dadakan)" : "") })) : []);
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedRecord || selectedItem) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedRecord, selectedItem]);

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

  const handleDownloadPdf = async () => {
    if (!selectedRecord || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      const { downloadInboundPdf } = await import("@/lib/staff/inbound-pdf");
      const data = {
        id: String(selectedRecord.surat_jalan_id),
        nomor: selectedRecord.nomor_surat_jalan,
        namaProject: selectedRecord.project?.nama_project || "-",
        asalGudang: selectedRecord.gudang_asal?.nama_gudang || "-",
        tujuanGudang: selectedRecord.gudang_tujuan?.nama_gudang || "-",
        kendaraan: selectedRecord.kendaraan_teks || selectedRecord.kendaraan?.jenis_kendaraan || "-",
        noPolisi: selectedRecord.no_polisi_teks || selectedRecord.kendaraan?.no_polisi || "-",
        namaDriver: selectedRecord.driver_teks || selectedRecord.personil_pengantar?.nama || "-",
        namaPicPemohon: (selectedRecord as any).pic_pemohon_nama || "-",
        tanggal: selectedRecord.tanggal
          ? new Date(selectedRecord.tanggal).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : "-",
        items: selectedRecord.items.map((item) => ({
          kodeBarang: item.barang.kode_perangkat,
          namaBarang: item.barang.nama_barang,
          qtyDiminta: item.qty,
          qtyDiterima: item.qty,
          kondisi: item.kondisi || "",
          serialNumbers: [],
        })),
        status: (selectedRecord as any).status || "MENUNGGU_VERIFIKASI",
      } as any;

      await downloadInboundPdf(data, (selectedRecord as any).creator?.nama || "-");
    } catch (err) {
      console.error("Gagal generate PDF:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleConfirmDistributed = async () => {
    if (!selectedRecord) return;
    setConfirming(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const payload: Record<string, unknown> = {};
      if (catatanKonfirmasi.trim()) payload.catatan_konfirmasi = catatanKonfirmasi.trim();

      const res = await put(
        `${baseUrl}/api/surat-jalan/${selectedRecord.surat_jalan_id}/confirm-distributed`,
        payload
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal mengonfirmasi distribusi.");
      }

      setToast({ message: "Surat jalan berhasil dikonfirmasi diterima.", type: "success" });
      setCatatanKonfirmasi("");
      setSelectedRecord({ ...selectedRecord, status: "diterima_didistribusikan" } as SuratJalanRecord);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Gagal mengonfirmasi.", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setConfirming(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRecords = filteredRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery, gudangFilter, statusFilter, startDate, endDate]);

  return (
      <div>
      <div className="flex flex-1 flex-col p-6">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Surat Jalan</h1>
            <p className="mt-1 text-sm text-slate-500">Kelola dan verifikasi surat jalan inbound dan outbound.</p>
          </div>
        </header>

        {/* Tabs & Search */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex w-full max-w-full md:w-auto flex-nowrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { key: "SEMUA", label: "Semua" },
              { key: "INBOUND", label: `Inbound (${inboundCount})` },
              { key: "OUTBOUND", label: `Outbound (${outboundCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex shrink-0 whitespace-nowrap min-h-10 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === tab.key ? "bg-[#FF5500] text-white shadow-md shadow-orange-500/20" : "text-slate-600 hover:text-slate-900 hover:bg-white"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
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
        <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
          <div className="relative min-w-0">
            <select
              value={gudangFilter}
              onChange={(e) => setGudangFilter(e.target.value)}
              className="w-full md:w-auto min-w-0 truncate appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-orange-400"
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

          <div className="relative min-w-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-auto min-w-0 truncate appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-orange-400"
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

          <div className="col-span-2 grid grid-cols-1 gap-2 md:col-span-1 md:flex md:items-center md:w-auto">
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-w-0 md:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-orange-400"
              />
            </div>
            <span className="text-slate-400 text-sm hidden md:inline">sampai</span>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-w-0 md:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-orange-400"
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
        <div ref={tableRef} className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full md:min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap hidden md:table-cell">Tipe</th>
                  <th className="px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap w-full md:w-auto">No. Surat Jalan</th>
                  <th className="px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap hidden md:table-cell">Project</th>
                  <th className="px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap hidden md:table-cell">Tanggal</th>
                  <th className="px-2 py-3 md:px-6 md:py-4 text-[10px] md:text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap hidden md:table-cell">Status</th>
                  <th className="px-2 py-3 md:px-4 md:py-4 text-right text-[10px] md:text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap w-12 md:w-auto">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: 6 }).map((_, colIndex) => (
                        <td key={colIndex} className="px-3 py-3 md:px-6 md:py-4">
                          <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-3 md:px-6 md:py-16 text-center text-sm text-rose-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-3 md:px-6 md:py-16 text-center">
                      <FileText size={28} className="mx-auto text-slate-300" />
                      <p className="mt-3 text-sm font-medium text-slate-600">Tidak ada data surat jalan</p>
                      <p className="mt-1 text-xs text-slate-400">Coba ubah filter atau kata pencarian.</p>
                    </td>
                  </tr>
                ) : (
                  pagedRecords.map((record) => {
                    const statusMeta = STATUS_META[record.status] || { label: record.status, bg: "bg-slate-100", text: "text-slate-600" };
                    const totalQty = record.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
                    const isOutbound = (record.tipe || "").toLowerCase() === "outbound";

                    return (
                      <tr key={record.surat_jalan_id} className="group transition-colors hover:bg-slate-50">
                        <td className="px-2 py-3 md:px-6 md:py-4 hidden md:table-cell">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isOutbound ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                            {isOutbound ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                            {isOutbound ? "Outbound" : "Inbound"}
                          </span>
                        </td>

                        <td className="px-2 py-3 md:px-6 md:py-4 w-full md:w-auto break-words">
                          <p className="text-sm md:text-base font-medium text-slate-900 break-words">{record.nomor_surat_jalan}</p>
                          <p className="text-xs text-slate-400">{record.gudang_asal?.nama_gudang || record.gudang_tujuan?.nama_gudang || "-"}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 md:hidden">
                            <span className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isOutbound ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                              {isOutbound ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                              {isOutbound ? "Outbound" : "Inbound"}
                            </span>
                            <span className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta.bg} ${statusMeta.text}`}>
                              {statusMeta.label}
                            </span>
                            <span>{record.project?.nama_project || "-"}</span>
                            <span>{record.tanggal ? new Date(record.tanggal).toLocaleDateString("id-ID") : "-"}</span>
                          </div>
                        </td>

                        <td className="px-2 py-3 md:px-6 md:py-4 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{record.project?.nama_project || "-"}</span>
                            {record.project?.status_aktif === false && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                                <AlertCircle size={10} />
                                Project Nonaktif
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {[record.project?.area, record.gudang_asal?.nama_gudang || record.gudang_tujuan?.nama_gudang].filter(Boolean).join(" • ") || "-"}
                          </p>
                        </td>

                        <td className="px-2 py-3 md:px-6 md:py-4 hidden md:table-cell text-slate-500">{record.tanggal ? new Date(record.tanggal).toLocaleDateString("id-ID") : "-"}</td>

                        <td className="px-2 py-3 md:px-6 md:py-4 hidden md:table-cell">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.bg} ${statusMeta.text}`}>
                            {record.status === "draft_diajukan" && <Clock size={14} />}
                            {record.status === "menunggu_verifikasi" && <Clock size={14} />}
                            {record.status === "disetujui" && <CheckCircle2 size={14} />}
                            {record.status === "digenerate" && <Loader2 size={14} />}
                            {record.status === "tiba_menunggu_konfirmasi" && <Clock size={14} />}
                            {record.status === "diterima_didistribusikan" && <CheckCircle2 size={14} />}
                            {record.status === "sedang_dikirim" && <Truck size={14} />}
                            {record.status === "ditolak" && <AlertCircle size={14} />}
                            {statusMeta.label}
                          </span>
                        </td>

                        <td className="px-1 py-3 md:px-6 md:py-4 w-12 md:w-auto">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => setSelectedRecord(record)} title="Lihat detail" className="min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
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
          <TablePagination
            page={safePage}
            pageSize={PAGE_SIZE}
            total={filteredRecords.length}
            onPageChange={(p) => {
              setPage(p);
              tableRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
            }}
          />
        </div>

{/* Detail Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-0 sm:p-3 md:p-4" onClick={() => setSelectedRecord(null)}>
            <div className="w-full h-[100dvh] max-h-[100dvh] sm:w-[min(92vw,720px)] sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-xl md:max-w-3xl lg:max-w-4xl md:h-auto md:max-h-[calc(100dvh-1rem)] md:rounded-2xl overflow-y-auto overscroll-contain bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              {/* Toolbar — hilang saat print, sticky di mobile */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 bg-white print:hidden">
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold text-slate-900">Detail Surat Jalan</h2>
                  <p className="break-all text-xs text-slate-500">{selectedRecord.nomor_surat_jalan}</p>
                </div>
                <button type="button" onClick={() => setSelectedRecord(null)} className="flex-shrink-0 min-h-[40px] min-w-[40px] rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              {/* Dokumen Surat Jalan — untuk tampilan di layar */}
              <div className="p-3 sm:p-4 md:p-8 pb-[env(safe-area-inset-bottom)]">
                <DetailSuratJalanDocument
                  data={selectedRecord as DetailSuratJalanData | null | undefined}
                  variant="full"
                  renderItemAction={(item) => (
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      title="Lihat dokumentasi barang"
                      className="min-h-[40px] min-w-[40px] rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                />
              </div>

              {selectedRecord?.status === "tiba_menunggu_konfirmasi" && (
                <div className="mx-6 mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">Laporan Barang Sampai</p>
                  {selectedRecord.dilaporkan_tiba_oleh?.nama && (
                    <p className="text-sm text-blue-800">Dilaporkan oleh: {selectedRecord.dilaporkan_tiba_oleh.nama}</p>
                  )}
                  {selectedRecord.dilaporkan_tiba_at && (
                    <p className="text-sm text-blue-800">Waktu: {new Date(selectedRecord.dilaporkan_tiba_at).toLocaleString("id-ID")}</p>
                  )}
                  {selectedRecord.catatan_tiba && (
                    <p className="mt-1 text-sm text-blue-700">Catatan: {selectedRecord.catatan_tiba}</p>
                  )}
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-1">Detail Penerimaan vs Pick</p>
                    <div className="space-y-1">
                      {selectedRecord.items.map((item) => {
                        const totalPick = item.qty_dipick_total ?? 0;
                        const qtyDiterima = item.qty_diterima ?? null;
                        const kondisiDiterima = item.kondisi_diterima || item.kondisi || "-";
                        const kondisiList = item.kondisi_diambil_list || [];
                        const kondisiText = kondisiList.map((k) => `${k.kondisi} (${k.qty})`).join(", ") || "-";
                        const isQtyMismatch = qtyDiterima !== null && qtyDiterima !== totalPick;
                        const isKondisiMismatch = item.kondisi_diterima && !kondisiList.some((k) => k.kondisi === item.kondisi_diterima);
                        const hasMismatch = isQtyMismatch || isKondisiMismatch;
                        return (
                          <div key={item.item_id} className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${hasMismatch ? "bg-amber-50 text-amber-800" : "text-blue-800"}`}>
                            <span>{item.barang?.nama_barang || "-"}</span>
                            <span className="text-xs">
                              <span className={hasMismatch ? "font-semibold text-amber-700" : ""}>Diterima: {qtyDiterima ?? totalPick} {kondisiDiterima}</span>
                              <span className="mx-2 text-blue-400">|</span>
                              <span className="text-blue-600">Pick: {totalPick} {kondisiText}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-6 sm:py-4 print:hidden">
                {selectedRecord?.status === "tiba_menunggu_konfirmasi" && (
                  <div className="mr-auto flex flex-col gap-2 min-w-[200px]">
                    <p className="text-xs font-semibold text-slate-500">Konfirmasi Penerimaan (SPV)</p>
                    <textarea
                      value={catatanKonfirmasi}
                      onChange={(e) => setCatatanKonfirmasi(e.target.value)}
                      placeholder="Catatan konfirmasi (wajib jika ada selisih)"
                      className="w-full sm:w-80 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                      rows={2}
                    />
                    <Button
                      disabled={confirming}
                      onClick={handleConfirmDistributed}
                      className="h-auto rounded-xl bg-[#E8632C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
                    >
                      {confirming ? "Mengonfirmasi..." : "Konfirmasi Diterima"}
                    </Button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E8632C] bg-white px-4 py-2 text-xs font-semibold text-[#E8632C] shadow-sm transition hover:bg-[#E8632C] hover:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isGeneratingPdf ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  )}
                  {isGeneratingPdf ? "Mengenerate..." : "Download PDF"}
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
                  <p className="text-sm font-medium text-slate-900">
                    {selectedRecord?.approval_verification?.approver_nama ||
                      selectedItem.diperiksa_oleh_user?.nama ||
                      "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Waktu Verifikasi</p>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedRecord?.approval_verification?.waktu_verifikasi
                      ? new Date(selectedRecord.approval_verification.waktu_verifikasi).toLocaleString("id-ID")
                      : selectedItem.diperiksa_pada
                        ? new Date(selectedItem.diperiksa_pada).toLocaleString("id-ID")
                        : "-"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Foto Dokumentasi</p>
                {(() => {
                  const fotoUrls = getItemFotoUrls(selectedItem);
                  if (fotoUrls.length === 0) {
                    return <p className="text-xs text-slate-400">Belum ada foto dokumentasi untuk item ini.</p>;
                  }
                  return (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {fotoUrls.map((url, idx) => (
                        <div key={idx} className="overflow-hidden rounded-xl border border-slate-100">
                          <img src={url} alt={`Foto barang ${idx + 1}`} className="h-32 w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  );
                })()}
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

    {toast && (
      <div
        className={`fixed right-6 top-6 z-[130] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${
          toast.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-rose-200 bg-rose-50 text-rose-800"
        }`}
      >
        <AlertCircle size={17} className="shrink-0" />
        <span className="text-[13px] font-semibold">{toast.message}</span>
      </div>
    )}
  </div>
);
}
