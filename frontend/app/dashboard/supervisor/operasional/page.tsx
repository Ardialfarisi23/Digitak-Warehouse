"use client";

import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api";

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
};

type Vehicle = {
  kendaraan_id: number;
  jenis_kendaraan: string;
  merk?: string;
  no_polisi: string;
  kapasitas_angkut?: string;
  keterangan?: string;
};

type Item = {
  barang_id: number;
  kode_perangkat?: string;
  nama_barang?: string;
  satuan_default?: {
    kode_satuan?: string;
  };
};

export default function SupervisorOperasionalPage() {
  const { get } = useApi();
  const [activeTab, setActiveTab] = useState<TabKey>("Personil");
  const [personnels, setPersonnels] = useState<Personnel[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

  const normalizeList = (payload: any) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
  };

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [personnelRes, vehicleRes, itemsRes] = await Promise.allSettled([
          get(`${apiBase}/api/personnels`),
          get(`${apiBase}/api/vehicles`),
          get(`${apiBase}/api/items`),
        ]);

        if (!mounted) return;

        // Process Personnels
        if (personnelRes.status === "fulfilled" && personnelRes.value?.ok) {
          const json = await personnelRes.value.json().catch(() => null);
          setPersonnels(normalizeList(json));
        } else {
          console.warn("Gagal memuat data personil");
          setPersonnels([]);
        }

        // Process Vehicles
        if (vehicleRes.status === "fulfilled" && vehicleRes.value?.ok) {
          const json = await vehicleRes.value.json().catch(() => null);
          setVehicles(normalizeList(json));
        } else {
          console.warn("Gagal memuat data kendaraan");
          setVehicles([]);
        }

        // Process Items
        if (itemsRes.status === "fulfilled" && itemsRes.value?.ok) {
          const json = await itemsRes.value.json().catch(() => null);
          setItems(normalizeList(json));
        } else {
          console.warn("Gagal memuat data inventori");
          setItems([]);
        }
      } catch (err) {
        console.error("Error loading operasional data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [get, apiBase]);

  const summary = useMemo(() => {
    return {
      personilCount: personnels.length,
      vehicleCount: vehicles.length,
      itemCount: items.length,
    };
  }, [personnels.length, vehicles.length, items.length]);

  return (
    <div className="min-h-screen px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">
            Operasional & Tim
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Personil, Kendaraan, dan Inventori Perangkat
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Lihat informasi personil, kendaraan operasional, serta inventori perangkat (mode read-only).
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Personil</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.personilCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Kendaraan</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.vehicleCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Inventori Perangkat</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.itemCount}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Navigation Tabs */}
        <div className="mb-6 flex items-center gap-3 overflow-x-auto pb-2">
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

        {/* Loading State */}
        {loading && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            Memuat data...
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
                {personnels.map((person, index) => (
                  <tr key={person.personil_id || index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{person.nama || "-"}</td>
                    <td className="px-4 py-4">{person.posisi || "-"}</td>
                    <td className="px-4 py-4">{person.no_hp || "-"}</td>
                    <td className="px-4 py-4">{person.email || "-"}</td>
                    <td className="px-4 py-4">{person.nik || "-"}</td>
                  </tr>
                ))}
                {personnels.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Belum ada data personil.
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
                {vehicles.map((vehicle, index) => (
                  <tr key={vehicle.kendaraan_id || index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{vehicle.no_polisi || "-"}</td>
                    <td className="px-4 py-4">{vehicle.jenis_kendaraan || "-"}</td>
                    <td className="px-4 py-4">{vehicle.merk || "-"}</td>
                    <td className="px-4 py-4">{vehicle.kapasitas_angkut || "-"}</td>
                    <td className="px-4 py-4">{vehicle.keterangan || "-"}</td>
                  </tr>
                ))}
                {vehicles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Belum ada data kendaraan.
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
                {items.map((item, index) => (
                  <tr key={item.barang_id || index} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{item.kode_perangkat || "-"}</td>
                    <td className="px-4 py-4">{item.nama_barang || "-"}</td>
                    <td className="px-4 py-4">{item.satuan_default?.kode_satuan || "-"}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      Belum ada data inventori.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}