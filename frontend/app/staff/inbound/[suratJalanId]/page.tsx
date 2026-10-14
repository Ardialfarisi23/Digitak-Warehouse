"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileDown,
  FileText,
  Loader2,
  PackagePlus,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi, ensureOk } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { summarizeKondisiUnits } from "@/lib/kondisi-barang";
import { getSuratJalanStatusLabel } from "@/lib/surat-jalan-status";
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
  wajib_sn?: boolean;
};

type ApiSuratJalanItem = {
  item_id: number;
  barang_id: number;
  qty: number;
  qty_diterima?: number | string | null;
  qty_ditolak?: number | string | null;
  alasan_penolakan?: string | null;
  kondisi?: string | null;
  serial_number?: string | null;
  catatan?: string | null;
  is_kelebihan?: boolean;
  units?: ApiUnitRow[];
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
  // Kolom teks bebas (sudah di-fallback-kan di backend, lihat surat-jalan.repository.js)
  kendaraan_teks?: string | null;
  no_polisi_teks?: string | null;
  driver_teks?: string | null;
  kendaraan_label?: string | null;
  driver_label?: string | null;
  project?: { nama_project: string } | null;
  cluster?: { cluster_id?: string; nama_cluster?: string } | null;
  cluster_id?: string | null;
  creator?: { nama?: string; name?: string } | null;
  surat_jalan_url?: string | null;
  document_url?: string | null;
  attachment?: string | null;
  boq_id?: number | string | null;
  boq?: {
    boq_id: number | string;
    boq_number?: string;
    cluster_id?: string | null;
    tiket?: { kode_tiket: string };
    items?: Array<{ cluster_id?: string | null }> | null;
  } | null;
  tujuan_tipe?: string | null;
  titik_lapangan?: { nama_lokasi?: string } | null;
  tipe_pengirim?: string | null;
  pengirim_eksternal_nama?: string | null;
}

// Baris yang staf edit di layar — qtyRencana disnapshot SEKALI pas fetch,
// sebelum staf mulai ubah qty (backend nggak nyimpen qty rencana terpisah,
// begitu di-submit field `qty` yang sama ditimpa jadi qty aktual).
// Penilaian kondisi per unit (dipakai saat qty diterima > 1).
type UnitInput = {
  nomorUnit: number;
  kondisi: string;
  catatan: string;
};

