"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
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

function getStatusMeta(status: SuratJalanStatus, pickingSelesai?: boolean) {
  if (status === PICKING_SELESAI_STATUS && pickingSelesai) {
    return { label: "Picking Selesai — Siap Distribusi", tone: "bg-blue-50 text-blue-600" };
  }
  return STATUS_META[status] || STATUS_META.draft_diajukan;
}

const FILTER_TABS: { key: "SEMUA" | SuratJalanStatus; label: string }[] = [
  { key: "SEMUA", label: "Semua" },
  { key: "draft_diajukan", label: "Menunggu Persetujuan" },
  { key: "disetujui", label: "Disetujui" },
  { key: "digenerate", label: "Siap Kirim" },
  { key: "sedang_dikirim", label: "Sedang Dikirim" },
  { key: "tiba_di_transit", label: "Di Gudang Transit" },
  { key: "tiba_menunggu_konfirmasi", label: "Menunggu Konfirmasi" },
  { key: "diterima_didistribusikan", label: "Terkirim" },
  { key: "ditolak", label: "Ditolak" },
];

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
  const [activeTab, setActiveTab] = useState<"SEMUA" | SuratJalanStatus>("SEMUA");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const filtered = useMemo(
    () =>
      activeTab === "SEMUA" ? list : list.filter((sj) => sj.status === activeTab),
    [activeTab, list]
  );

  return (
    <div className="px-8 py-6">
      {/* Header halaman */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Surat Jalan</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar Surat Jalan Outbound yang jadi tanggung jawab Anda
          </p>
        </div>
        <Link href="/staff/outbound/new">
          <Button className="h-auto rounded-xl bg-[#E8632C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D9591F]">
            + Ajukan Surat Jalan
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
          <Button variant="outline" size="sm" onClick={fetchList} className="ml-auto">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Tab filter */}
      <div className="mb-5 flex gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[#E8632C] text-white"
                : "border border-[#F3D9C7] bg-white text-gray-600 hover:bg-[#FDECE1]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Surat Jalan */}
      <div className="rounded-2xl border border-[#F3D9C7] bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1700px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-3 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-12 text-center">No</th>
              <th className="px-4 py-4 font-semibold">Nomor Surat Jalan</th>
              <th className="px-4 py-4 font-semibold">Tipe Pengirim</th>
              <th className="px-4 py-4 font-semibold">Gudang Asal</th>
              <th className="px-4 py-4 font-semibold">Nama Vendor Eksternal</th>
              <th className="px-4 py-4 font-semibold">Kategori Tujuan</th>
              <th className="px-4 py-4 font-semibold">Tujuan</th>
              <th className="px-4 py-4 font-semibold">Titik Lapangan</th>
              <th className="px-4 py-4 font-semibold">Alamat Lapangan</th>
              <th className="px-4 py-4 font-semibold">Tanggal</th>
              <th className="px-4 py-4 font-semibold">PIC Pemohon</th>
              <th className="px-4 py-4 font-semibold">Cluster & BOQ</th>
              <th className="px-4 py-4 font-semibold">Project</th>
              <th className="px-4 py-4 font-semibold">Kendaraan</th>
              <th className="px-4 py-4 font-semibold">No. Polisi</th>
              <th className="px-4 py-4 font-semibold">Nama Driver</th>
              <th className="px-4 py-4 font-semibold">Kode Barang</th>
              <th className="px-4 py-4 font-semibold">Nama Barang</th>
              <th className="px-4 py-4 font-semibold text-right">Qty</th>
              <th className="px-4 py-4 font-semibold">Satuan</th>
              <th className="px-4 py-4 font-semibold">Foto</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={23} className="px-6 py-12 text-center text-gray-400">
                  Memuat data...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={23} className="px-6 py-12 text-center text-gray-400">
                  Tidak ada Surat Jalan pada filter ini.
                </td>
              </tr>
            ) : (
              filtered.map((sj, sjIndex) => {
                const meta = getStatusMeta(sj.status, sj.picking_selesai);
                const itemRows = sj.items && sj.items.length > 0 ? sj.items : [null];
                const rowSpan = itemRows.length;
                const tujuanText =
                  sj.tujuan_tipe === "lapangan"
                    ? sj.titik_lapangan?.nama_lokasi || "-"
                    : sj.gudang_tujuan?.nama_gudang || sj.project?.nama_project || "-";
                const tanggal = new Date(sj.tanggal || sj.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                });
                const tipePengirimLabel =
                  sj.tipe_pengirim === "internal" ? "Internal" : sj.tipe_pengirim === "external" ? "External" : "-";
                const kategoriTujuanLabel =
                  sj.tujuan_tipe === "lapangan" ? "Lapangan" : sj.tujuan_tipe === "gudang" ? "Gudang" : "-";
                const kendaraanLabel = sj.kendaraan
                  ? sj.kendaraan.merk && sj.kendaraan.merk.trim()
                    ? `${sj.kendaraan.merk} - ${sj.kendaraan.jenis_kendaraan}`
                    : sj.kendaraan.jenis_kendaraan
                  : "-";
                const gudangAsalId = sj.gudang_asal?.gudang_id;
                const itemStokQtys = sj.items.map((item) =>
                  (item.barang?.stok_gudangs || [])
                    .filter((st) => st.gudang_id === gudangAsalId && st.kondisi === "baik")
                    .reduce((sum, st) => sum + Number(st.qty || 0), 0)
                );
                const isKritis = itemStokQtys.some((qty) => qty < KRITIS_THRESHOLD);
                const isMenipis = itemStokQtys.some((qty) => qty >= KRITIS_THRESHOLD && qty < MENIPIS_THRESHOLD);
                const rowNumber = sjIndex + 1;

                return itemRows.map((item, itemIdx) => {
                  const isFirst = itemIdx === 0;
                  return (
                    <tr
                      key={`${sj.surat_jalan_id}-${item ? item.item_id : "empty"}-${itemIdx}`}
                      className={`border-b border-gray-50 last:border-0 hover:bg-[#FDECE1]/30 ${itemIdx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                    >
                      {isFirst && (
                        <>
                          <td className="px-3 py-4 whitespace-nowrap text-center text-xs text-slate-500" rowSpan={rowSpan}>{rowNumber}</td>
                          <td className="px-4 py-4 align-top font-medium text-gray-800" rowSpan={rowSpan}>
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
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{tipePengirimLabel}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>
                            {sj.tipe_pengirim === "internal" ? sj.gudang_asal?.nama_gudang || "-" : "-"}
                          </td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>
                            {sj.tipe_pengirim === "external" ? sj.pengirim_eksternal_nama || "-" : "-"}
                          </td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{kategoriTujuanLabel}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{tujuanText}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>
                            {sj.tujuan_tipe === "lapangan" ? sj.titik_lapangan?.nama_lokasi || "-" : "-"}
                          </td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>
                            {sj.tujuan_tipe === "lapangan" ? sj.alamat_lapangan || "-" : "-"}
                          </td>
                          <td className="px-4 py-4 align-top text-gray-500" rowSpan={rowSpan}>{tanggal}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{sj.pic_pemohon_nama || "-"}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>
                            <span className="block">
                              {sj.boq ? sj.boq.boq_number || `BOQ #${sj.boq.boq_id}` : "-"}
                            </span>
                            <span className="block text-xs text-gray-400">
                              Tiket: {sj.boq?.tiket?.kode_tiket || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{sj.project?.nama_project || "-"}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{kendaraanLabel}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{sj.kendaraan?.no_polisi || "-"}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{sj.personil_pengantar?.nama || "-"}</td>
                        </>
                      )}
                      <td className="px-4 py-3 align-top font-medium text-gray-800">
                        {item?.barang?.kode_perangkat || "-"}
                      </td>
                      <td className="px-4 py-3 align-top text-gray-600">{item?.barang?.nama_barang || "-"}</td>
                      <td className="px-4 py-3 align-top text-right text-gray-600">{item ? Number(item.qty || 0) : "-"}</td>
                      <td className="px-4 py-3 align-top text-gray-600">
                        {item?.satuan?.kode_satuan || item?.barang?.satuan_default?.kode_satuan || "-"}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {item?.foto_url ? (
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
                      {isFirst && (
                        <>
                          <td className="px-4 py-4 align-top" rowSpan={rowSpan}>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top text-right" rowSpan={rowSpan}>
                            <Link
                              href={`/staff/outbound/${sj.surat_jalan_id}`}
                              className="text-sm font-semibold text-[#E8632C] hover:underline"
                            >
                              Buka
                            </Link>
                          </td>
                        </>
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
