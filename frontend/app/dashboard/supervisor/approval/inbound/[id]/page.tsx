"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";

const STATUS_BADGES: Record<string, string> = {
  draft_diajukan: "bg-slate-100 text-slate-700",
  disetujui: "bg-emerald-100 text-emerald-700",
  dikembalikan: "bg-amber-100 text-amber-700",
  diterima: "bg-blue-100 text-blue-700",
};

export default function SupervisorApprovalInboundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { get, put } = useApi();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");

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
      alert("Surat Jalan inbound berhasil disetujui.");
      router.push("/dashboard/supervisor/approval/inbound");
    } catch (error) {
      console.error(error);
      alert((error as Error).message || "Gagal approve inbound.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => router.push("/dashboard/supervisor/approval/inbound");

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
        <Button onClick={handleBack} className="mt-4 rounded-xl bg-[#E8632C] px-4 py-2 text-sm text-white">
          Kembali
        </Button>
      </div>
    );
  }

  const statusBadge = STATUS_BADGES[detail.status] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="min-h-screen px-8 py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">
            Detail Approval Inbound
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{detail.nomor_surat_jalan}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Review barang masuk, foto, serial, dan laporkan kelebihan bila ada.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusBadge}`}>
            {detail.status || "-"}
          </span>
          <Button variant="outline" onClick={handleBack} className="rounded-xl px-4 py-2 text-sm font-semibold">
            Kembali
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Tanggal</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {detail.tanggal ? new Date(detail.tanggal).toLocaleDateString("id-ID") : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Dari Gudang</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {detail.gudang_asal?.nama_gudang || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Ke Gudang</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {detail.gudang_tujuan?.nama_gudang || "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Pengirim</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {detail.personil_pengirim?.nama || "-"}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Ringkasan Barang</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-700">
              <div className="grid grid-cols-[150px_1fr] gap-2">
                <span className="font-medium text-slate-600">Jumlah Item</span>
                <span>{detail.items?.length ?? 0}</span>
              </div>
              <div className="grid grid-cols-[150px_1fr] gap-2">
                <span className="font-medium text-slate-600">Total Qty</span>
                <span>
                  {detail.items?.reduce((sum: number, item: any) => sum + Number(item.qty || 0), 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Daftar Barang Masuk
              </p>
              <span className="text-xs text-slate-500">{detail.items?.length ?? 0} item</span>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Nama Barang</th>
                    <th className="px-4 py-3">Serial Number</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3">Kondisi</th>
                    <th className="px-4 py-3">Foto</th>
                    <th className="px-4 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items?.map((item: any) => (
                    <tr
                      key={`${item.barang_id}-${item.serial_number || item.id}`}
                      className="border-t border-slate-200 last:border-b last:border-slate-200"
                    >
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {item.barang?.nama_barang || item.nama_barang || "-"}
                      </td>
                      <td className="px-4 py-4">{item.serial_number || "-"}</td>
                      <td className="px-4 py-4 text-center">{item.qty}</td>
                      <td className="px-4 py-4">{item.kondisi || "-"}</td>
                      <td className="px-4 py-4">
                        {item.foto_url ? (
                          <img src={item.foto_url} alt="Foto barang" className="h-16 w-16 rounded-xl object-cover" />
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Kelebihan Barang & Catatan
            </p>
            <p className="mt-3 text-sm text-slate-700">
              Jika ada barang masuk lebih banyak dari permintaan BOQ atau kondisi khusus, tuliskan catatan sebelum menyetujui.
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="grid grid-cols-[150px_1fr] gap-3">
                <span className="font-medium text-slate-600">Total Qty Masuk</span>
                <span>
                  {detail.items?.reduce((sum: number, item: any) => sum + Number(item.qty || 0), 0)}
                </span>
              </div>
              <div className="grid grid-cols-[150px_1fr] gap-3">
                <span className="font-medium text-slate-600">Qty BOQ</span>
                <span>
                  {detail.boq?.items?.reduce((sum: number, item: any) => sum + Number(item.qty_rencana || 0), 0) ?? "-"}
                </span>
              </div>
            </div>

            {/* Field Input Catatan Supervisor */}
            <div className="mt-4 pt-3 border-t border-slate-200">
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
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Aksi Supervisor</p>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {actionLoading ? "Memproses..." : "Setujui Inbound"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}