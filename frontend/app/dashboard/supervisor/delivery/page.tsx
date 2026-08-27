"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X, Eye, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useApi } from "@/lib/api";

type ActiveTab = "SEMUA" | "INBOUND" | "OUTBOUND";

const STATUS_DELIVERY_LABEL: Record<string, string> = {
  disetujui: "Disetujui",
  digenerate: "Digenerate",
  diterima_didistribusikan: "Diterima / Didistribusikan",
  draft_diajukan: "Draft Diajukan",
};

const STATUS_DELIVERY_BADGE: Record<string, string> = {
  disetujui: "bg-emerald-50 text-emerald-700 border-emerald-200",
  digenerate: "bg-blue-50 text-blue-700 border-blue-200",
  diterima_didistribusikan: "bg-indigo-50 text-indigo-700 border-indigo-200",
  draft_diajukan: "bg-slate-100 text-slate-700 border-slate-200",
};

interface BaseRow {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: string;
  tipe: "inbound" | "outbound";
  personil_pengantar?: { nama?: string } | null;
  kendaraan?: { jenis_kendaraan?: string; no_polisi?: string } | null;
}

interface DeliveryItem {
  item_id: number;
  qty: number;
  kondisi?: string | null;
  serial_number?: string | null;
  catatan?: string | null;
  barang?: { nama_barang?: string; kode_perangkat?: string; satuan_default?: { kode_satuan?: string } } | null;
  satuan?: { kode_satuan?: string } | null;
}

interface DeliveryDetail extends BaseRow {
  tanggal?: string;
  tanggal_disetujui?: string;
  tanggal_digenerate?: string;
  tanggal_diterima?: string;
  catatan?: string | null;
  project?: { nama_project?: string; area?: string } | null;
  gudang_asal?: { nama_gudang?: string } | null;
  gudang_tujuan?: { nama_gudang?: string } | null;
  items?: DeliveryItem[];
}

