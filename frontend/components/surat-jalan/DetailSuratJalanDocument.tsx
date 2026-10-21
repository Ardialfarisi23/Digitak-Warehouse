"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getKondisiLabel, getKondisiUnitRows, formatRingkasanKondisiUnits, type KondisiUnit } from "@/lib/kondisi-barang";
import { useAuth } from "@/lib/auth-context";
import { canAccessBoqModule } from "@/lib/navigation";

export interface DetailSuratJalanItem {
  item_id?: number | string;
  barang?: {
    kode_perangkat?: string;
    nama_barang?: string;
    satuan_default?: { kode_satuan?: string };
    kategori?: { is_kritis?: boolean };
  };
  qty?: number | string;
  satuan?: { kode_satuan?: string };
  kondisi?: string;
  // Penilaian kondisi per unit dari proses inbound (relasi `units`).
  units?: KondisiUnit[] | null;
  serial_number?: string;
  catatan?: string;
  is_di_luar_boq?: boolean;
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
  kendaraan?: { jenis_kendaraan?: string; merk?: string; no_polisi?: string } | null;
  // Kolom teks bebas (inbound), sudah di-fallback-kan di backend
  kendaraan_teks?: string | null;
  no_polisi_teks?: string | null;
  driver_teks?: string | null;
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
  alamat_lapangan?: string | null;
  tipe_pengirim?: string | null;
  pengirim_eksternal_nama?: string | null;
  supplier?: { kode?: string; nama?: string } | null;
  [key: string]: unknown;
}

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="grid grid-cols-[7rem_auto_1fr] gap-x-2 items-start leading-snug text-gray-900">
      <span className="text-xs text-gray-500 sm:text-sm sm:font-medium sm:text-gray-900">{label}</span>
      <span className="text-xs text-gray-500 sm:text-sm sm:font-medium sm:text-gray-900">:</span>
      <span className="min-w-0 break-words overflow-wrap-break-word font-semibold sm:font-normal">{value}</span>
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

function formatNomorSuratWithWbr(value: string) {
  if (!value) return "-";
  const parts = value.split('/');
  if (parts.length <= 1) return value;
  const result: React.ReactNode[] = [];
  parts.forEach((part, index) => {
    if (index > 0) {
      result.push('/', <wbr key={`wbr-${index}`} />, part);
    } else {
      result.push(part);
    }
  });
  return result;
}

export interface DetailSuratJalanDocumentProps {
  data: DetailSuratJalanData | null | undefined;
  variant?: "full" | "compact";
  renderItemAction?: (item: DetailSuratJalanItem, index: number) => React.ReactNode;
  showItemAction?: boolean;
  hideTujuanBadge?: boolean;
  stockStatusByItemId?: Record<number, { status: string; availableQty: number; otherConditions?: string }>;
}

