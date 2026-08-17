"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";

const STATUS_META: Record<string, { label: string; tone: string }> = {
  draft_diajukan: { label: "Draft Diajukan", tone: "bg-slate-100 text-slate-700" },
  disetujui: { label: "Disetujui", tone: "bg-emerald-100 text-emerald-700" },
  digenerate: { label: "Digenerate", tone: "bg-blue-100 text-blue-700" },
  diterima_didistribusikan: { label: "Diterima / Didistribusikan", tone: "bg-emerald-100 text-emerald-700" },
  dikembalikan: { label: "Dikembalikan / Ditolak", tone: "bg-rose-100 text-rose-700" },
};

export default function SupervisorApprovalOutboundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { get, put } = useApi();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // State Aksi Approval / Tolak
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  useEffect(() => {
    let mounted = true;

    const loadDetail = async () => {
      setLoading(true);
      try {
        const resp = await get(`${apiBase}/api/surat-jalan/${params.id}`);
        const json = await resp.json();
        if (!mounted) return;
        setRequest(json?.data || null);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDetail();
    return () => {
      mounted = false;
    };
  }, [get, apiBase, params.id]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const resp = await put(`${apiBase}/api/surat-jalan/${params.id}/approve-outbound`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.message || "Gagal menyetujui outbound.");
      }
      setToast({ message: "Surat Jalan berhasil disetujui & stok berhasil direservasi.", type: "success" });
      setTimeout(() => router.push("/dashboard/supervisor/approval/outbound"), 1500);
    } catch (error) {
      setToast({ message: (error as Error).message || "Gagal menyetujui outbound.", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setToast({ message: "Harap berikan alasan penolakan/klarifikasi.", type: "error" });
      return;
    }
    setActionLoading(true);
    try {
      const resp = await put(`${apiBase}/api/surat-jalan/${params.id}/reject-outbound`, {
        alasan: rejectReason,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.message || "Gagal menolak outbound.");
      }
      setToast({ message: "Pengajuan outbound berhasil ditolak.", type: "success" });
      setTimeout(() => router.push("/dashboard/supervisor/approval/outbound"), 1500);
    } catch (error) {
      setToast({ message: (error as Error).message || "Gagal menolak outbound.", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDistributed = async () => {
    setActionLoading(true);
    try {
      const resp = await put(`${apiBase}/api/surat-jalan/${params.id}/confirm-distributed`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.message || "Gagal menandai diterima/didistribusikan.");
      }
      setToast({ message: "Surat Jalan berhasil ditandai diterima/didistribusikan.", type: "success" });
      setTimeout(() => router.push("/dashboard/supervisor/approval/outbound"), 1500);
    } catch (error) {
      setToast({ message: (error as Error).message || "Gagal menandai diterima/didistribusikan.", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-8 py-6">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#E8632C]" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="px-8 py-6">
        <p className="text-slate-500">Detail pengajuan tidak ditemukan.</p>
        <Button onClick={() => router.back()} className="mt-4 rounded-xl bg-[#E8632C] px-4 py-2 text-sm text-white">
          Kembali
        </Button>
      </div>
    );
  }

  const statusMeta = STATUS_META[request.status] ?? { label: request.status || "-", tone: "bg-slate-100 text-slate-700" };

  return (
    <div className="min-h-screen px-8 py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">
            Detail Approval Outbound
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{request.nomor_surat_jalan}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Detail permintaan outbound dan status saat ini.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusMeta.tone}`}>
            {statusMeta.label}
          </span>
          <Button variant="outline" onClick={() => router.back()} className="rounded-xl px-4 py-2 text-sm font-semibold">
            Kembali
          </Button>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-xl border px-4 py-3 shadow-lg ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {toast.type === "success" ? "✓" : "✕"}
            {toast.message}
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Tujuan</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {request.project?.nama_project || request.gudang_tujuan?.nama_gudang || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Kendaraan</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {request.kendaraan?.jenis_kendaraan || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">No. Polisi</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {request.kendaraan?.no_polisi || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Driver</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {request.personil_pengantar?.nama || "-"}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Detail BOQ / Tiket Rujukan
            </p>
            <div className="mt-4 grid gap-3 text-sm text-slate-700">
              <div className="grid grid-cols-[140px_1fr] gap-2">
                <span className="font-medium text-slate-600">Nomor Tiket</span>
                <span>{request.boq?.tiket?.kode_tiket || "-"}</span>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-2">
                <span className="font-medium text-slate-600">Project</span>
                <span>{request.project?.nama_project || "-"}</span>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-2">
                <span className="font-medium text-slate-600">Area</span>
                <span>{request.project?.area || "-"}</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Daftar Barang
              </p>
              <span className="text-xs text-slate-500">{request.items?.length ?? 0} item</span>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Nama Barang</th>
                    <th className="px-4 py-3">Serial Number</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-center">Kondisi</th>
                    <th className="px-4 py-3">Foto Bukti</th>
                    <th className="px-4 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items?.map((item: any) => (
                    <tr key={item.item_id} className="border-t border-slate-200 last:border-b last:border-slate-200">
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {item.barang?.nama_barang || item.barang_id}
                      </td>
                      <td className="px-4 py-4">{item.serial_number || "-"}</td>
                      <td className="px-4 py-4 text-center">{item.qty}</td>
                      <td className="px-4 py-4 text-center capitalize">{item.kondisi || "-"}</td>
                      <td className="px-4 py-4">
                        {item.foto_url ? (
                          <img src={item.foto_url} alt="Bukti" className="h-16 w-16 rounded-xl object-cover" />
                        ) : (
                          <span className="text-slate-400">Tidak ada</span>
                        )}
                      </td>
                      <td className="px-4 py-4">{item.catatan || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Perbandingan Qty</p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <span className="font-medium text-slate-600">Qty Diminta</span>
                <span>{request.items?.reduce((sum: number, item: any) => sum + Number(item.qty || 0), 0)}</span>
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <span className="font-medium text-slate-600">Sisa Jatah BOQ</span>
                <span>
                  {request.boq?.items?.reduce((sum: number, item: any) => sum + Number(item.qty_rencana || 0), 0) ?? "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Aksi Supervisor</p>

            {/* Opsi Aksi berdasarkan Status Outbound */}
            {request.status === "draft_diajukan" ? (
              !showRejectBox ? (
                <div className="space-y-3">
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    {actionLoading ? "Memproses..." : "Setujui (Reservasi Stok)"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectBox(true)}
                    className="w-full rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 px-4 py-3 text-sm font-semibold"
                  >
                    Tolak / Minta Klarifikasi
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Tuliskan alasan penolakan/klarifikasi..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-rose-500 focus:outline-none"
                  />
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="w-full rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    {actionLoading ? "Memproses..." : "Kirim Penolakan"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowRejectBox(false)}
                    className="w-full rounded-xl text-sm font-semibold text-slate-600"
                  >
                    Batal
                  </Button>
                </div>
              )
            ) : request.status === "digenerate" ? (
              <Button
                onClick={handleConfirmDistributed}
                disabled={actionLoading}
                className="w-full rounded-xl bg-[#047857] px-4 py-3 text-sm font-semibold text-white hover:bg-[#065f46]"
              >
                {actionLoading ? "Memproses..." : "Tandai Diterima/Didistribusikan"}
              </Button>
            ) : (
              <p className="text-xs text-slate-500">
                Tidak ada aksi yang diperlukan untuk status saat ini ({request.status}).
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}