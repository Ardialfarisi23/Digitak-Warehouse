"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { CheckCircle2, ArrowLeft, Printer, Eye, X, FileText } from "lucide-react";
import { DetailSuratJalanDocument } from "@/components/surat-jalan/DetailSuratJalanDocument";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export default function SupervisorApprovalInboundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { get, put } = useApi();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocItem, setSelectedDocItem] = useState<any>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const openDocModal = (item: any) => {
    setSelectedDocItem(item);
    setIsDocModalOpen(true);
  };

  const closeDocModal = () => {
    setIsDocModalOpen(false);
    setSelectedDocItem(null);
  };

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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const openApproveConfirm = () => {
    setShowConfirm(true);
  };

  const cancelApproveConfirm = () => {
    setShowConfirm(false);
  };

  const executeApprove = async () => {
    setShowConfirm(false);
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
      setToast({ message: "Inbound berhasil disetujui.", type: "success" });
    } catch (error) {
      console.error(error);
      setToast({
        message: (error as Error)?.message || "Gagal approve inbound.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/dashboard/supervisor/approval/inbound");
  };

  const openRejectConfirm = () => {
    setShowRejectConfirm(true);
  };

  const cancelRejectConfirm = () => {
    setShowRejectConfirm(false);
    setRejectReason("");
  };

  const executeReject = async () => {
    setShowRejectConfirm(false);
    setActionLoading(true);
    try {
      const resp = await put(`${apiBase}/api/surat-jalan/${params.id}/reject-inbound`, {
        catatan: rejectReason || null,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.message || "Gagal menolak inbound.");
      }
      setRejectReason("");
      setToast({ message: "Inbound berhasil ditolak.", type: "success" });
      setTimeout(() => router.push("/dashboard/supervisor/approval/inbound"), 1500);
    } catch (error) {
      console.error(error);
      setToast({
        message: (error as Error)?.message || "Gagal menolak inbound.",
        type: "error",
      });
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
        <Button onClick={() => router.push("/dashboard/supervisor/approval/inbound")} className="mt-4 rounded-xl bg-[#E8632C] px-4 py-2 text-sm text-white">
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-6">
      {/* Toolbar — hilang saat print */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <button onClick={() => router.push("/dashboard/supervisor/approval/inbound")} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} />
          Kembali
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2 rounded-xl border-[#E8632C] px-4 py-2 text-sm font-semibold text-[#E8632C] hover:bg-[#E8632C] hover:text-white">
            <Printer size={16} />
            Cetak / PDF
          </Button>
        </div>
      </div>

      {/* Split View: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Kolom Kiri: Preview PDF Surat Jalan dari Staf */}
        <div className="print:hidden">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[850px] flex flex-col overflow-hidden">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Dokumen Lampiran Staf (PDF)</h3>
            {detail?.surat_jalan_url ? (
              <div className="flex-1 w-full h-full bg-white rounded-xl overflow-hidden border border-slate-100 flex justify-center items-start">
                <Document
                  file={detail.surat_jalan_url}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  onLoadError={(err) => setPdfError(err.message)}
                  loading={<div className="p-4 text-xs text-slate-500">Memuat PDF...</div>}
                  error={<div className="p-4 text-xs text-red-500">Gagal memuat PDF.</div>}
                  className="flex justify-center w-full"
                >
                  {Array.from(new Array(numPages), (_el, index) => (
                    <Page key={`page_${index + 1}`} pageNumber={index + 1} width={680} renderAnnotationLayer={false} renderTextLayer={false} className="mb-4 bg-white max-w-full" />
                  ))}
                </Document>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                <div className="text-center">
                  <FileText size={32} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-xs text-slate-400">Staf tidak mengunggah dokumen lampiran PDF.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Surat Jalan System Generated */}
        <div className="flex flex-col gap-6">
          {/* Dokumen Surat Jalan — ini yang ke-print */}
          <DetailSuratJalanDocument
            data={detail}
            variant="full"
            hideTujuanBadge
            renderItemAction={(item) => (
              <button type="button" onClick={() => openDocModal(item)} className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center justify-center" title="Dokumentasi Barang">
                <Eye size={16} />
              </button>
            )}
          />
        </div>
      </div>

      {/* 2. SECTION AKSI SUPERVISOR (RATA TENGAH DIBAWAH KEDUA SURAT) */}
      <div className="w-full max-w-2xl mx-auto mt-8">
        <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mb-2">AKSI SUPERVISOR</span>

          <p className="text-xs text-slate-500 max-w-lg mb-4">Tinjau dan setujui surat jalan inbound di atas. Stok akan otomatis ditambahkan setelah persetujuan.</p>

          <div className="w-full text-left mb-4">
            <label className="block text-xs font-bold text-slate-600 mb-1">CATATAN SUPERVISOR</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tuliskan catatan selisih/kondisi di sini..."
              className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          <p className="text-xs font-medium text-slate-500 mb-3">Pilih aksi persetujuan untuk dokumen surat jalan inbound ini:</p>

          <div className="flex items-center justify-center gap-3 w-full max-w-md">
            <Button
              onClick={openRejectConfirm}
              disabled={actionLoading}
              variant="outline"
              className="flex-1 rounded-xl border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              Tolak / Revisi
            </Button>
            <Button
              onClick={openApproveConfirm}
              disabled={actionLoading}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {actionLoading ? "Memproses..." : "Setujui Inbound"}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Persetujuan — samakan pola dengan list page */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900">Setujui Inbound?</h3>
            <p className="mt-1 text-sm text-slate-500">Apakah Anda yakin ingin menyetujui inbound ini? Aksi ini akan mengubah status surat jalan dan menambahkan stok barang ke gudang.</p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={cancelApproveConfirm} disabled={actionLoading} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                Batal
              </button>
              <button type="button" onClick={executeApprove} disabled={actionLoading} className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-600 disabled:opacity-60">
                {actionLoading ? "Memproses..." : "Ya, Setujui"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Penolakan — samakan pola dengan approve */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900">Tolak Inbound?</h3>
            <p className="mt-1 text-sm text-slate-500">Surat Jalan akan berstatus &quot;ditolak&quot; dan stok tidak akan ditambahkan. Staf Gudang perlu membuat pengajuan inbound baru untuk transaksi ini.</p>
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">Alasan Penolakan</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan/klarifikasi..."
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={cancelRejectConfirm} disabled={actionLoading} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                Batal
              </button>
              <button type="button" onClick={executeReject} disabled={actionLoading} className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-rose-700 disabled:opacity-60">
                {actionLoading ? "Memproses..." : "Ya, Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast — reuse pola BOQ (top-right, slide-in) */}
      {toast && (
        <div
          className={[
            "fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-medium shadow-2xl backdrop-blur-sm animate-in slide-in-from-right-full fade-in duration-300 max-w-sm",
            toast.type === "success" ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-800" : "border-rose-200/80 bg-rose-50/95 text-rose-800",
          ].join(" ")}
        >
          <div className={["flex h-8 w-8 shrink-0 items-center justify-center rounded-full", toast.type === "success" ? "bg-emerald-100" : "bg-rose-100"].join(" ")}>
            {toast.type === "success" ? (
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <p className="flex-1 leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className={["ml-2 shrink-0 rounded-full p-1 transition-colors", toast.type === "success" ? "text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600" : "text-rose-400 hover:bg-rose-100 hover:text-rose-600"].join(" ")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Pop-up Modal Sukses Custom */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Persetujuan Berhasil!</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Surat Jalan inbound berhasil disetujui dan stok barang telah ditambahkan.</p>
            </div>

            <Button onClick={handleBack} className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20">
              Kembali ke Daftar Antrean
            </Button>
          </div>
        </div>
      )}

      {isDocModalOpen && selectedDocItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Dokumentasi Barang</h3>
                <p className="text-xs text-slate-500">{selectedDocItem?.barang?.nama_barang || selectedDocItem?.barang?.kode_perangkat || "Item"}</p>
              </div>
              <button type="button" onClick={closeDocModal} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Kondisi</p>
                  <p className="font-medium text-slate-900">{selectedDocItem?.kondisi || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">QTY</p>
                  <p className="font-medium text-slate-900">{selectedDocItem?.qty || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Diperiksa Oleh</p>
                  <p className="font-medium text-slate-900">{(selectedDocItem as any)?.diperiksa_oleh || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Waktu Verifikasi</p>
                  <p className="font-medium text-slate-900">{(selectedDocItem as any)?.diperiksa_pada ? new Date((selectedDocItem as any).diperiksa_pada).toLocaleString("id-ID") : "-"}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-slate-500">Foto Dokumentasi</p>
                {(selectedDocItem as any)?.fotos && (selectedDocItem as any).fotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {(selectedDocItem as any).fotos.map((foto: any, idx: number) => (
                      <img key={idx} src={foto.url} alt={foto.filename || `Foto ${idx + 1}`} className="h-24 w-full rounded-lg border border-slate-100 object-cover" />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Belum ada foto dokumentasi untuk item ini.</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={closeDocModal} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                Kembali ke Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
