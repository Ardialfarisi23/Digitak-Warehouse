"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertCircle, MapPin, Truck, CheckCircle2, X, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi, ensureOk } from "@/lib/api";

type ApiSuratJalanItem = {
  item_id: number;
  qty: number;
  kondisi?: string | null;
  barang?: { kode_perangkat?: string; nama_barang?: string; satuan_default?: { kode_satuan?: string } };
  satuan?: { kode_satuan?: string };
  qty_diterima?: number | null;
  kondisi_diterima?: string | null;
  catatan_penerimaan?: string | null;
  qty_dipick_total?: number | null;
  kondisi_diambil_list?: { kondisi: string; qty: number }[];
  picks?: Array<{
    pick_id: number;
    gudang_id: number;
    zona_id?: number | null;
    zona_nama?: string | null;
    qty: number;
    kondisi_diminta: string;
    kondisi_diambil: string;
    is_override?: boolean;
    catatan_override?: string | null;
    picked_by?: number | null;
    picked_at?: string | null;
  }>;
};

type ApiSuratJalan = {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  status: string;
  tanggal?: string;
  gudang_asal?: { gudang_id: number; nama_gudang: string } | null;
  gudang_tujuan?: { nama_gudang: string } | null;
  project?: { nama_project: string } | null;
  project_id?: number | string | null;
  kendaraan?: { jenis_kendaraan: string; no_polisi: string } | null;
  personil_pengantar?: { personil_id: number; nama: string; jenis: string; no_hp?: string | null } | null;
  estimasi_tiba?: string | null;
  catatan_distribusi?: string | null;
  items: ApiSuratJalanItem[];
  tujuan_tipe?: string | null;
  titik_lapangan?: { nama_lokasi?: string } | null;
  alamat_lapangan?: string | null;
  dilaporkan_tiba_oleh?: { nama: string } | null;
  dilaporkan_tiba_at?: string | null;
  catatan_tiba?: string | null;
  dikonfirmasi_oleh?: { nama: string } | null;
  dikonfirmasi_at?: string | null;
  // Field tambahan dari hasil fast-forward (upstream).
  pic_pemohon_nama?: string | null;
  surat_jalan_url?: string | null;
  keberangkatan?: { waktu: string; oleh_id: number; oleh_nama: string } | null;
  picking_selesai?: boolean;
  linimasa?: Array<{ kode: string; label: string; waktu: string; oleh_nama: string | null }>;
  // Checkpoint Gudang Transit (0..n). Diisi backend dari tabel
  // surat_jalan_transit; kosong untuk pengiriman tanpa titipan.
  riwayat_perjalanan?: TransitCheckpoint[];
};

type ApiSuratJalanStatus = "draft_diajukan" | "menunggu_verifikasi" | "ready_putaway" | "disetujui" | "digenerate" | "diterima_didistribusikan" | "sedang_dikirim" | "tiba_di_transit" | "tiba_menunggu_konfirmasi" | "ditolak";

const STATUS_META: Record<ApiSuratJalanStatus, { label: string; tone: string }> = {
  draft_diajukan: { label: "Menunggu Persetujuan", tone: "bg-amber-50 text-amber-700" },
  menunggu_verifikasi: { label: "Menunggu Verifikasi", tone: "bg-amber-50 text-amber-700" },
  ready_putaway: { label: "Siap Putaway", tone: "bg-blue-50 text-blue-600" },
  disetujui: { label: "Disetujui — Siap Picking", tone: "bg-emerald-50 text-emerald-600" },
  digenerate: { label: "Digenerate", tone: "bg-blue-50 text-blue-600" },
  tiba_menunggu_konfirmasi: { label: "Menunggu Konfirmasi", tone: "bg-blue-50 text-blue-600" },
  diterima_didistribusikan: { label: "Terkirim", tone: "bg-gray-100 text-gray-500" },
  sedang_dikirim: { label: "Sedang Dikirim", tone: "bg-amber-50 text-amber-600" },
  tiba_di_transit: { label: "Di Gudang Transit", tone: "bg-purple-50 text-purple-700" },
  ditolak: { label: "Ditolak", tone: "bg-rose-50 text-rose-600" },
};

