"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  Search,
  Eye,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type TipeSuratJalan = "INBOUND" | "OUTBOUND";

interface SuratJalanRecord {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  tipe: TipeSuratJalan;
  status: string;
  tanggal: string;
  project?: {
    nama_project: string;
    area?: string;
  };
  gudang_asal?: {
    nama_gudang: string;
  };
  gudang_tujuan?: {
    nama_gudang: string;
  };
  personil_pengantar?: {
    nama: string;
  };
  kendaraan?: {
    jenis_kendaraan: string;
    no_polisi: string;
  };
  creator?: {
    nama: string;
  };
  items: {
    item_id: number;
    barang: {
      kode_perangkat: string;
      nama_barang: string;
      satuan_default?: {
        kode_satuan: string;
      };
    };
    qty: number;
    satuan: {
      kode_satuan: string;
    };
    kondisi?: string;
  }[];
}

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  draft_diajukan: { label: "Draft Diajukan", bg: "bg-slate-100", text: "text-slate-700" },
  disetujui: { label: "Disetujui", bg: "bg-emerald-50", text: "text-emerald-700" },
  digenerate: { label: "Digenerate", bg: "bg-blue-50", text: "text-blue-700" },
  diterima_didistribusikan: { label: "Diterima / Didistribusikan", bg: "bg-emerald-50", text: "text-emerald-700" },
  dikembalikan: { label: "Dikembalikan", bg: "bg-rose-50", text: "text-rose-700" },
};

type TabType = "SEMUA" | "INBOUND" | "OUTBOUND";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_10px_1fr] items-start leading-snug">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-500">:</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

