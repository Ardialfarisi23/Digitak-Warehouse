"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PackagePlus, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";

type KondisiPerangkat = "Baik" | "Rusak Ringan" | "Rusak Berat" | "Tidak Sesuai Spek" | "DOA";

const KONDISI_OPTIONS: KondisiPerangkat[] = [
  "Baik",
  "Rusak Ringan",
  "Rusak Berat",
  "Tidak Sesuai Spek",
  "DOA",
];

const KONDISI_TONE: Record<KondisiPerangkat, string> = {
  Baik: "bg-emerald-50 text-emerald-600 border-emerald-200",
  "Rusak Ringan": "bg-amber-50 text-amber-600 border-amber-200",
  "Rusak Berat": "bg-rose-50 text-rose-600 border-rose-200",
  "Tidak Sesuai Spek": "bg-orange-50 text-[#E8632C] border-orange-200",
  DOA: "bg-gray-100 text-gray-600 border-gray-300",
};

interface InboundItem {
  item_id: number;
  barang_id: number;
  qty: number;
  qtyDiminta: number;
  satuan_id: number;
  kondisi: string | null;
  serial_number: string | null;
  foto_url: string | null;
  barang?: { nama_barang: string; kode_perangkat: string };
  satuan?: { kode_satuan: string };
  serialNumbers?: string[];
  kelebihan?: { qty: number; catatan: string };
  keterangan?: string | null;
}

interface InboundSuratJalan {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: string;
  created_at: string;
  notes?: string;
  items: InboundItem[];
  pengirim_or_vendor?: string;
  gudang_tujuan?: { nama_gudang: string };
  project?: { nama_project: string };
}

