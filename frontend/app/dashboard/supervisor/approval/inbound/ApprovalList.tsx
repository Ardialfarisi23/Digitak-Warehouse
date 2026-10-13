"use client";

import useSWR from "swr";
import { useApi } from "@/lib/api";

const fetcher = async ([url, get]: [string, Function]) => {
  const response = await get(url);
  if (!response.ok) {
    const error = new Error("Gagal memuat data inbound.") as Error & { info: unknown; status: number };
    error.info = await response.json();
    error.status = response.status;
    throw error;
  }
  return response.json();
};

const STATUS_LABELS: Record<string, string> = {
  draft_diajukan: "Draft Diajukan",
  menunggu_verifikasi: "Menunggu Verifikasi",
  ready_putaway: "Siap Putaway",
  disetujui: "Disetujui",
  sedang_dikirim: "Sedang Dikirim",
  tiba_di_transit: "Tiba di Transit",
  tiba_menunggu_konfirmasi: "Tiba, Menunggu Konfirmasi",
  diterima_didistribusikan: "Diterima & Didistribusikan",
  ditolak: "Ditolak",
  digenerate: "Digenerate",
};

export default function ApprovalList() {
  const { get } = useApi();
  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/surat-jalan/inbound`;

  const { data: response, error, isLoading } = useSWR([API_URL, get], fetcher);

  const records = response?.data || [];

  if (isLoading) {
    return <div className="p-4 text-center text-xs text-slate-500">Memuat data inbound...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-xs text-rose-600">Gagal memuat data inbound.</div>;
  }

  if (!records.length) {
    return <div className="p-4 text-center text-xs text-slate-500">Belum ada data inbound.</div>;
  }

  return (
    <div className="space-y-3">
      {records.map((row: any) => (
        <div key={row.surat_jalan_id ?? row.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{row.nomor_surat_jalan}</p>
              <p className="text-xs text-slate-500">Tujuan: {row.gudang_tujuan?.nama_gudang || "-"}</p>
            </div>
            <span className="text-xs font-medium text-slate-600">
              {STATUS_LABELS[String(row.status || "").toLowerCase()] || row.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
