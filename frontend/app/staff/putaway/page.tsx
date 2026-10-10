"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Loader2, AlertCircle, Search, ChevronDown } from "lucide-react";
import { useApi } from "@/lib/api";

type ApiItem = {
  item_id: number;
  qty: number;
  qty_diterima?: number | string | null;
  kondisi?: string | null;
  is_kelebihan?: boolean;
  barang?: { kode_perangkat?: string; nama_barang?: string };
};

type ApiSuratJalan = {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: string;
  tanggal?: string;
  gudang_asal?: { nama_gudang: string } | null;
  gudang_tujuan?: { gudang_id?: string | number; nama_gudang: string } | null;
  items: ApiItem[];
};

export default function PutawayListPage() {
  const { get } = useApi();
  const [list, setList] = useState<ApiSuratJalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"MENUNGGU" | "SELESAI">("MENUNGGU");

  // Filter tabel putaway (client-side)
  const [searchQuery, setSearchQuery] = useState("");
  const [gudangFilter, setGudangFilter] = useState("all");

  // Pagination client-side (per Surat Jalan, bukan per baris item, supaya
  // rowSpan nomor/asal/tujuan/aksi tidak terpotong antar halaman)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      try {
        // Endpoint ini balikin SEMUA status inbound (draft s/d selesai) —
        // kita filter per tab di sisi frontend berdasarkan status:
        // "ready_putaway" = menunggu ditempatkan, "diterima_didistribusikan"
        // = sudah ditempatkan (lihat catatan fix backend approveInbound/putaway).
        const res = await get(`${baseUrl}/api/surat-jalan/inbound`);
        if (!res.ok) throw new Error("Gagal mengambil daftar Surat Jalan Inbound.");
        const json = await res.json();
        setList(Array.isArray(json?.data) ? json.data : []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Terjadi kesalahan mengambil data.");
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Penerimaan wajib tercatat (qty_diterima terisi di semua item) sebelum
  // sebuah inbound masuk tab "menunggu ditempatkan" — konsisten dengan guard
  // backend di service.putaway.
  const received = (sj: ApiSuratJalan) =>
    (sj.items || []).every(
      (i) => i.qty_diterima !== null && i.qty_diterima !== undefined,
    );

  const filtered = useMemo(
    () =>
      list.filter((sj) =>
        activeTab === "MENUNGGU"
          ? sj.status === "ready_putaway" && received(sj)
          : sj.status === "diterima_didistribusikan",
      ),
    [list, activeTab],
  );

  // Opsi gudang tujuan diambil dinamis dari data surat jalan yang ada,
  // sehingga isi dropdown selalu relevan dengan daftar putaway.
  const gudangTujuanFilterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    list.forEach((sj) => {
      const gudangId = sj.gudang_tujuan?.gudang_id;
      const nama = sj.gudang_tujuan?.nama_gudang;
      if (gudangId != null && nama && !seen.has(String(gudangId))) {
        seen.set(String(gudangId), nama);
      }
    });
    return Array.from(seen, ([gudang_id, nama_gudang]) => ({ gudang_id, nama_gudang }));
  }, [list]);

  // Saring daftar putaway secara realtime berdasarkan pencarian, tab status
  // yang dipilih, dan gudang tujuan.
  const visibleSuratJalan = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return filtered.filter((sj) => {
      const matchSearch =
        !q ||
        (sj.nomor_surat_jalan || "").toLowerCase().includes(q) ||
        (sj.items || []).some(
          (item) =>
            (item.barang?.kode_perangkat || "").toLowerCase().includes(q) ||
            (item.barang?.nama_barang || "").toLowerCase().includes(q),
        );
      const matchGudang =
        gudangFilter === "all" || String(sj.gudang_tujuan?.gudang_id) === gudangFilter;
      return matchSearch && matchGudang;
    });
  }, [filtered, searchQuery, gudangFilter]);

  // Filter atau tab berubah -> kembali ke Halaman 1 supaya data hasil
  // penyaringan tidak terlewat karena posisi halaman yang sudah maju.
  // Reset dijalankan saat render (bukan lewat effect) mengikuti pola
  // "storing information from previous renders" React.
  const filterKey = `${activeTab}|${searchQuery}|${gudangFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(visibleSuratJalan.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);

  const paginatedSuratJalan = useMemo(
    () => visibleSuratJalan.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage),
    [visibleSuratJalan, activePage],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E8632C]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="px-8 py-6">
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Lokasi & Penempatan (Putaway)</h1>
        <p className="mt-1 text-sm text-gray-500">Surat Jalan Inbound yang sudah diverifikasi Supervisor dan siap ditempatkan ke zona</p>
      </div>

      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setActiveTab("MENUNGGU")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "MENUNGGU" ? "bg-[#E8632C] text-white" : "border border-[#F3D9C7] bg-white text-gray-600 hover:bg-[#FDECE1]"}`}
        >
          Menunggu Ditempatkan
        </button>
        <button
          onClick={() => setActiveTab("SELESAI")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "SELESAI" ? "bg-[#E8632C] text-white" : "border border-[#F3D9C7] bg-white text-gray-600 hover:bg-[#FDECE1]"}`}
        >
          Sudah Ditempatkan
        </button>
      </div>

      {/* Filter Putaway */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-colors focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. Surat Jalan / Kode / Nama Barang..."
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="relative md:w-56">
          <select
            value={gudangFilter}
            onChange={(e) => setGudangFilter(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          >
            <option value="all">Semua Gudang</option>
            {gudangTujuanFilterOptions.map((w) => (
              <option key={w.gudang_id} value={String(w.gudang_id)}>
                {w.nama_gudang}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="rounded-2xl border border-[#F3D9C7] bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-6 py-4 font-semibold">Nomor Surat Jalan</th>
              <th className="px-6 py-4 font-semibold">Asal</th>
              <th className="px-6 py-4 font-semibold">Tujuan Gudang</th>
              <th className="px-6 py-4 font-semibold">Tanggal</th>
              <th className="px-6 py-4 font-semibold">Kode Barang</th>
              <th className="px-6 py-4 font-semibold">Nama Barang</th>
              <th className="px-6 py-4 font-semibold text-right">Qty Surat Jalan</th>
              <th className="px-6 py-4 font-semibold text-right">Qty Diterima</th>
              <th className="px-6 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visibleSuratJalan.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                  {filtered.length === 0
                    ? activeTab === "MENUNGGU"
                      ? "Tidak ada Surat Jalan yang menunggu ditempatkan."
                      : "Belum ada riwayat penempatan."
                    : "Tidak ada Surat Jalan yang cocok dengan filter."}
                </td>
              </tr>
            ) : (
              paginatedSuratJalan.map((sj, sjIdx) => {
                const itemRows = sj.items && sj.items.length > 0 ? sj.items : [null];
                const rowSpan = itemRows.length;
                const tanggal = sj.tanggal
                  ? new Date(sj.tanggal).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "-";
                const diterimaLabel = (item: ApiItem | null) => {
                  if (item == null || item.qty_diterima === null || item.qty_diterima === undefined) return "-";
                  return Number(item.qty_diterima);
                };
                return itemRows.map((item, itemIdx) => {
                  const isFirst = itemIdx === 0;
                  return (
                    <tr
                      key={`${sj.surat_jalan_id}-${item ? item.item_id : "empty"}-${itemIdx}`}
                      className={`border-b border-gray-50 last:border-0 transition-colors ${
                        sjIdx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                      } hover:bg-orange-50/50`}
                    >
                      {isFirst && (
                        <>
                          <td className="px-6 py-4 align-top font-medium text-gray-800" rowSpan={rowSpan}>
                            <span className="flex items-center gap-2">
                              <MapPin size={16} className="text-[#E8632C]" />
                              {sj.nomor_surat_jalan}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top text-gray-600" rowSpan={rowSpan}>{sj.gudang_asal?.nama_gudang || "-"}</td>
                          <td className="px-6 py-4 align-top text-gray-600" rowSpan={rowSpan}>{sj.gudang_tujuan?.nama_gudang || "-"}</td>
                          <td className="px-6 py-4 align-top text-gray-500" rowSpan={rowSpan}>{tanggal}</td>
                        </>
                      )}
                      <td className="px-6 py-3 align-top font-medium text-gray-800">
                        {item?.barang?.kode_perangkat || "-"}
                      </td>
                      <td className="px-6 py-3 align-top text-gray-600">{item?.barang?.nama_barang || "-"}</td>
                      <td className="px-6 py-3 align-top text-right text-gray-600">
                        {item ? Number(item.qty || 0) : "-"}
                      </td>
                      <td className="px-6 py-3 align-top text-right text-gray-600">{diterimaLabel(item)}</td>
                      {isFirst && (
                        <td className="px-6 py-4 align-top text-right" rowSpan={rowSpan}>
                          <Link href={`/staff/putaway/${sj.surat_jalan_id}`} className="text-sm font-semibold text-[#E8632C] hover:underline">
                            {activeTab === "MENUNGGU" ? "Tempatkan" : "Lihat"}
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                });
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {!loading && visibleSuratJalan.length > itemsPerPage && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-500">
            Menampilkan {(activePage - 1) * itemsPerPage + 1}–
            {Math.min(activePage * itemsPerPage, visibleSuratJalan.length)} dari{" "}
            {visibleSuratJalan.length} Surat Jalan
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={activePage === 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="text-xs text-slate-500">
              Halaman {activePage} dari {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={activePage === totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
