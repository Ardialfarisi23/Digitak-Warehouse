"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Clock,
  X,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  FileText,
  XCircle,
  Filter,
  Info,
  ArrowDownLeft,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";

const PRESET_REASONS_INBOUND = [
  "Terdapat fisik barang yang cacat/rusak tanpa Berita Acara.",
  "Jumlah fisik barang yang diterima kurang dari yang dicatat.",
  "Barang yang diterima tidak sesuai dengan Purchase Order / Surat Jalan Vendor.",
  "Foto bukti penerimaan atau Serial Number tidak terlampir.",
];

const CATEGORY_CONFIG_INBOUND: Record<
  string,
  { label: string; badgeClass: string; icon: any }
> = {
  inbound_rusak: {
    label: "Fisik Cacat/Rusak",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertTriangle,
  },
  inbound_selisih: {
    label: "Selisih Jumlah",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Layers,
  },
  inbound_di_luar_po: {
    label: "Di Luar PO / Unscheduled",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    icon: FileText,
  },
};

export default function SupervisorApprovalInboundPage() {
  const { get, post } = useApi();
  const [requests, setRequests] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modal State
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  const fetchInboundList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await get(`${baseUrl}/api/surat-jalan/inbound`);
      if (!response.ok) {
        throw new Error("Gagal mengambil daftar inbound.");
      }
      const json = await response.json();
      const data = json?.data ?? json ?? [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInboundList();
  }, [get]);

  // Ringkasan Metric Inbound
  const metrics = useMemo(() => {
    const total = requests.length;
    const rusak = requests.filter(
      (r) => r.kategori_approval === "inbound_rusak"
    ).length;
    const selisih = requests.filter(
      (r) => r.kategori_approval === "inbound_selisih"
    ).length;
    const diLuarPo = requests.filter(
      (r) => r.kategori_approval === "inbound_di_luar_po"
    ).length;
    return { total, rusak, selisih, diLuarPo };
  }, [requests]);

  // Filtered List
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        !query.trim() ||
        (r.nomor_surat_jalan || "").toLowerCase().includes(query.toLowerCase()) ||
        (r.pengirim_or_vendor || "").toLowerCase().includes(query.toLowerCase()) ||
        (r.gudang_tujuan?.nama_gudang || "").toLowerCase().includes(query.toLowerCase());

      const matchCat =
        selectedCategory === "all" ||
        (r.kategori_approval || "inbound_di_luar_po") === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [requests, query, selectedCategory]);

  const handleApprove = async (id: number) => {
    setActionLoading(String(id));
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await post(`${baseUrl}/api/surat-jalan/${id}/approve-inbound`, {
        itemAdjustments: [],
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal menyetujui inbound.");
      }
      setRequests((prev) => prev.filter((item) => item.surat_jalan_id !== id));
      setSelectedItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyetujui inbound.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      alert("Harap sertakan alasan penolakan atau catatan klarifikasi.");
      return;
    }
    setActionLoading(String(id));
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await post(`${baseUrl}/api/surat-jalan/${id}/reject-inbound`, {
        catatan: rejectReason,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal menolak inbound.");
      }
      setRequests((prev) => prev.filter((item) => item.surat_jalan_id !== id));
      setSelectedItem(null);
      setRejectReason("");
      setShowRejectBox(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menolak inbound.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/supervisor/approval"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Supervisor Portal
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500">
                Validasi Penerimaan
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Approval Penerimaan Barang (Inbound)
            </h1>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          <Button variant="outline" size="sm" onClick={fetchInboundList} className="ml-3">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Antrean</span>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics.total}
          </div>
          <p className="mt-1 text-xs text-slate-500">Barang masuk antrean</p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold uppercase tracking-wider">
            <span>Ada Fisik Rusak</span>
            <ShieldAlert size={16} className="text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-900">
            {metrics.rusak}
          </div>
          <p className="mt-1 text-xs text-rose-600/80">Butuh berita acara</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold uppercase tracking-wider">
            <span>Selisih Qty / PO</span>
            <Layers size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {metrics.selisih}
          </div>
          <p className="mt-1 text-xs text-amber-600/80">Verifikasi pengirim</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Di Luar PO</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics.diLuarPo}
          </div>
          <p className="mt-1 text-xs text-slate-500">Manual / Retur</p>
        </div>
      </div>

      {/* Control Bar: Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-3 top-2.5 text-slate-400"
            size={18}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari No. SJ, Vendor, Gudang..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Filter
              size={16}
              className="absolute left-3 top-3 text-slate-400 pointer-events-none"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-8 py-2 text-sm font-medium text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              <option value="inbound_rusak">Fisik Cacat/Rusak</option>
              <option value="inbound_selisih">Selisih Jumlah</option>
              <option value="inbound_di_luar_po">Di Luar PO</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-3 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* List Container */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <p className="mt-2 text-sm text-slate-500">Memuat data inbound...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Tidak ada penerimaan barang ditemukan
            </p>
            <p className="text-xs text-slate-400">
              Ganti kata kunci atau pilih filter lain.
            </p>
          </div>
        ) : (
          filteredRequests.map((r) => {
            const catConfig =
              CATEGORY_CONFIG_INBOUND[
                r.kategori_approval || "inbound_di_luar_po"
              ] || CATEGORY_CONFIG_INBOUND["inbound_di_luar_po"];
            const BadgeIcon = catConfig.icon;

            return (
              <div
                key={r.surat_jalan_id}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info Utama */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {r.nomor_surat_jalan}
                      </span>
                      <span className="rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-medium">
                        Pengirim: {r.pengirim_or_vendor || "Vendor / Internal"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${catConfig.badgeClass}`}
                      >
                        <BadgeIcon size={12} />
                        {catConfig.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <ArrowDownLeft size={16} className="text-emerald-600" />
                      <span>
                        Gudang Tujuan: {r.gudang_tujuan?.nama_gudang || "Gudang Utama"}
                      </span>
                    </div>

                    {/* Ringkasan Perangkat */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        Total Masuk ({r.items?.length || 0} tipe):
                      </span>
                      <span className="truncate max-w-md">
                        {r.items
                          ?.map(
                            (i: any) =>
                              `${i.nama || "Perangkat"} (${i.qty} unit)`
                          )
                          .join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedItem(r);
                        setShowRejectBox(false);
                        setRejectReason("");
                      }}
                      className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-4"
                    >
                      Review Detail
                    </Button>

                    <Button
                      onClick={() => handleApprove(r.surat_jalan_id)}
                      disabled={actionLoading === String(r.surat_jalan_id)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4"
                    >
                      {actionLoading === String(r.surat_jalan_id)
                        ? "Memproses..."
                        : "Setujui & Tambah Stok"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Review Detail Inbound */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedItem.nomor_surat_jalan}
                </h3>
                <p className="text-xs text-slate-500">
                  Pengirim: {selectedItem.pengirim_or_vendor || "-"} •
                  Tujuan: {selectedItem.gudang_tujuan?.nama_gudang || "-"}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-6">
              {selectedItem.catatan && (
                <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/60 p-4 flex gap-3">
                  <Info size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900">
                    <span className="font-semibold block mb-0.5">
                      Catatan Penerimaan Fisik:
                    </span>
                    {selectedItem.catatan}
                  </div>
                </div>
              )}

              {/* Detail Items & Kondisi */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Rincian Barang & Kondisi Fisik
                </h4>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Nama Perangkat</th>
                        <th className="px-4 py-3 text-center">Qty Terima</th>
                        <th className="px-4 py-3 text-center">Kondisi Fisik</th>
                        <th className="px-4 py-3 text-center">Status Masuk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedItem.items?.map((it: any, idx: number) => {
                        const isDamaged =
                          it.kondisi &&
                          it.kondisi.toLowerCase().includes("rusak");

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {it.nama || "Item " + (idx + 1)}
                              {it.serial_number && (
                                <span className="block text-[10px] text-slate-400 font-mono">
                                  SN: {it.serial_number}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">
                              {it.qty}
                            </td>
                            <td className="px-4 py-3 text-center capitalize">
                              {it.kondisi || "Bagus"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isDamaged ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium">
                                  <XCircle size={12} /> Perlu Karantina
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                                  <CheckCircle2 size={12} /> Siap Masuk Stok
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Form Penolakan */}
              {showRejectBox && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
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

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              {!showRejectBox ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectBox(true)}
                    className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold px-4"
                  >
                    Tolak / Minta Klarifikasi
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedItem.surat_jalan_id)}
                    disabled={
                      actionLoading === String(selectedItem.surat_jalan_id)
                    }
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5"
                  >
                    Setujui & Tambah Stok
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setShowRejectBox(false)}
                    className="rounded-xl text-xs text-slate-600"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedItem.surat_jalan_id)}
                    disabled={
                      actionLoading === String(selectedItem.surat_jalan_id)
                    }
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-5"
                  >
                    Kirim Penolakan
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
