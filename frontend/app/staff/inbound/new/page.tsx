"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, ChevronDown, ChevronLeft, Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BarangPicker, {
  type BarangPickerItem,
} from "@/components/BarangPicker";
import { useApi } from "@/lib/api";
import { MobileCardList, type MobileCardField, type MobileCardItem } from "@/components/MobileCardList";

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

interface ProjectOption {
  project_id: string | number;
  nama_project?: string;
}

interface ClusterOption {
  cluster_id: string | number;
  nama_cluster?: string;
}

// Bentuk row BOQ dari GET /api/boqs (transformBoq menambahkan alias camelCase).
interface ApiBoqRow {
  boq_id?: number | string;
  id?: string | number;
  cluster_id?: string | null;
  clusterId?: string | null;
  cluster?: { cluster_id?: string | null; clusterId?: string | null } | null;
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

// Batas ukuran file yang boleh dikirim sebagai lampiran inline (Base64) di dalam
// payload JSON kalau upload ke endpoint /api/upload gagal.
const MAX_INLINE_PDF_BYTES = 8 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
}

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

interface InboundPreviewRow {
  kode: string;
  nama: string;
  qty: number;
  satuan: string;
  kondisi: string;
  catatan: string;
  fotoUrl: string | null;
}

function PreviewInboundModal({
  open,
  onClose,
  onConfirm,
  submitting,
  nomorSuratJalan,
  vendorLabel,
  gudangTujuan,
  tanggalLabel,
  projectName,
  boqNumber,
  kodeTiket,
  picPemohon,
  kendaraan,
  noPolisi,
  driver,
  items,
  suratJalanFileName,
  suratJalanUrl,
  suratJalanSize,
  suratJalanInline,
  onImageClick,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  nomorSuratJalan: string;
  vendorLabel: string;
  gudangTujuan: string;
  tanggalLabel: string;
  projectName: string;
  boqNumber: string;
  kodeTiket: string;
  picPemohon: string;
  kendaraan: string;
  noPolisi: string;
  driver: string;
  items: InboundPreviewRow[];
  suratJalanFileName: string | null;
  suratJalanUrl: string | null;
  suratJalanSize: number | null;
  suratJalanInline: boolean;
  onImageClick: (url: string) => void;
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

  const fotoCount = items.filter((item) => item.fotoUrl).length;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Preview Ringkasan Penerimaan Inbound"
    >
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Preview Ringkasan Penerimaan Inbound</h3>
            <p className="mt-0.5 text-xs text-slate-400">Periksa kembali seluruh data penerimaan inbound sebelum disimpan.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Informasi Transaksi</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">No. Surat Jalan</span>
                <span className="font-medium text-slate-700">{nomorSuratJalan || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Vendor</span>
                <span className="font-medium text-slate-700">{vendorLabel || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Gudang Tujuan</span>
                <span className="font-medium text-slate-700">{gudangTujuan || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tanggal</span>
                <span className="font-medium text-slate-700">{tanggalLabel || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Project</span>
                <span className="font-medium text-slate-700">{projectName || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">BOQ / Tiket</span>
                <span className="font-medium text-slate-700">
                  {[boqNumber, kodeTiket ? `Tiket: ${kodeTiket}` : ""].filter(Boolean).join(" · ") || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Detail Pengiriman</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">PIC / Penerima</span>
                <span className="font-medium text-slate-700">{picPemohon || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Kendaraan</span>
                <span className="font-medium text-slate-700">{kendaraan || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">No. Polisi</span>
                <span className="font-medium text-slate-700">{noPolisi || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nama Driver</span>
                <span className="font-medium text-slate-700">{driver || "-"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Rincian Barang yang Diterima</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[10px] uppercase leading-tight tracking-wide text-gray-400">
                    <th className="pb-2 pr-3 font-semibold">Kode Barang</th>
                    <th className="pb-2 pr-3 font-semibold">Nama Barang</th>
                    <th className="pb-2 pr-3 text-right font-semibold">Qty</th>
                    <th className="pb-2 pr-3 font-semibold">Satuan</th>
                    <th className="pb-2 pr-3 font-semibold">Kondisi</th>
                    <th className="pb-2 pr-3 font-semibold">Catatan</th>
                    <th className="pb-2 font-semibold">Foto</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0 odd:bg-white even:bg-slate-50">
                      <td className="py-2 pr-3 font-medium text-gray-800">{item.kode || "-"}</td>
                      <td className="py-2 pr-3 text-gray-600">{item.nama || "-"}</td>
                      <td className="py-2 pr-3 text-right text-gray-700">{item.qty}</td>
                      <td className="py-2 pr-3 text-gray-500">{item.satuan || "-"}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${KONDISI_TONE[item.kondisi] || "bg-gray-100 text-gray-600"}`}>
                          {KONDISI_OPTIONS.find((k) => k.value === item.kondisi)?.label || item.kondisi || "-"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-gray-600">{item.catatan || "-"}</td>
                      <td className="py-2">
                        {item.fotoUrl ? (
                          <button
                            type="button"
                            onClick={() => onImageClick(item.fotoUrl as string)}
                            className="h-10 w-10 overflow-hidden rounded-md border border-gray-200"
                          >
                            <img src={item.fotoUrl} alt="Preview" className="h-full w-full object-cover" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-gray-400">Belum ada barang yang ditambahkan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Lampiran Dokumen</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Surat Jalan (PDF)</span>
                <span className="font-medium text-slate-700">
                  {suratJalanFileName ? (
                    suratJalanUrl && !suratJalanInline ? (
                      <a href={suratJalanUrl} target="_blank" rel="noreferrer" className="text-[#E8632C] hover:underline">
                        {suratJalanFileName}
                      </a>
                    ) : (
                      suratJalanFileName
                    )
                  ) : (
                    <span className="text-gray-400">Belum ada lampiran</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Foto Barang</span>
                <span className="font-medium text-slate-700">
                  {fotoCount > 0 ? `${fotoCount} dari ${items.length} item memiliki foto` : "Belum ada foto barang"}
                </span>
              </div>
            </div>
            {suratJalanFileName ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                PDF Terlampir: {suratJalanFileName}
                {suratJalanSize ? ` (${formatBytes(suratJalanSize)})` : ""}
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-400">
                Surat jalan PDF belum dilampirkan. Supervisor tidak dapat melihat dokumen lampiran.
              </p>
            )}
            {suratJalanInline && (
              <p className="mt-2 text-xs text-amber-600">
                PDF dikirim sebagai lampiran langsung pada pengajuan ini dan bisa langsung dilihat supervisor.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Kembali / Edit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-xl bg-[#E8632C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
          >
            {submitting ? "Menyimpan..." : "Konfirmasi & Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InboundNewPage() {
  const { get, post } = useApi();
  const router = useRouter();
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseOption[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [clusterOptions, setClusterOptions] = useState<ClusterOption[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Pilihan utama form: Project -> Cluster; BOQ ikut terpilih dari cluster
  // karena backend membatasi 1 cluster = maksimal 1 BOQ aktif.
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedClusterId, setSelectedClusterId] = useState("");
  const [selectedBoqId, setSelectedBoqId] = useState("");
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
  const [suratJalanPdfUrl, setSuratJalanPdfUrl] = useState("");
  const [suratJalanPdfDataUrl, setSuratJalanPdfDataUrl] = useState("");
  const [suratJalanPdfInline, setSuratJalanPdfInline] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBoqMeta, setSelectedBoqMeta] = useState({
    boq_number: "",
    kode_tiket: "",
    project_name: "",
  });
  const fotoPreviewRef = useRef<Record<string, string>>({});

  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      // Semua endpoint master di bawah memakai paginasi default limit=10,
      // jadi `limit` wajib dikirim supaya isi dropdown tidak terpotong.
      const [warehouseRes, supplierRes, unitRes, categoryRes, projectRes] = await Promise.all([
        get(`${baseUrl}/api/warehouses?limit=1000`),
        get(`${baseUrl}/api/suppliers?limit=1000`),
        get(`${baseUrl}/api/units?limit=1000`),
        get(`${baseUrl}/api/categories?limit=1000`),
        get(`${baseUrl}/api/projects?limit=1000`),
      ]);
      if (!warehouseRes.ok) throw new Error("Gagal mengambil daftar gudang.");
      if (!supplierRes.ok) throw new Error("Gagal mengambil daftar supplier.");
      if (!unitRes.ok) throw new Error("Gagal mengambil daftar satuan.");
      if (!categoryRes.ok) throw new Error("Gagal mengambil daftar kategori.");
      if (!projectRes.ok) throw new Error("Gagal mengambil daftar project.");

      const [warehouseJson, supplierJson, unitJson, categoryJson, projectJson] = await Promise.all([
        warehouseRes.json(),
        supplierRes.json(),
        unitRes.json(),
        categoryRes.json(),
        projectRes.json(),
      ]);

      const unwrap = (json: unknown) => {
        const data = (json as { data?: unknown } | null | undefined)?.data;
        if (Array.isArray(data)) return data;
        const nested =
          (json as { data?: { data?: unknown } | null } | null | undefined)?.data?.data;
        return Array.isArray(nested) ? nested : [];
      };
      setWarehouseOptions(unwrap(warehouseJson));
      setSupplierOptions(unwrap(supplierJson));
      setUnitOptions(unwrap(unitJson));
      setCategoryOptions(unwrap(categoryJson));
      setProjectOptions(unwrap(projectJson));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal memuat data master.");
    } finally {
      setLoadingOptions(false);
    }
  };

  const initializeForm = async () => {
    setSelectedBoqId("");
    setSelectedProjectId("");
    setSelectedClusterId("");
    setClusterOptions([]);
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
    setSuratJalanPdfDataUrl("");
    setSuratJalanPdfInline(false);
    setPdfUploadError(null);
    setShowPreviewModal(false);
    setSelectedBoqMeta({ boq_number: "", kode_tiket: "", project_name: "" });
    setBoqItemsDetail([]);
    await loadOptions();
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
    initializeForm();
  }, [get]);

  useEffect(() => {
    let cancelled = false;
    setSelectedClusterId("");
    setClusterOptions([]);
    setSelectedBoqId("");
    setBoqItemsDetail([]);

    if (!selectedProjectId) {
      setLoadingClusters(false);
      return () => { cancelled = true; };
    }

    const loadClusters = async () => {
      setLoadingClusters(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        // Endpoint read-only khusus staf: hanya id/kode/nama cluster.
        const res = await get(`${baseUrl}/api/clusters/options?project_id=${encodeURIComponent(selectedProjectId)}`);
        if (!res.ok) throw new Error("Gagal mengambil daftar cluster.");
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) setClusterOptions(rows);
      } catch (err) {
        if (!cancelled) {
          setClusterOptions([]);
          setFormError(err instanceof Error ? err.message : "Gagal mengambil daftar cluster.");
        }
      } finally {
        if (!cancelled) setLoadingClusters(false);
      }
    };

    loadClusters();
    return () => { cancelled = true; };
  }, [selectedProjectId, get]);

  useEffect(() => {
    let cancelled = false;
    setSelectedBoqId("");
    setBoqItemsDetail([]);
    if (!selectedProjectId || !selectedClusterId) return () => { cancelled = true; };

    const loadActiveBoq = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const params = new URLSearchParams({
          projectId: selectedProjectId,
          clusterId: selectedClusterId,
          status: "aktif",
          limit: "100",
        });
        // Endpoint read-only khusus staf: daftar BOQ minimal untuk form Surat Jalan.
        const res = await get(`${baseUrl}/api/boqs/options?${params.toString()}`);
        if (!res.ok) throw new Error("Gagal mengambil BOQ aktif untuk cluster ini.");
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.data) ? json.data.data : [];
        const scopedRows = rows.filter((row: ApiBoqRow) =>
          String(row.cluster_id ?? row.clusterId ?? row.cluster?.clusterId ?? row.cluster?.cluster_id ?? "") === String(selectedClusterId)
        );
        if (cancelled) return;
        if (scopedRows.length === 0) {
          setFormError("Tidak ada BOQ aktif untuk cluster yang dipilih.");
          return;
        }
        if (scopedRows.length > 1) {
          setFormError("Ditemukan lebih dari satu BOQ aktif untuk cluster ini. Hubungi administrator.");
          return;
        }
        setSelectedBoqId(String(scopedRows[0].boq_id ?? scopedRows[0].id ?? ""));
      } catch (err) {
        if (!cancelled) setFormError(err instanceof Error ? err.message : "Gagal mengambil BOQ aktif.");
      }
    };

    loadActiveBoq();
    return () => { cancelled = true; };
  }, [selectedProjectId, selectedClusterId, get]);

  useEffect(() => {
    if (!selectedBoqId) {
      setBoqItemsDetail([]);
      return;
    }
    let cancelled = false;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const fetchBoqDetail = async () => {
      try {
        // Endpoint read-only khusus staf: detail BOQ minimal (item BOQ).
        const res = await get(`${baseUrl}/api/boqs/options/${selectedBoqId}`);
        if (!res.ok) return;
        const json = await res.json();
        const boq = json?.data;
        if (!boq || !Array.isArray(boq.items)) return;
        if (cancelled) return;
        setBoqItemsDetail(
          boq.items.map(
            (item: {
              barang_id?: string | number;
              id?: string | number;
              itemCode?: string;
              itemName?: string;
              barang?: {
                kode_perangkat?: string;
                nama_barang?: string;
                satuan_default?: { kode_satuan?: string } | null;
              } | null;
            }) => ({
              barang_id: String(item.barang_id || item.id || ""),
              itemCode: item.itemCode || item.barang?.kode_perangkat || "",
              itemName: item.itemName || item.barang?.nama_barang || "",
            })
          )
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
    // Direset supaya file yang sama bisa dipilih ulang kalau staf ganti file.
    e.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      setFormError("File surat jalan harus berformat PDF.");
      return;
    }

    setFormError(null);
    setPdfUploadError(null);
    setSuratJalanPdf(file);
    setSuratJalanPdfUrl("");
    setSuratJalanPdfInline(false);

    // PDF dibaca menjadi Data URL (Base64) agar tetap bisa dilampirkan lewat
    // payload walau endpoint upload sedang bermasalah.
    let dataUrl = "";
    try {
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(reader.error || new Error("Gagal membaca file PDF."));
        reader.readAsDataURL(file);
      });
    } catch {
      dataUrl = "";
    }
    setSuratJalanPdfDataUrl(dataUrl);

    setUploadingPdf(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const formData = new FormData();
      formData.append("file", file);

      // Endpoint upload wajib token, jadi request dikirim lewat useApi()
      // supaya header Authorization ikut terbawa.
      const response = await post(`${baseUrl}/api/upload`, formData);

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal upload PDF surat jalan.");
      }

      const result = await response.json();
      const url = result?.data?.url || result?.url;
      if (!url) throw new Error("URL file tidak ditemukan dari respons upload.");

      setSuratJalanPdfUrl(url);
      setSuratJalanPdfInline(false);
    } catch (err) {
      setSuratJalanPdfUrl("");

      if (!dataUrl) {
        setSuratJalanPdf(null);
        setSuratJalanPdfDataUrl("");
        setSuratJalanPdfInline(false);
        setPdfUploadError(
          err instanceof Error ? err.message : "Gagal upload PDF surat jalan."
        );
      } else if (file.size > MAX_INLINE_PDF_BYTES) {
        setSuratJalanPdf(null);
        setSuratJalanPdfDataUrl("");
        setSuratJalanPdfInline(false);
        setPdfUploadError(
          "Gagal upload PDF dan ukuran file terlalu besar untuk dikirim sebagai lampiran langsung. Silakan pilih ulang file PDF-nya."
        );
      } else {
        // Fallback: PDF tetap terpasang dan akan dikirim sebagai Base64 di payload.
        setSuratJalanPdfInline(true);
        setPdfUploadError(
          "Server upload tidak dapat dihubungi. PDF akan tetap dilampirkan langsung pada pengajuan inbound ini."
        );
      }
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

  const gudangTujuanOptions = warehouseOptions.map((w) => {
    const isTransit = w.tipe === "dadakan";
    const transitProjectIni =
      isTransit && w.project_id != null && String(w.project_id) === String(selectedProjectId);

    let label = w.nama_gudang;
    if (transitProjectIni) {
      label += " (Transit - Project Ini)";
    } else if (isTransit) {
      label += " (Transit)";
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
    selectedClusterId &&
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
    if (!selectedProjectId) {
      setFormError("Pilih project terlebih dahulu.");
      return;
    }

    if (!selectedClusterId) {
      setFormError("Pilih cluster terlebih dahulu.");
      return;
    }

    if (!selectedBoqId) {
      setFormError("Tidak ada BOQ aktif untuk cluster yang dipilih.");
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

    if (!canSubmitModal) {
      setFormError("Lengkapi seluruh data inbound, termasuk minimal satu barang beserta kondisinya.");
      return;
    }

    setFormError(null);
    setShowPreviewModal(true);
  };

  const handleConfirmSaveInbound = async () => {
    if (!canSubmitModal) {
      setShowPreviewModal(false);
      setFormError("Lengkapi seluruh data inbound, termasuk minimal satu barang beserta kondisinya.");
      return;
    }
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
        cluster_id: selectedClusterId || null,
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
        surat_jalan_url: suratJalanPdfUrl || suratJalanPdfDataUrl || null,
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
          (resultObj as { message?: string } | null)?.message ||
          rawText ||
          "Gagal membuat pengajuan inbound.";

        const validationDetails =
          (resultObj as { errors?: unknown; details?: unknown } | null)?.errors ??
          (resultObj as { errors?: unknown; details?: unknown } | null)?.details ??
          null;

        const fullMessage = validationDetails
          ? `${message} Detail: ${JSON.stringify(validationDetails)}`
          : message;

        throw new Error(fullMessage);
      }

      setShowPreviewModal(false);
      setShowSuccessModal(true);
      router.push("/staff/inbound");
    } catch (err) {
      setShowPreviewModal(false);
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat pengajuan inbound.");
    } finally {
      setSubmitting(false);
    }
  };

  function handleSuccessModalClose() {
    setShowSuccessModal(false);
    router.push("/staff/inbound");
  }

  useEffect(() => {
    return () => {
      Object.values(fotoPreviewRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      fotoPreviewRef.current = {};
    };
  }, []);

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

  const previewVendorLabel = (() => {
    if (selectedAsalTipe === "internal") {
      const asal = warehouseOptions.find((w) => String(w.gudang_id) === selectedGudangAsalId);
      return asal ? `Internal — ${asal.nama_gudang}` : "Internal";
    }
    if (selectedAsalTipe === "external") {
      if (isVendorManual) return pengirimEksternalNama.trim();
      const supplier = supplierOptions.find((s) => String(s.supplier_id) === selectedSupplierId);
      return supplier ? `${supplier.kode} - ${supplier.nama}` : "";
    }
    return "";
  })();

  const previewGudangTujuanLabel =
    gudangTujuanOptions.find((w) => String(w.gudang_id) === selectedGudangTujuanId)?.label || "";

  const previewTanggalLabel = (() => {
    if (!tanggalMasuk) return "";
    const [year, month, day] = tanggalMasuk.split("-").map(Number);
    if (!year || !month || !day) return tanggalMasuk;
    return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  })();

  const previewItems: InboundPreviewRow[] = modalItems.map((row) => ({
    kode: row.is_non_master ? "Non-master" : row.kode_perangkat,
    nama: row.nama_barang,
    qty: row.qtySuratJalan,
    satuan: row.satuan_label,
    kondisi: row.kondisi,
    catatan: row.catatan,
    fotoUrl: row.fotos.length > 0 ? row.fotos[0].url : null,
  }));

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex flex-col gap-1">
          <Link href="/staff/inbound" className="inline-flex items-center gap-1 text-xs text-[#E8632C] hover:underline">
            <ChevronLeft size={14} /> Kembali ke Daftar Penerimaan
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Input Inbound</h1>
          <p className="mt-1 text-sm text-gray-500">Isi detail barang masuk — stok masuk tercatat saat disimpan</p>
        </div>
        <div className="flex items-end gap-3">
          <Button variant="outline" onClick={() => router.push("/staff/inbound")}>
            Batal
          </Button>
        </div>
      </div>

      {formError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Project <span className="text-rose-500">*</span></label>
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setSelectedClusterId("");
              setSelectedBoqId("");
              setBoqItemsDetail([]);
              setFormError(null);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
          >
            <option value="">Pilih Project...</option>
            {projectOptions.map((project) => (
              <option key={project.project_id} value={String(project.project_id)}>
                {project.nama_project || `Project #${project.project_id}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Cluster <span className="text-rose-500">*</span></label>
          <select
            value={selectedClusterId}
            disabled={!selectedProjectId || loadingClusters}
            onChange={(e) => {
              setSelectedClusterId(e.target.value);
              setSelectedBoqId("");
              setBoqItemsDetail([]);
              setFormError(null);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {!selectedProjectId
                ? "Pilih project terlebih dahulu"
                : loadingClusters
                  ? "Memuat cluster..."
                  : "Pilih Cluster..."}
            </option>
            {clusterOptions.map((cluster) => (
              <option key={cluster.cluster_id} value={String(cluster.cluster_id)}>
                {cluster.cluster_id} — {cluster.nama_cluster || cluster.cluster_id}
              </option>
            ))}
          </select>
          {selectedProjectId && !loadingClusters && clusterOptions.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">Project ini belum memiliki cluster.</p>
          )}
          {selectedProjectId && selectedClusterId && !selectedBoqId && (
            <p className="mt-1 text-xs text-gray-500">Memuat BOQ aktif untuk cluster yang dipilih...</p>
          )}
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
            <>
              <select
                value={selectedGudangAsalId}
                onChange={(e) => setSelectedGudangAsalId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
              >
                <option value="">Pilih gudang asal</option>
                {warehouseOptions
                  .filter((w) => String(w.gudang_id) !== String(selectedGudangTujuanId))
                  .map((w) => (
                    <option key={w.gudang_id} value={String(w.gudang_id)}>
                      {w.nama_gudang}
                    </option>
                  ))}
              </select>
              {!selectedGudangAsalId && (
                <p className="mt-1 text-xs text-red-600">Gudang asal wajib dipilih untuk pengiriman internal.</p>
              )}
            </>
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
          {pdfUploadError && !uploadingPdf && (
            <p className="mt-1 text-xs font-medium text-amber-600">{pdfUploadError}</p>
          )}
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
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              PDF Terlampir: {suratJalanPdf.name} ({formatBytes(suratJalanPdf.size)})
              {suratJalanPdfInline && (
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-700">
                  Lampiran langsung
                </span>
              )}
            </p>
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
            <div className="mt-4 rounded-xl border border-slate-100 hidden md:block">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 w-12 text-center">No</th>
                    <th className="px-3 py-2 font-semibold max-w-[26%] break-words">Nama Barang</th>
                    <th className="px-3 py-2 font-semibold text-center">Qty Surat Jalan</th>
                    <th className="px-3 py-2 font-semibold text-center">Qty Aktual</th>
                    <th className="px-3 py-2 font-semibold max-w-[20%] break-words">Kondisi</th>
                    <th className="px-3 py-2 font-semibold">SERIAL NUMBER</th>
                    <th className="px-3 py-2 font-semibold">Foto</th>
                    <th className="px-3 py-2 font-semibold max-w-[20%] break-words">Catatan</th>
                    <th className="px-3 py-2 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {modalItems.map((row, idx) => (
                    <tr key={row.id} className={`border-t border-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                      <td className="px-3 py-2.5 text-center text-xs text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-800 max-w-[26%] break-words overflow-hidden">
                        {row.is_non_master ? row.nama_barang : `${row.kode_perangkat} - ${row.nama_barang}`}
                      </td>
                      <td className="px-3 py-2.5 text-center">{row.qtySuratJalan}</td>
                      <td className="px-3 py-2.5 text-center">{row.qtyAktual}</td>
                      <td className="px-3 py-2.5 max-w-[20%] break-words overflow-hidden">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${KONDISI_TONE[row.kondisi] || "bg-gray-100 text-gray-600"}`}>
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
                      <td className="px-3 py-2.5 text-gray-600 max-w-[20%] break-words overflow-hidden">{row.catatan || "-"}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
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
          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600 gap-3">
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
        <Button
          variant="outline"
          onClick={() => router.push("/staff/inbound")}
          disabled={submitting}
        >
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

      <PreviewInboundModal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onConfirm={handleConfirmSaveInbound}
        submitting={submitting}
        nomorSuratJalan={nomorSuratJalan.trim()}
        vendorLabel={previewVendorLabel}
        gudangTujuan={previewGudangTujuanLabel}
        tanggalLabel={previewTanggalLabel}
        projectName={selectedBoqMeta.project_name}
        boqNumber={selectedBoqMeta.boq_number}
        kodeTiket={selectedBoqMeta.kode_tiket}
        picPemohon={picPemohon.trim()}
        kendaraan={kendaraanNamaTeks.trim()}
        noPolisi={kendaraanNoPolisTeks.trim()}
        driver={driverNamaTeks.trim()}
        items={previewItems}
        suratJalanFileName={suratJalanPdf?.name || null}
        suratJalanUrl={suratJalanPdfUrl || suratJalanPdfDataUrl || null}
        suratJalanSize={suratJalanPdf?.size ?? null}
        suratJalanInline={suratJalanPdfInline && !suratJalanPdfUrl}
        onImageClick={setPreviewFotoUrl}
      />

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
