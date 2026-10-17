"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PackagePlus, Loader2, AlertCircle, MapPin, X, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KondisiBadge } from "@/components/common/KondisiBadge";
import { KondisiUnitSummary } from "@/components/common/KondisiUnitSummary";
import { getItemFotoUrls } from "@/lib/surat-jalan-item-foto";
import { hasKondisiUnit, type KondisiUnit } from "@/lib/kondisi-barang";
import { useApi, ensureOk } from "@/lib/api";

// ---------------------------------------------------------------------------
// Bentuk respons GET /api/surat-jalan/:id dan GET /api/zones (sudah include
// gudang + raks + bins bersarang dalam satu response).
// ---------------------------------------------------------------------------
type ApiSuratJalanItem = {
  item_id: number;
  qty: number;
  qty_diterima?: number | string | null;
  qty_ditolak?: number | string | null;
  alasan_penolakan?: string | null;
  kondisi?: string | null;
  // Penilaian kondisi per unit dari proses inbound (relasi `units`).
  units?: KondisiUnit[] | null;
  is_kelebihan?: boolean;
  barang?: { kode_perangkat?: string; nama_barang?: string };
  // Foto dokumentasi barang yang diunggah saat proses Inbound.
  fotos?: Array<{ foto_id: number | string; url: string; filename?: string }> | null;
  foto_url?: string | null;
  zona?: {
    zona_id: number;
    kode_zona: string;
    nama_zona?: string | null;
    tipe_zona?: string | null;
    gudang?: { nama_gudang?: string } | null;
  } | null;
};

type ApiSuratJalan = {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: string;
  tanggal?: string;
  gudang_asal?: { nama_gudang: string } | null;
  gudang_tujuan?: { nama_gudang: string; tipe?: string } | null;
  gudang_tujuan_id?: number | null;
  items: ApiSuratJalanItem[];
};

type ApiZona = {
  zona_id: number;
  gudang_id: number;
  kode_zona: string;
  nama_zona?: string | null;
  tipe_zona?: string | null;
};