type EditableItem = {
  itemId: number;
  kodeBarang: string;
  namaBarang: string;
  qtyRencana: number;
  qtyDiterima: number;
  // qtyDitolak selalu = qtyRencana - qtyDiterima (aturan diterima + ditolak
  // harus sama dengan qty surat jalan); disimpan eksplisit supaya jelas di UI.
  qtyDitolak: number;
  alasanPenolakan: string;
  kondisi: string;
  units: UnitInput[];
  serialNumber: string;
  isKelebihan: boolean;
  catatanKelebihan: string;
  wajibSn: boolean;
  zona?: {
    zona_id: number;
    kode_zona?: string;
    nama_zona?: string;
    tipe_zona?: string;
    gudang?: { nama_gudang?: string } | null;
  } | null;
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

type ApiUnitRow = {
  unit_id?: number | string;
  nomor_unit?: number;
  kondisi?: string | null;
  catatan?: string | null;
};

// ---------------------------------------------------------------------------
// Pratinjau lampiran surat jalan (PDF/gambar). URL bisa absolut maupun relatif
// ke backend, jadi dinormalkan dulu. Base64 Data URL dikonversi ke Blob URL
// karena tidak bisa dipakai apa adanya di iframe pada beberapa browser.
// ---------------------------------------------------------------------------
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

type AttachmentKind = "pdf" | "image" | "other";

function resolveAttachmentUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  return `${apiBaseUrl}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function getAttachmentKind(url?: string | null): AttachmentKind | null {
  const resolved = resolveAttachmentUrl(url);
  if (!resolved) return null;
  const normalized = resolved.split("?")[0].split("#")[0].toLowerCase();
  if (normalized.startsWith("data:image/")) return "image";
  if (normalized.startsWith("data:application/pdf") || normalized.includes("application/pdf")) return "pdf";
  if (normalized.endsWith(".pdf")) return "pdf";
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/.test(normalized)) return "image";
  return "other";
}

function sanitizeFileNameBase(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "surat-jalan"
  );
}

function getAttachmentFileName(url?: string | null, fallbackBase = "surat-jalan"): string {
  const resolved = resolveAttachmentUrl(url);
  if (!resolved) return "dokumen";
  const base = sanitizeFileNameBase(fallbackBase);

  if (resolved.startsWith("data:")) {
    const kind = getAttachmentKind(resolved);
    const ext = kind === "pdf" ? "pdf" : kind === "image" ? "jpg" : "bin";
    return `${base}.${ext}`;
  }

  try {
    const name = new URL(resolved).pathname.split("/").filter(Boolean).pop();
    return name ? decodeURIComponent(name) : "dokumen";
  } catch {
    return "dokumen";
  }
}

// Data URL dikonversi sekali menjadi Blob URL supaya PDF/gambar tetap dirender.
function useAttachmentViewUrl(rawUrl?: string | null): string | null {
  const raw = rawUrl ?? null;
  const isInline = Boolean(raw?.startsWith("data:"));

  // Data URL tidak bisa dipakai apa adanya di iframe/tab baru pada beberapa
  // browser, jadi dikonversi menjadi Blob URL. Hasilnya murni turunan dari
  // `raw`, jadi dihitung lewat useMemo (bukan state + effect).
  const blobUrl = useMemo(() => {
    if (!raw || !isInline) return null;
    try {
      const commaIndex = raw.indexOf(",");
      const meta = raw.slice(0, commaIndex);
      const payload = raw.slice(commaIndex + 1);
      const mime = /data:([^;,]+)/i.exec(meta)?.[1] || "application/pdf";
      const binary = /;base64/i.test(meta) ? atob(payload) : decodeURIComponent(payload);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j += 1) bytes[j] = binary.charCodeAt(j);
      return URL.createObjectURL(new Blob([bytes], { type: mime }));
    } catch {
      return null;
    }
  }, [raw, isInline]);

  // Lepaskan Blob URL lama supaya tidak menumpuk memori saat lampiran berganti.
  const previousBlobRef = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousBlobRef.current;
    if (previous && previous !== blobUrl) URL.revokeObjectURL(previous);
    previousBlobRef.current = blobUrl;
  }, [blobUrl]);

  if (!raw) return null;
  if (isInline) return blobUrl;
  return resolveAttachmentUrl(raw);
}

function tampilkanNilai(value: unknown, fallback: unknown = "-") {
  if (value === null || value === undefined) return String(fallback);
  const s = String(value).trim();
  return s.length > 0 ? s : String(fallback);
}

function buildUnitRows(total: number): UnitInput[] {
  const count = Math.max(0, Math.floor(Number(total) || 0));
  return Array.from({ length: count }, (_, i) => ({
    nomorUnit: i + 1,
    kondisi: "",
    catatan: "",
  }));
}

// Samakan daftar unit dengan qty terbaru tanpa menghapus penilaian yang
// sudah diisi staf.
function syncUnitRows(existing: UnitInput[] | undefined, total: number): UnitInput[] {
  const rows = buildUnitRows(total);
  const previous = existing || [];
  return rows.map((row) => {
    const kept = previous.find((u) => u.nomorUnit === row.nomorUnit);
    return kept ? { ...row, kondisi: kept.kondisi, catatan: kept.catatan } : row;
  });
}

// Data per unit dari server (item lama tidak punya array ini).
function mapUnitRowsFromApi(units: ApiUnitRow[] | undefined, total: number): UnitInput[] {
  const rows = buildUnitRows(total);
  if (!Array.isArray(units) || units.length === 0) return rows;
  const byNomor = new Map<number, ApiUnitRow>();
  for (const unit of units) {
    const nomor = Number(unit.nomor_unit);
    if (Number.isFinite(nomor)) byNomor.set(nomor, unit);
  }
  return rows.map((row) => {
    const found = byNomor.get(row.nomorUnit);
    if (!found) return row;
    return {
      nomorUnit: row.nomorUnit,
      kondisi: found.kondisi || "",
      catatan: found.catatan || "",
    };
  });
}

function summarizeUnitConditions(units: UnitInput[]): { label: string; tone: string }[] {
  return summarizeKondisiUnits(units).map((entry) => ({
    label: `${entry.label} ${entry.total}`,
    tone: KONDISI_TONE[entry.value] || "bg-gray-100 text-gray-600 border-gray-300",
  }));
}

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
  const [fotoPreviews, setFotoPreviews] = useState<Record<number, string>>({});
  const fotoPreviewRef = useRef<Record<number, string>>({});
  const [showFotoSuccessModal, setShowFotoSuccessModal] = useState(false);
  const [showFotoErrorModal, setShowFotoErrorModal] = useState(false);
  const [fotoModalMessage, setFotoModalMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Panel daftar unit per item (indexer baris, bukan item_id).
  const [unitPanelOpen, setUnitPanelOpen] = useState<Record<number, boolean>>({});
  // Nilai dari tombol "Set semua unit ke ..." per item.
  const [bulkUnitCondition, setBulkUnitCondition] = useState<Record<number, string>>({});

  // Lampiran surat jalan yang di-upload staf (PDF/gambar) — dipanggil SEKARANG,
  // sebelum early return apa pun, supaya aturan React Hooks tetap terpenuhi.
  const attachmentRaw = data?.surat_jalan_url || data?.document_url || data?.attachment || null;
  const attachmentViewUrl = useAttachmentViewUrl(attachmentRaw);
  const attachmentKind = getAttachmentKind(attachmentRaw);
  const attachmentIsInline = Boolean(attachmentRaw?.startsWith("data:"));
  const attachmentNomor = sanitizeFileNameBase(tampilkanNilai(data?.nomor_surat_jalan, "surat-jalan"));
  const attachmentFileName = getAttachmentFileName(attachmentRaw, attachmentNomor);
  const attachmentIsPdf = attachmentKind === "pdf";
  const attachmentIsImage = attachmentKind === "image";

  useEffect(() => {
    return () => {
      Object.values(fotoPreviewRef.current).forEach((url) => URL.revokeObjectURL(url));
      fotoPreviewRef.current = {};
    };
  }, []);

  function setFotoPreview(index: number, url: string | null) {
    const previous = fotoPreviewRef.current[index];
    if (previous && previous !== url) {
      URL.revokeObjectURL(previous);
    }
    if (url) {
      fotoPreviewRef.current[index] = url;
    } else {
      delete fotoPreviewRef.current[index];
    }
    setFotoPreviews((prev) => {
      const next = { ...prev };
      if (url) {
        next[index] = url;
      } else {
        delete next[index];
      }
      return next;
    });
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

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
        await ensureOk(res, "Gagal mengambil detail Surat Jalan Inbound.");

        const json = await res.json();
        const record: ApiSuratJalan | undefined = json?.data;
        if (!record) {
          setData(null);
          return;
        }

        setData(record);
        // Snapshot qty rencana SEKARANG, sebelum staf mulai edit apa pun.
        // Item yang sudah pernah diterima memakai nilai tersimpan
        // (qty_diterima/qty_ditolak/alasan_penolakan); item baru default
        // diterima penuh (ditolak 0).
        setItems(
          record.items.map((it) => {
            const qtyRencana = it.qty;
            const storedReceived =
              it.qty_diterima !== null && it.qty_diterima !== undefined
                ? Number(it.qty_diterima)
                : null;
            const qtyDiterima = storedReceived ?? qtyRencana;
            const qtyDitolak =
              it.qty_ditolak !== null && it.qty_ditolak !== undefined
                ? Number(it.qty_ditolak)
                : qtyRencana - qtyDiterima;
            return {
              itemId: it.item_id,
              kodeBarang: it.barang?.kode_perangkat || "-",
              namaBarang: it.barang?.nama_barang || "-",
              qtyRencana,
              qtyDiterima,
              qtyDitolak,
              alasanPenolakan: it.alasan_penolakan || "",
              kondisi: it.kondisi || "",
              units: mapUnitRowsFromApi(it.units, qtyDiterima),
              serialNumber: it.serial_number || "",
              isKelebihan: false,
              catatanKelebihan: it.catatan || "",
              wajibSn: Boolean(it.barang?.wajib_sn),
              fotos: (it.fotos || []).map((f) => ({
                foto_id: f.foto_id,
                url: f.url,
                filename: f.filename,
              })),
            };
          }),
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
      const merged = { ...next[index], ...patch };
      // Jumlah unit selalu mengikuti qty diterima agar tidak pernah
      // tidak sinkron dengan yang akan dikirim ke backend.
      if (patch.qtyDiterima !== undefined) {
        merged.units = syncUnitRows(merged.units, patch.qtyDiterima);
      }
      next[index] = merged;
      return next;
    });
  }

  function setUnitCondition(index: number, nomorUnit: number, value: string) {
    setItems((prev) => {
      const next = [...prev];
      const row = next[index];
      next[index] = {
        ...row,
        units: row.units.map((u) => (u.nomorUnit === nomorUnit ? { ...u, kondisi: value } : u)),
      };
      return next;
    });
  }

  function setUnitCatatan(index: number, nomorUnit: number, value: string) {
    setItems((prev) => {
      const next = [...prev];
      const row = next[index];
      next[index] = {
        ...row,
        units: row.units.map((u) => (u.nomorUnit === nomorUnit ? { ...u, catatan: value } : u)),
      };
      return next;
    });
  }

  function setAllUnitConditions(index: number, kondisi: string) {
    setBulkUnitCondition((prev) => ({ ...prev, [index]: kondisi }));
    setItems((prev) => {
      const next = [...prev];
      const row = next[index];
      next[index] = {
        ...row,
        units: row.units.map((u) => ({ ...u, kondisi })),
      };
      return next;
    });
  }

  function handleQtyDiterimaChange(index: number, value: number) {
    const item = items[index];
    // Batasi 0..qtyRencana supaya diterima + ditolak selalu = qty surat jalan.
    const qty = Math.min(item.qtyRencana, Math.max(0, value));
    const patch: Partial<EditableItem> = {
      qtyDiterima: qty,
      qtyDitolak: item.qtyRencana - qty,
    };
    if (qty > item.qtyRencana && item.isKelebihan) {
      patch.isKelebihan = false;
      patch.catatanKelebihan = "";
    }
    if (patch.qtyDitolak === 0) {
      // Tidak ada penolakan -> alasan tidak relevan.
      patch.alasanPenolakan = "";
    }
    updateItem(index, patch);
  }

  function handleAlasanPenolakanChange(index: number, value: string) {
    updateItem(index, { alasanPenolakan: value });
  }

  async function handleFotoUpload(index: number, file: File) {
    setFotoErrors((prev) => ({ ...prev, [index]: null }));
    setUploadingFoto((prev) => ({ ...prev, [index]: true }));
    setFotoPreview(index, URL.createObjectURL(file));

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
      setFotoPreview(index, null);
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

// Item dengan qty diterima > 1 wajib dinilai per unit; qty 1 tetap satu
  // pilihan kondisi biasa.
  const unitRowsMissingIndexes = items
    .map((i, idx) => ({ i, idx }))
    .filter(({ i }) => i.qtyDiterima > 1 && i.units.some((u) => !u.kondisi))
    .map(({ idx }) => idx);
  const hasMissingUnitConditions = unitRowsMissingIndexes.length > 0;

  const allKondisiFilled = items.every(
    (i) => i.qtyDiterima === 0 || (i.qtyDiterima > 1 ? true : i.kondisi !== ""),
  );
  const serialRequiredMissing = items.some((i) => i.qtyDiterima > 0 && i.wajibSn && !i.serialNumber.trim());
  // Aturan penerimaan: diterima + ditolak = qty surat jalan (dijaga oleh
  // handleQtyDiterimaChange), dan alasan wajib bila ada penolakan.
  const missingAlasanIndexes = items
    .map((i, idx) => ({ i, idx }))
    .filter(({ i }) => i.qtyDitolak > 0 && !i.alasanPenolakan.trim())
    .map(({ idx }) => idx);
  const hasMissingAlasan = missingAlasanIndexes.length > 0;
  const canSubmit =
    allKondisiFilled &&
    !hasMissingUnitConditions &&
    !hasMissingAlasan &&
    items.some((i) => i.qtyDiterima > 0) &&
    !serialRequiredMissing;

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
    if (!canSubmit || !data) return;

    if (serialRequiredMissing) {
      const missing = items.find((i) => i.qtyDiterima > 0 && i.wajibSn && !i.serialNumber.trim());
      setToast({ message: `Serial number wajib diisi untuk barang ${missing?.namaBarang || ""}.`, type: "error" });
      return;
    }

    doSave(items);
  }

  async function doSave(finalItems: EditableItem[]) {
    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const payload = {
        items: finalItems.map((i) => ({
          item_id: i.itemId,
          qty: i.qtyDiterima,
          qty_diterima: i.qtyDiterima,
          qty_ditolak: i.qtyDitolak,
          alasan_penolakan: i.qtyDitolak > 0 ? i.alasanPenolakan.trim() || null : null,
          kondisi: i.qtyDiterima > 1 ? null : i.kondisi || null,
          units:
            i.qtyDiterima > 1
              ? i.units.map((u) => ({
                  nomor_unit: u.nomorUnit,
                  kondisi: u.kondisi,
                  catatan: u.catatan.trim() || null,
                }))
              : null,
          serial_number: i.serialNumber || null,
          catatan: i.catatanKelebihan || null,
          is_kelebihan: i.isKelebihan,
        })),
      };

      const res = await post(`${baseUrl}/api/surat-jalan/${params.suratJalanId}/receive-inbound`, payload);

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const status = res.status;
        const message = (err as any)?.message || "Gagal menyimpan hasil pencocokan barang.";
        if (status === 400 || status === 404 || status === 409 || status === 422) {
          setToast({ message, type: "error" });
        } else {
          console.error(String(message));
          setToast({ message, type: "error" });
        }
        return;
      }

      router.push(`/staff/putaway/${params.suratJalanId}`);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadPdf() {
    if (!data) return;
    setDownloadingPdf(true);
    try {
      const { downloadInboundPdf } = await import("@/lib/staff/inbound-pdf");
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
        noPolisi: noPolisiLabel,
        namaDriver: driverLabel,
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
          kondisi: i.qtyDiterima > 1 ? summarizeUnitConditions(i.units).map((c) => c.label).join(", ") : i.kondisi,
          serialNumbers: i.serialNumber ? [i.serialNumber] : [],
        })),
        status: "TERVERIFIKASI",
      };

      await downloadInboundPdf(pdfShape, user?.name ?? "Staf Gudang");
    } finally {
      setDownloadingPdf(false);
    }
  }

  // Helper untuk menentukan label pengirim (internal: gudang_asal, external: pengirim_eksternal_nama)
  const pengirimLabel = data
    ? data.tipe_pengirim === "internal"
      ? data.gudang_asal?.nama_gudang || "-"
      : data.tipe_pengirim === "external"
        ? data.pengirim_eksternal_nama || "-"
        : data.gudang_asal?.nama_gudang || "-"
    : "-";

  // Fallback ke kolom teks bebas (isi manual / vendor eksternal) yang sudah
  // difallback-kan di backend. Kolom `kendaraan_nama_teks` / `kendaraan_no_polisi_teks` /
  // `driver_nama_teks` jadi sumber utama, `kendaraan` & `personil_pengantar` hanya cadangan.
  const kendaraanLabel =
    data?.kendaraan_teks
      || (data?.kendaraan
        ? data.kendaraan.merk && data.kendaraan.merk.trim()
          ? `${data.kendaraan.merk} - ${data.kendaraan.jenis_kendaraan}`
          : data.kendaraan.jenis_kendaraan
        : null)
      || "-";

  const noPolisiLabel = data?.no_polisi_teks || data?.kendaraan?.no_polisi || "-";
  const driverLabel = data?.driver_teks || data?.personil_pengantar?.nama || "-";

  // Lima data ringkas untuk halaman detail. Urutan sumber mengikuti relasi
  // di schema.prisma: surat_jalan.cluster_id (langsung) -> boq.cluster_id,
  // dan nomor tiket lewat relasi boq -> tiket_material.
  const clusterIdValue = tampilkanNilai(
    data?.cluster_id || data?.cluster?.cluster_id || data?.boq?.cluster_id
  );
  const clusterNameValue = tampilkanNilai(
    data?.cluster?.nama_cluster,
    data?.cluster_id || data?.cluster?.cluster_id || data?.boq?.cluster_id
  );
  const projectNameValue = tampilkanNilai(data?.project?.nama_project);
  const boqIdValue = tampilkanNilai(
    data?.boq_id !== null && data?.boq_id !== undefined && data?.boq_id !== ""
      ? String(data.boq_id)
      : data?.boq?.boq_id !== null &&
          data?.boq?.boq_id !== undefined &&
          data?.boq?.boq_id !== ""
        ? String(data.boq.boq_id)
        : null
  );
  const nomorTiketValue = tampilkanNilai(data?.boq?.tiket?.kode_tiket);

  if (!data) {
    return (
      <div className="px-8 py-6 text-gray-500">
        Memuat data Surat Jalan...
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      {toast && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${toast.type === "error" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
          {toast.message}
        </div>
      )}
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
          <p className="mt-1 flex items-center gap-2 text-sm">
            <span className="text-gray-500">Status:</span>
            <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
              {getSuratJalanStatusLabel(data.status)}
            </span>
          </p>
        </div>
      </div>

      {/* Layout 2 kolom: dokumen surat jalan (kiri) + informasi & tabel barang (kanan).
          Di layar sempit tumpuk jadi 1 kolom dengan dokumen di atas. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        {/* KOLOM KIRI: Surat jalan yang di-upload */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#F3D9C7] bg-white">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <FileText size={16} className="text-gray-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Surat Jalan Terunggah
            </h2>
            {attachmentRaw && (
              <>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  {attachmentIsPdf ? "PDF" : attachmentIsImage ? "Gambar" : "File"}
                </span>
                {attachmentViewUrl && (
                  <a
                    href={attachmentViewUrl}
                    {...(attachmentIsInline ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                    download={attachmentFileName || undefined}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
                  >
                    <ExternalLink size={12} />
                    {attachmentIsPdf ? "Buka PDF / Unduh" : attachmentIsImage ? "Buka Gambar" : "Buka File"}
                  </a>
                )}
              </>
            )}
          </div>

          {!attachmentRaw ? (
            <div className="p-5">
              <div className="flex h-[560px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
                <FileText size={30} className="text-gray-300" />
                <p className="mt-2 text-xs text-gray-400">Tidak ada surat jalan yang di-upload</p>
              </div>
            </div>
          ) : !attachmentViewUrl ? (
            <div className="p-5">
              <div className="flex h-[560px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
                <FileText size={30} className="text-gray-300" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">{attachmentFileName}</p>
                  <p className="mt-1 text-xs text-gray-400">Lampiran tidak dapat dibuka.</p>
                </div>
              </div>
            </div>
          ) : attachmentIsPdf ? (
            <div className="relative h-[580px] w-full bg-gray-100 p-2">
              <iframe
                src={attachmentViewUrl}
                title="Surat Jalan PDF"
                width="100%"
                height="100%"
                className="h-[564px] w-full rounded-lg border-0 bg-white"
              />
            </div>
          ) : attachmentIsImage ? (
            <div className="h-[580px] w-full overflow-hidden bg-gray-100 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachmentViewUrl}
                alt={`Surat jalan ${data.nomor_surat_jalan}`}
                className="h-full w-full rounded-lg border border-gray-200 bg-white object-contain"
              />
            </div>
          ) : (
            <div className="p-5">
              <div className="flex h-[560px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
                <FileText size={30} className="text-gray-300" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">{attachmentFileName}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Pratinjau tidak tersedia untuk format file ini.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KOLOM KANAN: informasi transaksi + tabel barang */}
        <div className="space-y-6">
          {/* Informasi ringkas — label kecil abu-abu, nilai di bawahnya */}
          <div className="rounded-2xl border border-[#F3D9C7] bg-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Informasi Surat Jalan
            </p>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cluster ID</p>
                <p className="mt-0.5 break-all font-mono text-xs text-gray-800">{clusterIdValue}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cluster Name</p>
                <p className="mt-0.5 text-sm break-words text-gray-800">{clusterNameValue}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Project Name</p>
                <p className="mt-0.5 text-sm break-words text-gray-800">{projectNameValue}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">BOQ ID</p>
                <p className="mt-0.5 font-mono text-xs text-gray-800">{boqIdValue}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nomor Tiket</p>
                <p className="mt-0.5 break-all font-mono text-xs text-gray-800">{nomorTiketValue}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pengirim</p>
                <p className="mt-0.5 text-sm break-words text-gray-800">{pengirimLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tujuan</p>
                <p className="mt-0.5 text-sm break-words text-gray-800">
                  {tujuanLabel} {tujuanBadge}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Kendaraan</p>
                <p className="mt-0.5 text-sm break-words text-gray-800">{kendaraanLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">No Polisi</p>
                <p className="mt-0.5 text-sm break-words text-gray-800">{noPolisiLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Driver</p>
                <p className="mt-0.5 text-sm break-words text-gray-800">{driverLabel}</p>
              </div>
            </div>

            {data.boq_id && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 text-sm">
                <Link
                  href="/dashboard/boq"
                  className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100"
                >
                  <ExternalLink size={12} />
                  {data.boq?.boq_number || `BOQ #${data.boq_id}`}
                </Link>
              </div>
            )}
          </div>

          {/* Tabel pencocokan barang */}
          <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Cocokkan Barang & Catat Kondisi</p>
