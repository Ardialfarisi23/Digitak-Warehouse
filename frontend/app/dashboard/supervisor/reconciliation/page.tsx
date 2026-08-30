"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Search, RefreshCw, FileCheck, AlertTriangle, CheckCircle2, Eye, X, ShieldAlert, Loader2 } from "lucide-react";
import { useApi } from "@/lib/api";

// ==========================================
// 1. Tipe Data (mengikuti bentuk asli response backend)
// ==========================================
export type StatusRekonsiliasi = "berjalan" | "perhatian" | "sesuai";

export interface ItemRekonsiliasi {
  id: string;
  projectId: string;
  project: string;
  tiketId: string;
  kodeTiket: string;
  barang: string;
  kodeBarang: string;
  gudang: string;
  boq: number;
  additional: number;
  onSite: number; // = MOS (Sistem), dihitung real-time dari Surat Jalan Inbound yang sudah diterima
  mosMitra: number; // input manual admin/supervisor, dibandingkan terhadap MOS (Sistem)
  selisih: number; // mosMitra - onSite
  used: number;
  remains: number;
  status: StatusRekonsiliasi;
}

const STATUS_LABEL: Record<StatusRekonsiliasi, string> = {
  perhatian: "Perhatian",
  berjalan: "Berjalan",
  sesuai: "Sesuai",
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Memetakan satu baris response API (snake_case) ke bentuk yang dipakai komponen ini.
function mapApiRow(row: any): ItemRekonsiliasi {
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? ""),
    project: row.project_nama ?? "-",
    tiketId: String(row.tiket_id ?? ""),
    kodeTiket: row.kode_tiket ?? "-",
    barang: row.nama_barang ?? "-",
    kodeBarang: row.kode_perangkat ?? "-",
    gudang: row.gudang_nama ?? "-",
    boq: Number(row.boq ?? 0),
    additional: Number(row.additional ?? 0),
    onSite: Number(row.mos_sistem ?? 0),
    mosMitra: Number(row.mos_mitra ?? 0),
    selisih: Number(row.selisih ?? 0),
    used: Number(row.used ?? 0),
    remains: Number(row.remains ?? 0),
    status: (row.status as StatusRekonsiliasi) ?? "berjalan",
  };
}

