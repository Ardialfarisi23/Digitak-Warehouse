"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, ArrowLeft, ExternalLink, Loader2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { KRITIS_THRESHOLD, MENIPIS_THRESHOLD } from "@/lib/constants/stok";

const STATUS_META: Record<string, { label: string; tone: string }> = {
  draft_diajukan: { label: "Menunggu Persetujuan Supervisor", tone: "bg-amber-50 text-amber-700" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", tone: "bg-amber-50 text-amber-700" },
  ready_putaway: { label: "Siap Putaway", tone: "bg-blue-50 text-blue-600" },
  disetujui: { label: "Disetujui — Siap Picking", tone: "bg-emerald-50 text-emerald-600" },
  digenerate: { label: "Digenerate", tone: "bg-blue-50 text-blue-600" },
  diterima_didistribusikan: { label: "Terkirim", tone: "bg-gray-100 text-gray-500" },
  sedang_dikirim: { label: "Sedang Dikirim", tone: "bg-amber-50 text-amber-600" },
  tiba_di_transit: { label: "Di Gudang Transit", tone: "bg-purple-50 text-purple-700" },
  ditolak: { label: "Ditolak", tone: "bg-rose-50 text-rose-600" },
};

function getStatusMeta(status: string, pickingSelesai?: boolean) {
  if (status === "disetujui" && pickingSelesai) {
    return { label: "Picking Selesai — Siap Distribusi", tone: "bg-blue-50 text-blue-600" };
  }
  return STATUS_META[status] || { label: status, tone: "bg-gray-100 text-gray-600" };
}

interface SuratJalanItem {
  item_id: number;
  barang_id: number;
  qty: number;
  satuan_id: number;
  foto_url?: string | null;
  barang?: {
    nama_barang: string;
    kode_perangkat: string;
    satuan_default?: { kode_satuan?: string };
    kategori?: { is_kritis?: boolean };
    stok_gudangs?: { qty: number; gudang_id: number; zona_id: number | null; kondisi: string }[];
  };
  satuan?: { kode_satuan?: string };
}

interface SuratJalan {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  tipe: string;
  status: string;
  created_at: string;
  created_by?: number;
  notes?: string;
  items: SuratJalanItem[];
  gudang_asal?: { gudang_id: number; nama_gudang: string };
  gudang_tujuan?: { nama_gudang: string };
  project?: { nama_project: string };
  kendaraan?: { jenis_kendaraan: string; no_polisi: string };
  personil_pengantar?: { nama: string };
  boq?: {
    boq_id: number;
    boq_number?: string;
    tiket?: { kode_tiket: string };
  } | null;
  pic_pemohon_nama?: string;
  boq_id?: number | null;
  tujuan_tipe?: string | null;
  titik_lapangan?: { nama_lokasi?: string } | null;
  tipe_pengirim?: string | null;
  pengirim_eksternal_nama?: string | null;
  alamat_lapangan?: string | null;
  picking_selesai?: boolean;
  // Checkpoint Gudang Transit (0..n) — dari tabel surat_jalan_transit.
  riwayat_perjalanan?: Array<{
    transit_id: number | string;
    urutan: number;
    tiba_at: string;
    berangkat_at?: string | null;
    catatan_tiba?: string | null;
    catatan_berangkat?: string | null;
    gudang?: { nama_gudang?: string } | null;
    tiba_oleh?: { nama?: string } | null;
    berangkat_oleh?: { nama?: string } | null;
    items?: Array<{ item_id: number; qty: number; kondisi?: string | null }>;
  }>;
}

// Baris label:nilai yang selalu sejajar, berapa pun panjang labelnya.
// FIX: value dikasih min-w-0 + break-all — sebelumnya teks panjang tanpa
// spasi (mis. nomor surat jalan "298990/SJ/OUT/DIGITAK/VIII/2026") nggak
// mau wrap dan overflow nabrak ke kolom sebelah, karena grid item secara
// default nggak mau nyusut di bawah lebar konten aslinya (min-width: auto).
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_10px_1fr] items-start leading-snug">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-500">:</span>
      <span className="min-w-0 break-all font-semibold text-gray-900">{value}</span>
    </div>
  );
}

