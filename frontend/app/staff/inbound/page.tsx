"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PackageCheck, Plus, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";

type InboundStatus = "draft_diajukan" | "disetujui" | "digenerate" | "diterima_didistribusikan" | "ditolak" | "menunggu_verifikasi" | "ready_putaway";

const STATUS_META: Record<InboundStatus, { label: string; tone: string }> = {
  draft_diajukan: { label: "Menunggu Approval", tone: "bg-amber-50 text-amber-600" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", tone: "bg-amber-50 text-amber-600" },
  ready_putaway: { label: "Ready for Putaway", tone: "bg-emerald-50 text-emerald-600" },
  disetujui: { label: "Disetujui", tone: "bg-emerald-50 text-emerald-600" },
  digenerate: { label: "Digenerate", tone: "bg-blue-50 text-blue-600" },
  diterima_didistribusikan: { label: "Diterima/Didistribusikan", tone: "bg-gray-100 text-gray-500" },
  ditolak: { label: "Ditolak", tone: "bg-rose-50 text-rose-600" },
};

interface InboundItem {
  item_id: number;
  nama_barang?: string;
  qty: number;
}

interface InboundSuratJalan {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: InboundStatus;
  created_at: string;
  items: InboundItem[];
  pengirim_or_vendor?: string;
  gudang_tujuan?: { nama_gudang: string };
}

interface BarangOption {
  barang_id: string | number;
  kode_perangkat?: string;
  nama_barang?: string;
  satuan_default_id?: string | number;
  satuan_default?: { kode_satuan?: string };
}

interface WarehouseOption {
  gudang_id: string | number;
  nama_gudang: string;
  tipe?: string;
}

interface ModalItemRow {
  id: string;
  barang_id: string;
  qty: string;
  satuan_id: string;
  satuan_label: string;
}

function Modal({
  open,
  onClose,
  title,
  subtitle,
  widthClass = "max-w-2xl",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  widthClass?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function InboundListPage() {
  const { get, post } = useApi();
  const [list, setList] = useState<InboundSuratJalan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [barangOptions, setBarangOptions] = useState<BarangOption[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [nomorTiket, setNomorTiket] = useState("");
  const [nomorSuratJalan, setNomorSuratJalan] = useState("");
  const [selectedGudangTujuanId, setSelectedGudangTujuanId] = useState("");
  const [tanggalMasuk, setTanggalMasuk] = useState("");
  const [modalItems, setModalItems] = useState<ModalItemRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [suratJalanPdf, setSuratJalanPdf] = useState<File | null>(null);
  const [suratJalanPdfUrl, setSuratJalanPdfUrl] = useState<string>("");
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const fetchList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await get(`${baseUrl}/api/surat-jalan/inbound`);
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal mengambil daftar inbound.");
      }
      const json = await response.json();
      const data = json?.data ?? json ?? [];
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [get]);

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const [itemRes, warehouseRes] = await Promise.all([
        get(`${baseUrl}/api/items?limit=200`),
        get(`${baseUrl}/api/warehouses`),
      ]);
      if (!itemRes.ok) throw new Error("Gagal mengambil daftar barang.");
      if (!warehouseRes.ok) throw new Error("Gagal mengambil daftar gudang.");

      const [itemJson, warehouseJson] = await Promise.all([
        itemRes.json(),
        warehouseRes.json(),
      ]);

      const unwrap = (json: any) => Array.isArray(json?.data) ? json.data : json?.data?.data || [];
      setBarangOptions(unwrap(itemJson));
      setWarehouseOptions(unwrap(warehouseJson));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal memuat data master.");
    } finally {
      setLoadingOptions(false);
    }
  };

  const openModal = async () => {
    setNomorTiket("");
    setNomorSuratJalan("");
    setSelectedGudangTujuanId("");
    setTanggalMasuk("");
    setModalItems([]);
    setFormError(null);
    setSuratJalanPdf(null);
    setSuratJalanPdfUrl("");
    setModalOpen(true);
    await loadOptions();
  };

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setFormError("File surat jalan harus berformat PDF.");
      return;
    }

    setFormError(null);
    setSuratJalanPdf(file);
    setUploadingPdf(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${baseUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal upload PDF surat jalan.");
      }

      const result = await response.json();
      const url = result?.data?.url || result?.url;
      if (!url) throw new Error("URL file tidak ditemukan dari respons upload.");

      setSuratJalanPdfUrl(url);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal upload PDF surat jalan.");
      setSuratJalanPdf(null);
      setSuratJalanPdfUrl("");
    } finally {
      setUploadingPdf(false);
    }
  };

  const addModalItem = () => {
    setModalItems((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, barang_id: "", qty: "", satuan_id: "", satuan_label: "" },
    ]);
  };

  const removeModalItem = (id: string) => {
    setModalItems((prev) => prev.filter((row) => row.id !== id));
  };

  const updateModalItem = (id: string, field: keyof ModalItemRow, value: string) => {
    setModalItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === "barang_id") {
          const barang = barangOptions.find((b) => String(b.barang_id) === value);
          return {
            ...row,
            barang_id: value,
            satuan_id: barang?.satuan_default_id ? String(barang.satuan_default_id) : row.satuan_id,
            satuan_label: String(barang?.satuan_default?.kode_satuan || barang?.satuan_default_id || ""),
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const selectedGudangTujuan = warehouseOptions.find((w) => String(w.gudang_id) === selectedGudangTujuanId);

  const canSubmitModal =
    nomorSuratJalan.trim().length > 0 &&
    selectedGudangTujuanId &&
    tanggalMasuk &&
    modalItems.length > 0 &&
    modalItems.every((row) => row.barang_id && Number(row.qty) > 0 && row.satuan_id);

  const handleSubmitInbound = async () => {
    if (!canSubmitModal) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const payload = {
        tipe: "inbound",
        nomor_surat_jalan: nomorSuratJalan.trim(),
        gudang_tujuan_id: selectedGudangTujuanId,
        tanggal: tanggalMasuk,
        nomor_tiket: nomorTiket.trim() || null,
        notes: null,
        kategori_approval: "manual_override",
        surat_jalan_url: suratJalanPdfUrl || null,
        items: modalItems.map((row) => ({
          barang_id: row.barang_id,
          qty: Number(row.qty),
          satuan_id: row.satuan_id,
          kondisi: "baik",
          is_kelebihan: false,
          catatan: null,
        })),
      };

      const response = await post(`${baseUrl}/api/surat-jalan/inbound/staff`, payload);
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal membuat pengajuan inbound.");
      }

      setToast({ message: "Pengajuan Inbound berhasil dikirim, menunggu verifikasi Supervisor.", type: "success" });
      setModalOpen(false);
      await fetchList();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat pengajuan inbound.");
      setToast({ message: err instanceof Error ? err.message : "Gagal membuat pengajuan inbound.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Penerimaan (Inbound)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar Surat Jalan barang masuk yang perlu dicocokkan & dicatat kondisinya
          </p>
        </div>
        <Button
          onClick={openModal}
          className="h-auto rounded-xl bg-[#E8632C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D9591F]"
        >
          <Plus size={16} className="mr-2" />
          Input Inbound
        </Button>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
          <Button variant="outline" size="sm" onClick={fetchList} className="ml-auto">
            Coba Lagi
          </Button>
        </div>
      )}

      <div className="rounded-2xl border border-[#F3D9C7] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-6 py-4 font-semibold">Nomor Surat Jalan</th>
              <th className="px-6 py-4 font-semibold">Asal</th>
              <th className="px-6 py-4 font-semibold">Tujuan Gudang</th>
              <th className="px-6 py-4 font-semibold">Tanggal</th>
              <th className="px-6 py-4 font-semibold">Jumlah Item</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  Memuat data...
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  Tidak ada Surat Jalan Inbound yang perlu diproses.
                </td>
              </tr>
            ) : (
              list.map((sj) => {
                const meta = STATUS_META[sj.status] || STATUS_META.draft_diajukan;
                const totalUnit = sj.items.reduce((sum, i) => sum + Number(i.qty || 0), 0);
                const tujuanText = sj.gudang_tujuan?.nama_gudang || "-";
                const tanggal = new Date(sj.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                });

                return (
                  <tr
                    key={sj.surat_jalan_id}
                    className="border-b border-gray-50 last:border-0 hover:bg-[#FDECE1]/30"
                  >
                    <td className="px-6 py-4 font-medium text-gray-800">
                      <span className="flex items-center gap-2">
                        <PackageCheck size={16} className="text-[#E8632C]" />
                        {sj.nomor_surat_jalan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{sj.pengirim_or_vendor || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{tujuanText}</td>
                    <td className="px-6 py-4 text-gray-500">{tanggal}</td>
                    <td className="px-6 py-4 text-gray-600">{totalUnit} unit</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/staff/inbound/${sj.surat_jalan_id}`}
                        className="text-sm font-semibold text-[#E8632C] hover:underline"
                      >
                        Buka
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Input Inbound"
        subtitle="Isi detail barang masuk untuk diajukan ke Supervisor"
        widthClass="max-w-3xl"
      >
        {formError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nomor Tiket Gudang</label>
            <input
              type="text"
              value={nomorTiket}
              onChange={(e) => setNomorTiket(e.target.value)}
              placeholder="Contoh: TKT-2026-001"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nomor Surat Jalan <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={nomorSuratJalan}
              onChange={(e) => setNomorSuratJalan(e.target.value)}
              placeholder="Nomor surat jalan dari vendor/pihak luar"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Gudang Tujuan</label>
            <div className="relative">
              <select
                value={selectedGudangTujuanId}
                onChange={(e) => setSelectedGudangTujuanId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
              >
                <option value="" disabled>
                  Pilih Gudang Tujuan...
                </option>
                {warehouseOptions.map((w) => (
                  <option key={w.gudang_id} value={String(w.gudang_id)}>
                    {w.nama_gudang} {w.tipe ? `(${w.tipe})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tanggal Masuk</label>
            <input
              type="date"
              value={tanggalMasuk}
              onChange={(e) => setTanggalMasuk(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Upload Surat Jalan Inbound (PDF)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfChange}
              disabled={uploadingPdf}
              className="mb-2 block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#E8632C] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#D9591F]"
            />
            {uploadingPdf && <p className="text-xs text-gray-500">Mengupload PDF...</p>}
            {suratJalanPdfUrl && !uploadingPdf && (
              <a
                href={suratJalanPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#E8632C] hover:underline"
              >
                Lihat PDF yang diupload
              </a>
            )}
            {suratJalanPdf && !uploadingPdf && (
              <p className="mt-1 text-xs text-gray-500">File: {suratJalanPdf.name}</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Daftar Barang</p>
            <Button
              variant="outline"
              size="sm"
              onClick={addModalItem}
              className="rounded-lg border-[#E8632C] text-[#E8632C] hover:bg-[#FDECE1]"
            >
              <Plus size={14} className="mr-1" />
              Add Item
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {modalItems.map((row) => {
              const barang = barangOptions.find((b) => String(b.barang_id) === row.barang_id);
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex-1">
                    <select
                      value={row.barang_id}
                      onChange={(e) => updateModalItem(row.id, "barang_id", e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                    >
                      <option value="">Pilih Barang / SKU...</option>
                      {barangOptions.map((b) => (
                        <option key={b.barang_id} value={String(b.barang_id)}>
                          {b.kode_perangkat} — {b.nama_barang}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={row.qty}
                      onChange={(e) => updateModalItem(row.id, "qty", e.target.value)}
                      placeholder="Qty"
                      className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-center text-sm focus:border-[#E8632C] focus:outline-none"
                    />
                    <span className="text-xs text-gray-500 w-16">{row.satuan_label || "UOM"}</span>
                    <button
                      onClick={() => removeModalItem(row.id)}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            {modalItems.length === 0 && (
              <p className="py-4 text-center text-xs text-gray-400">Belum ada barang. Klik Add Item untuk menambah.</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
            Batal
          </Button>
          <Button
            onClick={handleSubmitInbound}
            disabled={!canSubmitModal || submitting}
            className="bg-[#E8632C] hover:bg-[#D9591F]"
          >
            {submitting ? "Mengirim..." : "Kirim Pengajuan"}
          </Button>
        </div>
      </Modal>

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
    </div>
  );
}
