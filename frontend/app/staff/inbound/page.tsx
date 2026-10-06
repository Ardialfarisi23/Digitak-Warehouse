"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PackageCheck, Plus, X, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BarangPicker, {
  type BarangPickerItem,
} from "@/components/BarangPicker";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import BoqPicker, { type BoqPickerItem } from "@/components/BoqPicker";

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
}

interface InboundSuratJalan {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: InboundStatus;
  created_at: string;
  created_by?: string | number;
  creator?: {
    user_id?: string | number;
    nama?: string;
    name?: string;
  } | null;
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

interface ModalItemRow {
  id: string;
  barang_id: string;
  kode_perangkat: string;
  nama_barang: string;
  qty: number;
  satuan_id: string;
  satuan_label: string;
  kategori_id: string;
  catatan: string;
  is_di_luar_boq: boolean;
  is_non_master: boolean;
  catatanAutoFilled: boolean;
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
  const { get, post, put } = useApi();
  const { user } = useAuth();
  const [list, setList] = useState<InboundSuratJalan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

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
    setFormError(null);
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
        kategori_id: "",
        catatan: "",
        is_di_luar_boq: true,
        is_non_master: false,
        catatanAutoFilled: false,
      },
    ]);
  };

  const removeModalItem = (id: string) => {
    setModalItems((prev) => prev.filter((row) => row.id !== id));
  };

  const toggleModalItemNonMaster = (id: string) => {
    setModalItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const nextNonMaster = !row.is_non_master;
        if (nextNonMaster) {
          return {
            ...row,
            is_non_master: true,
            barang_id: "",
            kode_perangkat: "",
            nama_barang: "",
            satuan_id: "",
            satuan_label: "",
            kategori_id: "",
            is_di_luar_boq: true,
            catatan: row.catatanAutoFilled ? "" : row.catatan,
            catatanAutoFilled: false,
          };
        }
        return {
          ...row,
          is_non_master: false,
          nama_barang: "",
          kategori_id: "",
        };
      })
    );
  };

  const setModalItemNama = (id: string, value: string) => {
    setModalItems((prev) => prev.map((row) => (row.id === id ? { ...row, nama_barang: value } : row)));
  };

  const setModalItemKategori = (id: string, value: string) => {
    setModalItems((prev) => prev.map((row) => (row.id === id ? { ...row, kategori_id: value } : row)));
  };

  const setModalItemSatuan = (id: string, value: string) => {
    const selected = unitOptions.find((u) => String(u.satuan_id) === String(value));
    setModalItems((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, satuan_id: value, satuan_label: selected?.kode_satuan || "" }
          : row
      )
    );
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
            is_di_luar_boq: true,
            catatan: row.catatan || "Di luar BOQ",
            catatanAutoFilled: true,
          };
        }
        const satuanId = picked.satuan_default_id
          ? String(picked.satuan_default_id)
          : "";
        const isInBoq = boqItemsDetail.some(
          (boqItem) => String(boqItem.barang_id) === String(picked.id)
        );
        const catatan =
          row.catatan && row.catatan !== "Di luar BOQ"
            ? row.catatan
            : isInBoq
              ? ""
              : "Di luar BOQ";
        return {
          ...row,
          barang_id: picked.id,
          kode_perangkat: picked.kode_perangkat,
          nama_barang: picked.nama_barang,
          satuan_id: satuanId,
          satuan_label: picked.satuan_default_kode || "",
          is_di_luar_boq: !isInBoq,
          catatan,
          catatanAutoFilled: true,
        };
      }),
    );
  };

  const setModalItemQty = (id: string, value: number) => {
    setModalItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, qty: Math.max(0, value) } : row)),
    );
  };

  useEffect(() => {
    if (!boqItemsDetail.length) {
      setModalItems((prev) =>
        prev.map((row) => {
          const nextIsDiLuarBoq = row.barang_id ? true : row.is_di_luar_boq;
          const nextCatatan =
            row.catatanAutoFilled && row.catatan && row.catatan !== "Di luar BOQ"
              ? row.catatan
              : row.barang_id
                ? "Di luar BOQ"
                : "";
          return {
            ...row,
            is_di_luar_boq: nextIsDiLuarBoq,
            catatan: nextCatatan,
            catatanAutoFilled: row.barang_id ? true : row.catatanAutoFilled,
          };
        })
      );
      return;
    }
    setModalItems((prev) =>
      prev.map((row) => {
        if (!row.barang_id) return row;
        const isInBoq = boqItemsDetail.some(
          (boqItem) => String(boqItem.barang_id) === String(row.barang_id)
        );
        const nextIsDiLuarBoq = !isInBoq;
        const nextCatatan = row.catatanAutoFilled
          ? isInBoq
            ? ""
            : "Di luar BOQ"
          : row.catatan;
        return {
          ...row,
          is_di_luar_boq: nextIsDiLuarBoq,
          catatan: nextCatatan,
        };
      })
    );
  }, [boqItemsDetail]);

  const setModalItemCatatan = (id: string, value: string) => {
    setModalItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, catatan: value, catatanAutoFilled: false } : row)),
    );
  };

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
    if (row.qty <= 0 || !row.satuan_id) return false;
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
    modalItems.every(isRowValid);

  const validModalItems = useMemo(
    () => modalItems.filter(isRowValid),
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
          qty: row.qty,
          satuan_id: row.satuan_id,
          kondisi: "baik",
          is_kelebihan: false,
          is_di_luar_boq: row.is_non_master ? true : row.is_di_luar_boq,
          catatan: row.catatan?.trim() || null,
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
                      ) : sj.status === "ready_putaway" ? (
                        <Link
                          href={`/staff/putaway/${sj.surat_jalan_id}`}
                          className="text-sm font-semibold text-[#E8632C] hover:underline"
                        >
                          Putaway
                        </Link>
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
                  <option key={w.gudang_id} value={String(w.gudang_id)}>
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
                <div className="col-span-12 mb-1 flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-orange-600">
                    <input
                      type="checkbox"
                      checked={row.is_non_master}
                      onChange={() => toggleModalItemNonMaster(row.id)}
                      className="h-3.5 w-3.5 accent-orange-500"
                    />
                    Barang non-master (di luar master data)
                  </label>
                  {row.is_non_master && (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
                      Non-master
                    </span>
                  )}
                </div>
                <div className="col-span-4">
                  {row.is_non_master ? (
                    <input
                      type="text"
                      value={row.nama_barang}
                      onChange={(e) => setModalItemNama(row.id, e.target.value)}
                      placeholder="Nama barang (input manual)"
                      className="w-full rounded-lg border border-orange-200 bg-orange-50/40 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                    />
                  ) : (
                    <BarangPicker
                      value={row.kode_perangkat}
                      onSelect={(picked) => pickModalItem(row.id, picked)}
                      placeholder="Kode perangkat"
                    />
                  )}
                </div>
                <div className="col-span-4">
                  {row.is_non_master ? (
                    <select
                      value={row.satuan_id}
                      onChange={(e) => setModalItemSatuan(row.id, e.target.value)}
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
                      value={row.nama_barang}
                      readOnly
                      placeholder="Nama barang"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none"
                    />
                  )}
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
                <div className="col-span-12">
                  {row.is_non_master && (
                    <div className="mb-2">
                      <label className="mb-1 block text-[11px] font-medium text-slate-500">
                        Kategori barang <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={row.kategori_id}
                        onChange={(e) => setModalItemKategori(row.id, e.target.value)}
                        className="w-full rounded-lg border border-orange-200 bg-orange-50/40 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400 sm:w-64"
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
                  <input
                    type="text"
                    value={row.catatan}
                    onChange={(e) => setModalItemCatatan(row.id, e.target.value)}
                    placeholder="Catatan (opsional)"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                  />
                  {row.is_di_luar_boq && !row.is_non_master && (
                    <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                      Di luar BOQ
                    </span>
                  )}
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
