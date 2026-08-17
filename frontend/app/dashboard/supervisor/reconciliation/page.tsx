"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  RefreshCw,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Eye,
  X,
  ShieldAlert
} from "lucide-react";

// ==========================================
// 1. Tipe Data TypeScript
// ==========================================
export type StatusRekonsiliasi = "BERJALAN" | "PERHATIAN" | "SELESAI";

export interface ItemRekonsiliasi {
  id: string;
  project: string;
  kodeTiket: string;
  barang: string;
  kodeBarang: string;
  gudang: string;
  boq: number;
  additional: number;
  onSite: number;
  used: number;
  remains: number;
  status: StatusRekonsiliasi;
  catatanStaf?: string;
}

// ==========================================
// 2. Dummy Data Rekonsiliasi Supervisor
// ==========================================
const MOCK_REKONSILIASI: ItemRekonsiliasi[] = [
  {
    id: "REC-001",
    project: "FTTH Ciamis Area Utara",
    kodeTiket: "TKT-2026-002",
    barang: "KABEL FO 24/2T ZTT 2024",
    kodeBarang: "CBL-00461",
    gudang: "Gudang Ciamis",
    boq: 30,
    additional: 0,
    onSite: 0,
    used: 100,
    remains: -100,
    status: "PERHATIAN",
    catatanStaf: "Penggunaan membengkak di lapangan karena pengalihan jalur tiang listrik utama.",
  },
  {
    id: "REC-002",
    project: "FTTH Ciamis Area Utara",
    kodeTiket: "TKT-2026-002",
    barang: "PATCHCORD LC/UPC - SC/UPC 3 METER (Simplex)",
    kodeBarang: "JTR-02242",
    gudang: "Gudang Ciamis",
    boq: 100,
    additional: 0,
    onSite: 0,
    used: 0,
    remains: 0,
    status: "BERJALAN",
  },
  {
    id: "REC-003",
    project: "Backbone Garut Selatan",
    kodeTiket: "TKT-2026-003",
    barang: "PATCHCORD LC/UPC - SC/UPC 3 METER (Simplex)",
    kodeBarang: "JTR-02242",
    gudang: "Gudang Rancamanyar",
    boq: 5,
    additional: 0,
    onSite: 0,
    used: 0,
    remains: 0,
    status: "BERJALAN",
  },
  {
    id: "REC-004",
    project: "FTTH Rancamanyar Tahap 1",
    kodeTiket: "TKT-2026-004",
    barang: "ODP 10 PORT WITH 8PCS SC UPC ADAPTER AND OUTDOOR CONNECTOR",
    kodeBarang: "NWK-00964",
    gudang: "Gudang Rancamanyar",
    boq: 25,
    additional: 0,
    onSite: 0,
    used: 0,
    remains: 0,
    status: "BERJALAN",
  },
];

