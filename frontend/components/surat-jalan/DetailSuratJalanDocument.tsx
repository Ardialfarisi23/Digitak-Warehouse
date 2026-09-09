"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

export interface DetailSuratJalanItem {
  item_id?: number | string;
  barang?: {
    kode_perangkat?: string;
    nama_barang?: string;
    satuan_default?: { kode_satuan?: string };
  };
  qty?: number | string;
  satuan?: { kode_satuan?: string };
  kondisi?: string;
  serial_number?: string;
  catatan?: string;
}

export interface DetailSuratJalanData {
  surat_jalan_id?: number | string;
  nomor_surat_jalan?: string;
  tipe?: "INBOUND" | "OUTBOUND" | "inbound" | "outbound" | string;
  status?: string;
  tanggal?: string;
  project?: { nama_project?: string };
  gudang_asal?: { nama_gudang?: string };
  gudang_tujuan?: { nama_gudang?: string };
  personil_pengantar?: { nama?: string };
  kendaraan?: { jenis_kendaraan?: string; no_polisi?: string };
  creator?: { nama?: string };
  boq_id?: number | string | null;
  boq?: {
    boq_number?: string;
    tiket?: { kode_tiket?: string };
  };
  pic_pemohon_nama?: string;
  items?: DetailSuratJalanItem[];
  tujuan_tipe?: string | null;
  titik_lapangan?: { nama_lokasi?: string } | null;
  tipe_pengirim?: string | null;
  pengirim_eksternal_nama?: string | null;
  [key: string]: unknown;
}

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="grid grid-cols-[130px_10px_1fr] items-start leading-snug">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-500">:</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function formatTanggal(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTipe(value?: string) {
  if (!value) return "-";
  const v = String(value).toUpperCase();
  if (v === "INBOUND") return "Inbound";
  if (v === "OUTBOUND") return "Outbound";
  return v;
}

function tampilkan(value: unknown, fallback = "-") {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s.length > 0 ? s : fallback;
}

export interface DetailSuratJalanDocumentProps {
  data: DetailSuratJalanData | null | undefined;
  /**
   * Tampilkan kolom-kolom yang hanya relevan untuk dokumen yang siap dicetak.
   * - "full"   : lengkap (header info + tabel item + 3 kolom ttd + footer). Default.
   * - "compact": versi ringkas tanpa item table (untuk preview / sidebar) — belum
   *              digunakan di fase ini, disediakan untuk fleksibilitas.
   */
  variant?: "full" | "compact";
  /**
   * Renderer opsional untuk kolom "Aksi" pada setiap baris item (kolom tambahan
   * di paling kanan tabel). Jika tidak diberikan, kolom Aksi tidak ditampilkan.
   * Dipakai oleh halaman Admin Delivery untuk membuka modal dokumentasi barang.
   */
  renderItemAction?: (item: DetailSuratJalanItem, index: number) => React.ReactNode;
  /**
   * Tampilkan kolom "Aksi" di tabel item. Default: true bila `renderItemAction`
   * diberikan, false bila tidak.
   */
  showItemAction?: boolean;
}

