"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PackagePlus, AlertTriangle, ArrowLeft, FileDown, Loader2, AlertCircle, ExternalLink, Upload, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { downloadInboundPdf } from "@/lib/staff/inbound-pdf";
import type { InboundSuratJalan as InboundPdfShape } from "@/lib/staff/inbound-pdf";

// ---------------------------------------------------------------------------
// Struktur respons API GET /api/surat-jalan/:id, sesuai `baseInclude` di
// surat-jalan.repository.js. Cuma field yang benar-benar dipakai halaman
// ini yang dideklarasikan di sini.
// ---------------------------------------------------------------------------
type ApiBarang = {
  barang_id: number;
  kode_perangkat?: string;
  nama_barang?: string;
};

type ApiSuratJalanItem = {
  item_id: number;
  barang_id: number;
  qty: number;
  kondisi?: string | null;
  serial_number?: string | null;
  catatan?: string | null;
  is_kelebihan?: boolean;
  barang?: ApiBarang;
  zona?: {
    zona_id: number;
    kode_zona?: string;
    nama_zona?: string;
    tipe_zona?: string;
  } | null;
  fotos?: Array<{
    foto_id: number;
    url: string;
    filename?: string;
    mimetype?: string;
    ukuran_bytes?: number;
    created_at?: string;
  }>;
};

type ApiSuratJalan = {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  tipe: "inbound" | "outbound";
  status: string;
  tanggal?: string;
  items: ApiSuratJalanItem[];
  gudang_asal?: { nama_gudang: string } | null;
  gudang_tujuan?: { nama_gudang: string } | null;
  kendaraan?: { jenis_kendaraan: string; merk?: string; no_polisi: string } | null;
  personil_pengantar?: { nama: string } | null;
  project?: { nama_project: string } | null;
  creator?: { nama?: string; name?: string } | null;
  boq_id?: number | string | null;
  boq?: {
    boq_id: number;
    boq_number?: string;
    tiket?: { kode_tiket: string };
  } | null;
  tujuan_tipe?: string | null;
  titik_lapangan?: { nama_lokasi?: string } | null;
  tipe_pengirim?: string | null;
  pengirim_eksternal_nama?: string | null;
}

// Baris yang staf edit di layar — qtyRencana disnapshot SEKALI pas fetch,
// sebelum staf mulai ubah qty (backend nggak nyimpen qty rencana terpisah,
// begitu di-submit field `qty` yang sama ditimpa jadi qty aktual).
type EditableItem = {
  itemId: number;
  kodeBarang: string;
  namaBarang: string;
  qtyRencana: number;
  qtyDiterima: number;
  kondisi: string;
  serialNumber: string;
  isKelebihan: boolean;
  catatanKelebihan: string;
  fotos: Array<{
    foto_id: number;
    url: string;
    filename?: string;
  }>;
};

// ASUMSI: value kondisi dikirim sebagai string bebas (schema backend nggak
// membatasi enum), tapi kode lain di service.js (mis. stok_gudang) selalu
// pakai lowercase kayak "baik" — jadi dipilih lowercase biar konsisten,
// bukan "Baik"/"Rusak Ringan" kayak versi localStorage sebelumnya.
const KONDISI_OPTIONS: { value: string; label: string }[] = [
  { value: "baik", label: "Baik" },
  { value: "rusak_ringan", label: "Rusak Ringan" },
  { value: "rusak_berat", label: "Rusak Berat" },
  { value: "tidak_sesuai_spek", label: "Tidak Sesuai Spek" },
  { value: "doa", label: "DOA" },
];

const KONDISI_TONE: Record<string, string> = {
  baik: "bg-emerald-50 text-emerald-600 border-emerald-200",
  rusak_ringan: "bg-amber-50 text-amber-600 border-amber-200",
  rusak_berat: "bg-rose-50 text-rose-600 border-rose-200",
  tidak_sesuai_spek: "bg-orange-50 text-[#E8632C] border-orange-200",
  doa: "bg-gray-100 text-gray-600 border-gray-300",
};

