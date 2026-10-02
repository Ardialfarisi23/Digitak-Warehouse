"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, MapPin, Truck, CheckCircle2, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";

type ApiSuratJalanItem = {
  item_id: number;
  qty: number;
  kondisi?: string | null;
  barang?: { kode_perangkat?: string; nama_barang?: string };
  qty_diterima?: number | null;
  kondisi_diterima?: string | null;
  catatan_penerimaan?: string | null;
  qty_dipick_total?: number | null;
  kondisi_diambil_list?: { kondisi: string; qty: number }[];
};

type ApiSuratJalan = {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: string;
  tanggal?: string;
  gudang_tujuan?: { nama_gudang: string } | null;
  project?: { nama_project: string } | null;
  kendaraan?: { jenis_kendaraan: string; no_polisi: string } | null;
  personil_pengantar?: { nama: string } | null;
  estimasi_tiba?: string | null;
  catatan_distribusi?: string | null;
  items: ApiSuratJalanItem[];
  tujuan_tipe?: string | null;
  titik_lapangan?: { nama_lokasi?: string } | null;
  alamat_lapangan?: string | null;
  dilaporkan_tiba_oleh?: { nama: string } | null;
  dilaporkan_tiba_at?: string | null;
  catatan_tiba?: string | null;
  dikonfirmasi_oleh?: { nama: string } | null;
  dikonfirmasi_at?: string | null;
};