export function DetailSuratJalanDocument({
  data,
  variant = "full",
  renderItemAction,
  showItemAction,
}: DetailSuratJalanDocumentProps) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
        Data surat jalan tidak tersedia.
      </div>
    );
  }

  const tipeLabel = formatTipe(data.tipe);
  const tanggalLabel = formatTanggal(data.tanggal);

  const namaGudangAsal = tampilkan(data.gudang_asal?.nama_gudang);
  const namaGudangTujuan = tampilkan(data.gudang_tujuan?.nama_gudang);
  const namaProject = tampilkan(data.project?.nama_project);
  const jenisKendaraan = tampilkan(data.kendaraan?.jenis_kendaraan);
  const noPolisi = tampilkan(data.kendaraan?.no_polisi);
  const namaDriver = tampilkan(data.personil_pengantar?.nama);
  const namaMaterialHandler = tampilkan(data.creator?.nama);

  const tujuanLabel =
    data.tujuan_tipe === "lapangan"
      ? data.titik_lapangan?.nama_lokasi || namaGudangTujuan
      : namaGudangTujuan;

  const tujuanBadge =
    data.tujuan_tipe === "lapangan" ? (
      <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Lapangan</span>
    ) : data.tujuan_tipe === "gudang" ? (
      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Gudang</span>
    ) : null;

  const pengirimLabel =
    data.tipe_pengirim === "internal"
      ? namaGudangAsal
      : data.tipe_pengirim === "external"
        ? tampilkan(data.pengirim_eksternal_nama)
        : namaGudangAsal;

  const pengirimBadge =
    data.tipe_pengirim === "internal" ? (
      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Internal</span>
    ) : data.tipe_pengirim === "external" ? (
      <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">External</span>
    ) : null;

  const hasBoq = data.boq_id !== null && data.boq_id !== undefined && data.boq_id !== "";
  const boqValue = hasBoq ? (
    <span className="inline-flex items-center gap-2">
      <Link
        href="/dashboard/boq"
        className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600 hover:bg-orange-100"
      >
        <ExternalLink size={12} />
        {tampilkan(data.boq?.boq_number, `BOQ #${data.boq_id}`)}
      </Link>
      <span className="text-xs text-slate-500">
        Tiket: {tampilkan(data.boq?.tiket?.kode_tiket)}
      </span>
    </span>
  ) : (
    <span className="text-xs text-slate-400">Tidak terhubung ke BOQ/Tiket</span>
  );

  const items = Array.isArray(data.items) ? data.items : [];
  const showAksi = showItemAction ?? Boolean(renderItemAction);
  const emptyColSpan = showAksi ? 7 : 6;

  return (
    <div
      id="surat-jalan-document"
      className="mx-auto max-w-3xl rounded-2xl border border-[#F3D9C7] bg-white p-10 print:rounded-none print:border-0 print:p-0"
    >
      {/* Kop surat dengan logo */}
      <div className="mb-8 flex items-start justify-between border-b-2 border-[#E8632C] pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo digitak grdasi.png"
          alt="Digitak Studio — PT Metanouva Informatika"
          className="h-16 w-auto object-contain"
        />
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
        <div className="space-y-3">
          <InfoRow label="No Surat Jalan" value={tampilkan(data.nomor_surat_jalan)} />
          <InfoRow label="Tipe" value={tipeLabel} />
          <InfoRow label="Project" value={namaProject} />
          <InfoRow
            label="Gudang Asal"
            value={
              <span>
                {pengirimLabel}
                {pengirimBadge}
              </span>
            }
          />
        </div>
        <div className="space-y-3">
          <InfoRow label="Tanggal" value={tanggalLabel} />
          <InfoRow
            label="Gudang Tujuan"
            value={
              <span>
                {tujuanLabel}
                {tujuanBadge}
              </span>
            }
          />
          <InfoRow label="Kendaraan" value={jenisKendaraan} />
          <InfoRow label="No Polisi" value={noPolisi} />
          <InfoRow label="Driver" value={namaDriver} />
          <InfoRow label="BOQ / Tiket" value={boqValue} />
        </div>
      </div>

      {variant === "full" && (
        <>
          {/* Tabel item */}
          <table className="mb-10 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#FFF7ED]">
                <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">
                  No
                </th>
                <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">
                  Kode Barang
                </th>
                <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">
                  Nama Barang
                </th>
                <th className="border border-[#F3D9C7] px-3 py-2 text-center font-semibold text-[#9a3412]">
                  QTY
                </th>
                <th className="border border-[#F3D9C7] px-3 py-2 text-center font-semibold text-[#9a3412]">
                  UOM
                </th>
                <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">
                  Keterangan
                </th>
                {showAksi && (
                  <th className="border border-[#F3D9C7] px-3 py-2 text-center font-semibold text-[#9a3412]">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={emptyColSpan}
                    className="border border-gray-200 px-3 py-6 text-center text-slate-400"
                  >
                    Belum ada item barang.
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <tr key={item.item_id ?? i} className="even:bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2.5">{i + 1}</td>
                    <td className="border border-gray-200 px-3 py-2.5 font-medium">
                      {tampilkan(item.barang?.kode_perangkat)}
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5">
                      {tampilkan(item.barang?.nama_barang)}
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5 text-center font-semibold">
                      {Number(item.qty || 0)}
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5 text-center">
                      {tampilkan(
                        item.satuan?.kode_satuan ?? item.barang?.satuan_default?.kode_satuan,
                      )}
                    </td>
                    <td className="border border-gray-200 px-3 py-2.5 text-gray-500">
                      {tampilkan(item.kondisi ?? item.catatan)}
                    </td>
                    {showAksi && (
                      <td className="border border-gray-200 px-3 py-2.5 text-center">
                        {renderItemAction ? renderItemAction(item, i) : null}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Tanda tangan */}
          <div className="mb-8 grid grid-cols-3 gap-6 text-center text-sm">
            <div className="flex flex-col justify-between h-32">
              <span className="font-medium text-gray-700 min-h-[32px] flex items-center justify-center">
                Material Handler
              </span>
              <div>
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-semibold text-gray-900">{namaMaterialHandler}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between h-32">
              <span className="font-medium text-gray-700 min-h-[32px] flex items-center justify-center">
                Driver
              </span>
              <div>
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-semibold text-gray-900">{namaDriver}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between h-32">
              <span className="font-medium text-gray-700 min-h-[32px] flex items-center justify-center">
                PIC Pemohon (Penerima)
              </span>
              <div>
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-semibold text-gray-900">{tampilkan(data.pic_pemohon_nama)}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer dokumen */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-[10px] text-gray-400">
        <span>Dokumen ini digenerate secara otomatis oleh sistem Digitak Studio.</span>
        <span>
          {tampilkan(data.nomor_surat_jalan)} | {tanggalLabel}
        </span>
      </div>
    </div>
  );
}

export default DetailSuratJalanDocument;