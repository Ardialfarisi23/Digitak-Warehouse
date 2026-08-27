"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Clock, AlertTriangle, Layers, FileText, ArrowLeft, ArrowDownLeft } from "lucide-react";
import { useApi } from "@/lib/api";

// Interface disesuaikan dengan struktur data proyek
interface GudangTujuan {
  id: string;
  nama_gudang: string;
}

interface InboundRequest {
  id: string;
  nomor_surat_jalan: string;
  pengirim_or_vendor: string;
  gudang_tujuan?: GudangTujuan;
  kategori_approval?: string;
  status: string;
  total_tipe?: number;
  total_unit?: number;
  ada_fisik_rusak?: boolean;
  selisih_po?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

<<<<<<< Updated upstream
export default function SupervisorApprovalPage() {
  const router = useRouter();
  // FIX: sebelumnya halaman ini pakai fetch() polos, nggak nyertain token
  // auth sama sekali -> endpoint yang dilindungi authenticate middleware
  // (GET /api/surat-jalan/inbound) selalu balikin 401. useApi() otomatis
  // nempelin header Authorization: Bearer <token>, sama kayak semua
  // halaman Staf yang udah connect ke API.
  const { get, put } = useApi();

  const [requests, setRequests] = useState<InboundRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch Data dari API
=======
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  };

>>>>>>> Stashed changes
  const fetchInboundList = async () => {
    setLoading(true);
    try {
<<<<<<< Updated upstream
      const res = await get(`${API_BASE_URL}/api/surat-jalan/inbound`);
      const data = await res.json();

      const rawList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.result) ? data.result : [];

      // API asli balikin field "surat_jalan_id" (angka), bukan "id".
      // Tanpa normalisasi ini, key React & pemanggilan approve/detail bakal
      // dapet id undefined.
      const normalized: InboundRequest[] = rawList.map((r: any) => ({
        ...r,
        id: String(r.surat_jalan_id ?? r.id),
      }));

      setRequests(normalized);
    } catch (error) {
      console.error("Gagal mengambil data inbound:", error);
      setRequests([]);
=======
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await get(`${baseUrl}/api/surat-jalan/inbound`);
      if (!response.ok) {
        throw new Error("Gagal mengambil daftar inbound.");
      }
      const json = await response.json();
      const data = json?.data ?? json ?? [];
      const pendingData = Array.isArray(data)
        ? data.filter((item: any) => item.status === "menunggu_verifikasi")
        : [];
      setRequests(pendingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.");
>>>>>>> Stashed changes
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboundList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

<<<<<<< Updated upstream
  // Filter Data
=======
  const metrics = useMemo(() => {
    const total = requests.length;
    const rusak = requests.filter((r) => r.kategori_approval === "inbound_rusak").length;
    const selisih = requests.filter((r) => r.kategori_approval === "inbound_selisih").length;
    const diLuarPo = requests.filter((r) => r.kategori_approval === "inbound_di_luar_po").length;
    return { total, rusak, selisih, diLuarPo };
  }, [requests]);

>>>>>>> Stashed changes
  const filteredRequests = useMemo(() => {
    if (!Array.isArray(requests)) return [];

    return requests.filter((r) => {
      // Surat Jalan Inbound yang staf submit statusnya "menunggu_verifikasi"
      // (di-set di createStaffInbound() backend) — "draft_diajukan" itu
      // status default buat Outbound, bukan Inbound.
      const isPending = r.status === "menunggu_verifikasi";

      const matchSearch =
        !query.trim() ||
        (r.nomor_surat_jalan || "").toLowerCase().includes(query.toLowerCase()) ||
        (r.pengirim_or_vendor || "").toLowerCase().includes(query.toLowerCase()) ||
        (r.gudang_tujuan?.nama_gudang || "").toLowerCase().includes(query.toLowerCase());
<<<<<<< Updated upstream

      const matchCat = selectedCategory === "all" || (r.kategori_approval || "inbound_di_luar_po") === selectedCategory;

      return isPending && matchSearch && matchCat;
    });
  }, [requests, query, selectedCategory]);

  // Ringkasan Statistik Atas
  const stats = useMemo(() => {
    const totalAntrean = filteredRequests.length;
    const fisikRusak = filteredRequests.filter((r) => r.ada_fisik_rusak).length;
    const selisihPo = filteredRequests.filter((r) => r.selisih_po).length;
    const diLuarPo = filteredRequests.filter((r) => (r.kategori_approval || "inbound_di_luar_po") === "inbound_di_luar_po").length;

    return { totalAntrean, fisikRusak, selisihPo, diLuarPo };
  }, [filteredRequests]);

  // Handler Approve
  const handleApprove = async (id: string) => {
    try {
      // Endpoint asli di surat-jalan.routes.js: PUT /api/surat-jalan/:id/approve-inbound
      const res = await put(`${API_BASE_URL}/api/surat-jalan/${id}/approve-inbound`, {});

      if (res.ok) {
        setRequests((prev) => (Array.isArray(prev) ? prev.filter((item) => item.id !== id) : []));
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || "Gagal menyetujui dokumen.");
      }
    } catch (error) {
      console.error("Error approving request:", error);
=======
      const matchCat = selectedCategory === "all" || (r.kategori_approval || "inbound_di_luar_po") === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [requests, query, selectedCategory]);

  const handleApprove = async (id: number) => {
    setActionLoading(String(id));
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await post(`${baseUrl}/api/surat-jalan/${id}/approve-inbound`, { itemAdjustments: [] });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal menyetujui inbound.");
      }
      setRequests((prev) => prev.filter((item) => item.surat_jalan_id !== id));
      setSelectedItem(null);
      showToast("Penerimaan barang berhasil disetujui & stok diperbarui.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menyetujui inbound.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      showToast("Harap sertakan alasan penolakan.", "error");
      return;
    }
    setActionLoading(String(id));
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await post(`${baseUrl}/api/surat-jalan/${id}/reject-inbound`, { catatan: rejectReason });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal menolak inbound.");
      }
      setRequests((prev) => prev.filter((item) => item.surat_jalan_id !== id));
      setSelectedItem(null);
      setRejectReason("");
      setShowRejectBox(false);
      showToast("Penerimaan barang berhasil ditolak.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menolak inbound.", "error");
    } finally {
      setActionLoading(null);
>>>>>>> Stashed changes
    }
  };

  const openDetail = (item: any) => {
    setSelectedItem(item);
    setShowRejectBox(false);
    setRejectReason("");
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setShowRejectBox(false);
    setRejectReason("");
  };

  return (
<<<<<<< Updated upstream
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-[#FAFAFA] min-h-screen text-slate-800">
      {/* Header & Navigasi Kembali */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm text-slate-600 cursor-pointer" title="Kembali ke halaman sebelumnya">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-600 uppercase">
            <span>SUPERVISOR PORTAL</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 font-normal capitalize">Validasi Penerimaan</span>
=======
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/supervisor/approval" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Supervisor Portal</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500">Validasi Penerimaan</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Approval Penerimaan Barang (Inbound)</h1>
>>>>>>> Stashed changes
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Approval Penerimaan Barang (Inbound)</h1>
        </div>
      </div>

<<<<<<< Updated upstream
      {/* Ringkasan Kartu Stat Atas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Antrean */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">TOTAL ANTREAN</p>
            <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.totalAntrean}</h3>
            <p className="text-xs text-slate-400">Barang masuk antrean</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Ada Fisik Rusak */}
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

        {/* Selisih Qty / PO */}
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

        {/* Di Luar PO */}
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

      {/* Control Bar: Search & Filter */}
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
=======
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl border px-4 py-3 shadow-lg ${
          toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {toast.type === "success" ? "✓" : "✕"} {toast.message}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Antrean", val: metrics.total, icon: Clock, color: "text-slate-500" },
          { label: "Ada Fisik Rusak", val: metrics.rusak, icon: ShieldAlert, color: "text-rose-500", bg: "border-rose-100 bg-rose-50/30" },
          { label: "Selisih Qty / PO", val: metrics.selisih, icon: Layers, color: "text-amber-500", bg: "border-amber-100 bg-amber-50/30" },
          { label: "Di Luar PO", val: metrics.diLuarPo, icon: FileText, color: "text-slate-500" },
        ].map((stat, i) => (
          <div key={i} className={`rounded-2xl border ${stat.bg || "border-slate-200/80 bg-white"} p-4 shadow-sm`}>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>{stat.label}</span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{stat.val}</div>
          </div>
        ))}
      </div>

      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari No. SJ, Vendor..." className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500" />
>>>>>>> Stashed changes
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm font-medium text-slate-700">
          <option value="all">Semua Kategori</option>
          <option value="inbound_rusak">Fisik Cacat/Rusak</option>
          <option value="inbound_selisih">Selisih Jumlah</option>
          <option value="inbound_di_luar_po">Di Luar PO</option>
        </select>
      </div>

<<<<<<< Updated upstream
      {/* List Antrean Inbound */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 font-medium">Memuat data antrean...</div>
      ) : filteredRequests.length > 0 ? (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div key={req.id} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between md:items-center gap-4">
              {/* Detail Informasi */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 text-lg">{req.nomor_surat_jalan}</span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">Pengirim: {req.pengirim_or_vendor || "Vendor / Internal"}</span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Di Luar PO / Unscheduled
                  </span>
=======
      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <p className="mt-2 text-sm text-slate-500">Memuat data inbound...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">Tidak ada penerimaan barang ditemukan</p>
            <p className="text-xs text-slate-400">Ganti kata kunci atau pilih filter lain.</p>
          </div>
        ) : (
          filteredRequests.map((r) => {
            const catConfig = CATEGORY_CONFIG_INBOUND[r.kategori_approval || "inbound_di_luar_po"] || CATEGORY_CONFIG_INBOUND["inbound_di_luar_po"];
            const BadgeIcon = catConfig.icon;
            return (
              <div key={r.surat_jalan_id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">{r.nomor_surat_jalan}</span>
                      <span className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-medium">
                        Pengirim: {r.pengirim_or_vendor || "Vendor / Internal"}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${catConfig.badgeClass}`}>
                        <BadgeIcon size={12} />{catConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <ArrowDownLeft size={16} className="text-emerald-600" />
                      <span>Gudang Tujuan: {r.gudang_tujuan?.nama_gudang || "Gudang Utama"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Total Masuk ({r.items?.length || 0} tipe):</span>
                      <span className="truncate max-w-md">
                        {r.items?.map((i: any) => `${i.nama || "Perangkat"} (${i.qty} unit)`).join(", ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    <Button variant="outline" onClick={() => openDetail(r)} className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-4">
                      Review Detail
                    </Button>
                    <Button onClick={() => handleApprove(r.surat_jalan_id)} disabled={actionLoading === String(r.surat_jalan_id)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4">
                      {actionLoading === String(r.surat_jalan_id) ? "Memproses..." : "Setujui & Tambah Stok"}
                    </Button>
                  </div>
>>>>>>> Stashed changes
                </div>

<<<<<<< Updated upstream
                <div className="flex items-center gap-1.5 text-slate-700 text-sm font-medium">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>
                    Gudang Tujuan: <strong className="text-slate-900">{req.gudang_tujuan?.nama_gudang || "Gudang Rancamanyar"}</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Total Masuk ({req.total_tipe || 1} tipe): <span className="text-slate-600 font-medium">Perangkat ({req.total_unit || 8} unit)</span>
                </p>
              </div>

              {/* Tombol Aksi */}
              <div className="flex items-center gap-3 self-end md:self-center">
                <button
                  onClick={() => router.push(`/dashboard/supervisor/approval/inbound/${req.id}`)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80 rounded-xl text-xs font-semibold transition-colors"
                >
                  Review Detail
                </button>
                <button onClick={() => handleApprove(req.id)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-emerald-600/20">
                  Setujui & Tambah Stok
                </button>
              </div>
            </div>
          ))}
=======
      {/* ============================================================ */}
      {/* Modal Detail Inbound — Berbentuk Surat (seragam dgn Outbound) */}
      {/* ============================================================ */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col">

            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bukti Penerimaan Barang</h3>
                <p className="text-xs text-slate-500">{selectedItem.nomor_surat_jalan}</p>
              </div>
              <button onClick={closeDetail} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto p-6">

              {/* Dokumen Surat */}
              <div
                id="inbound-receipt-document"
                className="mx-auto max-w-3xl rounded-2xl border border-[#C7E8D9] bg-white p-10 print:rounded-none print:border-0 print:p-0"
              >
                {/* Kop Surat */}
                <div className="mb-8 flex items-start justify-between border-b-2 border-emerald-600 pb-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo digitak grdasi.png"
                    alt="Digitak Studio — PT Metanouva Informatika"
                    className="h-16 w-auto object-contain"
                  />
                  <div className="flex flex-col items-end">
                    <h2 className="text-3xl font-bold tracking-wide text-gray-900">BUKTI PENERIMAAN BARANG</h2>
                    <p className="mt-1 text-xs text-gray-500">Inbound Receipt — Digitak Studio</p>
                    <div className="mt-2 text-right">
                      <p className="text-xs font-bold text-emerald-700">PT Metanouva Informatika</p>
                      <p className="text-[10px] text-gray-400">Digitak Studio</p>
                    </div>
                  </div>
                </div>

                {/* Info Grid — 2 kolom */}
                <div className="mb-8 grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
                  <div className="space-y-3">
                    <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                      <span className="text-gray-500">No. Dokumen</span>
                      <span className="text-gray-500">:</span>
                      <span className="font-semibold text-gray-900">{selectedItem.nomor_surat_jalan || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                      <span className="text-gray-500">Pengirim / Vendor</span>
                      <span className="text-gray-500">:</span>
                      <span className="font-semibold text-gray-900">{selectedItem.pengirim_or_vendor || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                      <span className="text-gray-500">Gudang Tujuan</span>
                      <span className="text-gray-500">:</span>
                      <span className="font-semibold text-gray-900">{selectedItem.gudang_tujuan?.nama_gudang || "-"}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                      <span className="text-gray-500">Tanggal Terima</span>
                      <span className="text-gray-500">:</span>
                      <span className="font-semibold text-gray-900">{formatDate(selectedItem.created_at)}</span>
                    </div>
                    <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                      <span className="text-gray-500">Kategori</span>
                      <span className="text-gray-500">:</span>
                      <span className="font-semibold text-gray-900">
                        {CATEGORY_CONFIG_INBOUND[selectedItem.kategori_approval || "inbound_di_luar_po"]?.label || "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[140px_10px_1fr] items-start leading-snug">
                      <span className="text-gray-500">Diterima Oleh</span>
                      <span className="text-gray-500">:</span>
                      <span className="font-semibold text-gray-900">{selectedItem.creator?.nama || selectedItem.penerima?.nama || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Catatan Penerimaan */}
                {selectedItem.catatan && (
                  <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex gap-3">
                    <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900">
                      <span className="font-semibold block mb-0.5">Catatan Penerimaan Fisik:</span>
                      {selectedItem.catatan}
                    </div>
                  </div>
                )}

                {/* Tabel Rincian Barang */}
                <table className="mb-10 w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-emerald-50">
                      <th className="border border-[#C7E8D9] px-3 py-2 text-left font-semibold text-emerald-900">No</th>
                      <th className="border border-[#C7E8D9] px-3 py-2 text-left font-semibold text-emerald-900">Nama Perangkat</th>
                      <th className="border border-[#C7E8D9] px-3 py-2 text-left font-semibold text-emerald-900">Serial Number</th>
                      <th className="border border-[#C7E8D9] px-3 py-2 text-center font-semibold text-emerald-900">QTY Terima</th>
                      <th className="border border-[#C7E8D9] px-3 py-2 text-center font-semibold text-emerald-900">Kondisi Fisik</th>
                      <th className="border border-[#C7E8D9] px-3 py-2 text-center font-semibold text-emerald-900">Status Masuk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItem.items && selectedItem.items.length > 0 ? (
                      selectedItem.items.map((it: any, idx: number) => {
                        const isDamaged = it.kondisi && it.kondisi.toLowerCase().includes("rusak");
                        return (
                          <tr key={idx} className="even:bg-gray-50">
                            <td className="border border-gray-200 px-3 py-2.5 text-gray-600">{idx + 1}</td>
                            <td className="border border-gray-200 px-3 py-2.5 font-medium text-gray-900">
                              {it.nama || it.barang?.nama_barang || "Item " + (idx + 1)}
                            </td>
                            <td className="border border-gray-200 px-3 py-2.5 font-mono text-xs text-gray-500">{it.serial_number || "-"}</td>
                            <td className="border border-gray-200 px-3 py-2.5 text-center font-bold text-gray-900">{it.qty}</td>
                            <td className="border border-gray-200 px-3 py-2.5 text-center capitalize text-gray-700">{it.kondisi || "Bagus"}</td>
                            <td className="border border-gray-200 px-3 py-2.5 text-center">
                              {isDamaged ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium text-xs">
                                  <XCircle size={11} /> Perlu Karantina
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium text-xs">
                                  <CheckCircle2 size={11} /> Siap Masuk Stok
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="border border-gray-200 px-3 py-6 text-center text-gray-400">Tidak ada rincian barang.</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Blok Tanda Tangan */}
                <div className="mb-8 grid grid-cols-3 gap-6 text-center text-sm">
                  <div>
                    <p className="mb-16 font-medium text-gray-700">Pengirim / Vendor</p>
                    <div className="border-t border-gray-400 pt-1">
                      <p className="font-semibold text-gray-900">{selectedItem.pengirim_or_vendor || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-16 font-medium text-gray-700">Penerima Barang</p>
                    <div className="border-t border-gray-400 pt-1">
                      <p className="font-semibold text-gray-900">{selectedItem.creator?.nama || selectedItem.penerima?.nama || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-16 font-medium text-gray-700">Supervisor</p>
                    <div className="border-t border-gray-400 pt-1">
                      <p className="font-semibold text-gray-900">-</p>
                    </div>
                  </div>
                </div>

                {/* Footer Dokumen */}
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-[10px] text-gray-400">
                  <span>{selectedItem.nomor_surat_jalan} | {formatDate(selectedItem.created_at)}</span>
                  <span>Sistem Manajemen Gudang — Digitak Studio</span>
                </div>
              </div>

              {/* Form Penolakan — di luar area surat */}
              {showRejectBox && (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-3 print:hidden">
                  <label className="text-xs font-bold text-rose-900 block">
                    Alasan Penolakan / Permintaan Klarifikasi Inbound
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_REASONS_INBOUND.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRejectReason(preset)}
                        className="text-[11px] bg-white border border-rose-200 text-rose-800 rounded-lg px-2.5 py-1 hover:bg-rose-100 text-left transition"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ketik catatan tambahan mengenai kendala penerimaan..."
                    className="w-full rounded-xl border border-rose-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 print:hidden">
              {/* Kiri: Approve / Reject */}
              <div className="flex items-center gap-2">
                {!showRejectBox ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
                    >
                      <XCircle size={14} /> Tolak / Klarifikasi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedItem.surat_jalan_id)}
                      disabled={actionLoading === String(selectedItem.surat_jalan_id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      {actionLoading === String(selectedItem.surat_jalan_id) ? "Memproses..." : "Setujui & Tambah Stok"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectBox(false)}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedItem.surat_jalan_id)}
                      disabled={actionLoading === String(selectedItem.surat_jalan_id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                    >
                      {actionLoading === String(selectedItem.surat_jalan_id) ? "Memproses..." : "Kirim Penolakan"}
                    </button>
                  </>
                )}
              </div>

              {/* Kanan: Cetak & Tutup */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-600 hover:text-white"
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
                  onClick={closeDetail}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
>>>>>>> Stashed changes
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 font-medium shadow-sm">Tidak ada pengajuan inbound yang menunggu persetujuan.</div>
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