export function DetailSuratJalanDocument({
  data,
  variant = "full",
  renderItemAction,
  showItemAction,
  hideTujuanBadge = false,
  stockStatusByItemId,
}: DetailSuratJalanDocumentProps) {
  const { user } = useAuth();

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
  // Kolom teks bebas (inbound) diprioritaskan; relasi master data jadi cadangan.
  // Outbound tidak pernah mengisi kolom teks, jadi perilakunya tidak berubah.
  const namaKendaraanTeks = tampilkan(data.kendaraan_teks);
  const noPolisiTeks = tampilkan(data.no_polisi_teks);
  const driverTeks = tampilkan(data.driver_teks);
  const jenisKendaraan = tampilkan(data.kendaraan?.jenis_kendaraan);
  const merkKendaraan = tampilkan(data.kendaraan?.merk);
  const noPolisi = noPolisiTeks !== "-" ? noPolisiTeks : tampilkan(data.kendaraan?.no_polisi);
  const namaDriver = driverTeks !== "-" ? driverTeks : tampilkan(data.personil_pengantar?.nama);

  const kendaraanLabel =
    namaKendaraanTeks !== "-"
      ? namaKendaraanTeks
      : merkKendaraan && merkKendaraan !== "-"
        ? `${merkKendaraan} - ${jenisKendaraan}`
        : jenisKendaraan;

  const namaMaterialHandler = tampilkan(data.creator?.nama);

  const tujuanLabel =
    data.tujuan_tipe === "lapangan"
      ? data.alamat_lapangan || namaGudangTujuan
      : namaGudangTujuan;

  const tujuanBadge =
    data.tujuan_tipe === "lapangan" ? (
       <span className="ml-2 whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Lapangan</span>
    ) : data.tujuan_tipe === "gudang" && !hideTujuanBadge ? (
       <span className="ml-2 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Gudang</span>
    ) : null;

  const pengirimLabel =
    data.tipe_pengirim === "internal"
      ? namaGudangAsal
      : data.tipe_pengirim === "external"
        ? tampilkan(
            data.pengirim_eksternal_nama ||
              (data.supplier ? `${data.supplier.kode ?? ""} - ${data.supplier.nama ?? "-"}` : null)
          )
        : namaGudangAsal;

  const pengirimBadge =
    data.tipe_pengirim === "internal" ? (
       <span className="ml-2 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Internal</span>
    ) : data.tipe_pengirim === "external" ? (
       <span className="ml-2 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">External</span>
    ) : null;

   const hasBoq = data.boq_id !== null && data.boq_id !== undefined && data.boq_id !== "";
   // Staf Gudang tidak punya akses ke modul BOQ (K7) → nomor BOQ ditampilkan
   // sebagai teks biasa, tanpa tautan ke halaman manajemen.
   const canOpenBoq = canAccessBoqModule(user?.role);
   const boqValue = hasBoq ? (
     <span className="inline-flex flex-nowrap items-center gap-2">
       {canOpenBoq ? (
         <Link
           href="/dashboard/boq"
           className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600 hover:bg-orange-100"
         >
           <ExternalLink size={12} />
           {tampilkan(data.boq?.boq_number, "BOQ Tidak Diketahui")}
         </Link>
       ) : (
         <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">
           {tampilkan(data.boq?.boq_number, "BOQ Tidak Diketahui")}
         </span>
       )}
       <span className="text-xs text-slate-500">
         Tiket: {tampilkan(data.boq?.tiket?.kode_tiket)}
       </span>
     </span>
   ) : (
     <span className="text-slate-400">-</span>
   );

  const items = Array.isArray(data.items) ? data.items : [];
  const showAksi = showItemAction ?? Boolean(renderItemAction);
   const emptyColSpan = showAksi ? 6 : 5;

  return (
       <div
       id="surat-jalan-document"
       className="w-full rounded-2xl border border-[#F3D9C7] bg-white p-4 sm:p-8 print:rounded-none print:border-0 print:p-0"
    >
      {/* Kop surat dengan logo */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b-2 border-[#E8632C] pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-digitak-gradasi.png"
          alt="Digitak Studio — PT Metanouva Informatika"
          className="h-12 w-auto object-contain sm:h-12 md:h-14"
        />
        <div className="flex flex-col items-start sm:items-end text-center sm:text-right">
           <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-wide text-gray-900">SURAT JALAN</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 break-words">Surat Jalan Internal — Digitak Studio</p>
          <div className="mt-2 text-center sm:text-right">
             <p className="text-xs font-bold text-[#E8632C]">PT Metanouva Informatika</p>
             <p className="text-xs text-gray-400">Digitak Studio</p>
          </div>
        </div>
      </div>

      {/* Info grid — responsive */}
      <div className="mb-8 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 md:gap-x-8 text-xs sm:text-sm print:gap-x-8 print:text-xs">
        <div className="space-y-3 sm:border-r sm:border-gray-100 sm:pr-4 print:border-0 print:pr-0">
           <InfoRow 
             label="No Surat Jalan" 
             value={<span className="break-all font-semibold">{formatNomorSuratWithWbr(tampilkan(data.nomor_surat_jalan))}</span>} 
           />
          <InfoRow label="Tipe" value={tipeLabel} />
          <InfoRow label="Project" value={namaProject} />
           <InfoRow
             label="Gudang Asal"
             value={
               <span className="flex flex-nowrap items-center gap-2">
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
               <span className="flex flex-nowrap items-center gap-2">
                 {tujuanLabel}
                 {tujuanBadge}
               </span>
             }
           />
          <InfoRow label="Kendaraan" value={kendaraanLabel} />
          <InfoRow label="No Polisi" value={noPolisi} />
          <InfoRow label="Driver" value={namaDriver} />
          <InfoRow label="Cluster & BOQ" value={boqValue} />
        </div>
      </div>

      {variant === "full" && (
        <>
{/* Tabel item — desktop & print */}
            <div className="w-full overflow-x-auto overscroll-x-contain print:block">
               <table className="w-full border-collapse text-xs">
               <thead>
                 <tr className="bg-[#FFF7ED]">
                    <th className="border px-1 py-1 text-center font-semibold whitespace-nowrap text-xs">No</th>

                    <th className="border px-1 py-1 text-left font-semibold text-xs">Nama Barang</th>
                    <th className="border px-1 py-1 text-center font-semibold whitespace-nowrap text-xs">QTY</th>
                    <th className="border px-1 py-1 text-center font-semibold whitespace-nowrap text-xs">UOM</th>
                   <th className="border px-2 py-1.5 text-left font-semibold text-xs">Kondisi</th>
                    {showAksi && (
                      <th className="border px-1 py-1 text-center font-semibold whitespace-nowrap print:hidden">Aksi</th>
                    )}
                 </tr>
               </thead>
            <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={emptyColSpan}
                className="border px-2 py-1.5 text-center text-slate-400"
              >
                Belum ada item barang.
              </td>
            </tr>
          ) : (
            items.map((item, i) => (
              <tr key={item.item_id ?? i} className="even:bg-gray-50">
                  <td className="border px-1 py-1 text-center text-xs">{i + 1}</td>
                  <td className="border px-1 py-1 text-left text-xs break-words">
                   <div className="block">
                     <span className="block" title={tampilkan(item.barang?.nama_barang)}>
                       {tampilkan(item.barang?.nama_barang)}
                     </span>
                     {item.barang?.kode_perangkat && (
                       <span className="block text-xs mt-1" title={tampilkan(item.barang?.kode_perangkat)}>
                         {tampilkan(item.barang?.kode_perangkat)}
                       </span>
                     )}
                   </div>
                   {item.barang?.kategori?.is_kritis && (
                     <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                       Kritis
                     </span>
                   )}
                 </td>
                 <td className="border px-1 py-1 text-center text-xs font-semibold">{Number(item.qty || 0)}</td>
                 <td className="border px-1 py-1 text-center text-xs">{tampilkan(item.satuan?.kode_satuan ?? item.barang?.satuan_default?.kode_satuan)}</td>
                 <td className="border px-1 py-1 text-left text-xs">
                  <div>
                    {(() => {
                      const barisUnit = getKondisiUnitRows(item.units);
                      if (barisUnit.length > 0) {
                        return (
                          <div className="space-y-0.5">
                            <div className="font-medium">
                              {formatRingkasanKondisiUnits(item.units)}
                            </div>
                            {barisUnit.map((row) => (
                              <div
                                key={row.nomor}
                                       className="text-xs leading-tight text-slate-500"
                              >
Unit {row.nomor}: {getKondisiLabel(row.kondisi)}
                                      {row.catatan ? ` (${row.catatan})` : ""}
                                    </div>
                              ))}
                            {item.catatan && (
                              <div className="text-xs text-slate-500 italic">{item.catatan}</div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <>
                          {item.kondisi != null && <div>{getKondisiLabel(item.kondisi)}</div>}
                          {item.catatan && <div className="text-xs text-slate-500 italic">{item.catatan}</div>}
                          {item.kondisi == null && !item.catatan && !item.is_di_luar_boq && tampilkan(null)}
                        </>
                      );
                    })()}
                    {item.is_di_luar_boq && (
                             <span className="inline-block whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                        Di luar BOQ
                      </span>
                    )}
                  </div>
                </td>
                 {showAksi && (
                   <td className="border px-1 py-1 text-center print:hidden">{renderItemAction ? renderItemAction(item, i) : null}</td>
                 )}
              </tr>
            ))
          )}
            </tbody>
          </table>
          </div>



           {/* Tanda tangan */}
           <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 print:grid-cols-3 text-center text-sm">
             <div className="border border-gray-200 rounded-md p-3 sm:border-0 sm:p-0">
               <div className="flex flex-col items-center">
                 <span className="block text-xs text-gray-500 mb-2">Material Handler</span>
                 <div className="h-16 w-12 border-b border-gray-400 mb-2"></div>
                 <p className="font-semibold text-gray-900 text-sm">{namaMaterialHandler}</p>
               </div>
             </div>
             <div className="border border-gray-200 rounded-md p-3 sm:border-0 sm:p-0">
               <div className="flex flex-col items-center">
                 <span className="block text-xs text-gray-500 mb-2">Driver</span>
                 <div className="h-16 w-12 border-b border-gray-400 mb-2"></div>
                 <p className="font-semibold text-gray-900 text-sm">{namaDriver}</p>
               </div>
             </div>
             <div className="border border-gray-200 rounded-md p-3 sm:border-0 sm:p-0">
               <div className="flex flex-col items-center">
                 <span className="block text-xs text-gray-500 mb-2">PIC Penerima (Penerima)</span>
                 <div className="h-16 w-12 border-b border-gray-400 mb-2"></div>
                 <p className="font-semibold text-gray-900 text-sm">{tampilkan(data.pic_pemohon_nama)}</p>
               </div>
             </div>
           </div>
        </>
      )}

      {/* Footer dokumen */}
       <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-xs text-gray-400">
        <span>Dokumen ini digenerate secara otomatis oleh sistem Digitak Studio.</span>
        <span>
          {tampilkan(data.nomor_surat_jalan)} | {tanggalLabel}
        </span>
      </div>
    </div>
  );
}

export default DetailSuratJalanDocument;