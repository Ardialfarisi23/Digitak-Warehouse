"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PackageCheck, Plus, X, ChevronDown, Trash2, Upload, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import BarangPicker, {
  type BarangPickerItem,
} from "@/components/BarangPicker";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import BoqPicker, { type BoqPickerItem } from "@/components/BoqPicker";
import { MobileCardList, type MobileCardField, type MobileCardItem } from "@/components/MobileCardList";

type InboundStatus = "draft_diajukan" | "disetujui" | "digenerate" | "diterima_didistribusikan" | "ditolak" | "menunggu_verifikasi" | "ready_putaway" | "sedang_dikirim" | "tiba_menunggu_konfirmasi";

const STATUS_META: Record<InboundStatus, { label: string; tone: string }> = {
  draft_diajukan: { label: "Menunggu Persetujuan", tone: "bg-amber-50 text-amber-600" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", tone: "bg-amber-50 text-amber-600" },
  ready_putaway: { label: "Siap Putaway", tone: "bg-blue-50 text-blue-600" },
  disetujui: { label: "Disetujui", tone: "bg-emerald-50 text-emerald-600" },
  digenerate: { label: "Digenerate", tone: "bg-blue-50 text-blue-600" },
  tiba_menunggu_konfirmasi: { label: "Menunggu Konfirmasi", tone: "bg-blue-50 text-blue-600" },
  diterima_didistribusikan: { label: "Diterima/Didistribusikan", tone: "bg-gray-100 text-gray-500" },
  sedang_dikirim: { label: "Sedang Dikirim", tone: "bg-amber-50 text-amber-600" },
  ditolak: { label: "Ditolak", tone: "bg-rose-50 text-rose-600" },
};

interface InboundItem {
  item_id: number;
  nama_barang?: string;
  qty: number;
  qty_diterima?: number | string | null;
  catatan?: string | null;
  is_di_luar_boq?: boolean;
  satuan?: { kode_satuan?: string } | null;
  barang?: { kode_perangkat?: string; nama_barang?: string; satuan_default?: { kode_satuan?: string } } | null;
}

interface InboundSuratJalan {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: InboundStatus;
  created_at: string;
  tanggal?: string;
  created_by?: string | number;
  creator?: {
    user_id?: string | number;
    nama?: string;
    name?: string;
  } | null;
  items: InboundItem[];
  tipe_pengirim?: "internal" | "external";
  supplier?: { nama: string; kode: string };
  pengirim_eksternal_nama?: string | null;
  gudang_asal?: { nama_gudang: string };
  gudang_tujuan?: { nama_gudang: string };
  project?: { nama_project?: string } | null;
  pic_pemohon_nama?: string | null;
  kendaraan_teks?: string | null;
  no_polisi_teks?: string | null;
  driver_teks?: string | null;
  kendaraan?: { jenis_kendaraan?: string; merk?: string; no_polisi?: string } | null;
  personil_pengantar?: { nama?: string } | null;
  surat_jalan_url?: string | null;
  boq?: { boq_id: number; boq_number?: string; tiket?: { kode_tiket?: string } } | null;
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
  project_id?: string | number | null;
}

interface SupplierOption {
  supplier_id: string | number;
  nama: string;
  kode: string;
}

interface UnitOption {
  satuan_id: string | number;
  kode_satuan?: string;
}

interface CategoryOption {
  kategori_id: string | number;
  nama_kategori?: string;
}

const KONDISI_OPTIONS: { value: string; label: string }[] = [
  { value: "baik", label: "Baik" },
  { value: "rusak_ringan", label: "Rusak Ringan" },
  { value: "rusak_berat", label: "Rusak Berat" },
  { value: "tidak_sesuai_spek", label: "Tidak Sesuai Spek" },
  { value: "doa", label: "DOA" },
];

const KONDISI_TONE: Record<string, string> = {
  baik: "bg-emerald-100 text-emerald-700",
  rusak_ringan: "bg-amber-100 text-amber-700",
  rusak_berat: "bg-rose-100 text-rose-700",
  tidak_sesuai_spek: "bg-orange-100 text-[#E8632C]",
  doa: "bg-gray-100 text-gray-600",
};

interface ModalItemRow {
  id: string;
  barang_id: string;
  kode_perangkat: string;
  nama_barang: string;
  qtySuratJalan: number;
  qtyAktual: number;
  kondisi: string;
  serialNumber: string;
  satuan_id: string;
  satuan_label: string;
  kategori_id: string;
  catatan: string;
  is_di_luar_boq: boolean;
  is_non_master: boolean;
  fotos: Array<{ foto_id: number | string; url: string; filename?: string }>;
  fotoPreview: string | null;
  uploadingFoto: boolean;
  fotoError: string | null;
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
        className={`w-[calc(100vw-1.5rem)] ${widthClass} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-xl`}
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
  const { get, post, put } = useApi();
  const { user } = useAuth();
  const [list, setList] = useState<InboundSuratJalan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gudangTujuanFilter, setGudangTujuanFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [barangOptions, setBarangOptions] = useState<BarangOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseOption[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [selectedBoqId, setSelectedBoqId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [boqItemsDetail, setBoqItemsDetail] = useState<Array<{ barang_id: string | number; itemCode?: string; itemName?: string }>>([]);
  const [nomorSuratJalan, setNomorSuratJalan] = useState("");
  const [selectedGudangTujuanId, setSelectedGudangTujuanId] = useState("");
  const [tanggalMasuk, setTanggalMasuk] = useState("");
  const [kendaraanNamaTeks, setKendaraanNamaTeks] = useState("");
  const [kendaraanNoPolisTeks, setKendaraanNoPolisTeks] = useState("");
  const [driverNamaTeks, setDriverNamaTeks] = useState("");
  const [selectedAsalTipe, setSelectedAsalTipe] = useState<"internal" | "external" | "">("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedGudangAsalId, setSelectedGudangAsalId] = useState("");
  const [isVendorManual, setIsVendorManual] = useState(false);
  const [pengirimEksternalNama, setPengirimEksternalNama] = useState("");
  const [picPemohon, setPicPemohon] = useState("");
  const [modalItems, setModalItems] = useState<ModalItemRow[]>([]);
  const [draftItem, setDraftItem] = useState<ModalItemRow>({
    id: "draft",
    barang_id: "",
    kode_perangkat: "",
    nama_barang: "",
    qtySuratJalan: 1,
    qtyAktual: 1,
    kondisi: "",
    serialNumber: "",
    satuan_id: "",
    satuan_label: "",
    kategori_id: "",
    catatan: "",
    is_di_luar_boq: true,
    is_non_master: false,
    fotos: [],
    fotoPreview: null,
    uploadingFoto: false,
    fotoError: null,
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraftItem, setEditDraftItem] = useState<ModalItemRow | null>(null);
  const [previewFotoUrl, setPreviewFotoUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [kondisiError, setKondisiError] = useState<string | null>(null);
  const [editKondisiError, setEditKondisiError] = useState<string | null>(null);
  const [suratJalanPdf, setSuratJalanPdf] = useState<File | null>(null);
  const [suratJalanPdfUrl, setSuratJalanPdfUrl] = useState<string>("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const fotoPreviewRef = useRef<Record<string, string>>({});

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

  const handleCancelDraft = async (suratJalanId: number) => {
    const confirmed = window.confirm("Yakin ingin membatalkan draft ini? Aksi ini tidak dapat dibatalkan.");
    if (!confirmed) return;

    setCancellingId(suratJalanId);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await put(`${baseUrl}/api/surat-jalan/${suratJalanId}/cancel-draft`, {});

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal membatalkan draft surat jalan.");
      }

      setToast({ message: "Draft surat jalan berhasil dibatalkan.", type: "success" });
      fetchList();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat membatalkan draft.",
        type: "error",
      });
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    fetchList();
  }, [get]);

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const [itemRes, warehouseRes, supplierRes, unitRes, categoryRes] = await Promise.all([
        get(`${baseUrl}/api/items?limit=200`),
        get(`${baseUrl}/api/warehouses?limit=1000`),
        get(`${baseUrl}/api/suppliers`),
        get(`${baseUrl}/api/units`),
        get(`${baseUrl}/api/categories`),
      ]);
      if (!itemRes.ok) throw new Error("Gagal mengambil daftar barang.");
      if (!warehouseRes.ok) throw new Error("Gagal mengambil daftar gudang.");
      if (!supplierRes.ok) throw new Error("Gagal mengambil daftar supplier.");
      if (!unitRes.ok) throw new Error("Gagal mengambil daftar satuan.");
      if (!categoryRes.ok) throw new Error("Gagal mengambil daftar kategori.");

      const [itemJson, warehouseJson, supplierJson, unitJson, categoryJson] = await Promise.all([
        itemRes.json(),
        warehouseRes.json(),
        supplierRes.json(),
        unitRes.json(),
        categoryRes.json(),
      ]);

      const unwrap = (json: any) => Array.isArray(json?.data) ? json.data : json?.data?.data || [];
      setBarangOptions(unwrap(itemJson));
      setWarehouseOptions(unwrap(warehouseJson));
      setSupplierOptions(unwrap(supplierJson));
      setUnitOptions(unwrap(unitJson));
      setCategoryOptions(unwrap(categoryJson));
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
    setKendaraanNamaTeks("");
    setKendaraanNoPolisTeks("");
    setDriverNamaTeks("");
    setSelectedAsalTipe("");
    setSelectedSupplierId("");
    setSelectedGudangAsalId("");
    setIsVendorManual(false);
    setPengirimEksternalNama("");
    setPicPemohon("");
    setModalItems([]);
    resetDraftItem();
    setEditModalOpen(false);
    setEditingId(null);
    setEditDraftItem(null);
    setFormError(null);
    setKondisiError(null);
    setEditKondisiError(null);
    setSuratJalanPdf(null);
    setSuratJalanPdfUrl("");
    setBoqItemsDetail([]);
    setModalOpen(true);
    await loadOptions();
  };

  useEffect(() => {
    if (!selectedBoqId) {
      setBoqItemsDetail([]);
      return;
    }
    let cancelled = false;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const fetchBoqDetail = async () => {
      try {
        const res = await get(`${baseUrl}/api/boqs/${selectedBoqId}`);
        if (!res.ok) return;
        const json = await res.json();
        const boq = json?.data;
        if (!boq || !Array.isArray(boq.items)) return;
        if (cancelled) return;
        setBoqItemsDetail(
          boq.items.map((item: any) => ({
            barang_id: String(item.barang_id || item.id || ""),
            itemCode: item.itemCode || item.barang?.kode_perangkat || "",
            itemName: item.itemName || item.barang?.nama_barang || "",
          }))
        );
      } catch {
        // ignore BOQ detail fetch error
      }
    };
    fetchBoqDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedBoqId, get]);

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

  const removeModalItem = (id: string) => {
    setModalItems((prev) => prev.filter((row) => row.id !== id));
  };

  const resetDraftItem = () => {
    setDraftItem({
      id: "draft",
      barang_id: "",
      kode_perangkat: "",
      nama_barang: "",
      qtySuratJalan: 1,
      qtyAktual: 1,
      kondisi: "",
      serialNumber: "",
      satuan_id: "",
      satuan_label: "",
      kategori_id: "",
      catatan: "",
      is_di_luar_boq: true,
      is_non_master: false,
      fotos: [],
      fotoPreview: null,
      uploadingFoto: false,
      fotoError: null,
    });
    setKondisiError(null);
  };

  const handleCheckDraftItem = () => {
    const row = draftItem;
    if (row.qtySuratJalan <= 0 || !row.satuan_id) {
      setFormError("Lengkapi Qty Surat Jalan dan Satuan pada form draft barang.");
      return;
    }
    if (row.is_non_master) {
      if (!row.nama_barang.trim() || !row.kategori_id) {
        setFormError("Lengkapi Nama Barang dan Kategori untuk barang non-master.");
        return;
      }
    } else {
      if (!row.barang_id) {
        setFormError("Pilih Barang / SKU pada form draft barang.");
        return;
      }
    }
    if (!row.kondisi) {
      setKondisiError("Kondisi barang wajib dipilih.");
      return;
    }

    setFormError(null);
    setKondisiError(null);
    setModalItems((prev) => [
      ...prev,
      {
        ...row,
        id: `${Date.now()}-${prev.length}`,
      },
    ]);
    resetDraftItem();
  };

  const handleEditModalItem = (id: string) => {
    const row = modalItems.find((r) => r.id === id);
    if (!row) return;
    setEditingId(id);
    setEditDraftItem({
      ...row,
      fotoPreview: null,
      uploadingFoto: false,
      fotoError: null,
    });
    setEditModalOpen(true);
    setFormError(null);
    setEditKondisiError(null);
  };

  const handleSaveEditItem = () => {
    if (!editingId || !editDraftItem) return;
    const row = editDraftItem;
    if (row.qtySuratJalan <= 0 || !row.satuan_id) {
      setFormError("Lengkapi Qty Surat Jalan dan Satuan pada item yang diedit.");
      return;
    }
    if (row.is_non_master) {
      if (!row.nama_barang.trim() || !row.kategori_id) {
        setFormError("Lengkapi Nama Barang dan Kategori untuk barang non-master.");
        return;
      }
    } else {
      if (!row.barang_id) {
        setFormError("Pilih Barang / SKU pada item yang diedit.");
        return;
      }
    }
    if (!row.kondisi) {
      setEditKondisiError("Kondisi barang wajib dipilih.");
      return;
    }

    setFormError(null);
    setEditKondisiError(null);
    setModalItems((prev) => prev.map((r) => (r.id === editingId ? { ...row, id: editingId } : r)));
    setEditModalOpen(false);
    setEditingId(null);
    setEditDraftItem(null);
  };

  const handleCancelEditItem = () => {
    setEditModalOpen(false);
    setEditingId(null);
    setEditDraftItem(null);
    setFormError(null);
  };

  const setEditDraftItemNama = (value: string) => {
    setEditDraftItem((prev) => (prev ? { ...prev, nama_barang: value } : prev));
  };

  const setEditDraftItemKategori = (value: string) => {
    setEditDraftItem((prev) => (prev ? { ...prev, kategori_id: value } : prev));
  };

  const setEditDraftItemSatuan = (value: string) => {
    const selected = unitOptions.find((u) => String(u.satuan_id) === String(value));
    setEditDraftItem((prev) =>
      prev
        ? {
            ...prev,
            satuan_id: value,
            satuan_label: selected?.kode_satuan || "",
          }
        : prev
    );
  };

  const pickEditDraftItem = (picked: BarangPickerItem) => {
    setEditDraftItem((prev) => {
      if (!prev) return prev;
      if (!picked.id) {
        return {
          ...prev,
          barang_id: "",
          kode_perangkat: picked.kode_perangkat,
          nama_barang: "",
          satuan_id: "",
          satuan_label: "",
          is_di_luar_boq: true,
        };
      }
      const satuanId = picked.satuan_default_id ? String(picked.satuan_default_id) : "";
      const isInBoq = boqItemsDetail.some(
        (boqItem) => String(boqItem.barang_id) === String(picked.id)
      );
      return {
        ...prev,
        barang_id: picked.id,
        kode_perangkat: picked.kode_perangkat,
        nama_barang: picked.nama_barang,
        satuan_id: satuanId,
        satuan_label: picked.satuan_default_kode || "",
        is_di_luar_boq: !isInBoq,
      };
    });
  };

  const setEditDraftItemQty = (value: number) => {
    setEditDraftItem((prev) => (prev ? { ...prev, qtySuratJalan: Math.max(0, value) } : prev));
  };

  const setEditDraftItemQtyAktual = (value: number) => {
    setEditDraftItem((prev) => (prev ? { ...prev, qtyAktual: Math.max(0, value) } : prev));
  };

  const setEditDraftItemKondisi = (value: string) => {
    setEditDraftItem((prev) => (prev ? { ...prev, kondisi: value } : prev));
  };

  const setEditDraftItemSerialNumber = (value: string) => {
    setEditDraftItem((prev) => (prev ? { ...prev, serialNumber: value } : prev));
  };

  const setEditDraftItemCatatan = (value: string) => {
    setEditDraftItem((prev) => (prev ? { ...prev, catatan: value } : prev));
  };

  const toggleEditDraftItemNonMaster = () => {
    setEditDraftItem((prev) => {
      if (!prev) return prev;
      const nextNonMaster = !prev.is_non_master;
      if (nextNonMaster) {
        return {
          ...prev,
          is_non_master: true,
          barang_id: "",
          kode_perangkat: "",
          nama_barang: "",
          satuan_id: "",
          satuan_label: "",
          kategori_id: "",
          is_di_luar_boq: true,
        };
      }
      return {
        ...prev,
        is_non_master: false,
        nama_barang: "",
        kategori_id: "",
      };
    });
  };

  async function handleEditDraftFotoUpload(file: File) {
    if (!editDraftItem) return;
    setEditDraftItem((prev) => (prev ? { ...prev, fotoError: null } : prev));

    const previewUrl = URL.createObjectURL(file);
    setEditDraftItem((prev) => {
      if (!prev) return prev;
      const previous = prev.fotoPreview;
      if (previous) URL.revokeObjectURL(previous);
      return { ...prev, fotos: [], fotoPreview: previewUrl, uploadingFoto: true };
    });

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
      const fotoUrl = uploadData?.data?.url || uploadData?.url;
      if (!fotoUrl) throw new Error("URL foto tidak ditemukan.");

      setEditDraftItem((prev) => {
        if (!prev) return prev;
        const previous = prev.fotoPreview;
        if (previous) URL.revokeObjectURL(previous);
        return {
          ...prev,
          fotos: [{ foto_id: `${Date.now()}`, url: fotoUrl, filename: file.name }],
          fotoPreview: null,
          uploadingFoto: false,
        };
      });
    } catch (err) {
      setEditDraftItem((prev) =>
        prev
          ? {
              ...prev,
              fotoError: err instanceof Error ? err.message : "Gagal upload foto.",
              uploadingFoto: false,
            }
          : prev
      );
    }
  }

  function handleEditDraftFotoDelete(fotoId: string | number) {
    setEditDraftItem((prev) => {
      if (!prev) return prev;
      const nextFotos = prev.fotos.filter((f) => String(f.foto_id) !== String(fotoId));
      const nextPreview = prev.fotoPreview && prev.fotos.find((f) => String(f.foto_id) === String(fotoId))
        ? null
        : prev.fotoPreview;
      if (nextPreview) URL.revokeObjectURL(nextPreview);
      return { ...prev, fotos: nextFotos, fotoPreview: nextPreview };
    });
  }

  const setDraftItemNama = (value: string) => {
    setDraftItem((prev) => ({ ...prev, nama_barang: value }));
  };

  const setDraftItemKategori = (value: string) => {
    setDraftItem((prev) => ({ ...prev, kategori_id: value }));
  };

  const setDraftItemSatuan = (value: string) => {
    const selected = unitOptions.find((u) => String(u.satuan_id) === String(value));
    setDraftItem((prev) => ({
      ...prev,
      satuan_id: value,
      satuan_label: selected?.kode_satuan || "",
    }));
  };

  const pickDraftItem = (picked: BarangPickerItem) => {
    setDraftItem((prev) => {
      if (!picked.id) {
        return {
          ...prev,
          barang_id: "",
          kode_perangkat: picked.kode_perangkat,
          nama_barang: "",
          satuan_id: "",
          satuan_label: "",
          is_di_luar_boq: true,
        };
      }
      const satuanId = picked.satuan_default_id ? String(picked.satuan_default_id) : "";
      const isInBoq = boqItemsDetail.some(
        (boqItem) => String(boqItem.barang_id) === String(picked.id)
      );
      return {
        ...prev,
        barang_id: picked.id,
        kode_perangkat: picked.kode_perangkat,
        nama_barang: picked.nama_barang,
        satuan_id: satuanId,
        satuan_label: picked.satuan_default_kode || "",
        is_di_luar_boq: !isInBoq,
      };
    });
  };

  const setDraftItemQty = (value: number) => {
    setDraftItem((prev) => ({ ...prev, qtySuratJalan: Math.max(0, value) }));
  };

  const setDraftItemQtyAktual = (value: number) => {
    setDraftItem((prev) => ({ ...prev, qtyAktual: Math.max(0, value) }));
  };

  const setDraftItemKondisi = (value: string) => {
    setDraftItem((prev) => ({ ...prev, kondisi: value }));
  };

  const setDraftItemSerialNumber = (value: string) => {
    setDraftItem((prev) => ({ ...prev, serialNumber: value }));
  };

  const setDraftItemCatatan = (value: string) => {
    setDraftItem((prev) => ({ ...prev, catatan: value }));
  };

  const toggleDraftItemNonMaster = () => {
    setDraftItem((prev) => {
      const nextNonMaster = !prev.is_non_master;
      if (nextNonMaster) {
        return {
          ...prev,
          is_non_master: true,
          barang_id: "",
          kode_perangkat: "",
          nama_barang: "",
          satuan_id: "",
          satuan_label: "",
          kategori_id: "",
          is_di_luar_boq: true,
        };
      }
      return {
        ...prev,
        is_non_master: false,
        nama_barang: "",
        kategori_id: "",
      };
    });
  };

  async function handleDraftFotoUpload(file: File) {
    setDraftItem((prev) => ({ ...prev, fotoError: null }));

    const previewUrl = URL.createObjectURL(file);
    setDraftItem((prev) => {
      const previous = prev.fotoPreview;
      if (previous) URL.revokeObjectURL(previous);
      return { ...prev, fotos: [], fotoPreview: previewUrl, uploadingFoto: true };
    });

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
      const fotoUrl = uploadData?.data?.url || uploadData?.url;
      if (!fotoUrl) throw new Error("URL foto tidak ditemukan.");

      setDraftItem((prev) => {
        const previous = prev.fotoPreview;
        if (previous) URL.revokeObjectURL(previous);
        return {
          ...prev,
          fotos: [{ foto_id: `${Date.now()}`, url: fotoUrl, filename: file.name }],
          fotoPreview: null,
          uploadingFoto: false,
        };
      });
    } catch (err) {
      setDraftItem((prev) => ({
        ...prev,
        fotoError: err instanceof Error ? err.message : "Gagal upload foto.",
        uploadingFoto: false,
      }));
    }
  }

  function handleDraftFotoDelete(fotoId: string | number) {
    setDraftItem((prev) => {
      const nextFotos = prev.fotos.filter((f) => String(f.foto_id) !== String(fotoId));
      const nextPreview = prev.fotoPreview && prev.fotos.find((f) => String(f.foto_id) === String(fotoId))
        ? null
        : prev.fotoPreview;
      if (nextPreview) URL.revokeObjectURL(nextPreview);
      return { ...prev, fotos: nextFotos, fotoPreview: nextPreview };
    });
  }

  useEffect(() => {
    if (!boqItemsDetail.length) {
      setModalItems((prev) =>
        prev.map((row) => ({
          ...row,
          is_di_luar_boq: row.barang_id ? true : row.is_di_luar_boq,
        }))
      );
      return;
    }
    setModalItems((prev) =>
      prev.map((row) => {
        if (!row.barang_id) return row;
        const isInBoq = boqItemsDetail.some(
          (boqItem) => String(boqItem.barang_id) === String(row.barang_id)
        );
        return {
          ...row,
          is_di_luar_boq: !isInBoq,
        };
      })
    );
  }, [boqItemsDetail]);

  const selectedGudangTujuan = warehouseOptions.find((w) => String(w.gudang_id) === selectedGudangTujuanId);

  // Gudang tidak dibatasi per project, tapi gudang dadakan (transit) yang ter-link ke
  // project terpilih diberi label tambahan supaya staff mudah mengenali.
  const gudangTujuanOptions = warehouseOptions.map((w) => {
    const isTransit = w.tipe === "dadakan";
    const transitProjectIni =
      isTransit && w.project_id != null && String(w.project_id) === String(selectedProjectId);

    let label = w.nama_gudang;
    if (transitProjectIni) {
      label += " (Transit - Project Ini)";
    } else if (isTransit) {
      label += " (Dadakan)";
    }

    return { gudang_id: w.gudang_id, label };
  });

  const kendaraanValid = kendaraanNamaTeks.trim().length > 0;
  const noPolisiValid = kendaraanNoPolisTeks.trim().length > 0;
  const driverValid = driverNamaTeks.trim().length > 0;

  const isRowValid = (row: ModalItemRow) => {
    if (row.qtySuratJalan <= 0 || !row.satuan_id) return false;
    if (row.is_non_master) {
      return row.nama_barang.trim().length > 0 && !!row.kategori_id;
    }
    return !!row.barang_id;
  };

  const canSubmitModal =
    nomorSuratJalan.trim().length > 0 &&
    selectedGudangTujuanId &&
    tanggalMasuk &&
    selectedProjectId &&
    selectedBoqId &&
    selectedAsalTipe &&
    (selectedAsalTipe === "internal"
      ? selectedGudangAsalId
      : selectedSupplierId || pengirimEksternalNama.trim()) &&
    kendaraanValid &&
    noPolisiValid &&
    driverValid &&
    modalItems.length > 0 &&
    modalItems.every(isRowValid) &&
    modalItems.every((row) => !!row.kondisi);

  const validModalItems = useMemo(
    () => modalItems.filter(isRowValid),
    [modalItems],
  );

  const totalModalQty = useMemo(
    () => validModalItems.reduce((sum, row) => sum + row.qtySuratJalan, 0),
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

    // Pesan eksplisit supaya staff tahu apa yang kurang, bukan hanya tombol yang
    // tiba-tiba tidak bisa diklik.
    const kurangKendaraan = [
      !kendaraanValid && "nama kendaraan",
      !noPolisiValid && "nomor polisi",
      !driverValid && "nama driver",
    ].filter(Boolean);

    if (kurangKendaraan.length > 0) {
      setFormError(`Lengkapi dulu: ${kurangKendaraan.join(", ")}.`);
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
        kendaraan_nama_teks: kendaraanNamaTeks.trim() || null,
        kendaraan_no_polisi_teks: kendaraanNoPolisTeks.trim() || null,
        driver_nama_teks: driverNamaTeks.trim() || null,
pic_pemohon_nama: picPemohon.trim() || null,
        boq_id: selectedBoqId ? String(selectedBoqId) : null,
        notes: null,
        kategori_approval: "manual_override",
        surat_jalan_url: suratJalanPdfUrl || null,
        items: modalItems.map((row) => ({
          barang_id: row.is_non_master ? "" : row.barang_id,
          is_non_master: row.is_non_master,
          nama_barang_teks: row.is_non_master ? row.nama_barang.trim() : null,
          kategori_id: row.is_non_master ? row.kategori_id : null,
          qty: row.qtySuratJalan,
          qty_diterima: row.qtyAktual != null ? row.qtyAktual : null,
          satuan_id: row.satuan_id,
          kondisi: row.kondisi || "baik",
          kondisi_diterima: row.kondisi || null,
          serial_number: row.serialNumber || null,
          foto_url: row.fotos.length > 0 ? row.fotos[0].url : null,
          is_kelebihan: false,
          is_di_luar_boq: row.is_non_master ? true : row.is_di_luar_boq,
          catatan: row.catatan?.trim() || null,
          catatan_penerimaan: row.catatan?.trim() || null,
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
    return () => {
      Object.values(fotoPreviewRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      fotoPreviewRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const statusFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    list.forEach((sj) => {
      if (seen.has(sj.status)) return;
      seen.add(sj.status);
      options.push({ value: sj.status, label: STATUS_META[sj.status]?.label || sj.status });
    });
    return options;
  }, [list]);

  const gudangTujuanFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          list
            .map((sj) => sj.gudang_tujuan?.nama_gudang)
            .filter((nama): nama is string => Boolean(nama))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [list]
  );

  const isFilterActive =
    searchQuery.trim() !== "" || statusFilter !== "" || gudangTujuanFilter !== "";

  const filteredList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return list.filter((sj) => {
      if (query) {
        const nomorMatch = (sj.nomor_surat_jalan || "").toLowerCase().includes(query);
        const asalMatch = [sj.gudang_asal?.nama_gudang, sj.supplier?.nama, sj.pengirim_eksternal_nama]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
        if (!nomorMatch && !asalMatch) return false;
      }
      if (statusFilter && sj.status !== statusFilter) return false;
      if (gudangTujuanFilter && sj.gudang_tujuan?.nama_gudang !== gudangTujuanFilter) return false;
      return true;
    });
  }, [list, searchQuery, statusFilter, gudangTujuanFilter]);

  const mobileItemsInbound1: MobileCardItem[] = filteredList.map((sj) => {
    const meta = STATUS_META[sj.status] || STATUS_META.draft_diajukan;
    const totalUnit = sj.items.reduce((sum, i) => sum + Number(i.qty || 0), 0);
    const tujuanText = sj.gudang_tujuan?.nama_gudang || "-";
    const tanggal = new Date(sj.created_at).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const tipePengirimLabel = sj.tipe_pengirim === "internal" ? "Internal" : sj.tipe_pengirim === "external" ? "External" : "-";
    const kendaraanLabel =
      sj.kendaraan_teks ||
      (sj.kendaraan
        ? sj.kendaraan.merk && sj.kendaraan.merk.trim()
          ? `${sj.kendaraan.merk} - ${sj.kendaraan.jenis_kendaraan}`
          : sj.kendaraan.jenis_kendaraan
        : null) ||
      "-";
    const fields: MobileCardField[] = [
      { label: "Tipe Pengirim", value: tipePengirimLabel },
      { label: "Gudang Asal", value: sj.tipe_pengirim === "internal" ? sj.gudang_asal?.nama_gudang || "-" : "-" },
      { label: "Supplier", value: sj.tipe_pengirim === "external" && sj.supplier?.nama ? `${sj.supplier.kode} - ${sj.supplier.nama}` : "-" },
      { label: "Vendor Eksternal", value: sj.tipe_pengirim === "external" && !sj.supplier?.nama ? sj.pengirim_eksternal_nama || "-" : "-" },
      { label: "Tujuan", value: tujuanText },
      { label: "Tanggal", value: tanggal },
      { label: "PIC Pemohon", value: sj.pic_pemohon_nama || "-" },
      { label: "BOQ / Tiket", value: sj.boq ? sj.boq.boq_number || `BOQ #${sj.boq.boq_id}` : "-" },
      { label: "Kendaraan", value: kendaraanLabel },
      { label: "No. Polisi", value: sj.no_polisi_teks || sj.kendaraan?.no_polisi || "-" },
      { label: "Nama Driver", value: sj.driver_teks || sj.personil_pengantar?.nama || "-" },
      { label: "Item", value: `${totalUnit} unit` },
    ];

    let actionContent: React.ReactNode = null;
    if (sj.status === "diterima_didistribusikan") {
      actionContent = <span className="text-sm font-semibold text-gray-400">Selesai</span>;
    } else if (sj.status === "ready_putaway") {
      actionContent = <Link href={`/staff/putaway/${sj.surat_jalan_id}`} className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[#E8632C] text-sm font-semibold text-white hover:bg-[#D9591F]">Putaway</Link>;
    } else if (sj.status === "draft_diajukan" && (String(user?.id) === String(sj.created_by || sj.creator?.user_id) || user?.role === "supervisor" || user?.role === "admin_general")) {
      actionContent = <button onClick={() => handleCancelDraft(sj.surat_jalan_id)} disabled={cancellingId === sj.surat_jalan_id} className="flex min-h-11 w-full items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60">{cancellingId === sj.surat_jalan_id ? "Membatalkan..." : "Batalkan"}</button>;
    } else {
      actionContent = <Link href={`/staff/putaway/${sj.surat_jalan_id}`} className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[#E8632C] text-sm font-semibold text-white hover:bg-[#D9591F]">Detail</Link>;
    }

    return {
      key: String(sj.surat_jalan_id),
      title: (
        <span className="flex items-center gap-2">
          <PackageCheck size={16} className="text-[#E8632C]" />
          {sj.nomor_surat_jalan}
        </span>
      ),
      badge: <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>{meta.label}</span>,
      fields,
      actions: actionContent,
    };
  });

  const mobileItemsInbound2: MobileCardItem[] = modalItems.map((row) => {
    const kondisiLabel = KONDISI_OPTIONS.find((k) => k.value === row.kondisi)?.label || row.kondisi || "-";
    const namaBarang = row.is_non_master ? row.nama_barang : `${row.kode_perangkat} - ${row.nama_barang}`;

    const fields: MobileCardField[] = [
      { label: "Qty SJ", value: String(row.qtySuratJalan) },
      { label: "Qty Aktual", value: String(row.qtyAktual) },
      { label: "Serial", value: row.serialNumber || "-" },
      { label: "Catatan", value: row.catatan || "-" },
    ];

    const actions = (
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => handleEditModalItem(row.id)} className="flex min-h-11 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100">Edit</button>
        <button type="button" onClick={() => removeModalItem(row.id)} className="flex min-h-11 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 hover:bg-rose-100">Hapus</button>
      </div>
    );

    return {
      key: String(row.id),
      title: namaBarang,
      badge: <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${KONDISI_TONE[row.kondisi] || "bg-gray-100 text-gray-600"}`}>{kondisiLabel}</span>,
      fields,
      actions,
    };
  });

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

      {/* Filter & Pencarian */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. Surat Jalan / Asal..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="relative sm:w-60">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Status</option>
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        <div className="relative sm:w-60">
          <select
            value={gudangTujuanFilter}
            onChange={(e) => setGudangTujuanFilter(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Semua Gudang</option>
            {gudangTujuanFilterOptions.map((nama) => (
              <option key={nama} value={nama}>{nama}</option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
      {isFilterActive && (
        <p className="mb-3 text-xs text-slate-500">
          Menampilkan <span className="font-semibold text-slate-700">{filteredList.length}</span> dari {list.length} data
        </p>
      )}

      {/* List Inbound */}
      <MobileCardList items={mobileItemsInbound1} />
      <div className="rounded-2xl border border-[#F3D9C7] bg-white hidden md:block">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1700px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-4 font-semibold">No</th>
              <th className="px-4 py-4 font-semibold">Tanggal Masuk</th>
              <th className="px-4 py-4 font-semibold">Nomor Surat Jalan</th>
              <th className="px-4 py-4 font-semibold">Tipe Pengirim</th>
              <th className="px-4 py-4 font-semibold">Gudang Asal</th>
              <th className="px-4 py-4 font-semibold">Supplier</th>
              <th className="px-4 py-4 font-semibold">Nama Vendor Eksternal</th>
              <th className="px-4 py-4 font-semibold">Gudang Tujuan</th>
              <th className="px-4 py-4 font-semibold">PIC Pemohon</th>
              <th className="px-4 py-4 font-semibold">BOQ / Tiket</th>
              <th className="px-4 py-4 font-semibold">Project</th>
              <th className="px-4 py-4 font-semibold">Kendaraan</th>
              <th className="px-4 py-4 font-semibold">No. Polisi</th>
              <th className="px-4 py-4 font-semibold">Nama Driver</th>
              <th className="px-4 py-4 font-semibold">Surat Jalan (PDF)</th>
              <th className="px-4 py-4 font-semibold">Kode Barang</th>
              <th className="px-4 py-4 font-semibold">Nama Barang</th>
              <th className="px-4 py-4 font-semibold text-right">Qty</th>
              <th className="px-4 py-4 font-semibold">Satuan</th>
              <th className="px-4 py-4 font-semibold">Catatan Item</th>
              <th className="px-4 py-4 font-semibold">Di Luar BOQ</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={23} className="px-6 py-12 text-center text-gray-400">
                  Memuat data...
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={23} className="px-6 py-12 text-center text-gray-400">
                  {isFilterActive ? "Tidak ada data yang sesuai filter." : "Tidak ada Surat Jalan Inbound yang perlu diproses."}
                </td>
              </tr>
            ) : (
              filteredList.map((sj, sjIndex) => {
                const meta = STATUS_META[sj.status] || STATUS_META.draft_diajukan;
                const itemRows = sj.items && sj.items.length > 0 ? sj.items : [null];
                const rowSpan = itemRows.length;
                const tujuanText = sj.gudang_tujuan?.nama_gudang || "-";
                const tanggalRaw = sj.tanggal || sj.created_at;
                const tanggal = new Date(tanggalRaw).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                });
                const tipePengirimLabel =
                  sj.tipe_pengirim === "internal" ? "Internal" : sj.tipe_pengirim === "external" ? "External" : "-";
                const kendaraanLabel =
                  sj.kendaraan_teks ||
                  (sj.kendaraan
                    ? sj.kendaraan.merk && sj.kendaraan.merk.trim()
                      ? `${sj.kendaraan.merk} - ${sj.kendaraan.jenis_kendaraan}`
                      : sj.kendaraan.jenis_kendaraan
                    : null) ||
                  "-";
                const noPolisiLabel = sj.no_polisi_teks || sj.kendaraan?.no_polisi || "-";
                const driverLabel = sj.driver_teks || sj.personil_pengantar?.nama || "-";
                const boqLabel = sj.boq ? sj.boq.boq_number || `BOQ #${sj.boq.boq_id}` : "-";
                const tiketLabel = sj.boq?.tiket?.kode_tiket || "-";
                const allReceived = (sj.items || []).every(
                  (i) => i.qty_diterima !== null && i.qty_diterima !== undefined
                );

                return itemRows.map((item, itemIdx) => {
                  const isFirst = itemIdx === 0;
                  return (
                    <tr
                      key={`${sj.surat_jalan_id}-${item ? item.item_id : "empty"}-${itemIdx}`}
                      className={`border-b border-gray-50 last:border-0 transition-colors hover:bg-orange-50/50 ${sjIndex % 2 === 1 ? "bg-slate-50/70" : "bg-white"}`}
                    >
                      {isFirst && (
                        <>
                          <td className="px-4 py-4 align-top font-medium text-gray-700" rowSpan={rowSpan}>{sjIndex + 1}</td>
                          <td className="px-4 py-4 align-top text-gray-500" rowSpan={rowSpan}>{tanggal}</td>
                          <td className="px-4 py-4 align-top font-medium text-gray-800" rowSpan={rowSpan}>
                            <span className="flex items-center gap-2">
                              <PackageCheck size={16} className="text-[#E8632C]" />
                              {sj.nomor_surat_jalan}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{tipePengirimLabel}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>
                            {sj.tipe_pengirim === "internal" ? sj.gudang_asal?.nama_gudang || "-" : "-"}
                          </td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>
                            {sj.tipe_pengirim === "external" && sj.supplier?.nama
                              ? `${sj.supplier.kode} - ${sj.supplier.nama}`
                              : "-"}
                          </td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>
                            {sj.tipe_pengirim === "external" && !sj.supplier?.nama
                              ? sj.pengirim_eksternal_nama || "-"
                              : "-"}
                          </td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{tujuanText}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{sj.pic_pemohon_nama || "-"}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>
                            <span className="block">{boqLabel}</span>
                            <span className="block text-xs text-gray-400">Tiket: {tiketLabel}</span>
                          </td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{sj.project?.nama_project || "-"}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{kendaraanLabel}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{noPolisiLabel}</td>
                          <td className="px-4 py-4 align-top text-gray-600" rowSpan={rowSpan}>{driverLabel}</td>
                          <td className="px-4 py-4 align-top" rowSpan={rowSpan}>
                            {sj.surat_jalan_url ? (
                              <a href={sj.surat_jalan_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#E8632C] hover:underline">
                                Lihat PDF
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 align-top font-medium text-gray-800">{item?.barang?.kode_perangkat || "-"}</td>
                      <td className="px-4 py-3 align-top text-gray-600">{item?.barang?.nama_barang || item?.nama_barang || "-"}</td>
                      <td className="px-4 py-3 align-top text-right text-gray-600">{item ? Number(item.qty || 0) : "-"}</td>
                      <td className="px-4 py-3 align-top text-gray-600">
                        {item?.satuan?.kode_satuan || item?.barang?.satuan_default?.kode_satuan || "-"}
                      </td>
                      <td className="px-4 py-3 align-top text-gray-600">{item?.catatan || "-"}</td>
                      <td className="px-4 py-3 align-top">
                        {item?.is_di_luar_boq ? (
                          <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">Ya</span>
                        ) : (
                          <span className="text-xs text-gray-400">Tidak</span>
                        )}
                      </td>
                      {isFirst && (
                        <>
                          <td className="px-4 py-4 align-top" rowSpan={rowSpan}>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>{meta.label}</span>
                          </td>
                          <td className="px-4 py-4 align-top text-right" rowSpan={rowSpan}>
                            {sj.status === "diterima_didistribusikan" ? (
                              <span className="text-sm font-semibold text-gray-400">Selesai</span>
                            ) : sj.status === "ready_putaway" ? (
                              allReceived ? (
                                <Link href={`/staff/putaway/${sj.surat_jalan_id}`} className="text-sm font-semibold text-[#E8632C] hover:underline">Putaway</Link>
                              ) : (
                                <Link href={`/staff/inbound/${sj.surat_jalan_id}`} className="text-sm font-semibold text-[#E8632C] hover:underline">Penerimaan</Link>
                              )
                            ) : sj.status === "draft_diajukan" &&
                              (String(user?.id) === String(sj.created_by || sj.creator?.user_id) ||
                                user?.role === "supervisor" ||
                                user?.role === "admin_general") ? (
                              <button
                                onClick={() => handleCancelDraft(sj.surat_jalan_id)}
                                disabled={cancellingId === sj.surat_jalan_id}
                                className="text-sm font-semibold text-rose-600 hover:underline disabled:opacity-60"
                              >
                                {cancellingId === sj.surat_jalan_id ? "Membatalkan..." : "Batalkan"}
                              </button>
                            ) : (
                              <Link href={`/staff/inbound/${sj.surat_jalan_id}`} className="text-sm font-semibold text-[#E8632C] hover:underline">Buka</Link>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                });
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Input Inbound"
        subtitle="Isi detail barang masuk — stok masuk tercatat saat disimpan"
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
              tipe="inbound"
              excludeStatus="draft,selesai,ditolak"
              emptyMessage="Tidak ada BOQ yang dapat diajukan."
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
            <label className="mb-1 block text-xs font-medium text-gray-600">Tanggal Masuk <span className="text-rose-500">*</span></label>
            <input
              type="date"
              value={tanggalMasuk}
              onChange={(e) => setTanggalMasuk(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Gudang Asal <span className="text-rose-500">*</span></label>
            <div className="relative">
              <select
                value={selectedGudangAsalId}
                onChange={(e) => setSelectedGudangAsalId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
              >
                <option value="">Pilih Gudang Asal...</option>
                {warehouseOptions.map((w) => (
                  <option key={w.gudang_id} value={String(w.gudang_id)}>{w.nama_gudang}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div className="sm:col-span-2">
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
            <label className="mb-1 block text-xs font-medium text-gray-600">Gudang Tujuan <span className="text-rose-500">*</span></label>
            <div className="relative">
              <select
                value={selectedGudangTujuanId}
                onChange={(e) => setSelectedGudangTujuanId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
              >
                  <option value="" disabled>Pilih Gudang Tujuan...</option>
                  {gudangTujuanOptions.map((w) => (
                    <option key={w.gudang_id} value={String(w.gudang_id)}>
                      {w.label}
                    </option>
                  ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">PIC / Penerima</label>
            <input
              type="text"
              value={picPemohon}
              onChange={(e) => setPicPemohon(e.target.value)}
              placeholder="Nama pemohon barang"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Kendaraan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={kendaraanNamaTeks}
              onChange={(e) => setKendaraanNamaTeks(e.target.value)}
              placeholder="Contoh: Truk Box Mitsubishi Canter"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 focus:outline-none ${
                kendaraanValid ? "border-gray-200 focus:border-[#E8632C]" : "border-red-300 focus:border-red-400"
              }`}
            />
            {!kendaraanValid && (
              <p className="mt-1 text-xs text-red-600">Nama kendaraan wajib diisi.</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              No. Polisi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={kendaraanNoPolisTeks}
              onChange={(e) => setKendaraanNoPolisTeks(e.target.value)}
              placeholder="Contoh: B 9123 CD"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 focus:outline-none ${
                noPolisiValid ? "border-gray-200 focus:border-[#E8632C]" : "border-red-300 focus:border-red-400"
              }`}
            />
            {!noPolisiValid && (
              <p className="mt-1 text-xs text-red-600">Nomor polisi wajib diisi.</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Nama Driver <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={driverNamaTeks}
              onChange={(e) => setDriverNamaTeks(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 focus:outline-none ${
                driverValid ? "border-gray-200 focus:border-[#E8632C]" : "border-red-300 focus:border-red-400"
              }`}
            />
            {!driverValid && (
              <p className="mt-1 text-xs text-red-600">Nama driver wajib diisi.</p>
            )}
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Daftar Barang <span className="text-rose-500">*</span></p>

          {/* FORM DRAFT */}
          <div className="mt-3 rounded-xl border border-slate-100 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-orange-600">
                <input
                  type="checkbox"
                  checked={draftItem.is_non_master}
                  onChange={toggleDraftItemNonMaster}
                  className="h-3.5 w-3.5 accent-orange-500"
                />
                Barang non-master (di luar master data)
              </label>
              {draftItem.is_non_master && (
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
                  Non-master
                </span>
              )}
            </div>
            <div className="grid grid-cols-12 gap-1.5">
              <div className="col-span-3">
                {draftItem.is_non_master ? (
                  <input
                    type="text"
                    value={draftItem.nama_barang}
                    onChange={(e) => setDraftItemNama(e.target.value)}
                    placeholder="Nama barang (input manual)"
                    className="w-full rounded-lg border border-orange-200 bg-orange-50/40 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                  />
                ) : (
                  <BarangPicker
                    value={draftItem.kode_perangkat}
                    onSelect={(picked) => pickDraftItem(picked)}
                    placeholder="Kode perangkat"
                  />
                )}
              </div>
              <div className="col-span-2">
                <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Qty Surat Jalan</label>
                <input
                  type="number"
                  min={1}
                  value={draftItem.qtySuratJalan}
                  onChange={(e) => setDraftItemQty(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 py-1 text-center text-xs text-slate-800 outline-none focus:border-orange-400"
                />
              </div>
              <div className="col-span-1">
                <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Qty Aktual</label>
                <input
                  type="number"
                  min={0}
                  value={draftItem.qtyAktual}
                  onChange={(e) => setDraftItemQtyAktual(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-200 py-1 text-center text-xs text-slate-800 outline-none focus:border-orange-400"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Kondisi</label>
                <select
                  value={draftItem.kondisi}
                  onChange={(e) => {
                    setDraftItemKondisi(e.target.value);
                    if (kondisiError) setKondisiError(null);
                  }}
                  className={`w-full rounded-md px-1.5 py-1 text-[11px] text-slate-700 outline-none ${kondisiError ? "border border-red-500 focus:border-red-500" : "border border-slate-200 focus:border-orange-400"}`}
                >
                  <option value="">Pilih...</option>
                  {KONDISI_OPTIONS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                {kondisiError && <p className="mt-1 text-[11px] text-red-600">Kondisi barang wajib dipilih.</p>}
              </div>
              <div className="col-span-2">
                <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Serial Number</label>
                <input
                  type="text"
                  value={draftItem.serialNumber}
                  onChange={(e) => setDraftItemSerialNumber(e.target.value)}
                  placeholder="Opsional"
                  className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11px] text-slate-700 outline-none focus:border-orange-400"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Upload Foto</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <label
                    htmlFor="draft-foto"
                    className={`inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border border-dashed border-gray-300 px-1.5 text-[10px] font-medium text-gray-500 hover:border-[#E8632C] hover:text-[#E8632C] ${draftItem.uploadingFoto ? "pointer-events-none opacity-50" : ""}`}
                  >
                    {draftItem.uploadingFoto ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    Pilih Foto
                  </label>
                  <input
                    id="draft-foto"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={draftItem.uploadingFoto}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleDraftFotoUpload(file);
                      }
                      e.target.value = "";
                    }}
                  />
                  {draftItem.fotoPreview ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-md border border-[#E8632C]">
                      <img src={draftItem.fotoPreview} alt="Pratinjau foto" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[9px] font-medium text-white">
                        Mengunggah
                      </span>
                    </div>
                  ) : draftItem.fotos.length > 0 ? (
                    <div className="relative h-10 w-10 overflow-visible rounded-md border border-gray-200">
                      <img
                        src={draftItem.fotos[0].url}
                        alt={draftItem.fotos[0].filename || "Preview"}
                        className="h-10 w-10 cursor-pointer rounded-md border border-gray-200 object-cover"
                        onClick={() => setPreviewFotoUrl(draftItem.fotos[0].url)}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDraftFotoDelete(draftItem.fotos[0].foto_id);
                        }}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600"
                        title="Hapus foto"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : null}
                </div>
                {draftItem.fotoError && <p className="mt-1 text-[10px] text-rose-600">{draftItem.fotoError}</p>}
              </div>
            </div>
            <div className="mt-1.5 grid grid-cols-12 gap-1.5">
              <div className="col-span-3">
                {draftItem.is_non_master ? (
                  <select
                    value={draftItem.satuan_id}
                    onChange={(e) => setDraftItemSatuan(e.target.value)}
                    className="w-full rounded-lg border border-orange-200 bg-orange-50/40 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                  >
                    <option value="">Pilih satuan...</option>
                    {unitOptions.map((u) => (
                      <option key={u.satuan_id} value={String(u.satuan_id)}>
                        {u.kode_satuan}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={draftItem.nama_barang}
                    readOnly
                    placeholder="Nama barang"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none"
                  />
                )}
              </div>
              <div className="col-span-9">
                <input
                  type="text"
                  value={draftItem.catatan}
                  onChange={(e) => setDraftItemCatatan(e.target.value)}
                  placeholder="Catatan (opsional)"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                />
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {draftItem.is_non_master && (
                  <div>
                    <label className="mb-0.5 block text-[11px] font-medium text-slate-500">
                      Kategori barang <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={draftItem.kategori_id}
                      onChange={(e) => setDraftItemKategori(e.target.value)}
                      className="rounded-lg border border-orange-200 bg-orange-50/40 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400 sm:w-48"
                    >
                      <option value="">Pilih kategori...</option>
                      {categoryOptions.map((c) => (
                        <option key={c.kategori_id} value={String(c.kategori_id)}>
                          {c.nama_kategori}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {draftItem.is_di_luar_boq && !draftItem.is_non_master && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                    Di luar BOQ
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCheckDraftItem}
                className="flex items-center gap-1 rounded-lg bg-[#E8632C] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#D9591F]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Tambah ke Daftar
              </button>
            </div>
          </div>

          {/* TABEL RINGKASAN */}
          <>
            <MobileCardList items={mobileItemsInbound2} />
            {modalItems.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 hidden md:block">
                <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 font-semibold">Nama Barang</th>
                    <th className="px-3 py-2 font-semibold text-center">Qty Surat Jalan</th>
                    <th className="px-3 py-2 font-semibold text-center">Qty Aktual</th>
                    <th className="px-3 py-2 font-semibold">Kondisi</th>
                    <th className="px-3 py-2 font-semibold">SERIAL NUMBER</th>
                    <th className="px-3 py-2 font-semibold">Foto</th>
                    <th className="px-3 py-2 font-semibold">Catatan</th>
                    <th className="px-3 py-2 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {modalItems.map((row, idx) => (
                    <tr key={row.id} className={`border-t border-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                      <td className="px-3 py-2.5 font-medium text-gray-800">
                        {row.is_non_master ? row.nama_barang : `${row.kode_perangkat} - ${row.nama_barang}`}
                      </td>
                      <td className="px-3 py-2.5 text-center">{row.qtySuratJalan}</td>
                      <td className="px-3 py-2.5 text-center">{row.qtyAktual}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${KONDISI_TONE[row.kondisi] || "bg-gray-100 text-gray-600"}`}>
                          {KONDISI_OPTIONS.find((k) => k.value === row.kondisi)?.label || row.kondisi || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{row.serialNumber || "-"}</td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {row.fotos.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setPreviewFotoUrl(row.fotos[0].url)}
                            className="block"
                          >
                            <img
                              src={row.fotos[0].url}
                              alt={row.fotos[0].filename || "Foto barang"}
                              className="h-10 w-10 rounded-md border border-gray-200 object-cover transition hover:scale-105 hover:border-[#E8632C]"
                            />
                          </button>
                        ) : (
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-gray-200 text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{row.catatan || "-"}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditModalItem(row.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeModalItem(row.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
               </table>
             </div>
           )}
         </>

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

          {modalItems.length === 0 && (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
              Belum ada barang. Isi form draft di atas lalu klik Tambah ke Daftar untuk menambah.
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
            {submitting ? "Mengirim..." : "Simpan & Proses Putaway"}
          </Button>
        </div>
      </Modal>

      {editModalOpen && editDraftItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={handleCancelEditItem}
        >
          <div
            className="w-[calc(100vw-1.5rem)] max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Edit Item Barang</h3>
                <p className="mt-0.5 text-xs text-slate-400">Ubah detail item lalu klik Simpan Perubahan</p>
              </div>
              <button
                onClick={handleCancelEditItem}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5">
              {formError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  {formError}
                </div>
              )}
              <div className="rounded-xl border border-slate-100 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-orange-600">
                    <input
                      type="checkbox"
                      checked={editDraftItem.is_non_master}
                      onChange={toggleEditDraftItemNonMaster}
                      className="h-3.5 w-3.5 accent-orange-500"
                    />
                    Barang non-master (di luar master data)
                  </label>
                  {editDraftItem.is_non_master && (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
                      Non-master
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-12 gap-1.5">
                  <div className="col-span-3">
                    {editDraftItem.is_non_master ? (
                      <input
                        type="text"
                        value={editDraftItem.nama_barang}
                        onChange={(e) => setEditDraftItemNama(e.target.value)}
                        placeholder="Nama barang (input manual)"
                        className="w-full rounded-lg border border-orange-200 bg-orange-50/40 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                      />
                    ) : (
                      <BarangPicker
                        value={editDraftItem.kode_perangkat}
                        onSelect={(picked) => pickEditDraftItem(picked)}
                        placeholder="Kode perangkat"
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Qty Surat Jalan</label>
                    <input
                      type="number"
                      min={1}
                      value={editDraftItem.qtySuratJalan}
                      onChange={(e) => setEditDraftItemQty(Number(e.target.value))}
                      className="w-full rounded-md border border-slate-200 py-1 text-center text-xs text-slate-800 outline-none focus:border-orange-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Qty Aktual</label>
                    <input
                      type="number"
                      min={0}
                      value={editDraftItem.qtyAktual}
                      onChange={(e) => setEditDraftItemQtyAktual(Number(e.target.value))}
                      className="w-full rounded-md border border-slate-200 py-1 text-center text-xs text-slate-800 outline-none focus:border-orange-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Kondisi</label>
                    <select
                      value={editDraftItem.kondisi}
                      onChange={(e) => {
                        setEditDraftItemKondisi(e.target.value);
                        if (editKondisiError) setEditKondisiError(null);
                      }}
                      className={`w-full rounded-md px-1.5 py-1 text-[11px] text-slate-700 outline-none ${editKondisiError ? "border border-red-500 focus:border-red-500" : "border border-slate-200 focus:border-orange-400"}`}
                    >
                      <option value="">Pilih...</option>
                      {KONDISI_OPTIONS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                    {editKondisiError && <p className="mt-1 text-[11px] text-red-600">Kondisi barang wajib dipilih.</p>}
                  </div>
                  <div className="col-span-1">
                    <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Serial Number</label>
                    <input
                      type="text"
                      value={editDraftItem.serialNumber}
                      onChange={(e) => setEditDraftItemSerialNumber(e.target.value)}
                      placeholder="Opsional"
                      className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-[11px] text-slate-700 outline-none focus:border-orange-400"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-0.5 block text-[10px] font-medium text-slate-500">Upload Foto</label>
                    <div className="flex flex-row items-center gap-2">
                      <label
                        htmlFor="edit-foto"
                        className={`inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border border-dashed border-gray-300 px-1.5 text-[10px] font-medium text-gray-500 hover:border-[#E8632C] hover:text-[#E8632C] ${editDraftItem.uploadingFoto ? "pointer-events-none opacity-50" : ""}`}
                      >
                        {editDraftItem.uploadingFoto ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        Pilih Foto
                      </label>
                      <input
                        id="edit-foto"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={editDraftItem.uploadingFoto}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleEditDraftFotoUpload(file);
                          }
                          e.target.value = "";
                        }}
                      />
                      {editDraftItem.fotoPreview ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-md border border-[#E8632C]">
                          <img src={editDraftItem.fotoPreview} alt="Pratinjau foto" className="h-full w-full object-cover" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[9px] font-medium text-white">
                            Mengunggah
                          </span>
                        </div>
                      ) : editDraftItem.fotos.length > 0 ? (
                        <div className="relative h-10 w-10 overflow-visible rounded-md border border-gray-200">
                          <img
                            src={editDraftItem.fotos[0].url}
                            alt={editDraftItem.fotos[0].filename || "Preview"}
                            className="h-10 w-10 cursor-pointer rounded-md border border-gray-200 object-cover"
                            onClick={() => setPreviewFotoUrl(editDraftItem.fotos[0].url)}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDraftFotoDelete(editDraftItem.fotos[0].foto_id);
                            }}
                            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600"
                            title="Hapus foto"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {editDraftItem.fotoError && <p className="mt-1 text-[10px] text-rose-600">{editDraftItem.fotoError}</p>}
                  </div>
                </div>
                <div className="mt-1.5 grid grid-cols-12 gap-1.5">
                  <div className="col-span-3">
                    {editDraftItem.is_non_master ? (
                      <select
                        value={editDraftItem.satuan_id}
                        onChange={(e) => setEditDraftItemSatuan(e.target.value)}
                        className="w-full rounded-lg border border-orange-200 bg-orange-50/40 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                      >
                        <option value="">Pilih satuan...</option>
                        {unitOptions.map((u) => (
                          <option key={u.satuan_id} value={String(u.satuan_id)}>
                            {u.kode_satuan}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editDraftItem.nama_barang}
                        readOnly
                        placeholder="Nama barang"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none"
                      />
                    )}
                  </div>
                  <div className="col-span-9">
                    <input
                      type="text"
                      value={editDraftItem.catatan}
                      onChange={(e) => setEditDraftItemCatatan(e.target.value)}
                      placeholder="Catatan (opsional)"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                    />
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {editDraftItem.is_non_master && (
                    <div>
                      <label className="mb-0.5 block text-[11px] font-medium text-slate-500">
                        Kategori barang <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={editDraftItem.kategori_id}
                        onChange={(e) => setEditDraftItemKategori(e.target.value)}
                        className="rounded-lg border border-orange-200 bg-orange-50/40 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400 sm:w-48"
                      >
                        <option value="">Pilih kategori...</option>
                        {categoryOptions.map((c) => (
                          <option key={c.kategori_id} value={String(c.kategori_id)}>
                            {c.nama_kategori}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {editDraftItem.is_di_luar_boq && !editDraftItem.is_non_master && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                      Di luar BOQ
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEditItem} disabled={submitting}>
                  Batal
                </Button>
                <Button
                  onClick={handleSaveEditItem}
                  disabled={submitting}
                  className="bg-[#E8632C] hover:bg-[#D9591F]"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          </div>
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
              <h3 className="text-lg font-bold text-gray-900">Surat Jalan Inbound Berhasil Disimpan</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Stok masuk sudah tercatat saat disimpan. Lanjutkan penerimaan &amp; putaway dari daftar.
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

      {previewFotoUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setPreviewFotoUrl(null)}
        >
          <div
            className="w-[calc(100vw-1.5rem)] max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <p className="text-xs font-medium text-slate-500">Preview Foto</p>
              <button
                onClick={() => setPreviewFotoUrl(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <img
                src={previewFotoUrl}
                alt="Preview"
                className="max-h-[70vh] w-full rounded-xl object-contain"
              />
            </div>
            <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4">
              <Button variant="outline" onClick={() => setPreviewFotoUrl(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
