"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, XCircle, Calendar, User, FileText, Package } from "lucide-react";
import { useApi } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const formatDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateShort = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
};

const tipeLabel = (tipe: string) => (tipe === "inbound" ? "Inbound" : tipe === "outbound" ? "Outbound" : tipe);

export default function SupervisorRejectedDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { get } = useApi();

  const [detail, setDetail] = useState<any>(null);
  const [rejectLog, setRejectLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const resp = await get(`${API_BASE_URL}/api/surat-jalan/${params.id}`);
        const json = await resp.json();
        if (!mounted) return;
        setDetail(json?.data ?? null);
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

  useEffect(() => {
    if (!detail || !params.id) return;
    let cancelled = false;
    const fetchRejectLog = async () => {
      try {
        const listResp = await get(
          `${API_BASE_URL}/api/surat-jalan/rejected?page=1&limit=1`
        );
        // We want the row that matches our id; listing may not include current page;
        // simpler: ask the list filtered by search on nomor if available.
        // Fallback: hit list and find row.
        const json = await listResp.json();
        const rows = Array.isArray(json?.data?.data) ? json.data.data : [];
        const me = rows.find((r: any) => String(r.surat_jalan_id) === String(params.id));
        if (!cancelled && me) setRejectLog(me);
      } catch (e) {
        console.error(e);
      }
    };
    fetchRejectLog();
    return () => {
      cancelled = true;
    };
  }, [detail, params.id, get]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-slate-500">Detail surat jalan tidak ditemukan.</p>
        <button
          onClick={() => router.push("/dashboard/supervisor/approval/rejected")}
          className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Kembali
        </button>
      </div>
    );
  }

  const catatanFinal = detail.catatan ?? rejectLog?.catatan ?? null;
  const ditolakOleh = rejectLog?.ditolak_oleh ?? null;
  const ditolakPada = rejectLog?.ditolak_pada ?? detail.updated_at ?? null;

  const items: any[] = Array.isArray(detail.items) ? detail.items : [];

  const tujuanLabel =
    detail?.tujuan_tipe === "lapangan"
      ? detail?.alamat_lapangan || "-"
      : detail?.tujuan_tipe === "gudang"
        ? detail?.gudang_tujuan?.nama_gudang || "-"
        : detail?.gudang_tujuan?.nama_gudang || "-";

  const tujuanBadge =
    detail?.tujuan_tipe === "lapangan" ? (
      <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Lapangan</span>
    ) : detail?.tujuan_tipe === "gudang" ? (
      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Gudang</span>
    ) : null;

  const pengirimLabel =
    detail?.tipe_pengirim === "internal"
      ? detail?.gudang_asal?.nama_gudang || "-"
      : detail?.tipe_pengirim === "external"
        ? detail?.pengirim_eksternal_nama || "-"
        : detail?.gudang_asal?.nama_gudang || "-";

  const pengirimBadge =
    detail?.tipe_pengirim === "internal" ? (
      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Internal</span>
    ) : detail?.tipe_pengirim === "external" ? (
      <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">External</span>
    ) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5 sm:space-y-6 bg-[#FAFAFA] min-h-screen text-slate-800">
      <div className="flex items-start gap-3 sm:gap-4">
        <button
          onClick={() => router.push("/dashboard/supervisor/approval/rejected")}
          className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-600"
          title="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-rose-600 uppercase">
            <span>SUPERVISOR PORTAL</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 font-normal capitalize">Riwayat Penolakan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {detail.nomor_surat_jalan}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-rose-100 bg-rose-50 text-rose-700">
              Ditolak
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-slate-50 text-slate-700">
              {tipeLabel(detail.tipe)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-rose-50/60 border-2 border-rose-100 rounded-2xl p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Alasan Penolakan
          </span>
        </div>
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
          {catatanFinal || <span className="italic text-slate-400">-</span>}
        </p>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Ditolak Oleh
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {ditolakOleh?.nama ?? <span className="italic text-slate-400">Tidak diketahui</span>}
              </p>
              {ditolakOleh?.email && (
                <p className="text-xs text-slate-500">{ditolakOleh.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Ditolak Pada
              </p>
              <p className="text-sm font-semibold text-slate-900">{formatDate(ditolakPada)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Informasi Surat Jalan
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 p-6">
          <Field label="Tanggal" value={formatDateShort(detail.tanggal)} />
          <Field label="Tipe" value={tipeLabel(detail.tipe)} />
          <Field label="Project" value={detail.project?.nama_project ?? detail.project_id ?? "-"} />
          <Field
            label="Gudang Asal"
            value={
              <span>
                {pengirimLabel}
                {pengirimBadge}
              </span>
            }
          />
          <Field
            label="Gudang Tujuan"
            value={
              <span>
                {tujuanLabel}
                {tujuanBadge}
              </span>
            }
          />
          <Field
            label="PIC Penerima"
            value={detail.pic_pemohon_nama ?? <span className="italic text-slate-400">-</span>}
          />
          <Field label="Status" value={<span className="font-semibold text-rose-700">Ditolak</span>} />
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Item</h2>
          <span className="ml-auto text-xs text-slate-400">{items.length} item</span>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Tidak ada item.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                  <th className="px-6 py-3 font-medium">Barang</th>
                  <th className="px-6 py-3 font-medium">Qty</th>
                  <th className="px-6 py-3 font-medium">Satuan</th>
                  <th className="px-6 py-3 font-medium">Kondisi</th>
                  <th className="px-6 py-3 font-medium">Catatan Item</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any) => (
                  <tr key={String(it.item_id)} className="border-t border-slate-100 align-top">
                    <td className="px-6 py-3">
                      <div className="font-semibold text-slate-800">
                        {it.barang?.nama_barang ?? `#${it.barang_id}`}
                      </div>
                      {it.barang?.kode_perangkat && (
                        <div className="text-xs text-slate-400">{it.barang.kode_perangkat}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-700">{String(it.qty)}</td>
                    <td className="px-6 py-3 text-slate-700">
                      {it.satuan?.kode_satuan ?? it.satuan_id ?? "-"}
                    </td>
                    <td className="px-6 py-3 text-slate-700">{it.kondisi ?? "-"}</td>
                    <td className="px-6 py-3 text-slate-600 max-w-[280px]">
                      {it.catatan ?? <span className="italic text-slate-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs text-slate-500 flex items-start gap-2">
        <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
        <p>
          Halaman ini bersifat <strong>read-only</strong>. Untuk tindak lanjut (mis. staf gudang
          mengajukan ulang), gunakan halaman Form Persetujuan Inbound atau Form Persetujuan Outbound.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );
}