"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PackagePlus, Loader2, AlertCircle, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi, ensureOk } from "@/lib/api";
import { KondisiBadge } from "@/components/common/KondisiBadge";

type ApiPickRow = {
  pick_id: number;
  gudang_id: number;
  zona_id?: number | null;
  kondisi_diminta?: string;
  kondisi_diambil?: string;
  qty?: number;
  is_override?: boolean;
  catatan_override?: string | null;
  picked_at?: string;
};

type ApiSuratJalanItem = {
  item_id: number;
  barang_id: number;
  qty: number;
  kondisi?: string | null;
  is_kelebihan?: boolean;
  barang?: { kode_perangkat?: string; nama_barang?: string };
  picks?: ApiPickRow[];
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
  alamat_lapangan?: string | null;
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
  kondisiByItem: Record<number, string>;
  catatanKondisiByItem: Record<number, string>;
};

type StockAvailability = {
  barang_id: number;
  zona_id: number | null;
  kondisi: string;
  available_qty: number;
};

type PickingStockAvailability = {
  barang_id: number;
  zonas: Array<{
    zona_id: number;
    kondisi: string;
    available_qty: number;
  }>;
  stok_project_lain?: Array<{
    project_id: number;
    qty: number;
  }>;
};

type AvailabilityResult = {
  item_id: number;
  barang_id: number;
  requested_kondisi: string;
  requested_qty: number;
  requested_available: number;
  status: "ok" | "override_available" | "no_stock" | "no_zone";
  alternatives: Array<{ kondisi: string; qty: number; zona_id: number }>;
  message: string | null;
};

function zonaLabel(z: ApiZona): string {
  const nama = z.nama_zona || z.kode_zona;
  return z.tipe_zona ? `${nama} — ${z.tipe_zona}` : nama;
}

const KONDISI_LABEL: Record<string, string> = {
  baik: "Baik",
  rusak_ringan: "Rusak Ringan",
  rusak_berat: "Rusak Berat",
  tidak_sesuai_spek: "Tidak Sesuai Spek",
  doa: "DOA",
};

function formatKondisi(kondisi: string): string {
  return KONDISI_LABEL[kondisi?.toLowerCase()] || kondisi;
}

function stockKey(barangId: number, zonaId: number | null, kondisi: string): string {
  return `${barangId}|${zonaId ?? "global"}|${kondisi}`;
}

