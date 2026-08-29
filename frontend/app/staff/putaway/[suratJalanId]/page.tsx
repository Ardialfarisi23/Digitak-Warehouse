"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, PackagePlus, Loader2, AlertCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";

// ---------------------------------------------------------------------------
// Bentuk respons GET /api/surat-jalan/:id dan GET /api/zones (sudah include
// gudang + raks + bins bersarang dalam satu response).
// ---------------------------------------------------------------------------
type ApiSuratJalanItem = {
  item_id: number;
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
  gudang_tujuan_id?: number | null;
  gudang_asal?: { nama_gudang: string } | null;
  gudang_tujuan?: { nama_gudang: string } | null;
  items: ApiSuratJalanItem[];
};

type ApiZona = {
  zona_id: number;
  gudang_id: number;
  kode_zona: string;
  nama_zona?: string | null;
  tipe_zona?: string | null;
};

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

  // Zona yang relevan cuma yang ada di Gudang Tujuan Surat Jalan ini.
  const zonasForGudang = useMemo(() => {
    if (!data?.gudang_tujuan_id) return [];
    return zonas.filter((z) => Number(z.gudang_id) === Number(data.gudang_tujuan_id));
  }, [zonas, data]);

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
          onClick={() => router.push("/staff/putaway")}
          className="mt-3 text-sm font-semibold text-[#E8632C] hover:underline"
        >
          Kembali ke daftar Putaway
        </button>
      </div>
    );
  }

  const isSelesai = data.status === "diterima_didistribusikan";

  function zonaLabel(z: ApiZona): string {
    const nama = z.nama_zona || z.kode_zona;
    return z.tipe_zona ? `${nama} — ${z.tipe_zona}` : nama;
  }

  const allAssigned = data.items.every((it) => !!zonaByItem[it.item_id]);

  async function handleSubmit() {
    if (!allAssigned || !data) return;

    const resolvedItems = data.items.map((it) => {
      const zonaId = zonaByItem[it.item_id];
      return { item_id: it.item_id, zona_id: Number(zonaId), qty_ditempatkan: Number(it.qty) };
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

      router.push("/staff/putaway");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSubmitting(false);
    }
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

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-3 pr-4 font-semibold">Barang</th>
              <th className="pb-3 pr-4 font-semibold">Kondisi</th>
              <th className="pb-3 pr-4 font-semibold text-right">Qty</th>
              {!isSelesai && <th className="pb-3 font-semibold">Zona</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.item_id} className="border-b border-gray-50 last:border-0 align-top">
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
                <td className="py-3 pr-4 text-gray-600">{item.kondisi || "-"}</td>
                <td className="py-3 pr-4 text-right text-gray-600">{item.qty}</td>

                {!isSelesai && (
                  <td className="py-3">
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
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isSelesai && (
        <Button
          disabled={!allAssigned || submitting || zonasForGudang.length === 0}
          onClick={handleSubmit}
          className="mt-5 h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
        >
          {submitting ? "Menyimpan..." : "Konfirmasi Penempatan"}
        </Button>
      )}
    </div>
  );
}