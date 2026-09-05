"use client";

import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api";
import { X, Plus, Loader2, User, Truck, Package, MapPin, Warehouse as WarehouseIcon } from "lucide-react";

const TABS = ["Personil", "Kendaraan", "Inventori Perangkat"] as const;

type TabKey = (typeof TABS)[number];

type Personnel = {
  personil_id: number;
  nama: string;
  posisi?: string;
  no_hp?: string;
  email?: string;
  nik?: string;
  role?: string;
  gudang_id?: number | string;
};

type Vehicle = {
  kendaraan_id: number;
  jenis_kendaraan: string;
  merk?: string;
  no_polisi: string;
  kapasitas_angkut?: string;
  keterangan?: string;
  gudang_id?: number | string;
};

type Item = {
  barang_id: number;
  kode_perangkat?: string;
  nama_barang?: string;
  satuan_default?: {
    kode_satuan?: string;
  };
  gudang_id?: number | string;
};

type Warehouse = {
  gudang_id: number | string;
  nama_gudang: string;
};

const FALLBACK_WAREHOUSES: Warehouse[] = [
  { gudang_id: 1, nama_gudang: "Gudang Ciamis" },
  { gudang_id: 2, nama_gudang: "Gudang Rancamanyar" },
];

function EmptyState({ title, description, icon: Icon }: { title: string; description: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default function SupervisorOperasionalPage() {
  const { get, post } = useApi();
  const [activeTab, setActiveTab] = useState<TabKey>("Personil");
  const [personnels, setPersonnels] = useState<Personnel[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>(FALLBACK_WAREHOUSES);
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");

  const [personilModalOpen, setPersonilModalOpen] = useState(false);
  const [kendaraanModalOpen, setKendaraanModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [personilForm, setPersonilForm] = useState({
    nama: "",
    posisi: "",
    no_hp: "",
    email: "",
    nik: "",
    role: "",
    bisa_menyetir: false,
    is_material_handler: false,
  });

  const [kendaraanForm, setKendaraanForm] = useState({
    jenis_kendaraan: "",
    merk: "",
    no_polisi: "",
    kapasitas_angkut: "",
    keterangan: "",
  });

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  const parseDecimalInput = (value: string) => {
    const cleaned = (value || "").replace(/[^0-9.,]/g, "").replace(/,/g, ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? String(num) : "";
  };

  const normalizeList = (payload: unknown) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object" && "data" in payload && Array.isArray((payload as { data: unknown[] }).data)) return (payload as { data: unknown[] }).data;
    return [];
  };

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [personnelRes, vehicleRes, itemsRes, warehousesRes] = await Promise.allSettled([
          get(`${apiBase}/api/personnels`),
          get(`${apiBase}/api/vehicles`),
          get(`${apiBase}/api/items`),
          get(`${apiBase}/api/warehouses?limit=1000&is_aktif=true&sortBy=nama_gudang&sortOrder=asc`),
        ]);

        if (!mounted) return;

        if (personnelRes.status === "fulfilled" && personnelRes.value?.ok) {
          const json = await personnelRes.value.json().catch(() => null);
          setPersonnels(normalizeList(json));
        } else {
          console.warn("Gagal memuat data personil");
          setPersonnels([]);
        }

        if (vehicleRes.status === "fulfilled" && vehicleRes.value?.ok) {
          const json = await vehicleRes.value.json().catch(() => null);
          setVehicles(normalizeList(json));
        } else {
          console.warn("Gagal memuat data kendaraan");
          setVehicles([]);
        }

        if (itemsRes.status === "fulfilled" && itemsRes.value?.ok) {
          const json = await itemsRes.value.json().catch(() => null);
          setItems(normalizeList(json));
        } else {
          console.warn("Gagal memuat data inventori");
          setItems([]);
        }

        if (warehousesRes.status === "fulfilled" && warehousesRes.value?.ok) {
          const json = await warehousesRes.value.json().catch(() => null);
          const rawList = Array.isArray(json?.data) ? json.data : [];
          const list = rawList.map((w) => ({
            gudang_id: w.gudang_id,
            nama_gudang: w.nama_gudang,
          }));
          if (list.length) {
            setWarehouses(list);
          } else {
            setWarehouses(FALLBACK_WAREHOUSES);
          }
        }
      } catch (err) {
        console.error("Error loading operasional data:", err);
        setWarehouses(FALLBACK_WAREHOUSES);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [get, apiBase]);

  const filteredPersonnels = useMemo(() => {
    if (!warehouseFilter) return personnels;
    return personnels.filter((p) => {
      const gid = String(p.gudang_id ?? "");
      return gid === "" || gid === String(warehouseFilter);
    });
  }, [personnels, warehouseFilter]);

  const filteredVehicles = useMemo(() => {
    if (!warehouseFilter) return vehicles;
    return vehicles.filter((v) => {
      const gid = String(v.gudang_id ?? "");
      return gid === "" || gid === String(warehouseFilter);
    });
  }, [vehicles, warehouseFilter]);

  const filteredItems = useMemo(() => {
    if (!warehouseFilter) return items;
    return items.filter((it) => {
      const gid = String(it.gudang_id ?? "");
      return gid === "" || gid === String(warehouseFilter);
    });
  }, [items, warehouseFilter]);

  const selectedWarehouseName = useMemo(() => {
    if (!warehouseFilter) return null;
    return warehouses.find((w) => String(w.gudang_id) === String(warehouseFilter))?.nama_gudang || null;
  }, [warehouseFilter, warehouses]);

  const summary = useMemo(() => {
    return {
      personilCount: filteredPersonnels.length,
      vehicleCount: filteredVehicles.length,
      itemCount: filteredItems.length,
    };
  }, [filteredPersonnels.length, filteredVehicles.length, filteredItems.length]);

  const resetPersonilForm = () => {
    setPersonilForm({ nama: "", posisi: "", no_hp: "", email: "", nik: "", role: "", bisa_menyetir: false, is_material_handler: false });
    setFormError(null);
  };

  const resetKendaraanForm = () => {
    setKendaraanForm({ jenis_kendaraan: "", merk: "", no_polisi: "", kapasitas_angkut: "", keterangan: "" });
    setFormError(null);
  };

  const handleSubmitPersonil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        nama: personilForm.nama || null,
        posisi: personilForm.posisi || null,
        no_hp: personilForm.no_hp || null,
        email: personilForm.email || null,
        nik: personilForm.nik || null,
        role: personilForm.role || null,
        bisa_menyetir: personilForm.bisa_menyetir || null,
        is_material_handler: personilForm.is_material_handler || null,
      };
      if (warehouseFilter) {
        payload.gudang_id = Number(warehouseFilter);
      }

      const res = await post(`${apiBase}/api/personnels`, payload);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = json?.message || json?.error || "Gagal menambah personil.";
        const validationDetails = json?.errors || json?.details || null;
        throw new Error(validationDetails ? `${message} ${JSON.stringify(validationDetails)}` : message);
      }
      setPersonilModalOpen(false);
      resetPersonilForm();
      const [personnelRes] = await Promise.allSettled([get(`${apiBase}/api/personnels`)]);
      if (personnelRes.status === "fulfilled" && personnelRes.value?.ok) {
        const pJson = await personnelRes.value.json().catch(() => null);
        setPersonnels(normalizeList(pJson));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setFormError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitKendaraan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await post(`${apiBase}/api/vehicles`, {
        jenis_kendaraan: kendaraanForm.jenis_kendaraan || null,
        merk: kendaraanForm.merk || null,
        no_polisi: kendaraanForm.no_polisi || null,
        kapasitas_angkut: parseDecimalInput(kendaraanForm.kapasitas_angkut) || null,
        keterangan: kendaraanForm.keterangan || null,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Gagal menambah kendaraan.");
      setKendaraanModalOpen(false);
      resetKendaraanForm();
      const [vehicleRes] = await Promise.allSettled([get(`${apiBase}/api/vehicles`)]);
      if (vehicleRes.status === "fulfilled" && vehicleRes.value?.ok) {
        const vJson = await vehicleRes.value.json().catch(() => null);
        setVehicles(normalizeList(vJson));
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.");
    } finally {
      setSubmitting(false);
    }
  };

  const badgeClass = (variant: "default" | "success" | "warning" | "info") => {
    const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
    const map = {
      default: "bg-slate-100 text-slate-700",
      success: "bg-emerald-50 text-emerald-700",
      warning: "bg-amber-50 text-amber-700",
      info: "bg-sky-50 text-sky-700",
    };
    return `${base} ${map[variant]}`;
  };

  const positionVariant = (posisi?: string) => {
    const value = (posisi || "").toLowerCase();
    if (value.includes("driver") || value.includes("supir")) return "warning";
    if (value.includes("helper") || value.includes("assistant")) return "info";
    if (value.includes("admin") || value.includes("manager")) return "success";
    return "default";
  };

  const vehicleVariant = (jenis?: string) => {
    const value = (jenis || "").toLowerCase();
    if (value.includes("truck") || value.includes("pickup")) return "warning";
    if (value.includes("motor")) return "info";
    return "default";
  };

  return (
    <div className="min-h-screen px-8 py-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#E8632C]">
            Operasional & Tim
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Personil, Kendaraan, dan Inventori Perangkat
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Kelola data operasional tim, armada, dan inventori perangkat dalam satu tampilan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 shadow-sm">
            <MapPin size={14} className="text-slate-400" />
            <span className="hidden sm:inline">Filter Gudang</span>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="bg-transparent text-slate-600 outline-none"
            >
              <option value="">Semua Gudang</option>
              {warehouses.map((wh) => (
                <option key={wh.gudang_id} value={String(wh.gudang_id)}>
                  {wh.nama_gudang}
                </option>
              ))}
            </select>
          </label>
          {selectedWarehouseName && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8632C]/20 bg-[#E8632C]/5 px-3 py-1.5 text-xs font-semibold text-[#E8632C]">
              <WarehouseIcon size={12} />
              {selectedWarehouseName}
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Personil</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.personilCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600">
              <User size={18} />
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Kendaraan</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.vehicleCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600">
              <Truck size={18} />
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Inventori Perangkat</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.itemCount}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600">
              <Package size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Navigation Tabs */}
        <div className="mb-6 flex items-center justify-between gap-3 overflow-x-auto pb-2">
          <div className="flex items-center gap-3">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? "bg-[#E8632C] text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {activeTab === "Personil" && (
            <button
              type="button"
              onClick={() => { resetPersonilForm(); setPersonilModalOpen(true); }}
              className="flex items-center gap-1.5 rounded-full bg-[#E8632C] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#D9591F]"
            >
              <Plus size={16} />
              Tambah Personil
            </button>
          )}
          {activeTab === "Kendaraan" && (
            <button
              type="button"
              onClick={() => { resetKendaraanForm(); setKendaraanModalOpen(true); }}
              className="flex items-center gap-1.5 rounded-full bg-[#E8632C] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#D9591F]"
            >
              <Plus size={16} />
              Tambah Kendaraan
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#E8632C]" />
            <p className="text-sm font-medium">Memuat data operasional...</p>
          </div>
        )}

        {/* Tab 1: Personil */}
        {!loading && activeTab === "Personil" && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Posisi</th>
                  <th className="px-4 py-3">No. HP</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">NIK</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonnels.map((person, index) => (
                  <tr key={person.personil_id || index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{person.nama || "-"}</td>
                    <td className="px-4 py-4">
                      {person.posisi ? (
                        <span className={badgeClass(positionVariant(person.posisi))}>{person.posisi}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-4">{person.no_hp || "-"}</td>
                    <td className="px-4 py-4">{person.email || "-"}</td>
                    <td className="px-4 py-4">{person.nik || "-"}</td>
                  </tr>
                ))}
                {filteredPersonnels.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8">
                      <EmptyState
                        title="Belum ada data personil"
                        description={warehouseFilter ? "Coba ubah filter gudang untuk melihat data lainnya." : "Belum ada personil yang terdaftar di sistem."}
                        icon={User}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Kendaraan */}
        {!loading && activeTab === "Kendaraan" && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">No. Polisi</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Merk</th>
                  <th className="px-4 py-3">Kapasitas Angkut</th>
                  <th className="px-4 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle, index) => (
                  <tr key={vehicle.kendaraan_id || index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{vehicle.no_polisi || "-"}</td>
                    <td className="px-4 py-4">
                      {vehicle.jenis_kendaraan ? (
                        <span className={badgeClass(vehicleVariant(vehicle.jenis_kendaraan))}>{vehicle.jenis_kendaraan}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-4">{vehicle.merk || "-"}</td>
                    <td className="px-4 py-4">{vehicle.kapasitas_angkut || "-"}</td>
                    <td className="px-4 py-4">{vehicle.keterangan || "-"}</td>
                  </tr>
                ))}
                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8">
                      <EmptyState
                        title="Belum ada data kendaraan"
                        description={warehouseFilter ? "Tidak ada kendaraan yang terasosiasi dengan gudang ini." : "Belum ada kendaraan operasional yang terdaftar."}
                        icon={Truck}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Inventori Perangkat */}
        {!loading && activeTab === "Inventori Perangkat" && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Kode Perangkat</th>
                  <th className="px-4 py-3">Nama Barang</th>
                  <th className="px-4 py-3">Satuan</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={item.barang_id || index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{item.kode_perangkat || "-"}</td>
                    <td className="px-4 py-4">{item.nama_barang || "-"}</td>
                    <td className="px-4 py-4">
                      {item.satuan_default?.kode_satuan ? (
                        <span className={badgeClass("info")}>{item.satuan_default.kode_satuan}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8">
                      <EmptyState
                        title="Belum ada data inventori"
                        description={warehouseFilter ? "Gudang ini belum memiliki data inventori perangkat." : "Belum ada inventori perangkat yang tercatat."}
                        icon={Package}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Personil */}
      {personilModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => { setPersonilModalOpen(false); resetPersonilForm(); }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Tambah Personil</h3>
                <p className="text-xs text-slate-500">Masukkan data personil operasional.</p>
              </div>
              <button type="button" onClick={() => { setPersonilModalOpen(false); resetPersonilForm(); }} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmitPersonil} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Nama <span className="text-rose-500">*</span></label>
                  <input type="text" value={personilForm.nama} onChange={(e) => setPersonilForm((p) => ({ ...p, nama: e.target.value }))} placeholder="Nama lengkap" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Posisi</label>
                  <select value={personilForm.posisi} onChange={(e) => setPersonilForm((p) => ({ ...p, posisi: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400">
                    <option value="">Pilih posisi</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Staf Gudang">Staf Gudang</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">No. HP</label>
                  <input type="text" value={personilForm.no_hp} onChange={(e) => setPersonilForm((p) => ({ ...p, no_hp: e.target.value }))} placeholder="Nomor telepon" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
                  <input type="email" value={personilForm.email} onChange={(e) => setPersonilForm((p) => ({ ...p, email: e.target.value }))} placeholder="Alamat email" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">NIK</label>
                  <input type="text" value={personilForm.nik} onChange={(e) => setPersonilForm((p) => ({ ...p, nik: e.target.value }))} placeholder="Nomor Induk Karyawan" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Role</label>
                  <input type="text" value={personilForm.role} onChange={(e) => setPersonilForm((p) => ({ ...p, role: e.target.value }))} placeholder="Contoh: Admin, Operator" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div className="sm:col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={personilForm.bisa_menyetir} onChange={(e) => setPersonilForm((p) => ({ ...p, bisa_menyetir: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-[#E8632C] focus:ring-[#E8632C]" />
                    Bisa Menyetir
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={personilForm.is_material_handler} onChange={(e) => setPersonilForm((p) => ({ ...p, is_material_handler: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-[#E8632C] focus:ring-[#E8632C]" />
                    Material Handler
                  </label>
                </div>
                {warehouseFilter && (
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-slate-500">Gudang</label>
                    <input type="text" value={selectedWarehouseName || ""} disabled className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none cursor-not-allowed" />
                  </div>
                )}
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <span>{formError}</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setPersonilModalOpen(false); resetPersonilForm(); }} disabled={submitting} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-full bg-[#E8632C] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#D9591F] disabled:opacity-60">
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Kendaraan */}
      {kendaraanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => { setKendaraanModalOpen(false); resetKendaraanForm(); }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Tambah Kendaraan</h3>
                <p className="text-xs text-slate-500">Masukkan data kendaraan operasional.</p>
              </div>
              <button type="button" onClick={() => { setKendaraanModalOpen(false); resetKendaraanForm(); }} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmitKendaraan} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Jenis Kendaraan <span className="text-rose-500">*</span></label>
                  <input type="text" value={kendaraanForm.jenis_kendaraan} onChange={(e) => setKendaraanForm((p) => ({ ...p, jenis_kendaraan: e.target.value }))} placeholder="Contoh: Truck, Pickup, Motor" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Merk</label>
                  <input type="text" value={kendaraanForm.merk} onChange={(e) => setKendaraanForm((p) => ({ ...p, merk: e.target.value }))} placeholder="Merk kendaraan" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">No. Polisi <span className="text-rose-500">*</span></label>
                  <input type="text" value={kendaraanForm.no_polisi} onChange={(e) => setKendaraanForm((p) => ({ ...p, no_polisi: e.target.value }))} placeholder="Nomor polisi" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Kapasitas Angkut</label>
                  <input type="text" value={kendaraanForm.kapasitas_angkut} onChange={(e) => setKendaraanForm((p) => ({ ...p, kapasitas_angkut: e.target.value }))} placeholder="Contoh: 6 atau 2.5" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Keterangan</label>
                  <input type="text" value={kendaraanForm.keterangan} onChange={(e) => setKendaraanForm((p) => ({ ...p, keterangan: e.target.value }))} placeholder="Catatan tambahan" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <span>{formError}</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setKendaraanModalOpen(false); resetKendaraanForm(); }} disabled={submitting} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-full bg-[#E8632C] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#D9591F] disabled:opacity-60">
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