export default function AdminDeliveryPage() {
  const { user } = useAuth();
  const { get } = useApi();

  const [activeTab, setActiveTab] = useState<TabType>("SEMUA");
  const [searchQuery, setSearchQuery] = useState("");
  const [records, setRecords] = useState<SuratJalanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<SuratJalanRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    const currentRole = mapRole(user.role);
    if (currentRole !== "admin") {
      window.location.href = "/";
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoints: string[] = [];
      if (activeTab === "SEMUA" || activeTab === "OUTBOUND") {
        endpoints.push(`${API_BASE}/api/surat-jalan/outbound/queue`);
      }
      if (activeTab === "SEMUA" || activeTab === "INBOUND") {
        endpoints.push(`${API_BASE}/api/surat-jalan/inbound`);
      }

      const responses = await Promise.all(endpoints.map((url) => get(url)));
      const jsonResults = await Promise.all(responses.map((r) => r.json()));

      const allRecords: SuratJalanRecord[] = [];

      for (const json of jsonResults) {
        const data = json?.data;
        if (Array.isArray(data)) {
          allRecords.push(...data);
        }
      }

      setRecords(allRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data surat jalan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchQuery.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return records.filter((record) => {
      const tipe = (record.tipe || "").toLowerCase();
      const matchesSearch =
        !q ||
        record.nomor_surat_jalan.toLowerCase().includes(q) ||
        (record.project?.nama_project || "").toLowerCase().includes(q) ||
        (record.gudang_tujuan?.nama_gudang || record.gudang_asal?.nama_gudang || "").toLowerCase().includes(q);

      const matchesTab =
        activeTab === "SEMUA" ||
        (activeTab === "INBOUND" && tipe === "inbound") ||
        (activeTab === "OUTBOUND" && tipe === "outbound");

      return matchesSearch && matchesTab;
    });
  }, [records, searchQuery, activeTab]);

  const inboundCount = useMemo(
    () => records.filter((r) => (r.tipe || "").toLowerCase() === "inbound").length,
    [records]
  );
  const outboundCount = useMemo(
    () => records.filter((r) => (r.tipe || "").toLowerCase() === "outbound").length,
    [records]
  );

  return (
    <div className={`${plusJakartaSans.className}`}>
      <div className="flex flex-1 flex-col p-6">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Surat Jalan</h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelola dan verifikasi surat jalan inbound dan outbound.
            </p>
          </div>
        </header>

        {/* Tabs & Search */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            {[
              { key: "SEMUA", label: "Semua" },
              { key: "INBOUND", label: `Inbound (${inboundCount})` },
              { key: "OUTBOUND", label: `Outbound (${outboundCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-[#FF5500] text-white shadow-md shadow-orange-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor surat jalan, project, atau lokasi..."
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tipe</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">No. Surat Jalan</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Project / Lokasi</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tanggal</th>
                  <th className="px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {Array.from({ length: 6 }).map((_, colIndex) => (
                        <td key={colIndex} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded-lg bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-rose-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <FileText size={28} className="mx-auto text-slate-300" />
                      <p className="mt-3 text-sm font-medium text-slate-600">Tidak ada data surat jalan</p>
                      <p className="mt-1 text-xs text-slate-400">Coba ubah filter atau kata pencarian.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => {
                    const statusMeta = STATUS_META[record.status] || { label: record.status, bg: "bg-slate-100", text: "text-slate-600" };
                    const totalQty = record.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
                    const isOutbound = (record.tipe || "").toLowerCase() === "outbound";

                    return (
                      <tr key={record.surat_jalan_id} className="group transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                              isOutbound
                                ? "bg-amber-50 text-amber-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {isOutbound ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                            {isOutbound ? "Outbound" : "Inbound"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{record.nomor_surat_jalan}</p>
                          <p className="text-xs text-slate-400">
                            {record.gudang_asal?.nama_gudang || record.gudang_tujuan?.nama_gudang || "-"}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{record.project?.nama_project || "-"}</p>
                          <p className="text-xs text-slate-400">
                            {totalQty} item • {record.personil_pengantar?.nama || "-"}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-slate-500">
                          {record.tanggal ? new Date(record.tanggal).toLocaleDateString("id-ID") : "-"}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.bg} ${statusMeta.text}`}>
                            {record.status === "diterima_didistribusikan" && <CheckCircle2 size={12} />}
                            {record.status === "draft_diajukan" && <Clock size={12} />}
                            {statusMeta.label}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(record)}
                              title="Lihat detail"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedRecord && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={() => setSelectedRecord(null)}
          >
            <div
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Toolbar — hilang saat print */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Detail Surat Jalan</h2>
                  <p className="text-xs text-slate-500">{selectedRecord.nomor_surat_jalan}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Dokumen Surat Jalan — ini yang ke-print */}
              <div className="p-6">
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
                      <InfoRow label="No Surat Jalan" value={selectedRecord.nomor_surat_jalan} />
                      <InfoRow label="Tipe" value={selectedRecord.tipe === "OUTBOUND" ? "Outbound" : "Inbound"} />
                      <InfoRow label="Project" value={selectedRecord.project?.nama_project || "-"} />
                      <InfoRow label="Gudang Asal" value={selectedRecord.gudang_asal?.nama_gudang || "-"} />
                    </div>
                    <div className="space-y-3">
                      <InfoRow label="Tanggal" value={selectedRecord.tanggal ? new Date(selectedRecord.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-"} />
                      <InfoRow label="Gudang Tujuan" value={selectedRecord.gudang_tujuan?.nama_gudang || "-"} />
                      <InfoRow label="Kendaraan" value={selectedRecord.kendaraan?.jenis_kendaraan || "-"} />
                      <InfoRow label="No Polisi" value={selectedRecord.kendaraan?.no_polisi || "-"} />
                      <InfoRow label="Driver" value={selectedRecord.personil_pengantar?.nama || "-"} />
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
                      {selectedRecord.items.map((item, i) => (
                        <tr key={item.item_id} className="even:bg-gray-50">
                          <td className="border border-gray-200 px-3 py-2.5">{i + 1}</td>
                          <td className="border border-gray-200 px-3 py-2.5 font-medium">{item.barang.kode_perangkat}</td>
                          <td className="border border-gray-200 px-3 py-2.5">{item.barang.nama_barang}</td>
                          <td className="border border-gray-200 px-3 py-2.5 text-center font-semibold">{Number(item.qty || 0)}</td>
                          <td className="border border-gray-200 px-3 py-2.5 text-center">{item.satuan?.kode_satuan || item.barang?.satuan_default?.kode_satuan || "-"}</td>
                          <td className="border border-gray-200 px-3 py-2.5 text-gray-500">{item.kondisi || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Tanda tangan */}
                  <div className="mb-8 grid grid-cols-3 gap-6 text-center text-sm">
                    <div>
                      <p className="mb-16 font-medium text-gray-700">Material Handler</p>
                      <div className="border-t border-gray-400 pt-1">
                        <p className="font-semibold text-gray-900">{selectedRecord.creator?.nama || "-"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="mb-16 font-medium text-gray-700">Driver</p>
                      <div className="border-t border-gray-400 pt-1">
                        <p className="font-semibold text-gray-900">{selectedRecord.personil_pengantar?.nama || "-"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="mb-16 font-medium text-gray-700">PIC Pemohon (Penerima)</p>
                      <div className="border-t border-gray-400 pt-1">
                        <p className="font-semibold text-gray-900">-</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer dokumen */}
                  <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-[10px] text-gray-400">
                    <span>{selectedRecord.nomor_surat_jalan} | {selectedRecord.tanggal ? new Date(selectedRecord.tanggal).toLocaleDateString("id-ID") : "-"}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 print:hidden">
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
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          aside, header, nav { display: none !important; }
          main { margin-left: 0 !important; margin-top: 0 !important; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
