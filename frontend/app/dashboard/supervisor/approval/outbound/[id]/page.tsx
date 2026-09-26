"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import Link from "next/link";
import { ExternalLink, Loader2, Search, AlertCircle, Eye, X } from "lucide-react";
import { DetailSuratJalanDocument, type DetailSuratJalanData } from "@/components/surat-jalan/DetailSuratJalanDocument";
import { KondisiBadge } from "@/components/common/KondisiBadge";
import { getItemFotoUrls } from "@/lib/surat-jalan-item-foto";

const STATUS_META: Record<string, { label: string; tone: string }> = {
  draft_diajukan: { label: "Draft Diajukan", tone: "bg-slate-100 text-slate-700" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", tone: "bg-amber-100 text-amber-700" },
  ready_putaway: { label: "Siap Putaway", tone: "bg-blue-100 text-blue-700" },
  disetujui: { label: "Disetujui", tone: "bg-emerald-100 text-emerald-700" },
  digenerate: { label: "Digenerate", tone: "bg-blue-100 text-blue-700" },
  diterima_didistribusikan: { label: "Diterima / Didistribusikan", tone: "bg-emerald-100 text-emerald-700" },
  sedang_dikirim: { label: "Sedang Dikirim", tone: "bg-amber-100 text-amber-700" },
  ditolak: { label: "Ditolak", tone: "bg-rose-100 text-rose-700" },
};

interface WarehouseStockItem {
  snapshot_id: string;
  barang_id: number;
  kode_perangkat: string;
  nama_barang: string;
  kategori: string;
  satuan: string;
  kondisi: string;
  qty: number;
  zona_id: number | null;
  kode_zona: string;
  nama_zona: string;
}

interface OutboundRequest {
  nomor_surat_jalan: string;
  status: string;
  tipe_pengirim: string;
  gudang_asal?: { gudang_id: number; nama_gudang: string };
  gudang_asal_id?: number;
  gudang_tujuan?: { nama_gudang: string };
  tujuan_tipe: string;
  titik_lapangan?: { nama_lokasi: string };
  alamat_lapangan?: string | null;
  kendaraan?: { jenis_kendaraan: string; no_polisi: string };
  personil_pengantar?: { nama: string };
  pengirim_eksternal_nama?: string;
  foto_bukti?: string;
  surat_jalan_url?: string;
  lampiran_url?: string;
  foto_outbound?: string;
  photos?: string[];
  boq_id?: number;
  boq?: { boq_number?: string; tiket?: { kode_tiket?: string } };
  project?: { nama_project?: string; area?: string };
  items?: Array<{
    item_id: number;
    barang?: { nama_barang?: string };
    barang_id?: number;
    serial_number?: string;
    qty: number;
    kondisi?: string;
    foto_url?: string;
    catatan?: string;
  }>;
}

export default function SupervisorApprovalOutboundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { get, put } = useApi();
  const [request, setRequest] = useState<OutboundRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocItem, setSelectedDocItem] = useState<any>(null);

  const openDocModal = (item: any) => {
    setSelectedDocItem(item);
    setIsDocModalOpen(true);
  };

  const closeDocModal = () => {
    setIsDocModalOpen(false);
    setSelectedDocItem(null);
  };

  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStockItem[]>([]);
  const [stockSearch, setStockSearch] = useState("");

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  const resolveUrl = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const outboundAttachmentUrl = resolveUrl(
    request?.foto_bukti ||
      request?.surat_jalan_url ||
      request?.lampiran_url ||
      request?.foto_outbound ||
      (Array.isArray(request?.photos) ? request.photos[0] : null),
  );

  const isOutboundImage = /\.(jpg|jpeg|png|webp)$/i.test(outboundAttachmentUrl || "");
  const isOutboundPdf = /\.pdf$/i.test(outboundAttachmentUrl || "");

  const gudangAsalId = useMemo(() => {
    const raw =
      request?.gudang_asal?.gudang_id ||
      request?.gudang_asal_id ||
      (request as any)?.gudang_id ||
      (request as any)?.gudangAsal?.id ||
      (request as any)?.warehouse_id;
    const id = raw != null ? Number(raw) : NaN;
    return Number.isNaN(id) ? null : id;
  }, [request]);

  const gudangAsalName = request?.gudang_asal?.nama_gudang || "Gudang Utama";

  const filteredStock = useMemo(() => {
    if (!stockSearch.trim()) return warehouseStock;
    const query = stockSearch.toLowerCase();
    return warehouseStock.filter((item) => {
      const kode = (item.kode_perangkat || "").toLowerCase();
      const nama = (item.nama_barang || "").toLowerCase();
      const zona = (item.kode_zona || "").toLowerCase();
      return kode.includes(query) || nama.includes(query) || zona.includes(query);
    });
  }, [warehouseStock, stockSearch]);

  const stockByBarang = useMemo(() => {
    const map = new Map<number, WarehouseStockItem & { totalQty: number }>();
    filteredStock.forEach((item) => {
      const existing = map.get(item.barang_id);
      if (existing) {
        existing.qty += item.qty;
        existing.zona_id = existing.zona_id ?? item.zona_id;
        existing.kode_zona = existing.kode_zona || item.kode_zona;
        existing.nama_zona = existing.nama_zona || item.nama_zona;
      } else {
        map.set(item.barang_id, { ...item, totalQty: item.qty });
      }
    });
    return Array.from(map.values());
  }, [filteredStock]);

  type StockSufficiencyStatus = "Cukup" | "Kurang" | "Tidak Tersedia";

  interface StockStatusInfo {
    status: StockSufficiencyStatus;
    availableQty: number;
    otherConditions: string;
  }

  const stockStatusByItemId = useMemo(() => {
    const statusMap: Record<number, StockStatusInfo> = {};
    const items = request?.items ?? [];
    const stock = filteredStock;

    for (const item of items) {
      const itemId = Number(item.item_id);
      const barangId = Number(item.barang_id);
      const requiredKondisi = (item.kondisi || "baik").toLowerCase();
      const requiredQty = Number(item.qty || 0);

      const matching = stock.filter(
        (s) => Number(s.barang_id) === barangId && String(s.kondisi).toLowerCase() === requiredKondisi
      );
      const availableQty = matching.reduce((sum, s) => sum + Number(s.qty || 0), 0);

      const others = stock.filter(
        (s) => Number(s.barang_id) === barangId && String(s.kondisi).toLowerCase() !== requiredKondisi && Number(s.qty || 0) > 0
      );
      const otherConditions = others
        .map((s) => `${s.nama_zona || s.kode_zona}: ${s.qty}`)
        .join(", ");

      let status: StockSufficiencyStatus;
      if (availableQty >= requiredQty) {
        status = "Cukup";
      } else if (availableQty > 0) {
        status = "Kurang";
      } else {
        status = "Tidak Tersedia";
      }

      statusMap[itemId] = { status, availableQty, otherConditions };
    }

    return statusMap;
  }, [request, filteredStock]);

  useEffect(() => {
    let mounted = true;

    const loadDetail = async () => {
      setLoading(true);
      try {
        const resp = await get(`${apiBase}/api/surat-jalan/${params.id}`);
        const json = await resp.json();
        if (!mounted) return;
        setRequest(json?.data || null);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDetail();
    return () => {
      mounted = false;
    };
  }, [get, apiBase, params.id]);

    useEffect(() => {
      let mounted = true;

      const loadWarehouseStock = async () => {
        const warehouseId = gudangAsalId;

        if (!warehouseId) {
          setWarehouseStock([]);
          setStockLoading(false);
          setStockError(null);
          return;
        }

        setStockLoading(true);
        setStockError(null);

        try {
          const layoutResp = await get(`${apiBase}/api/warehouses/${warehouseId}/layout`);
          const layoutJson = await layoutResp.json();

          if (!layoutResp.ok) {
            throw new Error(layoutJson?.message || "Gagal mengambil data gudang.");
          }

          const zonas = Array.isArray(layoutJson?.data?.zonas) ? layoutJson.data.zonas : [];

          if (!Array.isArray(zonas) || zonas.length === 0) {
            setWarehouseStock([]);
            setStockLoading(false);
            return;
          }

          const stockPromises = zonas.map((zone: any) =>
            get(`${apiBase}/api/warehouses/${warehouseId}/zona/${zone.zona_id}/stock-snapshot`)
              .then(async (res) => {
                const json = await res.json();
                if (!res.ok) {
                  throw new Error(json?.message || `Gagal mengambil stok zona ${zone.nama_zona}`);
                }
                const rows = Array.isArray(json?.data?.data) ? json.data.data : Array.isArray(json?.data) ? json.data : [];
                return rows;
              })
              .catch(() => [])
          );

          const results = await Promise.all(stockPromises);

          if (!mounted) return;

          const allStock: WarehouseStockItem[] = [];
          results.forEach((rows) => {
            if (Array.isArray(rows)) {
              rows.forEach((item: any) => {
                allStock.push({
                  snapshot_id: item.snapshot_id ?? item.id ?? item.snapshotId,
                  barang_id: item.barang_id ?? item.barangId ?? item.id_barang,
                  kode_perangkat: item.kode_perangkat ?? item.barang?.kode_perangkat ?? item.kode_barang ?? item.sku ?? "-",
                  nama_barang: item.nama_barang ?? item.barang?.nama_barang ?? item.nama_barang ?? "-",
                  kategori: item.kategori ?? item.barang?.kategori ?? item.category ?? "-",
                  qty: Number(item.qty ?? item.jumlah ?? item.stok ?? 0),
                  kondisi: item.kondisi ?? item.condition ?? "baik",
                  zona_id: item.zona_id ?? item.zonaId ?? null,
                  kode_zona: item.kode_zona ?? item.zona?.kode_zona ?? item.zona_kode ?? "-",
                  nama_zona: item.nama_zona ?? item.zona?.nama_zona ?? item.nama_zona ?? "-",
                  satuan: item.satuan ?? item.satuan?.kode_satuan ?? item.uom ?? "-",
                });
              });
            }
          });

          setWarehouseStock(allStock);
        } catch (err) {
          if (!mounted) return;
          const message = err instanceof Error ? err.message : "Gagal memuat data stok gudang.";
          setStockError(message);
          setWarehouseStock([]);
        } finally {
          if (mounted) setStockLoading(false);
        }
      };

      loadWarehouseStock();
      return () => {
        mounted = false;
      };
    }, [get, apiBase, gudangAsalId]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const resp = await put(`${apiBase}/api/surat-jalan/${params.id}/approve-outbound`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.message || "Gagal menyetujui outbound.");
      }
      setToast({ message: "Surat Jalan berhasil disetujui & stok berhasil direservasi.", type: "success" });
      setTimeout(() => router.push("/dashboard/supervisor/approval"), 1500);
    } catch (error) {
      setToast({ message: (error as Error).message || "Gagal menyetujui outbound.", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setToast({ message: "Harap berikan alasan penolakan/klarifikasi.", type: "error" });
      return;
    }
    setActionLoading(true);
    try {
      const resp = await put(`${apiBase}/api/surat-jalan/${params.id}/reject-outbound`, {
        catatan: rejectReason,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.message || "Gagal menolak outbound.");
      }
      setToast({ message: "Pengajuan outbound berhasil ditolak.", type: "success" });
      setTimeout(() => router.push("/dashboard/supervisor/approval"), 1500);
    } catch (error) {
      setToast({ message: (error as Error).message || "Gagal menolak outbound.", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDistributed = async () => {
    setActionLoading(true);
    try {
      const resp = await put(`${apiBase}/api/surat-jalan/${params.id}/confirm-distributed`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.message || "Gagal menandai diterima/didistribusikan.");
      }
      setToast({ message: "Surat Jalan berhasil ditandai diterima/didistribusikan.", type: "success" });
      setTimeout(() => router.push("/dashboard/supervisor/approval"), 1500);
    } catch (error) {
      setToast({ message: (error as Error).message || "Gagal menandai diterima/didistribusikan.", type: "error" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-8 py-6">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#E8632C]" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="px-8 py-6">
        <p className="text-slate-500">Detail pengajuan tidak ditemukan.</p>
        <Button onClick={() => router.back()} className="mt-4 rounded-xl bg-[#E8632C] px-4 py-2 text-sm text-white">
          Kembali
        </Button>
      </div>
    );
  }

  const statusMeta = STATUS_META[request.status] ?? { label: request.status || "-", tone: "bg-slate-100 text-slate-700" };

  const tujuanLabel =
    request.tujuan_tipe === "lapangan"
      ? request.alamat_lapangan || "-"
      : request.tujuan_tipe === "gudang"
        ? request.gudang_tujuan?.nama_gudang || "-"
        : request.gudang_tujuan?.nama_gudang || "-";

  const tujuanBadge =
    request.tujuan_tipe === "lapangan" ? (
      <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Lapangan</span>
    ) : request.tujuan_tipe === "gudang" ? (
      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Gudang</span>
    ) : null;

  const pengirimLabel =
    request.tipe_pengirim === "internal"
      ? request.gudang_asal?.nama_gudang || "-"
      : request.tipe_pengirim === "external"
        ? request.pengirim_eksternal_nama || "-"
        : request.gudang_asal?.nama_gudang || "-";

  const pengirimBadge =
    request.tipe_pengirim === "internal" ? (
      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Internal</span>
    ) : request.tipe_pengirim === "external" ? (
      <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">External</span>
    ) : null;

  return (
    <div className="min-h-screen px-8 py-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">
            Detail Form Persetujuan Outbound
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{request.nomor_surat_jalan}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Detail permintaan outbound dan status saat ini.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusMeta.tone}`}>
            {statusMeta.label}
          </span>
          <Button variant="outline" onClick={() => router.back()} className="rounded-xl px-4 py-2 text-sm font-semibold">
            Kembali
          </Button>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-xl border px-4 py-3 shadow-lg ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {toast.type === "success" ? "✓" : "✕"}
            {toast.message}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full">
        {/* PANEL KIRI: DETAIL & ITEM SURAT JALAN OUTBOUND */}
        <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <DetailSuratJalanDocument
            data={request as DetailSuratJalanData}
            variant="full"
            hideTujuanBadge
            stockStatusByItemId={stockStatusByItemId}
            renderItemAction={(item) => (
              <button
                type="button"
                onClick={() => openDocModal(item)}
                className="p-1 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Dokumentasi Barang"
              >
                <Eye size={16} />
              </button>
            )}
          />
        </div>

        {/* PANEL KANAN: CEK DATA STOK BARANG GUDANG */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Data Stok Barang di Gudang</h2>
              <p className="text-xs text-slate-500">Gudang: {gudangAsalName}</p>
            </div>
          </div>

          {/* Fitur Search Cepat Stok Gudang */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama barang / SKU / zona..."
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Tabel / List Stok Barang Gudang */}
          {stockLoading ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center">
              <Loader2 size={26} className="animate-spin text-slate-400" />
              <p className="mt-2 text-xs text-slate-500">Memuat data stok gudang...</p>
            </div>
          ) : stockError ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <AlertCircle size={32} className="text-red-500 mb-2" />
              <p className="text-xs text-slate-600">{stockError}</p>
            </div>
          ) : !gudangAsalId ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <p className="text-xs text-slate-500">Pengajuan ini tidak memiliki gudang asal internal.</p>
            </div>
          ) : stockByBarang.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <p className="text-xs text-slate-500">Tidak ada stok barang di gudang ini.</p>
            </div>
          ) : (
             <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
               {stockByBarang.map((item) => (
                 <div key={item.barang_id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                   <div>
                     <p className="text-xs font-bold text-slate-800">{item.nama_barang}</p>
                     <p className="text-[10px] text-slate-500">SKU: {item.kode_perangkat} {item.kode_zona !== "-" ? `· Zona ${item.kode_zona}` : ""}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-xs font-bold text-slate-900">{Number(item.qty || 0).toLocaleString("id-ID")}</p>
                     <p className="text-[10px] text-slate-500">{item.satuan}</p>
                     <div className="mt-1"><KondisiBadge value={item.kondisi} /></div>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>

      {/* Aksi Supervisor - moved below both panels */}
      <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Aksi Supervisor</p>

        {request.status === "draft_diajukan" ? (
          !showRejectBox ? (
            <div className="space-y-3">
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {actionLoading ? "Memproses..." : "Setujui (Reservasi Stok)"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectBox(true)}
                className="w-full rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 px-4 py-3 text-sm font-semibold"
              >
                Tolak / Minta Klarifikasi
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan/klarifikasi..."
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-rose-500 focus:outline-none"
              />
              <Button
                onClick={handleReject}
                disabled={actionLoading}
                className="w-full rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                {actionLoading ? "Memproses..." : "Kirim Penolakan"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowRejectBox(false)}
                className="w-full rounded-xl text-sm font-semibold text-slate-600"
              >
                Batal
              </Button>
            </div>
          )
        ) : request.status === "digenerate" ? (
          <Button
            onClick={handleConfirmDistributed}
            disabled={actionLoading}
            className="w-full rounded-xl bg-[#047857] px-4 py-3 text-sm font-semibold text-white hover:bg-[#065f46]"
          >
            {actionLoading ? "Memproses..." : "Tandai Diterima/Didistribusikan"}
          </Button>
        ) : (
          <p className="text-xs text-slate-500">
            Tidak ada aksi yang diperlukan untuk status saat ini ({request.status}).
          </p>
        )}
      </div>

      {isDocModalOpen && selectedDocItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Dokumentasi Barang</h3>
                <p className="text-xs text-slate-500">{selectedDocItem?.barang?.nama_barang || selectedDocItem?.barang?.kode_perangkat || "Item"}</p>
              </div>
              <button type="button" onClick={closeDocModal} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Kondisi</p>
                  <p className="font-medium text-slate-900">{selectedDocItem?.kondisi || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">QTY</p>
                  <p className="font-medium text-slate-900">{selectedDocItem?.qty || 0}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-slate-500">Foto Dokumentasi</p>
                {(() => {
                  const item = selectedDocItem as any;
                  const fotoUrls = getItemFotoUrls(item);
                  if (fotoUrls.length === 0) {
                    return <p className="text-xs text-slate-400">Belum ada foto dokumentasi untuk item ini.</p>;
                  }
                  return (
                    <div className="grid grid-cols-3 gap-2">
                      {fotoUrls.map((url, idx) => (
                        <img key={idx} src={url} alt={url} className="h-24 w-full rounded-lg border border-slate-100 object-cover" />
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={closeDocModal} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                Kembali ke Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