function getStatusMeta(status: ApiSuratJalanStatus, pickingSelesai?: boolean) {
  if (status === "disetujui" && pickingSelesai) {
    return { label: "Picking Selesai — Siap Distribusi", tone: "bg-blue-50 text-blue-600" };
  }
  return STATUS_META[status] || STATUS_META.draft_diajukan;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

type WarehouseOption = {
  gudang_id: number;
  nama_gudang: string;
  tipe?: string;
  project_id?: number | string | null;
};

// Satu checkpoint titipan di Gudang Transit.
type TransitCheckpoint = {
  transit_id: number | string;
  urutan: number;
  tiba_at: string;
  berangkat_at?: string | null;
  catatan_tiba?: string | null;
  catatan_berangkat?: string | null;
  gudang?: { nama_gudang?: string; tipe?: string } | null;
  tiba_oleh?: { nama?: string } | null;
  berangkat_oleh?: { nama?: string } | null;
  items?: Array<{
    item_id: number;
    qty: number;
    kondisi?: string | null;
    catatan?: string | null;
    units?: Array<{ nomor_unit: number; kondisi: string; catatan?: string | null }>;
  }>;
};

// Penilaian kondisi per unit — meniru pola halaman inbound (task #5).
type UnitInput = {
  nomorUnit: number;
  kondisi: string;
  catatan: string;
};

// Menyembunyikan aksi Gudang Transit dari halaman staf (keputusan bisnis:
// lapor tiba staf langsung menutup SJ). Route/service/tabel/status transit
// tidak dihapus. Ubah ke `false` untuk mengaktifkan kembali UI-nya.
const SEMBUNYIKAN_TRANSIT = true;

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

function buildUnitRows(total: number): UnitInput[] {
  const count = Math.max(0, Math.floor(Number(total) || 0));
  return Array.from({ length: count }, (_, i) => ({ nomorUnit: i + 1, kondisi: "", catatan: "" }));
}

// Samakan daftar unit dengan qty titip terbaru tanpa membuang penilaian
// yang sudah diisi staf (pola syncUnitRows di halaman inbound).
function syncUnitRows(existing: UnitInput[] | undefined, total: number): UnitInput[] {
  const rows = buildUnitRows(total);
  const previous = existing || [];
  return rows.map((row) => {
    const kept = previous.find((u) => u.nomorUnit === row.nomorUnit);
    return kept ? { ...row, kondisi: kept.kondisi, catatan: kept.catatan } : row;
  });
}

export default function DistributionDetailPage() {
  const params = useParams<{ suratJalanId: string }>();
  const router = useRouter();
  const { get, put, post } = useApi();

  const [data, setData] = useState<ApiSuratJalan | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [estimasiTiba, setEstimasiTiba] = useState("");
  const [catatan, setCatatan] = useState("");
  const [arrivalQty, setArrivalQty] = useState<Record<number, string>>({});
  const [arrivalKondisi, setArrivalKondisi] = useState<Record<number, string>>({});
  const [arrivalCatatan, setArrivalCatatan] = useState<Record<number, string>>({});
  const [catatanTiba, setCatatanTiba] = useState("");
  const [showArrivalForm, setShowArrivalForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Gudang Transit (aksi staf) ---------------------------------------
  const [showTransitForm, setShowTransitForm] = useState(false);
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseOption[]>([]);
  const [transitGudangId, setTransitGudangId] = useState("");
  const [transitQty, setTransitQty] = useState<Record<number, string>>({});
  const [transitKondisi, setTransitKondisi] = useState<Record<number, string>>({});
  const [transitCatatanPerItem, setTransitCatatanPerItem] = useState<Record<number, string>>({});
  const [transitUnits, setTransitUnits] = useState<Record<number, UnitInput[]>>({});
  const [transitCatatanUmum, setTransitCatatanUmum] = useState("");
  const [unitPanelOpen, setUnitPanelOpen] = useState<Record<number, boolean>>({});
  const [transitSubmitting, setTransitSubmitting] = useState(false);
  const [departureSubmitting, setDepartureSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

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
        await ensureOk(res, "Gagal mengambil detail Surat Jalan.");

        const json = await res.json();
        const record: ApiSuratJalan | undefined = json?.data;
        if (!record) {
          setData(null);
          return;
        }

        const qtyMap: Record<number, string> = {};
        const kondisiMap: Record<number, string> = {};
        const catatanMap: Record<number, string> = {};
        for (const item of record.items) {
          qtyMap[item.item_id] = String(item.qty_diterima ?? item.qty_dipick_total ?? 0);
          kondisiMap[item.item_id] = item.kondisi_diterima || (item.kondisi_diambil_list?.[0]?.kondisi) || item.kondisi || "baik";
          catatanMap[item.item_id] = item.catatan_penerimaan || "";
        }
        setArrivalQty(qtyMap);
        setArrivalKondisi(kondisiMap);
        setArrivalCatatan(catatanMap);
        if (record.catatan_tiba) setCatatanTiba(record.catatan_tiba);

        setData(record);
        if (record.estimasi_tiba) {
          const d = new Date(record.estimasi_tiba);
          const pad = (n: number) => String(n).padStart(2, "0");
          setEstimasiTiba(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
        if (record.catatan_distribusi) {
          setCatatan(record.catatan_distribusi);
        }
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Terjadi kesalahan mengambil data."
        );
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.suratJalanId]);

  function showToast(message: string, type: "success" | "error") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

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

  if (!data) {
    return (
      <div className="px-8 py-6">
        <p className="text-gray-500">Memuat data Surat Jalan...</p>
      </div>
    );
  }

  const isDisetujui = data.status === "disetujui";
  const isSedangDikirim = data.status === "sedang_dikirim";
  const isTibaTransit = data.status === "tiba_di_transit";
  const isTibaMenunggu = data.status === "tiba_menunggu_konfirmasi";
  const isTerkirim = data.status === "diterima_didistribusikan";
  const checkpoints = data.riwayat_perjalanan || [];

  const statusMeta = getStatusMeta(data.status as ApiSuratJalanStatus, data.picking_selesai);

  const tujuanLabel =
    data.tujuan_tipe === "lapangan"
      ? data.alamat_lapangan || "-"
      : data.tujuan_tipe === "gudang"
        ? data.gudang_tujuan?.nama_gudang || "-"
        : data.gudang_tujuan?.nama_gudang || "-";

  const tujuanBadge =
    data.tujuan_tipe === "lapangan" ? (
      <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Lapangan</span>
    ) : data.tujuan_tipe === "gudang" ? (
      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Gudang</span>
    ) : null;

  const satuanLabel = (item: ApiSuratJalanItem) =>
    item.satuan?.kode_satuan || item.barang?.satuan_default?.kode_satuan || "unit";

  async function handleStartDelivery() {
    if (!data) return;
    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const payload: Record<string, unknown> = {
        status: "sedang_dikirim",
      };
      if (estimasiTiba) payload.estimasi_tiba = new Date(estimasiTiba).toISOString();
      if (catatan !== undefined) payload.catatan_distribusi = catatan || null;

      const res = await put(
        `${baseUrl}/api/surat-jalan/${params.suratJalanId}/delivery-status`,
        payload
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal memulai pengiriman.");
      }

      showToast("Status pengiriman berhasil dimulai.", "success");
      setTimeout(() => {
        router.push("/staff/outbound");
      }, 1500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReportArrival() {
    if (!data) return;
    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const items = data.items.map((item) => ({
        item_id: item.item_id,
        qty_diterima: Number(arrivalQty[item.item_id] ?? 0),
        kondisi_diterima: arrivalKondisi[item.item_id] || item.kondisi || "baik",
        catatan_penerimaan: arrivalCatatan[item.item_id] || null,
      }));

      const payload: Record<string, unknown> = {
        // Laporan tiba staf kini langsung menutup SJ (tanpa konfirmasi SPV).
        status: "diterima_didistribusikan",
        items,
        catatan_tiba: catatanTiba || null,
      };

      const res = await put(
        `${baseUrl}/api/surat-jalan/${params.suratJalanId}/delivery-status`,
        payload
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal melapor barang sampai.");
      }

      showToast("Laporan barang sampai berhasil. Surat Jalan ditandai selesai.", "success");
      setShowArrivalForm(false);
      setTimeout(() => {
        router.push("/staff/outbound");
      }, 1500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Gudang Transit ----------------------------------------------------

  /** Sisa yang masih boleh dititipkan per item = total pick − yang sedang dititip.
   *  Checkpoint yang sudah berangkat tidak dihitung: qty-nya sudah kembali ke
   *  perjalanan sehingga boleh dititipkan lagi di transit berikutnya. */
  function sisaTitipan(item: ApiSuratJalanItem): number {
    const checkpoints = data?.riwayat_perjalanan || [];
    let sedangDititip = 0;
    for (const c of checkpoints) {
      if (c.berangkat_at) continue;
      for (const row of c.items || []) {
        if (Number(row.item_id) === Number(item.item_id)) sedangDititip += Number(row.qty || 0);
      }
    }
    const totalPick = Number(item.qty_dipick_total ?? item.qty ?? 0);
    return Math.max(0, totalPick - sedangDititip);
  }

  /** Siapkan form titipan dan muat daftar Gudang Transit yang sah. */
  async function handleOpenTransitForm() {
    if (!data) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    // Default qty = sisa titipan per item (leg penuh), sama seperti submit lapor tiba.
    const qtyDefault: Record<number, string> = {};
    const kondisiDefault: Record<number, string> = {};
    const catatanDefault: Record<number, string> = {};
    const unitsDefault: Record<number, UnitInput[]> = {};
    for (const item of data.items) {
      const sisa = sisaTitipan(item);
      qtyDefault[item.item_id] = String(sisa);
      kondisiDefault[item.item_id] =
        item.kondisi_diterima || item.kondisi_diambil_list?.[0]?.kondisi || item.kondisi || "baik";
      catatanDefault[item.item_id] = "";
      unitsDefault[item.item_id] = buildUnitRows(sisa);
    }

    setTransitQty(qtyDefault);
    setTransitKondisi(kondisiDefault);
    setTransitCatatanPerItem(catatanDefault);
    setTransitUnits(unitsDefault);
    setTransitCatatanUmum("");
    setUnitPanelOpen({});
    setTransitGudangId("");

    setWarehouseOptions([]);
    try {
      const res = await get(`${baseUrl}/api/warehouses?limit=1000`);
      await ensureOk(res, "Gagal mengambil daftar Gudang Transit.");
      const json = await res.json();
      const raw = Array.isArray(json?.data?.data) ? json.data.data : Array.isArray(json?.data) ? json.data : [];
      // Hanya gudang dadakan yang project_id-nya sama dengan project SJ
      // (validasi akhir tetap di backend).
      const filtered = (raw as WarehouseOption[]).filter(
        (w) =>
          w.tipe === "dadakan" &&
          String(w.project_id ?? "") !== "" &&
          String(w.project_id) === String(data.project_id)
      );
      setWarehouseOptions(filtered);
      if (filtered.length === 1) setTransitGudangId(String(filtered[0].gudang_id));
      setShowTransitForm(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal memuat daftar Gudang Transit.", "error");
    }
  }

  async function handleTibaDiTransit() {
    if (!data) return;

    const gudangId = Number(transitGudangId);
    if (!gudangId) {
      showToast("Pilih Gudang Transit terlebih dahulu.", "error");
      return;
    }

    const itemsPayload: Array<{
      item_id: number;
      qty: number;
      kondisi: string;
      catatan?: string | null;
      units?: Array<{ nomor_unit: number; kondisi: string; catatan?: string | null }>;
    }> = [];

    for (const item of data.items) {
      const qty = Number(transitQty[item.item_id] ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;

      const units = (transitUnits[item.item_id] || []).filter((u) => u.kondisi);
      const payload: (typeof itemsPayload)[number] = {
        item_id: Number(item.item_id),
        qty,
        kondisi: transitKondisi[item.item_id] || item.kondisi || "baik",
        catatan: transitCatatanPerItem[item.item_id]?.trim() || null,
      };

      if (qty > 1) {
        // Qty > 1 wajib dinilai per unit (pola alur inbound).
        if (units.length !== Math.floor(qty)) {
          showToast(`Barang "${item.barang?.nama_barang || item.item_id}" belum dinilai semua unitnya.`, "error");
          return;
        }
        payload.units = units.map((u) => ({
          nomor_unit: u.nomorUnit,
          kondisi: u.kondisi,
          catatan: u.catatan?.trim() || null,
        }));
      }

      itemsPayload.push(payload);
    }

    if (itemsPayload.length === 0) {
      showToast("Minimal satu barang dengan qty lebih dari 0.", "error");
      return;
    }

    setTransitSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await post(`${baseUrl}/api/surat-jalan/${params.suratJalanId}/transit/tiba`, {
        gudang_id: gudangId,
        catatan_tiba: transitCatatanUmum.trim() || null,
        items: itemsPayload,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal mencatat titipan di Gudang Transit.");
      }

      showToast("Barang berhasil dititipkan di Gudang Transit.", "success");
      setShowTransitForm(false);
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    } finally {
      setTransitSubmitting(false);
    }
  }

  /** Berangkat dari Gudang Transit (leg penuh) menuju tujuan akhir. */
  async function handleLanjutPerjalanan() {
    if (!data) return;
    setDepartureSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await post(`${baseUrl}/api/surat-jalan/${params.suratJalanId}/transit/lanjut`, {
        catatan_berangkat: null,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Gagal melanjutkan perjalanan.");
      }

      showToast("Perjalanan dilanjutkan dari Gudang Transit.", "success");
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Terjadi kesalahan.", "error");
    } finally {
      setDepartureSubmitting(false);
    }
  }

  return (
    <div className="px-8 py-6">
      <button
        onClick={() => router.push("/staff/outbound")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{data.nomor_surat_jalan}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin size={14} />
          Tujuan:{" "}
          <span>
            {tujuanLabel}
            {tujuanBadge}
          </span>
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Informasi Kendaraan
          </p>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-400">Jenis</p>
              <p className="font-semibold text-gray-900">{data.kendaraan?.jenis_kendaraan || "-"}</p>
            </div>
            <div>
              <p className="text-gray-400">No Polisi</p>
              <p className="font-semibold text-gray-900">{data.kendaraan?.no_polisi || "-"}</p>
            </div>
            <div>
              <p className="text-gray-400">Driver</p>
              <p className="font-semibold text-gray-900">
                {data.personil_pengantar?.nama || "-"}
                {data.personil_pengantar?.no_hp ? (
                  <a href={`tel:${data.personil_pengantar.no_hp}`} className="ml-2 flex items-center gap-1 text-xs text-[#E8632C] hover:underline">
                    <Phone size={12} />
                    {data.personil_pengantar.no_hp}
                  </a>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6 lg:col-span-2">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Informasi Pengiriman
          </p>
          <div className="space-y-2 text-sm">
            {data.gudang_asal?.nama_gudang && (
              <p className="text-gray-600">Dikirim dari: <span className="font-semibold text-gray-900">{data.gudang_asal.nama_gudang}</span></p>
            )}
            {data.project?.nama_project && (
              <p className="text-gray-600">Project: <span className="font-semibold text-gray-900">{data.project.nama_project}</span></p>
            )}
            {data.pic_pemohon_nama && (
              <p className="text-gray-600">PIC Penerima: <span className="font-semibold text-gray-900">{data.pic_pemohon_nama}</span></p>
            )}
            {isTibaTransit && (
              <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                <MapPin size={14} />
                Di Gudang Transit
              </span>
            )}
            {isTibaMenunggu && (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <Clock size={14} />
                Menunggu Konfirmasi SPV
              </span>
            )}
            {data.alamat_lapangan && (
              <p className="text-gray-600">Alamat Lapangan: <span className="font-semibold text-gray-900">{data.alamat_lapangan}</span></p>
            )}
            {data.surat_jalan_url && (
              <p className="text-gray-600">
                Surat Jalan (PDF):{" "}
                <a href={data.surat_jalan_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#E8632C] hover:underline">
                  Buka PDF
                </a>
              </p>
            )}
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${statusMeta.tone}`}>
                {data.status === "sedang_dikirim" && <Truck size={14} />}
                {data.status === "tiba_menunggu_konfirmasi" && <Clock size={14} />}
                {data.status === "diterima_didistribusikan" && <CheckCircle2 size={14} />}
                {statusMeta.label}
              </span>
            </div>

            {isSedangDikirim && data.estimasi_tiba && (
              <p className="mt-3 text-sm text-gray-600">
                Estimasi tiba: {formatDateTime(data.estimasi_tiba)}
              </p>
            )}

            {data.keberangkatan && (
              <p className="mt-2 text-sm text-gray-600">
                Berangkat: {formatDateTime(data.keberangkatan.waktu)} oleh {data.keberangkatan.oleh_nama || "-"}
              </p>
            )}

            {data.catatan_distribusi && (
              <p className="mt-2 text-sm text-gray-600">
                Catatan: {data.catatan_distribusi}
              </p>
            )}
          </div>
        </div>
      </div>

      {data.linimasa && data.linimasa.length > 0 && (
        <div className="rounded-2xl border border-[#F3D9C9] bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Linimasa
          </p>
          <div className="space-y-3">
            {data.linimasa
              .filter((item) => !item.kode.endsWith("_inbound"))
              .map((item, idx) => {
                const isLast = idx === data.linimasa!.length - 1;
                return (
                  <div key={item.kode + item.waktu} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`h-2.5 w-2.5 rounded-full ${isLast ? "bg-[#E8632C]" : "bg-gray-300"}`} />
                      {!isLast && <div className="h-full w-px flex-1 bg-gray-200" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(item.waktu)}
                        {item.oleh_nama ? ` oleh ${item.oleh_nama}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[#F3D9C9] bg-white p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Daftar Barang
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="pb-3 pr-4 font-semibold">Barang</th>
              <th className="pb-3 pr-4 font-semibold">Kondisi</th>
              <th className="pb-3 pr-4 font-semibold text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.item_id} className="border-b border-gray-50 last:border-0">
                <td className="py-3 pr-4">
                  <p className="font-medium text-gray-800">{item.barang?.nama_barang || "-"}</p>
                  <p className="text-xs text-gray-400">{item.barang?.kode_perangkat || "-"}</p>
                  {(() => {
                    const zones = Array.from(
                      new Set(
                        item.picks
                          ?.map((p) => p.zona_nama)
                          .filter((z): z is string => Boolean(z)) ?? []
                      )
                    );
                    return zones.length > 0 ? (
                      <p className="text-xs text-gray-500">Zona: {zones.join(", ")}</p>
                    ) : null;
                  })()}
                </td>
                <td className="py-3 pr-4 text-gray-600">{item.kondisi || "-"}</td>
                <td className="py-3 pr-4 text-right text-gray-600">
                  {item.qty} {satuanLabel(item)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Kronologi titipan Gudang Transit (0..n checkpoint). */}
      <div className="mt-6 rounded-2xl border border-[#F3D9C7] bg-white p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Riwayat Perjalanan
        </p>
        {checkpoints.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada titipan di Gudang Transit. Pengiriman langsung ke tujuan akhir.
          </p>
        ) : (
          <ol className="space-y-3">
            {checkpoints.map((c) => {
              const totalQty = (c.items || []).reduce((sum, it) => sum + Number(it.qty || 0), 0);
              const berangkat = Boolean(c.berangkat_at);
              return (
                <li key={String(c.transit_id)} className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-purple-800">
                      #{c.urutan} · {c.gudang?.nama_gudang || "Gudang Transit"}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        berangkat ? "bg-emerald-50 text-emerald-700" : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {berangkat ? "Sudah berangkat" : "Masih dititipkan"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">
                    Tiba: {new Date(c.tiba_at).toLocaleString("id-ID")}
                    {c.tiba_oleh?.nama ? ` · oleh ${c.tiba_oleh.nama}` : ""} · {totalQty} unit
                  </p>
                  {berangkat && c.berangkat_at && (
                    <p className="mt-1 text-xs text-gray-600">
                      Berangkat: {new Date(c.berangkat_at).toLocaleString("id-ID")}
                      {c.berangkat_oleh?.nama ? ` · oleh ${c.berangkat_oleh.nama}` : ""}
                    </p>
                  )}
                  {c.catatan_tiba && <p className="mt-1 text-xs italic text-purple-700">Catatan: {c.catatan_tiba}</p>}
                  {c.catatan_berangkat && (
                    <p className="mt-1 text-xs italic text-gray-600">Catatan berangkat: {c.catatan_berangkat}</p>
                  )}
                  {(c.items || []).length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-purple-100 pt-2">
                      {(c.items || []).map((it) => (
                        <li key={it.item_id} className="text-xs text-gray-700">
                          Item #{it.item_id}: {it.qty} unit · {it.kondisi || "baik"}
                          {it.units && it.units.length > 1 && (
                            <span className="ml-1 text-gray-500">
                              ({it.units.map((u) => `U${u.nomor_unit}:${u.kondisi}`).join(", ")})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {isDisetujui && (
        <div className="mt-6 rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Mulai Pengiriman
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Estimasi Tiba</label>
              <input
                type="datetime-local"
                value={estimasiTiba}
                onChange={(e) => setEstimasiTiba(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Catatan Distribusi</label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                placeholder="Tambahkan catatan jika diperlukan..."
              />
            </div>
            <Button
              disabled={submitting}
              onClick={handleStartDelivery}
              className="h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
            >
              {submitting ? "Menyimpan..." : "Mulai Pengiriman"}
            </Button>
          </div>
        </div>
      )}

      {isSedangDikirim && !showArrivalForm && !showTransitForm && (
        <div className="mt-6 rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Lapor Barang Sampai
          </p>
          <p className="mb-4 text-sm text-gray-600">
            Laporkan jumlah dan kondisi barang yang sudah sampai ke site.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowArrivalForm(true)}
              className="h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F]"
            >
              Lapor Barang Sampai
            </Button>
            {/* Tombol transit disembunyikan dari UI (keputusan bisnis), tidak
                dihapus — route/service/tabel/status tetap utuh. Ubah
                SEMBUNYIKAN_TRANSIT ke false untuk menampilkan kembali. */}
            {!SEMBUNYIKAN_TRANSIT && (
              <Button
                onClick={handleOpenTransitForm}
                className="h-auto rounded-xl border border-[#F3D9C7] bg-white px-6 py-3 text-sm font-semibold text-[#E8632C] hover:bg-[#FDECE1]"
              >
                Tiba di Gudang Transit
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Aksi Gudang Transit disembunyikan dari UI (keputusan bisnis:
          lapor tiba staf kini langsung menutup SJ). Route, service, tabel
          dan status `tiba_di_transit` TIDAK dihapus supaya mudah diaktifkan
          lagi. Ubah SEMBUNYIKAN_TRANSIT jadi false untuk menampilkannya. */}
      {isTibaTransit && !SEMBUNYIKAN_TRANSIT && (
        <div className="mt-6 rounded-2xl border border-purple-100 bg-purple-50 p-6">
          <p className="mb-1 text-sm font-semibold text-purple-800">
            Barang sedang dititipkan di Gudang Transit
          </p>
          <p className="mb-4 text-sm text-purple-700">
            Titipan ini bukan akhir perjalanan. Lanjutkan perjalanan ke tujuan akhir
            saat barang diberangkatkan kembali.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={departureSubmitting}
              onClick={handleLanjutPerjalanan}
              className="h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
            >
              {departureSubmitting ? "Memproses..." : "Lanjutkan Perjalanan"}
            </Button>
          </div>
        </div>
      )}

      {showTransitForm && !SEMBUNYIKAN_TRANSIT && (
        <div className="mt-6 rounded-2xl border border-purple-100 bg-white p-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Tiba di Gudang Transit
          </p>
          <p className="mb-4 text-sm text-gray-600">
            Titipkan barang sementara di Gudang Transit project ini. Stok Gudang Transit
            bertambah saat titipan disimpan.
          </p>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Gudang Transit <span className="text-rose-500">*</span>
            </label>
            <select
              value={transitGudangId}
              onChange={(e) => setTransitGudangId(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
            >
              <option value="">Pilih Gudang Transit...</option>
              {warehouseOptions.map((w) => (
                <option key={w.gudang_id} value={String(w.gudang_id)}>
                  {w.nama_gudang} (Transit)
                </option>
              ))}
            </select>
            {warehouseOptions.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Tidak ada Gudang Transit (dadakan) untuk project ini.
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Catatan Titipan</label>
            <textarea
              value={transitCatatanUmum}
              onChange={(e) => setTransitCatatanUmum(e.target.value)}
              rows={2}
              placeholder="Catatan umum saat menitipkan barang..."
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            {data.items.map((item) => {
              const sisa = sisaTitipan(item);
              if (sisa <= 0) return null;
              const qty = Number(transitQty[item.item_id] ?? sisa);
              const units = transitUnits[item.item_id] || [];
              const panelTerbuka = Boolean(unitPanelOpen[item.item_id]);
              return (
                <div key={item.item_id} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-sm font-medium text-gray-800">
                    {item.barang?.nama_barang || "-"}{" "}
                    <span className="text-xs text-gray-400">
                      ({item.barang?.kode_perangkat || "-"})
                    </span>
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Qty Dititipkan (maks {sisa})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={sisa}
                        value={qty}
                        onChange={(e) => {
                          const value = Math.max(0, Math.min(sisa, Number(e.target.value)));
                          setTransitQty((prev) => ({ ...prev, [item.item_id]: String(value) }));
                          setTransitUnits((prev) => ({ ...prev, [item.item_id]: syncUnitRows(prev[item.item_id], value) }));
                        }}
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#E8632C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Kondisi</label>
                      <select
                        value={transitKondisi[item.item_id] || item.kondisi || "baik"}
                        onChange={(e) => setTransitKondisi((prev) => ({ ...prev, [item.item_id]: e.target.value }))}
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#E8632C] focus:outline-none"
                      >
                        {KONDISI_OPTIONS.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Catatan</label>
                      <input
                        type="text"
                        value={transitCatatanPerItem[item.item_id] || ""}
                        onChange={(e) =>
                          setTransitCatatanPerItem((prev) => ({ ...prev, [item.item_id]: e.target.value }))
                        }
                        placeholder="Opsional"
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#E8632C] focus:outline-none"
                      />
                    </div>
                  </div>

                  {qty > 1 && (
                    <div className="mt-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-700">Kondisi per unit</p>
                        <button
                          type="button"
                          onClick={() => setUnitPanelOpen((prev) => ({ ...prev, [item.item_id]: !panelTerbuka }))}
                          className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                        >
                          {panelTerbuka ? "Sembunyikan" : `Nilai ${Math.floor(qty)} unit`}
                        </button>
                      </div>
                      {panelTerbuka && (
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {units.map((unit) => (
                            <div key={unit.nomorUnit} className="rounded-lg border border-gray-200 bg-white p-2.5">
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                Unit {unit.nomorUnit}
                              </p>
                              <select
                                value={unit.kondisi}
                                onChange={(e) =>
                                  setTransitUnits((prev) => ({
                                    ...prev,
                                    [item.item_id]: (prev[item.item_id] || []).map((u) =>
                                      u.nomorUnit === unit.nomorUnit ? { ...u, kondisi: e.target.value } : u
                                    ),
                                  }))
                                }
                                className={`w-full rounded-md border px-2 py-1.5 text-xs font-medium focus:outline-none ${
                                  unit.kondisi ? KONDISI_TONE[unit.kondisi] : "border-gray-200 text-gray-500"
                                }`}
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
                                onChange={(e) =>
                                  setTransitUnits((prev) => ({
                                    ...prev,
                                    [item.item_id]: (prev[item.item_id] || []).map((u) =>
                                      u.nomorUnit === unit.nomorUnit ? { ...u, catatan: e.target.value } : u
                                    ),
                                  }))
                                }
                                placeholder="Catatan unit (opsional)"
                                className="mt-1.5 w-full rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-[#E8632C] focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              disabled={transitSubmitting}
              onClick={handleTibaDiTransit}
              className="h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
            >
              {transitSubmitting ? "Menyimpan..." : "Simpan Titipan"}
            </Button>
            <button
              type="button"
              onClick={() => setShowTransitForm(false)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {isSedangDikirim && showArrivalForm && (
        <div className="mt-6 rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Lapor Barang Sampai
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Catatan Tiba</label>
              <textarea
                value={catatanTiba}
                onChange={(e) => setCatatanTiba(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                placeholder="Catatan umum saat barang sampai..."
              />
            </div>
            <div className="space-y-3">
              {data.items.map((item) => (
                <div key={item.item_id} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-sm font-medium text-gray-800">
                    {item.barang?.nama_barang || "-"} <span className="text-xs text-gray-400">({item.barang?.kode_perangkat || "-"})</span>
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Qty Diterima</label>
                      <input
                        type="number"
                        min={0}
                        max={Number(item.qty_dipick_total ?? item.qty ?? 0)}
                        value={arrivalQty[item.item_id] ?? 0}
                        onChange={(e) => setArrivalQty((prev) => ({ ...prev, [item.item_id]: e.target.value }))}
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#E8632C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Kondisi Diterima</label>
                      <select
                        value={arrivalKondisi[item.item_id] || item.kondisi || "baik"}
                        onChange={(e) => setArrivalKondisi((prev) => ({ ...prev, [item.item_id]: e.target.value }))}
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#E8632C] focus:outline-none"
                      >
                        <option value="baik">Baik</option>
                        <option value="rusak_ringan">Rusak Ringan</option>
                        <option value="rusak_berat">Rusak Berat</option>
                        <option value="tidak_sesuai_spek">Tidak Sesuai Spek</option>
                        <option value="doa">DOA</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Catatan Penerimaan</label>
                      <input
                        type="text"
                        value={arrivalCatatan[item.item_id] || ""}
                        onChange={(e) => setArrivalCatatan((prev) => ({ ...prev, [item.item_id]: e.target.value }))}
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-[#E8632C] focus:outline-none"
                        placeholder="Opsional"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                disabled={submitting}
                onClick={handleReportArrival}
                className="h-auto rounded-xl bg-[#E8632C] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
              >
                {submitting ? "Menyimpan..." : "Kirim Laporan Tiba"}
              </Button>
              <button
                type="button"
                onClick={() => setShowArrivalForm(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {isTibaMenunggu && (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <p className="mb-2 text-sm font-semibold text-blue-800">Menunggu Konfirmasi SPV</p>
          <p className="mb-4 text-sm text-blue-700">Barang sudah dilaporkan tiba. Menunggu konfirmasi dari supervisor.</p>
          {data.dilaporkan_tiba_oleh?.nama && (
            <p className="text-xs text-blue-600">Dilaporkan oleh: {data.dilaporkan_tiba_oleh.nama}</p>
          )}
          {data.dilaporkan_tiba_at && (
            <p className="text-xs text-blue-600">Waktu lapor: {new Date(data.dilaporkan_tiba_at).toLocaleString("id-ID")}</p>
          )}
          {data.catatan_tiba && (
            <p className="mt-2 text-sm text-blue-700">Catatan: {data.catatan_tiba}</p>
          )}
        </div>
      )}

      {toast && (
        <div
          className={[
            "fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-medium shadow-2xl backdrop-blur-sm animate-in slide-in-from-right-full fade-in duration-300 max-w-sm",
            toast.type === "success"
              ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-800"
              : "border-rose-200/80 bg-rose-50/95 text-rose-800",
          ].join(" ")}
        >
          <div
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              toast.type === "success" ? "bg-emerald-100" : "bg-rose-100",
            ].join(" ")}
          >
            {toast.type === "success" ? (
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <p className="flex-1 leading-snug">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className={[
              "ml-2 shrink-0 rounded-full p-1 transition-colors",
              toast.type === "success"
                ? "text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600"
                : "text-rose-400 hover:bg-rose-100 hover:text-rose-600",
            ].join(" ")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}