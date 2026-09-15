"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Warehouse as WarehouseIcon,
  Loader2,
  AlertCircle,
  Boxes,
  X,
  Info,
  Sun,
  Building2,
  ChevronDown,
  ArrowDown,
  Search,
} from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { getStatusBadgeClass, getStatusLabel, formatSisaCapacity, getStatusSourceLabel } from "@/lib/capacity";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type WarehouseRecord = {
  gudang_id: string;
  nama_gudang: string;
  tipe: string;
  alamat?: string;
  is_aktif: boolean;
};

type Zona = {
  zona_id: number;
  gudang_id: number;
  kode_zona: string;
  nama_zona?: string;
  tipe_zona?: string;
  status_kecukupan?: string;
  status_kecukupan_source?: string;
  dinilai_oleh?: string | null;
  dinilai_pada?: string | null;
  total_qty?: number;
  total_item?: number;
  kapasitas_maksimum?: number | null;
  sisa?: number | null;
  kapasitas_belum_diatur?: boolean;
};

export default function WarehouseLayoutPage() {
  const router = useRouter();

  const { get, request } = useApi();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  const [warehouseLayout, setWarehouseLayout] = useState<Zona[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zona | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelStock, setPanelStock] = useState<any[]>([]);
  const [panelSearch, setPanelSearch] = useState("");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelLastRefreshed, setPanelLastRefreshed] = useState<Date | null>(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalZone, setStatusModalZone] = useState<Zona | null>(null);
  const [statusFormValue, setStatusFormValue] = useState<string>("CUKUP");
  const [statusSaving, setStatusSaving] = useState(false);
  const [kapasitasMaksimumInput, setKapasitasMaksimumInput] = useState<string>("");

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    if (!user) return;

    if (mapRole(user.role) !== "admin") {
      router.replace("/");
    }
  }, [router, user]);

  /* =========================================================
     LOAD WAREHOUSES
  ========================================================= */

  useEffect(() => {
    loadWarehouses();
  }, []);

  async function loadWarehouses() {
    setLoading(true);
    setError(null);

    try {
      const res = await get(`${API_BASE}/api/warehouses`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json?.message || "Gagal mengambil daftar gudang."
        );
      }

      const data = Array.isArray(json?.data?.data)
        ? json.data.data
        : Array.isArray(json?.data)
        ? json.data
        : [];

      setWarehouses(data);

      if (data.length > 0) {
        const firstWarehouse = data[0];
        const warehouseId = String(firstWarehouse.gudang_id);

        setSelectedWarehouseId(warehouseId);

        await loadWarehouseLayout(warehouseId);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data gudang."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     LOAD LAYOUT
  ========================================================= */

  async function loadWarehouseLayout(gudangId: string) {
    try {
      const res = await get(
        `${API_BASE}/api/warehouses/${gudangId}/layout`
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json?.message || "Gagal mengambil layout gudang."
        );
      }

      const zonas = Array.isArray(json?.data?.zonas)
        ? json.data.zonas
        : [];

      setWarehouseLayout(zonas);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil layout gudang."
      );

      setWarehouseLayout([]);
    }
  }

  /* =========================================================
     CHANGE WAREHOUSE
  ========================================================= */

  async function handleWarehouseChange(gudangId: string) {
    setSelectedWarehouseId(gudangId);
    setSelectedZone(null);

    await loadWarehouseLayout(gudangId);
  }

  const layoutPollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedWarehouseId) return;

    layoutPollRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadWarehouseLayout(selectedWarehouseId);
      }
    }, 15000);

    return () => {
      if (layoutPollRef.current) {
        clearInterval(layoutPollRef.current);
        layoutPollRef.current = null;
      }
    };
  }, [selectedWarehouseId]);

  const selectedWarehouse = useMemo(() => {
    return warehouses.find(
      (warehouse) =>
        String(warehouse.gudang_id) ===
        String(selectedWarehouseId)
    );
  }, [warehouses, selectedWarehouseId]);

  /* =========================================================
     ZONE TYPE
  ========================================================= */

  function getZoneType(zone: Zona) {
    if (zone.tipe_zona) {
      return zone.tipe_zona;
    }

    const rawName = `${zone.kode_zona || ""} ${zone.nama_zona || ""}`.toLowerCase();

    if (rawName.includes("outdoor") || rawName.includes("luar")) {
      return "Outdoor";
    }

    if (rawName.includes("indoor") || rawName.includes("dalam")) {
      return "Indoor";
    }

    return "Indoor";
  }

  /* =========================================================
     CLEAN ZONE CODE
  ========================================================= */

  function getCleanZoneCode(zone: Zona) {
    return zone.kode_zona || "";
  }

  const canEditStatus = mapRole(user?.role) === "admin" || mapRole(user?.role) === "supervisor";

  /* =========================================================
     ZONE ORDER (kode_zona A-Z)
  ========================================================= */

  const sortedZones = useMemo(() => {
    return [...warehouseLayout].sort((a, b) =>
      a.kode_zona.localeCompare(b.kode_zona)
    );
  }, [warehouseLayout]);

  const zoneA = sortedZones[0] || null;
  const zoneB = sortedZones[1] || null;
  const zoneC = sortedZones[2] || null;
  const zoneD = sortedZones[3] || null;

  const filteredPanelStock = useMemo(() => {
    if (!panelSearch.trim()) return panelStock;

    const q = panelSearch.toLowerCase();

    return panelStock.filter((item) => {
      const kode = (item.kode_perangkat || "").toLowerCase();
      const nama = (item.nama_barang || "").toLowerCase();

      return kode.includes(q) || nama.includes(q);
    });
  }, [panelStock, panelSearch]);

  /* =========================================================
     OPEN ZONE
  ========================================================= */

  async function openZone(zone: Zona | null) {
    if (!zone) return;

    setSelectedZone(zone);
    setPanelOpen(true);
    setPanelSearch("");
    setPanelError(null);

    await fetchZoneStock(zone);
  }

  function closePanel() {
    setPanelOpen(false);
    setPanelStock([]);
    setPanelSearch("");
    setPanelError(null);
    setPanelLastRefreshed(null);
  }

  function openStatusModal(zone: Zona) {
    setStatusModalZone(zone);
    setStatusFormValue(zone.status_kecukupan || "CUKUP");
    setKapasitasMaksimumInput(zone.kapasitas_maksimum != null ? String(zone.kapasitas_maksimum) : "");
    setStatusModalOpen(true);
  }

  function closeStatusModal() {
    setStatusModalOpen(false);
    setStatusModalZone(null);
    setStatusFormValue("CUKUP");
    setKapasitasMaksimumInput("");
  }

  async function saveStatus() {
    if (!statusModalZone || !selectedWarehouseId) return;

    setStatusSaving(true);

    try {
      const body: Record<string, unknown> = {};
      if (statusFormValue) {
        body.status_kecukupan = statusFormValue;
      }
      if (kapasitasMaksimumInput.trim() !== "") {
        body.kapasitas_maksimum = Number(kapasitasMaksimumInput);
      }

      const res = await request(
        `${API_BASE}/api/zones/${statusModalZone.zona_id}/utilization-status`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal menyimpan status utilisasi.");
      }

      await loadWarehouseLayout(selectedWarehouseId);
      closeStatusModal();
    } catch (err) {
      console.error("Error saving zone status:", err);
      alert(err instanceof Error ? err.message : "Gagal menyimpan status utilisasi.");
    } finally {
      setStatusSaving(false);
    }
  }

  async function fetchZoneStock(zone: Zona) {
    if (!selectedWarehouseId || !zone) return;

    setPanelLoading(true);
    setPanelError(null);

    try {
      const res = await get(
        `${API_BASE}/api/warehouses/${selectedWarehouseId}/zona/${zone.zona_id}/stock-snapshot`
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengambil snapshot stok zona.");
      }

      const rows = Array.isArray(json?.data?.data)
        ? json.data.data
        : [];

      setPanelStock(rows);
      setPanelLastRefreshed(new Date());
    } catch (err) {
      setPanelError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil snapshot stok zona."
      );
      setPanelStock([]);
    } finally {
      setPanelLoading(false);
    }
  }

  const zoneStockPollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!panelOpen || !selectedZone) return;

    zoneStockPollRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchZoneStock(selectedZone);
      }
    }, 15000);

    return () => {
      if (zoneStockPollRef.current) {
        clearInterval(zoneStockPollRef.current);
        zoneStockPollRef.current = null;
      }
    };
  }, [panelOpen, selectedZone, fetchZoneStock]);

  /* =========================================================
     ZONE BACKGROUND
  ========================================================= */

  function getZoneBackground(zone: Zona) {
    const zoneType = getZoneType(zone);

    if (zoneType === "Indoor") {
      return "bg-[#FFA86B]";
    }

    return "bg-[#FCEBDD]";
  }

  function getZoneSelectedClass(zone: Zona | null) {
    if (!zone) return "";
    return selectedZone?.zona_id === zone.zona_id
      ? "ring-2 ring-[#111827] ring-offset-2"
      : "";
  }

  /* =========================================================
     RENDER ZONE
  ========================================================= */

  function renderZone(zone: Zona | null, zoneLabel: string) {
    if (!zone) {
      return (
        <div className="flex h-full min-h-[180px] items-center justify-center bg-[#fafafa]">
          <div className="text-center">
            <Boxes
              size={26}
              className="mx-auto mb-2 text-[#b0b7c0]"
            />

            <p className="text-[12px] font-semibold text-[#667085]">
              Belum ada zona
            </p>

            <p className="mt-1 text-[10px] text-[#98a2b3]">
              Tambahkan zona terlebih dahulu
            </p>
          </div>
        </div>
      );
    }

    const zoneType = getZoneType(zone);
    const isIndoor = zoneType === "Indoor";
    const isSelected = selectedZone?.zona_id === zone.zona_id;

     return (
       <div
         role="button"
         tabIndex={0}
         onClick={() => openZone(zone)}
         onKeyDown={(e) => {
           if (e.key === "Enter" || e.key === " ") {
             e.preventDefault();
             openZone(zone);
           }
         }}
         className={`group relative flex min-h-[180px] w-full flex-col items-center justify-center overflow-hidden p-4 text-center transition-all duration-200 hover:brightness-[0.97] cursor-pointer ${getZoneBackground(zone)} ${getZoneSelectedClass(zone)}`}
       >
        {/* SELECTED INDICATOR */}
        {isSelected && (
          <div className="absolute left-3 top-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111827] text-white">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )}

        {/* ICON */}
        <div className="absolute right-4 top-4 opacity-60">
          {isIndoor ? (
            <Building2
              size={22}
              strokeWidth={1.7}
              className="text-[#4b3424]"
            />
          ) : (
            <Sun
              size={23}
              strokeWidth={1.7}
              className="text-[#6b5647]"
            />
          )}
        </div>

        {/* ZONE NAME */}
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-[23px] font-extrabold uppercase leading-tight tracking-[-0.5px] text-[#171717] md:text-[25px]">
              {getCleanZoneCode(zone)}
            </h3>

            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isIndoor ? "bg-[#FFA86B]/20 text-[#8B4513]" : "bg-[#FCEBDD] text-[#6b5647]"}`}>
              {isIndoor ? "Indoor" : "Outdoor"}
            </span>
          </div>

          {(zone.total_item ?? 0) > 0 || (zone.total_qty ?? 0) > 0 && (
            <div className="mt-2">
              <p className="text-[12px] font-semibold text-[#344054]">
                {(zone.total_item ?? 0)} barang • {Number(zone.total_qty ?? 0).toLocaleString("id-ID")} unit
              </p>
            </div>
          )}

          {zone.status_kecukupan ? (
            <div className="mt-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getStatusBadgeClass(zone.status_kecukupan)}`}>
                  {getStatusLabel(zone.status_kecukupan)}
                </span>
                {zone.kapasitas_belum_diatur && (
                  <span className="inline-block rounded-full border border-[#e5e7eb] bg-[#f2f4f7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#475467]">
                    Kapasitas belum diatur
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10px] text-[#667085]">
                {getStatusSourceLabel(zone)}
              </p>
              {(() => {
                const sisaText = formatSisaCapacity(zone.sisa ?? null, zone.kapasitas_maksimum ?? null);
                if (!sisaText) return null;
                return (
                  <p className="mt-1 text-[10px] font-semibold text-[#344054]">
                    Sisa: {sisaText}
                  </p>
                );
              })()}
            </div>
          ) : (
            <p className="mt-2 text-[10px] text-[#98a2b3]">Belum dinilai</p>
          )}

          {canEditStatus && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openStatusModal(zone);
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#111827]/10 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#111827] shadow-sm transition hover:border-[#111827]/30 hover:bg-[#f7f8fa]"
            >
              <span>Input Status</span>
            </button>
          )}
        </div>

        {/* HOVER INDICATOR */}
        <div className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/60 opacity-0 transition-opacity group-hover:opacity-100">
          <ArrowDown
            size={12}
            className="rotate-[-45deg] text-[#333]"
          />
        </div>
      </div>
    );
  }

  function ZoneDetailModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
        <div className="w-full max-w-[640px] max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    );
  }

  function StatusInputModal({ open, onClose, zone, value, onChange, onSave, saving, kapasitasMaksimum, onKapasitasChange }: { open: boolean; onClose: () => void; zone: Zona | null; value: string; onChange: (v: string) => void; onSave: () => void; saving: boolean; kapasitasMaksimum: string; onKapasitasChange: (v: string) => void }) {
    useEffect(() => {
      if (!open) return;
      function handleKey(e: KeyboardEvent) {
        if (e.key === "Escape") onClose();
      }
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }, [open, onClose]);

    if (!open || !zone) return null;

    const options = [
      { value: "CUKUP", label: "Cukup", color: "bg-green-500" },
      { value: "MENDEKATI_PENUH", label: "Mendekati Penuh", color: "bg-orange-500" },
      { value: "TIDAK_CUKUP", label: "Tidak Cukup", color: "bg-red-500" },
    ];

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
        <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-[#edf0f2] px-6 py-4">
            <h3 className="text-[17px] font-bold text-[#111827]">
              Input Status Zona {getCleanZoneCode(zone)}
            </h3>
            <p className="mt-1 text-[12px] text-[#6b7280]">
              Pilih status kecukupan untuk zona ini.
            </p>
          </div>

          <div className="px-6 py-5">
            <div className="mb-4">
              <label className="mb-1 block text-[12px] font-semibold text-[#344054]">
                Kapasitas Maksimum (unit)
              </label>
              <input
                type="number"
                min={1}
                placeholder="Contoh: 1000"
                value={kapasitasMaksimum}
                onChange={(e) => onKapasitasChange(e.target.value)}
                className="h-[38px] w-full rounded-xl border border-[#d0d5dd] bg-white px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#111827]"
              />
              <p className="mt-1 text-[10px] text-[#9ca3af]">
                Kosongkan jika tidak diubah. Hanya angka bulat lebih dari 0.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {options.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${value === opt.value ? "border-[#111827] bg-[#f7f8fa]" : "border-[#e5e7eb] hover:border-[#d0d5dd]"}`}
                >
                  <input
                    type="radio"
                    name="status_kecukupan"
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-4 w-4 accent-[#111827]"
                  />
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${opt.color}`} />
                  <span className="text-[13px] font-semibold text-[#111827]">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#edf0f2] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-[#d0d5dd] px-4 py-2 text-[13px] font-semibold text-[#344054] transition hover:bg-[#f7f8fa] disabled:opacity-60"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-white">
        <Loader2
          size={28}
          className="animate-spin text-[#1f2937]"
        />
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="min-h-full bg-[#f7f8fa]">
      <div className="overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="border-b border-[#edf0f2] px-6 py-6 md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h1 className="text-[26px] font-bold tracking-[-0.5px] text-[#111827] md:text-[28px]">
                Utilisasi Gudang
              </h1>

              <p className="mt-1 text-[14px] text-[#6b7280]">
                Visualisasi utilisasi zona per gudang
              </p>
            </div>

            {/* WAREHOUSE SELECT */}

            <div className="relative w-full lg:w-[300px]">
              <WarehouseIcon
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-[#667085]"
              />

              <select
                value={selectedWarehouseId}
                onChange={(e) =>
                  handleWarehouseChange(e.target.value)
                }
                className="h-[50px] w-full appearance-none rounded-[10px] border border-[#dfe3e8] bg-white pl-11 pr-10 text-[14px] font-semibold text-[#111827] outline-none transition hover:border-[#b9bec5] focus:border-[#111827]"
              >
                {warehouses.map((warehouse) => (
                  <option
                    key={warehouse.gudang_id}
                    value={warehouse.gudang_id}
                  >
                    {warehouse.nama_gudang}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#667085]"
              />
            </div>
          </div>
        </div>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="px-6 py-6 md:px-8">

          {/* ERROR */}

          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-[10px] border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-[13px] text-[#374151]">
              <AlertCircle
                size={17}
                className="shrink-0 text-[#4b5563]"
              />

              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-auto rounded-md p-1 text-[#9ca3af] hover:bg-[#f0f0f0] hover:text-[#111827]"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* INFO */}

          <div className="mb-6 flex items-center gap-3 rounded-[10px] border border-[#cddff7] bg-[#f3f8ff] px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4385d6] text-white">
              <Info size={15} />
            </div>

            <p className="text-[13px] leading-5 text-[#344a67]">
              Pilih zona pada denah untuk melihat informasi
              utilisasi area. Data ini diinput manual oleh
              Supervisor saat opname.
            </p>
          </div>

          {/* =================================================
              SECTION HEADER
          ================================================= */}

          <div className="mb-4">
            <div>
              <h2 className="text-[19px] font-bold tracking-[-0.2px] text-[#111827]">
                Denah Gudang
              </h2>

              <p className="mt-1 text-[13px] text-[#6b7280]">
                {selectedWarehouse?.nama_gudang || "Gudang"}
              </p>
            </div>
          </div>

          {/* =================================================
              WAREHOUSE FLOOR PLAN
          ================================================= */}

          <div className="flex justify-center">
            <div className="w-full max-w-[900px]">

              <div className="overflow-hidden rounded-[10px] border border-[#dfe3e8] bg-[#e8fbe8]">

                <div className="grid min-h-[360px] grid-cols-[1fr_90px_1fr] grid-rows-[1fr_1fr] md:min-h-[400px]">

                  {/* =========================
                      ZONA A
                  ========================= */}

                  <div className="border-b border-r border-white">
                    {renderZone(zoneA, "Zona A")}
                  </div>

                  {/* =========================
                      LORONG ATAS
                  ========================= */}

                  <div className="relative flex items-center justify-center bg-[#e8fbe8]">

                    <div className="absolute inset-y-0 left-0 w-px bg-[#d6efd6]" />

                    <div className="absolute inset-y-0 right-0 w-px bg-[#d6efd6]" />

                    <span className="rotate-[-90deg] text-[17px] font-extrabold tracking-[-0.2px] text-[#111827]">
                      Lorong
                    </span>
                  </div>

                  {/* =========================
                      ZONA B
                  ========================= */}

                  <div className="border-b border-l border-white">
                    {renderZone(zoneB, "Zona B")}
                  </div>

                  {/* =========================
                      ZONA C
                  ========================= */}

                  <div className="border-r border-white">
                    {renderZone(zoneC, "Zona C")}
                  </div>

                  {/* =========================
                      LORONG BAWAH
                  ========================= */}

                  <div className="relative flex items-center justify-center bg-[#e8fbe8]">

                    <div className="absolute inset-y-0 left-0 w-px bg-[#d6efd6]" />

                    <div className="absolute inset-y-0 right-0 w-px bg-[#d6efd6]" />

                    <span className="rotate-[-90deg] text-[17px] font-extrabold tracking-[-0.2px] text-[#111827]">
                      Lorong
                    </span>
                  </div>

                  {/* =========================
                      ZONA D
                  ========================= */}

                  <div className="border-l border-white">
                    {renderZone(zoneD, "Zona D")}
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* =================================================
              LEGEND
          ================================================= */}

          <div className="mx-auto mt-4 flex w-full max-w-[900px] flex-wrap items-center gap-5 rounded-[12px] border border-[#e8eaed] bg-[#fafbfc] px-5 py-3.5">

            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-[3px] border border-[#ef9658] bg-[#FFA86B]" />

              <span className="text-[12px] font-medium text-[#475467]">
                Indoor
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-[3px] border border-[#f2d8c4] bg-[#FCEBDD]" />

              <span className="text-[12px] font-medium text-[#475467]">
                Outdoor
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-[3px] border border-[#d6efd6] bg-[#e8fbe8]" />

              <span className="text-[12px] font-medium text-[#475467]">
                Lorong
              </span>
            </div>

            <div className="ml-auto flex items-center gap-4">
              {selectedZone && (
                <div className="flex items-center gap-2 rounded-lg bg-[#f2f4f7] px-3 py-1.5">
                  <span className="text-[11px] font-semibold text-[#344054]">
                    Terpilih:
                  </span>
                  <span className="text-[12px] font-bold text-[#111827]">
                    {getCleanZoneCode(selectedZone)}
                  </span>
                  <span className="text-[11px] text-[#667085]">
                    ({getZoneType(selectedZone)})
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <WarehouseIcon
                  size={17}
                  className="text-[#667085]"
                />

                <span className="text-[12px] text-[#6b7280]">
                  {warehouseLayout.length} Zona
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* =====================================================
          MODAL: DETAIL STOK ZONA
      ===================================================== */}

      <ZoneDetailModal open={panelOpen} onClose={closePanel}>
        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-[#edf0f2] px-6 py-4">
          <div>
            <h3 className="text-[17px] font-bold text-[#111827]">
              Detail Zona {selectedZone && getCleanZoneCode(selectedZone)}
            </h3>

            {selectedZone && (
              <p className="mt-1 text-[12px] text-[#6b7280]">
                {selectedWarehouse?.nama_gudang} — {getZoneType(selectedZone)}
                {(selectedZone.total_item ?? 0) > 0 && (
                  <span> • {(selectedZone.total_item ?? 0)} barang • {Number(selectedZone.total_qty ?? 0).toLocaleString("id-ID")} unit</span>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!selectedWarehouseId || !selectedZone) return;
                const target = `/dashboard/reports?tab=stok&warehouseId=${encodeURIComponent(selectedWarehouseId)}`;
                window.location.href = target;
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#111827]/10 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#111827] shadow-sm transition hover:border-[#111827]/30 hover:bg-[#f7f8fa]"
            >
              Lihat Riwayat Stok
            </button>

            <button
              type="button"
              onClick={closePanel}
              className="rounded-lg p-2 text-[#98a2b3] hover:bg-[#f2f4f7] hover:text-[#111827]"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* SEARCH */}

        <div className="border-b border-[#edf0f2] px-6 py-3">
          <div className="flex items-center gap-2 rounded-[9px] border border-[#d0d5dd] bg-white px-3">
            <Search
              size={16}
              className="shrink-0 text-[#98a2b3]"
            />

            <input
              value={panelSearch}
              onChange={(e) => setPanelSearch(e.target.value)}
              placeholder="Cari kode perangkat / nama barang…"
              className="h-[38px] w-full bg-transparent text-[13px] text-[#111827] outline-none placeholder:text-[#98a2b3]"
            />
          </div>
        </div>

        {/* CONTENT */}

        <div className="px-6 py-4">
          {panelError && (
            <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[13px] text-[#b42318]">
              <AlertCircle size={16} className="shrink-0" />
              <span>{panelError}</span>
            </div>
          )}

          {panelLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2
                size={28}
                className="animate-spin text-[#667085]"
              />

              <p className="mt-3 text-[13px] text-[#6b7280]">
                Memuat data stok…
              </p>
            </div>
          ) : filteredPanelStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Boxes
                size={32}
                className="text-[#b0b7c0]"
              />

              <p className="mt-3 text-[13px] font-semibold text-[#667085]">
                {panelSearch ? "Tidak ada hasil pencarian" : "Belum ada barang di zona ini"}
              </p>

              <p className="mt-1 text-[12px] text-[#98a2b3]">
                {panelSearch ? "Coba kata kunci lain" : "Zona ini belum memiliki stok barang"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Nama Barang</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Kategori</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085] text-right">Qty</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Satuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f7]">
                  {filteredPanelStock.map((item) => (
                    <tr key={item.stok_id} className="transition hover:bg-[#fafbfc]">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-[#111827]">{item.nama_barang}</p>
                        <p className="text-[11px] text-[#98a2b3]">{item.kode_perangkat}</p>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#6b7280]">{item.kategori}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-semibold text-[#111827]">{Number(item.qty).toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3 text-[13px] text-[#6b7280]">{item.satuan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ZoneDetailModal>

      <StatusInputModal
        open={statusModalOpen}
        onClose={closeStatusModal}
        zone={statusModalZone}
        value={statusFormValue}
        onChange={setStatusFormValue}
        onSave={saveStatus}
        saving={statusSaving}
        kapasitasMaksimum={kapasitasMaksimumInput}
        onKapasitasChange={setKapasitasMaksimumInput}
      />
    </div>
  );
}