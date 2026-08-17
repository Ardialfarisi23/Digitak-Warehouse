"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { downloadSuratJalanPdf } from "@/lib/staff/surat-jalan-pdf";

interface SuratJalanItem {
  item_id: number;
  barang_id: number;
  qty: number;
  satuan_id: number;
  barang?: { nama_barang: string; kode_perangkat: string; satuan_default?: { kode_satuan: string } };
  satuan?: { kode_satuan: string };
}

interface SuratJalan {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  tipe: string;
  status: string;
  created_at: string;
  notes?: string;
  items: SuratJalanItem[];
  gudang_asal?: { nama_gudang: string };
  gudang_tujuan?: { nama_gudang: string };
  project?: { nama_project: string };
  kendaraan?: { jenis_kendaraan: string; no_polisi: string };
  personil_pengantar?: { nama: string };
}

// Baris label:nilai yang selalu sejajar, berapa pun panjang labelnya.
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_10px_1fr] items-start leading-snug">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-500">:</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

export default function SuratJalanDetailPage() {
  const params = useParams<{ suratJalanId: string }>();
  const router = useRouter();
  const { get } = useApi();
  const { user } = useAuth();

  const [suratJalan, setSuratJalan] = useState<SuratJalan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await get(`${baseUrl}/api/surat-jalan/${params.suratJalanId}`);
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
        <button
          onClick={() => router.push("/staff/outbound")}
          className="mt-3 text-sm font-semibold text-[#E8632C] hover:underline"
        >
          Kembali ke daftar Surat Jalan
        </button>
      </div>
    );
  }

  const tujuanText = suratJalan.gudang_tujuan?.nama_gudang || suratJalan.project?.nama_project || "-";
  const tanggal = new Date(suratJalan.created_at).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const mappedItems = suratJalan.items.map((item) => ({
    kodeBarang: item.barang?.kode_perangkat || String(item.barang_id),
    namaBarang: item.barang?.nama_barang || "-",
    qty: item.qty,
    uom: item.satuan?.kode_satuan || item.barang?.satuan_default?.kode_satuan || "Unit",
    keterangan: null,
    kategori: "NORMAL" as const,
  }));

  const displaySJ = {
    ...suratJalan,
    nomor: suratJalan.nomor_surat_jalan,
    tujuan: tujuanText,
    tanggal,
    projectName: suratJalan.project?.nama_project || "-",
    namaPicPemohon: user?.name || user?.username || "-",
    kendaraan: suratJalan.kendaraan?.jenis_kendaraan || "-",
    noPolisi: suratJalan.kendaraan?.no_polisi || "-",
    namaDriver: suratJalan.personil_pengantar?.nama || "-",
    items: mappedItems,
  };

  return (
    <div className="px-8 py-6">
      {/* Toolbar — hilang saat print */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push("/staff/outbound")}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} />
          Kembali
        </button>
        <Button
          disabled={generatingPdf}
          onClick={async () => {
            setGeneratingPdf(true);
            try {
              await downloadSuratJalanPdf(
                displaySJ as any,
                user?.name || user?.username || "-"
              );
            } finally {
              setGeneratingPdf(false);
            }
          }}
          className="flex h-auto items-center gap-2 rounded-xl bg-[#E8632C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-60"
        >
          <Download size={16} />
          {generatingPdf ? "Menyiapkan PDF..." : "Download PDF"}
        </Button>
      </div>

      {/* Dokumen Surat Jalan — ini yang ke-print/ke-download */}
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
            <InfoRow label="No Surat Jalan" value={displaySJ.nomor} />
            <InfoRow label="Tujuan" value={displaySJ.tujuan} />
            <InfoRow label="Project" value={displaySJ.projectName || "-"} />
          </div>
          <div className="space-y-3">
            <InfoRow label="Tanggal" value={displaySJ.tanggal} />
            <InfoRow label="Nama PIC Pemohon" value={displaySJ.namaPicPemohon} />
            <InfoRow label="Kendaraan" value={displaySJ.kendaraan} />
            <InfoRow label="No Polisi" value={displaySJ.noPolisi} />
            <InfoRow label="Nama Driver" value={displaySJ.namaDriver} />
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
              <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {mappedItems.map((item, i) => (
              <tr key={item.kodeBarang} className="even:bg-gray-50">
                <td className="border border-gray-200 px-3 py-2.5">{i + 1}</td>
                <td className="border border-gray-200 px-3 py-2.5 font-medium">{item.kodeBarang}</td>
                <td className="border border-gray-200 px-3 py-2.5">{item.namaBarang}</td>
                <td className="border border-gray-200 px-3 py-2.5 text-center font-semibold">{item.qty}</td>
                <td className="border border-gray-200 px-3 py-2.5 text-center">{item.uom}</td>
                <td className="border border-gray-200 px-3 py-2.5 text-gray-500">{item.keterangan || "-"}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 3 - mappedItems.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-gray-200 px-3 py-6" colSpan={6} />
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
          <span>{displaySJ.nomor} | {displaySJ.tanggal}</span>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          aside, header, nav { display: none !important; }
          main { margin-left: 0 !important; margin-top: 0 !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
