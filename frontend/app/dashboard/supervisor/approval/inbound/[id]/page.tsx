"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { safeUrl } from "@/lib/safe-url";
import { ArrowLeft, Eye, ExternalLink, FileText, Maximize2, Package, X } from "lucide-react";
import { KondisiBadge } from "@/components/common/KondisiBadge";
import { KondisiUnitSummary } from "@/components/common/KondisiUnitSummary";
import { hasKondisiUnit, type KondisiUnit } from "@/lib/kondisi-barang";
import { getSuratJalanStatusLabel } from "@/lib/surat-jalan-status";
import { getItemFotoUrls } from "@/lib/surat-jalan-item-foto";

// Warna badge per status (tetap per-halaman); label dari helper bersama
// supaya tidak ada kode mentah seperti "ready_putaway" yang tampil ke supervisor.
const STATUS_TONE: Record<string, string> = {
  draft_diajukan: "bg-slate-100 text-slate-700 border-slate-200",
  menunggu_verifikasi: "bg-amber-50 text-amber-700 border-amber-200",
  ready_putaway: "bg-blue-50 text-blue-700 border-blue-200",
  disetujui: "bg-emerald-50 text-emerald-700 border-emerald-200",
  digenerate: "bg-blue-50 text-blue-700 border-blue-200",
  tiba_menunggu_konfirmasi: "bg-blue-50 text-blue-700 border-blue-200",
  diterima_didistribusikan: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sedang_dikirim: "bg-amber-50 text-amber-700 border-amber-200",
  ditolak: "bg-rose-50 text-rose-700 border-rose-200",
};

interface InboundItemBarang {
  kode_perangkat?: string;
  nama_barang?: string;
  satuan_default?: { kode_satuan?: string } | null;
  kategori?: { nama_kategori?: string; is_kritis?: boolean } | null;
}

interface InboundItem {
  item_id?: number | string;
  barang?: InboundItemBarang | null;
  qty?: number | string;
  satuan?: { kode_satuan?: string } | null;
  kondisi?: string | null;
  units?: KondisiUnit[] | null;
  serial_number?: string | null;
  catatan?: string | null;
  is_di_luar_boq?: boolean;
  fotos?: { foto_id: number | string; url: string; filename?: string; mimetype?: string; ukuran_bytes?: number | string }[] | null;
  foto_url?: string | null;
  approval_verification?: { approver_nama?: string; waktu_verifikasi?: string | null } | null;
  diperiksa_oleh_user?: { nama?: string } | null;
  diperiksa_pada?: string | null;
}

interface InboundDetail {
  nomor_surat_jalan?: string;
  status?: string;
  tipe?: string;
  tanggal?: string;
  tipe_pengirim?: string | null;
  gudang_asal?: { nama_gudang?: string } | null;
  gudang_tujuan?: { nama_gudang?: string } | null;
  tujuan_tipe?: string | null;
  alamat_lapangan?: string | null;
  pengirim_eksternal_nama?: string | null;
  supplier?: { kode?: string; nama?: string } | null;
  pic_pemohon_nama?: string | null;
  project?: { nama_project?: string } | null;
  cluster?: { cluster_id?: string; nama_cluster?: string } | null;
  cluster_id?: string | null;
  boq_id?: number | string | null;
  boq?: {
    boq_id?: number | string;
    boq_number?: string;
    cluster_id?: string | null;
    tiket?: { kode_tiket?: string };
    items?: Array<{ cluster_id?: string | null }> | null;
  } | null;
  creator?: { nama?: string } | null;
  surat_jalan_url?: string | null;
  document_url?: string | null;
  attachment?: string | null;
  items?: InboundItem[];
  notes?: string | null;
  catatan?: string | null;
}

const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

type AttachmentKind = "pdf" | "image" | "other";