export default function InboundDetailPage() {
  const params = useParams<{ suratJalanId: string }>();
  const router = useRouter();
  const { get, post } = useApi();

  const [data, setData] = useState<InboundSuratJalan | null | undefined>(undefined);
  const [items, setItems] = useState<InboundItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showExcessModal, setShowExcessModal] = useState(false);
  const [excessNotesDraft, setExcessNotesDraft] = useState<Record<number, string>>({});

  useEffect(() => {
    async function loadData() {
      setData(undefined);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await get(`${baseUrl}/api/surat-jalan/${params.suratJalanId}`);
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.message || "Gagal mengambil detail inbound.");
        }
        const json = await response.json();
        const record = json?.data ?? json;
        setData(record || null);

        if (record?.items?.length > 0) {
          setItems(
            record.items.map((i: InboundItem) => ({
              ...i,
              qtyDiterima: Number(i.qty || 0),
              qtyDiminta: Number(i.qty || 0),
              serialNumbers: i.serial_number ? [i.serial_number] : [],
              kelebihan: undefined,
            }))
          );
        } else {
          setItems([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
        setData(null);
      }
    }

    loadData();
  }, [get, params.suratJalanId]);

  if (data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#E8632C]" />
      </div>
    );
  }

  if (data === null || error) {
    return (
      <div className="px-8 py-6">
        <p className="text-gray-500">{error || "Surat Jalan Inbound tidak ditemukan."}</p>
        <button
          onClick={() => router.push("/staff/inbound")}
          className="mt-3 text-sm font-semibold text-[#E8632C] hover:underline"
        >
          Kembali ke daftar Inbound
        </button>
      </div>
    );
  }

  function updateItem(index: number, patch: Partial<InboundItem>) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch } as InboundItem;
      return next;
    });
  }

  function handleQtyDiterimaChange(index: number, value: number) {
    const qty = Math.max(0, value);
    const item = items[index];

    if (qty <= item.qtyDiminta && item.kelebihan) {
      updateItem(index, { qty, kelebihan: undefined });
    } else {
      updateItem(index, { qty });
    }
  }

  function handleSerialChange(index: number, value: string) {
    updateItem(index, { serial_number: value || null });
  }

  function handleKondisiChange(index: number, value: string) {
    updateItem(index, { kondisi: value || null });
  }

  const allKondisiFilled = items.every((i) => i.qty === 0 || (i.kondisi && i.kondisi.trim() !== ""));
  const unresolvedExcessIndexes = items
    .map((i, idx) => ({ i, idx }))
    .filter(({ i }) => (i.qty || 0) > i.qtyDiminta && !i.kelebihan)
    .map(({ idx }) => idx);
  const hasUnresolvedExcess = unresolvedExcessIndexes.length > 0;
  const canSubmit = allKondisiFilled && items.some((i) => (i.qty || 0) > 0);

  async function doSave(finalItems: InboundItem[]) {
    setSubmitting(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const adjustments = finalItems.map((item) => ({
        item_id: item.item_id,
        qty: item.qty,
        kondisi: item.kondisi || null,
        serial_number: item.serial_number || null,
        catatan: item.keterangan || null,
      }));

      const response = await post(`${baseUrl}/api/surat-jalan/${params.suratJalanId}/receive-inbound`, {
        items: adjustments,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal menyimpan penerimaan inbound.");
      }

      router.push("/staff/inbound");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmitClick() {
    if (!canSubmit) return;

    if (hasUnresolvedExcess) {
      const defaults: Record<number, string> = {};
      unresolvedExcessIndexes.forEach((idx) => {
        defaults[idx] = excessNotesDraft[idx] || `Kelebihan kiriman dari Surat Jalan #${data!.nomor_surat_jalan}`;
      });
      setExcessNotesDraft(defaults);
      setShowExcessModal(true);
      return;
    }

    doSave(items);
  }

  function handleConfirmExcessAndSave() {
    const updatedItems = items.map((item, idx) => {
      if (unresolvedExcessIndexes.includes(idx)) {
        return {
          ...item,
          kelebihan: { qty: (item.qty || 0) - item.qtyDiminta, catatan: (excessNotesDraft[idx] || "").trim() },
        };
      }
      return item;
    });

    setItems(updatedItems);
    setShowExcessModal(false);
    doSave(updatedItems);
  }

  const excessNoteFilled = unresolvedExcessIndexes.every((idx) =>
    (excessNotesDraft[idx] || "").trim().length > 0
  );

  return (
    <div className="px-8 py-6">
      <button
        onClick={() => router.push("/staff/inbound")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{data.nomor_surat_jalan}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Dari {data.pengirim_or_vendor || "-"} • Tujuan: {data.gudang_tujuan?.nama_gudang || "-"} • {new Date(data.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* Tabel pencocokan barang */}
      <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Cocokkan Barang & Catat Kondisi
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-3 pr-4 font-semibold">Kode Barang</th>
              <th className="pb-3 pr-4 font-semibold">Nama Barang</th>
              <th className="pb-3 pr-4 font-semibold text-right">Qty di SJ</th>
              <th className="pb-3 pr-6 font-semibold text-right">Qty Diterima</th>
              <th className="pb-3 pr-4 font-semibold">Kondisi</th>
              <th className="pb-3 font-semibold">Serial Number</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const selisih = (item.qty || 0) - item.qtyDiminta;
              const adaKelebihan = selisih > 0;
              return (
                <tr key={item.item_id} className="border-b border-gray-50 last:border-0 align-top">
                  <td className="py-3 pr-4 font-medium text-gray-800">{item.barang?.kode_perangkat || String(item.barang_id)}</td>
                  <td className="py-3 pr-4 text-gray-600">{item.barang?.nama_barang || "-"}</td>
                  <td className="py-3 pr-4 text-right text-gray-500">{item.qtyDiminta}</td>
                  <td className="py-3 pr-6">
                    <input
                      type="number"
                      min={0}
                      value={item.qty || 0}
                      onChange={(e) => handleQtyDiterimaChange(index, Number(e.target.value))}
                      className="w-20 rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-[#E8632C] focus:outline-none"
                    />
                    {adaKelebihan && (
                      <div className="mt-1.5">
                        {item.kelebihan ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <PackagePlus size={12} />
                            Kelebihan {item.kelebihan.qty} unit dicatat
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold text-[#E8632C]">
                            <AlertTriangle size={12} />
                            +{selisih} lebih — perlu catatan kelebihan
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={item.kondisi || ""}
                      onChange={(e) => handleKondisiChange(index, e.target.value)}
                      disabled={(item.qty || 0) === 0}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium focus:outline-none disabled:opacity-40 ${
                        item.kondisi
                          ? KONDISI_TONE[item.kondisi as KondisiPerangkat]
                          : "border-gray-200 text-gray-500"
                      }`}
                    >
                      <option value="">Pilih kondisi...</option>
                      {KONDISI_OPTIONS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3">
                    {(item.qty || 0) === 0 ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <input
                        value={item.serial_number || ""}
                        onChange={(e) => handleSerialChange(index, e.target.value)}
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

      <Button
        disabled={!canSubmit || submitting}
        onClick={handleSubmitClick}
        className="mt-5 h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
      >
        {submitting ? "Menyimpan..." : "Simpan & Ajukan Verifikasi"}
      </Button>

      {/* Modal gabungan catatan kelebihan */}
      {showExcessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowExcessModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <PackagePlus size={16} className="text-[#E8632C]" />
              Catat Kelebihan Barang
            </p>
            <p className="mb-4 text-xs text-gray-500">
              Ada {unresolvedExcessIndexes.length} barang yang qty diterimanya melebihi
              Surat Jalan. Isi catatan kelebihan buat masing-masing sebelum bisa disimpan.
            </p>

            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {unresolvedExcessIndexes.map((idx) => {
                const item = items[idx];
                const selisih = (item.qty || 0) - item.qtyDiminta;
                return (
                  <div key={item.item_id} className="rounded-xl border border-gray-100 p-3">
                    <p className="text-sm font-semibold text-gray-800">{item.barang?.nama_barang || "Item"}</p>
                    <p className="mb-2 text-xs text-gray-500">
                      Diterima {item.qty || 0} unit, di Surat Jalan {item.qtyDiminta} unit —
                      selisih{" "}
                      <span className="font-semibold text-gray-900">{selisih} unit</span>
                    </p>
                    <textarea
                      value={excessNotesDraft[idx] || ""}
                      onChange={(e) =>
                        setExcessNotesDraft((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowExcessModal(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <Button
                onClick={handleConfirmExcessAndSave}
                disabled={!excessNoteFilled || submitting}
                className="h-auto rounded-full bg-[#E8632C] px-5 py-2 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
              >
                {submitting ? "Menyimpan..." : "Simpan & Ajukan Verifikasi"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
