"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ChevronDown, Loader2, AlertCircle, Truck, User, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";

// ---------------------------------------------------------------------------
// Project, Gudang, Kendaraan, Personil semuanya diambil dari master data
// asli (endpoint sama seperti dipakai halaman master-data Admin).
// ---------------------------------------------------------------------------
type Project = {
  project_id: string | number;
  nama_project: string;
  klien?: string;
};

type ItemBarang = {
  id: string;
  barang_id?: string;
  kode_perangkat?: string;
  nama_barang?: string;
  unit?: string;
  satuan_default_id?: string | number;
  satuan_default?: { kode_satuan?: string };
};

type Gudang = {
  id: string;
  gudang_id?: string | number;
  nama_gudang: string;
  tipe?: string;
};

type Personil = {
  id: string;
  personil_id?: string | number;
  nama: string;
  posisi?: string;
  bisa_menyetir?: boolean;
};

type Vehicle = {
  id: string;
  kendaraan_id?: string | number;
  jenis_kendaraan: string;
  merk?: string;
  no_polisi: string;
};

export default function InputSuratJalanInboundPage() {
  const router = useRouter();
  const { get, post } = useApi();

  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<ItemBarang[]>([]);
  const [gudangList, setGudangList] = useState<Gudang[]>([]);
  const [personnel, setPersonnel] = useState<Personil[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedGudangTujuan, setSelectedGudangTujuan] = useState("");
  const [asalGudang, setAsalGudang] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedPicId, setSelectedPicId] = useState("");
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      try {
        const [projectRes, itemRes, warehouseRes, personnelRes, vehicleRes] = await Promise.all([
          get(new URL("/api/projects", baseUrl).toString()),
          get(new URL("/api/items", baseUrl).toString()),
          get(new URL("/api/warehouses", baseUrl).toString()),
          get(new URL("/api/personnels", baseUrl).toString()),
          get(new URL("/api/vehicles", baseUrl).toString()),
        ]);

        if (!projectRes.ok) throw new Error("Gagal mengambil daftar Project.");
        if (!itemRes.ok) throw new Error("Gagal mengambil daftar Barang.");
        if (!warehouseRes.ok) throw new Error("Gagal mengambil daftar Gudang.");
        if (!personnelRes.ok) throw new Error("Gagal mengambil daftar Personil.");
        if (!vehicleRes.ok) throw new Error("Gagal mengambil daftar Kendaraan.");

        const [projectJson, itemJson, warehouseJson, personnelJson, vehicleJson] = await Promise.all([projectRes.json(), itemRes.json(), warehouseRes.json(), personnelRes.json(), vehicleRes.json()]);

        const unwrap = (json: any) => (Array.isArray(json?.data) ? json.data : json?.data?.data || []);

        setProjects(unwrap(projectJson));
        setItems(unwrap(itemJson));
        setGudangList(unwrap(warehouseJson));
        setPersonnel(unwrap(personnelJson));
        setVehicles(unwrap(vehicleJson));
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

  const selectedDriver = useMemo(() => personnel.find((p) => String(p.personil_id || p.id) === selectedDriverId) || null, [personnel, selectedDriverId]);

  const selectedPic = useMemo(() => personnel.find((p) => String(p.personil_id || p.id) === selectedPicId) || null, [personnel, selectedPicId]);

  // Driver = personil yang bisa menyetir. Kalau belum ada satupun yang
  // dicentang bisa_menyetir di master data, fallback tampilkan semua biar
  // dropdown-nya nggak kosong melompong.
  const driverOptions = useMemo(() => {
    const canDrive = personnel.filter((p) => p.bisa_menyetir);
    return canDrive.length > 0 ? canDrive : personnel;
  }, [personnel]);

  function setQty(itemKey: string, value: number) {
    setQtyByItem((prev) => ({ ...prev, [itemKey]: Math.max(0, value) }));
  }

  const selectedItems = useMemo(
    () =>
      items
        .map((item) => {
          const key = item.barang_id || item.id;
          const qty = qtyByItem[key] || 0;
          return { ...item, key, qty };
        })
        .filter((i) => i.qty > 0),
    [items, qtyByItem],
  );

  const totalQty = selectedItems.reduce((sum, i) => sum + i.qty, 0);

  const canSubmit = !!selectedProject && !!selectedGudangTujuan && asalGudang.trim().length > 0 && !!selectedDriver && !!selectedPic && selectedItems.length > 0;

  async function handleSubmit() {
    if (!canSubmit || !selectedProject || !selectedDriver || !selectedPic) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const payload = {
        tipe: "inbound",
        nomor_surat_jalan: "",
        gudang_tujuan_id: selectedGudangTujuan ? String(selectedGudangTujuan) : null,
        tanggal: new Date().toISOString().split("T")[0],
        project_id: selectedProjectId ? String(selectedProjectId) : null,
        pengirim_or_vendor: asalGudang.trim() || null,
        kendaraan_id: selectedVehicleId || null,
        personil_pengantar_id: selectedDriverId,
        pic_pemohon_nama: selectedPic.nama,
        nomor_tiket: null,
        notes: null,
        kategori_approval: "manual_override",
        surat_jalan_url: null,
        items: selectedItems.map((i) => ({
          barang_id: String(i.barang_id || i.id),
          qty: i.qty,
          satuan_id: String(i.satuan_default_id || i.unit || 1),
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

      const result = await response.json();
      const suratJalanId = result?.data?.surat_jalan_id || result?.data?.id;
      if (!suratJalanId) {
        throw new Error("Respons API tidak mengembalikan ID Surat Jalan.");
      }

      router.push(`/staff/inbound/${suratJalanId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat pengajuan inbound.");
    } finally {
      setSubmitting(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-900">Input Surat Jalan Inbound</h1>
        <p className="mt-1 text-sm text-gray-500">Catat kedatangan barang dari luar — data ini akan tercetak di Surat Jalan</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Project */}
          <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <ClipboardList size={16} />
              Project
            </p>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
              >
                <option value="" disabled>
                  Pilih Project...
                </option>
                {projects.map((p) => (
                  <option key={p.project_id} value={String(p.project_id)}>
                    {p.nama_project} {p.klien ? `— ${p.klien}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Barang yang diperkirakan datang */}
          <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Barang yang Diperkirakan Datang & Kuantitas</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-3 font-semibold">Kode</th>
                  <th className="pb-3 font-semibold">Nama Barang</th>
                  <th className="pb-3 font-semibold text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const key = item.barang_id || item.id;
                  const qty = qtyByItem[key] || 0;
                  return (
                    <tr key={key} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-800">{item.kode_perangkat}</td>
                      <td className="py-3 pr-4 text-gray-600">{item.nama_barang}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setQty(key, qty - 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50">
                            −
                          </button>
                          <input type="number" min={0} value={qty} onChange={(e) => setQty(key, Number(e.target.value))} className="w-12 rounded-md border border-gray-200 py-1 text-center text-sm" />
                          <button onClick={() => setQty(key, qty + 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50">
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400">
                      Belum ada data Barang di master data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Detail Pengiriman</p>
            <div className="space-y-3">
              {/* Gudang Tujuan */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <Warehouse size={13} />
                  Gudang Tujuan
                </label>
                <div className="relative">
                  <select
                    value={selectedGudangTujuan}
                    onChange={(e) => setSelectedGudangTujuan(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-9 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
                  >
                    <option value="" disabled>
                      Pilih gudang tujuan...
                    </option>
                    {gudangList.map((g) => (
                      <option key={g.gudang_id || g.id} value={String(g.gudang_id || g.id)}>
                        {g.nama_gudang} {g.tipe ? `(${g.tipe})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Asal Gudang — free text, karena pengirim bisa dari luar (supplier/klien), bukan cuma gudang sendiri */}
              <div>
                <label className="mb-1 block text-xs text-gray-500">Asal Gudang / Pengirim</label>
                <input
                  value={asalGudang}
                  onChange={(e) => setAsalGudang(e.target.value)}
                  placeholder="mis. Gudang Pusat Jakarta, atau nama supplier"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                />
              </div>

              {/* Kendaraan */}
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
                <p className="mt-1 text-xs text-gray-400">No Polisi otomatis ikut dari kendaraan yang dipilih.</p>
              </div>

              {/* Nama Driver */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <User size={13} />
                  Nama Driver
                </label>
                <div className="relative">
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
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
              </div>

              {/* Nama PIC Pemohon */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <User size={13} />
                  Nama PIC (Pemohon)
                </label>
                <div className="relative">
                  <select
                    value={selectedPicId}
                    onChange={(e) => setSelectedPicId(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-9 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
                  >
                    <option value="" disabled>
                      Pilih PIC pemohon...
                    </option>
                    {personnel.map((p) => (
                      <option key={p.personil_id || p.id} value={String(p.personil_id || p.id)}>
                        {p.nama} {p.posisi ? `— ${p.posisi}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Ringkasan</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total barang diperkirakan</span>
              <span className="font-bold text-gray-900">
                {selectedItems.length} jenis / {totalQty} unit
              </span>
            </div>
          </div>

          {formError && (
            <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {formError}
            </div>
          )}

          <Button disabled={!canSubmit || submitting} onClick={handleSubmit} className="h-auto rounded-xl bg-[#E8632C] py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40">
            {submitting ? "Menyimpan..." : "Simpan Surat Jalan Inbound"}
          </Button>
        </div>
      </div>
    </div>
  );
}
