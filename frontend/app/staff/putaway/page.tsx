"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Loader2, AlertCircle, Filter, Search, X, ChevronDown } from "lucide-react";
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
  gudang_tujuan?: { nama_gudang: string } | null;
  items: ApiItem[];
};

export default function PutawayListPage() {
  const { get } = useApi();
  const [list, setList] = useState<ApiSuratJalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Status dua tab lama ("Menunggu Ditempatkan" / "Sudah Ditempatkan") kini
  // menjadi filter Status multi-select di dalam panel Filter.
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

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

  // Tutup panel filter saat klik di luar / tekan Escape.
  useEffect(() => {
    if (!filterOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  // Halaman ini dibuka dari alur inbound — selalu mulai dari atas supaya
  // judul halaman tidak tertinggal ter-scroll (scroll restoration Next.js).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // Dua status putaway yang bisa difilter di panel (label mengikuti tab lama).
  // Filter gudang dihapus: staf hanya mengakses 1 gudang.
  const activeFilterCount = statusFilter.length + (dateFrom || dateTo ? 1 : 0);
  const hasAnyFilter = activeFilterCount > 0 || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setStatusFilter([]);
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  // Penerimaan wajib tercatat (qty_diterima terisi di semua item) sebelum
  // sebuah inbound masuk status "menunggu ditempatkan" — konsisten dengan
  // guard backend di service.putaway.
  const received = (sj: ApiSuratJalan) =>
    (sj.items || []).every(
      (i) => i.qty_diterima !== null && i.qty_diterima !== undefined,
    );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("id-ID");
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return list.filter((sj) => {
      // Status putaway yang relevan: menunggu (dengan penerimaan tercatat) atau
      // sudah ditempatkan. Tanpa pilihan status = semua baris ditampilkan.
      const putawayStatus =
        sj.status === "diterima_didistribusikan"
          ? "SELESAI"
          : sj.status === "ready_putaway" && received(sj)
            ? "MENUNGGU"
            : null;
      if (!putawayStatus) return false;
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(putawayStatus);
      const matchesSearch = !query || sj.nomor_surat_jalan.toLocaleLowerCase("id-ID").includes(query);
      const waktu = sj.tanggal ? new Date(sj.tanggal).getTime() : NaN;
      const matchesFrom = fromTime === null || (!Number.isNaN(waktu) && waktu >= fromTime);
      const matchesTo = toTime === null || (!Number.isNaN(waktu) && waktu <= toTime);
      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });
  }, [list, statusFilter, searchQuery, dateFrom, dateTo]);

  const isFilterActive =
    searchQuery.trim() !== "" || gudangTujuanFilter !== "";

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return list.filter((sj) => {
      if (!matchesStatus(sj)) return false;
      if (
        gudangTujuanFilter &&
        (sj.gudang_tujuan?.nama_gudang || "") !== gudangTujuanFilter
      )
        return false;
      if (query) {
        const haystack = [
          sj.nomor_surat_jalan,
          sj.gudang_asal?.nama_gudang,
          sj.gudang_tujuan?.nama_gudang,
          ...(sj.items || []).flatMap((item) => [
            item.barang?.kode_perangkat,
            item.barang?.nama_barang,
          ]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, activeTab, searchQuery, gudangTujuanFilter]);

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
      {/* Toolbar: judul di kiri, kontrol di kanan (tumpuk di layar kecil) */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900">Lokasi & Penempatan (Putaway)</h1>
          <p className="mt-1 text-sm text-gray-500">Surat Jalan Inbound yang sudah diverifikasi Supervisor dan siap ditempatkan ke zona</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor SJ..."
              className="w-full rounded-lg border border-[#F3D9C7] bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#E8632C] focus:outline-none sm:w-64"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                aria-expanded={filterOpen}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  activeFilterCount > 0
                    ? "border-[#E8632C] bg-[#FDECE1] text-[#E8632C]"
                    : "border-[#F3D9C7] bg-white text-gray-700 hover:border-[#E8632C] hover:text-[#E8632C]"
                }`}
              >
                <Filter size={15} />
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                <ChevronDown size={14} className={filterOpen ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>

              {filterOpen && (
                <div className="absolute right-0 z-30 mt-2 w-[19rem] rounded-2xl border border-[#F3D9C7] bg-white p-4 shadow-xl">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Status</p>
                  <div className="mb-4 space-y-1.5">
                    {(
                      [
                        { key: "MENUNGGU", label: "Menunggu Ditempatkan" },
                        { key: "SELESAI", label: "Sudah Ditempatkan" },
                      ] as const
                    ).map((status) => (
                      <label key={status.key} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={statusFilter.includes(status.key)}
                          onChange={() => toggleStatusFilter(status.key)}
                          className="h-4 w-4 rounded border-gray-300 accent-[#E8632C]"
                        />
                        <span className="truncate">{status.label}</span>
                      </label>
                    ))}
                  </div>

                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Tanggal</p>
                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <label className="block text-xs text-gray-500">
                      Dari
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#F3D9C7] px-2 py-1.5 text-xs text-gray-700 focus:border-[#E8632C] focus:outline-none"
                      />
                    </label>
                    <label className="block text-xs text-gray-500">
                      Sampai
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#F3D9C7] px-2 py-1.5 text-xs text-gray-700 focus:border-[#E8632C] focus:outline-none"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter([]);
                        setDateFrom("");
                        setDateTo("");
                      }}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      className="rounded-lg bg-[#E8632C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D9591F]"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {hasAnyFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:border-rose-200 hover:text-rose-600"
              >
                <X size={14} />
                Bersihkan filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter search & gudang — di bawah tab status */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. Surat Jalan / Kode / Nama Barang..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="relative sm:w-60">
          <select
            value={gudangTujuanFilter}
            onChange={(e) => setGudangTujuanFilter(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Gudang</option>
            {gudangTujuanOptions.map((nama) => (
              <option key={nama} value={nama}>
                {nama}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
      {isFilterActive && (
        <p className="mb-3 text-xs text-slate-500">
          Menampilkan <span className="font-semibold text-slate-700">{filtered.length}</span> dari {list.length} data
        </p>
      )}

      <div className="rounded-2xl border border-[#F3D9C7] bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-6 py-4 font-semibold">No</th>
              <th className="px-6 py-4 font-semibold">Tanggal</th>
              <th className="px-6 py-4 font-semibold">Nomor Surat Jalan</th>
              <th className="px-6 py-4 font-semibold">Asal</th>
              <th className="px-6 py-4 font-semibold">Tujuan Gudang</th>
              <th className="px-6 py-4 font-semibold">Kode Barang</th>
              <th className="px-6 py-4 font-semibold">Nama Barang</th>
              <th className="px-6 py-4 font-semibold text-right">Qty Surat Jalan</th>
              <th className="px-6 py-4 font-semibold text-right">Qty Diterima</th>
              <th className="px-6 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                  {hasAnyFilter
                    ? "Tidak ada Surat Jalan pada filter ini."
                    : "Tidak ada Surat Jalan Inbound yang menunggu ditempatkan atau sudah ditempatkan."}
                </td>
              </tr>
            ) : (
              filtered.map((sj, sjIndex) => {
                const itemRows = sj.items && sj.items.length > 0 ? sj.items : [null];
                const rowSpan = itemRows.length;
                // Zebra striping per Surat Jalan: genap putih, ganjil selang-seling.
                const stripeClass = sjIndex % 2 === 1 ? "bg-slate-50/70" : "bg-white";
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
                const rowNumber = sjIndex + 1;
                return itemRows.map((item, itemIdx) => {
                  const isFirst = itemIdx === 0;
                  return (
                    <tr
                      key={`${sj.surat_jalan_id}-${item ? item.item_id : "empty"}-${itemIdx}`}
                      className={`border-b border-gray-50 last:border-0 transition-colors ${stripeClass} hover:bg-orange-50/50`}
                    >
                      {isFirst && (
                        <>
                          <td className="px-6 py-4 align-top font-medium text-gray-700" rowSpan={rowSpan}>{sjIndex + 1}</td>
                          <td className="px-6 py-4 align-top text-gray-500" rowSpan={rowSpan}>{tanggal}</td>
                          <td className="px-6 py-4 align-top font-medium text-gray-800" rowSpan={rowSpan}>
                            <span className="flex items-center gap-2">
                              <MapPin size={16} className="text-[#E8632C]" />
                              {sj.nomor_surat_jalan}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top text-gray-600" rowSpan={rowSpan}>{sj.gudang_asal?.nama_gudang || "-"}</td>
                          <td className="px-6 py-4 align-top text-gray-600" rowSpan={rowSpan}>{sj.gudang_tujuan?.nama_gudang || "-"}</td>
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
                            {sj.status === "ready_putaway" ? "Tempatkan" : "Lihat"}
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
    </div>
  );
}