function zonaLabel(z: ApiZona): string {
  const nama = z.nama_zona || z.kode_zona;
  return z.tipe_zona ? `${nama} — ${z.tipe_zona}` : nama;
}

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  data: ApiSuratJalan | null;
  zonas: ApiZona[];
  zonaByItem: Record<number, string>;
};

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
    .filter((row) => row.zona && Number(row.item.qty_diterima ?? row.item.qty) > 0);

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
            <h3 className="text-base font-semibold text-slate-900">Konfirmasi Lokasi Penempatan</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Periksa kembali data penempatan sebelum submit.
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
            Pastikan lokasi penempatan sudah benar sebelum melanjutkan. Perubahan lokasi setelah
            submit memerlukan proses ulang.
          </p>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Detail Penempatan
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
                      <div className="text-xs text-slate-400">
                        Qty: {Number(item.qty_diterima ?? item.qty)}
                      </div>
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
              {submitting ? "Menyimpan..." : "Ya, Submit Putaway"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PutawayDetailPage() {
  const params = useParams<{ suratJalanId: string }>();
  const router = useRouter();
  const { get, post } = useApi();

  const [data, setData] = useState<ApiSuratJalan | null | undefined>(undefined);
  const [zonas, setZonas] = useState<ApiZona[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Simpan pilihan zona per item — dikirim sebagai zona_id saat submit.
  const [zonaByItem, setZonaByItem] = useState<Record<number, string>>({});
  const [qtyAktualByItem, setQtyAktualByItem] = useState<Record<number, string>>({});
  const [catatanByItem, setCatatanByItem] = useState<Record<number, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Preview foto barang Inbound (klik thumbnail → perbesar).
  const [previewFoto, setPreviewFoto] = useState<{ urls: string[]; index: number } | null>(null);

  useEffect(() => {
    if (!previewFoto) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewFoto(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [previewFoto]);

  function openPreview(urls: string[], index: number) {
    if (urls.length === 0) return;
    setPreviewFoto({ urls, index });
  }

  function stepPreview(step: number) {
    setPreviewFoto((prev) => {
      if (!prev || prev.urls.length === 0) return prev;
      const nextIndex = (prev.index + step + prev.urls.length) % prev.urls.length;
      return { ...prev, index: nextIndex };
    });
  }

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

  // Zona yang relevan cuma yang ada di Gudang Tujuan Surat Jalan ini.
  const zonasForGudang = useMemo(() => {
    if (!data?.gudang_tujuan_id) return [];
    return zonas.filter((z) => Number(z.gudang_id) === Number(data.gudang_tujuan_id));
  }, [zonas, data]);

  const isDadakanSingleZone = useMemo(() => {
    return data?.gudang_tujuan?.tipe === "dadakan" && zonasForGudang.length === 1;
  }, [data, zonasForGudang]);

  useEffect(() => {
    if (!data) return;
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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E8632C]" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="px-8 py-6">
        <p className="text-gray-500">Surat Jalan tidak ditemukan.</p>
        <button
          onClick={() => router.push("/staff/putaway")}
          className="mt-3 text-sm font-semibold text-[#E8632C] hover:underline"
        >
          Kembali ke daftar Putaway
        </button>
      </div>
    );
  }

  const isSelesai = data.status === "diterima_didistribusikan";

  // Qty yang ditempatkan = qty diterima dari penerimaan (bukan qty surat
  // jalan). Item yang ditolak penuh (diterima 0) tidak perlu ditempatkan.
  const qtyDiterimaOf = (item: ApiSuratJalanItem) => {
    if (item.qty_diterima !== null && item.qty_diterima !== undefined) {
      return Number(item.qty_diterima);
    }
    return Number(item.qty);
  };
  const itemsToPlace = data.items.filter((it) => qtyDiterimaOf(it) > 0);

  const allAssigned = itemsToPlace.every((it) => !!zonaByItem[it.item_id]);

  function showToast(message: string, type: "success" | "error") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

  async function handleSubmit() {
    if (!allAssigned || !data) return;
    await confirmSubmit();
  }

  async function confirmSubmit() {
    if (!allAssigned || !data) return;

    const resolvedItems = itemsToPlace.map((it) => {
      const zonaId = zonaByItem[it.item_id];
      return { item_id: it.item_id, zona_id: Number(zonaId), qty_ditempatkan: qtyDiterimaOf(it) };
    });

    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const payload = { items: resolvedItems };

      const res = await post(
        `${baseUrl}/api/surat-jalan/${params.suratJalanId}/putaway`,
        payload
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal menyimpan penempatan barang.");
      }

      const successDetails = itemsToPlace.map((it) => {
        const zona = zonas.find((z) => String(z.zona_id) === String(zonaByItem[it.item_id]));
        const name = it.barang?.nama_barang || it.barang?.kode_perangkat || `Item #${it.item_id}`;
        const zoneName = zona ? zonaLabel(zona) : `Zona ${zonaByItem[it.item_id]}`;
        return `${name} di ${zoneName}`;
      });

      const successMessage =
        successDetails.length === 1
          ? `Putaway berhasil disimpan — ${successDetails[0]}`
          : `Putaway berhasil disimpan — ${successDetails[0]} dan ${successDetails.length - 1} item lain`;

      setSuccessModalMessage(successMessage);
      setShowSuccessModal(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSuccessModalClose() {
    setShowSuccessModal(false);
    router.push("/staff/putaway");
  }

  return (
    <div className="px-8 py-6">
      <button
        onClick={() => router.push("/staff/putaway")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{data.nomor_surat_jalan}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin size={14} />
          Tujuan: {data.gudang_tujuan?.nama_gudang || "-"}
        </p>
      </div>

      {zonasForGudang.length === 0 && !isSelesai && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          Belum ada Zona yang terdaftar untuk gudang{" "}
          <strong>{data.gudang_tujuan?.nama_gudang || "ini"}</strong>. Hubungi Admin untuk
          setup layout gudang dulu sebelum bisa melakukan putaway.
        </div>
      )}

      <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {isSelesai ? "Zona Penyimpanan" : "Tentukan Zona Penyimpanan per Barang"}
        </p>

        <div className="overflow-x-auto overscroll-x-contain">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-3 pr-4 font-semibold text-center w-12">No</th>
              <th className="pb-3 pr-4 font-semibold">Barang</th>
              <th className="pb-3 pr-4 font-semibold">Foto Barang</th>
              <th className="pb-3 pr-4 font-semibold">Kondisi</th>
              <th className="pb-3 pr-4 font-semibold text-right">QTY SURAT JALAN</th>
              <th className="pb-3 pr-4 font-semibold text-right">QTY AKTUAL</th>
              <th className="pb-3 pr-4 font-semibold">CATATAN</th>
              <th className="pb-3 font-semibold">Zona</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => {
              const fotoUrls = getItemFotoUrls(item);
              const extraFoto = Math.max(fotoUrls.length - 1, 0);
              const diterima = qtyDiterimaOf(item);
              const ditolakPenuh = diterima <= 0;
              return (
              <tr key={item.item_id} className="border-b border-gray-50 last:border-0 align-top">
                <td className="py-3 pr-4 text-center text-xs text-slate-500">{idx + 1}</td>
                <td className="py-3 pr-4">
                  <p className="font-medium text-gray-800">{item.barang?.nama_barang || "-"}</p>
                  <p className="text-xs text-gray-400">{item.barang?.kode_perangkat || "-"}</p>
                  {item.is_kelebihan && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#E8632C]">
                      <PackagePlus size={10} />
                      Kelebihan Barang
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {fotoUrls.length === 0 ? (
                    <span className="text-sm text-gray-300">-</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPreview(fotoUrls, 0)}
                      title="Perbesar foto"
                      className="group relative block h-14 w-14 overflow-hidden rounded-lg border border-gray-200"
                    >
                      <img
                        src={fotoUrls[0]}
                        alt={item.barang?.nama_barang ? `Foto ${item.barang.nama_barang}` : "Foto barang"}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                        <ImageIcon size={16} />
                      </span>
                      {extraFoto > 0 && (
                        <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          +{extraFoto}
                        </span>
                      )}
                    </button>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {hasKondisiUnit(item.units) ? (
                    <KondisiUnitSummary units={item.units} />
                  ) : (
                    <KondisiBadge value={item.kondisi} />
                  )}
                </td>
                <td className="py-3 pr-4 text-right text-gray-600">
                  {ditolakPenuh ? (
                    <span className="font-semibold text-rose-600">0</span>
                  ) : (
                    <>
                      {diterima}
                      {Number(item.qty) !== diterima && (
                        <span className="ml-1 text-xs text-gray-400">/{item.qty}</span>
                      )}
                    </>
                  )}
                </td>
                <td className="py-3">
                  {ditolakPenuh ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                      Ditolak penuh — tidak ditempatkan
                    </span>
                  ) : isSelesai ? (
                    item.zona ? (
                      <span className="text-sm text-gray-700">
                        {item.zona.gudang?.nama_gudang ?? "-"} / {item.zona.nama_zona || item.zona.kode_zona}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Belum ditempatkan</span>
                    )
                  ) : isDadakanSingleZone ? (
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
              </tr>
              );
            })}
           </tbody>
         </table>
         </div>
       </div>

      {!isSelesai && (
        <Button
          disabled={!allAssigned || submitting || zonasForGudang.length === 0}
          onClick={handleSubmit}
          className="mt-5 h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
        >
          {submitting ? "Menyimpan..." : "Simpan & Selesaikan Putaway"}
        </Button>
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
            <X size={14} />
          </button>
        </div>
      )}

      {showSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={handleSuccessModalClose}
        >
          <div
            className="w-[calc(100vw-1.5rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center px-6 py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Barang Berhasil Ditempatkan</h3>
              <p className="mt-2 text-sm text-gray-500">{successModalMessage}</p>
              <button
                type="button"
                onClick={handleSuccessModalClose}
                className="mt-6 w-full rounded-xl bg-[#E8632C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D9591F]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {previewFoto && previewFoto.urls.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-slate-900/70 p-4"
          onClick={() => setPreviewFoto(null)}
        >
          <div className="flex w-full max-w-3xl items-center justify-between px-1 text-xs text-white/80">
            <span>
              Foto barang {previewFoto.index + 1} dari {previewFoto.urls.length}
            </span>
            <button
              type="button"
              onClick={() => setPreviewFoto(null)}
              className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="relative flex w-[calc(100vw-1.5rem)] max-w-3xl max-h-[calc(100dvh-2rem)] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewFoto.urls[previewFoto.index]}
              alt={`Foto barang ${previewFoto.index + 1}`}
              className="max-h-[75vh] w-auto max-w-full rounded-xl bg-white object-contain shadow-2xl"
            />
            {previewFoto.urls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => stepPreview(-1)}
                  className="absolute left-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  title="Foto sebelumnya"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => stepPreview(1)}
                  className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  title="Foto berikutnya"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}