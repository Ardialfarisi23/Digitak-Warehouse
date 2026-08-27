"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PackagePlus, AlertTriangle, ArrowLeft, FileDown, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { downloadInboundPdf } from "@/lib/staff/inbound-pdf";
import type { InboundSuratJalan as InboundPdfShape } from "@/lib/staff/inbound-store";

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
  qty: number; // PENTING: field ini akan DITIMPA jadi qty aktual pas submit.
  kondisi?: string | null;
  serial_number?: string | null;
  catatan?: string | null;
  is_kelebihan?: boolean;
  barang?: ApiBarang;
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
};

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
  const { get, post } = useApi();
  const { user } = useAuth();

  const [data, setData] = useState<ApiSuratJalan | null | undefined>(undefined);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  const allKondisiFilled = items.every((i) => i.qtyDiterima === 0 || i.kondisi !== "");
  const unresolvedExcessIndexes = items
    .map((i, idx) => ({ i, idx }))
    .filter(({ i }) => i.qtyDiterima > i.qtyRencana && !i.isKelebihan)
    .map(({ idx }) => idx);
  const hasUnresolvedExcess = unresolvedExcessIndexes.length > 0;
  const canSubmit = allKondisiFilled && items.some((i) => i.qtyDiterima > 0);

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
        asalGudang: data.gudang_asal?.nama_gudang || "-",
        tujuanGudang: data.gudang_tujuan?.nama_gudang || "-",
        kendaraan: data.kendaraan ? `${data.kendaraan.jenis_kendaraan}${data.kendaraan.merk ? " " + data.kendaraan.merk : ""}` : "-",
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
            Dari {data.gudang_asal?.nama_gudang || "-"} • Tujuan: {data.gudang_tujuan?.nama_gudang || "-"} •{" "}
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
              <th className="pb-3 font-semibold">Serial Number</th>
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
    </div>
  );
}