<table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
            <th className="pb-3 pr-4 font-semibold text-center w-12">No</th>
            <th className="pb-3 pr-4 font-semibold">Kode Barang</th>
            <th className="pb-3 pr-4 font-semibold">Nama Barang</th>
            <th className="pb-3 pr-4 font-semibold text-right">Qty Surat Jalan</th>
            <th className="pb-3 pr-6 font-semibold text-right">Qty Diterima / Ditolak</th>
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
                <Fragment key={item.itemId}>
                <tr className="border-b border-gray-50 last:border-0 align-top">
                  <td className="py-3 pr-4 text-center text-xs text-slate-500">{index + 1}</td>
                  <td className="py-3 pr-4 font-medium text-gray-800">{item.kodeBarang}</td>
                  <td className="py-3 pr-4 text-gray-600">{item.namaBarang}</td>
                  <td className="py-3 pr-4 text-right text-gray-500">{item.qtyRencana}</td>
                  <td className="py-3 pr-6">
                    <input
                      type="number"
                      min={0}
                      max={item.qtyRencana}
                      value={item.qtyDiterima}
                      onChange={(e) => handleQtyDiterimaChange(index, Number(e.target.value))}
                      className="w-20 rounded-md border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-[#E8632C] focus:outline-none"
                    />
                    <div className="mt-1 text-[11px] text-gray-500">
                      Ditolak:{" "}
                      <span className={item.qtyDitolak > 0 ? "font-semibold text-rose-600" : "font-semibold text-gray-700"}>
                        {item.qtyDitolak}
                      </span>
                    </div>
                    {item.qtyDitolak > 0 && (
                      <div className="mt-1.5">
                        <input
                          value={item.alasanPenolakan}
                          onChange={(e) => handleAlasanPenolakanChange(index, e.target.value)}
                          placeholder="Alasan penolakan (wajib)"
                          className={`w-44 rounded-md border px-2 py-1.5 text-xs focus:outline-none ${
                            item.alasanPenolakan.trim()
                              ? "border-gray-200 focus:border-[#E8632C]"
                              : "border-rose-300 focus:border-rose-400"
                          }`}
                        />
                        {!item.alasanPenolakan.trim() && (
                          <span className="mt-1 block text-[11px] font-medium text-rose-600">Alasan wajib diisi.</span>
                        )}
                      </div>
                    )}
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
                    {item.qtyDiterima > 1 ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap gap-1">
                          {summarizeUnitConditions(item.units).map((chip) => (
                            <span
                              key={chip.label}
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${chip.tone}`}
                            >
                              {chip.label}
                            </span>
                          ))}
                          {item.units.every((u) => !u.kondisi) && (
                            <span className="text-[11px] text-gray-400">Belum dinilai</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setUnitPanelOpen((prev) => ({ ...prev, [index]: !prev[index] }))
                          }
                          className="inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-[#E8632C] hover:underline"
                        >
                          {unitPanelOpen[index] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          Nilai {item.qtyDiterima} unit
                        </button>
                        <span
                          className={`text-[11px] font-medium ${
                            unitRowsMissingIndexes.includes(index) ? "text-rose-600" : "text-gray-400"
                          }`}
                        >
                          {item.qtyDiterima - item.units.filter((u) => u.kondisi).length}/{item.qtyDiterima} dinilai
                        </span>
                      </div>
                    ) : (
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
                    )}
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
                       <div className="flex flex-col gap-1">
                         <input
                           value={item.serialNumber}
                           onChange={(e) => updateItem(index, { serialNumber: e.target.value })}
                           placeholder={item.wajibSn ? "Serial Number (wajib)" : "Serial Number (opsional)"}
                           className="w-44 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-[#E8632C] focus:outline-none"
                         />
                         {item.wajibSn && !item.serialNumber.trim() && (
                           <span className="text-[11px] font-medium text-rose-600">Serial number wajib diisi.</span>
                         )}
                       </div>
                     )}
                   </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {fotoPreviews[index] && (
                          <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-[#E8632C]">
                            <img src={fotoPreviews[index]} alt="Pratinjau foto" className="h-full w-full object-cover" />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[9px] font-medium text-white">
                              Mengunggah
                            </span>
                          </div>
                        )}
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <label
                          htmlFor={`foto-${index}`}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-[#E8632C] hover:text-[#E8632C] ${uploadingFoto[index] ? "pointer-events-none opacity-50" : ""}`}
                        >
                          {uploadingFoto[index] ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                          Upload Foto
                        </label>
                        <input
                          id={`foto-${index}`}
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
                      </div>
                      {fotoErrors[index] && (
                        <p className="text-[11px] text-rose-600">{fotoErrors[index]}</p>
                      )}
                    </div>
                  </td>
                </tr>
                {item.qtyDiterima > 1 && unitPanelOpen[index] && (
                  <tr key={`units-${item.itemId}`} className="border-b border-gray-50 bg-gray-50/50">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-700">
                          Kondisi per unit — {item.kodeBarang}
                        </p>
                        <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          Set semua unit
                          <select
                            value={bulkUnitCondition[index] || ""}
                            onChange={(e) => setAllUnitConditions(index, e.target.value)}
                            className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700 focus:outline-none"
                          >
                            <option value="">Pilih kondisi...</option>
                            {KONDISI_OPTIONS.map((k) => (
                              <option key={k.value} value={k.value}>
                                {k.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {item.units.map((unit) => (
                          <div key={unit.nomorUnit} className="rounded-lg border border-gray-200 bg-white p-2.5">
                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              Unit {unit.nomorUnit}
                            </p>
                            <select
                              value={unit.kondisi}
                              onChange={(e) => setUnitCondition(index, unit.nomorUnit, e.target.value)}
                              className={`w-full rounded-md border px-2 py-1.5 text-xs font-medium focus:outline-none ${unit.kondisi ? KONDISI_TONE[unit.kondisi] : "border-gray-200 text-gray-500"}`}
                            >
                              <option value="">Pilih kondisi...</option>
                              {KONDISI_OPTIONS.map((k) => (
                                <option key={k.value} value={k.value}>
                                  {k.label}
                                </option>
                              ))}
                            </select>
                            <input
                              value={unit.catatan}
                              onChange={(e) => setUnitCatatan(index, unit.nomorUnit, e.target.value)}
                              placeholder="Catatan unit (opsional)"
                              className="mt-1.5 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-[#E8632C] focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button disabled={!canSubmit || submitting} onClick={handleSubmitClick} className="mt-5 h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40">
        {submitting ? "Menyimpan..." : "Simpan Penerimaan & Lanjut Putaway"}
      </Button>
      {hasMissingUnitConditions && (
        <p className="mt-2 text-xs text-rose-600">
          Masih ada {unitRowsMissingIndexes.length} barang dengan unit yang belum dinilai kondisinya. Buka tombol Nilai unit pada masing-masing barang.
        </p>
      )}
      {hasMissingAlasan && (
        <p className="mt-2 text-xs text-rose-600">
          Masih ada {missingAlasanIndexes.length} barang yang ditolak sebagian tanpa alasan penolakan. Isi alasan pada kolom Qty Diterima/Ditolak.
        </p>
      )}
        </div>
      </div>

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
