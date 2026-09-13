"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PackagePlus, Loader2, AlertCircle, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";

type ApiSuratJalanItem = {
  item_id: number;
  barang_id: number;
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
  gudang_asal_id?: number | null;
  gudang_asal?: { nama_gudang: string; tipe?: string } | null;
  gudang_tujuan?: { nama_gudang: string } | null;
  project_id?: number | null;
  items: ApiSuratJalanItem[];
  tujuan_tipe?: string | null;
  titik_lapangan?: { nama_lokasi?: string } | null;
  tipe_pengirim?: string | null;
  pengirim_eksternal_nama?: string | null;
};

type ApiZona = {
  zona_id: number;
  gudang_id: number;
  kode_zona: string;
  nama_zona?: string | null;
  tipe_zona?: string | null;
};

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  data: ApiSuratJalan | null;
  zonas: ApiZona[];
  zonaByItem: Record<number, string>;
};

type StockAvailability = {
  barang_id: number;
  zona_id: number | null;
  kondisi: string;
  available_qty: number;
};

function zonaLabel(z: ApiZona): string {
  const nama = z.nama_zona || z.kode_zona;
  return z.tipe_zona ? `${nama} — ${z.tipe_zona}` : nama;
}

function stockKey(barangId: number, zonaId: number | null, kondisi: string): string {
  return `${barangId}|${zonaId ?? "global"}|${kondisi}`;
}

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  submitting,
  data,
  zonas,
  zonaByItem,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !data) return null;

  const selectedZones = data.items
    .map((it) => {
      const zid = zonaByItem[it.item_id];
      const zona = zonas.find((z) => String(z.zona_id) === String(zid));
      return { item: it, zona };
    })
    .filter((row) => row.zona);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Konfirmasi Pengambilan Barang</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Periksa kembali lokasi pengambilan sebelum submit.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="mb-4 text-sm text-slate-600">
            Pastikan lokasi pengambilan sudah benar sebelum melanjutkan. Perubahan lokasi setelah
            submit memerlukan proses ulang.
          </p>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Detail Pengambilan
              </p>
              <div className="space-y-2">
                {selectedZones.map(({ item, zona }) => (
                  <div
                    key={item.item_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">
                        {item.barang?.nama_barang || "-"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {item.barang?.kode_perangkat || "-"}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-slate-700">{zonaLabel(zona!)}</div>
                      <div className="text-xs text-slate-400">Qty: {item.qty}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Periksa Kembali
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="rounded-xl bg-[#E8632C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
            >
              {submitting ? "Menyimpan..." : "Ya, Submit Picking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PickingDetailPage() {
  const params = useParams<{ suratJalanId: string }>();
  const router = useRouter();
  const { get, post } = useApi();

  const [data, setData] = useState<ApiSuratJalan | null | undefined>(undefined);
  const [zonas, setZonas] = useState<ApiZona[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [zonaByItem, setZonaByItem] = useState<Record<number, string>>({});
  const [stockAvailability, setStockAvailability] = useState<Record<string, StockAvailability>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    async function load() {
      setData(undefined);
      setLoadError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      try {
        const [sjRes, zonaRes] = await Promise.all([
          get(`${baseUrl}/api/surat-jalan/${params.suratJalanId}`),
          get(`${baseUrl}/api/zones?limit=1000`),
        ]);

        if (sjRes.status === 404) {
          setData(null);
          return;
        }
        if (!sjRes.ok) throw new Error("Gagal mengambil detail Surat Jalan.");
        if (!zonaRes.ok) throw new Error("Gagal mengambil daftar Zona.");

        const sjJson = await sjRes.json();
        const zonaJson = await zonaRes.json();

        const record: ApiSuratJalan | undefined = sjJson?.data;
        if (!record) {
          setData(null);
          return;
        }

        setData(record);
        const zonaList: ApiZona[] = Array.isArray(zonaJson?.data)
          ? zonaJson.data
          : zonaJson?.data?.data || [];
        setZonas(zonaList);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Terjadi kesalahan mengambil data."
        );
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.suratJalanId]);

  useEffect(() => {
    if (!data?.items?.length || !data?.gudang_asal_id) return;
    fetchStockCheck(data.items, data.gudang_asal_id, data.project_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.surat_jalan_id]);

  useEffect(() => {
    if (!data?.items?.length || !data?.gudang_asal_id) return;
    fetchStockCheck(data.items, data.gudang_asal_id, data.project_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.values(zonaByItem).join(",")]);

  const zonasForGudang = useMemo(() => {
    if (!data?.gudang_asal_id) return [];
    return zonas.filter((z) => Number(z.gudang_id) === Number(data.gudang_asal_id));
  }, [zonas, data]);

  const isDadakanSingleZone = useMemo(() => {
    return data?.gudang_asal?.tipe === "dadakan" && zonasForGudang.length === 1;
  }, [data, zonasForGudang]);

  useEffect(() => {
    if (isDadakanSingleZone) {
      const onlyZoneId = String(zonasForGudang[0].zona_id);
      setZonaByItem((prev) => {
        const next = { ...prev };
        data.items.forEach((it) => {
          if (!next[it.item_id]) {
            next[it.item_id] = onlyZoneId;
          }
        });
        return next;
      });
    }
  }, [isDadakanSingleZone, zonasForGudang, data]);

  const tujuanLabel =
    data?.tujuan_tipe === "lapangan"
      ? data?.titik_lapangan?.nama_lokasi || "-"
      : data?.tujuan_tipe === "gudang"
        ? data?.gudang_tujuan?.nama_gudang || "-"
        : data?.gudang_tujuan?.nama_gudang || "-";

  const tujuanBadge =
    data?.tujuan_tipe === "lapangan" ? (
      <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Lapangan</span>
    ) : data?.tujuan_tipe === "gudang" ? (
      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Gudang</span>
    ) : null;

  const isSelesai = data?.status === "diterima_didistribusikan";
  const cannotPick = isSelesai || data?.status !== "disetujui";

  if (data === undefined && !loadError) {
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

  if (data === null) {
    return (
      <div className="px-8 py-6">
        <p className="text-gray-500">Surat Jalan tidak ditemukan.</p>
        <button
          onClick={() => router.push("/staff/outbound")}
          className="mt-3 text-sm font-semibold text-[#E8632C] hover:underline"
        >
          Kembali ke daftar Surat Jalan
        </button>
      </div>
    );
  }

  const allAssigned = data.items.every((it) => !!zonaByItem[it.item_id]);

  function showToast(message: string, type: "success" | "error") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

  async function fetchStockCheck(items: ApiSuratJalanItem[], gudangAsalId: number | null | undefined, projectId?: number | null) {
    if (!gudangAsalId || !items.length) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const uniqueKeys = new Set<string>();

    const payloadItems = items
      .map((it) => {
        const zonaId = zonaByItem[it.item_id] ? Number(zonaByItem[it.item_id]) : null;
        const key = stockKey(it.item_id, zonaId, it.kondisi || "baik");
        if (uniqueKeys.has(key)) return null;
        uniqueKeys.add(key);
        return {
          barang_id: Number(it.barang_id),
          zona_id: zonaId,
          kondisi: it.kondisi || "baik",
        };
      })
      .filter(Boolean) as Array<{ barang_id: number; zona_id: number | null; kondisi: string }>;

    if (!payloadItems.length) return;

    try {
      const params = new URLSearchParams();
      params.set("items", JSON.stringify(payloadItems));
      if (projectId) params.set("project_id", String(projectId));

      const res = await get(`${baseUrl}/api/warehouses/${gudangAsalId}/stock-check?${params.toString()}`);
      if (!res.ok) return;

      const json = await res.json();
      const rows: StockAvailability[] = Array.isArray(json?.data) ? json.data : [];

      const map: Record<string, StockAvailability> = {};
      for (const row of rows) {
        const key = stockKey(row.barang_id, row.zona_id, row.kondisi);
        map[key] = row;
      }
      setStockAvailability(map);
    } catch {
      // silently ignore stock check fetch errors
    }
  }

  async function handleSubmit() {
    if (!allAssigned || !data) return;
    setShowConfirmModal(true);
  }

  async function confirmSubmit() {
    if (!allAssigned || !data) return;

    const resolvedItems = data.items.map((it) => {
      const zonaId = zonaByItem[it.item_id];
      return { item_id: it.item_id, qty: Number(it.qty), zona_id: Number(zonaId) };
    });

    setSubmitting(true);
    setShowConfirmModal(false);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await post(
        `${baseUrl}/api/surat-jalan/${params.suratJalanId}/retrieve`,
        { items: resolvedItems }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal menyimpan pengambilan barang.");
      }

      const successDetails = data.items.map((it) => {
        const zona = zonas.find((z) => String(z.zona_id) === String(zonaByItem[it.item_id]));
        const name = it.barang?.nama_barang || it.barang?.kode_perangkat || `Item #${it.item_id}`;
        const zoneName = zona ? zonaLabel(zona) : `Zona ${zonaByItem[it.item_id]}`;
        return `${name} di ${zoneName}`;
      });

      const successMessage =
        successDetails.length === 1
          ? `Picking berhasil disimpan — ${successDetails[0]}`
          : `Picking berhasil disimpan — ${successDetails[0]} dan ${successDetails.length - 1} item lain`;

      showToast(successMessage, "success");

      setTimeout(() => {
        router.push("/staff/outbound");
      }, 1500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-8 py-6">
      <button
        onClick={() => router.push("/staff/outbound")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{data.nomor_surat_jalan}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin size={14} />
          Tujuan:{" "}
          <span>
            {tujuanLabel}
            {tujuanBadge}
          </span>
        </p>
      </div>

      {cannotPick && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          Picking hanya bisa dilakukan pada surat jalan dengan status &quot;Disetujui — Siap
          Picking&quot;.
        </div>
      )}

      {zonasForGudang.length === 0 && !cannotPick && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          Belum ada Zona yang terdaftar untuk gudang{" "}
          <strong>{data.gudang_asal?.nama_gudang || "ini"}</strong>. Hubungi Admin untuk
          setup layout gudang dulu sebelum bisa melakukan picking.
        </div>
      )}

      <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {isSelesai ? "Barang yang Diambil" : "Pilih Lokasi Pengambilan per Barang"}
        </p>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-3 pr-4 font-semibold">Barang</th>
              <th className="pb-3 pr-4 font-semibold">Kondisi</th>
              <th className="pb-3 pr-4 font-semibold text-right">Qty</th>
              {!isSelesai && <th className="pb-3 font-semibold">Zona Pengambilan</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
               <tr key={item.item_id} className="border-b border-gray-50 last:border-0 align-top">
                <td className="py-3 pr-4">
                  <p className="font-medium text-gray-800">{item.barang?.nama_barang || "-"}</p>
                  <p className="text-xs text-gray-400">{item.barang?.kode_perangkat || "-"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {item.is_kelebihan && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#E8632C]">
                        <PackagePlus size={10} />
                        Kelebihan Barang
                      </span>
                    )}
                    {(() => {
                      const currentZonaId = zonaByItem[item.item_id] ? Number(zonaByItem[item.item_id]) : null;
                      const key = stockKey(item.item_id, currentZonaId, item.kondisi || "baik");
                      const stock = stockAvailability[key];
                      if (!stock) return null;
                      const available = Number(stock.available_qty || 0);
                      const required = Number(item.qty || 0);
                      if (available < required) {
                        return (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
                            <AlertCircle size={10} />
                            Stok Tidak Cukup (tersedia: {available}, diminta: {required})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-600">{item.kondisi || "-"}</td>
                <td className="py-3 pr-4 text-right text-gray-600">{item.qty}</td>

                {!isSelesai && (
                  <td className="py-3">
                    {isDadakanSingleZone ? (
                      <div className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                        <MapPin size={14} className="text-[#E8632C]" />
                        {zonaLabel(zonasForGudang[0])} <span className="text-[10px] text-slate-400">(otomatis)</span>
                      </div>
                    ) : (
                      <select
                        value={zonaByItem[item.item_id] || ""}
                        onChange={(e) =>
                          setZonaByItem((prev) => ({ ...prev, [item.item_id]: e.target.value }))
                        }
                        className="w-48 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-[#E8632C] focus:outline-none"
                      >
                        <option value="">Pilih zona...</option>
                        {zonasForGudang.map((z) => (
                          <option key={z.zona_id} value={String(z.zona_id)}>
                            {zonaLabel(z)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isSelesai && (
        <Button
          disabled={!allAssigned || submitting || cannotPick || zonasForGudang.length === 0}
          onClick={handleSubmit}
          className="mt-5 h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
        >
          {submitting ? "Menyimpan..." : "Konfirmasi Pengambilan"}
        </Button>
      )}

      <ConfirmModal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmSubmit}
        submitting={submitting}
        data={data}
        zonas={zonas}
        zonaByItem={zonaByItem}
      />

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
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}