export default function SupervisorDeliveryPage() {
  const { get } = useApi();
  const [activeTab, setActiveTab] = useState<ActiveTab>("SEMUA");
  const [dataList, setDataList] = useState<BaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<DeliveryDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      let outboundData: BaseRow[] = [];
      let inboundData: BaseRow[] = [];

      if (activeTab === "SEMUA" || activeTab === "OUTBOUND") {
        const outboundRes = await get(`${baseUrl}/api/surat-jalan/outbound/delivery?${params.toString()}`);
        if (!outboundRes.ok) {
          throw new Error("Gagal mengambil data outbound delivery.");
        }
        const outboundJson = await outboundRes.json();
        const outboundResult = outboundJson?.data ?? outboundJson ?? {};
        const outboundList = Array.isArray(outboundResult.data)
          ? outboundResult.data
          : Array.isArray(outboundResult)
            ? outboundResult
            : [];
        outboundData = outboundList.map((item) => ({ ...(item as BaseRow), tipe: "outbound" as const }));
      }

      if (activeTab === "SEMUA" || activeTab === "INBOUND") {
        const inboundRes = await get(`${baseUrl}/api/surat-jalan/inbound?${params.toString()}`);
        if (!inboundRes.ok) {
          throw new Error("Gagal mengambil data inbound.");
        }
        const inboundJson = await inboundRes.json();
        const inboundResult = inboundJson?.data ?? inboundJson ?? {};
        const inboundList = Array.isArray(inboundResult.data)
          ? inboundResult.data
          : Array.isArray(inboundResult)
            ? inboundResult
            : [];
        inboundData = inboundList.map((item) => ({ ...(item as BaseRow), tipe: "inbound" as const }));
      }

      const combined = activeTab === "SEMUA" ? [...outboundData, ...inboundData] : activeTab === "OUTBOUND" ? outboundData : inboundData;
      setDataList(combined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.");
    } finally {
      setIsLoading(false);
    }
  }, [get, activeTab, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const closeDetail = useCallback(() => {
    setSelectedDetail(null);
    setDetailError(null);
  }, []);

  // Shortcut tombol ESC untuk menutup Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDetail]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dataList;
    return dataList.filter((item) => {
      return (
        item.nomor_surat_jalan.toLowerCase().includes(q) ||
        (item.personil_pengantar?.nama || "").toLowerCase().includes(q) ||
        (item.kendaraan?.jenis_kendaraan || "").toLowerCase().includes(q) ||
        (item.kendaraan?.no_polisi || "").toLowerCase().includes(q)
      );
    });
  }, [dataList, searchQuery]);

  const getStatusLabel = (status: string) => {
    return STATUS_DELIVERY_LABEL[status] || status;
  };

  const getStatusBadge = (status: string) => {
    return STATUS_DELIVERY_BADGE[status] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  const openDetail = async (row: BaseRow) => {
    setSelectedDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await get(`${baseUrl}/api/surat-jalan/${row.surat_jalan_id}`);
      if (!response.ok) {
        throw new Error("Gagal mengambil detail surat jalan.");
      }
      const json = await response.json();
      const data = json?.data ?? json ?? null;
      setSelectedDetail({ ...(data as DeliveryDetail), tipe: row.tipe });
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat detail.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-[#F8F6F0] min-h-screen text-slate-800 w-full overflow-x-hidden">
      {/* HEADER SECTION */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Tracking Pengiriman Surat Jalan
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitoring Surat Jalan inbound dan outbound yang telah disetujui.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 mb-6">
          {error}
          <button
            onClick={fetchData}
            className="ml-3 rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2 bg-stone-200/50 p-1.5 rounded-2xl w-fit">
          {(["SEMUA", "INBOUND", "OUTBOUND"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? "bg-[#FF5500] text-white shadow-md shadow-orange-500/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-stone-200/60"
              }`}
            >
              {tab === "SEMUA" ? "Semua" : tab === "INBOUND" ? "Inbound" : "Outbound"}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari No. Surat Jalan / Driver / Kendaraan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500]/50 shadow-sm transition"
          />
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm w-full overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-3 md:px-4 w-[11%]">Tipe</th>
                <th className="py-4 px-3 md:px-4 w-[24%]">No. Surat Jalan</th>
                <th className="py-4 px-3 md:px-4 w-[18%]">Driver</th>
                <th className="py-4 px-3 md:px-4 w-[18%]">Kendaraan</th>
                <th className="py-4 px-3 md:px-4 w-[16%]">Status</th>
                <th className="py-4 px-2 md:px-3 w-[13%] text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs md:text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                    <p className="mt-2 text-sm">Memuat data surat jalan...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    Tidak ada data Surat Jalan yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.surat_jalan_id} className="hover:bg-stone-50/60 transition cursor-pointer" onClick={() => openDetail(item)}>
                    <td className="py-4 px-3 md:px-4">
                      {item.tipe === "outbound" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <ArrowUpRight size={12} /> Outbound
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <ArrowDownLeft size={12} /> Inbound
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-3 md:px-4 font-semibold text-slate-900 break-words">
                      <div className="flex items-center gap-2">
                        {item.nomor_surat_jalan}
                        <Eye size={14} className="text-slate-400" />
                      </div>
                    </td>
                    <td className="py-4 px-3 md:px-4">
                      {item.personil_pengantar?.nama || "-"}
                    </td>
                    <td className="py-4 px-3 md:px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {item.kendaraan?.jenis_kendaraan || "-"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.kendaraan?.no_polisi || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-3 md:px-4">
                      <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-lg ${getStatusBadge(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="py-4 px-2 md:px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(item);
                        }}
                        className="inline-flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl shadow-sm transition"
                        title="Lihat Detail"
                      >
                        <Eye size={13} /> Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETAIL TRACKING — Berbentuk Surat */}
      {selectedDetail && (
<<<<<<< Updated upstream
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6"
          onClick={closeDetail}
        >
          <div
            className="relative bg-[#F8F6F0] rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER (STICKY AT TOP) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200/80 bg-[#F8F6F0] shrink-0 z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      selectedDetail.tipe?.toLowerCase() === "outbound"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-blue-100 text-blue-800 border border-blue-200"
                    }`}
                  >
                    {selectedDetail.tipe?.toLowerCase() === "outbound" ? (
                      <>
                        <ArrowUpRight size={12} /> Outbound
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft size={12} /> Inbound
                      </>
                    )}
                  </span>
                  <span
                    className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                      selectedDetail.status
                    )}`}
                  >
                    {getStatusLabel(selectedDetail.status)}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  {selectedDetail.nomor_surat_jalan}
                </h2>
              </div>
              <button
                onClick={closeDetail}
                className="p-2 rounded-2xl bg-white border border-stone-200/80 hover:bg-stone-100 text-slate-500 hover:text-slate-800 transition shadow-sm"
                title="Tutup Modal (ESC)"
=======
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col my-8">

            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedDetail.tipe.toLowerCase() === "outbound" ? "Surat Jalan" : "Bukti Penerimaan Barang"}
                </h3>
                <p className="text-xs text-slate-500">{selectedDetail.nomor_surat_jalan}</p>
              </div>
              <button
                onClick={closeDetail}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
>>>>>>> Stashed changes
              >
                <X size={18} />
              </button>
            </div>

<<<<<<< Updated upstream
            {/* MODAL BODY (SCROLLABLE AREA) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {detailError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-center justify-between">
                  <span>{detailError}</span>
                  <button
                    onClick={() => openDetail(selectedDetail)}
                    className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition"
                  >
                    Coba Lagi
                  </button>
=======
            {detailError && (
              <div className="mx-6 mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 print:hidden">
                {detailError}
                <button
                  onClick={() => openDetail(selectedDetail)}
                  className="ml-3 rounded-lg border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {isDetailLoading ? (
              <div className="py-12 text-center text-slate-500">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                <p className="mt-2 text-sm">Memuat detail...</p>
              </div>
            ) : (
              <>
                {/* Scrollable Body */}
                <div className="overflow-y-auto p-6">
                  {(() => {
                    const isOutbound = selectedDetail.tipe.toLowerCase() === "outbound";
                    const accentBorderTop = isOutbound ? "border-[#E8632C]" : "border-emerald-600";
                    const docBorder = isOutbound ? "border-[#F3D9C7]" : "border-[#C7E8D9]";
                    const headBg = isOutbound ? "bg-[#FFF7ED]" : "bg-emerald-50";
                    const headBorder = isOutbound ? "border-[#F3D9C7]" : "border-[#C7E8D9]";
                    const headText = isOutbound ? "text-[#9a3412]" : "text-emerald-900";
                    const accentText = isOutbound ? "text-[#E8632C]" : "text-emerald-700";
                    const titleDoc = isOutbound ? "SURAT JALAN" : "BUKTI PENERIMAAN BARANG";
                    const subtitleDoc = isOutbound
                      ? "Surat Jalan Internal — Digitak Studio"
                      : "Inbound Receipt — Digitak Studio";

                    return (
                      <div
                        id="delivery-document"
                        className={`mx-auto max-w-3xl rounded-2xl border ${docBorder} bg-white p-10 print:rounded-none print:border-0 print:p-0`}
                      >
                        {/* Kop Surat */}
                        <div className={`mb-8 flex items-start justify-between border-b-2 ${accentBorderTop} pb-6`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/logo digitak grdasi.png"
                            alt="Digitak Studio — PT Metanouva Informatika"
                            className="h-16 w-auto object-contain"
                          />
                          <div className="flex flex-col items-end">
                            <h2 className="text-3xl font-bold tracking-wide text-gray-900">{titleDoc}</h2>
                            <p className="mt-1 text-xs text-gray-500">{subtitleDoc}</p>
                            <div className="mt-2 text-right">
                              <p className={`text-xs font-bold ${accentText}`}>PT Metanouva Informatika</p>
                              <p className="text-[10px] text-gray-400">Digitak Studio</p>
                            </div>
                          </div>
                        </div>

                        {/* Info Grid — 2 kolom */}
                        <div className="mb-8 grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
                          <div className="space-y-3">
                            <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                              <span className="text-gray-500">No. Dokumen</span>
                              <span className="text-gray-500">:</span>
                              <span className="font-semibold text-gray-900">{selectedDetail.nomor_surat_jalan || "-"}</span>
                            </div>
                            <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                              <span className="text-gray-500">Tipe</span>
                              <span className="text-gray-500">:</span>
                              <span className="font-semibold text-gray-900">{isOutbound ? "Outbound" : "Inbound"}</span>
                            </div>
                            <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                              <span className="text-gray-500">Gudang Asal</span>
                              <span className="text-gray-500">:</span>
                              <span className="font-semibold text-gray-900">{selectedDetail.gudang_asal?.nama_gudang || "-"}</span>
                            </div>
                            <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                              <span className="text-gray-500">Gudang Tujuan</span>
                              <span className="text-gray-500">:</span>
                              <span className="font-semibold text-gray-900">{selectedDetail.gudang_tujuan?.nama_gudang || "-"}</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                              <span className="text-gray-500">Tanggal</span>
                              <span className="text-gray-500">:</span>
                              <span className="font-semibold text-gray-900">{formatDate(selectedDetail.tanggal_disetujui || selectedDetail.tanggal)}</span>
                            </div>
                            <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                              <span className="text-gray-500">Project</span>
                              <span className="text-gray-500">:</span>
                              <span className="font-semibold text-gray-900">{selectedDetail.project?.nama_project || "-"}</span>
                            </div>
                            <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                              <span className="text-gray-500">Driver</span>
                              <span className="text-gray-500">:</span>
                              <span className="font-semibold text-gray-900">{selectedDetail.personil_pengantar?.nama || "-"}</span>
                            </div>
                            <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                              <span className="text-gray-500">Kendaraan</span>
                              <span className="text-gray-500">:</span>
                              <span className="font-semibold text-gray-900">
                                {selectedDetail.kendaraan?.jenis_kendaraan || "-"}
                                {selectedDetail.kendaraan?.no_polisi && (
                                  <span className="ml-1 text-gray-400 font-normal">({selectedDetail.kendaraan.no_polisi})</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Catatan */}
                        {selectedDetail.catatan && (
                          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
                            <div className="text-xs text-amber-900">
                              <span className="font-semibold block mb-0.5">Catatan:</span>
                              {selectedDetail.catatan}
                            </div>
                          </div>
                        )}

                        {/* Tabel Barang */}
                        <table className="mb-10 w-full border-collapse text-sm">
                          <thead>
                            <tr className={headBg}>
                              <th className={`border ${headBorder} px-3 py-2 text-left font-semibold ${headText}`}>No</th>
                              <th className={`border ${headBorder} px-3 py-2 text-left font-semibold ${headText}`}>Kode Barang</th>
                              <th className={`border ${headBorder} px-3 py-2 text-left font-semibold ${headText}`}>Nama Barang</th>
                              <th className={`border ${headBorder} px-3 py-2 text-center font-semibold ${headText}`}>QTY</th>
                              <th className={`border ${headBorder} px-3 py-2 text-center font-semibold ${headText}`}>UOM</th>
                              <th className={`border ${headBorder} px-3 py-2 text-left font-semibold ${headText}`}>Serial Number</th>
                              <th className={`border ${headBorder} px-3 py-2 text-left font-semibold ${headText}`}>Kondisi / Catatan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDetail.items && selectedDetail.items.length > 0 ? (
                              selectedDetail.items.map((it, idx) => (
                                <tr key={it.item_id || idx} className="even:bg-gray-50">
                                  <td className="border border-gray-200 px-3 py-2.5 text-gray-600">{idx + 1}</td>
                                  <td className="border border-gray-200 px-3 py-2.5 font-medium text-gray-900">
                                    {it.barang?.kode_perangkat || "-"}
                                  </td>
                                  <td className="border border-gray-200 px-3 py-2.5">{it.barang?.nama_barang || "-"}</td>
                                  <td className="border border-gray-200 px-3 py-2.5 text-center font-semibold">{it.qty}</td>
                                  <td className="border border-gray-200 px-3 py-2.5 text-center">
                                    {it.satuan?.kode_satuan || it.barang?.satuan_default?.kode_satuan || "-"}
                                  </td>
                                  <td className="border border-gray-200 px-3 py-2.5 font-mono text-xs text-gray-500">
                                    {it.serial_number || "-"}
                                  </td>
                                  <td className="border border-gray-200 px-3 py-2.5 text-gray-500">
                                    {[it.kondisi, it.catatan].filter(Boolean).join(" / ") || "-"}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="border border-gray-200 px-3 py-6 text-center text-gray-400">
                                  Tidak ada rincian barang.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                        {/* Tanda Tangan */}
                        <div className="mb-8 grid grid-cols-3 gap-6 text-center text-sm">
                          <div>
                            <p className="mb-16 font-medium text-gray-700">Material Handler</p>
                            <div className="border-t border-gray-400 pt-1">
                              <p className="font-semibold text-gray-900">-</p>
                            </div>
                          </div>
                          <div>
                            <p className="mb-16 font-medium text-gray-700">Driver</p>
                            <div className="border-t border-gray-400 pt-1">
                              <p className="font-semibold text-gray-900">
                                {selectedDetail.personil_pengantar?.nama || "-"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="mb-16 font-medium text-gray-700">Penerima</p>
                            <div className="border-t border-gray-400 pt-1">
                              <p className="font-semibold text-gray-900">-</p>
                            </div>
                          </div>
                        </div>

                        {/* Footer Dokumen */}
                        <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-[10px] text-gray-400">
                          <span>{selectedDetail.nomor_surat_jalan} | {formatDate(selectedDetail.tanggal_disetujui || selectedDetail.tanggal)}</span>
                          <span>Sistem Manajemen Gudang — Digitak Studio</span>
                        </div>
                      </div>
                    );
                  })()}
>>>>>>> Stashed changes
                </div>
              )}

<<<<<<< Updated upstream
              {isDetailLoading ? (
                <div className="py-16 text-center text-slate-500">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-stone-300 border-t-[#FF5500]" />
                  <p className="mt-3 text-sm font-medium">Memuat detail pengiriman...</p>
                </div>
              ) : (
                <>
                  {/* INFORMASI PENGIRIMAN (GRID CARD) */}
                  <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Informasi Pengiriman
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                      {/* RUTE GUDANG */}
                      <div className="md:col-span-3 bg-stone-50 border border-stone-200/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            Gudang Asal
                          </span>
                          <p className="font-semibold text-slate-900">
                            {selectedDetail.gudang_asal?.nama_gudang || "-"}
                          </p>
                        </div>
                        <div className="text-slate-400 font-bold hidden sm:block">→</div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            Gudang Tujuan
                          </span>
                          <p className="font-semibold text-slate-900">
                            {selectedDetail.gudang_tujuan?.nama_gudang || "-"}
                          </p>
                        </div>
                      </div>

                      {/* DETAILS ROW 1 */}
                      <div className="space-y-0.5">
                        <span className="text-xs text-slate-400">Driver / Logistik</span>
                        <p className="font-semibold text-slate-800">
                          {selectedDetail.personil_pengantar?.nama || "-"}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-xs text-slate-400">Armada / Plat</span>
                        <p className="font-semibold text-slate-800">
                          {selectedDetail.kendaraan?.jenis_kendaraan || "-"}
                          {selectedDetail.kendaraan?.no_polisi && (
                            <span className="text-xs font-normal text-slate-500 ml-1.5 bg-stone-100 px-2 py-0.5 rounded-md">
                              {selectedDetail.kendaraan.no_polisi}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-xs text-slate-400">Project / Area</span>
                        <p className="font-semibold text-slate-800">
                          {selectedDetail.project?.nama_project || "-"}
                          {selectedDetail.project?.area && (
                            <span className="text-xs font-normal text-slate-500 block">
                              Area: {selectedDetail.project.area}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* DETAILS ROW 2 - TIMESTAMPS */}
                      <div className="space-y-0.5 pt-2 border-t border-stone-100">
                        <span className="text-xs text-slate-400">Tgl Disetujui</span>
                        <p className="font-semibold text-slate-800">
                          {formatDate(selectedDetail.tanggal_disetujui)}
                        </p>
                      </div>

                      <div className="space-y-0.5 pt-2 border-t border-stone-100">
                        <span className="text-xs text-slate-400">Tgl Digenerate</span>
                        <p className="font-semibold text-slate-800">
                          {formatDate(selectedDetail.tanggal_digenerate)}
                        </p>
                      </div>

                      <div className="space-y-0.5 pt-2 border-t border-stone-100">
                        <span className="text-xs text-slate-400">Tgl Diterima</span>
                        <p className="font-semibold text-slate-800">
                          {formatDate(selectedDetail.tanggal_diterima)}
                        </p>
                      </div>
                    </div>

                    {selectedDetail.catatan && (
                      <div className="mt-4 rounded-xl bg-amber-50/70 border border-amber-200/60 p-3">
                        <span className="text-xs font-bold text-amber-900 block mb-0.5">
                          Catatan Pengiriman:
                        </span>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          {selectedDetail.catatan}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* BARANG YANG DIBAWA (TABLE CARD) */}
                  <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Barang yang Dibawa
                      </h3>
                      <span className="text-xs font-semibold text-slate-500 bg-stone-100 px-2.5 py-0.5 rounded-full">
                        Total: {selectedDetail.items?.length || 0} Item
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-stone-200/70">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-stone-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-stone-200/80">
                            <tr>
                              <th className="px-3.5 py-2.5">Kode</th>
                              <th className="px-3.5 py-2.5">Nama Barang</th>
                              <th className="px-3.5 py-2.5 text-center">Satuan</th>
                              <th className="px-3.5 py-2.5 text-center">Qty</th>
                              <th className="px-3.5 py-2.5">Kondisi</th>
                              <th className="px-3.5 py-2.5">Serial Number</th>
                              <th className="px-3.5 py-2.5">Catatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-slate-700">
                            {selectedDetail.items && selectedDetail.items.length > 0 ? (
                              selectedDetail.items.map((it, idx) => (
                                <tr key={it.item_id || idx} className="hover:bg-stone-50/60 transition">
                                  <td className="px-3.5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                                    {it.barang?.kode_perangkat || "-"}
                                  </td>
                                  <td className="px-3.5 py-3 font-medium text-slate-800">
                                    {it.barang?.nama_barang || `Item ${idx + 1}`}
                                  </td>
                                  <td className="px-3.5 py-3 text-center text-slate-500">
                                    {it.satuan?.kode_satuan || it.barang?.satuan_default?.kode_satuan || "-"}
                                  </td>
                                  <td className="px-3.5 py-3 text-center font-bold text-slate-900 bg-stone-50/50">
                                    {it.qty}
                                  </td>
                                  <td className="px-3.5 py-3">
                                    {it.kondisi ? (
                                      <span className="px-2 py-0.5 text-[10px] rounded-md font-medium bg-slate-100 text-slate-700 capitalize border border-slate-200">
                                        {it.kondisi}
                                      </span>
                                    ) : (
                                      "-"
                                    )}
                                  </td>
                                  <td className="px-3.5 py-3 font-mono text-slate-600">
                                    {it.serial_number || "-"}
                                  </td>
                                  <td className="px-3.5 py-3 text-slate-500 max-w-xs truncate">
                                    {it.catatan || "-"}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                  Tidak ada rincian barang untuk surat jalan ini.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-3 border-t border-stone-200/80 bg-[#F8F6F0] flex justify-end shrink-0">
              <button
                onClick={closeDetail}
                className="px-4 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-slate-700 font-semibold text-xs rounded-xl shadow-sm transition"
              >
                Tutup
              </button>
            </div>
=======
                {/* Action Bar */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 print:hidden">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getStatusBadge(selectedDetail.status)}`}>
                      {getStatusLabel(selectedDetail.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold shadow-sm transition ${
                        selectedDetail.tipe.toLowerCase() === "outbound"
                          ? "border-[#E8632C] bg-white text-[#E8632C] hover:bg-[#E8632C] hover:text-white"
                          : "border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Cetak / PDF
                    </button>
                    <button
                      type="button"
                      onClick={closeDetail}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </>
            )}
>>>>>>> Stashed changes
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          aside, header, nav { display: none !important; }
          main { margin-left: 0 !important; margin-top: 0 !important; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}