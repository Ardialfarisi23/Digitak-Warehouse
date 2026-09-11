"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ChevronDown, Loader2, AlertCircle, Truck, User, MapPin, X, Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import BoqPicker, { type BoqPickerItem } from "@/components/BoqPicker";

type Project = {
  project_id: string | number;
  nama_project: string;
  title?: string;
  klien?: string;
  kecamatan?: string;
  kota_kabupaten?: string;
};

type ItemBarang = {
  id: string;
  barang_id?: string;
  kode_perangkat?: string;
  nama_barang?: string;
  unit?: string;
  satuan_default_id?: string | number;
  qty_rencana?: number;
};

type Personil = {
  id: string;
  personil_id?: string | number;
  nama: string;
  posisi?: string;
  bisa_menyetir?: boolean;
  is_material_handler?: boolean;
};

type Vehicle = {
  id: string;
  kendaraan_id?: string | number;
  jenis_kendaraan: string;
  merk?: string;
  no_polisi: string;
};

type Warehouse = {
  gudang_id: string | number;
  nama_gudang: string;
  tipe?: string;
  alamat?: string;
};

// ---------------------------------------------------------------------------
// Generate nomor Surat Jalan di frontend — backend (surat-jalan.validation.js)
// mewajibkan field `nomor_surat_jalan` diisi dari client, TIDAK ada
// auto-generate di service/controller-nya (sudah dicek langsung ke
// surat-jalan.service.js). Format mengikuti pola Inbound (roman month +
// tahun), dibedakan segmen "SJ/OUT" biar gampang dibedain dari Inbound.
//
// TODO(backend): idealnya nomor ini digenerate di backend (dalam transaksi
// yang sama pas create), supaya tidak ada risiko dua staf dapat nomor sama
// kalau submit hampir bersamaan. Timestamp di sini cuma practically-unique,
// bukan jaminan atomic seperti sequence di database.
// ---------------------------------------------------------------------------
const ROMAN_MONTH = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function generateNomorSuratJalanOutbound(): string {
  const now = new Date();
  const bulanRomawi = ROMAN_MONTH[now.getMonth()];
  const tahun = now.getFullYear();
  const unik = String(now.getTime()).slice(-6);
  return `${unik}/SJ/OUT/DIGITAK/${bulanRomawi}/${tahun}`;
}

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  submitting,
  selectedItems,
  selectedGudangAsal,
  selectedGudangTujuan,
  selectedProject,
  picPemohon,
  selectedVehicle,
  selectedPersonil,
  fotoUrlsByItem,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  selectedItems: { nama_barang?: string; qty: number; unit?: string; kode_perangkat?: string; barang_id?: string; id?: string }[];
  selectedGudangAsal: Warehouse | null;
  selectedGudangTujuan: Warehouse | null;
  selectedProject: Project | null;
  picPemohon: string;
  selectedVehicle: Vehicle | null;
  selectedPersonil: Personil | null;
  fotoUrlsByItem: Record<string, string>;
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
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Periksa Kembali Data Barang</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Pastikan semua data sudah benar sebelum diajukan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="mb-4 text-sm text-slate-600">
            Pastikan daftar barang, jumlah, dan tujuan pengiriman sudah sesuai sebelum melanjutkan. Perubahan setelah submit memerlukan proses ulang.
          </p>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Daftar Barang
              </p>
              <div className="space-y-2">
                {selectedItems.map((item, idx) => {
                  const key = String(item.barang_id || item.id || "");
                  const fotoUrl = fotoUrlsByItem[key];
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {item.nama_barang || item.kode_perangkat || "-"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.kode_perangkat || "-"}
                        </span>
                        {fotoUrl && (
                          <img src={fotoUrl} alt="Foto barang" className="mt-1 h-10 w-10 rounded-md border border-gray-200 object-cover" />
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-slate-700">
                          {item.qty} {item.unit || "unit"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Rute Pengiriman
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Gudang Asal</span>
                  <span className="font-medium text-slate-700">
                    {selectedGudangAsal?.nama_gudang || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Gudang Tujuan</span>
                  <span className="font-medium text-slate-700">
                    {selectedGudangTujuan?.nama_gudang || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Project</span>
                  <span className="font-medium text-slate-700">
                    {selectedProject?.nama_project || "-"}
                  </span>
                </div>
              </div>
            </div>

            {(picPemohon || selectedVehicle || selectedPersonil) && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Detail Pengiriman
                </p>
                <div className="space-y-1 text-sm">
                  {picPemohon && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">PIC Pemohon</span>
                      <span className="font-medium text-slate-700">{picPemohon}</span>
                    </div>
                  )}
                  {selectedVehicle && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Kendaraan</span>
                      <span className="font-medium text-slate-700">
                        {selectedVehicle.jenis_kendaraan}
                        {selectedVehicle.merk ? ` (${selectedVehicle.merk})` : ""} — {selectedVehicle.no_polisi}
                      </span>
                    </div>
                  )}
                  {selectedPersonil && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Driver</span>
                      <span className="font-medium text-slate-700">
                        {selectedPersonil.nama}
                        {selectedPersonil.posisi ? ` — ${selectedPersonil.posisi}` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Periksa Kembali
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="rounded-xl bg-[#E8632C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
            >
              {submitting ? "Mengajukan..." : "Ya, Ajukan Surat Jalan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AjukanSuratJalanPage() {
  const router = useRouter();
  const { get, post } = useApi();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<ItemBarang[]>([]);
  const [personnel, setPersonnel] = useState<Personil[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedBoqId, setSelectedBoqId] = useState<string>("");
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [picPemohon, setPicPemohon] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedPersonilId, setSelectedPersonilId] = useState<string>("");
  const [selectedGudangAsalId, setSelectedGudangAsalId] = useState<string>("");
  const [selectedGudangTujuanId, setSelectedGudangTujuanId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [boqItems, setBoqItems] = useState<ItemBarang[]>([]);
  const [boqItemsLoading, setBoqItemsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fotoUrlsByItem, setFotoUrlsByItem] = useState<Record<string, string>>({});
  const [uploadingFotoByItem, setUploadingFotoByItem] = useState<Record<string, boolean>>({});
  const [fotoErrorsByItem, setFotoErrorsByItem] = useState<Record<string, string | null>>({});

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      try {
        const [projectRes, itemRes, personnelRes, vehicleRes, warehouseRes] = await Promise.all([
          get(new URL("/api/projects", baseUrl).toString()),
          get(new URL("/api/items", baseUrl).toString()),
          get(new URL("/api/personnels", baseUrl).toString()),
          get(new URL("/api/vehicles", baseUrl).toString()),
          get(new URL("/api/warehouses", baseUrl).toString()),
        ]);

        if (!projectRes.ok) throw new Error("Gagal mengambil daftar Project.");
        if (!itemRes.ok) throw new Error("Gagal mengambil daftar Barang.");
        if (!personnelRes.ok) throw new Error("Gagal mengambil daftar Personil.");
        if (!vehicleRes.ok) throw new Error("Gagal mengambil daftar Kendaraan.");
        if (!warehouseRes.ok) throw new Error("Gagal mengambil daftar Gudang.");

        const [projectJson, itemJson, personnelJson, vehicleJson, warehouseJson] = await Promise.all([projectRes.json(), itemRes.json(), personnelRes.json(), vehicleRes.json(), warehouseRes.json()]);

        const unwrap = (json: any) => (Array.isArray(json?.data) ? json.data : json?.data?.data || []);

        setProjects(unwrap(projectJson));
        setItems(unwrap(itemJson));
        setPersonnel(unwrap(personnelJson));
        setVehicles(unwrap(vehicleJson));
        setWarehouses(unwrap(warehouseJson));
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Terjadi kesalahan mengambil data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProject = useMemo(() => projects.find((p) => String(p.project_id) === selectedProjectId) || null, [projects, selectedProjectId]);

  const selectedVehicle = useMemo(() => vehicles.find((v) => String(v.kendaraan_id || v.id) === selectedVehicleId) || null, [vehicles, selectedVehicleId]);

  const selectedPersonil = useMemo(() => personnel.find((p) => String(p.personil_id || p.id) === selectedPersonilId) || null, [personnel, selectedPersonilId]);

  const selectedGudangAsal = useMemo(() => warehouses.find((w) => String(w.gudang_id) === selectedGudangAsalId) || null, [warehouses, selectedGudangAsalId]);

  const selectedGudangTujuan = useMemo(() => warehouses.find((w) => String(w.gudang_id) === selectedGudangTujuanId) || null, [warehouses, selectedGudangTujuanId]);

  const driverOptions = useMemo(() => {
    const canDrive = personnel.filter((p) => p.bisa_menyetir);
    return canDrive.length > 0 ? canDrive : personnel;
  }, [personnel]);
  async function handleSelectProject(projectId: string, boqId?: string) {
    setSelectedProjectId(projectId);
    setSelectedBoqId(boqId || "");
    setQtyByItem({});
    setBoqItems([]);

    if (!projectId) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    setBoqItemsLoading(true);
    try {
      const res = await get(`${baseUrl}/api/boqs/items?projectId=${projectId}`);
      if (!res.ok) throw new Error("Gagal mengambil daftar item BOQ Plan.");
      const json = await res.json();
      const rawList = Array.isArray(json?.data) ? json.data : [];
      const mapped: ItemBarang[] = rawList.map((it: any) => ({
        id: String(it.barang_id || it.id || ""),
        barang_id: String(it.barang_id || it.id || ""),
        kode_perangkat: it.kode_perangkat || "",
        nama_barang: it.nama_barang || "",
        unit: it.satuan_kode || it.satuan_default?.kode_satuan || it.satuan_default_id || "",
        satuan_default_id: it.satuan_id || it.satuan_default_id || "",
        qty_rencana: Number(it.qty_rencana || 0),
      }));
      setBoqItems(mapped);
    } catch (err) {
      console.error(err);
      setBoqItems([]);
    } finally {
      setBoqItemsLoading(false);
    }
  }

  function setQty(itemKey: string, value: number) {
    setFormError(null);
    const item = boqItems.find((it) => String(it.barang_id || it.id) === itemKey);
    const maxQty = item?.qty_rencana ?? 0;
    const clamped = Math.min(Math.max(0, value), maxQty);
    setQtyByItem((prev) => ({ ...prev, [itemKey]: clamped }));
    if (value > maxQty && maxQty > 0) {
      setFormError(`Qty tidak boleh melebihi alokasi BOQ Plan (${maxQty}).`);
    }
  }

  const selectedItems = useMemo(
    () =>
      boqItems
        .map((item) => {
          const key = item.barang_id || item.id;
          const qty = qtyByItem[key] || 0;
          return { ...item, key, qty };
        })
        .filter((i) => i.qty > 0),
    [boqItems, qtyByItem],
  );

  const totalQty = selectedItems.reduce((sum, i) => sum + i.qty, 0);
  const canSubmit = !!selectedProject && selectedItems.length > 0 && !!selectedGudangAsalId && !!selectedGudangTujuanId && !!selectedPersonil && Object.keys(fotoUrlsByItem).length > 0;

  async function handleSubmit() {
    if (!canSubmit || !selectedProject || !selectedPersonil) return;
    if (formError) return;
    setShowConfirmModal(true);
  }

  async function handleFotoUpload(itemKey: string, file: File) {
    setFotoErrorsByItem((prev) => ({ ...prev, [itemKey]: null }));
    setUploadingFotoByItem((prev) => ({ ...prev, [itemKey]: true }));

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
        throw new Error("URL foto tidak ditemukan dari respons upload.");
      }

      setFotoUrlsByItem((prev) => ({ ...prev, [itemKey]: fotoUrl }));
    } catch (err) {
      setFotoErrorsByItem((prev) => ({
        ...prev,
        [itemKey]: err instanceof Error ? err.message : "Gagal upload foto.",
      }));
    } finally {
      setUploadingFotoByItem((prev) => ({ ...prev, [itemKey]: false }));
    }
  }

  function handleFotoRemove(itemKey: string) {
    setFotoUrlsByItem((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
    setFotoErrorsByItem((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
  }

  function showToast(message: string, type: "success" | "error") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  }

  async function confirmSubmit() {
    if (!canSubmit || !selectedProject || !selectedPersonil) return;

    setSubmitting(true);
    setShowConfirmModal(false);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const payload = {
        tipe: "outbound",
        nomor_surat_jalan: generateNomorSuratJalanOutbound(),
        gudang_asal_id: selectedGudangAsalId,
        gudang_tujuan_id: selectedGudangTujuanId,
        kendaraan_id: selectedVehicleId || null,
        personil_pengantar_id: selectedPersonilId,
        project_id: selectedProjectId,
        boq_id: selectedBoqId || null,
        kategori_approval: "manual_override",
        pic_pemohon_nama: picPemohon || null,
        items: selectedItems.map((i) => {
          const key = String(i.barang_id || i.id);
          return {
            barang_id: String(i.barang_id || i.id),
            qty: i.qty,
            satuan_id: String(i.satuan_default_id || i.unit || 1),
            kondisi: "baik",
            is_kelebihan: false,
            catatan: null,
            foto_url: fotoUrlsByItem[key] || null,
          };
        }),
      };

      const response = await post(`${baseUrl}/api/surat-jalan`, payload);

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message || "Gagal membuat Surat Jalan.");
      }

      const result = await response.json();
      const suratJalanId = result?.data?.surat_jalan_id || result?.data?.id;

      if (!suratJalanId) {
        throw new Error("Respons API tidak mengembalikan ID Surat Jalan.");
      }

      setShowSuccessModal(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat Surat Jalan.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSuccessModalClose() {
    setShowSuccessModal(false);
    router.push("/staff/outbound");
  }

  if (loading) {
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

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Ajukan Surat Jalan Baru</h1>
        <p className="mt-1 text-sm text-gray-500">Pilih Project sebagai tujuan, lalu tentukan barang yang mau dikirim</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* BOQ / Tiket */}
          <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <ClipboardList size={16} />
              BOQ / Tiket
            </p>
            <BoqPicker
              value={selectedBoqId}
              onSelect={(picked) => {
                handleSelectProject(String(picked.project_id || selectedProjectId), picked.boq_id);
              }}
              placeholder="Pilih BOQ / Tiket"
            />
            {selectedBoqId && (
              <p className="mt-2 text-xs text-gray-500">
                Tiket: {selectedProject?.nama_project || `Project ID ${selectedProjectId}`}
              </p>
            )}
          </div>

          {/* Gudang Asal & Tujuan */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <MapPin size={16} />
                Gudang Asal
              </p>
              <div className="relative">
                <select
                  value={selectedGudangAsalId}
                  onChange={(e) => setSelectedGudangAsalId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
                >
                  <option value="" disabled>
                    Pilih Gudang Asal...
                  </option>
                  {warehouses.map((w) => (
                    <option key={w.gudang_id} value={String(w.gudang_id)}>
                      {w.nama_gudang} {w.tipe ? `(${w.tipe})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              {warehouses.length === 0 && <p className="mt-2 text-xs text-gray-400">Belum ada data Gudang di master data.</p>}
            </div>

            <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <MapPin size={16} />
                Gudang Tujuan
              </p>
              <div className="relative">
                <select
                  value={selectedGudangTujuanId}
                  onChange={(e) => setSelectedGudangTujuanId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
                >
                  <option value="" disabled>
                    Pilih Gudang Tujuan...
                  </option>
                  {warehouses.map((w) => (
                    <option key={w.gudang_id} value={String(w.gudang_id)}>
                      {w.nama_gudang} {w.tipe ? `(${w.tipe})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Daftar barang */}
          {selectedProject && (
            <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Pilih Barang & Kuantitas</p>

              {boqItemsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[#E8632C]" />
                </div>
              ) : (
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                        <th className="pb-3 font-semibold">Kode</th>
                        <th className="pb-3 font-semibold">Nama Barang</th>
                        <th className="pb-3 font-semibold text-right">BOQ Plan</th>
                        <th className="pb-3 font-semibold text-right">Qty</th>
                      <th className="pb-3 font-semibold">Foto Barang</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boqItems.map((item) => {
                        const key = item.barang_id || item.id;
                        const qty = qtyByItem[key] || 0;
                        const maxQty = item.qty_rencana ?? 0;
                        const isOver = qty > maxQty && maxQty > 0;
                        return (
                          <tr key={key} className="border-b border-gray-50 last:border-0">
                            <td className="py-3 pr-4 font-medium text-gray-800">{item.kode_perangkat}</td>
                            <td className="py-3 pr-4 text-gray-600">{item.nama_barang}</td>
                            <td className="py-3 pr-4 text-right text-xs text-gray-500">{maxQty > 0 ? `${maxQty} unit` : "-"}</td>
                            <td className="py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setQty(key, qty - 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50">
                                  −
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={maxQty || undefined}
                                  value={qty}
                                  onChange={(e) => setQty(key, Number(e.target.value))}
                                  className={`w-12 rounded-md border py-1 text-center text-sm ${isOver ? "border-rose-400 text-rose-600" : "border-gray-200"}`}
                                />
                                <button onClick={() => setQty(key, qty + 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50">
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <input
                                  id={`foto-${key}`}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFotoUpload(key, file);
                                  }}
                                />
                                {fotoUrlsByItem[key] ? (
                                  <div className="relative">
                                    <img src={fotoUrlsByItem[key]} alt="Preview" className="h-10 w-10 rounded-md border border-gray-200 object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => handleFotoRemove(key)}
                                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white hover:bg-rose-600"
                                    >
                                      <X size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <label
                                    htmlFor={`foto-${key}`}
                                    className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-400 hover:border-[#E8632C] hover:text-[#E8632C] ${uploadingFotoByItem[key] ? "opacity-50" : ""}`}
                                  >
                                    {uploadingFotoByItem[key] ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                  </label>
                                )}
                              </div>
                              {fotoErrorsByItem[key] && (
                                <p className="mt-1 text-[10px] text-rose-600">{fotoErrorsByItem[key]}</p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  {boqItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        Project ini belum memiliki BOQ Plan atau belum ada item di BOQ Plan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {Object.keys(fotoUrlsByItem).length === 0 && selectedProject && (
                <p className="mt-3 text-xs text-gray-400">
                  Upload minimal 1 foto barang sebelum dapat mengajukan Surat Jalan.
                </p>
              )}

                  {formError && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      {formError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Detail Pengiriman</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">PIC / Pemohon</label>
                <input value={picPemohon} onChange={(e) => setPicPemohon(e.target.value)} placeholder="Nama pemohon barang" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none" />
              </div>

              {/* Dropdown Kendaraan — dari master data */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <Truck size={13} />
                  Kendaraan
                </label>
                <div className="relative">
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-9 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
                  >
                    <option value="">Pilih kendaraan (opsional)...</option>
                    {vehicles.map((v) => (
                      <option key={v.kendaraan_id || v.id} value={String(v.kendaraan_id || v.id)}>
                        {v.jenis_kendaraan} {v.merk ? `(${v.merk})` : ""} — {v.no_polisi}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {vehicles.length === 0 && <p className="mt-1 text-xs text-gray-400">Belum ada data Kendaraan di master data.</p>}
              </div>

              {/* Dropdown Driver — dari master data Personil */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <User size={13} />
                  Nama Driver
                </label>
                <div className="relative">
                  <select
                    value={selectedPersonilId}
                    onChange={(e) => setSelectedPersonilId(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-9 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
                  >
                    <option value="" disabled>
                      Pilih driver...
                    </option>
                    {driverOptions.map((p) => (
                      <option key={p.personil_id || p.id} value={String(p.personil_id || p.id)}>
                        {p.nama} {p.posisi ? `— ${p.posisi}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {personnel.length === 0 && <p className="mt-1 text-xs text-gray-400">Belum ada data Personil di master data.</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Ringkasan</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total barang dipilih</span>
              <span className="font-bold text-gray-900">
                {selectedItems.length} jenis / {totalQty} unit
              </span>
            </div>
          </div>

          <Button disabled={!canSubmit || submitting} onClick={handleSubmit} className="h-auto rounded-xl bg-[#E8632C] py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40">
            {submitting ? "Memproses..." : "Ajukan Surat Jalan"}
          </Button>
        </div>

        <ConfirmModal
            open={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            onConfirm={confirmSubmit}
            submitting={submitting}
            selectedItems={selectedItems}
            selectedGudangAsal={selectedGudangAsal}
            selectedGudangTujuan={selectedGudangTujuan}
            selectedProject={selectedProject}
            picPemohon={picPemohon}
            selectedVehicle={selectedVehicle}
            selectedPersonil={selectedPersonil}
            fotoUrlsByItem={fotoUrlsByItem}
          />

      </div>

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
              <h3 className="text-lg font-bold text-gray-900">Surat Jalan Berhasil Diajukan</h3>
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
    </div>
  );
}