export default function DistributionDetailPage() {
  const params = useParams<{ suratJalanId: string }>();
  const router = useRouter();
  const { get, put } = useApi();

  const [data, setData] = useState<ApiSuratJalan | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [estimasiTiba, setEstimasiTiba] = useState("");
  const [catatan, setCatatan] = useState("");
  const [arrivalQty, setArrivalQty] = useState<Record<number, string>>({});
  const [arrivalKondisi, setArrivalKondisi] = useState<Record<number, string>>({});
  const [arrivalCatatan, setArrivalCatatan] = useState<Record<number, string>>({});
  const [catatanTiba, setCatatanTiba] = useState("");
  const [showArrivalForm, setShowArrivalForm] = useState(false);
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
        const res = await get(`${baseUrl}/api/surat-jalan/${params.suratJalanId}`);
        if (res.status === 404) {
          setData(null);
          return;
        }
        if (!res.ok) throw new Error("Gagal mengambil detail Surat Jalan.");

        const json = await res.json();
        const record: ApiSuratJalan | undefined = json?.data;
        if (!record) {
          setData(null);
          return;
        }

        const qtyMap: Record<number, string> = {};
        const kondisiMap: Record<number, string> = {};
        const catatanMap: Record<number, string> = {};
        for (const item of record.items) {
          qtyMap[item.item_id] = String(item.qty_diterima ?? item.qty_dipick_total ?? 0);
          kondisiMap[item.item_id] = item.kondisi_diterima || (item.kondisi_diambil_list?.[0]?.kondisi) || item.kondisi || "baik";
          catatanMap[item.item_id] = item.catatan_penerimaan || "";
        }
        setArrivalQty(qtyMap);
        setArrivalKondisi(kondisiMap);
        setArrivalCatatan(catatanMap);
        if (record.catatan_tiba) setCatatanTiba(record.catatan_tiba);

        setData(record);
        if (record.estimasi_tiba) {
          const d = new Date(record.estimasi_tiba);
          const pad = (n: number) => String(n).padStart(2, "0");
          setEstimasiTiba(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
        if (record.catatan_distribusi) {
          setCatatan(record.catatan_distribusi);
        }
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Terjadi kesalahan mengambil data."
        );
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.suratJalanId]);

  function showToast(message: string, type: "success" | "error") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

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

  const isDisetujui = data.status === "disetujui";
  const isSedangDikirim = data.status === "sedang_dikirim";
  const isTibaMenunggu = data.status === "tiba_menunggu_konfirmasi";
  const isTerkirim = data.status === "diterima_didistribusikan";

  const tujuanLabel =
    data.tujuan_tipe === "lapangan"
      ? data.alamat_lapangan || "-"
      : data.tujuan_tipe === "gudang"
        ? data.gudang_tujuan?.nama_gudang || "-"
        : data.gudang_tujuan?.nama_gudang || "-";

  const tujuanBadge =
    data.tujuan_tipe === "lapangan" ? (
      <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Lapangan</span>
    ) : data.tujuan_tipe === "gudang" ? (
      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Gudang</span>
    ) : null;

  async function handleStartDelivery() {
    if (!data) return;
    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const payload: Record<string, unknown> = {
        status: "sedang_dikirim",
      };
      if (estimasiTiba) payload.estimasi_tiba = new Date(estimasiTiba).toISOString();
      if (catatan !== undefined) payload.catatan_distribusi = catatan || null;

      const res = await put(
        `${baseUrl}/api/surat-jalan/${params.suratJalanId}/delivery-status`,
        payload
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal memulai pengiriman.");
      }

      showToast("Status pengiriman berhasil dimulai.", "success");
      setTimeout(() => {
        router.push("/staff/outbound");
      }, 1500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReportArrival() {
    if (!data) return;
    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const items = data.items.map((item) => ({
        item_id: item.item_id,
        qty_diterima: Number(arrivalQty[item.item_id] ?? 0),
        kondisi_diterima: arrivalKondisi[item.item_id] || item.kondisi || "baik",
        catatan_penerimaan: arrivalCatatan[item.item_id] || null,
      }));

      const payload: Record<string, unknown> = {
        status: "tiba_menunggu_konfirmasi",
        items,
        catatan_tiba: catatanTiba || null,
      };

      const res = await put(
        `${baseUrl}/api/surat-jalan/${params.suratJalanId}/delivery-status`,
        payload
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal melapor barang sampai.");
      }

      showToast("Laporan barang sampai berhasil dikirim.", "success");
      setShowArrivalForm(false);
      setTimeout(() => {
        router.push("/staff/outbound");
      }, 1500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
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

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Informasi Kendaraan
          </p>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-400">Jenis</p>
              <p className="font-semibold text-gray-900">{data.kendaraan?.jenis_kendaraan || "-"}</p>
            </div>
            <div>
              <p className="text-gray-400">No Polisi</p>
              <p className="font-semibold text-gray-900">{data.kendaraan?.no_polisi || "-"}</p>
            </div>
            <div>
              <p className="text-gray-400">Driver</p>
              <p className="font-semibold text-gray-900">{data.personil_pengantar?.nama || "-"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6 lg:col-span-2">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Status Distribusi
          </p>
          <div className="flex items-center gap-3">
            {isDisetujui && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <Truck size={14} />
                Disetujui — Siap Kirim
              </span>
            )}
            {isSedangDikirim && (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                <Truck size={14} />
                Sedang Dikirim
              </span>
            )}
            {isTibaMenunggu && (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <Clock size={14} />
                Menunggu Konfirmasi SPV
              </span>
            )}
            {isTerkirim && (
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
                <CheckCircle2 size={14} />
                Terkirim / Diterima
              </span>
            )}
          </div>

          {isSedangDikirim && data.estimasi_tiba && (
            <p className="mt-3 text-sm text-gray-600">
              Estimasi tiba:{" "}
              {new Date(data.estimasi_tiba).toLocaleString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          {data.catatan_distribusi && (
            <p className="mt-2 text-sm text-gray-600">
              Catatan: {data.catatan_distribusi}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Daftar Barang
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-3 pr-4 font-semibold">Barang</th>
              <th className="pb-3 pr-4 font-semibold">Kondisi</th>
              <th className="pb-3 pr-4 font-semibold text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.item_id} className="border-b border-gray-50 last:border-0">
                <td className="py-3 pr-4">
                  <p className="font-medium text-gray-800">{item.barang?.nama_barang || "-"}</p>
                  <p className="text-xs text-gray-400">{item.barang?.kode_perangkat || "-"}</p>
                </td>
                <td className="py-3 pr-4 text-gray-600">{item.kondisi || "-"}</td>
                <td className="py-3 pr-4 text-right text-gray-600">{item.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDisetujui && (
        <div className="mt-6 rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Mulai Pengiriman
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Estimasi Tiba</label>
              <input
                type="datetime-local"
                value={estimasiTiba}
                onChange={(e) => setEstimasiTiba(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Catatan Distribusi</label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                placeholder="Tambahkan catatan jika diperlukan..."
              />
            </div>
            <Button
              disabled={submitting}
              onClick={handleStartDelivery}
              className="h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
            >
              {submitting ? "Menyimpan..." : "Mulai Pengiriman"}
            </Button>
          </div>
        </div>
      )}

      {isSedangDikirim && !showArrivalForm && (
        <div className="mt-6 rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Lapor Barang Sampai
          </p>
          <p className="mb-4 text-sm text-gray-600">
            Laporkan jumlah dan kondisi barang yang sudah sampai ke site.
          </p>
          <Button
            onClick={() => setShowArrivalForm(true)}
            className="h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F]"
          >
            Lapor Barang Sampai
          </Button>
        </div>
      )}

      {isSedangDikirim && showArrivalForm && (
        <div className="mt-6 rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Lapor Barang Sampai
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Catatan Tiba</label>
              <textarea
                value={catatanTiba}
                onChange={(e) => setCatatanTiba(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                placeholder="Catatan umum saat barang sampai..."
              />
            </div>
            <div className="space-y-3">
              {data.items.map((item) => (
                <div key={item.item_id} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-sm font-medium text-gray-800">
                    {item.barang?.nama_barang || "-"} <span className="text-xs text-gray-400">({item.barang?.kode_perangkat || "-"})</span>
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Qty Diterima</label>
                      <input
                        type="number"
                        min={0}
                        max={Number(item.qty_dipick_total ?? item.qty ?? 0)}
                        value={arrivalQty[item.item_id] ?? 0}
                        onChange={(e) => setArrivalQty((prev) => ({ ...prev, [item.item_id]: e.target.value }))}
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#E8632C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Kondisi Diterima</label>
                      <select
                        value={arrivalKondisi[item.item_id] || item.kondisi || "baik"}
                        onChange={(e) => setArrivalKondisi((prev) => ({ ...prev, [item.item_id]: e.target.value }))}
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#E8632C] focus:outline-none"
                      >
                        <option value="baik">Baik</option>
                        <option value="rusak_ringan">Rusak Ringan</option>
                        <option value="rusak_berat">Rusak Berat</option>
                        <option value="tidak_sesuai_spek">Tidak Sesuai Spek</option>
                        <option value="doa">DOA</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Catatan Penerimaan</label>
                      <input
                        type="text"
                        value={arrivalCatatan[item.item_id] || ""}
                        onChange={(e) => setArrivalCatatan((prev) => ({ ...prev, [item.item_id]: e.target.value }))}
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#E8632C] focus:outline-none"
                        placeholder="Opsional"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                disabled={submitting}
                onClick={handleReportArrival}
                className="h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
              >
                {submitting ? "Menyimpan..." : "Kirim Laporan Tiba"}
              </Button>
              <button
                type="button"
                onClick={() => setShowArrivalForm(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {isTibaMenunggu && (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <p className="mb-2 text-sm font-semibold text-blue-800">Menunggu Konfirmasi SPV</p>
          <p className="mb-4 text-sm text-blue-700">Barang sudah dilaporkan tiba. Menunggu konfirmasi dari supervisor.</p>
          {data.dilaporkan_tiba_oleh?.nama && (
            <p className="text-xs text-blue-600">Dilaporkan oleh: {data.dilaporkan_tiba_oleh.nama}</p>
          )}
          {data.dilaporkan_tiba_at && (
            <p className="text-xs text-blue-600">Waktu lapor: {new Date(data.dilaporkan_tiba_at).toLocaleString("id-ID")}</p>
          )}
          {data.catatan_tiba && (
            <p className="mt-2 text-sm text-blue-700">Catatan: {data.catatan_tiba}</p>
          )}
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
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}