function getZonaIdFromComposite(value: string | undefined | null): number | null {
  if (!value) return null;
  const part = String(value).split("|")[0];
  const num = Number(part);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function getValidZonesForItem(
  item: ApiSuratJalanItem,
  zonas: ApiZona[],
  pickingStock: Record<number, PickingStockAvailability["zonas"]>,
  requiredKondisi?: string
): ApiZona[] {
  const zonasForItem = pickingStock[item.barang_id] || [];
  const kondisi = (requiredKondisi || item.kondisi || "baik").toLowerCase();
  const validZonaIds = new Set(
    zonasForItem
      .filter((z) => z.kondisi.toLowerCase() === kondisi && z.available_qty > 0)
      .map((z) => z.zona_id)
  );
  // /api/zones mengembalikan zona_id sebagai string (BigInt diserialisasi jadi string di backend),
  // sedangkan /picking-stock-check mengembalikan number. Samakan tipe sebelum dibandingkan.
  return zonas.filter((z) => validZonaIds.has(Number(z.zona_id)));
}

function getQtyForItemZoneKondisi(item: ApiSuratJalanItem, zonaId: number, pickingStock: Record<number, PickingStockAvailability["zonas"]>, kondisi?: string): number {
  const zonasForItem = pickingStock[item.barang_id] || [];
  const kondisiLower = (kondisi || item.kondisi || "baik").toLowerCase();
  const match = zonasForItem.find((z) => Number(z.zona_id) === zonaId && String(z.kondisi).toLowerCase() === kondisiLower);
  return match ? match.available_qty : 0;
}

function findBestPickOption(barangId: number, requestedQty: number, requestedKondisi: string, zonasForGudang: ApiZona[], pickingStock: Record<number, PickingStockAvailability["zonas"]>): string | null {
  const stocks = pickingStock[barangId] || [];
  const validZonaIds = new Set(zonasForGudang.map((z) => Number(z.zona_id)));

  const zonasWithOptions = new Map<number, Array<{ kondisi: string; qty: number }>>();
  for (const s of stocks) {
    if (s.available_qty < requestedQty || !validZonaIds.has(Number(s.zona_id))) continue;
    const zonaId = Number(s.zona_id);
    if (!zonasWithOptions.has(zonaId)) {
      zonasWithOptions.set(zonaId, []);
    }
    zonasWithOptions.get(zonaId)!.push({ kondisi: s.kondisi, qty: s.available_qty });
  }

  if (zonasWithOptions.size !== 1) return null;

  const [zonaId, options] = Array.from(zonasWithOptions.entries())[0];
  const requestedOpt = options.find((o) => o.kondisi.toLowerCase() === requestedKondisi.toLowerCase());
  if (requestedOpt) {
    return `${zonaId}|${requestedOpt.kondisi}`;
  }

  if (options.length === 1) {
    return `${zonaId}|${options[0].kondisi}`;
  }

  const best = options.sort((a, b) => b.qty - a.qty)[0];
  return `${zonaId}|${best.kondisi}`;
}

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  submitting,
  data,
  zonas,
  zonaByItem,
  kondisiByItem,
  catatanKondisiByItem,
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
      const zid = getZonaIdFromComposite(zonaByItem[it.item_id]);
      const zona = zonas.find((z) => String(z.zona_id) === String(zid));
      const selectedKondisi = kondisiByItem[it.item_id] || it.kondisi || "baik";
      const isOverride = selectedKondisi.toLowerCase() !== (it.kondisi || "baik").toLowerCase();
      return { item: it, zona, isOverride, selectedKondisi, catatan: catatanKondisiByItem[it.item_id] };
    })
    .filter((row) => row.zona);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-xl"
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
                 {selectedZones.map(({ item, zona, isOverride, selectedKondisi, catatan }) => (
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
                      {isOverride && catatan && (
                        <span className="mt-1 text-xs text-amber-700">
                          Catatan: {catatan}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-slate-700">{zonaLabel(zona!)}</div>
                      <div className="text-xs text-slate-400">Qty: {item.qty}</div>
                      {isOverride && (
                        <div className="text-xs text-amber-700">
                          Override otomatis: {item.kondisi || "baik"} → {selectedKondisi}
                        </div>
                      )}
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
  const submittingRef = useRef(false);
  const [zonaByItem, setZonaByItem] = useState<Record<number, string>>({});
  const [stockAvailability, setStockAvailability] = useState<Record<string, StockAvailability>>({});
  const [pickingStockByItem, setPickingStockByItem] = useState<Record<number, PickingStockAvailability["zonas"]>>({});
  const [stokProjectLainByItem, setStokProjectLainByItem] = useState<Record<number, PickingStockAvailability["stok_project_lain"]>>({});
  const [availabilityByItem, setAvailabilityByItem] = useState<Record<number, AvailabilityResult>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [kondisiByItem, setKondisiByItem] = useState<Record<number, string>>({});
  const [catatanKondisiByItem, setCatatanKondisiByItem] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        await ensureOk(sjRes, "Gagal mengambil detail Surat Jalan.");
        await ensureOk(zonaRes, "Gagal mengambil daftar Zona.");

        const sjJson = await sjRes.json();
        const zonaJson = await zonaRes.json();

        const record: ApiSuratJalan | undefined = sjJson?.data;
        if (!record) {
          setData(null);
          return;
        }

        setData(record);
        const zonaList: ApiZona[] = Array.isArray(zonaJson?.data)
          ? zonaJson.data.map((z: ApiZona) => ({ ...z, zona_id: Number(z.zona_id) }))
          : (zonaJson?.data?.data || []).map((z: ApiZona) => ({ ...z, zona_id: Number(z.zona_id) }));
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

  const zonasForGudang = useMemo(() => {
    if (!data?.gudang_asal_id) return [];
    return zonas.filter((z) => Number(z.gudang_id) === Number(data.gudang_asal_id));
  }, [zonas, data]);

  useEffect(() => {
    if (!data?.items?.length || !data?.gudang_asal_id) return;
    fetchStockCheck(data.items, data.gudang_asal_id, data.project_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.surat_jalan_id]);

  useEffect(() => {
    if (!data?.items?.length || !data?.gudang_asal_id) return;
    fetchPickingStockCheck(data.items, data.gudang_asal_id, data.project_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.surat_jalan_id]);

  useEffect(() => {
    if (!data?.items?.length || !data?.gudang_asal_id) return;
    const hasSelection = data.items.some((it) => zonaByItem[it.item_id]);
    if (!hasSelection) return;
    fetchAvailability(data.items, data.gudang_asal_id, data.project_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.surat_jalan_id, zonaByItem, kondisiByItem]);

  useEffect(() => {
    if (!data?.items?.length || !data?.gudang_asal_id) return;
    const hasStockData = data.items.some((it) => (pickingStockByItem[it.barang_id] || []).length > 0);
    if (!hasStockData) return;
    setZonaByItem((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const it of data.items) {
        const currentComposite = next[it.item_id];
        if (!currentComposite) continue;
        const currentZonaId = getZonaIdFromComposite(currentComposite);
        if (!currentZonaId) continue;
        const currentKondisi = String(currentComposite).includes("|")
          ? String(currentComposite).split("|")[1]
          : kondisiByItem[it.item_id] || it.kondisi || "baik";
        const validZones = getValidZonesForItem(it, zonasForGudang, pickingStockByItem, currentKondisi);
        const stillValid = validZones.some((z) => String(z.zona_id) === String(currentZonaId));
        if (!stillValid) {
          delete next[it.item_id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [data, zonasForGudang, pickingStockByItem, kondisiByItem]);

  useEffect(() => {
    if (!data?.items?.length || !data?.gudang_asal_id) return;
    fetchStockCheck(data.items, data.gudang_asal_id, data.project_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.values(zonaByItem).join(",")]);

  const isDadakanSingleZone = useMemo(() => {
    return data?.gudang_asal?.tipe === "dadakan" && zonasForGudang.length === 1;
  }, [data, zonasForGudang]);

  const zonaNameMap = useMemo(() => {
    const map = new Map<number, ApiZona>();
    for (const z of zonas) {
      map.set(Number(z.zona_id), z);
    }
    return map;
  }, [zonas]);

  useEffect(() => {
    if (!data) return;
    if (isDadakanSingleZone) {
      const onlyZoneId = String(zonasForGudang[0].zona_id);
      setZonaByItem((prev) => {
        const next = { ...prev };
        data.items.forEach((it) => {
          if (!next[it.item_id]) {
            const kondisi = it.kondisi || "baik";
            next[it.item_id] = `${onlyZoneId}|${kondisi}`;
            setKondisiByItem((prev2) => ({ ...prev2, [it.item_id]: kondisi }));
          }
        });
        return next;
      });
    }
  }, [isDadakanSingleZone, zonasForGudang, data]);

  useEffect(() => {
    if (!data?.items?.length || !zonasForGudang.length) return;

    setZonaByItem((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const it of data.items) {
        if (next[it.item_id]) continue;

        const requestedQty = Number(it.qty || 0);
        const requestedKondisi = (it.kondisi || "baik").toLowerCase();
        const best = findBestPickOption(it.barang_id, requestedQty, requestedKondisi, zonasForGudang, pickingStockByItem);
        if (best) {
          next[it.item_id] = best;
          const [, kondisi] = best.split("|");
          setKondisiByItem((prev2) => ({ ...prev2, [it.item_id]: kondisi }));
          changed = true;
        }
      }

      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.surat_jalan_id, zonasForGudang, pickingStockByItem]);

  const tujuanLabel =
    data?.tujuan_tipe === "lapangan"
      ? data?.alamat_lapangan || "-"
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
  const hasNoStockAtAll = data?.items?.some((it) => {
    const availableKondisi = pickingStockByItem[it.barang_id] || [];
    const otherProjects = stokProjectLainByItem[it.barang_id] || [];
    return !availableKondisi.some((s) => s.available_qty > 0) && otherProjects.length === 0;
  }) ?? false;
  const cannotPick = isSelesai || data?.status !== "disetujui" || hasNoStockAtAll;

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

  if (!data) {
    return (
      <div className="px-8 py-6">
        <p className="text-gray-500">Memuat data Surat Jalan...</p>
      </div>
    );
  }

  const assignment = data.items.map((it) => {
    const selectedComposite = zonaByItem[it.item_id];
    const selectedZonaId = getZonaIdFromComposite(selectedComposite);
    const selectedKondisi = kondisiByItem[it.item_id] || it.kondisi || "baik";
    const availability = availabilityByItem[it.item_id];
    const qty = Number(it.qty || 0);
    const itemName = it.barang?.nama_barang || it.barang?.kode_perangkat || `item #${it.item_id}`;

    if (!selectedComposite || !selectedZonaId) {
      return { ok: false as const, reason: `Pilih zona untuk ${itemName}` };
    }

    if (!availability) {
      return { ok: false as const, reason: `Memuat stok untuk ${itemName}...` };
    }

    if (availability.status === "no_stock" || availability.status === "no_zone") {
      return { ok: false as const, reason: availability.message || `Stok tidak tersedia untuk ${itemName}` };
    }

    if (availability.status === "override_available") {
      const matchedAlt = availability.alternatives.find((a) => a.kondisi.toLowerCase() === selectedKondisi.toLowerCase());
      if (!matchedAlt) {
        return { ok: false as const, reason: `Pilih kondisi pengganti untuk ${itemName}` };
      }
      if (qty <= 0 || qty > matchedAlt.qty) {
        return { ok: false as const, reason: `Stok tidak cukup untuk ${itemName}` };
      }
      return { ok: true as const };
    }

    if (qty <= 0 || qty > availability.requested_available) {
      return { ok: false as const, reason: `Stok tidak cukup untuk ${itemName}` };
    }

    return { ok: true as const };
  });

  const allAssigned = assignment.every((a) => a.ok);
  const firstBad = assignment.find((a) => !a.ok);
  const disableReason = firstBad ? firstBad.reason : zonasForGudang.length === 0 ? "Gudang ini belum memiliki zona. Hubungi supervisor." : null;

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
        const zonaId = getZonaIdFromComposite(zonaByItem[it.item_id]);
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

  async function fetchPickingStockCheck(items: ApiSuratJalanItem[], gudangAsalId: number | null | undefined, projectId?: number | null) {
    if (!gudangAsalId || !items.length) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const payloadItems = items.map((it) => ({
      barang_id: Number(it.barang_id),
      kondisi: it.kondisi || "baik",
    }));

    try {
      const params = new URLSearchParams();
      params.set("items", JSON.stringify(payloadItems));
      if (projectId) params.set("project_id", String(projectId));

      const res = await get(`${baseUrl}/api/warehouses/${gudangAsalId}/picking-stock-check?${params.toString()}`);
      if (!res.ok) return;

      const json = await res.json();
      const rows: PickingStockAvailability[] = Array.isArray(json?.data) ? json.data : [];

      const map: Record<number, PickingStockAvailability["zonas"]> = {};
      const otherProjectsMap: Record<number, PickingStockAvailability["stok_project_lain"]> = {};
      for (const row of rows) {
        map[row.barang_id] = row.zonas;
        if (row.stok_project_lain?.length) {
          otherProjectsMap[row.barang_id] = row.stok_project_lain;
        }
      }
      setPickingStockByItem(map);
      setStokProjectLainByItem(otherProjectsMap);
    } catch {
      // silently ignore picking stock check fetch errors
    }
  }

  async function fetchAvailability(items: ApiSuratJalanItem[], gudangAsalId: number | null | undefined, projectId?: number | null) {
    if (!gudangAsalId || !items.length) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const payloadItems = items
      .map((it) => {
        const zonaId = getZonaIdFromComposite(zonaByItem[it.item_id]);
        const selectedKondisi = kondisiByItem[it.item_id] || it.kondisi || "baik";
        if (!zonaId) return null;
        return {
          item_id: it.item_id,
          barang_id: Number(it.barang_id),
          zona_id: zonaId,
          kondisi: selectedKondisi,
          qty: Number(it.qty),
        };
      })
      .filter(Boolean) as Array<{ item_id: number; barang_id: number; zona_id: number; kondisi: string; qty: number }>;

    if (!payloadItems.length) return;

    try {
      const params = new URLSearchParams();
      params.set("items", JSON.stringify(payloadItems));
      if (projectId) params.set("project_id", String(projectId));

      const res = await get(`${baseUrl}/api/warehouses/${gudangAsalId}/picking-availability?${params.toString()}`);
      if (!res.ok) return;

      const json = await res.json();
      const rows: AvailabilityResult[] = Array.isArray(json?.data) ? json.data : [];

      const map: Record<number, AvailabilityResult> = {};
      for (const row of rows) {
        map[row.item_id] = row;
      }
      setAvailabilityByItem(map);
    } catch {
      // silently ignore availability fetch errors
    }
  }

  async function handleSubmit() {
    if (!allAssigned || !data) return;
    setShowConfirmModal(true);
  }

  async function confirmSubmit() {
    if (!allAssigned || !data || submittingRef.current) {
      showToast("Lengkapi pemilihan zona untuk semua barang sebelum submit.", "error");
      return;
    }

    const resolvedItems = data.items.map((it) => {
      const zonaId = getZonaIdFromComposite(zonaByItem[it.item_id]);
      const selectedKondisi = kondisiByItem[it.item_id] || it.kondisi || "baik";
      const catatanKondisi = catatanKondisiByItem[it.item_id];
      return {
        item_id: it.item_id,
        qty: Number(it.qty),
        zona_id: Number(zonaId),
        kondisi: selectedKondisi,
        catatan_kondisi: catatanKondisi || null,
      };
    });

    setSubmitting(true);
    submittingRef.current = true;
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
        const zonaId = getZonaIdFromComposite(zonaByItem[it.item_id]);
        const zona = zonas.find((z) => String(z.zona_id) === String(zonaId));
        const name = it.barang?.nama_barang || it.barang?.kode_perangkat || `Item #${it.item_id}`;
        const zoneName = zona ? zonaLabel(zona) : zonaId ? `Zona ${zonaId}` : "Zona belum dipilih";
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
      submittingRef.current = false;
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
          {hasNoStockAtAll
            ? "Tidak ada stok yang tersedia untuk barang-barang di surat jalan ini."
            : 'Picking hanya bisa dilakukan pada surat jalan dengan status "Disetujui — Siap Picking".'}
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

         <div className="overflow-x-auto overscroll-x-contain">
         <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-3 pr-4 font-semibold">Barang</th>
              <th className="pb-3 pr-4 font-semibold">Kondisi</th>
              <th className="pb-3 pr-4 font-semibold text-right">Qty</th>
              <th className="pb-3 font-semibold">{isSelesai ? "Hasil Picking" : "Zona Pengambilan"}</th>
              <th className="pb-3 font-semibold">Catatan</th>
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
                       const currentZonaId = getZonaIdFromComposite(zonaByItem[item.item_id]);
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
                     ) : (() => {
                       const requiredKondisi = item.kondisi || "baik";
                       const selectedKondisi = kondisiByItem[item.item_id] || requiredKondisi;
                       const currentComposite = zonaByItem[item.item_id] || "";
                       const currentZonaId = getZonaIdFromComposite(currentComposite);
                       const availability = availabilityByItem[item.item_id];
                       const isOverride = selectedKondisi.toLowerCase() !== requiredKondisi.toLowerCase();

                        const currentZona = currentZonaId ? zonasForGudang.find((z) => String(z.zona_id) === String(currentZonaId)) : null;

                         const availableKondisi = pickingStockByItem[item.barang_id] || [];
                         const hasAnyStock = availableKondisi.some((s) => s.available_qty > 0);
                         const stokProjectLain = stokProjectLainByItem[item.barang_id] || [];
                         const zonesWithStock = zonasForGudang.filter((z) =>
                           availableKondisi.some((s) => Number(s.zona_id) === z.zona_id && s.available_qty > 0)
                         );

                         if (!hasAnyStock && stokProjectLain.length > 0) {
                           const projectLabels = stokProjectLain.map((p) => `project ${p.project_id}: ${p.qty} unit`).join(", ");
                           return (
                             <div>
                               <div className="text-xs text-amber-700">
                                 Stok tersedia di project lain (${projectLabels}), tidak bisa dipick untuk project surat jalan ini.
                               </div>
                             </div>
                           );
                         }

                         if (!hasAnyStock) {
                           return (
                             <div>
                               <div className="text-xs text-red-600">
                                 Tidak ada stok barang ini di gudang/project pada surat jalan ini.
                               </div>
                             </div>
                           );
                         }

                         const hasNoStock = availability && (availability.status === "no_stock" || availability.status === "no_zone");
                         const hasOverride = availability && availability.status === "override_available";
                         const otherKondisi = availability?.alternatives || [];

                        const zonesToShow = zonesWithStock.map((z) => ({
                          zona_id: z.zona_id,
                          kondisi: requiredKondisi,
                          available_qty: getQtyForItemZoneKondisi(item, z.zona_id, pickingStockByItem, requiredKondisi),
                          zona: z,
                        }));

                        const handleZonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                          const rawValue = e.target.value;
                          if (!rawValue) {
                            setZonaByItem((prev) => {
                              const next = { ...prev };
                              delete next[item.item_id];
                              return next;
                            });
                            setKondisiByItem((prev) => {
                              const next = { ...prev };
                              delete next[item.item_id];
                              return next;
                            });
                            setCatatanKondisiByItem((prev) => {
                              const next = { ...prev };
                              delete next[item.item_id];
                              return next;
                            });
                            return;
                          }

                          let selectedZonaId: number;
                          let selectedKondisi: string;

                          if (rawValue.includes("|")) {
                            const [zonaId, kondisi] = rawValue.split("|");
                            selectedZonaId = Number(zonaId);
                            selectedKondisi = kondisi;
                          } else {
                            selectedZonaId = Number(rawValue);
                            const stockForItem = pickingStockByItem[item.barang_id] || [];
                            const stockZona = stockForItem.find((s) => s.zona_id === selectedZonaId);
                            selectedKondisi = stockZona?.kondisi || requiredKondisi;
                          }

                          setZonaByItem((prev) => ({ ...prev, [item.item_id]: `${selectedZonaId}|${selectedKondisi}` }));
                          setKondisiByItem((prev) => ({ ...prev, [item.item_id]: selectedKondisi }));
                        };

                        return (
                          <div>
                            <select value={currentComposite || ""} onChange={handleZonaChange} className="w-48 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-[#E8632C] focus:outline-none">
                              <option value="">Pilih zona pengambilan</option>
                              {zonesToShow.map((z) => {
                                const zona = z.zona;
                                const label = zona ? zonaLabel(zona) : `Zona ${z.zona_id}`;
                                const qtyToShow = z.available_qty;
                                const optionValue = `${z.zona_id}|${z.kondisi}`;
                                return (
                                  <option key={optionValue} value={optionValue}>
                                    {label} — {qtyToShow} unit ({z.kondisi})
                                  </option>
                                );
                              })}
                            </select>
                            {currentZonaId && !availability && <div className="text-xs text-gray-500">Memuat stok...</div>}
                            {hasNoStock && <div className="text-xs text-red-600">{availability.message || `Stok kondisi ${requiredKondisi} tidak tersedia di gudang ini.`}</div>}
                            {hasOverride && (
                              <div>
                                <p className="text-xs text-amber-700">
                                  Stok kondisi &quot;{requiredKondisi}&quot; tidak tersedia. Pilih kondisi
                                  alternatif:
                                </p>
                                <select
                                  value={currentZonaId ? currentComposite : ""}
                                  onChange={(e) => {
                                    const rawValue = e.target.value;
                                    if (!rawValue) return;
                                    const [, kondisi] = rawValue.split("|");
                                    setZonaByItem((prev) => ({ ...prev, [item.item_id]: rawValue }));
                                    setKondisiByItem((prev) => ({ ...prev, [item.item_id]: kondisi }));
                                  }}
                                  className="mt-1 w-48 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-[#E8632C] focus:outline-none"
                                >
                                  <option value="">Pilih zona &amp; kondisi...</option>
                                  {otherKondisi.map((z) => {
                                    const zona = zonaNameMap.get(Number(z.zona_id));
                                    const label = zona ? zonaLabel(zona) : `Zona ${z.zona_id}`;
                                    return (
                                      <option
                                        key={`${z.zona_id}-${z.kondisi}`}
                                        value={`${z.zona_id}|${z.kondisi}`}
                                      >
                                        {label} — {z.qty} unit ({formatKondisi(z.kondisi)})
                                      </option>
                                    );
                                  })}
                                 </select>
                               </div>
                             )}
                             {isOverride && !hasOverride && (
                               <div>
                                 <p className="mt-1 text-xs text-amber-700">Override otomatis: {requiredKondisi} → {selectedKondisi}</p>
                                 <div className="mt-1">
                                   <label className="mb-1 block text-[10px] font-medium text-slate-600">Catatan (opsional)</label>
                                   <textarea value={catatanKondisiByItem[item.item_id] || ""} onChange={(e) => setCatatanKondisiByItem((prev) => ({ ...prev, [item.item_id]: e.target.value }))} placeholder="Catatan opsional (jika ada alasan khusus)." className="w-48 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-[#E8632C] focus:outline-none" rows={2} />
                                 </div>
                               </div>
                             )}
                           </div>
                         );
                      })()}
                   </td>
                 )}

                 {isSelesai && (() => {
                   // Readback hasil picking tersimpan (surat_jalan_item_pick).
                   const picks = item.picks || [];
                   if (picks.length === 0) {
                     return (
                       <td className="py-3">
                         <span className="text-xs text-gray-400">-</span>
                       </td>
                     );
                   }
                   return (
                     <td className="py-3">
                       <div className="space-y-1.5">
                         {picks.map((pick) => {
                           const zona = zonas.find((z) => z.zona_id === Number(pick.zona_id));
                           return (
                             <div key={pick.pick_id} className="text-xs text-gray-600">
                               {zona ? zonaLabel(zona) : `Zona ${pick.zona_id ?? "-"}`} — {Number(pick.qty || 0)} unit
                               {pick.kondisi_diambil ? ` (${pick.kondisi_diambil})` : ""}
                               {pick.is_override && (
                                 <span className="ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                                   Override
                                 </span>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     </td>
                   );
                 })()}

                 {!isSelesai && (
                   <td className="py-3">
                     <textarea
                       value={catatanKondisiByItem[item.item_id] || ""}
                       onChange={(e) =>
                         setCatatanKondisiByItem((prev) => ({ ...prev, [item.item_id]: e.target.value }))
                       }
                       placeholder="Catatan pengambilan (opsional)"
                       className="w-48 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-[#E8632C] focus:outline-none"
                       rows={2}
                     />
                   </td>
                 )}

                 {isSelesai && (
                   <td className="py-3">
                     {(item.picks || []).some((pick) => pick.catatan_override) ? (
                       <div className="space-y-1">
                         {(item.picks || [])
                           .filter((pick) => pick.catatan_override)
                           .map((pick) => (
                             <p key={pick.pick_id} className="text-xs text-gray-600">
                               {pick.catatan_override}
                             </p>
                           ))}
                       </div>
                     ) : (
                       <span className="text-xs text-gray-400">-</span>
                     )}
                   </td>
                 )}
              </tr>
            ))}
           </tbody>
         </table>
         </div>
       </div>

       {!isSelesai && (
         <div>
           <Button
             disabled={!allAssigned || submitting || cannotPick || zonasForGudang.length === 0}
             onClick={handleSubmit}
             className="mt-5 h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
           >
             {submitting ? "Menyimpan..." : "Konfirmasi Pengambilan"}
           </Button>
           {disableReason && !allAssigned && (
             <div className="mt-2 text-xs text-gray-500">{disableReason}</div>
           )}
         </div>
       )}

      <ConfirmModal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmSubmit}
        submitting={submitting}
        data={data}
        zonas={zonas}
        zonaByItem={zonaByItem}
        kondisiByItem={kondisiByItem}
        catatanKondisiByItem={catatanKondisiByItem}
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
