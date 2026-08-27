"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
<<<<<<< Updated upstream
import { CheckCircle2 } from "lucide-react";
=======
import { Printer, ArrowLeft } from "lucide-react";
>>>>>>> Stashed changes

const STATUS_BADGES: Record<string, string> = {
  draft_diajukan: "bg-slate-100 text-slate-700",
  disetujui: "bg-emerald-100 text-emerald-700",
  dikembalikan: "bg-amber-100 text-amber-700",
  diterima: "bg-blue-100 text-blue-700",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_10px_1fr] items-start leading-snug">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-500">:</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

export default function SupervisorApprovalInboundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { get, put } = useApi();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  useEffect(() => {
    let mounted = true;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const resp = await get(`${apiBase}/api/surat-jalan/${params.id}`);
        const json = await resp.json();
        if (!mounted) return;
        setDetail(json?.data || null);
        if (json?.data?.notes || json?.data?.catatan) {
          setNotes(json.data.notes || json.data.catatan);
        }
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
  }, [get, apiBase, params.id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const resp = await put(`${apiBase}/api/surat-jalan/${params.id}/approve-inbound`, {
        notes,
        itemAdjustments: [],
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.message || "Gagal approve inbound.");
      }
      setShowSuccessModal(true);
    } catch (error) {
      console.error(error);
      alert((error as Error).message || "Gagal approve inbound.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
        <Button onClick={() => router.back()} className="mt-4 rounded-xl bg-[#E8632C] px-4 py-2 text-sm text-white">
          Kembali
        </Button>
      </div>
    );
  }

  const statusBadge = STATUS_BADGES[detail.status] ?? "bg-slate-100 text-slate-700";
  const tanggal = detail.tanggal
    ? new Date(detail.tanggal).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "-";

  return (
    <div className="min-h-screen px-8 py-6">
      {/* Toolbar — hilang saat print */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.push("/dashboard/supervisor/approval/inbound")}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} />
          Kembali
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border-[#E8632C] px-4 py-2 text-sm font-semibold text-[#E8632C] hover:bg-[#E8632C] hover:text-white"
          >
            <Printer size={16} />
            Cetak / PDF
          </Button>
        </div>
      </div>

      {/* Dokumen Surat Jalan — ini yang ke-print */}
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
            <p className="mt-1 text-xs text-gray-500">Surat Jalan Inbound — Digitak Studio</p>
            <div className="mt-2 text-right">
              <p className="text-xs font-bold text-[#E8632C]">PT Metanouva Informatika</p>
              <p className="text-[10px] text-gray-400">Digitak Studio</p>
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div className="mb-6">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusBadge}`}>
            {detail.status || "-"}
          </span>
        </div>

        {/* Info grid — 2 kolom */}
        <div className="mb-8 grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
          <div className="space-y-3">
            <InfoRow label="No Surat Jalan" value={detail.nomor_surat_jalan || "-"} />
            <InfoRow label="Tanggal" value={tanggal} />
            <InfoRow label="Dari Gudang" value={detail.gudang_asal?.nama_gudang || "-"} />
          </div>
          <div className="space-y-3">
            <InfoRow label="Ke Gudang" value={detail.gudang_tujuan?.nama_gudang || "-"} />
            <InfoRow label="Pengirim" value={detail.personil_pengirim?.nama || "-"} />
          </div>
        </div>

        {/* Ringkasan */}
        <div className="mb-8 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ringkasan Barang</p>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Jumlah Item</span>
              <p className="font-semibold text-slate-900">{detail.items?.length ?? 0}</p>
            </div>
            <div>
              <span className="text-slate-500">Total Qty</span>
              <p className="font-semibold text-slate-900">
                {detail.items?.reduce((sum: number, item: any) => sum + Number(item.qty || 0), 0)}
              </p>
            </div>
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
              <th className="border border-[#F3D9C7] px-3 py-2 text-center font-semibold text-[#9a3412]">Kondisi</th>
              <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Serial Number</th>
              <th className="border border-[#F3D9C7] px-3 py-2 text-left font-semibold text-[#9a3412]">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {detail.items?.map((item: any, i: number) => (
              <tr key={`${item.barang_id}-${item.serial_number || item.id || i}`} className="even:bg-gray-50">
                <td className="border border-gray-200 px-3 py-2.5">{i + 1}</td>
                <td className="border border-gray-200 px-3 py-2.5 font-medium">
                  {item.barang?.kode_perangkat || item.kode_perangkat || "-"}
                </td>
                <td className="border border-gray-200 px-3 py-2.5">
                  {item.barang?.nama_barang || item.nama barang || "-"}
                </td>
                <td className="border border-gray-200 px-3 py-2.5 text-center font-semibold">{item.qty}</td>
                <td className="border border-gray-200 px-3 py-2.5 text-center capitalize">{item.kondisi || "-"}</td>
                <td className="border border-gray-200 px-3 py-2.5">{item.serial_number || "-"}</td>
                <td className="border border-gray-200 px-3 py-2.5 text-gray-500">{item.catatan || "-"}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 3 - (detail.items?.length ?? 0)) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-gray-200 px-3 py-6" colSpan={7} />
              </tr>
            ))}
          </tbody>
        </table>

        {/* Catatan Supervisor */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-4 print:hidden">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
            Catatan Supervisor
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tuliskan catatan selisih/kondisi di sini..."
            className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Aksi Supervisor — hilang saat print */}
        <div className="mb-8 print:hidden">
          <Button
            onClick={handleApprove}
            disabled={actionLoading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {actionLoading ? "Memproses..." : "Setujui Inbound"}
          </Button>
        </div>

        {/* Tanda tangan */}
        <div className="mb-8 grid grid-cols-3 gap-6 text-center text-sm">
          <div>
            <p className="mb-16 font-medium text-gray-700">Pengirim</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-semibold text-gray-900">{detail.personil_pengirim?.nama || "-"}</p>
            </div>
          </div>
          <div>
            <p className="mb-16 font-medium text-gray-700">Supervisor</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-semibold text-gray-900">&nbsp;</p>
            </div>
          </div>
          <div>
            <p className="mb-16 font-medium text-gray-700">Penerima</p>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-semibold text-gray-900">&nbsp;</p>
            </div>
          </div>
        </div>

        {/* Footer dokumen */}
        <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-[10px] text-gray-400">
          <span>Dokumen ini digenerate secara otomatis oleh sistem Digitak Studio.</span>
          <span>{detail.nomor_surat_jalan} | {tanggal}</span>
        </div>
      </div>

<<<<<<< Updated upstream
      {/* Pop-up Modal Sukses Custom */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Approval Berhasil!</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Surat Jalan inbound berhasil disetujui dan stok barang telah ditambahkan.
              </p>
            </div>

            <Button
              onClick={handleBack}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
            >
              Kembali ke Daftar Antrean
            </Button>
          </div>
        </div>
      )}
=======
      <style jsx global>{`
        @media print {
          aside, header, nav { display: none !important; }
          main { margin-left: 0 !important; margin-top: 0 !important; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
>>>>>>> Stashed changes
    </div>
  );
}
