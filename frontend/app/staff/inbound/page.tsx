"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PackageCheck, Plus, X, ChevronDown, ChevronRight, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { MobileCardList, type MobileCardField, type MobileCardItem } from "@/components/MobileCardList";
import { safeUrl } from "@/lib/safe-url";

type InboundStatus = "draft_diajukan" | "disetujui" | "digenerate" | "diterima_didistribusikan" | "ditolak" | "menunggu_verifikasi" | "ready_putaway" | "sedang_dikirim" | "tiba_menunggu_konfirmasi";

const STATUS_META: Record<InboundStatus, { label: string; tone: string }> = {
  draft_diajukan: { label: "Menunggu Persetujuan", tone: "bg-amber-50 text-amber-600" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", tone: "bg-amber-50 text-amber-600" },
  ready_putaway: { label: "Siap Putaway", tone: "bg-blue-50 text-blue-600" },
  disetujui: { label: "Disetujui", tone: "bg-emerald-50 text-emerald-600" },
  digenerate: { label: "Digenerate", tone: "bg-blue-50 text-blue-600" },
  tiba_menunggu_konfirmasi: { label: "Menunggu Konfirmasi", tone: "bg-blue-50 text-blue-600" },
  diterima_didistribusikan: { label: "Diterima/Didistribusikan", tone: "bg-gray-100 text-gray-500" },
  sedang_dikirim: { label: "Sedang Dikirim", tone: "bg-amber-50 text-amber-600" },
  ditolak: { label: "Ditolak", tone: "bg-rose-50 text-rose-600" },
};

// Status yang BENAR-BENAR masih terjadi pada alur inbound staf saat ini:
//   submit (POST /api/surat-jalan/inbound/staf, lihat createStaffInbound di
//   backend surat-jalan.service.js) -> langsung "ready_putaway" tanpa ACC
//   supervisor, lalu putaway menutup ke "diterima_didistribusikan".
// Karena alur inbound tidak lagi melewati ACC, filter status di halaman ini
// HANYA menawarkan dua status tersebut. "draft_diajukan" (ACC SPV),
// "menunggu_verifikasi", status outbound (disetujui/sedang_dikirim/...) dan
// "digenerate" tidak pernah di-set untuk tipe inbound — STATUS_META tetap
// dipertahankan lengkap hanya untuk me-render badge record legacy yang masih
// ada di data, bukan sebagai pilihan filter.
const ACTIVE_INBOUND_STATUSES: InboundStatus[] = ["ready_putaway", "diterima_didistribusikan"];
const FILTERABLE_STATUSES = ACTIVE_INBOUND_STATUSES;

interface InboundItem {
  item_id: number;
  nama_barang?: string;
  qty: number;
  qty_diterima?: number | string | null;
  catatan?: string | null;
  is_di_luar_boq?: boolean;
  satuan?: { kode_satuan?: string } | null;
  barang?: { kode_perangkat?: string; nama_barang?: string; satuan_default?: { kode_satuan?: string } } | null;
}

interface InboundSuratJalan {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: InboundStatus;
  created_at: string;
  tanggal?: string;
  created_by?: string | number;
  creator?: {
    user_id?: string | number;
    nama?: string;
    name?: string;
  } | null;
  items: InboundItem[];
  tipe_pengirim?: "internal" | "external";
  supplier?: { nama: string; kode: string };
  pengirim_eksternal_nama?: string | null;
  gudang_asal?: { nama_gudang: string };
  gudang_tujuan?: { nama_gudang: string };
  project?: { nama_project?: string } | null;
  pic_pemohon_nama?: string | null;
  kendaraan_teks?: string | null;
  no_polisi_teks?: string | null;
  driver_teks?: string | null;
  kendaraan?: { jenis_kendaraan?: string; merk?: string; no_polisi?: string } | null;
  personil_pengantar?: { nama?: string } | null;
  surat_jalan_url?: string | null;
cluster_id?: string | null;
  boq?: {
    boq_id: number;
    boq_number?: string;
    cluster?: { cluster_id?: string | null; nama_cluster?: string | null } | null;
    tiket?: { kode_tiket?: string };
  } | null;
}









export default function InboundListPage() {
  const { get, put } = useApi();
  const { user } = useAuth();
  const [list, setList] = useState<InboundSuratJalan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pencarian teks (nomor SJ / project) — klien-side.
  const [searchQuery, setSearchQuery] = useState("");
  // Filter lanjutan di dalam panel "Filter": status multi-select, rentang
  // tanggal, serta dropdown multi Pengirim & Project — klien-side, semua
  // di-AND-kan. Struktur panel mengikuti Outbound (STATUS -> TANGGAL),
  // lalu dua dropdown tambahan ini. Pencarian nomor SJ / project tetap lewat
  // search bar di atas. Filter Gudang Tujuan sengaja TIDAK ada: satu staf
  // hanya memegang satu gudang, jadi seluruh data di halaman ini sudah
  // pasti milik gudangnya sendiri.
  const [statusFilter, setStatusFilter] = useState<InboundStatus[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pengirimFilter, setPengirimFilter] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  // Sub-panel dropdown multi yang sedang dibuka (null = tertutup).
  const [openMultiFilter, setOpenMultiFilter] = useState<"pengirim" | "project" | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  // Row info+item yang sedang dibuka di tabel desktop.
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);

  // Tutup panel filter + sub-dropdown di dalamnya (klik luar / Escape).
  const closeFilterPanel = () => {
    setFilterOpen(false);
    setOpenMultiFilter(null);
  };

  useEffect(() => {
    if (!filterOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        closeFilterPanel();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFilterPanel();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  // Halaman ini bisa dibuka dari halaman lain (mis. setelah simpan) — selalu
  // mulai dari atas supaya judul + tombol aksi tidak tertinggal ter-scroll.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const activeFilterCount =
    (statusFilter.length > 0 ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (pengirimFilter.length > 0 ? 1 : 0) +
    (projectFilter.length > 0 ? 1 : 0);
  const hasAnyFilter = activeFilterCount > 0 || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setStatusFilter([]);
    setDateFrom("");
    setDateTo("");
    setPengirimFilter([]);
    setProjectFilter([]);
    setOpenMultiFilter(null);
    setSearchQuery("");
  };

  // Reset di dalam panel: hanya mereset filter panel, search bar dibiarkan
  // (sama perilakunya dengan halaman Outbound).
  const resetPanelFilters = () => {
    setStatusFilter([]);
    setDateFrom("");
    setDateTo("");
    setPengirimFilter([]);
    setProjectFilter([]);
    setOpenMultiFilter(null);
  };

  const toggleStatusFilter = (status: InboundStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const makeMultiToggle =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) => {
      setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
    };
  const togglePengirimFilter = makeMultiToggle(setPengirimFilter);
  const toggleProjectFilter = makeMultiToggle(setProjectFilter);

  // Label per kolom tabel, dipakai untuk render maupun membangun opsi dropdown
  // filter supaya isinya persis sama dengan yang tampil di tabel.
  const getPengirimText = (sj: InboundSuratJalan) =>
    sj.tipe_pengirim === "external"
      ? sj.supplier?.nama
        ? `${sj.supplier.kode} - ${sj.supplier.nama}`
        : sj.pengirim_eksternal_nama || "-"
      : sj.tipe_pengirim === "internal"
      ? sj.gudang_asal?.nama_gudang || "-"
      : "-";
  const getGudangTujuanText = (sj: InboundSuratJalan) => sj.gudang_tujuan?.nama_gudang || "-";
  const getProjectText = (sj: InboundSuratJalan) => sj.project?.nama_project || "-";
  const getClusterText = (sj: InboundSuratJalan) =>
    sj.boq?.cluster?.nama_cluster || sj.boq?.cluster?.cluster_id || sj.cluster_id || "-";
  const getTanggalText = (sj: InboundSuratJalan) =>
    new Date(sj.tanggal || sj.created_at).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  // Opsi dropdown dibangun dari `list` (data source yang sama dengan tabel
  // dan mobile card) memakai helper label kolom di atas, sehingga teks opsi
  // dijamin persis sama dengan yang tampil di kolom Pengirim / Project.
  // Tidak ada yang di-hardcode; opsi ikut berubah bila data berubah.
  // Nilai "-" (baris tanpa pengirim/project) tidak dijadikan opsi filter.
  const uniqSorted = (values: string[]) =>
    Array.from(new Set(values.filter((v) => v && v !== "-"))).sort((a, b) =>
      a.localeCompare(b, "id-ID")
    );
  const pengirimOptions = useMemo(() => uniqSorted(list.map(getPengirimText)), [list]);
  const projectOptions = useMemo(() => uniqSorted(list.map(getProjectText)), [list]);

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
      // Multi-select: kosong = tanpa batasan, terisi = baris harus cocok
      // dengan salah satu opsi yang dipilih.
      const matchesPengirim =
        pengirimFilter.length === 0 || pengirimFilter.includes(getPengirimText(sj));
      const matchesProject =
        projectFilter.length === 0 || projectFilter.includes(getProjectText(sj));
      return (
        matchesStatus &&
        matchesSearch &&
        matchesFrom &&
        matchesTo &&
        matchesPengirim &&
        matchesProject
      );
    });
  }, [
    list,
    statusFilter,
    searchQuery,
    dateFrom,
    dateTo,
    pengirimFilter,
    projectFilter,
  ]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [gudangTujuanFilter, setGudangTujuanFilter] = useState("");
  const statusFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    list.forEach((sj) => {
      if (seen.has(sj.status)) return;
      seen.add(sj.status);
      options.push({ value: sj.status, label: STATUS_META[sj.status]?.label || sj.status });
    });
    return options;
  }, [list]);
  const gudangTujuanFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          list
            .map((sj) => sj.gudang_tujuan?.nama_gudang)
            .filter((nama): nama is string => Boolean(nama))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [list]
  );
  const isFilterActive =
    searchQuery.trim() !== "" || statusFilter.length !== 0 || gudangTujuanFilter !== "";



  const fetchList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await get(`${baseUrl}/api/surat-jalan/inbound`);
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal mengambil daftar inbound.");
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

  const handleCancelDraft = async (suratJalanId: number) => {
    const confirmed = window.confirm("Yakin ingin membatalkan draft ini? Aksi ini tidak dapat dibatalkan.");
    if (!confirmed) return;

    setCancellingId(suratJalanId);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await put(`${baseUrl}/api/surat-jalan/${suratJalanId}/cancel-draft`, {});

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal membatalkan draft surat jalan.");
      }

      setToast({ message: "Draft surat jalan berhasil dibatalkan.", type: "success" });
      fetchList();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat membatalkan draft.",
        type: "error",
      });
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    fetchList();
  }, [get]);





















  const mobileItemsInbound1: MobileCardItem[] = filtered.map((sj) => {
    const meta = STATUS_META[sj.status] || STATUS_META.draft_diajukan;
    const totalUnit = sj.items.reduce((sum, i) => sum + Number(i.qty || 0), 0);
    const tujuanText = getGudangTujuanText(sj);
    const tanggal = getTanggalText(sj);
    const clusterLabel = getClusterText(sj);

    const tipePengirimLabel = sj.tipe_pengirim === "internal" ? "Internal" : sj.tipe_pengirim === "external" ? "External" : "-";
    const pengirimText = getPengirimText(sj);
    const fields: MobileCardField[] = [
      { label: "Tanggal", value: tanggal },
      { label: "Pengirim", value: `${pengirimText} (${tipePengirimLabel})` },
      { label: "Tujuan", value: tujuanText },
      { label: "Project", value: getProjectText(sj) },
      { label: "Cluster", value: clusterLabel },
      { label: "Item", value: `${totalUnit} unit` },
    ];

    let actionContent: React.ReactNode = null;
    if (sj.status === "diterima_didistribusikan") {
      actionContent = <span className="text-sm font-semibold text-gray-400">Selesai</span>;
    } else if (sj.status === "ready_putaway") {
      actionContent = <Link href={`/staff/putaway/${sj.surat_jalan_id}`} className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[#E8632C] text-sm font-semibold text-white hover:bg-[#D9591F]">Putaway</Link>;
    } else if (sj.status === "draft_diajukan" && (String(user?.id) === String(sj.created_by || sj.creator?.user_id) || user?.role === "supervisor" || user?.role === "admin_general")) {
      actionContent = <button onClick={() => handleCancelDraft(sj.surat_jalan_id)} disabled={cancellingId === sj.surat_jalan_id} className="flex min-h-11 w-full items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60">{cancellingId === sj.surat_jalan_id ? "Membatalkan..." : "Batalkan"}</button>;
    } else {
      actionContent = <Link href={`/staff/putaway/${sj.surat_jalan_id}`} className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[#E8632C] text-sm font-semibold text-white hover:bg-[#D9591F]">Detail</Link>;
    }

    return {
      key: String(sj.surat_jalan_id),
      title: (
        <span className="flex items-center gap-2">
          <PackageCheck size={16} className="text-[#E8632C]" />
          {sj.nomor_surat_jalan}
        </span>
      ),
      badge: <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>{meta.label}</span>,
      fields,
      actions: actionContent,
    };
  });





  return (
    <div className="px-8 py-6">
      {/* Toolbar: judul + aksi di kiri, kontrol di kanan (tumpuk di layar kecil) */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">Penerimaan (Inbound)</h1>
            <p className="mt-1 text-sm text-gray-500">
              Daftar Surat Jalan barang masuk yang perlu dicocokkan & dicatat kondisinya
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
                  onClick={() => (filterOpen ? closeFilterPanel() : setFilterOpen(true))}
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
                  <div className="absolute right-0 z-30 mt-2 flex max-h-[26rem] w-[19rem] flex-col rounded-2xl border border-[#F3D9C7] bg-white p-4 shadow-xl">
                    {/* Isi panel: satu-satunya bagian yang di-scroll bila
                        kontennya melebihi tinggi panel; tombol di bawah
                        tidak ikut ter-scroll. Daftar opsi sengaja dirender
                        inline (bukan absolute) supaya tidak terpotong
                        overflow container ini. */}
                    <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Status</p>
                      <div className="mb-4 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                        {FILTERABLE_STATUSES.map((status) => (
                          <label key={status} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
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

                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Pengirim</p>
                      <div className="mb-4">
                        <button
                          type="button"
                          onClick={() => setOpenMultiFilter((v) => (v === "pengirim" ? null : "pengirim"))}
                          aria-expanded={openMultiFilter === "pengirim"}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                            pengirimFilter.length > 0
                              ? "border-[#E8632C] bg-[#FDECE1] text-[#E8632C]"
                              : "border-[#F3D9C7] text-gray-700 hover:border-[#E8632C]"
                          }`}
                        >
                          <span className="truncate">
                            {pengirimFilter.length === 0
                              ? "Semua pengirim"
                              : pengirimFilter.length === 1
                              ? pengirimFilter[0]
                              : `${pengirimFilter.length} pengirim dipilih`}
                          </span>
                          <ChevronDown
                            size={13}
                            className={openMultiFilter === "pengirim" ? "shrink-0 rotate-180 transition-transform" : "shrink-0 transition-transform"}
                          />
                        </button>

                        {openMultiFilter === "pengirim" && (
                          <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[#F3D9C7] bg-white p-2">
                            {pengirimOptions.length === 0 ? (
                              <p className="text-xs text-gray-400">Tidak ada pengirim.</p>
                            ) : (
                              pengirimOptions.map((opt) => (
                                <label key={opt} className="flex cursor-pointer items-center gap-2 py-1 text-xs text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={pengirimFilter.includes(opt)}
                                    onChange={() => togglePengirimFilter(opt)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 accent-[#E8632C]"
                                  />
                                  <span className="truncate">{opt}</span>
                                </label>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Project</p>
                      <div>
                        <button
                          type="button"
                          onClick={() => setOpenMultiFilter((v) => (v === "project" ? null : "project"))}
                          aria-expanded={openMultiFilter === "project"}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                            projectFilter.length > 0
                              ? "border-[#E8632C] bg-[#FDECE1] text-[#E8632C]"
                              : "border-[#F3D9C7] text-gray-700 hover:border-[#E8632C]"
                          }`}
                        >
                          <span className="truncate">
                            {projectFilter.length === 0
                              ? "Semua project"
                              : projectFilter.length === 1
                              ? projectFilter[0]
                              : `${projectFilter.length} project dipilih`}
                          </span>
                          <ChevronDown
                            size={13}
                            className={openMultiFilter === "project" ? "shrink-0 rotate-180 transition-transform" : "shrink-0 transition-transform"}
                          />
                        </button>

                        {openMultiFilter === "project" && (
                          <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[#F3D9C7] bg-white p-2">
                            {projectOptions.length === 0 ? (
                              <p className="text-xs text-gray-400">Tidak ada project.</p>
                            ) : (
                              projectOptions.map((opt) => (
                                <label key={opt} className="flex cursor-pointer items-center gap-2 py-1 text-xs text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={projectFilter.includes(opt)}
                                    onChange={() => toggleProjectFilter(opt)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 accent-[#E8632C]"
                                  />
                                  <span className="truncate">{opt}</span>
                                </label>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer: tidak ikut ter-scroll (sticky di bawah panel). */}
                    <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-stone-100 pt-3">
                      <button
                        type="button"
                        onClick={resetPanelFilters}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={closeFilterPanel}
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

              <Link href="/staff/inbound/new">
                <Button
                  className="h-auto w-full rounded-xl bg-[#E8632C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D9591F] sm:w-auto sm:ml-auto lg:ml-0"
                >
                  <Plus size={16} className="mr-2" />
                  Input Inbound
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

      {/* Filter & Pencarian */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. Surat Jalan / Asal..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="relative sm:w-60">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value ? [e.target.value as InboundStatus] : [])}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Status</option>
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        <div className="relative sm:w-60">
          <select
            value={gudangTujuanFilter}
            onChange={(e) => setGudangTujuanFilter(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Gudang</option>
            {gudangTujuanFilterOptions.map((nama) => (
              <option key={nama} value={nama}>{nama}</option>
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

      {/* List Inbound */}
      <MobileCardList items={mobileItemsInbound1} />
      <div className="rounded-2xl border border-[#F3D9C7] bg-white hidden md:block">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="w-10 px-2 py-4 font-semibold"></th>
              <th className="px-4 py-4 font-semibold">No</th>
              <th className="px-4 py-4 font-semibold">Tanggal Masuk</th>
              <th className="px-4 py-4 font-semibold">Nomor Surat Jalan</th>
              <th className="px-4 py-4 font-semibold">Pengirim</th>
              <th className="px-4 py-4 font-semibold">Gudang Tujuan</th>
              <th className="px-4 py-4 font-semibold">Project</th>
              <th className="px-4 py-4 font-semibold">Cluster</th>
              <th className="px-4 py-4 font-semibold text-right">Jumlah Item</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center text-gray-400">
                  Memuat data...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center text-gray-400">
                  Tidak ada Surat Jalan Inbound pada filter ini.
                </td>
              </tr>
            ) : (
              filtered.map((sj, sjIndex) => {
                const meta = STATUS_META[sj.status] || STATUS_META.draft_diajukan;
                const itemRows = sj.items || [];
                const totalQty = itemRows.reduce((sum, i) => sum + Number(i.qty || 0), 0);
                const isExpanded = expandedId === sj.surat_jalan_id;
                const tujuanText = getGudangTujuanText(sj);
                const tanggal = getTanggalText(sj);
                const pengirimText = getPengirimText(sj);
                const tipePengirimLabel =
                  sj.tipe_pengirim === "internal" ? "Internal" : sj.tipe_pengirim === "external" ? "External" : "-";
                const kendaraanLabel =
                  sj.kendaraan_teks ||
                  (sj.kendaraan
                    ? sj.kendaraan.merk && sj.kendaraan.merk.trim()
                      ? `${sj.kendaraan.merk} - ${sj.kendaraan.jenis_kendaraan}`
                      : sj.kendaraan.jenis_kendaraan
                    : null) ||
                  "-";
                const noPolisiLabel = sj.no_polisi_teks || sj.kendaraan?.no_polisi || "-";
                const driverLabel = sj.driver_teks || sj.personil_pengantar?.nama || "-";
                const boqLabel = sj.boq ? sj.boq.boq_number || `BOQ #${sj.boq.boq_id}` : "-";
                const tiketLabel = sj.boq?.tiket?.kode_tiket || "-";
                // Cluster: relasi sudah di-include backend (boq.cluster). Fallback
                // ke cluster_id mentah untuk record lama / non-BOQ.
                const clusterLabel = getClusterText(sj);
                const allReceived = itemRows.every(
                  (i) => i.qty_diterima !== null && i.qty_diterima !== undefined
                );

                return (
                  <Fragment key={sj.surat_jalan_id}>
                    <tr className="border-b border-gray-100 hover:bg-[#FDECE1]/30">
                      <td className="px-2 py-4 align-top">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : sj.surat_jalan_id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          aria-label={isExpanded ? "Tutup detail" : "Buka detail"}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-4 align-top font-medium text-gray-700">{sjIndex + 1}</td>
                      <td className="px-4 py-4 align-top text-gray-500">{tanggal}</td>
                      <td className="px-4 py-4 align-top font-medium text-gray-800">
                        <span className="flex items-center gap-2">
                          <PackageCheck size={16} className="text-[#E8632C]" />
                          {sj.nomor_surat_jalan}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-gray-600">
                        {pengirimText}
                        <span className="ml-1 text-xs text-gray-400">({tipePengirimLabel})</span>
                      </td>
                      <td className="px-4 py-4 align-top text-gray-600">{tujuanText}</td>
                      <td className="px-4 py-4 align-top text-gray-600">{getProjectText(sj)}</td>
                      <td className="px-4 py-4 align-top text-gray-600">{clusterLabel}</td>
                      <td className="px-4 py-4 align-top text-right text-gray-600">
                        {itemRows.length} barang · {totalQty} unit
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-4 align-top text-right">
                        {sj.status === "diterima_didistribusikan" ? (
                          <span className="text-sm font-semibold text-gray-400">Selesai</span>
                        ) : sj.status === "ready_putaway" ? (
                          allReceived ? (
                            <Link href={`/staff/putaway/${sj.surat_jalan_id}`} className="text-sm font-semibold text-[#E8632C] hover:underline">Putaway</Link>
                          ) : (
                            <Link href={`/staff/inbound/${sj.surat_jalan_id}`} className="text-sm font-semibold text-[#E8632C] hover:underline">Penerimaan</Link>
                          )
                        ) : sj.status === "draft_diajukan" &&
                          (String(user?.id) === String(sj.created_by || sj.creator?.user_id) ||
                            user?.role === "supervisor" ||
                            user?.role === "admin_general") ? (
                          <button
                            onClick={() => handleCancelDraft(sj.surat_jalan_id)}
                            disabled={cancellingId === sj.surat_jalan_id}
                            className="text-sm font-semibold text-rose-600 hover:underline disabled:opacity-60"
                          >
                            {cancellingId === sj.surat_jalan_id ? "Membatalkan..." : "Batalkan"}
                          </button>
                        ) : (
                          <Link href={`/staff/inbound/${sj.surat_jalan_id}`} className="text-sm font-semibold text-[#E8632C] hover:underline">Buka</Link>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <td colSpan={11} className="px-6 py-4">
                          <div className="rounded-xl border border-slate-100 bg-white p-4">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Info Pengiriman
                            </p>
                            <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm md:grid-cols-3">
                              <div className="flex gap-1.5"><span className="text-gray-500">PIC Pemohon:</span><span className="font-medium text-gray-800">{sj.pic_pemohon_nama || "-"}</span></div>
                              <div className="flex gap-1.5"><span className="text-gray-500">BOQ:</span><span className="font-medium text-gray-800">{boqLabel}</span></div>
                              <div className="flex gap-1.5"><span className="text-gray-500">Tiket:</span><span className="font-medium text-gray-800">{tiketLabel}</span></div>
                              <div className="flex gap-1.5"><span className="text-gray-500">Kendaraan:</span><span className="font-medium text-gray-800">{kendaraanLabel}</span></div>
                              <div className="flex gap-1.5"><span className="text-gray-500">No. Polisi:</span><span className="font-medium text-gray-800">{noPolisiLabel}</span></div>
                              <div className="flex gap-1.5"><span className="text-gray-500">Driver:</span><span className="font-medium text-gray-800">{driverLabel}</span></div>
                              <div className="flex gap-1.5">
                                <span className="text-gray-500">Surat Jalan:</span>
                                {sj.surat_jalan_url ? (
                                  <a href={sj.surat_jalan_url} target="_blank" rel="noreferrer" className="font-semibold text-[#E8632C] hover:underline">Lihat PDF</a>
                                ) : (
                                  <span className="font-medium text-gray-800">-</span>
                                )}
                              </div>
                            </div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Daftar Barang</p>
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
                                      <th className="py-2 pr-3 font-semibold">Catatan</th>
                                      <th className="py-2 font-semibold">Di Luar BOQ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {itemRows.map((item) => (
                                      <tr key={item.item_id} className="border-b border-gray-50 last:border-0">
                                        <td className="py-2 pr-3 font-medium text-gray-800">{item?.barang?.kode_perangkat || "-"}</td>
                                        <td className="py-2 pr-3 text-gray-600">{item?.barang?.nama_barang || item?.nama_barang || "-"}</td>
                                        <td className="py-2 pr-3 text-right text-gray-600">{Number(item?.qty || 0)}</td>
                                        <td className="py-2 pr-3 text-gray-600">
                                          {item?.satuan?.kode_satuan || item?.barang?.satuan_default?.kode_satuan || "-"}
                                        </td>
                                        <td className="py-2 pr-3 text-gray-600">{item?.catatan || "-"}</td>
                                        <td className="py-2">
                                          {item?.is_di_luar_boq ? (
                                            <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">Ya</span>
                                          ) : (
                                            <span className="text-xs text-gray-400">Tidak</span>
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









      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-xl border px-4 py-3 shadow-lg ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {toast.type === "success" ? "✓" : "✕"}
            {toast.message}
          </div>
        </div>
      )}
     </div>
   );
}