export default function InboundDetailPage() {
  const params = useParams<{ suratJalanId: string }>();
  const router = useRouter();
  const { get, post, del } = useApi();
  const { user } = useAuth();

  const [data, setData] = useState<ApiSuratJalan | null | undefined>(undefined);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState<Record<number, boolean>>({});
  const [fotoErrors, setFotoErrors] = useState<Record<number, string | null>>({});
  const [showFotoSuccessModal, setShowFotoSuccessModal] = useState(false);
  const [showFotoErrorModal, setShowFotoErrorModal] = useState(false);
  const [fotoModalMessage, setFotoModalMessage] = useState("");

  const [showExcessModal, setShowExcessModal] = useState(false);
  const [excessNotesDraft, setExcessNotesDraft] = useState<Record<number, string>>({});

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
        if (!res.ok) throw new Error("Gagal mengambil detail Surat Jalan Inbound.");

        const json = await res.json();
        const record: ApiSuratJalan | undefined = json?.data;
        if (!record) {
          setData(null);
          return;
        }

        setData(record);
        // Snapshot qty rencana SEKARANG, sebelum staf mulai edit apa pun.
        setItems(
          record.items.map((it) => ({
            itemId: it.item_id,
            kodeBarang: it.barang?.kode_perangkat || "-",
            namaBarang: it.barang?.nama_barang || "-",
            qtyRencana: it.qty,
            qtyDiterima: it.qty,
            kondisi: it.kondisi || "",
            serialNumber: it.serial_number || "",
            isKelebihan: false,
            catatanKelebihan: it.catatan || "",
            fotos: (it.fotos || []).map((f) => ({
              foto_id: f.foto_id,
              url: f.url,
              filename: f.filename,
            })),
          })),
        );
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Terjadi kesalahan mengambil data.");
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.suratJalanId]);

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
        <p className="text-gray-500">Surat Jalan Inbound tidak ditemukan.</p>
        <button onClick={() => router.push("/staff/inbound")} className="mt-3 text-sm font-semibold text-[#E8632C] hover:underline">
          Kembali ke daftar Inbound
        </button>
      </div>
    );
  }

  function updateItem(index: number, patch: Partial<EditableItem>) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function handleQtyDiterimaChange(index: number, value: number) {
    const qty = Math.max(0, value);
    const item = items[index];
    if (qty <= item.qtyRencana && item.isKelebihan) {
      updateItem(index, { qtyDiterima: qty, isKelebihan: false, catatanKelebihan: "" });
    } else {
      updateItem(index, { qtyDiterima: qty });
    }
  }

  async function handleFotoUpload(index: number, file: File) {
    setFotoErrors((prev) => ({ ...prev, [index]: null }));
    setUploadingFoto((prev) => ({ ...prev, [index]: true }));

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await post(`${baseUrl}/api/upload`, formData);

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => null);
        throw new Error(err?.message || "Gagal upload foto.");
      }

      const uploadData = await uploadRes.json();
      const fotoUrl = uploadData?.data?.url;

      if (!fotoUrl) {
        throw new Error("URL foto tidak ditemukan.");
      }

      const saveRes = await post(
        `${baseUrl}/api/surat-jalan/${params.suratJalanId}/items/${items[index].itemId}/fotos`,
        {
          url: fotoUrl,
          filename: file.name,
          mimetype: file.type,
          ukuran_bytes: file.size,
        }
      );

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => null);
        throw new Error(err?.message || "Gagal menyimpan foto.");
      }

      const saveData = await saveRes.json();
      const newFoto = saveData?.data;

      if (newFoto) {
        updateItem(index, {
          fotos: [...(items[index].fotos || []), newFoto],
        });
      }

      setFotoModalMessage("Foto berhasil diupload.");
      setShowFotoSuccessModal(true);
    } catch (err) {
      setFotoErrors((prev) => ({
        ...prev,
        [index]: err instanceof Error ? err.message : "Gagal upload foto.",
      }));
      setFotoModalMessage(err instanceof Error ? err.message : "Upload foto gagal, silakan coba lagi.");
      setShowFotoErrorModal(true);
    } finally {
      setUploadingFoto((prev) => ({ ...prev, [index]: false }));
    }
  }

  async function handleFotoDelete(index: number, fotoId: number) {
    setFotoErrors((prev) => ({ ...prev, [index]: null }));

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await del(`${baseUrl}/api/surat-jalan/${params.suratJalanId}/items/${items[index].itemId}/fotos/${fotoId}`);

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal menghapus foto.");
      }

      updateItem(index, {
        fotos: items[index].fotos?.filter((f) => f.foto_id !== fotoId) || [],
      });
    } catch (err) {
      setFotoErrors((prev) => ({
        ...prev,
        [index]: err instanceof Error ? err.message : "Gagal menghapus foto.",
      }));
    }
  }

  const allKondisiFilled = items.every((i) => i.qtyDiterima === 0 || i.kondisi !== "");
  const unresolvedExcessIndexes = items
    .map((i, idx) => ({ i, idx }))
    .filter(({ i }) => i.qtyDiterima > i.qtyRencana && !i.isKelebihan)
    .map(({ idx }) => idx);
  const hasUnresolvedExcess = unresolvedExcessIndexes.length > 0;
  const canSubmit = allKondisiFilled && items.some((i) => i.qtyDiterima > 0);

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

  function handleSubmitClick() {
    if (!canSubmit) return;

    if (hasUnresolvedExcess) {
      const defaults: Record<number, string> = {};
      unresolvedExcessIndexes.forEach((idx) => {
        defaults[idx] = excessNotesDraft[idx] || `Kelebihan kiriman dari Surat Jalan #${data.nomor_surat_jalan}`;
      });
      setExcessNotesDraft(defaults);
      setShowExcessModal(true);
      return;
    }

    doSave(items);
  }

  function handleConfirmExcessAndSave() {
    const updated = items.map((item, idx) => {
      if (unresolvedExcessIndexes.includes(idx)) {
        return {
          ...item,
          isKelebihan: true,
          catatanKelebihan: (excessNotesDraft[idx] || "").trim(),
        };
      }
      return item;
    });
    setItems(updated);
    setShowExcessModal(false);
    doSave(updated);
  }

  async function doSave(finalItems: EditableItem[]) {
    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const payload = {
        items: finalItems
          .filter((i) => i.qtyDiterima > 0)
          .map((i) => ({
            item_id: i.itemId,
            qty: i.qtyDiterima,
            kondisi: i.kondisi || null,
            serial_number: i.serialNumber || null,
            catatan: i.catatanKelebihan || null,
            // TODO(backend): baris ini baru berfungsi setelah
            // receiveInboundSchema & receiveInbound() di backend ditambah
            // dukungan is_kelebihan (lihat catatan sebelumnya).
            is_kelebihan: i.isKelebihan,
          })),
      };

      const res = await post(`${baseUrl}/api/surat-jalan/${params.suratJalanId}/receive-inbound`, payload);

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal menyimpan hasil pencocokan barang.");
      }

      router.push("/staff/inbound");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadPdf() {
    if (!data) return;
    setDownloadingPdf(true);
    try {
      // Adaptasi bentuk data API -> tipe yang dipakai InboundPdfDocument
      // (masih sama dari versi localStorage). ASUMSI: "creator" (pembuat
      // record) dipakai sebagai PIC Pemohon — skema baru nggak punya field
      // PIC terpisah. Sesuaikan kalau ternyata ada field lain yang lebih pas.
      const pdfShape: InboundPdfShape = {
        id: String(data.surat_jalan_id),
        nomor: data.nomor_surat_jalan,
        namaProject: data.project?.nama_project || "-",
        asalGudang: pengirimLabel,
        tujuanGudang: data.gudang_tujuan?.nama_gudang || "-",
        kendaraan: kendaraanLabel,
        noPolisi: data.kendaraan?.no_polisi || "-",
        namaDriver: data.personil_pengantar?.nama || "-",
        namaPicPemohon: data.creator?.nama || data.creator?.name || "-",
        tanggal: data.tanggal
          ? new Date(data.tanggal).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : "-",
        items: items.map((i) => ({
          kodeBarang: i.kodeBarang,
          namaBarang: i.namaBarang,
          qtyDiminta: i.qtyRencana,
          qtyDiterima: i.qtyDiterima,
          kondisi: i.kondisi as any,
          serialNumbers: i.serialNumber ? [i.serialNumber] : [],
        })),
        status: "MENUNGGU_VERIFIKASI",
      };

      await downloadInboundPdf(pdfShape, user?.name ?? "Staf Gudang");
    } finally {
      setDownloadingPdf(false);
    }
  }

  const excessNoteFilled = unresolvedExcessIndexes.every((idx) => (excessNotesDraft[idx] || "").trim().length > 0);

  // Helper untuk menentukan label pengirim (internal: gudang_asal, external: pengirim_eksternal_nama)
  const pengirimLabel =
    data.tipe_pengirim === "internal"
      ? data.gudang_asal?.nama_gudang || "-"
      : data.tipe_pengirim === "external"
        ? data.pengirim_eksternal_nama || "-"
        : data.gudang_asal?.nama_gudang || "-";

  // Helper untuk format kendaraan: "Merk - Tipe Kendaraan"
  const kendaraanLabel = data.kendaraan
    ? data.kendaraan.merk && data.kendaraan.merk.trim()
      ? `${data.kendaraan.merk} - ${data.kendaraan.jenis_kendaraan}`
      : data.kendaraan.jenis_kendaraan
    : "-";

  return (
    <div className="px-8 py-6">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => router.push("/staff/inbound")} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} />
          Kembali
        </button>

        <button onClick={handleDownloadPdf} disabled={downloadingPdf} className="flex items-center gap-1.5 rounded-lg border border-[#F3D9C7] bg-white px-3 py-1.5 text-sm font-medium text-[#E8632C] hover:bg-[#FDECE1] disabled:opacity-50">
          {downloadingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
          {downloadingPdf ? "Menyiapkan PDF..." : "Download PDF"}
        </button>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{data.nomor_surat_jalan}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Dari {pengirimLabel} • Tujuan:{" "}
            <span>
              {tujuanLabel}
              {tujuanBadge}
            </span>{" "}
            •{" "}
            {data.tanggal
              ? new Date(data.tanggal).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "-"}
          </p>
        </div>
      </div>

      {/* BOQ / Tiket info */}
      <div className="mb-6 rounded-2xl border border-[#F3D9C7] bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">BOQ / Tiket</p>
        {data.boq_id ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/dashboard/boq"
              className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100"
            >
              <ExternalLink size={12} />
              {data.boq?.boq_number || `BOQ #${data.boq_id}`}
            </Link>
            <span className="text-xs text-slate-500">
              Tiket: {data.boq?.tiket?.kode_tiket || "-"}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Tidak terhubung ke BOQ/Tiket</span>
        )}
      </div>

      {/* Tabel pencocokan barang */}
      <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Cocokkan Barang & Catat Kondisi</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-3 pr-4 font-semibold">Kode Barang</th>
              <th className="pb-3 pr-4 font-semibold">Nama Barang</th>
              <th className="pb-3 pr-4 font-semibold text-right">Qty Rencana</th>
              <th className="pb-3 pr-6 font-semibold text-right">Qty Diterima</th>
              <th className="pb-3 pr-4 font-semibold">Kondisi</th>
              <th className="pb-3 pr-4 font-semibold">Lokasi/Zona</th>
              <th className="pb-3 font-semibold">Serial Number</th>
              <th className="pb-3 font-semibold">Foto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const selisih = item.qtyDiterima - item.qtyRencana;
              const adaKelebihan = selisih > 0;
              return (
                <tr key={item.itemId} className="border-b border-gray-50 last:border-0 align-top">
                  <td className="py-3 pr-4 font-medium text-gray-800">{item.kodeBarang}</td>
                  <td className="py-3 pr-4 text-gray-600">{item.namaBarang}</td>
                  <td className="py-3 pr-4 text-right text-gray-500">{item.qtyRencana}</td>
                  <td className="py-3 pr-6">
                    <input
                      type="number"
                      min={0}
                      value={item.qtyDiterima}
                      onChange={(e) => handleQtyDiterimaChange(index, Number(e.target.value))}
                      className="w-20 rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-[#E8632C] focus:outline-none"
                    />
                    {adaKelebihan && (
                      <div className="mt-1.5">
                        {item.isKelebihan ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <PackagePlus size={12} />
                            Kelebihan {selisih} unit dicatat
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold text-[#E8632C]">
                            <AlertTriangle size={12} />+{selisih} lebih — perlu catatan kelebihan
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={item.kondisi}
                      onChange={(e) => updateItem(index, { kondisi: e.target.value })}
                      disabled={item.qtyDiterima === 0}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium focus:outline-none disabled:opacity-40 ${item.kondisi ? KONDISI_TONE[item.kondisi] : "border-gray-200 text-gray-500"}`}
                    >
                      <option value="">Pilih kondisi...</option>
                      {KONDISI_OPTIONS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                     </select>
                  </td>
                   <td className="py-3 pr-4 text-xs text-gray-600">
                     {item.zona ? (
                       <span className="font-medium text-gray-800">
                         {item.zona.gudang?.nama_gudang ?? "-"} / {item.zona.nama_zona || item.zona.kode_zona}
                         {item.zona.tipe_zona ? (
                           <span className="ml-1 text-gray-400">— {item.zona.tipe_zona}</span>
                         ) : null}
                       </span>
                     ) : (
                       <span className="text-gray-500">Belum ditempatkan</span>
                     )}
                   </td>
                  <td className="py-3">
                    {item.qtyDiterima === 0 ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <input
                        value={item.serialNumber}
                        onChange={(e) => updateItem(index, { serialNumber: e.target.value })}
                        placeholder="Serial Number (opsional)"
                        className="w-44 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-[#E8632C] focus:outline-none"
                      />
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {item.fotos?.map((foto) => (
                          <div key={foto.foto_id} className="relative h-14 w-14 overflow-hidden rounded-lg border border-gray-200">
                            <img src={foto.url} alt={foto.filename || "Foto barang"} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleFotoDelete(index, foto.foto_id)}
                              className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5 text-gray-500 shadow-sm hover:text-rose-600"
                              title="Hapus foto"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-[#E8632C] hover:text-[#E8632C]">
                          <Upload size={12} />
                          {uploadingFoto[index] ? "Uploading..." : "Upload Foto"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingFoto[index]}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFotoUpload(index, file);
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      {fotoErrors[index] && (
                        <p className="text-[11px] text-rose-600">{fotoErrors[index]}</p>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button disabled={!canSubmit || submitting} onClick={handleSubmitClick} className="mt-5 h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40">
        {submitting ? "Menyimpan..." : "Simpan & Ajukan Verifikasi"}
      </Button>

      {/* Modal gabungan catatan kelebihan */}
      {showExcessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowExcessModal(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <PackagePlus size={16} className="text-[#E8632C]" />
              Catat Kelebihan Barang
            </p>
            <p className="mb-4 text-xs text-gray-500">Ada {unresolvedExcessIndexes.length} barang yang qty diterimanya melebihi rencana. Isi catatan kelebihan buat masing-masing sebelum bisa disimpan.</p>

            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {unresolvedExcessIndexes.map((idx) => {
                const item = items[idx];
                const selisih = item.qtyDiterima - item.qtyRencana;
                return (
                  <div key={item.itemId} className="rounded-xl border border-gray-100 p-3">
                    <p className="text-sm font-semibold text-gray-800">{item.namaBarang}</p>
                    <p className="mb-2 text-xs text-gray-500">
                      Diterima {item.qtyDiterima} unit, rencana {item.qtyRencana} unit — selisih <span className="font-semibold text-gray-900">{selisih} unit</span>
                    </p>
                    <textarea
                      value={excessNotesDraft[idx] || ""}
                      onChange={(e) => setExcessNotesDraft((prev) => ({ ...prev, [idx]: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowExcessModal(false)} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Batal
              </button>
              <Button onClick={handleConfirmExcessAndSave} disabled={!excessNoteFilled || submitting} className="h-auto rounded-full bg-[#E8632C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40">
                {submitting ? "Menyimpan..." : "Simpan & Ajukan Verifikasi"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showFotoSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setShowFotoSuccessModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center px-6 py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Foto Berhasil Diupload</h3>
              <p className="mt-2 text-sm text-gray-500">{fotoModalMessage}</p>
              <button
                type="button"
                onClick={() => setShowFotoSuccessModal(false)}
                className="mt-6 w-full rounded-xl bg-[#E8632C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D9591F]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showFotoErrorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setShowFotoErrorModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center px-6 py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Upload Foto Gagal</h3>
              <p className="mt-2 text-sm text-gray-500">{fotoModalMessage}</p>
              <button
                type="button"
                onClick={() => setShowFotoErrorModal(false)}
                className="mt-6 w-full rounded-xl bg-[#E8632C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D9591F]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