export default function SuratJalanDetailPage() {
  const params = useParams<{ suratJalanId: string }>();
  const router = useRouter();
  const { get, put } = useApi();
  const { user } = useAuth();

  const [suratJalan, setSuratJalan] = useState<SuratJalan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [cancellingDraft, setCancellingDraft] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await get(`${baseUrl}/api/surat-jalan/outbound/${params.suratJalanId}`);
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.message || "Gagal mengambil detail Surat Jalan.");
        }
        const json = await response.json();
        const data = json?.data ?? json;
        setSuratJalan(data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
        setSuratJalan(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [get, params.suratJalanId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#E8632C]" />
      </div>
    );
  }

  if (error || !suratJalan) {
    return (
      <div className="px-8 py-6">
        <p className="text-gray-500">{error || "Surat Jalan tidak ditemukan."}</p>
        <button onClick={() => router.push("/staff/outbound")} className="mt-3 text-sm font-semibold text-[#E8632C] hover:underline">
          Kembali ke daftar Surat Jalan
        </button>
      </div>
    );
  }

  const tujuanText = suratJalan.gudang_tujuan?.nama_gudang || suratJalan.project?.nama_project || "-";

  const tujuanLabel =
    suratJalan.tujuan_tipe === "lapangan"
      ? suratJalan.alamat_lapangan || "-"
      : suratJalan.tujuan_tipe === "gudang"
        ? suratJalan.gudang_tujuan?.nama_gudang || "-"
        : suratJalan.gudang_tujuan?.nama_gudang || "-";

  const tujuanBadge =
    suratJalan.tujuan_tipe === "lapangan" ? (
      <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Lapangan</span>
    ) : suratJalan.tujuan_tipe === "gudang" ? (
      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Gudang</span>
    ) : null;

  const pengirimLabel =
    suratJalan.tipe_pengirim === "internal"
      ? suratJalan.gudang_asal?.nama_gudang || "-"
      : suratJalan.tipe_pengirim === "external"
        ? suratJalan.pengirim_eksternal_nama || "-"
        : suratJalan.gudang_asal?.nama_gudang || "-";

  const pengirimBadge =
    suratJalan.tipe_pengirim === "internal" ? (
      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Internal</span>
    ) : suratJalan.tipe_pengirim === "external" ? (
      <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">External</span>
    ) : null;
  const tanggal = new Date(suratJalan.created_at).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const mappedItems = suratJalan.items.map((item) => {
    const gudangAsalId = suratJalan.gudang_asal?.gudang_id;
    const stokQty = (item.barang?.stok_gudangs || [])
      .filter((s) => s.gudang_id === gudangAsalId && s.kondisi === "baik")
      .reduce((sum, s) => sum + Number(s.qty || 0), 0);
    const kritisLevel = stokQty < KRITIS_THRESHOLD ? "kritis" : stokQty < MENIPIS_THRESHOLD ? "menipis" : "normal";
    return {
      kodeBarang: item.barang?.kode_perangkat || String(item.barang_id),
      namaBarang: item.barang?.nama_barang || "-",
      qty: item.qty,
      uom: item.satuan?.kode_satuan || item.barang?.satuan_default?.kode_satuan || "Unit",
      fotoUrl: item.foto_url || null,
      keterangan: null,
      isKritis: kritisLevel === "kritis",
      isMenipis: kritisLevel === "menipis",
    };
  });

  const displaySJ = {
    ...suratJalan,
    nomor: suratJalan.nomor_surat_jalan,
    tujuan: tujuanText,
    tanggal,
    projectName: suratJalan.project?.nama_project || "-",
    namaPicPemohon: suratJalan.pic_pemohon_nama || "-",
    kendaraan: suratJalan.kendaraan?.jenis_kendaraan || "-",
    noPolisi: suratJalan.kendaraan?.no_polisi || "-",
    namaDriver: suratJalan.personil_pengantar?.nama || "-",
    items: mappedItems,
    alamatLapangan: suratJalan.alamat_lapangan || undefined,
  };

  const canCancelDraft =
    suratJalan.status === "draft_diajukan" &&
    (String(user?.id) === String(suratJalan.created_by) ||
      user?.role === "supervisor" ||
      user?.role === "admin_general");

  const handleCancelDraft = async () => {
    if (!suratJalan) return;

    const confirmed = window.confirm("Yakin ingin membatalkan draft ini? Aksi ini tidak dapat dibatalkan.");
    if (!confirmed) return;

    setCancellingDraft(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await put(`${baseUrl}/api/surat-jalan/${suratJalan.surat_jalan_id}/cancel-draft`, {});

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal membatalkan draft surat jalan.");
      }

      router.push("/staff/outbound");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setCancellingDraft(false);
    }
  };

  return (
    <div className="px-8 py-6">
      {/* Toolbar — hilang saat print */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/staff/outbound")} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
            <ArrowLeft size={16} />
            Kembali
          </button>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusMeta(suratJalan.status, suratJalan.picking_selesai).tone}`}>
            {getStatusMeta(suratJalan.status, suratJalan.picking_selesai).label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {suratJalan.status === "disetujui" && suratJalan.picking_selesai !== true && (
            <Link
              href={`/staff/outbound/${suratJalan.surat_jalan_id}/picking`}
              className="rounded-xl border border-[#F3D9C7] bg-white px-4 py-2.5 text-sm font-semibold text-[#E8632C] hover:bg-[#FDECE1]"
            >
              Picking
            </Link>
          )}
          {suratJalan.status === "disetujui" && suratJalan.picking_selesai === true && (
            <button
              disabled
              className="cursor-not-allowed rounded-xl border border-[#F3D9C7] bg-white px-4 py-2.5 text-sm font-semibold text-gray-400 opacity-70"
            >
              Picking sudah selesai
            </button>
          )}
          {(suratJalan.status === "disetujui" ||
            suratJalan.status === "sedang_dikirim" ||
            suratJalan.status === "tiba_di_transit") && (
            <div>
              {(suratJalan.status === "disetujui" && suratJalan.picking_selesai === true) ? (
                <Link
                  href={`/staff/outbound/${suratJalan.surat_jalan_id}/distribution`}
                  className="rounded-xl border border-[#F3D9C7] bg-white px-4 py-2.5 text-sm font-semibold text-[#E8632C] hover:bg-[#FDECE1]"
                >
                  Distribusi
                </Link>
              ) : suratJalan.status === "sedang_dikirim" || suratJalan.status === "tiba_di_transit" ? (
                <Link
                  href={`/staff/outbound/${suratJalan.surat_jalan_id}/distribution`}
                  className="rounded-xl border border-[#F3D9C7] bg-white px-4 py-2.5 text-sm font-semibold text-[#E8632C] hover:bg-[#FDECE1]"
                >
                  Distribusi
                </Link>
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed rounded-xl border border-[#F3D9C7] bg-white px-4 py-2.5 text-sm font-semibold text-gray-400 opacity-70"
                >
                  Distribusi
                </button>
              )}
              {suratJalan.status === "disetujui" && suratJalan.picking_selesai === false && (
                <p className="mt-1 text-xs text-gray-500">
                  Selesaikan picking terlebih dahulu
                </p>
              )}
            </div>
          )}
          {canCancelDraft && (
            <Button
              disabled={cancellingDraft}
              onClick={handleCancelDraft}
              className="flex h-auto items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {cancellingDraft ? "Membatalkan..." : "Batalkan Draft"}
            </Button>
          )}
          {suratJalan.status !== "draft_diajukan" && suratJalan.status !== "ditolak" && (
            <Button
              disabled={generatingPdf}
              onClick={async () => {
                setGeneratingPdf(true);
                try {
                  const { downloadSuratJalanPdf } = await import("@/lib/staff/surat-jalan-pdf");
                  await downloadSuratJalanPdf(displaySJ as any, user?.name || user?.username || "-");
                } finally {
                  setGeneratingPdf(false);
                }
              }}
              className="flex h-auto items-center gap-2 rounded-xl bg-[#E8632C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-60"
            >
              <Download size={16} />
              {generatingPdf ? "Menyiapkan PDF..." : "Download PDF"}
            </Button>
          )}
        </div>
      </div>

      {suratJalan.status === "draft_diajukan" && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#F3D9C7] bg-white p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Loader2 size={28} className="animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Menunggu Persetujuan Supervisor</h3>
            <p className="mt-2 text-sm text-gray-500">
              Surat jalan belum dapat digenerate karena masih menunggu persetujuan dari supervisor.
            </p>
            <div className="mt-6 w-full rounded-xl border border-gray-100 bg-gray-50 p-4 text-left text-sm">
              <p className="text-gray-500">Nomor Surat Jalan</p>
              <p className="font-semibold text-gray-900">{suratJalan.nomor_surat_jalan}</p>
              <p className="mt-2 text-gray-500">Pengirim</p>
              <p className="font-semibold text-gray-900">
                {pengirimLabel}
                {pengirimBadge}
              </p>
              <p className="mt-2 text-gray-500">Tujuan</p>
              <p className="font-semibold text-gray-900">
                {tujuanLabel}
                {tujuanBadge}
              </p>
              <p className="mt-2 text-gray-500">Project</p>
              <p className="font-semibold text-gray-900">{suratJalan.project?.nama_project || "-"}</p>
            </div>
          </div>
        </div>
      )}

      {suratJalan.status === "ditolak" && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#F3D9C7] bg-white p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <X size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Surat Jalan Ditolak</h3>
            <p className="mt-2 text-sm text-gray-500">
              Pengajuan surat jalan ini ditolak oleh supervisor.
            </p>
            <div className="mt-6 w-full rounded-xl border border-gray-100 bg-gray-50 p-4 text-left text-sm">
              <p className="text-gray-500">Nomor Surat Jalan</p>
              <p className="font-semibold text-gray-900">{suratJalan.nomor_surat_jalan}</p>
              <p className="mt-2 text-gray-500">Tujuan</p>
              <p className="font-semibold text-gray-900">{tujuanText}</p>
              <p className="mt-2 text-gray-500">Project</p>
              <p className="font-semibold text-gray-900">{suratJalan.project?.nama_project || "-"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Kronologi titipan Gudang Transit (0..n checkpoint). Kosong berarti
          pengiriman langsung ke tujuan akhir tanpa titipan. */}
      {(suratJalan.riwayat_perjalanan?.length ?? 0) > 0 && (
        <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-purple-100 bg-purple-50/40 p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-purple-700">
            Riwayat Perjalanan — Gudang Transit
          </p>
          <ol className="space-y-3">
            {(suratJalan.riwayat_perjalanan || []).map((c) => {
              const totalQty = (c.items || []).reduce((sum, it) => sum + Number(it.qty || 0), 0);
              const sudahBerangkat = Boolean(c.berangkat_at);
              return (
                <li key={String(c.transit_id)} className="rounded-xl border border-purple-100 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-purple-800">
                      #{c.urutan} · {c.gudang?.nama_gudang || "Gudang Transit"}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        sudahBerangkat ? "bg-emerald-50 text-emerald-700" : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {sudahBerangkat ? "Sudah berangkat" : "Masih dititipkan"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    Tiba: {new Date(c.tiba_at).toLocaleString("id-ID")}
                    {c.tiba_oleh?.nama ? ` · oleh ${c.tiba_oleh.nama}` : ""} · {totalQty} unit
                  </p>
                  {sudahBerangkat && c.berangkat_at && (
                    <p className="mt-1 text-xs text-gray-600">
                      Berangkat: {new Date(c.berangkat_at).toLocaleString("id-ID")}
                      {c.berangkat_oleh?.nama ? ` · oleh ${c.berangkat_oleh.nama}` : ""}
                    </p>
                  )}
                  {c.catatan_tiba && (
                    <p className="mt-1 text-xs italic text-purple-700">Catatan: {c.catatan_tiba}</p>
                  )}
                  {c.catatan_berangkat && (
                    <p className="mt-1 text-xs italic text-gray-600">
                      Catatan berangkat: {c.catatan_berangkat}
                    </p>
                  )}
                  {(c.items || []).length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-purple-100 pt-2">
                      {(c.items || []).map((it) => (
                        <li key={it.item_id} className="text-xs text-gray-700">
                          Item #{it.item_id}: {it.qty} unit · {it.kondisi || "baik"}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {suratJalan.status !== "draft_diajukan" && suratJalan.status !== "ditolak" && (
        <div id="surat-jalan-document" className="mx-auto max-w-3xl rounded-2xl border border-[#F3D9C7] bg-white p-10 print:rounded-none print:border-0 print:p-0">
        {/* Kop surat dengan logo */}
        <div className="mb-8 flex items-start justify-between border-b-2 border-[#E8632C] pb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-digitak-gradasi.png" alt="Digitak Studio — PT Metanouva Informatika" className="h-16 w-auto object-contain" />
          <div className="flex flex-col items-end">
            <h1 className="text-3xl font-bold tracking-wide text-gray-900">SURAT JALAN</h1>
            <p className="mt-1 text-xs text-gray-500">Surat Jalan Internal — Digitak Studio</p>
            <div className="mt-2 text-right">
              <p className="text-xs font-bold text-[#E8632C]">PT Metanouva Informatika</p>
              <p className="text-[10px] text-gray-400">Digitak Studio</p>
            </div>
          </div>
        </div>

        {/* Info grid — 2 kolom */}
        <div className="mb-8 grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
          <div className="min-w-0 space-y-3">
            <InfoRow label="No Surat Jalan" value={displaySJ.nomor} />
            <InfoRow label="Pengirim" value={<span>{pengirimLabel} {pengirimBadge}</span>} />
            <InfoRow label="Tujuan" value={<span>{tujuanLabel} {tujuanBadge}</span>} />
            {suratJalan.tujuan_tipe === "lapangan" && suratJalan.alamat_lapangan && (
              <InfoRow label="Alamat Lapangan" value={suratJalan.alamat_lapangan} />
            )}
            <InfoRow label="Project" value={displaySJ.projectName || "-"} />
          </div>
          <div className="min-w-0 space-y-3">
            <InfoRow label="Tanggal" value={displaySJ.tanggal} />
            <InfoRow label="Nama PIC Pemohon" value={displaySJ.namaPicPemohon} />
            <InfoRow label="Kendaraan" value={displaySJ.kendaraan} />
            <InfoRow label="No Polisi" value={displaySJ.noPolisi} />
            <InfoRow label="Nama Driver" value={displaySJ.namaDriver} />
            {suratJalan.boq_id ? (
              <InfoRow
                label="BOQ / Tiket"
                value={
                  <span className="inline-flex items-center gap-2">
                    <Link
                      href="/dashboard/boq"
                      className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600 hover:bg-orange-100"
                    >
                      <ExternalLink size={12} />
                      {suratJalan.boq?.boq_number || `BOQ #${suratJalan.boq_id}`}
                    </Link>
                    <span className="text-xs text-slate-500">
                      Tiket: {suratJalan.boq?.tiket?.kode_tiket || "-"}
                    </span>
                  </span>
                }
              />
            ) : (
              <InfoRow
                label="BOQ / Tiket"
                value={<span className="text-xs text-slate-400">Tidak terhubung ke BOQ/Tiket</span>}
              />
            )}
          </div>
        </div>

        {/* Tabel item */}
        <table className="mb-10 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#FFF7ED]">
              <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">No</th>
              <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Kode Barang</th>
              <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Nama Barang</th>
              <th className="border border-[#F3D9C7] px-3 py-2 text-center font-semibold text-[#9a3412]">QTY</th>
              <th className="border border-[#F3D9C7] px-3 py-2 text-center font-semibold text-[#9a3412]">UOM</th>
              <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Kondisi</th>
              <th className="border border-[#F3D9C7] px-3 py-2 text-center font-semibold text-[#9a3412]">Foto</th>
            </tr>
          </thead>
          <tbody>
            {mappedItems.map((item, i) => (
              <tr key={item.kodeBarang} className="even:bg-gray-50">
                <td className="border border-gray-200 px-3 py-2.5">{i + 1}</td>
                <td className="border border-gray-200 px-3 py-2.5 font-medium">{item.kodeBarang}</td>
                <td className="border border-gray-200 px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span>{item.namaBarang}</span>
                    {item.isKritis && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">Kritis</span>
                    )}
                    {item.isMenipis && !item.isKritis && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">Menipis</span>
                    )}
                  </div>
                </td>
                <td className="border border-gray-200 px-3 py-2.5 text-center font-semibold">{item.qty}</td>
                <td className="border border-gray-200 px-3 py-2.5 text-center">{item.uom}</td>
                <td className="border border-gray-200 px-3 py-2.5 text-gray-500">{item.keterangan || "-"}</td>
                <td className="border border-gray-200 px-3 py-2.5 text-center">
                  {item.fotoUrl ? (
                    <a
                      href={item.fotoUrl}
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
            {Array.from({ length: Math.max(0, 3 - mappedItems.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-gray-200 px-3 py-6" colSpan={7} />
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tanda tangan */}
        <div className="mb-8 grid grid-cols-3 gap-6 text-center text-sm">
          <div>
            <p className="mb-16 font-medium text-gray-700">Material Handler</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-semibold text-gray-900">{user?.name || user?.username || ""}</p>
            </div>
          </div>
          <div>
            <p className="mb-16 font-medium text-gray-700">Driver</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-semibold text-gray-900">{displaySJ.namaDriver}</p>
            </div>
          </div>
          <div>
            <p className="mb-16 font-medium text-gray-700">PIC Pemohon (Penerima)</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-semibold text-gray-900">{displaySJ.namaPicPemohon}</p>
            </div>
          </div>
        </div>

        {/* Footer dokumen */}
        <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-[10px] text-gray-400">
          <span>
            {displaySJ.nomor} | {displaySJ.tanggal}
          </span>
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
        }
      `}</style>
    </div>
  );
}
