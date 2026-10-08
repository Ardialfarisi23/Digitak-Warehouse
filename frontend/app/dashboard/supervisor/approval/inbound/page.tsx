"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Clock, AlertTriangle, Layers, FileText, ArrowLeft, ArrowDownLeft } from "lucide-react";
import { useApi } from "@/lib/api";

interface GudangTujuan {
  id: string;
  nama_gudang: string;
}

interface InboundRequest {
  id: string;
  nomor_surat_jalan: string;
  tipe_pengirim?: "internal" | "external";
  supplier?: { nama: string; kode: string };
  gudang_asal?: { nama_gudang: string };
  gudang_tujuan?: GudangTujuan;
  kategori_approval?: string;
  status: string;
  total_tipe?: number;
  total_unit?: number;
  ada_fisik_rusak?: boolean;
  selisih_po?: boolean;
  surat_jalan_url?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SupervisorApprovalPage() {
  const router = useRouter();
  const { get } = useApi();

  const [requests, setRequests] = useState<InboundRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "history">("all");

  const fetchInboundList = async () => {
    setLoading(true);
    try {
      const res = await get(`${API_BASE_URL}/api/surat-jalan/inbound`);
      const data = await res.json();

      const rawList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.result) ? data.result : [];

      const normalized: InboundRequest[] = rawList.map((r: any) => ({
        ...r,
        id: String(r.surat_jalan_id ?? r.id),
      }));

      setRequests(normalized);
    } catch (error) {
      console.error("Gagal mengambil data inbound:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboundList();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredRequests = useMemo(() => {
    if (!Array.isArray(requests)) return [];

    const tabFiltered = requests.filter((r) => {
      if (activeTab === "all") {
        return true;
      }
      return ["ready_putaway", "disetujui", "digenerate", "diterima_didistribusikan", "ditolak"].includes(r.status);
    });

    return tabFiltered.filter((r) => {
      const pengirimText =
        r.tipe_pengirim === "external"
          ? `${r.supplier?.kode ?? ""} ${r.supplier?.nama ?? ""}`
          : r.tipe_pengirim === "internal"
          ? r.gudang_asal?.nama_gudang || ""
          : "";

      const matchSearch =
        !query.trim() ||
        (r.nomor_surat_jalan || "").toLowerCase().includes(query.toLowerCase()) ||
        pengirimText.toLowerCase().includes(query.toLowerCase()) ||
        (r.gudang_tujuan?.nama_gudang || "").toLowerCase().includes(query.toLowerCase());

      const matchCat = selectedCategory === "all" || (r.kategori_approval || "inbound_di_luar_po") === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [requests, query, selectedCategory, activeTab]);

  const stats = useMemo(() => {
    const tabRequests = requests.filter((r) => {
      if (activeTab === "all") {
        return true;
      }
      return ["ready_putaway", "disetujui", "digenerate", "diterima_didistribusikan", "ditolak"].includes(r.status);
    });

    const totalAntrean = tabRequests.length;
    const fisikRusak = tabRequests.filter((r) => {
      const item = r as any;
      return (
        item.hasDamage === true ||
        item.condition === "DAMAGED" ||
        item.physicalStatus === "RUSAK" ||
        (typeof item.damagedQty === "number" && item.damagedQty > 0) ||
        item.ada_fisik_rusak === true
      );
    }).length;
    const selisihPo = tabRequests.filter((r) => {
      const item = r as any;
      return (
        item.hasDiscrepancy === true ||
        (typeof item.qtyReceived === "number" && typeof item.qtyPo === "number" && item.qtyReceived !== item.qtyPo) ||
        item.isSelisih === true ||
        item.selisih_po === true
      );
    }).length;
    const diLuarPo = tabRequests.filter((r) => {
      const item = r as any;
      return (
        item.isUnscheduled === true ||
        item.isOutsidePo === true ||
        item.type === "UNSCHEDULED" ||
        item.poNumber === null ||
        (item.kategori_approval || "inbound_di_luar_po") === "inbound_di_luar_po"
      );
    }).length;

    return { totalAntrean, fisikRusak, selisihPo, diLuarPo };
  }, [requests, activeTab]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[#FAFAFA] min-h-screen text-slate-800">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/supervisor/approval')} className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-600 cursor-pointer" title="Kembali ke halaman sebelumnya">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-600 uppercase">
            <span>SUPERVISOR PORTAL</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 font-normal capitalize">Riwayat Penerimaan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Riwayat Barang Masuk (Inbound)</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-start">
          <div>
          <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">TOTAL INBOUND</p>
          <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.totalAntrean}</h3>
          <p className="text-xs text-slate-400">Total barang masuk</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-5 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-wider text-rose-600 uppercase mb-2">ADA FISIK RUSAK</p>
            <h3 className="text-3xl font-bold text-rose-600 mb-1">{stats.fisikRusak}</h3>
            <p className="text-xs text-rose-500 font-medium">Butuh berita acara</p>
          </div>
          <div className="p-2 bg-rose-100/50 rounded-lg text-rose-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-5 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-wider text-amber-600 uppercase mb-2">SELISIH QTY / PO</p>
            <h3 className="text-3xl font-bold text-amber-600 mb-1">{stats.selisihPo}</h3>
            <p className="text-xs text-amber-500 font-medium">Verifikasi pengirim</p>
          </div>
          <div className="p-2 bg-amber-100/50 rounded-lg text-amber-500">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">DI LUAR PO</p>
            <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.diLuarPo}</h3>
            <p className="text-xs text-slate-400">Manual / Retur</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari No. SJ, Vendor, Gudang..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/60 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 placeholder-slate-400"
          />
        </div>

        <div className="relative w-full sm:w-56">
          <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-slate-50/60 border-none rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer appearance-none font-medium"
          >
            <option value="all">Semua Kategori</option>
            <option value="inbound_di_luar_po">Di Luar PO / Unscheduled</option>
            <option value="inbound_po">Inbound PO</option>
          </select>
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm font-medium text-slate-700">
          <option value="all">Semua Kategori</option>
          <option value="inbound_rusak">Fisik Cacat/Rusak</option>
          <option value="inbound_selisih">Selisih Jumlah</option>
          <option value="inbound_di_luar_po">Di Luar PO</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === "all"
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === "history"
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Riwayat
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 font-medium">Memuat data antrean...</div>
      ) : filteredRequests.length > 0 ? (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const items = (req as any).items || [];
            const totalUnit = items.reduce((sum: number, item: any) => sum + (Number(item.qty) || 0), 0);
            const totalTipe = new Set(
              items.map((item: any) => item.barang_id).filter((id: any) => id != null)
            ).size;

            return (
             <div key={req.id} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 text-lg">{req.nomor_surat_jalan}</span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">
                    Pengirim:{" "}
                    {req.tipe_pengirim === "external"
                      ? `${req.supplier?.kode ?? ""} - ${req.supplier?.nama ?? "Vendor"}`
                      : req.tipe_pengirim === "internal"
                      ? req.gudang_asal?.nama_gudang || "Internal"
                      : "Vendor / Internal"}
                   </span>
                 </div>

                <div className="flex items-center gap-1.5 text-slate-700 text-sm font-medium">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>
                    Gudang Tujuan: <strong className="text-slate-900">{req.gudang_tujuan?.nama_gudang || "Gudang Rancamanyar"}</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Total Masuk ({totalTipe} tipe): <span className="text-slate-600 font-medium">Perangkat ({totalUnit} unit)</span>
                </p>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center">
                <button
                  onClick={() => router.push(`/dashboard/supervisor/approval/inbound/${req.id}`)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 rounded-xl text-xs font-semibold transition-colors"
                >
                  Review Detail
                </button>
                <span className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                  req.status === "ready_putaway"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : req.status === "disetujui"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : req.status === "digenerate"
                        ? "bg-slate-100 text-slate-600 border-slate-200"
                        : req.status === "ditolak"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : req.status === "diterima_didistribusikan"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {req.status === "ready_putaway"
                    ? "Siap Putaway"
                    : req.status === "disetujui"
                      ? "Disetujui"
                      : req.status === "digenerate"
                        ? "Digenerate"
                        : req.status === "ditolak"
                          ? "Ditolak"
                          : req.status === "diterima_didistribusikan"
                            ? "Diterima & Didistribusikan"
                            : req.status}
                </span>
              </div>
            </div>
          );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 font-medium shadow-sm">
          {activeTab === "all"
            ? "Belum ada data inbound."
            : "Belum ada riwayat inbound."}
        </div>
      )}

      {toast && (
        <div
          className={[
            "fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-medium shadow-2xl backdrop-blur-sm animate-in slide-in-from-right-full fade-in duration-300 max-w-sm",
            toast.type === "success"
              ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-800"
              : "border-rose-200/80 bg-rose-50/95 text-rose-800",
          ].join(" ")}
        >
          <div
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              toast.type === "success" ? "bg-emerald-100" : "bg-rose-100",
            ].join(" ")}
          >
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
            className={[
              "ml-2 shrink-0 rounded-full p-1 transition-colors",
              toast.type === "success"
                ? "text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600"
                : "text-rose-400 hover:bg-rose-100 hover:text-rose-600",
            ].join(" ")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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