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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

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

  const closeDetail = () => {
    setSelectedDetail(null);
    setDetailError(null);
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
                      {item.tipe === "OUTBOUND" ? (
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

      {/* MODAL DETAIL TRACKING */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative bg-[#F8F6F0] rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Detail Tracking Pengiriman</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedDetail.nomor_surat_jalan}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="p-2.5 rounded-full hover:bg-stone-200/80 text-slate-500 transition"
                title="Tutup Modal"
              >
                <X size={20} />
              </button>
            </div>

            {detailError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 mb-6">
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
              <div className="space-y-6">
                {/* INFO SECTION */}
                <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Informasi Pengiriman
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-sm text-slate-700">
                    <div>
                      <span className="text-slate-500 text-xs">Tipe</span>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedDetail.tipe === "OUTBOUND" ? "Outbound" : "Inbound"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Status</span>
                      <p className="mt-1">
                        <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-lg ${getStatusBadge(selectedDetail.status)}`}>
                          {getStatusLabel(selectedDetail.status)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Driver</span>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedDetail.personil_pengantar?.nama || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Kendaraan</span>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedDetail.kendaraan?.jenis_kendaraan || "-"}
                        <span className="text-xs text-slate-400 ml-2">
                          ({selectedDetail.kendaraan?.no_polisi || "-"})
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Rute</span>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedDetail.gudang_asal?.nama_gudang || "-"} → {selectedDetail.gudang_tujuan?.nama_gudang || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Project</span>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedDetail.project?.nama_project || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Area</span>
                      <p className="mt-1 font-semibold text-slate-900">
                        {selectedDetail.project?.area || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Tanggal Disetujui</span>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDate(selectedDetail.tanggal_disetujui)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Tanggal Digenerate</span>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDate(selectedDetail.tanggal_digenerate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Tanggal Diterima</span>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDate(selectedDetail.tanggal_diterima)}
                      </p>
                    </div>
                  </div>
                  {selectedDetail.catatan && (
                    <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200/60 p-4">
                      <span className="text-xs font-bold text-amber-900 block mb-1">Catatan</span>
                      <p className="text-xs text-amber-900">{selectedDetail.catatan}</p>
                    </div>
                  )}
                </div>

                {/* ITEMS SECTION */}
                <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Barang yang Dibawa
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-stone-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-stone-200">
                        <tr>
                          <th className="px-4 py-3">Kode</th>
                          <th className="px-4 py-3">Nama Barang</th>
                          <th className="px-4 py-3 text-center">Satuan</th>
                          <th className="px-4 py-3 text-center">Qty</th>
                          <th className="px-4 py-3">Kondisi</th>
                          <th className="px-4 py-3">Serial Number</th>
                          <th className="px-4 py-3">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-slate-700">
                        {selectedDetail.items && selectedDetail.items.length > 0 ? (
                          selectedDetail.items.map((it, idx) => (
                            <tr key={it.item_id || idx} className="hover:bg-stone-50/50">
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {it.barang?.kode_perangkat || "-"}
                              </td>
                              <td className="px-4 py-3">
                                {it.barang?.nama_barang || "Item " + (idx + 1)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                 {it.satuan?.kode_satuan || it.barang?.satuan_default?.kode_satuan || "-"}
                              </td>
                              <td className="px-4 py-3 text-center font-bold">
                                {it.qty}
                              </td>
                              <td className="px-4 py-3 capitalize">
                                {it.kondisi || "-"}
                              </td>
                              <td className="px-4 py-3">
                                {it.serial_number || "-"}
                              </td>
                              <td className="px-4 py-3">
                                {it.catatan || "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                              Tidak ada rincian barang.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
