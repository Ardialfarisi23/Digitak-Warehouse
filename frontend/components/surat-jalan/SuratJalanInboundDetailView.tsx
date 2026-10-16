"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { safeUrl } from "@/lib/safe-url";
import { ExternalLink, FileText, Maximize2, Package, X } from "lucide-react";
import { KondisiBadge } from "@/components/common/KondisiBadge";
import { KondisiUnitSummary } from "@/components/common/KondisiUnitSummary";
import { hasKondisiUnit, type KondisiUnit } from "@/lib/kondisi-barang";

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
  boq_id?: number | string | null;
  boq?: { boq_number?: string; tiket?: { kode_tiket?: string } } | null;
  creator?: { nama?: string } | null;
  surat_jalan_url?: string | null;
  document_url?: string | null;
  attachment?: string | null;
  items?: InboundItem[];
  notes?: string | null;
  catatan?: string | null;
}

interface SuratJalanInboundDetailViewProps {
  data: InboundDetail | null | undefined;
  onItemDetail?: (item: InboundItem) => void;
}

const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft_diajukan: { label: "Draft Diajukan", className: "bg-slate-100 text-slate-700 border-slate-200" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", className: "bg-amber-50 text-amber-700 border-amber-200" },
  ready_putaway: { label: "Siap Putaway", className: "bg-blue-50 text-blue-700 border-blue-200" },
  disetujui: { label: "Disetujui", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  digenerate: { label: "Digenerate", className: "bg-blue-50 text-blue-700 border-blue-200" },
  tiba_menunggu_konfirmasi: { label: "Menunggu Konfirmasi", className: "bg-blue-50 text-blue-700 border-blue-200" },
  diterima_didistribusikan: { label: "Diterima & Didistribusikan", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  sedang_dikirim: { label: "Sedang Dikirim", className: "bg-amber-50 text-amber-700 border-amber-200" },
  ditolak: { label: "Ditolak", className: "bg-rose-50 text-rose-700 border-rose-200" },
};

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

function getAttachmentKind(url?: string | null): "pdf" | "image" | "other" | null {
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

function useAttachmentViewUrl(rawUrl?: string | null): string | null {
  const raw = rawUrl ?? null;

  const blobUrl = useMemo(() => {
    if (!raw || !raw.startsWith("data:")) return null;
    try {
      const commaIndex = raw.indexOf(",");
      const meta = raw.slice(0, commaIndex);
      const payload = raw.slice(commaIndex + 1);
      const mime = /data:([^;,]+)/i.exec(meta)?.[1] || "application/pdf";
      const binary = /;base64/i.test(meta) ? atob(payload) : decodeURIComponent(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes], { type: mime }));
    } catch {
      return null;
    }
  }, [raw]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (!raw) return null;
  if (raw.startsWith("data:")) return blobUrl;
  return resolveAttachmentUrl(raw);
}

function tampilkan(value: unknown, fallback = "-") {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s.length > 0 ? s : fallback;
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
  const meta = STATUS_META[String(status || "").toLowerCase()];
  if (!meta) {
    return (
      <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
        {tampilkan(status)}
      </span>
    );
  }
  return (
    <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>
      {meta.label}
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

export function SuratJalanInboundDetailView({
  data,
  onItemDetail,
}: SuratJalanInboundDetailViewProps) {
  // Hooks must run unconditionally. Compute derived values after hooks.
  const attachmentRaw = data?.surat_jalan_url || data?.document_url || data?.attachment || null;
  const attachmentViewUrl = useAttachmentViewUrl(attachmentRaw);
  const attachmentKind = getAttachmentKind(attachmentRaw);
  const attachmentIsInline = Boolean(attachmentRaw?.startsWith("data:"));
  const attachmentNomor = sanitizeFileNameBase(tampilkan(data?.nomor_surat_jalan, "surat-jalan"));
  const attachmentFileName = getAttachmentFileName(attachmentRaw, attachmentNomor);
  const attachmentLabel = tampilkan(data?.nomor_surat_jalan, "Inbound");
  const attachmentLoading = Boolean(attachmentIsInline && attachmentRaw && !attachmentViewUrl);
  const attachmentActionLabel =
    attachmentKind === "pdf" ? "Buka PDF / Unduh" : attachmentKind === "image" ? "Buka Gambar" : "Buka File";

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
        Data surat jalan tidak tersedia.
      </div>
    );
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const totalUnit = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

  const catatan = data.notes || data.catatan || null;

  const tujuanLabel =
    data.tujuan_tipe === "lapangan"
      ? tampilkan(data.alamat_lapangan || data.gudang_tujuan?.nama_gudang)
      : tampilkan(data.gudang_tujuan?.nama_gudang);

  const tujuanBadge =
    data.tujuan_tipe === "lapangan" ? (
      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Lapangan</span>
    ) : data.tujuan_tipe === "gudang" ? (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Gudang</span>
    ) : null;

  const pengirimLabel =
    data.tipe_pengirim === "internal"
      ? tampilkan(data.gudang_asal?.nama_gudang)
      : data.tipe_pengirim === "external"
        ? tampilkan(
            data.pengirim_eksternal_nama ||
              (data.supplier ? `${data.supplier.kode ?? ""} - ${data.supplier.nama ?? "-"}` : null)
          )
        : tampilkan(data.gudang_asal?.nama_gudang);

  const pengirimBadge =
    data.tipe_pengirim === "internal" ? (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Internal</span>
    ) : data.tipe_pengirim === "external" ? (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">External</span>
    ) : null;

  const hasBoq = data.boq_id !== null && data.boq_id !== undefined && data.boq_id !== "";
  const boqValue = hasBoq ? (
    <span className="flex flex-wrap items-center gap-2">
      <Link
        href="/dashboard/boq"
        className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600 hover:bg-orange-100"
      >
        <ExternalLink size={12} />
        {tampilkan(data.boq?.boq_number, "BOQ Tidak Diketahui")}
      </Link>
      <span className="text-xs text-slate-500">Tiket: {tampilkan(data.boq?.tiket?.kode_tiket)}</span>
    </span>
  ) : (
    <span className="italic text-slate-400">Tidak terhubung ke BOQ/Tiket</span>
  );

  const openPreview = () => {
    if (attachmentViewUrl && (attachmentKind === "pdf" || attachmentKind === "image")) {
      setIsPreviewModalOpen(true);
    }
  };

  return (
    <>
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
                onClick={openPreview}
                className="absolute bottom-4 right-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900/85 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-900"
              >
                <Maximize2 size={12} />
                Perbesar
              </button>
            </div>
          ) : attachmentKind === "image" ? (
            <button
              type="button"
              onClick={openPreview}
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
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 p-6 sm:grid-cols-2">
              <InfoField
                label="No. Surat Jalan / Penerimaan"
                value={<span className="font-semibold break-all text-slate-900">{tampilkan(data.nomor_surat_jalan)}</span>}
              />
              <InfoField
                label="Tanggal Penerimaan"
                value={formatTanggal(data.tanggal)}
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
              <InfoField label="Status" value={<StatusBadge status={data.status} />} />
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
              <div className="overflow-x-auto">
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
                            {onItemDetail ? (
                              <button
                                type="button"
                                onClick={() => onItemDetail(item)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-[#E8632C] hover:bg-orange-50 hover:text-[#E8632C]"
                                aria-label="Lihat detail barang"
                                title="Lihat Detail Barang"
                              >
                                <X size={16} />
                              </button>
                            ) : null}
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

      {/* Modal pratinjau lampiran (PDF / gambar) */}
      {isPreviewModalOpen && attachmentViewUrl && (attachmentKind === "pdf" || attachmentKind === "image") && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
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
    </>
  );
}