// URL lampiran bisa datang absolut (http/https/data/blob) maupun relatif ke backend,
// jadi dinormalkan dulu agar iframe/img tidak salah origin.
function resolveAttachmentUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  return `${apiBase}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

// Backend hanya mengembalikan URL file (ekstensi asli dipertahankan oleh modul
// upload), sehingga tipe file dideteksi dari ekstensi / penanda MIME pada URL.
function getAttachmentKind(url?: string | null): AttachmentKind | null {
  const resolved = resolveAttachmentUrl(url);
  if (!resolved) return null;
  const normalized = resolved.split("?")[0].split("#")[0].toLowerCase();
  if (normalized.startsWith("data:image/")) return "image";
  if (normalized.startsWith("data:application/pdf") || normalized.includes("application/pdf")) return "pdf";
  if (normalized.endsWith(".pdf")) return "pdf";
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/.test(normalized)) {
    return "image";
  }
  return "other";
}

function sanitizeFileNameBase(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "surat-jalan"
  );
}

function getAttachmentFileName(url?: string | null, fallbackBase = "surat-jalan"): string {
  const resolved = resolveAttachmentUrl(url);
  if (!resolved) return "dokumen";
  const base = sanitizeFileNameBase(fallbackBase);

  // Base64 Data URL tidak punya nama file, jadi namanya disusun dari nomor surat jalan.
  if (resolved.startsWith("data:")) {
    const kind = getAttachmentKind(resolved);
    const ext = kind === "pdf" ? "pdf" : kind === "image" ? "jpg" : "bin";
    return `${base}.${ext}`;
  }

  try {
    const name = new URL(resolved).pathname.split("/").filter(Boolean).pop();
    return name ? decodeURIComponent(name) : "dokumen";
  } catch {
    return "dokumen";
  }
}

// Lampiran bisa terkirim sebagai Base64 Data URL (inline) maupun URL upload.
// Data URL tidak bisa dipakai apa adanya di iframe/tab baru di beberapa browser,
// jadi dikonversi dulu menjadi Blob URL supaya PDF/gambar tetap dirender.
function useAttachmentViewUrl(rawUrl?: string | null): string | null {
  const raw = rawUrl ?? null;
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!raw || !raw.startsWith("data:")) {
      setBlobUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    try {
      const commaIndex = raw.indexOf(",");
      const meta = raw.slice(0, commaIndex);
      const payload = raw.slice(commaIndex + 1);
      const mime = /data:([^;,]+)/i.exec(meta)?.[1] || "application/pdf";
      const binary = /;base64/i.test(meta) ? atob(payload) : decodeURIComponent(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
      setBlobUrl(objectUrl);
    } catch {
      setBlobUrl(null);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [raw]);

  if (!raw) return null;
  if (raw.startsWith("data:")) return blobUrl;
  return resolveAttachmentUrl(raw);
}

function tampilkan(value: unknown, fallback: unknown = "-") {
  if (value === null || value === undefined) return String(fallback);
  const s = String(value).trim();
  return s.length > 0 ? s : String(fallback);
}

function formatTanggal(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status?: string | null }) {
  const tone = STATUS_TONE[String(status || "").toLowerCase()];
  if (!tone) {
    return (
      <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
        {getSuratJalanStatusLabel(status)}
      </span>
    );
  }
  return (
    <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      {getSuratJalanStatusLabel(status)}
    </span>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );
}

export default function SupervisorInboundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { get } = useApi();
  const [detail, setDetail] = useState<InboundDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState<InboundItem | null>(null);
  const [detailFotoIndex, setDetailFotoIndex] = useState(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Dokumen lampiran staf: URL upload, Base64 Data URL (inline), maupun gambar.
  const attachmentRaw = detail?.surat_jalan_url || detail?.document_url || detail?.attachment || null;
  const attachmentViewUrl = useAttachmentViewUrl(attachmentRaw);
  const attachmentKind = getAttachmentKind(attachmentRaw);
  const attachmentIsInline = Boolean(attachmentRaw?.startsWith("data:"));
  const attachmentNomor = sanitizeFileNameBase(tampilkan(detail?.nomor_surat_jalan, "surat-jalan"));
  const attachmentFileName = getAttachmentFileName(attachmentRaw, attachmentNomor);
  const attachmentLabel = tampilkan(detail?.nomor_surat_jalan, "Inbound");
  const attachmentLoading = Boolean(attachmentIsInline && attachmentRaw && !attachmentViewUrl);
  const attachmentActionLabel =
    attachmentKind === "pdf" ? "Buka PDF / Unduh" : attachmentKind === "image" ? "Buka Gambar" : "Buka File";

  useEffect(() => {
    let mounted = true;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const resp = await get(`${apiBase}/api/surat-jalan/${params.id}`);
        const json = await resp.json();
        if (!mounted) return;
        setDetail(json?.data || null);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [get, params.id]);

  const openDetailModal = (item: InboundItem) => {
    setDetailModalItem(item);
    setDetailFotoIndex(0);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailModalItem(null);
    setDetailFotoIndex(0);
  };

  // Tutup modal dengan tombol Escape (aksesibilitas).
  useEffect(() => {
    if (!isDetailModalOpen && !isPreviewModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDetailModalOpen(false);
        setDetailModalItem(null);
        setDetailFotoIndex(0);
        setIsPreviewModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDetailModalOpen, isPreviewModalOpen]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-8 py-6">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#E8632C]" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="px-8 py-6">
        <p className="text-slate-500">Detail inbound tidak ditemukan.</p>
        <Button
          onClick={() => router.push("/dashboard/supervisor/approval/inbound")}
          className="mt-4 rounded-xl bg-[#E8632C] px-4 py-2 text-sm text-white"
        >
          Kembali
        </Button>
      </div>
    );
  }

  const items = Array.isArray(detail.items) ? detail.items : [];
  const totalUnit = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  const catatan = detail.notes || detail.catatan || null;

  const tujuanLabel =
    detail.tujuan_tipe === "lapangan"
      ? tampilkan(detail.alamat_lapangan || detail.gudang_tujuan?.nama_gudang)
      : tampilkan(detail.gudang_tujuan?.nama_gudang);

  const tujuanBadge =
    detail.tujuan_tipe === "lapangan" ? (
      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Lapangan</span>
    ) : detail.tujuan_tipe === "gudang" ? (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Gudang</span>
    ) : null;

  const pengirimLabel =
    detail.tipe_pengirim === "internal"
      ? tampilkan(detail.gudang_asal?.nama_gudang)
      : detail.tipe_pengirim === "external"
        ? tampilkan(
            detail.pengirim_eksternal_nama ||
              (detail.supplier ? `${detail.supplier.kode ?? ""} - ${detail.supplier.nama ?? "-"}` : null)
          )
        : tampilkan(detail.gudang_asal?.nama_gudang);

  const pengirimBadge =
    detail.tipe_pengirim === "internal" ? (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Internal</span>
    ) : detail.tipe_pengirim === "external" ? (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">External</span>
    ) : null;

  const hasBoq = detail.boq_id !== null && detail.boq_id !== undefined && detail.boq_id !== "";

  // Lima data yang diminta halaman detail: Cluster ID, Cluster Name,
  // Project Name, BOQ ID, Nomor Tiket. Urutan sumber mengikuti relasi
  // sebenarnya di schema.prisma: surat_jalan.cluster_id ( direktif ) lalu
  // boq.cluster_id, dan nomor tiket lewat boq -> tiket_material.
  const clusterIdValue = tampilkan(
    detail.cluster_id || detail.cluster?.cluster_id || detail.boq?.cluster_id || null
  );

  const clusterNameValue = tampilkan(
    detail.cluster?.nama_cluster,
    // Nama cluster cuma bisa didapat dari relasi cluster; kalau hanya ID yang
    // ada, tampilkan ID sebagai ganti nama (bukan "-") supaya tetap informatif.
    detail.cluster_id ||
      detail.cluster?.cluster_id ||
      detail.boq?.cluster_id ||
      null
  );

  const projectNameValue = tampilkan(detail.project?.nama_project);

  const boqIdValue = tampilkan(
    detail.boq_id !== null && detail.boq_id !== undefined && detail.boq_id !== ""
      ? String(detail.boq_id)
      : detail.boq?.boq_id !== null && detail.boq?.boq_id !== undefined && detail.boq?.boq_id !== ""
        ? String(detail.boq?.boq_id)
        : null
  );

  const nomorTiketValue = tampilkan(detail.boq?.tiket?.kode_tiket);

  const boqValue = hasBoq ? (
    <span className="flex flex-wrap items-center gap-2">
      <Link
        href="/dashboard/boq"
        className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600 hover:bg-orange-100"
      >
        <ExternalLink size={12} />
        {tampilkan(detail.boq?.boq_number, "BOQ Tidak Diketahui")}
      </Link>
      <span className="text-xs text-slate-500">Tiket: {tampilkan(detail.boq?.tiket?.kode_tiket)}</span>
    </span>
  ) : (
    <span className="italic text-slate-400">Tidak terhubung ke BOQ/Tiket</span>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-8 text-slate-800 mx-auto max-w-7xl space-y-6">
      {/* Header halaman + aksi Kembali */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => router.push("/dashboard/supervisor/approval/inbound")}
          className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-600 cursor-pointer"
          title="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-600 uppercase">
            <span>SUPERVISOR PORTAL</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 font-normal">Monitoring Penerimaan Inbound</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {tampilkan(detail.nomor_surat_jalan, "Detail Inbound")}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={detail.status} />
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              Inbound
            </span>
          </div>
        </div>
      </div>

      {/* Layout 2 kolom bersisian: dokumen bukti (kiri) & data barang + info transaksi (kanan) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {/* KOLOM KIRI: Preview file/dokumen/foto bukti yang diunggah staf */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Dokumen Lampiran Staf</h2>
            {attachmentRaw && attachmentKind && (
              <>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {attachmentKind === "pdf" ? "PDF" : attachmentKind === "image" ? "Gambar" : "File"}
                </span>
                {attachmentViewUrl && (
                  <a
                    href={safeUrl(attachmentViewUrl)}
                    {...(attachmentIsInline ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                    download={attachmentFileName || undefined}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    <ExternalLink size={12} />
                    {attachmentActionLabel}
                  </a>
                )}
              </>
            )}
          </div>

          {attachmentLoading ? (
            <div className="p-6">
              <div className="flex h-[748px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E8632C]" />
                <p className="mt-3 text-xs text-slate-400">Memuat dokumen PDF lampiran...</p>
              </div>
            </div>
          ) : !attachmentRaw ? (
            <div className="p-6">
              <div className="flex h-[748px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                <FileText size={32} className="text-slate-300" />
                <p className="mt-2 text-xs text-slate-400">Staf tidak mengunggah dokumen lampiran</p>
              </div>
            </div>
          ) : !attachmentViewUrl ? (
            <div className="p-6">
              <div className="flex h-[748px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                <FileText size={32} className="text-slate-300" />
                <div>
                  <p className="text-sm font-semibold text-slate-600">{attachmentFileName}</p>
                  <p className="mt-1 text-xs text-slate-400">Lampiran tidak dapat dibuka. Silakan hubungi staf pengirim.</p>
                </div>
              </div>
            </div>
          ) : attachmentKind === "pdf" ? (
            <div className="relative h-[780px] w-full bg-slate-100 p-2">
              <iframe
                src={safeUrl(attachmentViewUrl)}
                title="PDF Document"
                width="100%"
                height="100%"
                className="w-full h-[764px] rounded-lg border-0 bg-white"
              />
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="absolute bottom-4 right-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900/85 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-900"
              >
                <Maximize2 size={12} />
                Perbesar
              </button>
            </div>
          ) : attachmentKind === "image" ? (
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="group relative block h-[780px] w-full cursor-zoom-in overflow-hidden bg-slate-100 p-2"
              aria-label="Perbesar gambar lampiran"
              title="Klik untuk memperbesar"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachmentViewUrl}
                alt={`Dokumen lampiran ${attachmentLabel}`}
                className="h-full w-full rounded-lg border border-slate-200 bg-white object-contain"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-slate-900/70 py-2 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Maximize2 size={12} />
                Klik untuk memperbesar
              </span>
            </button>
          ) : (
            <div className="p-6">
              <div className="flex h-[748px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                <FileText size={32} className="text-slate-300" />
                <div>
                  <p className="text-sm font-semibold text-slate-600">{attachmentFileName}</p>
                  <p className="mt-1 text-xs text-slate-400">Pratinjau tidak tersedia untuk format file ini.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KOLOM KANAN: Informasi transaksi + tabel data barang */}
        <div className="space-y-6">
      {/* Ringkasan Informasi Transaksi */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <FileText className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Informasi Transaksi</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 p-6">
          <InfoField
            label="No. Surat Jalan / Penerimaan"
            value={<span className="font-semibold break-all text-slate-900">{tampilkan(detail.nomor_surat_jalan)}</span>}
          />
          <InfoField
            label="Tanggal Penerimaan"
            value={formatTanggal(detail.tanggal)}
          />
          <InfoField
            label="Vendor / Asal Pengirim"
            value={
              <span className="flex flex-wrap items-center gap-2">
                {pengirimLabel}
                {pengirimBadge}
              </span>
            }
          />
          <InfoField
            label="Gudang Tujuan"
            value={
              <span className="flex flex-wrap items-center gap-2">
                {tujuanLabel}
                {tujuanBadge}
              </span>
            }
          />
          <InfoField label="Status" value={<StatusBadge status={detail.status} />} />
          <InfoField label="Cluster ID" value={<span className="font-mono text-xs break-all text-slate-800">{clusterIdValue}</span>} />
          <InfoField label="Cluster Name" value={<span className="break-words text-slate-800">{clusterNameValue}</span>} />
          <InfoField label="Project Name" value={<span className="break-words text-slate-800">{projectNameValue}</span>} />
          <InfoField label="BOQ ID" value={<span className="font-mono text-xs text-slate-800">{boqIdValue}</span>} />
          <InfoField label="Nomor Tiket" value={<span className="font-mono text-xs break-all text-slate-800">{nomorTiketValue}</span>} />
          <InfoField label="BOQ / Tiket" value={boqValue} />
        </div>
      </div>

      {/* Tabel Data Barang */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <Package className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Data Barang Diterima</h2>
          <span className="ml-auto text-xs text-slate-400">{items.length} item • {totalUnit} unit</span>
        </div>

        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            Belum ada item barang pada transaksi inbound ini.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[5%]" />
                <col className="w-[13%]" />
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[9%]" />
                <col className="w-[14%]" />
                <col className="w-[15%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-3 text-center">No</th>
                  <th className="px-3 py-3">Kode Barang</th>
                  <th className="px-3 py-3">Nama Barang / Deskripsi Material</th>
                  <th className="px-3 py-3">Kategori / Tipe</th>
                  <th className="px-3 py-3 text-center">Qty & Satuan</th>
                  <th className="px-3 py-3">Kondisi Barang</th>
                  <th className="px-3 py-3">Catatan / Keterangan</th>
                  <th className="px-3 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const satuanLabel = tampilkan(item.satuan?.kode_satuan ?? item.barang?.satuan_default?.kode_satuan);
                  return (
                    <tr
                      key={item.item_id ?? index}
                      className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/70"} hover:bg-orange-50/50 transition-colors`}
                    >
                      <td className="px-3 py-4 text-center align-top text-xs font-semibold text-slate-500">{index + 1}</td>
                      <td className="px-3 py-4 align-top font-mono text-xs text-slate-600 break-all">
                        {tampilkan(item.barang?.kode_perangkat)}
                      </td>
                      <td className="px-3 py-4 align-top">
                        <div className="font-semibold text-slate-900 break-words">{tampilkan(item.barang?.nama_barang)}</div>
                        {item.serial_number && (
                          <div className="mt-0.5 text-xs text-slate-500">SN: {item.serial_number}</div>
                        )}
                      </td>
                      <td className="px-3 py-4 align-top">
                        <div className="text-slate-700">{tampilkan(item.barang?.kategori?.nama_kategori)}</div>
                        {item.barang?.kategori?.is_kritis && (
                          <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                            Kritis
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center align-top">
                        <div className="text-base font-bold text-slate-900">{Number(item.qty || 0)}</div>
                        <div className="text-xs text-slate-500">{satuanLabel}</div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        {hasKondisiUnit(item.units) ? (
                          <KondisiUnitSummary units={item.units} />
                        ) : item.kondisi ? (
                          <KondisiBadge value={item.kondisi} />
                        ) : (
                          <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 align-top text-slate-600">
                        <div className="whitespace-pre-wrap break-words">
                          {item.catatan || <span className="italic text-slate-400">-</span>}
                        </div>
                        {item.is_di_luar_boq && (
                          <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                            Di luar BOQ
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => openDetailModal(item)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-[#E8632C] hover:bg-orange-50 hover:text-[#E8632C]"
                          aria-label="Lihat detail barang"
                          title="Lihat Detail Barang"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <td colSpan={4} className="px-3 py-3 text-right">Total Kuantitas</td>
                  <td className="px-3 py-3 text-center text-sm text-slate-900">{totalUnit}</td>
                  <td colSpan={3} className="px-3 py-3 normal-case tracking-normal">
                    Total {items.length} item barang
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Catatan Penerimaan */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <FileText className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Catatan Penerimaan</h2>
        </div>
        <div className="p-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {catatan || <span className="italic text-slate-400">Tidak ada catatan untuk transaksi ini.</span>}
          </p>
        </div>
      </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 text-xs text-slate-500">
        Halaman ini bersifat <strong className="text-slate-700">read-only (monitoring)</strong>. Rincian barang
        ditampilkan sesuai hasil penerimaan yang diproses staf.
      </div>

      {/* Modal pratinjau lampiran staf (PDF / gambar) */}
      {isPreviewModalOpen && attachmentViewUrl && (attachmentKind === "pdf" || attachmentKind === "image") && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg mx-4 flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Dokumen Lampiran {attachmentKind === "pdf" ? "(PDF)" : "(Gambar)"}
                </h3>
                <p className="text-xs text-slate-500">{attachmentLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={safeUrl(attachmentViewUrl)}
                  {...(attachmentIsInline ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                  download={attachmentFileName || undefined}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  <ExternalLink size={12} />
                  {attachmentActionLabel}
                </a>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="h-[70vh] overflow-auto bg-slate-100 p-4">
              {attachmentKind === "pdf" ? (
                <iframe
                  src={safeUrl(attachmentViewUrl)}
                  title="PDF Document"
                  width="100%"
                  height="100%"
                  className="rounded-lg border-0 bg-white"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={safeUrl(attachmentViewUrl)}
                    alt={`Pratinjau gambar lampiran ${attachmentLabel}`}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal detail barang + foto bukti fisik */}
      {isDetailModalOpen && detailModalItem && (() => {
        const detailFotoUrls = getItemFotoUrls(detailModalItem);
        const activeFotoIndex = Math.min(detailFotoIndex, Math.max(detailFotoUrls.length - 1, 0));
        return (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
            onClick={closeDetailModal}
          >
            <div
              className="relative flex max-h-[90vh] w-full max-w-lg mx-4 flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-4 pl-6 pr-16">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Detail Barang</h3>
                  <p className="text-xs text-slate-500">
                    {detailModalItem.barang?.nama_barang || detailModalItem.barang?.kode_perangkat || "Item"}
                  </p>
                </div>
              </div>

              <div className="space-y-5 overflow-y-auto p-6">
                {/* Informasi lengkap barang */}
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Barang</p>
                    <p className="text-sm font-semibold text-slate-900 break-words">
                      {tampilkan(detailModalItem.barang?.nama_barang)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Kode Barang</p>
                    <p className="font-mono text-sm text-slate-700 break-all">
                      {tampilkan(detailModalItem.barang?.kode_perangkat)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Kategori / Tipe</p>
                    <p className="text-sm text-slate-700">
                      {tampilkan(detailModalItem.barang?.kategori?.nama_kategori)}
                      {detailModalItem.barang?.kategori?.is_kritis && (
                        <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                          Kritis
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Qty & Satuan</p>
                    <p className="text-sm text-slate-700">
                      <span className="font-bold text-slate-900">{Number(detailModalItem.qty || 0)}</span>
                      <span className="ml-1">
                        {tampilkan(
                          detailModalItem.satuan?.kode_satuan ?? detailModalItem.barang?.satuan_default?.kode_satuan
                        )}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Kondisi</p>
                    {hasKondisiUnit(detailModalItem.units) ? (
                      <KondisiUnitSummary units={detailModalItem.units} />
                    ) : detailModalItem.kondisi ? (
                      <KondisiBadge value={detailModalItem.kondisi} />
                    ) : (
                      <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                        Pending
                      </span>
                    )}
                  </div>
                  {detailModalItem.serial_number && (
                    <div>
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Serial Number</p>
                      <p className="font-mono text-sm text-slate-700">{detailModalItem.serial_number}</p>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Catatan / Keterangan</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {detailModalItem.catatan || <span className="italic text-slate-400">Tidak ada catatan.</span>}
                    </p>
                    {detailModalItem.is_di_luar_boq && (
                      <span className="mt-2 inline-block whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                        Di luar BOQ
                      </span>
                    )}
                  </div>
                </div>

                {/* Foto bukti fisik barang */}
                <div className="border-t border-slate-100 pt-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Foto Bukti Fisik Barang
                  </p>
                  {detailFotoUrls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10">
                      <p className="text-sm font-medium text-slate-400">Foto tidak tersedia</p>
                      <p className="mt-1 text-xs text-slate-400">Staf tidak mengunggah foto untuk item ini.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center overflow-hidden rounded-xl bg-slate-100 p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={detailFotoUrls[activeFotoIndex]}
                          alt={`Foto bukti ${detailModalItem.barang?.nama_barang || "barang"}`}
                          className="max-h-[45vh] w-auto max-w-full object-contain"
                        />
                      </div>
                      {detailFotoUrls.length > 1 && (
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="shrink-0 text-xs font-medium text-slate-400">
                            {activeFotoIndex + 1} / {detailFotoUrls.length}
                          </span>
                          <div className="flex gap-2 overflow-x-auto">
                            {detailFotoUrls.map((url, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setDetailFotoIndex(idx)}
                                className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                                  idx === activeFotoIndex ? "border-[#E8632C]" : "border-slate-200 hover:border-slate-300"
                                }`}
                                title={`Foto ${idx + 1}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={closeDetailModal}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Kembali
                </button>
              </div>

              {/* Tombol X tutup di sudut kanan atas */}
              <button
                type="button"
                onClick={closeDetailModal}
                aria-label="Tutup"
                className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-slate-800"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
