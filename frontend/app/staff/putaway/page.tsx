"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { useApi } from "@/lib/api";

type ApiItem = {
  item_id: number;
  qty: number;
  kondisi?: string | null;
  is_kelebihan?: boolean;
  barang?: { kode_perangkat?: string; nama_barang?: string };
};

type ApiSuratJalan = {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: string;
  tanggal?: string;
  gudang_asal?: { nama_gudang: string } | null;
  gudang_tujuan?: { nama_gudang: string } | null;
  items: ApiItem[];
};

export default function PutawayListPage() {
  const { get } = useApi();
  const [list, setList] = useState<ApiSuratJalan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"MENUNGGU" | "SELESAI">("MENUNGGU");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      try {
        // Endpoint ini balikin SEMUA status inbound (draft s/d selesai) —
        // kita filter per tab di sisi frontend berdasarkan status:
        // "ready_putaway" = menunggu ditempatkan, "diterima_didistribusikan"
        // = sudah ditempatkan (lihat catatan fix backend approveInbound/putaway).
        const res = await get(`${baseUrl}/api/surat-jalan/inbound`);
        if (!res.ok) throw new Error("Gagal mengambil daftar Surat Jalan Inbound.");
        const json = await res.json();
        setList(Array.isArray(json?.data) ? json.data : []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Terjadi kesalahan mengambil data.");
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => list.filter((sj) => (activeTab === "MENUNGGU" ? sj.status === "ready_putaway" : sj.status === "diterima_didistribusikan")), [list, activeTab]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E8632C]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="px-8 py-6">
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Lokasi & Penempatan (Putaway)</h1>
        <p className="mt-1 text-sm text-gray-500">Surat Jalan Inbound yang sudah diverifikasi Supervisor dan siap ditempatkan ke zona</p>
      </div>

      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setActiveTab("MENUNGGU")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "MENUNGGU" ? "bg-[#E8632C] text-white" : "border border-[#F3D9C7] bg-white text-gray-600 hover:bg-[#FDECE1]"}`}
        >
          Menunggu Ditempatkan
        </button>
        <button
          onClick={() => setActiveTab("SELESAI")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "SELESAI" ? "bg-[#E8632C] text-white" : "border border-[#F3D9C7] bg-white text-gray-600 hover:bg-[#FDECE1]"}`}
        >
          Sudah Ditempatkan
        </button>
      </div>

      <div className="rounded-2xl border border-[#F3D9C7] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-6 py-4 font-semibold">Nomor Surat Jalan</th>
              <th className="px-6 py-4 font-semibold">Asal</th>
              <th className="px-6 py-4 font-semibold">Tujuan Gudang</th>
              <th className="px-6 py-4 font-semibold">Tanggal</th>
              <th className="px-6 py-4 font-semibold">Jumlah Item</th>
              <th className="px-6 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sj) => (
              <tr key={sj.surat_jalan_id} className="border-b border-gray-50 last:border-0 hover:bg-[#FDECE1]/30">
                <td className="px-6 py-4 font-medium text-gray-800">
                  <span className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#E8632C]" />
                    {sj.nomor_surat_jalan}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{sj.gudang_asal?.nama_gudang || "-"}</td>
                <td className="px-6 py-4 text-gray-600">{sj.gudang_tujuan?.nama_gudang || "-"}</td>
                <td className="px-6 py-4 text-gray-500">
                  {sj.tanggal
                    ? new Date(sj.tanggal).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </td>
                <td className="px-6 py-4 text-gray-600">{sj.items.length} jenis</td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/staff/putaway/${sj.surat_jalan_id}`} className="text-sm font-semibold text-[#E8632C] hover:underline">
                    {activeTab === "MENUNGGU" ? "Tempatkan" : "Lihat"}
                  </Link>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  {activeTab === "MENUNGGU" ? "Tidak ada Surat Jalan yang menunggu ditempatkan." : "Belum ada riwayat penempatan."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
