"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PackageCheck, Plus, X, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BarangPicker, {
  type BarangPickerItem,
} from "@/components/BarangPicker";
import { useApi } from "@/lib/api";
import BoqPicker, { type BoqPickerItem } from "@/components/BoqPicker";

type InboundStatus = "draft_diajukan" | "disetujui" | "digenerate" | "diterima_didistribusikan" | "ditolak" | "menunggu_verifikasi" | "ready_putaway" | "sedang_dikirim";

const STATUS_META: Record<InboundStatus, { label: string; tone: string }> = {
  draft_diajukan: { label: "Menunggu Persetujuan", tone: "bg-amber-50 text-amber-600" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", tone: "bg-amber-50 text-amber-600" },
  ready_putaway: { label: "Siap Putaway", tone: "bg-blue-50 text-blue-600" },
  disetujui: { label: "Disetujui", tone: "bg-emerald-50 text-emerald-600" },
  digenerate: { label: "Digenerate", tone: "bg-blue-50 text-blue-600" },
  diterima_didistribusikan: { label: "Diterima/Didistribusikan", tone: "bg-gray-100 text-gray-500" },
  sedang_dikirim: { label: "Sedang Dikirim", tone: "bg-amber-50 text-amber-600" },
  ditolak: { label: "Ditolak", tone: "bg-rose-50 text-rose-600" },
};

interface InboundItem {
  item_id: number;
  nama_barang?: string;
  qty: number;
}

interface VehicleOption {
  kendaraan_id: string | number;
  jenis_kendaraan: string;
  merk: string;
  no_polisi: string;
}

interface PersonnelOption {
  personil_id: string | number;
  nama: string;
  posisi?: string;
}

interface InboundSuratJalan {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: InboundStatus;
  created_at: string;
  items: InboundItem[];
  tipe_pengirim?: "internal" | "external";
  supplier?: { nama: string; kode: string };
  gudang_asal?: { nama_gudang: string };
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

interface SupplierOption {
  supplier_id: string | number;
  nama: string;
  kode: string;
}

interface ModalItemRow {
  id: string;
  barang_id: string;
  kode_perangkat: string;
  nama_barang: string;
  qty: number;
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
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [personnelOptions, setPersonnelOptions] = useState<PersonnelOption[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [selectedBoqId, setSelectedBoqId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [nomorSuratJalan, setNomorSuratJalan] = useState("");
  const [selectedGudangTujuanId, setSelectedGudangTujuanId] = useState("");
  const [tanggalMasuk, setTanggalMasuk] = useState("");
  const [selectedKendaraanId, setSelectedKendaraanId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedAsalTipe, setSelectedAsalTipe] = useState<"internal" | "external" | "">("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedGudangAsalId, setSelectedGudangAsalId] = useState("");
  const [isVendorManual, setIsVendorManual] = useState(false);
  const [pengirimEksternalNama, setPengirimEksternalNama] = useState("");
  const [picPemohon, setPicPemohon] = useState("");
  const [modalItems, setModalItems] = useState<ModalItemRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [suratJalanPdf, setSuratJalanPdf] = useState<File | null>(null);
  const [suratJalanPdfUrl, setSuratJalanPdfUrl] = useState<string>("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
      const [itemRes, warehouseRes, vehicleRes, personnelRes, supplierRes] = await Promise.all([
        get(`${baseUrl}/api/items?limit=200`),
        get(`${baseUrl}/api/warehouses`),
        get(`${baseUrl}/api/vehicles`),
        get(`${baseUrl}/api/personnels`),
        get(`${baseUrl}/api/suppliers`),
      ]);
      if (!itemRes.ok) throw new Error("Gagal mengambil daftar barang.");
      if (!warehouseRes.ok) throw new Error("Gagal mengambil daftar gudang.");
      if (!vehicleRes.ok) throw new Error("Gagal mengambil daftar kendaraan.");
      if (!personnelRes.ok) throw new Error("Gagal mengambil daftar personil.");
      if (!supplierRes.ok) throw new Error("Gagal mengambil daftar supplier.");

      const [itemJson, warehouseJson, vehicleJson, personnelJson, supplierJson] = await Promise.all([
        itemRes.json(),
        warehouseRes.json(),
        vehicleRes.json(),
        personnelRes.json(),
        supplierRes.json(),
      ]);

      const unwrap = (json: any) => Array.isArray(json?.data) ? json.data : json?.data?.data || [];
      setBarangOptions(unwrap(itemJson));
      setWarehouseOptions(unwrap(warehouseJson));
      setVehicleOptions(unwrap(vehicleJson));
      setPersonnelOptions(unwrap(personnelJson));
      setSupplierOptions(unwrap(supplierJson));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal memuat data master.");
    } finally {
      setLoadingOptions(false);
    }
  };

  const openModal = async () => {
    setSelectedBoqId("");
    setSelectedProjectId("");
    setNomorSuratJalan("");
    setSelectedGudangTujuanId("");
    setTanggalMasuk("");
    setSelectedKendaraanId("");
    setSelectedDriverId("");
    setSelectedAsalTipe("");
    setSelectedSupplierId("");
    setSelectedGudangAsalId("");
    setIsVendorManual(false);
    setPengirimEksternalNama("");
    setPicPemohon("");
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
      {
        id: `${Date.now()}-${prev.length}`,
        barang_id: "",
        kode_perangkat: "",
        nama_barang: "",
        qty: 1,
        satuan_id: "",
        satuan_label: "",
      },
    ]);
  };

  const removeModalItem = (id: string) => {
    setModalItems((prev) => prev.filter((row) => row.id !== id));
  };

  const pickModalItem = (id: string, picked: BarangPickerItem) => {
    setModalItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (!picked.id) {
          return {
            ...row,
            barang_id: "",
            kode_perangkat: picked.kode_perangkat,
            nama_barang: "",
            satuan_id: "",
            satuan_label: "",
          };
        }
        const satuanId = picked.satuan_default_id
          ? String(picked.satuan_default_id)
          : "";
        return {
          ...row,
          barang_id: picked.id,
          kode_perangkat: picked.kode_perangkat,
          nama_barang: picked.nama_barang,
          satuan_id: satuanId,
          satuan_label: picked.satuan_default_kode || "",
        };
      }),
    );
  };

  const setModalItemQty = (id: string, value: number) => {
    setModalItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, qty: Math.max(0, value) } : row)),
    );
  };

  const selectedGudangTujuan = warehouseOptions.find((w) => String(w.gudang_id) === selectedGudangTujuanId);

  const canSubmitModal =
    nomorSuratJalan.trim().length > 0 &&
    selectedGudangTujuanId &&
    tanggalMasuk &&
    selectedProjectId &&
    selectedBoqId &&
    selectedAsalTipe &&
    (selectedAsalTipe === "internal" || selectedSupplierId || pengirimEksternalNama.trim()) &&
    modalItems.length > 0 &&
    modalItems.every((row) => row.barang_id && row.qty > 0 && row.satuan_id);

  const validModalItems = useMemo(
    () => modalItems.filter((row) => row.barang_id && row.qty > 0 && row.satuan_id),
    [modalItems],
  );

  const totalModalQty = useMemo(
    () => validModalItems.reduce((sum, row) => sum + row.qty, 0),
    [validModalItems],
  );

  const handleSubmitInbound = async () => {
    if (!selectedBoqId) {
      setFormError("Pilih BOQ terlebih dahulu.");
      return;
    }

    if (!selectedGudangTujuanId) {
      setFormError("Pilih gudang tujuan terlebih dahulu.");
      return;
    }

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
        project_id: selectedProjectId || null,
        tujuan_tipe: "gudang",
        tipe_pengirim: selectedAsalTipe || null,
        supplier_id: selectedAsalTipe === "external" && !isVendorManual ? selectedSupplierId || null : null,
        gudang_asal_id: selectedAsalTipe === "internal" ? selectedGudangAsalId || null : null,
        pengirim_eksternal_nama: selectedAsalTipe === "external" && isVendorManual ? pengirimEksternalNama.trim() || null : null,
        kendaraan_id: selectedKendaraanId || null,
        personil_pengantar_id: selectedDriverId || null,
        pic_pemohon_nama: picPemohon.trim() || null,
        boq_id: selectedBoqId ? String(selectedBoqId) : null,
        notes: null,
        kategori_approval: "manual_override",
        surat_jalan_url: suratJalanPdfUrl || null,
        items: modalItems.map((row) => ({
          barang_id: row.barang_id,
          qty: row.qty,
          satuan_id: row.satuan_id,
          kondisi: "baik",
          is_kelebihan: false,
          catatan: null,
        })),
      };

      const response = await post(`${baseUrl}/api/surat-jalan/inbound/staff`, payload);
      if (!response.ok) {
        let result: unknown = null;
        let rawText: string | null = null;

        try {
          result = await response.json();
        } catch {
          try {
            rawText = await response.text();
          } catch {
            rawText = null;
          }
          result = null;
        }

        const resultObj = result && typeof result === "object" ? result : null;
        const message =
          (resultObj as any)?.message ||
          rawText ||
          "Gagal membuat pengajuan inbound.";

        const validationDetails =
          (resultObj as any)?.errors || (resultObj as any)?.details || null;

        const fullMessage = validationDetails
          ? `${message} Detail: ${JSON.stringify(validationDetails)}`
          : message;

        throw new Error(fullMessage);
      }

      setShowSuccessModal(true);
      setModalOpen(false);
      await fetchList();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat pengajuan inbound.");
      setToast({ message: err instanceof Error ? err.message : "Gagal membuat pengajuan inbound.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  function handleSuccessModalClose() {
    setShowSuccessModal(false);
  }

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
                    <td className="px-6 py-4 text-gray-600">
                      {sj.tipe_pengirim === "external"
                        ? `${sj.supplier?.kode ?? ""} - ${sj.supplier?.nama ?? "-"}`
                        : sj.tipe_pengirim === "internal"
                        ? sj.gudang_asal?.nama_gudang || "-"
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{tujuanText}</td>
                    <td className="px-6 py-4 text-gray-500">{tanggal}</td>
                    <td className="px-6 py-4 text-gray-600">{totalUnit} unit</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {sj.status === "diterima_didistribusikan" ? (
                        <span className="text-sm font-semibold text-gray-400">Selesai</span>
                      ) : (
                        <Link
                          href={`/staff/inbound/${sj.surat_jalan_id}`}
                          className="text-sm font-semibold text-[#E8632C] hover:underline"
                        >
                          Buka
                        </Link>
                      )}
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
        widthClass="max-w-4xl"
      >
        {formError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {formError}
          </div>
        )}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">BOQ / Tiket <span className="text-rose-500">*</span></label>
            <BoqPicker
              value={selectedBoqId}
              onSelect={(picked) => {
                setSelectedBoqId(picked.boq_id);
                if (picked.project_id) {
                  setSelectedProjectId(String(picked.project_id));
                }
              }}
              placeholder="Pilih BOQ / Tiket"
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
            <label className="mb-1 block text-xs font-medium text-gray-600">Gudang Tujuan <span className="text-rose-500">*</span></label>
            <div className="relative">
              <select
                value={selectedGudangTujuanId}
                onChange={(e) => setSelectedGudangTujuanId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
              >
                  <option value="" disabled>Pilih Gudang Tujuan...</option>
                  {warehouseOptions.map((w) => (
                    <option key={w.gudang_id} value={String(w.gudang_id)}>
                      {w.nama_gudang} {w.tipe === "dadakan" ? "(Dadakan)" : ""}
                    </option>
                  ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tanggal Masuk <span className="text-rose-500">*</span></label>
            <input
              type="date"
              value={tanggalMasuk}
              onChange={(e) => setTanggalMasuk(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Asal Pengiriman</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedAsalTipe("internal")}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  selectedAsalTipe === "internal"
                    ? "border-[#E8632C] bg-[#E8632C] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[#E8632C]"
                }`}
              >
                Internal
              </button>
              <button
                type="button"
                onClick={() => setSelectedAsalTipe("external")}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  selectedAsalTipe === "external"
                    ? "border-[#E8632C] bg-[#E8632C] text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-[#E8632C]"
                }`}
              >
                External
              </button>
            </div>
            {selectedAsalTipe === "internal" && (
              <select
                value={selectedGudangAsalId}
                onChange={(e) => setSelectedGudangAsalId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
              >
                <option value="">Pilih gudang asal</option>
                {warehouseOptions.map((w) => (
                  <option key={w.gudang_id} value={w.gudang_id}>
                    {w.nama_gudang}
                  </option>
                ))}
              </select>
            )}
            {selectedAsalTipe === "external" && (
              <>
                {!isVendorManual ? (
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                  >
                    <option value="">Pilih supplier</option>
                    {supplierOptions.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.kode} - {s.nama}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={pengirimEksternalNama}
                    onChange={(e) => setPengirimEksternalNama(e.target.value)}
                    placeholder="Nama vendor / pengirim eksternal"
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                  />
                )}
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={isVendorManual}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsVendorManual(checked);
                      if (checked) {
                        setSelectedSupplierId("");
                      } else {
                        setPengirimEksternalNama("");
                      }
                    }}
                  />
                  Vendor belum terdaftar? Ketik manual
                </label>
              </>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">PIC / Pemohon</label>
            <input
              type="text"
              value={picPemohon}
              onChange={(e) => setPicPemohon(e.target.value)}
              placeholder="Nama pemohon barang"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Kendaraan</label>
            <div className="relative">
              <select
                value={selectedKendaraanId}
                onChange={(e) => setSelectedKendaraanId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
              >
                <option value="">Pilih Kendaraan...</option>
                {vehicleOptions.map((v) => (
                  <option key={v.kendaraan_id} value={String(v.kendaraan_id)}>
                    {v.no_polisi} - {v.merk} {v.jenis_kendaraan}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Driver</label>
            <div className="relative">
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
              >
                <option value="">Pilih Driver...</option>
                {personnelOptions.map((p) => (
                  <option key={p.personil_id} value={String(p.personil_id)}>{p.nama}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Daftar Barang <span className="text-rose-500">*</span></p>
            <button
              type="button"
              onClick={addModalItem}
              className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600"
            >
              <Plus size={14} />
              Tambah Item
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {modalItems.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-12 gap-2 rounded-xl border border-slate-100 p-3"
              >
                <div className="col-span-4">
                  <BarangPicker
                    value={row.kode_perangkat}
                    onSelect={(picked) => pickModalItem(row.id, picked)}
                    placeholder="Kode perangkat"
                  />
                </div>
                <div className="col-span-4">
                  <input
                    type="text"
                    value={row.nama_barang}
                    readOnly
                    placeholder="Nama barang"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setModalItemQty(row.id, row.qty - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={row.qty}
                      onChange={(e) => setModalItemQty(row.id, Number(e.target.value))}
                      className="w-16 rounded-md border border-slate-200 py-1 text-center text-xs text-slate-800 outline-none focus:border-orange-400"
                    />
                    <button
                      type="button"
                      onClick={() => setModalItemQty(row.id, row.qty + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => removeModalItem(row.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {modalItems.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                Belum ada barang. Klik "Tambah Item" untuk menambah.
              </div>
            )}
          </div>

          {modalItems.length > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
              <span>
                Total Item:{" "}
                <span className="font-semibold text-slate-800">{validModalItems.length}</span>
              </span>
              <span>
                Total Qty:{" "}
                <span className="font-semibold text-slate-800">{totalModalQty}</span>
              </span>
            </div>
          )}
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

      {showSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={handleSuccessModalClose}
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
              <h3 className="text-lg font-bold text-gray-900">Surat Jalan Inbound Berhasil Diajukan</h3>
              <p className="mt-2 text-sm text-gray-500">
                Menunggu konfirmasi persetujuan dari supervisor.
              </p>
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
