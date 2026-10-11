"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useApi } from "@/lib/api";
import { X, Plus, Loader2, User, Truck, Package, MapPin, Warehouse as WarehouseIcon, Eye, Pencil, UserX, UserCheck } from "lucide-react";

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
  gudang_id?: number | string | null;
  gudang?: { gudang_id?: number | string; nama_gudang?: string } | null;
  is_aktif?: boolean;
  bisa_menyetir?: boolean;
  is_material_handler?: boolean;
};

type Vehicle = {
  kendaraan_id: number;
  jenis_kendaraan: string;
  merk?: string;
  no_polisi: string;
  kapasitas_angkut?: string;
  keterangan?: string;
  gudang_id?: number | string | null;
  gudang?: { gudang_id?: number | string; nama_gudang?: string } | null;
};

type Item = {
  barang_id: number;
  kode_perangkat?: string;
  nama_barang?: string;
  satuan_default?: {
    kode_satuan?: string;
  };
  gudang_id?: number | string | null;
  gudang?: { gudang_id?: number | string; nama_gudang?: string } | null;
};

type Warehouse = {
  gudang_id: number | string;
  nama_gudang: string;
  tipe?: string;
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
  const { get, post, put } = useApi();
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

  const [selectedPersonil, setSelectedPersonil] = useState<Personnel | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [personilForm, setPersonilForm] = useState({
    nama: "",
    posisi: "",
    no_hp: "",
    email: "",
    nik: "",
    role: "",
    bisa_menyetir: false,
    is_material_handler: false,
    gudang_id: "" as string,
  });

  const [kendaraanForm, setKendaraanForm] = useState({
    jenis_kendaraan: "",
    merk: "",
    no_polisi: "",
    kapasitas_angkut: "",
    keterangan: "",
    gudang_id: "" as string,
  });

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  const parseDecimalInput = (value: string) => {
    const cleaned = (value || "").replace(/[^0-9.,]/g, "").replace(/,/g, ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? String(num) : "";
  };

  const normalizeList = (payload: any) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [];
  };

  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [personnelRes, vehicleRes, itemsRes, warehousesRes] = await Promise.allSettled([
        get(`${apiBase}/api/personnels`),
        get(`${apiBase}/api/vehicles`),
        get(`${apiBase}/api/items`),
        get(`${apiBase}/api/warehouses?limit=1000&is_aktif=true&sortBy=nama_gudang&sortOrder=asc`),
      ]);

      if (!mountedRef.current) return;

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
        const rawList = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.data)
          ? json.data.data
          : [];
        const list = rawList.map((w: any) => ({
          gudang_id: w.gudang_id,
          nama_gudang: w.nama_gudang + (w.tipe === "dadakan" ? " (Transit)" : ""),
          tipe: w.tipe,
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
      if (mountedRef.current) setLoading(false);
    }
  }, [get, apiBase]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const [personilStatusLoading, setPersonilStatusLoading] = useState<string | null>(null);
  const [personilToToggle, setPersonilToToggle] = useState<Personnel | null>(null);
  const [isToggleModalOpen, setIsToggleModalOpen] = useState(false);

  const openToggleModal = (personil: Personnel) => {
    setPersonilToToggle(personil);
    setIsToggleModalOpen(true);
  };

  const closeToggleModal = () => {
    setIsToggleModalOpen(false);
    setPersonilToToggle(null);
  };

  const handleTogglePersonilStatus = async (personil: Personnel) => {
    const currentStatus = Boolean(personil.is_aktif ?? true);
    const newStatus = !currentStatus;

    setPersonilStatusLoading(String(personil.personil_id));

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const url = new URL(`/api/personnels/${personil.personil_id}`, baseUrl).toString();

      const response = await put(url, { is_aktif: newStatus });

      if (!response.ok) {
        let result: unknown = null;
        try {
          result = await response.json();
        } catch {
          result = null;
        }

        const resultObj = result && typeof result === "object" ? result : null;
        const message =
          resultObj && "message" in resultObj
            ? String((resultObj as { message?: unknown }).message)
            : `Gagal mengubah status personil.`;

        console.error("[toggle personil status] backend error:", {
          status: response.status,
          body: resultObj,
        });

        showToast(message || `Gagal mengubah status personil.`, "error");
        return;
      }

      await fetchData();
      showToast(`Status personil berhasil diperbarui.`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      console.error("[toggle personil status] network/client error:", err);
      showToast(msg, "error");
    } finally {
      setPersonilStatusLoading(null);
    }
  };

  const handleViewPersonil = (personil: Personnel) => {
    setSelectedPersonil(personil);
    setIsViewModalOpen(true);
  };

  const handleEditPersonil = (personil: Personnel) => {
    setSelectedPersonil(personil);
    setPersonilForm({
      nama: personil.nama || "",
      posisi: personil.posisi || "",
      no_hp: personil.no_hp || "",
      email: personil.email || "",
      nik: personil.nik || "",
      role: personil.role || "",
      bisa_menyetir: Boolean(personil.bisa_menyetir),
      is_material_handler: Boolean(personil.is_material_handler),
      gudang_id: personil.gudang_id ? String(personil.gudang_id) : "",
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleUpdatePersonil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonil) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const url = new URL(`/api/personnels/${selectedPersonil.personil_id}`, baseUrl).toString();

      const payload: Record<string, unknown> = {
        nama: personilForm.nama || null,
        posisi: personilForm.posisi || null,
        no_hp: personilForm.no_hp || null,
        email: personilForm.email || null,
        nik: personilForm.nik || null,
        role: personilForm.role || null,
        bisa_menyetir: Boolean(personilForm.bisa_menyetir),
        is_material_handler: Boolean(personilForm.is_material_handler),
      };

      const gudangRaw = personilForm.gudang_id || warehouseFilter;
      const gudangIdNum = Number(gudangRaw);
      if (gudangRaw && Number.isFinite(gudangIdNum) && gudangIdNum > 0) {
        payload.gudang_id = gudangIdNum;
      }

      const response = await put(url, payload);
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        const message = json?.message || json?.error || "Gagal memperbarui data personil.";
        const validationDetails = json?.errors || json?.details || null;
        throw new Error(validationDetails ? `${message} ${JSON.stringify(validationDetails)}` : message);
      }

      setIsEditModalOpen(false);
      setSelectedPersonil(null);
      resetPersonilForm();
      await fetchData();
      showToast("Data personil berhasil diperbarui.", "success");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setFormError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getItemGudangId = (rec: { gudang_id?: number | string | null; gudang?: { gudang_id?: number | string } | null }) => {
    const fromObj = rec.gudang?.gudang_id;
    if (fromObj !== undefined && fromObj !== null && fromObj !== "") return fromObj;
    if (rec.gudang_id !== undefined && rec.gudang_id !== null && rec.gudang_id !== "") return rec.gudang_id;
    return null;
  };

  const getItemGudangName = (rec: { gudang?: { nama_gudang?: string } | null }) => {
    return rec.gudang?.nama_gudang || null;
  };

  const resolveGudangName = (rec: { gudang_id?: number | string | null; gudang?: { gudang_id?: number | string; nama_gudang?: string; name?: string } | string | number | null; warehouse?: { nama_gudang?: string; name?: string } | null; gudangName?: string; [key: string]: any }): string | null => {
    const gudangObj = typeof rec.gudang === "object" && rec.gudang !== null ? rec.gudang : null;
    const warehouseObj = typeof rec.warehouse === "object" && rec.warehouse !== null ? rec.warehouse : null;
    const fromRelation =
      gudangObj?.nama_gudang ||
      gudangObj?.name ||
      warehouseObj?.nama_gudang ||
      warehouseObj?.name ||
      rec.gudangName ||
      (typeof rec.gudang === "string" ? rec.gudang : null);
    if (fromRelation) return fromRelation;
    const gid = getItemGudangId(rec as { gudang_id?: number | string | null; gudang?: { gudang_id?: number | string } | null });
    if (gid === null) return null;
    return warehouses.find((w) => String(w.gudang_id) === String(gid))?.nama_gudang || null;
  };

  const selectedWarehouseName = useMemo(() => {
    if (!warehouseFilter) return null;
    return warehouses.find((w) => String(w.gudang_id) === String(warehouseFilter))?.nama_gudang || null;
  }, [warehouseFilter, warehouses]);

  const matchesWarehouse = (rec: { gudang_id?: number | string | null; gudang?: { gudang_id?: number | string; nama_gudang?: string } | null }) => {
    if (!warehouseFilter) return true;
    const selected = Number(warehouseFilter);
    if (Number.isFinite(selected) && selected > 0) {
      const gid = getItemGudangId(rec);
      if (gid !== null) return Number(gid) === selected;
    }
    const gname = getItemGudangName(rec);
    if (gname && selectedWarehouseName) return String(gname) === String(selectedWarehouseName);
    return false;
  };

  const filteredPersonnels = useMemo(() => {
    if (!warehouseFilter) return personnels;
    return personnels.filter(matchesWarehouse);
  }, [personnels, warehouseFilter, selectedWarehouseName]);

  const filteredVehicles = useMemo(() => {
    if (!warehouseFilter) return vehicles;
    return vehicles.filter(matchesWarehouse);
  }, [vehicles, warehouseFilter, selectedWarehouseName]);

  const filteredItems = useMemo(() => {
    if (!warehouseFilter) return items;
    return items.filter(matchesWarehouse);
  }, [items, warehouseFilter, selectedWarehouseName]);

  const summary = useMemo(() => {
    return {
      personilCount: filteredPersonnels.length,
      vehicleCount: filteredVehicles.length,
      itemCount: filteredItems.length,
    };
  }, [filteredPersonnels.length, filteredVehicles.length, filteredItems.length]);

  const resetPersonilForm = () => {
    setPersonilForm({ nama: "", posisi: "", no_hp: "", email: "", nik: "", role: "", bisa_menyetir: false, is_material_handler: false, gudang_id: warehouseFilter ? String(warehouseFilter) : "" });
    setFormError(null);
  };

  const resetKendaraanForm = () => {
    setKendaraanForm({ jenis_kendaraan: "", merk: "", no_polisi: "", kapasitas_angkut: "", keterangan: "", gudang_id: warehouseFilter ? String(warehouseFilter) : "" });
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
        bisa_menyetir: Boolean(personilForm.bisa_menyetir),
        is_material_handler: Boolean(personilForm.is_material_handler),
      };

      const gudangRaw = personilForm.gudang_id || warehouseFilter;
      const gudangIdNum = Number(gudangRaw);
      if (gudangRaw && Number.isFinite(gudangIdNum) && gudangIdNum > 0) {
        payload.gudang_id = gudangIdNum;
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
      await fetchData();
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
      const noPolisiValue = (kendaraanForm.no_polisi || "").trim().toUpperCase();
      const selectedGudangId = kendaraanForm.gudang_id ? Number(kendaraanForm.gudang_id) : null;
      const selectedGudangName = warehouses.find((w) => String(w.gudang_id) === String(kendaraanForm.gudang_id))?.nama_gudang || "";

      const payload: Record<string, unknown> = {
        jenis_kendaraan: kendaraanForm.jenis_kendaraan || "",
        merk: kendaraanForm.merk || "",
        no_polisi: noPolisiValue || "",
        kapasitas_angkut: String(kendaraanForm.kapasitas_angkut || ""),
        keterangan: kendaraanForm.keterangan || "",
        gudang_id: selectedGudangId,
        gudangId: selectedGudangId,
        warehouseId: selectedGudangId,
        gudangName: selectedGudangName,
      };
      const res = await post(`${apiBase}/api/vehicles`, payload);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = json?.message || "Gagal menambah kendaraan.";
        const validationDetails = json?.errors || json?.details || null;

        if (validationDetails && typeof validationDetails === "object") {
          const fieldErrors = Object.entries(validationDetails)
            .filter(([, messages]) => Array.isArray(messages) && messages.length > 0)
            .map(([field, messages]) => `${field}: ${(messages as unknown[]).join(", ")}`)
            .join("; ");

          if (fieldErrors) {
            throw new Error(`${message} ${fieldErrors}`);
          }
        }

        throw new Error(message);
      }
      setKendaraanModalOpen(false);
      resetKendaraanForm();
      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
      setFormError(errorMessage);
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
                        {wh.nama_gudang} {wh.tipe === "dadakan" ? "(Transit)" : ""}
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
          <div className="w-full">
             <div className="overflow-x-auto overscroll-x-contain">
              <table className="min-w-[640px] w-full text-left border-collapse table-auto text-sm text-slate-700">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
                   <tr>
                     <th className="px-3 py-3">Nama</th>
                     <th className="px-3 py-3">Posisi</th>
                     <th className="px-3 py-3">No. HP</th>
                     <th className="px-3 py-3">Email</th>
                     <th className="px-3 py-3">NIK</th>
                     <th className="px-3 py-3">Gudang</th>
                     <th className="px-3 py-3">Status</th>
                     <th className="px-3 py-3 text-right">Aksi</th>
                   </tr>
                 </thead>
                <tbody>
                  {filteredPersonnels.map((person, index) => {
                    const gname = resolveGudangName(person);
                    const isActive = Boolean(person.is_aktif ?? true);
                    return (
                    <tr key={person.personil_id || index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium text-slate-900">{person.nama || "-"}</td>
                      <td className="px-3 py-3">
                        {person.posisi ? (
                          <span className={badgeClass(positionVariant(person.posisi))}>{person.posisi}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-3">{person.no_hp || "-"}</td>
                      <td className="px-3 py-3 truncate max-w-[180px]">{person.email || "-"}</td>
                      <td className="px-3 py-3 truncate max-w-[150px]">{person.nik || "-"}</td>
                      <td className="px-3 py-3">
                        {gname ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                            <WarehouseIcon size={11} />
                            {gname}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Belum terikat</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                       <td className="px-2 py-2.5 whitespace-nowrap">
                         <div className="flex items-center justify-end gap-1">
                           <button
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleViewPersonil(person);
                             }}
                             title="Detail"
                             className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors cursor-pointer flex items-center justify-center"
                           >
                             <Eye size={16} className="text-slate-600" />
                           </button>
                           <button
                             type="button"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleEditPersonil(person);
                             }}
                             title="Edit"
                             className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors cursor-pointer flex items-center justify-center"
                           >
                             <Pencil size={16} className="text-slate-600" />
                           </button>
                           <button
                             type="button"
                             onClick={() => openToggleModal(person)}
                             disabled={personilStatusLoading === String(person.personil_id)}
                             title={isActive ? "Nonaktifkan Personil" : "Aktifkan Personil"}
                             className={`p-2.5 rounded-2xl border transition-colors cursor-pointer flex items-center justify-center ${
                               isActive
                                 ? "bg-rose-50 hover:bg-rose-100 border-rose-100 text-rose-500"
                                 : "bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-500"
                             }`}
                           >
                             {personilStatusLoading === String(person.personil_id) ? (
                               <Loader2 size={16} className="animate-spin" />
                             ) : isActive ? (
                               <UserX size={16} />
                             ) : (
                               <UserCheck size={16} />
                             )}
                           </button>
                         </div>
                       </td>
                    </tr>
                    );
                  })}
                  {filteredPersonnels.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8">
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
          </div>
        )}

        {/* Tab 2: Kendaraan */}
        {!loading && activeTab === "Kendaraan" && (
          <div className="w-full">
             <div className="overflow-x-auto overscroll-x-contain">
              <table className="min-w-[640px] w-full text-left border-collapse table-auto text-sm text-slate-700">
               <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
                 <tr>
                   <th className="px-3 py-3">No. Polisi</th>
                   <th className="px-3 py-3">Jenis</th>
                   <th className="px-3 py-3">Merk</th>
                   <th className="px-3 py-3">Kapasitas Angkut</th>
                   <th className="px-3 py-3">Keterangan</th>
                   <th className="px-3 py-3">Gudang</th>
                 </tr>
               </thead>
              <tbody>
                {filteredVehicles.map((vehicle, index) => {
                  const gname = resolveGudangName(vehicle);
                  return (
                  <tr key={vehicle.kendaraan_id || index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-slate-900">{vehicle.no_polisi || "-"}</td>
                    <td className="px-3 py-3">
                      {vehicle.jenis_kendaraan ? (
                        <span className={badgeClass(vehicleVariant(vehicle.jenis_kendaraan))}>{vehicle.jenis_kendaraan}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-3">{vehicle.merk || "-"}</td>
                    <td className="px-3 py-3">{vehicle.kapasitas_angkut || "-"}</td>
                    <td className="px-3 py-3 truncate max-w-[180px]">{vehicle.keterangan || "-"}</td>
                    <td className="px-3 py-3">
                      {gname ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          <WarehouseIcon size={11} />
                          {gname}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Belum terikat</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8">
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
          </div>
        )}

        {/* Tab 3: Inventori Perangkat */}
        {!loading && activeTab === "Inventori Perangkat" && (
          <div className="w-full">
             <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full text-left border-collapse table-auto text-sm text-slate-700">
               <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
                 <tr>
                   <th className="px-3 py-3">Kode Perangkat</th>
                   <th className="px-3 py-3">Nama Barang</th>
                   <th className="px-3 py-3">Satuan</th>
                 </tr>
               </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={item.barang_id || index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-slate-900">{item.kode_perangkat || "-"}</td>
                    <td className="px-3 py-3">{item.nama_barang || "-"}</td>
                    <td className="px-3 py-3">
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
                    Punya SIM
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={personilForm.is_material_handler} onChange={(e) => setPersonilForm((p) => ({ ...p, is_material_handler: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-[#E8632C] focus:ring-[#E8632C]" />
                    Material Handler
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Gudang</label>
                  <select
                    value={personilForm.gudang_id}
                    onChange={(e) => setPersonilForm((p) => ({ ...p, gudang_id: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                  >
                    <option value="">Pilih gudang (opsional)</option>
                    {warehouses.map((wh) => (
                      <option key={wh.gudang_id} value={String(wh.gudang_id)}>
                        {wh.nama_gudang} {wh.tipe === "dadakan" ? "(Transit)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
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

      {/* Modal Detail Personil */}
      {isViewModalOpen && selectedPersonil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setIsViewModalOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Detail Personil</h3>
              <button type="button" onClick={() => setIsViewModalOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Nama</p>
                  <p className="font-medium text-slate-900">{selectedPersonil.nama || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Posisi</p>
                  <p className="font-medium text-slate-900">{selectedPersonil.posisi || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">No. HP</p>
                  <p className="font-medium text-slate-900">{selectedPersonil.no_hp || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">{selectedPersonil.email || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">NIK</p>
                  <p className="font-medium text-slate-900">{selectedPersonil.nik || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Gudang</p>
                  <p className="font-medium text-slate-900">{resolveGudangName(selectedPersonil) || "Belum terikat"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="font-medium text-slate-900">{Boolean(selectedPersonil.is_aktif ?? true) ? "Aktif" : "Nonaktif"}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setIsViewModalOpen(false)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Personil */}
      {isEditModalOpen && selectedPersonil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => { setIsEditModalOpen(false); resetPersonilForm(); }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Edit Personil</h3>
                <p className="text-xs text-slate-500">Perbarui data personil operasional.</p>
              </div>
              <button type="button" onClick={() => { setIsEditModalOpen(false); resetPersonilForm(); }} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdatePersonil} className="p-6 space-y-4">
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
                    Punya SIM
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={personilForm.is_material_handler} onChange={(e) => setPersonilForm((p) => ({ ...p, is_material_handler: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-[#E8632C] focus:ring-[#E8632C]" />
                    Material Handler
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Gudang</label>
                  <select
                    value={personilForm.gudang_id}
                    onChange={(e) => setPersonilForm((p) => ({ ...p, gudang_id: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                  >
                    <option value="">Pilih gudang (opsional)</option>
                    {warehouses.map((wh) => (
                      <option key={wh.gudang_id} value={String(wh.gudang_id)}>
                        {wh.nama_gudang} {wh.tipe === "dadakan" ? "(Transit)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <span>{formError}</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setIsEditModalOpen(false); resetPersonilForm(); }} disabled={submitting} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-full bg-[#E8632C] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#D9591F] disabled:opacity-60">
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Simpan Perubahan
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
                  <input type="text" value={kendaraanForm.no_polisi} onChange={(e) => setKendaraanForm((p) => ({ ...p, no_polisi: e.target.value.trim().toUpperCase() }))} placeholder="Nomor polisi" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Kapasitas Angkut</label>
                  <input type="text" value={kendaraanForm.kapasitas_angkut} onChange={(e) => setKendaraanForm((p) => ({ ...p, kapasitas_angkut: e.target.value }))} placeholder="Contoh: 6 atau 2.5" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Keterangan</label>
                  <input type="text" value={kendaraanForm.keterangan} onChange={(e) => setKendaraanForm((p) => ({ ...p, keterangan: e.target.value }))} placeholder="Catatan tambahan" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">Gudang</label>
                  <select
                    value={kendaraanForm.gudang_id}
                    onChange={(e) => setKendaraanForm((p) => ({ ...p, gudang_id: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400"
                  >
                    <option value="">Pilih gudang (opsional)</option>
                    {warehouses.map((wh) => (
                      <option key={wh.gudang_id} value={String(wh.gudang_id)}>
                        {wh.nama_gudang} {wh.tipe === "dadakan" ? "(Transit)" : ""}
                      </option>
                    ))}
                  </select>
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

      {/* Modal Konfirmasi Ubah Status Personil */}
      {isToggleModalOpen && personilToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={closeToggleModal}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {(() => {
                  const currentStatus = Boolean(personilToToggle.is_aktif ?? true);
                  return currentStatus ? "Konfirmasi Nonaktifkan Personil" : "Konfirmasi Aktifkan Personil";
                })()}
              </h3>
              <button type="button" onClick={closeToggleModal} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              {(() => {
                const currentStatus = Boolean(personilToToggle.is_aktif ?? true);
                if (currentStatus) {
                  return (
                    <span>
                      Apakah Anda yakin ingin menonaktifkan{" "}
                      <span className="font-semibold text-slate-800">{personilToToggle.nama}</span>? Personil yang nonaktif dapat dihapus dari Master Data.
                    </span>
                  );
                }
                return (
                  <span>
                    Apakah Anda yakin ingin mengaktifkan kembali{" "}
                    <span className="font-semibold text-slate-800">{personilToToggle.nama}</span>?
                  </span>
                );
              })()}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={closeToggleModal} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  closeToggleModal();
                  if (personilToToggle) {
                    await handleTogglePersonilStatus(personilToToggle);
                  }
                }}
                disabled={personilStatusLoading === String(personilToToggle.personil_id)}
                className="flex items-center gap-2 rounded-full bg-[#E8632C] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#D9591F] disabled:opacity-60"
              >
                {personilStatusLoading === String(personilToToggle.personil_id) && <Loader2 size={14} className="animate-spin" />}
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
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
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