export default function SupervisorReconciliationPage() {
  const [dataList, setDataList] = useState<ItemRekonsiliasi[]>(MOCK_REKONSILIASI);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState("SEMUA");
  const [selectedStatus, setSelectedStatus] = useState("SEMUA");
  const [activeTab, setActiveTab] = useState<"SEMUA" | "PERHATIAN" | "BERJALAN">("SEMUA");

  // State Modal Detail & Approval
  const [selectedItem, setSelectedItem] = useState<ItemRekonsiliasi | null>(null);

  // Filter Logic
  const filteredData = useMemo(() => {
    return dataList.filter((item) => {
      const matchSearch =
        item.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kodeTiket.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (selectedProject !== "SEMUA" && item.project !== selectedProject) return false;
      if (selectedStatus !== "SEMUA" && item.status !== selectedStatus) return false;

      if (activeTab === "PERHATIAN") return item.status === "PERHATIAN";
      if (activeTab === "BERJALAN") return item.status === "BERJALAN";

      return true;
    });
  }, [dataList, searchQuery, selectedProject, selectedStatus, activeTab]);

  // Kalkulasi KPI Dynamic
  const metrics = useMemo(() => {
    const boq = dataList.reduce((acc, curr) => acc + curr.boq, 0);
    const additional = dataList.reduce((acc, curr) => acc + curr.additional, 0);
    const onSite = dataList.reduce((acc, curr) => acc + curr.onSite, 0);
    const used = dataList.reduce((acc, curr) => acc + curr.used, 0);
    const remains = dataList.reduce((acc, curr) => acc + curr.remains, 0);
    const totalAnomali = dataList.filter((item) => item.status === "PERHATIAN").length;

    return { boq, additional, onSite, used, remains, totalAnomali };
  }, [dataList]);

  // Handler Approval Adjustment oleh Supervisor
  const handleApproveAdjustment = (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menyetujui penyesuaian BOQ (Additional) untuk item ini?")) return;

    setDataList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const diff = Math.abs(item.remains);
          return {
            ...item,
            additional: item.additional + diff,
            remains: 0,
            status: "BERJALAN",
          };
        }
        return item;
      })
    );

    setSelectedItem(null);
    alert("Penyesuaian BOQ berhasil disetujui!");
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-[#F8F6F0] min-h-screen text-slate-800 w-full overflow-x-hidden">
      
      {/* 1. HEADER TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Rekonsiliasi Inventory (Supervisor)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau kesesuaian BOQ, evaluasi selisih material, dan setujui penyesuaian stok project.
          </p>
        </div>

        <button
          onClick={() => alert("Refreshed!")}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold shadow-sm transition w-fit cursor-pointer"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

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
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="SEMUA">Semua Project</option>
            <option value="FTTH Ciamis Area Utara">FTTH Ciamis Area Utara</option>
            <option value="Backbone Garut Selatan">Backbone Garut Selatan</option>
            <option value="FTTH Rancamanyar Tahap 1">FTTH Rancamanyar Tahap 1</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="SEMUA">Semua Status</option>
            <option value="PERHATIAN">Perhatian (Selisih)</option>
            <option value="BERJALAN">Berjalan (Normal)</option>
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
          <span className="text-[11px] text-slate-400 block mt-0.5">Tambahan di luar BOQ</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-stone-200/80 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Hardware on Site</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.onSite}</p>
          <span className="text-[11px] text-slate-400 block mt-0.5">Sudah diterima</span>
        </div>

        <div className="bg-white p-4.5 rounded-3xl border border-stone-200/80 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Used</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.used}</p>
          <span className="text-[11px] text-slate-400 block mt-0.5">Sudah digunakan</span>
        </div>

        <div className={`p-4.5 rounded-3xl border shadow-sm ${metrics.remains < 0 ? "bg-rose-50/70 border-rose-200 text-rose-900" : "bg-white border-stone-200/80 text-slate-900"}`}>
          <span className="text-xs font-medium opacity-80">Remains</span>
          <p className={`text-2xl font-black mt-1 ${metrics.remains < 0 ? "text-rose-600" : "text-slate-900"}`}>
            {metrics.remains}
          </p>
          <span className="text-[11px] opacity-70 block mt-0.5">Sisa perangkat</span>
        </div>
      </div>

      {/* 4. BANNER INFO SUPERVISOR */}
      <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <ShieldAlert className="text-blue-600 shrink-0 mt-0.5" size={18} />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Perhitungan Rekonsiliasi Supervisor:</span> Item berstatus{" "}
          <span className="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Perhatian</span> memerlukan tindakan verifikasi dan approval *Additional BOQ* agar stok fisik terbukti valid secara sistem.
        </div>
      </div>

      {/* 5. TABEL REKONSILIASI */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
        {/* Sub Header Table & Quick Tabs */}
        <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Daftar Rekonsiliasi</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rekonsiliasi BOQ dan realisasi hardware per project/tiket.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("SEMUA")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "SEMUA" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Semua ({dataList.length})
            </button>
            <button
              onClick={() => setActiveTab("PERHATIAN")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                activeTab === "PERHATIAN" ? "bg-amber-500 text-white shadow-sm" : "text-amber-700 hover:bg-amber-50"
              }`}
            >
              <AlertTriangle size={12} /> Perhatian ({metrics.totalAnomali})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-[20%]">Project</th>
                <th className="py-3.5 px-3 w-[12%]">Kode Tiket</th>
                <th className="py-3.5 px-4 w-[24%]">Barang</th>
                <th className="py-3.5 px-2 text-center w-[6%]">BOQ</th>
                <th className="py-3.5 px-2 text-center w-[7%]">Additional</th>
                <th className="py-3.5 px-2 text-center w-[7%]">On Site</th>
                <th className="py-3.5 px-2 text-center w-[6%]">Used</th>
                <th className="py-3.5 px-2 text-center w-[7%]">Remains</th>
                <th className="py-3.5 px-3 text-center w-[11%]">Status</th>
                <th className="py-3.5 px-3 text-center w-[8%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs md:text-sm text-slate-700">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/60 transition">
                    
                    {/* Project */}
                    <td className="py-4 px-4 font-semibold text-slate-900 break-words">
                      {item.project}
                    </td>

                    {/* Kode Tiket */}
                    <td className="py-4 px-3 font-mono text-xs text-slate-600">
                      <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        {item.kodeTiket}
                      </span>
                    </td>

                    {/* Barang */}
                    <td className="py-4 px-4 break-words">
                      <span className="font-bold text-slate-800 block leading-tight">{item.barang}</span>
                      <span className="text-xs text-slate-400 font-mono">{item.kodeBarang} • {item.gudang}</span>
                    </td>

                    {/* Numbers */}
                    <td className="py-4 px-2 text-center font-medium text-slate-800">{item.boq}</td>
                    <td className="py-4 px-2 text-center font-medium text-slate-800">{item.additional}</td>
                    <td className="py-4 px-2 text-center font-semibold text-blue-600">{item.onSite}</td>
                    <td className="py-4 px-2 text-center font-medium text-slate-800">{item.used}</td>

                    {/* Remains */}
                    <td className="py-4 px-2 text-center font-bold">
                      {item.remains < 0 ? (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                          {item.remains}
                        </span>
                      ) : (
                        <span className="text-emerald-600">{item.remains}</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-3 text-center">
                      {item.status === "PERHATIAN" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full">
                          Perhatian
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full">
                          Berjalan
                        </span>
                      )}
                    </td>

                    {/* Aksi Button Supervisor */}
                    <td className="py-4 px-3 text-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className={`inline-flex items-center justify-center p-2 rounded-xl transition shadow-sm cursor-pointer ${
                          item.status === "PERHATIAN"
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                        title={item.status === "PERHATIAN" ? "Tinjau & Disposisi Selisih" : "Lihat Detail"}
                      >
                        {item.status === "PERHATIAN" ? <FileCheck size={16} /> : <Eye size={16} />}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                    Tidak ada data rekonsiliasi yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL APPROVAL SUPERVISOR */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 my-8">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${selectedItem.status === "PERHATIAN" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedItem.status === "PERHATIAN" ? "Tinjau Selisih BOQ" : "Detail Rekonsiliasi"}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedItem.kodeTiket} • {selectedItem.project}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Modal */}
            <div className="my-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-xs text-slate-400 uppercase font-semibold">Perangkat / Material</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{selectedItem.barang}</p>
                <p className="text-xs text-slate-500 font-mono">{selectedItem.kodeBarang} ({selectedItem.gudang})</p>
              </div>

              {/* Rincian Angka */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] text-slate-400 block">BOQ Awal</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedItem.boq}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] text-slate-400 block">Terpakai</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedItem.used}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[11px] text-slate-400 block">Additional</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedItem.additional}</span>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <span className="text-[11px] text-rose-600 block font-semibold">Remains</span>
                  <span className="font-black text-rose-600 text-sm">{selectedItem.remains}</span>
                </div>
              </div>

              {/* Catatan Lapangan Staf */}
              {selectedItem.catatanStaf && (
                <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl">
                  <span className="text-xs font-bold text-amber-900 block mb-1">Catatan Staf Lapangan:</span>
                  <p className="text-xs text-amber-800 leading-relaxed">{selectedItem.catatanStaf}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Tutup
              </button>

              {selectedItem.status === "PERHATIAN" && (
                <button
                  onClick={() => handleApproveAdjustment(selectedItem.id)}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <CheckCircle2 size={16} /> Disetujui (Adjustment BOQ)
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}