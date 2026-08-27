"use client";

import { X } from "lucide-react";

// Mendefinisikan struktur data untuk record inbound, dengan asumsi data relasi sudah lengkap dari API.
export interface InboundRecord {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  tanggal: string;
  project?: { nama_project: string };
  pengirim_or_vendor?: string; // Asal Gudang/Pengirim
  gudang_tujuan?: { nama_gudang: string };
  personil_pengantar?: { nama: string }; // Driver
  kendaraan?: { jenis_kendaraan: string; merk?: string; no_polisi: string };
  pic_pemohon_nama?: string;
  creator?: { nama: string }; // Staf yang menginput
  items: {
    item_id: number;
    barang: {
      kode_perangkat: string;
      nama_barang: string;
      satuan_default?: { kode_satuan: string };
    };
    qty: number;
    satuan: { kode_satuan: string };
    kondisi?: string;
    catatan?: string;
  }[];
}

// Komponen helper untuk menampilkan baris info, seragam dengan modal outbound.
function InfoRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="grid grid-cols-[130px_10px_1fr] items-start leading-snug">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-500">:</span>
      <span className="font-semibold text-gray-900">{value || "-"}</span>
    </div>
  );
}

/**
 * Komponen Modal untuk menampilkan detail Surat Jalan Inbound dengan format surat resmi.
 * @param record - Data surat jalan yang akan ditampilkan.
 * @param onClose - Fungsi untuk menutup modal.
 * @param children - Opsional, untuk menampung tombol aksi seperti 'Setujui' atau 'Tolak'.
 */
export default function InboundDetailModal({
  record,
  onClose,
  children,
}: {
  record: InboundRecord | null;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  if (!record) return null;

  const formatDate = (value: string) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return value;
    }
  };

  return (
    <div
      id="inbound-modal-wrapper"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl print:shadow-none"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar — disembunyikan saat cetak */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 print:hidden">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Detail Surat Jalan Inbound</h2>
            <p className="text-xs text-slate-500">{record.nomor_surat_jalan}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Area Dokumen yang Dapat Dicetak */}
        <div className="overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-[#F3D9C7] bg-white p-10 print:rounded-none print:border-0 print:p-0">
            {/* Header / Kop Surat */}
            <div className="mb-8 flex items-start justify-between border-b-2 border-[#E8632C] pb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo digitak grdasi.png"
                alt="Digitak Studio — PT Metanouva Informatika"
                className="h-16 w-auto object-contain"
              />
              <div className="flex flex-col items-end">
                <h1 className="text-3xl font-bold tracking-wide text-gray-900">SURAT JALAN</h1>
                <p className="mt-1 text-xs text-gray-500">Penerimaan Barang (Inbound)</p>
                <div className="mt-2 text-right">
                  <p className="text-xs font-bold text-[#E8632C]">PT Metanouva Informatika</p>
                  <p className="text-[10px] text-gray-400">Digitak Studio</p>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="mb-8 grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
              <div className="space-y-3">
                <InfoRow label="No Surat Jalan" value={record.nomor_surat_jalan} />
                <InfoRow label="Project" value={record.project?.nama_project} />
                <InfoRow label="Asal Pengiriman" value={record.pengirim_or_vendor} />
                <InfoRow label="PIC Pemohon" value={record.pic_pemohon_nama} />
              </div>
              <div className="space-y-3">
                <InfoRow label="Tanggal" value={formatDate(record.tanggal)} />
                <InfoRow label="Gudang Tujuan" value={record.gudang_tujuan?.nama_gudang} />
                <InfoRow label="Kendaraan" value={`${record.kendaraan?.merk || ""} ${record.kendaraan?.jenis_kendaraan || ""}`.trim()} />
                <InfoRow label="No Polisi" value={record.kendaraan?.no_polisi} />
                <InfoRow label="Driver" value={record.personil_pengantar?.nama} />
              </div>
            </div>

            {/* Tabel Daftar Barang */}
            <table className="mb-10 w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#FFF7ED]">
                  <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">No</th>
                  <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Kode Barang</th>
                  <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Nama Barang</th>
                  <th className="border border-[#F3D9C7] px-3 py-2 text-center font-semibold text-[#9a3412]">QTY</th>
                  <th className="border border-[#F3D9C7] px-3 py-2 text-center font-semibold text-[#9a3412]">UOM</th>
                  <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((item, i) => (
                  <tr key={item.item_id} className="even:bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2.5">{i + 1}</td>
                    <td className="border border-gray-200 px-3 py-2.5 font-medium">{item.barang.kode_perangkat}</td>
                    <td className="border border-gray-200 px-3 py-2.5">{item.barang.nama_barang}</td>
                    <td className="border border-gray-200 px-3 py-2.5 text-center font-semibold">{Number(item.qty || 0)}</td>
                    <td className="border border-gray-200 px-3 py-2.5 text-center">{item.satuan?.kode_satuan || item.barang?.satuan_default?.kode_satuan || "-"}</td>
                    <td className="border border-gray-200 px-3 py-2.5 text-gray-500">{item.kondisi || item.catatan || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bagian Tanda Tangan */}
            <div className="mb-8 grid grid-cols-3 gap-6 text-center text-sm">
              <div>
                <p className="mb-16 font-medium text-gray-700">Dibuat Oleh (Staf)</p>
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-semibold text-gray-900">{record.creator?.nama || "-"}</p>
                </div>
              </div>
              <div>
                <p className="mb-16 font-medium text-gray-700">Driver</p>
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-semibold text-gray-900">{record.personil_pengantar?.nama || "-"}</p>
                </div>
              </div>
              <div>
                <p className="mb-16 font-medium text-gray-700">Disetujui Oleh (Supervisor)</p>
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-semibold text-gray-900">(Nama Supervisor)</p>
                </div>
              </div>
            </div>

            {/* Footer Dokumen */}
            <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-[10px] text-gray-400">
              <span>{record.nomor_surat_jalan} | {formatDate(record.tanggal)}</span>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 print:hidden">
          <div className="flex-1">{children}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E8632C] bg-white px-4 py-2 text-xs font-semibold text-[#E8632C] shadow-sm transition hover:bg-[#E8632C] hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Cetak / PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* CSS Khusus untuk Mencetak */}
      <style jsx global>{`
        @media print {
          body > *:not(#inbound-modal-wrapper) {
            visibility: hidden;
          }
          #inbound-modal-wrapper,
          #inbound-modal-wrapper * {
            visibility: visible;
          }
          #inbound-modal-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            overflow: visible;
            background: transparent;
            backdrop-filter: none;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}