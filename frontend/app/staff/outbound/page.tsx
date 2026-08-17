"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";

type SuratJalanStatus = "draft_diajukan" | "disetujui" | "digenerate" | "diterima_didistribusikan" | "ditolak";

const STATUS_META: Record<SuratJalanStatus, { label: string; tone: string }> = {
  draft_diajukan: { label: "Menunggu Approval", tone: "bg-amber-50 text-amber-600" },
  disetujui: { label: "Disetujui — Siap Picking", tone: "bg-emerald-50 text-emerald-600" },
  digenerate: { label: "Digenerate", tone: "bg-blue-50 text-blue-600" },
  diterima_didistribusikan: { label: "Terkirim", tone: "bg-gray-100 text-gray-500" },
  ditolak: { label: "Ditolak", tone: "bg-rose-50 text-rose-600" },
};

const FILTER_TABS: { key: "SEMUA" | SuratJalanStatus; label: string }[] = [
  { key: "SEMUA", label: "Semua" },
  { key: "draft_diajukan", label: "Menunggu Approval" },
  { key: "digenerate", label: "Siap Kirim" },
  { key: "diterima_didistribusikan", label: "Terkirim" },
];

interface SuratJalanItem {
  item_id: number;
  nama_barang?: string;
  qty: number;
}

interface SuratJalan {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  tipe: string;
  status: SuratJalanStatus;
  created_at: string;
  items: SuratJalanItem[];
  gudang_tujuan?: { nama_gudang: string };
  project?: { nama_project: string };
}

export default function SuratJalanListPage() {
  const { get } = useApi();
  const [list, setList] = useState<SuratJalan[]>([]);
  const [activeTab, setActiveTab] = useState<"SEMUA" | SuratJalanStatus>("SEMUA");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await get(`${baseUrl}/api/surat-jalan/outbound/queue`);
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal mengambil daftar Surat Jalan.");
      }
      const json = await response.json();
      const data = json?.data ?? json ?? [];
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [get]);

  const filtered = useMemo(
    () =>
      activeTab === "SEMUA" ? list : list.filter((sj) => sj.status === activeTab),
    [activeTab, list]
  );

  return (
    <div className="px-8 py-6">
      {/* Header halaman */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Surat Jalan</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar Surat Jalan Outbound yang jadi tanggung jawab Anda
          </p>
        </div>
        <Link href="/staff/outbound/new">
          <Button className="h-auto rounded-xl bg-[#E8632C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D9591F]">
            + Ajukan Surat Jalan
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
          <Button variant="outline" size="sm" onClick={fetchList} className="ml-auto">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Tab filter */}
      <div className="mb-5 flex gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[#E8632C] text-white"
                : "border border-[#F3D9C7] bg-white text-gray-600 hover:bg-[#FDECE1]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Surat Jalan */}
      <div className="rounded-2xl border border-[#F3D9C7] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-6 py-4 font-semibold">Nomor Surat Jalan</th>
              <th className="px-6 py-4 font-semibold">Tujuan</th>
              <th className="px-6 py-4 font-semibold">Tanggal Dibuat</th>
              <th className="px-6 py-4 font-semibold">Jumlah Item</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  Memuat data...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  Tidak ada Surat Jalan pada filter ini.
                </td>
              </tr>
            ) : (
              filtered.map((sj) => {
                const meta = STATUS_META[sj.status] || STATUS_META.draft_diajukan;
                const totalUnit = sj.items.reduce((sum, i) => sum + Number(i.qty || 0), 0);
                const tujuanText = sj.gudang_tujuan?.nama_gudang || sj.project?.nama_project || "-";
                const tanggal = new Date(sj.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                });

                return (
                  <tr
                    key={sj.surat_jalan_id}
                    className="border-b border-gray-50 last:border-0 hover:bg-[#FDECE1]/30"
                  >
                    <td className="px-6 py-4 font-medium text-gray-800">
                      <span className="flex items-center gap-2">
                        <FileText size={16} className="text-[#E8632C]" />
                        {sj.nomor_surat_jalan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{tujuanText}</td>
                    <td className="px-6 py-4 text-gray-500">{tanggal}</td>
                    <td className="px-6 py-4 text-gray-600">{totalUnit} unit</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/staff/outbound/${sj.surat_jalan_id}`}
                        className="text-sm font-semibold text-[#E8632C] hover:underline"
                      >
                        Buka
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
