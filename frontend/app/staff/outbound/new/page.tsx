"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ChevronDown, Loader2, AlertCircle, Truck, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [tujuan, setTujuan] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedPersonilId, setSelectedPersonilId] = useState<string>("");
  const [selectedGudangAsalId, setSelectedGudangAsalId] = useState<string>("");
  const [selectedGudangTujuanId, setSelectedGudangTujuanId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [boqItems, setBoqItems] = useState<ItemBarang[]>([]);
  const [boqItemsLoading, setBoqItemsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

        const [projectJson, itemJson, personnelJson, vehicleJson, warehouseJson] = await Promise.all([
          projectRes.json(),
          itemRes.json(),
          personnelRes.json(),
          vehicleRes.json(),
          warehouseRes.json(),
        ]);

        const unwrap = (json: any) =>
          Array.isArray(json?.data) ? json.data : json?.data?.data || [];

        setProjects(unwrap(projectJson));
        setItems(unwrap(itemJson));
        setPersonnel(unwrap(personnelJson));
        setVehicles(unwrap(vehicleJson));
        setWarehouses(unwrap(warehouseJson));
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Terjadi kesalahan mengambil data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProject = useMemo(
    () => projects.find((p) => String(p.project_id) === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.kendaraan_id || v.id) === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  const selectedPersonil = useMemo(
    () => personnel.find((p) => String(p.personil_id || p.id) === selectedPersonilId) || null,
    [personnel, selectedPersonilId]
  );

  const selectedGudangAsal = useMemo(
    () => warehouses.find((w) => String(w.gudang_id) === selectedGudangAsalId) || null,
    [warehouses, selectedGudangAsalId]
  );

  const selectedGudangTujuan = useMemo(
    () => warehouses.find((w) => String(w.gudang_id) === selectedGudangTujuanId) || null,
    [warehouses, selectedGudangTujuanId]
  );

  const driverOptions = useMemo(() => {
    const canDrive = personnel.filter((p) => p.bisa_menyetir);
    return canDrive.length > 0 ? canDrive : personnel;
  }, [personnel]);

  async function handleSelectProject(id: string) {
    setSelectedProjectId(id);
    setQtyByItem({});
    setBoqItems([]);

    const proj = projects.find((p) => String(p.project_id) === id);
    setTujuan(proj?.kecamatan || proj?.kota_kabupaten || proj?.klien || "");

    if (!id) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    setBoqItemsLoading(true);
    try {
      const res = await get(`${baseUrl}/api/boqs/items?projectId=${id}`);
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
    [boqItems, qtyByItem]
  );

  const totalQty = selectedItems.reduce((sum, i) => sum + i.qty, 0);
  const canSubmit =
    !!selectedProject &&
    selectedItems.length > 0 &&
    !!selectedGudangAsalId &&
    !!selectedGudangTujuanId &&
    !!selectedPersonil;

  async function handleSubmit() {
    if (!canSubmit || !selectedProject || !selectedPersonil) return;
    if (formError) return;

    setSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const payload = {
        tipe: "outbound",
        gudang_asal_id: selectedGudangAsalId,
        gudang_tujuan_id: selectedGudangTujuanId,
        kendaraan_id: selectedVehicleId || null,
        personil_pengantar_id: selectedPersonilId,
        project_id: selectedProjectId,
        kategori_approval: "manual_override",
        notes: tujuan || null,
        items: selectedItems.map((i) => ({
          barang_id: String(i.barang_id || i.id),
          qty: i.qty,
          satuan_id: String(i.satuan_default_id || i.unit || 1),
          kondisi: "baik",
          is_kelebihan: false,
          catatan: null,
        })),
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

      router.push(`/staff/outbound/${suratJalanId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat Surat Jalan.");
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
        <h1 className="text-3xl font-bold text-gray-900">Ajukan Surat Jalan Baru</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pilih Project sebagai tujuan, lalu tentukan barang yang mau dikirim
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Dropdown Project */}
          <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <ClipboardList size={16} />
              Project
            </p>
            <div className="relative">
              <select
                value={selectedProjectId}
                onChange={(e) => handleSelectProject(e.target.value)}
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
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
            {projects.length === 0 && (
              <p className="mt-3 text-xs text-gray-400">
                Belum ada data Project di master data.
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
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
              {warehouses.length === 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  Belum ada data Gudang di master data.
                </p>
              )}
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
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Daftar barang */}
          {selectedProject && (
            <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Pilih Barang & Kuantitas
              </p>

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
                            <td className="py-3 pr-4 font-medium text-gray-800">
                              {item.kode_perangkat}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">{item.nama_barang}</td>
                            <td className="py-3 pr-4 text-right text-xs text-gray-500">
                              {maxQty > 0 ? `${maxQty} unit` : "-"}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setQty(key, qty - 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                                >
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
                                <button
                                  onClick={() => setQty(key, qty + 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {boqItems.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400">
                            Project ini belum memiliki BOQ Plan atau belum ada item di BOQ Plan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

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
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Detail Pengiriman
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Tujuan / Keterangan</label>
                <input
                  value={tujuan}
                  onChange={(e) => setTujuan(e.target.value)}
                  placeholder="Nama tujuan/klien"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8632C] focus:outline-none"
                />
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
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
                {vehicles.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    Belum ada data Kendaraan di master data.
                  </p>
                )}
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
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
                {personnel.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    Belum ada data Personil di master data.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Ringkasan
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total barang dipilih</span>
              <span className="font-bold text-gray-900">
                {selectedItems.length} jenis / {totalQty} unit
              </span>
            </div>
          </div>

          <Button
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="h-auto rounded-xl bg-[#E8632C] py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
          >
            {submitting ? "Memproses..." : "Ajukan Surat Jalan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