export default function SupervisorReconciliationPage() {
  const { get, put } = useApi();

  const [dataList, setDataList] = useState<ItemRekonsiliasi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState("SEMUA");
  const [selectedStatus, setSelectedStatus] = useState<"SEMUA" | StatusRekonsiliasi>("SEMUA");
  const [activeTab, setActiveTab] = useState<"SEMUA" | "perhatian" | "berjalan">("SEMUA");

  // State Modal Detail & Input MOS Mitra
  const [selectedItem, setSelectedItem] = useState<ItemRekonsiliasi | null>(null);
  const [mosMitraInput, setMosMitraInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ==========================================
  // Ambil data real-time dari backend
  // ==========================================
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedStatus !== "SEMUA") params.set("status", selectedStatus);

      const response = await get(`${BASE_URL}/api/reconciliation/inventory?${params.toString()}`);

      if (response.status === 403) {
        setLoadError("Anda tidak memiliki akses ke data rekonsiliasi ini.");
        setDataList([]);
        return;
      }

      if (!response.ok) {
        setLoadError("Gagal memuat data rekonsiliasi dari server.");
        setDataList([]);
        return;
      }

      const payload = await response.json();
      const rows = payload?.data?.data ?? payload?.data ?? [];
      setDataList(Array.isArray(rows) ? rows.map(mapApiRow) : []);
    } catch (err) {
      console.error("Gagal memuat rekonsiliasi:", err);
      setLoadError("Terjadi kesalahan saat menghubungi server.");
      setDataList([]);
    } finally {
      setIsLoading(false);
    }
  }, [get, searchQuery, selectedStatus]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch otomatis saat filter search/status berubah (debounce ringan untuk search)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedStatus]);

  // Daftar project untuk dropdown filter, diturunkan dari data yang sudah masuk
  const projectOptions = useMemo(() => {
    const unique = new Map<string, string>();
    dataList.forEach((item) => unique.set(item.project, item.project));
    return Array.from(unique.values());
  }, [dataList]);

  // Filter Logic (project & tab difilter di client, search & status sudah difilter server-side)
  const filteredData = useMemo(() => {
    return dataList.filter((item) => {
      if (selectedProject !== "SEMUA" && item.project !== selectedProject) return false;
      if (activeTab === "perhatian") return item.status === "perhatian";
      if (activeTab === "berjalan") return item.status === "berjalan";
      return true;
    });
  }, [dataList, selectedProject, activeTab]);

  // Kalkulasi KPI Dynamic — dihitung ulang tiap kali dataList berubah (real-time terhadap data ter-fetch)
  const metrics = useMemo(() => {
    const boq = dataList.reduce((acc, curr) => acc + curr.boq, 0);
    const additional = dataList.reduce((acc, curr) => acc + curr.additional, 0);
    const onSite = dataList.reduce((acc, curr) => acc + curr.onSite, 0);
    const used = dataList.reduce((acc, curr) => acc + curr.used, 0);
    const remains = dataList.reduce((acc, curr) => acc + curr.remains, 0);
    const totalAnomali = dataList.filter((item) => item.status === "perhatian").length;

    return { boq, additional, onSite, used, remains, totalAnomali };
  }, [dataList]);

  // Buka modal detail, isi input MOS Mitra dengan nilai saat ini
  const openDetail = (item: ItemRekonsiliasi) => {
    setSelectedItem(item);
    setMosMitraInput(String(item.mosMitra ?? 0));
    setSaveError(null);
  };

  // Handler input MOS Laporan Mitra oleh Admin/Supervisor
  const handleSaveMosMitra = async () => {
    if (!selectedItem) return;

    const parsed = Number(mosMitraInput);
    if (Number.isNaN(parsed) || parsed < 0) {
      setSaveError("Masukkan angka yang valid (tidak boleh negatif).");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await put(`${BASE_URL}/api/reconciliation/tiket/${selectedItem.tiketId}/mos-mitra`, { mos: parsed });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setSaveError(body?.message || "Gagal menyimpan MOS Laporan Mitra.");
        return;
      }

      // Update semua baris dengan tiket_id yang sama (satu tiket bisa punya beberapa baris barang)
      setDataList((prev) =>
        prev.map((item) => {
          if (item.tiketId !== selectedItem.tiketId) return item;
          const selisih = parsed - item.onSite;
          return { ...item, mosMitra: parsed, selisih };
        }),
      );

      setSelectedItem((prev) => (prev ? { ...prev, mosMitra: parsed, selisih: parsed - prev.onSite } : prev));
    } catch (err) {
      console.error("Gagal menyimpan MOS Mitra:", err);
      setSaveError("Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-[#F8F6F0] min-h-screen text-slate-800 w-full overflow-x-hidden">
      {/* 1. HEADER TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rekonsiliasi Inventory (Supervisor)</h1>
          <p className="text-sm text-slate-500 mt-1">Pantau kesesuaian BOQ, realisasi hardware real-time, dan input MOS Laporan Mitra.</p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold shadow-sm transition w-fit cursor-pointer disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          Refresh
        </button>
      </div>

      {loadError && <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6 text-sm text-rose-700 font-medium">{loadError}</div>}

      {/* 2. FILTER BAR */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200/80 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari project, tiket, kode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500]/50 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none">
            <option value="SEMUA">Semua Project</option>
            {projectOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="SEMUA">Semua Status</option>
            <option value="perhatian">Perhatian (Selisih)</option>
            <option value="berjalan">Berjalan (Normal)</option>
            <option value="sesuai">Sesuai (Terpenuhi)</option>
          </select>
        </div>
      </div>

      {/* 3. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
        <div className="bg-white p-4.5 rounded-3xl border border-stone-200/80 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">BOQ</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.boq}</p>
          <span className="text-[11px] text-slate-400 block mt-0.5">Rencana awal</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-stone-200/80 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Additional</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.additional}</p>
          <span className="text-[11px] text-slate-400 block mt-0.5">Kelebihan inbound di luar BOQ</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-stone-200/80 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">MOS (Sistem)</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.onSite}</p>
          <span className="text-[11px] text-slate-400 block mt-0.5">Real-time dari Surat Jalan diterima</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-stone-200/80 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Used</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.used}</p>
          <span className="text-[11px] text-slate-400 block mt-0.5">Real-time dari Surat Jalan outbound</span>
        </div>

        <div className={`p-4.5 rounded-3xl border shadow-sm ${metrics.remains < 0 ? "bg-rose-50/70 border-rose-200 text-rose-900" : "bg-white border-stone-200/80 text-slate-900"}`}>
          <span className="text-xs font-medium opacity-80">Remains</span>
          <p className={`text-2xl font-black mt-1 ${metrics.remains < 0 ? "text-rose-600" : "text-slate-900"}`}>{metrics.remains}</p>
          <span className="text-[11px] opacity-70 block mt-0.5">MOS Sistem − (BOQ + Additional)</span>
        </div>
      </div>

      {/* 4. BANNER INFO SUPERVISOR */}
      <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <ShieldAlert className="text-blue-600 shrink-0 mt-0.5" size={18} />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Perhitungan Rekonsiliasi:</span> kolom BOQ, Additional, MOS (Sistem), Used, dan Remains dihitung otomatis secara real-time dari data Surat Jalan yang sudah berstatus Disetujui/Diterima. Kolom{" "}
          <span className="font-bold">MOS Laporan Mitra</span> dan <span className="font-bold">Selisih</span> perlu diisi manual oleh Admin/Supervisor berdasarkan laporan lapangan dari mitra pelaksana, lalu Selisih akan otomatis terhitung
          terhadap MOS (Sistem).
        </div>
      </div>

      {/* 5. TABEL REKONSILIASI */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
        {/* Sub Header Table & Quick Tabs */}
        <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Daftar Rekonsiliasi</h2>
            <p className="text-xs text-slate-400 mt-0.5">Rekonsiliasi BOQ dan realisasi hardware per project/tiket.</p>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("SEMUA")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${activeTab === "SEMUA" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Semua ({dataList.length})
            </button>
            <button
              onClick={() => setActiveTab("perhatian")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${activeTab === "perhatian" ? "bg-amber-500 text-white shadow-sm" : "text-amber-700 hover:bg-amber-50"}`}
            >
              <AlertTriangle size={12} /> Perhatian ({metrics.totalAnomali})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-[16%]">Project</th>
                <th className="py-3.5 px-3 w-[10%]">Kode Tiket</th>
                <th className="py-3.5 px-4 w-[19%]">Barang</th>
                <th className="py-3.5 px-2 text-center w-[5%]">BOQ</th>
                <th className="py-3.5 px-2 text-center w-[6%]">Add.</th>
                <th className="py-3.5 px-2 text-center w-[7%]">MOS Sistem</th>
                <th className="py-3.5 px-2 text-center w-[7%]">MOS Mitra</th>
                <th className="py-3.5 px-2 text-center w-[6%]">Selisih</th>
                <th className="py-3.5 px-2 text-center w-[5%]">Used</th>
                <th className="py-3.5 px-2 text-center w-[6%]">Remains</th>
                <th className="py-3.5 px-3 text-center w-[9%]">Status</th>
                <th className="py-3.5 px-3 text-center w-[6%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs md:text-sm text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 text-sm">
                    <Loader2 className="animate-spin inline-block mr-2" size={16} />
                    Memuat data rekonsiliasi...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/60 transition">
                    {/* Project */}
                    <td className="py-4 px-4 font-semibold text-slate-900 break-words">{item.project}</td>

                    {/* Kode Tiket */}
                    <td className="py-4 px-3 font-mono text-xs text-slate-600">
                      <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">{item.kodeTiket}</span>
                    </td>

                    {/* Barang */}
                    <td className="py-4 px-4 break-words">
                      <span className="font-bold text-slate-800 block leading-tight">{item.barang}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        {item.kodeBarang} • {item.gudang}
                      </span>
                    </td>

                    {/* Numbers */}
                    <td className="py-4 px-2 text-center font-medium text-slate-800">{item.boq}</td>
                    <td className="py-4 px-2 text-center font-medium text-slate-800">{item.additional}</td>
                    <td className="py-4 px-2 text-center font-semibold text-blue-600">{item.onSite}</td>
                    <td className="py-4 px-2 text-center font-medium text-slate-800">{item.mosMitra}</td>

                    {/* Selisih */}
                    <td className="py-4 px-2 text-center font-bold">
                      {item.selisih !== 0 ? <span className={item.selisih < 0 ? "text-rose-600" : "text-amber-600"}>{item.selisih > 0 ? `+${item.selisih}` : item.selisih}</span> : <span className="text-slate-400">0</span>}
                    </td>

                    <td className="py-4 px-2 text-center font-medium text-slate-800">{item.used}</td>

                    {/* Remains */}
                    <td className="py-4 px-2 text-center font-bold">
                      {item.remains < 0 ? <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">{item.remains}</span> : <span className="text-emerald-600">{item.remains}</span>}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-3 text-center">
                      {item.status === "perhatian" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full">Perhatian</span>
                      ) : item.status === "sesuai" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">Sesuai</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full">Berjalan</span>
                      )}
                    </td>

                    {/* Aksi Button Supervisor */}
                    <td className="py-4 px-3 text-center">
                      <button
                        onClick={() => openDetail(item)}
                        className={`inline-flex items-center justify-center p-2 rounded-xl transition shadow-sm cursor-pointer ${
                          item.status === "perhatian" ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                        title={item.status === "perhatian" ? "Tinjau & Input MOS Mitra" : "Lihat Detail"}
                      >
                        {item.status === "perhatian" ? <FileCheck size={16} /> : <Eye size={16} />}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 text-sm">
                    Tidak ada data rekonsiliasi yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL DETAIL & INPUT MOS MITRA */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 my-8">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${selectedItem.status === "perhatian" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Detail & Input MOS Laporan Mitra</h3>
                  <p className="text-xs text-slate-400">
                    {selectedItem.kodeTiket} • {selectedItem.project}
                  </p>
                </div>
              </div>

              <button onClick={() => setSelectedItem(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Content Modal */}
            <div className="my-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-xs text-slate-400 uppercase font-semibold">Perangkat / Material</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{selectedItem.barang}</p>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedItem.kodeBarang} ({selectedItem.gudang})
                </p>
              </div>

              {/* Rincian Angka Real-Time (read only) */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] text-slate-400 block">BOQ</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedItem.boq}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] text-slate-400 block">Additional</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedItem.additional}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] text-slate-400 block">MOS Sistem</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedItem.onSite}</span>
                </div>
                <div className={`p-3 rounded-xl border ${selectedItem.remains < 0 ? "bg-rose-50 border-rose-200" : "bg-stone-50 border-stone-200"}`}>
                  <span className={`text-[11px] block font-semibold ${selectedItem.remains < 0 ? "text-rose-600" : "text-slate-400"}`}>Remains</span>
                  <span className={`font-black text-sm ${selectedItem.remains < 0 ? "text-rose-600" : "text-slate-800"}`}>{selectedItem.remains}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">Empat angka di atas dihitung otomatis secara real-time dari data Surat Jalan sistem dan tidak bisa diedit manual di sini.</p>

              {/* Input MOS Laporan Mitra (editable oleh Admin/Supervisor) */}
              <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-blue-900 block">MOS Laporan Mitra (input manual)</label>
                <p className="text-[11px] text-blue-800 leading-relaxed mb-2">Isi berdasarkan laporan fisik dari mitra pelaksana di lapangan. Selisih terhadap MOS Sistem akan otomatis terhitung setelah disimpan.</p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    value={mosMitraInput}
                    onChange={(e) => setMosMitraInput(e.target.value)}
                    className="w-32 px-3 py-2 rounded-xl border border-blue-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    onClick={handleSaveMosMitra}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Simpan
                  </button>
                  <span className="text-xs text-slate-500">
                    Selisih saat ini:{" "}
                    <span className={`font-bold ${selectedItem.selisih < 0 ? "text-rose-600" : selectedItem.selisih > 0 ? "text-amber-600" : "text-slate-600"}`}>
                      {selectedItem.selisih > 0 ? `+${selectedItem.selisih}` : selectedItem.selisih}
                    </span>
                  </span>
                </div>
                {saveError && <p className="text-xs text-rose-600 font-semibold">{saveError}</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <button onClick={() => setSelectedItem(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
