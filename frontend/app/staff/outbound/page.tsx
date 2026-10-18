"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileText, ChevronDown, ChevronRight, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { KRITIS_THRESHOLD, MENIPIS_THRESHOLD } from "@/lib/constants/stok";

type SuratJalanStatus = "draft_diajukan" | "menunggu_verifikasi" | "ready_putaway" | "disetujui" | "digenerate" | "diterima_didistribusikan" | "sedang_dikirim" | "tiba_di_transit" | "tiba_menunggu_konfirmasi" | "ditolak";

const STATUS_META: Record<SuratJalanStatus, { label: string; tone: string }> = {
  draft_diajukan: { label: "Menunggu Persetujuan", tone: "bg-amber-50 text-amber-600" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", tone: "bg-amber-50 text-amber-600" },
  ready_putaway: { label: "Siap Putaway", tone: "bg-blue-50 text-blue-600" },
  disetujui: { label: "Disetujui — Siap Picking", tone: "bg-emerald-50 text-emerald-600" },
  digenerate: { label: "Digenerate", tone: "bg-blue-50 text-blue-600" },
  tiba_di_transit: { label: "Di Gudang Transit", tone: "bg-purple-50 text-purple-700" },
  tiba_menunggu_konfirmasi: { label: "Menunggu Konfirmasi", tone: "bg-blue-50 text-blue-600" },
  diterima_didistribusikan: { label: "Terkirim", tone: "bg-gray-100 text-gray-500" },
  sedang_dikirim: { label: "Sedang Dikirim", tone: "bg-amber-50 text-amber-600" },
  ditolak: { label: "Ditolak", tone: "bg-rose-50 text-rose-600" },
};

const PICKING_SELESAI_STATUS: SuratJalanStatus = "disetujui";

// Status yang BENAR-BENAR masih terjadi pada alur outbound saat ini:
//   POST /api/surat-jalan -> "draft_diajukan" (lihat create() repository:
//   default outbound = draft_diajukan)
//   approveOutbound -> "disetujui"
//   updateDeliveryStatus validTransitions: disetujui -> sedang_dikirim ->
//   tiba_menunggu_konfirmasi / diterima_didistribusikan
//   tibaDiTransit -> "tiba_di_transit" (titipan transit), lanjut lagi ke
//   "sedang_dikirim"
//   rejectOutbound -> "ditolak"
// "menunggu_verifikasi" / "ready_putaway" / "digenerate" tidak pernah di-set
// pada tipe outbound (digenerate bahkan tidak pernah di-set di service
// mana pun — hanya nyangkut di filter list repository). STATUS_META tetap
// lengkap hanya untuk me-render badge record legacy.
const ACTIVE_OUTBOUND_STATUSES: SuratJalanStatus[] = [
  "draft_diajukan",
  "disetujui",
  "sedang_dikirim",
  "tiba_di_transit",
  "tiba_menunggu_konfirmasi",
  "diterima_didistribusikan",
  "ditolak",
];

function getStatusMeta(status: SuratJalanStatus, pickingSelesai?: boolean) {
  if (status === PICKING_SELESAI_STATUS && pickingSelesai) {
    return { label: "Picking Selesai — Siap Distribusi", tone: "bg-blue-50 text-blue-600" };
  }
  return STATUS_META[status] || STATUS_META.draft_diajukan;
}

interface SuratJalanItem {
  item_id: number;
  qty: number;
  satuan_id?: number;
  catatan?: string | null;
  foto_url?: string | null;
  satuan?: { kode_satuan?: string } | null;
  barang?: {
    kode_perangkat?: string;
    nama_barang?: string;
    satuan_default?: { kode_satuan?: string };
    kategori?: { is_kritis?: boolean };
    stok_gudangs?: { qty: number; gudang_id: number; zona_id: number | null; kondisi: string }[];
  };
}

interface SuratJalan {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  tipe: string;
  status: SuratJalanStatus;
  created_at: string;
  tanggal?: string;
  items: SuratJalanItem[];
  gudang_asal?: { gudang_id: number; nama_gudang: string };
  gudang_tujuan?: { nama_gudang: string };
  project?: { nama_project: string };
  picking_selesai?: boolean;
  tipe_pengirim?: string | null;
  pengirim_eksternal_nama?: string | null;
  tujuan_tipe?: string | null;
  titik_lapangan?: { nama_lokasi?: string } | null;
  alamat_lapangan?: string | null;
  pic_pemohon_nama?: string | null;
  kendaraan?: { jenis_kendaraan?: string; merk?: string; no_polisi?: string } | null;
  personil_pengantar?: { nama?: string } | null;
  boq?: {
    boq_id: number;
    boq_number?: string;
    tiket?: { kode_tiket?: string };
  } | null;
}

export default function SuratJalanListPage() {
  const { get } = useApi();
  const [list, setList] = useState<SuratJalan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pencarian teks (nomor SJ / project) — klien-side.
  const [searchQuery, setSearchQuery] = useState("");
  // Filter lanjutan di dalam panel "Filter": status multi-select dan rentang
  // tanggal — klien-side, dikombinasikan. (Filter gudang dihapus: staf hanya
  // mengakses 1 gudang.)
  const [statusFilter, setStatusFilter] = useState<SuratJalanStatus[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  // Row detail inline: surat jalan yang sedang dibuka daftar itemnya.
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const fetchList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await get(`${baseUrl}/api/surat-jalan/outbound/queue`);
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal mengambil daftar Surat Jalan.");
      }
      const json = await response.json();
      const data = json?.data ?? json ?? [];
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [get]);

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

  // Halaman ini bisa dibuka dari halaman lain — selalu mulai dari atas
  // supaya judul + tombol aksi tidak tertinggal ter-scroll.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const activeFilterCount = (statusFilter.length > 0 ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);
  const hasAnyFilter = activeFilterCount > 0 || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setStatusFilter([]);
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  const toggleStatusFilter = (status: SuratJalanStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("id-ID");
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return list.filter((sj) => {
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(sj.status);
      const matchesSearch =
        !query ||
        sj.nomor_surat_jalan.toLocaleLowerCase("id-ID").includes(query) ||
        (sj.project?.nama_project || "").toLocaleLowerCase("id-ID").includes(query);
      const waktu = new Date(sj.tanggal || sj.created_at).getTime();
      const matchesFrom = fromTime === null || waktu >= fromTime;
      const matchesTo = toTime === null || waktu <= toTime;
      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });
  }, [list, statusFilter, searchQuery, dateFrom, dateTo]);

  const kategoriTujuanFilterOptions = useMemo(() => {
    const values = new Set<string>(Object.keys(KATEGORI_TUJUAN_LABEL));
    list.forEach((sj) => {
      if (sj.tujuan_tipe) values.add(sj.tujuan_tipe);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [list]);

  const isFilterActive =
    searchQuery.trim() !== "" ||
    tipePengirimFilter !== "" ||
    gudangAsalFilter !== "" ||
    kategoriTujuanFilter !== "";

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return list.filter((sj) => {
      if (activeTab !== "SEMUA" && sj.status !== activeTab) return false;
      if (tipePengirimFilter && sj.tipe_pengirim !== tipePengirimFilter) return false;
      if (gudangAsalFilter && sj.gudang_asal?.nama_gudang !== gudangAsalFilter) return false;
      if (kategoriTujuanFilter && sj.tujuan_tipe !== kategoriTujuanFilter) return false;
      if (query) {
        const haystack = [
          sj.nomor_surat_jalan,
          sj.gudang_tujuan?.nama_gudang,
          sj.project?.nama_project,
          sj.pengirim_eksternal_nama,
          sj.titik_lapangan?.nama_lokasi,
          sj.pic_pemohon_nama,
          sj.kendaraan?.no_polisi,
          sj.boq?.boq_number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [activeTab, list, searchQuery, tipePengirimFilter, gudangAsalFilter, kategoriTujuanFilter]);

  return (
    <div className="px-8 py-6">
      {/* Toolbar: judul + aksi di kiri, kontrol di kanan (tumpuk di layar kecil) */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900">Surat Jalan</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar Surat Jalan Outbound yang jadi tanggung jawab Anda
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor SJ / project..."
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
                  <div className="mb-4 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                    {ACTIVE_OUTBOUND_STATUSES.map((status) => (
                      <label
                        key={status}
                        className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={statusFilter.includes(status)}
                          onChange={() => toggleStatusFilter(status)}
                          className="h-4 w-4 rounded border-gray-300 accent-[#E8632C]"
                        />
                        <span className="truncate">{STATUS_META[status].label}</span>
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

            <Link href="/staff/outbound/new" className="sm:ml-auto lg:ml-0">
              <Button className="h-auto w-full rounded-xl bg-[#E8632C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D9591F] sm:w-auto">
                + Ajukan Surat Jalan
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
          <Button variant="outline" size="sm" onClick={fetchList} className="ml-auto">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* List Surat Jalan */}
      <div className="rounded-2xl border border-[#F3D9C7] bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="w-10 px-2 py-4 font-semibold"></th>
              <th className="px-4 py-4 font-semibold">No</th>
              <th className="px-4 py-4 font-semibold">Tanggal</th>
              <th className="px-4 py-4 font-semibold">Nomor Surat Jalan</th>
              <th className="px-4 py-4 font-semibold">Tujuan</th>
              <th className="px-4 py-4 font-semibold">Project</th>
              <th className="px-4 py-4 font-semibold text-right">Jumlah Item</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                  Memuat data...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                  Tidak ada Surat Jalan pada filter ini.
                </td>
              </tr>
            ) : (
              filtered.map((sj, sjIndex) => {
                const meta = getStatusMeta(sj.status, sj.picking_selesai);
                const itemRows = sj.items || [];
                const totalQty = itemRows.reduce((sum, it) => sum + Number(it.qty || 0), 0);
                const isExpanded = expandedId === sj.surat_jalan_id;
                const tujuanText =
                  sj.tujuan_tipe === "lapangan"
                    ? sj.titik_lapangan?.nama_lokasi || "-"
                    : sj.gudang_tujuan?.nama_gudang || sj.project?.nama_project || "-";
                const tanggal = new Date(sj.tanggal || sj.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                });
                const gudangAsalId = sj.gudang_asal?.gudang_id;
                const itemStokQtys = itemRows.map((item) =>
                  (item.barang?.stok_gudangs || [])
                    .filter((st) => st.gudang_id === gudangAsalId && st.kondisi === "baik")
                    .reduce((sum, st) => sum + Number(st.qty || 0), 0)
                );
                const isKritis = itemStokQtys.some((qty) => qty < KRITIS_THRESHOLD);
                const isMenipis = itemStokQtys.some((qty) => qty >= KRITIS_THRESHOLD && qty < MENIPIS_THRESHOLD);

                return (
                  <Fragment key={sj.surat_jalan_id}>
                    <tr className="border-b border-gray-100 hover:bg-[#FDECE1]/30">
                      <td className="px-2 py-4 align-top">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : sj.surat_jalan_id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          aria-label={isExpanded ? "Tutup daftar barang" : "Buka daftar barang"}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-4 align-top font-medium text-gray-700">{sjIndex + 1}</td>
                      <td className="px-4 py-4 align-top text-gray-500">{tanggal}</td>
                      <td className="px-4 py-4 align-top font-medium text-gray-800">
                        <span className="flex items-center gap-2">
                          <FileText size={16} className="text-[#E8632C]" />
                          {sj.nomor_surat_jalan}
                          {isKritis && (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                              Kritis
                            </span>
                          )}
                          {isMenipis && !isKritis && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                              Menipis
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-gray-600">{tujuanText}</td>
                      <td className="px-4 py-4 align-top text-gray-600">{sj.project?.nama_project || "-"}</td>
                      <td className="px-4 py-4 align-top text-right text-gray-600">
                        {itemRows.length} barang · {totalQty} unit
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-right">
                        <Link
                          href={`/staff/outbound/${sj.surat_jalan_id}`}
                          className="text-sm font-semibold text-[#E8632C] hover:underline"
                        >
                          Buka
                        </Link>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="rounded-xl border border-slate-100 bg-white p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Daftar Barang
                            </p>
                            {itemRows.length === 0 ? (
                              <p className="text-sm text-gray-400">Belum ada barang.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                                      <th className="py-2 pr-3 font-semibold">Kode Barang</th>
                                      <th className="py-2 pr-3 font-semibold">Nama Barang</th>
                                      <th className="py-2 pr-3 text-right font-semibold">Qty</th>
                                      <th className="py-2 pr-3 font-semibold">Satuan</th>
                                      <th className="py-2 font-semibold">Foto</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {itemRows.map((item) => (
                                      <tr key={item.item_id} className="border-b border-gray-50 last:border-0">
                                        <td className="py-2 pr-3 font-medium text-gray-800">
                                          {item.barang?.kode_perangkat || "-"}
                                        </td>
                                        <td className="py-2 pr-3 text-gray-600">{item.barang?.nama_barang || "-"}</td>
                                        <td className="py-2 pr-3 text-right text-gray-600">{Number(item.qty || 0)}</td>
                                        <td className="py-2 pr-3 text-gray-600">
                                          {item.satuan?.kode_satuan || item.barang?.satuan_default?.kode_satuan || "-"}
                                        </td>
                                        <td className="py-2">
                                          {item.foto_url ? (
                                            <a
                                              href={item.foto_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-xs font-semibold text-[#E8632C] hover:underline"
                                            >
                                              Lihat Foto
                                            </a>
                                          ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal Foto Barang */}
      {isPhotoModalOpen && selectedPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
          onClick={closePhotoModal}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-800">Foto Barang</h3>
              <button
                type="button"
                onClick={closePhotoModal}
                aria-label="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center justify-center overflow-hidden p-5">
              <img
                src={selectedPhotoUrl}
                alt="Foto barang"
                className="max-h-[60vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
            <div className="border-t border-slate-100 px-5 py-4 text-right">
              <button
                type="button"
                onClick={closePhotoModal}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
