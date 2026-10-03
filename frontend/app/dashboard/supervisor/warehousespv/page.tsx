"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Warehouse as WarehouseIcon, Loader2, AlertCircle, Boxes, X, Info, Sun, Building2, ChevronDown, ArrowDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { getStatusBadgeClass, getStatusLabel, formatSisaCapacity, getStatusSourceLabel } from "@/lib/capacity";
import { ConfirmModal } from "@/components/ConfirmModal";
import { KondisiBadge } from "@/components/common/KondisiBadge";
import { useAccountStatusGuard } from "@/hooks/use-account-status-guard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Daftar gudang yang muncul di dropdown diambil dari response API
// GET /api/dashboard (kapasitas_per_gudang[]). Supervisor dan admin
// menerima daftar lengkap semua gudang.

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

export default function SpvWarehouseLayoutPage() {
  const router = useRouter();

  const { get, request } = useApi();
  const { user } = useAuth();

  const { showDeactivatedModal, handleReturnToLogin } = useAccountStatusGuard();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  const [warehouseLayout, setWarehouseLayout] = useState<Zona[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zona | null>(null);

  // State Modal Detail Stok
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelStock, setPanelStock] = useState<any[]>([]);
  const [panelSearch, setPanelSearch] = useState("");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelPage, setPanelPage] = useState(1);
  const [panelLimit] = useState(20);
  const [panelTotal, setPanelTotal] = useState(0);
  const [panelTotalPages, setPanelTotalPages] = useState(1);

  // State Modal Input Status
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalZone, setStatusModalZone] = useState<Zona | null>(null);
  const [statusFormValue, setStatusFormValue] = useState<string>("CUKUP");
  const [statusSaving, setStatusSaving] = useState(false);
  const [kapasitasMaksimumInput, setKapasitasMaksimumInput] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  /* =========================================================
     AUTH CHECK (Supervisor & Admin)
  ========================================================= */

  useEffect(() => {
    if (!user) return;

    const userRole = mapRole(user.role);

    if (userRole !== "supervisor" && userRole !== "admin") {
      setToast({ message: "Anda tidak memiliki akses ke halaman ini.", type: "error" });

      setTimeout(() => {
        if (userRole === "staff") {
          router.replace("/staff/dashboard");
        } else {
          router.replace("/dashboard");
        }
      }, 800);
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
      // Endpoint GET /api/dashboard mengembalikan kapasitas_per_gudang[]
      // yang berisi SEMUA gudang untuk supervisor maupun admin.
      const res = await get(`${API_BASE}/api/dashboard`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengambil daftar gudang.");
      }

      const rawList = Array.isArray(json?.data?.kapasitas_per_gudang)
        ? json.data.kapasitas_per_gudang
        : [];

      // Map ke tipe WarehouseRecord yang dipakai komponen ini.
      // is_aktif tidak tersedia di getStats (tidak relevan untuk layout), default true.
      const data: WarehouseRecord[] = rawList.map((g: {
        gudang_id: string;
        nama_gudang: string;
        tipe: string;
      }) => ({
        gudang_id: String(g.gudang_id),
        nama_gudang: g.nama_gudang,
        tipe: g.tipe,
        is_aktif: true,
      }));

      setWarehouses(data);

      if (data.length > 0) {
        const firstWarehouse = data[0];
        const warehouseId = String(firstWarehouse.gudang_id);

        setSelectedWarehouseId(warehouseId);
        await loadWarehouseLayout(warehouseId);
      } else {
        // Supervisor tidak punya personil.gudang_id yang ter-assign.
        // Tampilkan pesan informatif, bukan crash.
        setSelectedWarehouseId("");
        setWarehouseLayout([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data gudang.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     LOAD LAYOUT
  ========================================================= */

  async function loadWarehouseLayout(gudangId: string) {
    try {
      const res = await get(`${API_BASE}/api/warehouses/${gudangId}/layout`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengambil layout gudang.");
      }

      const zonas = Array.isArray(json?.data?.zonas) ? json.data.zonas : [];
      setWarehouseLayout(zonas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil layout gudang.");
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
    return warehouses.find((warehouse) => String(warehouse.gudang_id) === String(selectedWarehouseId));
  }, [warehouses, selectedWarehouseId]);

  /* =========================================================
     HELPERS & UTILS
  ========================================================= */

  function getZoneType(zone: Zona) {
    if (zone.tipe_zona) return zone.tipe_zona;

    const rawName = `${zone.kode_zona || ""} ${zone.nama_zona || ""}`.toLowerCase();

    if (rawName.includes("outdoor") || rawName.includes("luar")) return "Outdoor";
    if (rawName.includes("indoor") || rawName.includes("dalam")) return "Indoor";

    return "Indoor";
  }

  function getCleanZoneCode(zone: Zona) {
    return zone.kode_zona || "";
  }

  const canEditStatus = mapRole(user?.role) === "admin" || mapRole(user?.role) === "supervisor";

  const sortedZones = useMemo(() => {
    return [...warehouseLayout].sort((a, b) => a.kode_zona.localeCompare(b.kode_zona));
  }, [warehouseLayout]);

  const zoneA = sortedZones[0] || null;
  const zoneB = sortedZones[1] || null;
  const zoneC = sortedZones[2] || null;
  const zoneD = sortedZones[3] || null;

  /* =========================================================
     ACTIONS & MODAL HANDLERS
  ========================================================= */

  async function openZone(zone: Zona | null) {
    if (!zone) return;

    setSelectedZone(zone);
    setPanelOpen(true);
    setPanelSearch("");
    setPanelPage(1);
    setPanelError(null);
  }

  function closePanel() {
    setPanelOpen(false);
    setPanelStock([]);
    setPanelSearch("");
    setPanelPage(1);
    setPanelTotal(0);
    setPanelTotalPages(1);
    setPanelError(null);
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

      const res = await request(`${API_BASE}/api/zones/${statusModalZone.zona_id}/utilization-status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

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

  async function fetchZoneStock(zone: Zona, page = 1) {
    if (!selectedWarehouseId || !zone) return;

    setPanelLoading(true);
    setPanelError(null);
    setPanelPage(page);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(panelLimit),
      });

      if (panelSearch.trim()) {
        params.set("search", panelSearch.trim());
      }

      const res = await get(`${API_BASE}/api/warehouses/${selectedWarehouseId}/zona/${zone.zona_id}/stock-snapshot?${params.toString()}`);

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal mengambil snapshot stok zona.");
      }

      const rows = Array.isArray(json?.data?.data) ? json.data.data : Array.isArray(json?.data) ? json.data : [];
      const meta = json?.data?.meta || json?.meta || {};

      setPanelStock(rows);
      setPanelTotal(Number(meta.total || rows.length || 0));
      setPanelTotalPages(Number(meta.totalPages || 1));
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Gagal mengambil snapshot stok zona.");
      setPanelStock([]);
      setPanelTotal(0);
      setPanelTotalPages(1);
    } finally {
      setPanelLoading(false);
    }
  }

  useEffect(() => {
    if (!panelOpen || !selectedZone) return;
    fetchZoneStock(selectedZone, panelPage);
  }, [panelSearch, panelPage, panelOpen, selectedZone]);

  function getZoneBackground(zone: Zona) {
    const zoneType = getZoneType(zone);
    return zoneType === "Indoor" ? "bg-[#FFA86B]" : "bg-[#FCEBDD]";
  }

  function getZoneSelectedClass(zone: Zona | null) {
    if (!zone) return "";
    return selectedZone?.zona_id === zone.zona_id ? "ring-2 ring-[#111827] ring-offset-2" : "";
  }

  /* =========================================================
     RENDER ZONE GRID
  ========================================================= */

  function renderZone(zone: Zona | null, zoneLabel: string) {
    if (!zone) {
      return (
        <div className="flex h-full min-h-[180px] items-center justify-center bg-[#fafafa]">
          <div className="text-center">
            <Boxes size={26} className="mx-auto mb-2 text-[#b0b7c0]" />
            <p className="text-[12px] font-semibold text-[#667085]">Belum ada zona</p>
            <p className="mt-1 text-[10px] text-[#98a2b3]">Tambahkan zona terlebih dahulu</p>
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
          className={`group relative flex min-h-[180px] h-full w-full flex-col overflow-hidden p-4 text-center transition-all duration-200 hover:brightness-[0.97] cursor-pointer ${getZoneBackground(zone)} ${getZoneSelectedClass(zone)}`}
        >
        {isSelected && (
          <div className="absolute left-3 top-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111827] text-white">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}

        <div className="absolute right-4 top-4 opacity-60">{isIndoor ? <Building2 size={22} strokeWidth={1.7} className="text-[#4b3424]" /> : <Sun size={23} strokeWidth={1.7} className="text-[#6b5647]" />}</div>

         <div className="relative z-10 flex flex-grow flex-col items-center justify-center">
           <div className="flex items-center justify-center gap-2">
             <h3 className="text-[23px] font-extrabold uppercase leading-tight tracking-[-0.5px] text-[#171717] md:text-[25px]">{getCleanZoneCode(zone)}</h3>
             <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isIndoor ? "bg-[#FFA86B]/20 text-[#8B4513]" : "bg-[#FCEBDD] text-[#6b5647]"}`}>{isIndoor ? "Indoor" : "Outdoor"}</span>
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
         </div>

         {/* ACTIONS */}
         <div className="relative z-10 mt-auto flex w-full flex-wrap items-center justify-center gap-1.5">
           {canEditStatus && (
             <button
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 openStatusModal(zone);
               }}
               className="inline-flex items-center gap-1 rounded-lg border border-[#111827]/10 bg-white px-2.5 py-1 text-[10px] font-semibold text-[#111827] shadow-sm transition hover:border-[#111827]/30 hover:bg-[#f7f8fa]"
             >
               <span>Input Status</span>
             </button>
           )}
         </div>

        <div className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-white/60 opacity-0 transition-opacity group-hover:opacity-100">
          <ArrowDown size={12} className="rotate-[-45deg] text-[#333]" />
        </div>
      </div>
    );
  }

  /* =========================================================
     RENDER FLOOR PLAN
  ========================================================= */

  function renderFloorPlan() {
    const zones = sortedZones;
    const count = zones.length;

    if (count === 0) {
      return (
        <div className="flex min-h-[360px] items-center justify-center bg-[#fafafa]">
          <div className="text-center">
            <Boxes size={32} className="mx-auto mb-3 text-[#b0b7c0]" />
            <p className="text-[13px] font-semibold text-[#667085]">Belum ada zona</p>
            <p className="mt-1 text-[12px] text-[#98a2b3]">Tambahkan zona terlebih dahulu</p>
          </div>
        </div>
      );
    }

    if (count === 1) {
      return (
        <div className="flex min-h-[360px] items-center justify-center p-6">
          <div className="w-full max-w-[420px]">{renderZone(zones[0], zones[0].kode_zona)}</div>
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="grid min-h-[360px] grid-cols-2 gap-4">
          {zones.map((zone) => (
            <div key={zone.zona_id} className="h-full">{renderZone(zone, zone.kode_zona)}</div>
          ))}
        </div>
      );
    }

    if (count === 3) {
      return (
        <div className="grid min-h-[360px] grid-cols-2 gap-4">
          <div className="h-full">{renderZone(zones[0], zones[0].kode_zona)}</div>
          <div className="h-full">{renderZone(zones[1], zones[1].kode_zona)}</div>
          <div className="col-span-2 h-full">{renderZone(zones[2], zones[2].kode_zona)}</div>
        </div>
      );
    }

    if (count === 4) {
      return (
        <div className="grid min-h-[360px] grid-cols-[1fr_90px_1fr] grid-rows-[1fr_1fr]">
          <div className="h-full border-b border-r border-white">{renderZone(zones[0], "Zona A")}</div>
          <div className="relative flex items-center justify-center bg-[#e8fbe8]">
            <div className="absolute inset-y-0 left-0 w-px bg-[#d6efd6]" />
            <div className="absolute inset-y-0 right-0 w-px bg-[#d6efd6]" />
            <span className="rotate-[-90deg] text-[17px] font-extrabold tracking-[-0.2px] text-[#111827]">Lorong</span>
          </div>
          <div className="h-full border-b border-l border-white">{renderZone(zones[1], "Zona B")}</div>
          <div className="h-full border-r border-white">{renderZone(zones[2], "Zona C")}</div>
          <div className="relative flex items-center justify-center bg-[#e8fbe8]">
            <div className="absolute inset-y-0 left-0 w-px bg-[#d6efd6]" />
            <div className="absolute inset-y-0 right-0 w-px bg-[#d6efd6]" />
            <span className="rotate-[-90deg] text-[17px] font-extrabold tracking-[-0.2px] text-[#111827]">Lorong</span>
          </div>
          <div className="h-full border-l border-white">{renderZone(zones[3], "Zona D")}</div>
        </div>
      );
    }

    return (
      <div className="grid min-h-[360px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map((zone) => (
          <div key={zone.zona_id} className="h-full">{renderZone(zone, zone.kode_zona)}</div>
        ))}
      </div>
    );
  }

  /* =========================================================
     LOADING STATE
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-white">
        <Loader2 size={28} className="animate-spin text-[#1f2937]" />
      </div>
    );
  }


  /* =========================================================
     MAIN VIEW
  ========================================================= */

  return (
    <div className="min-h-full bg-[#f7f8fa] px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        {/* HEADER */}
        <div className="border-b border-[#edf0f2] px-6 py-6 md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[26px] font-bold tracking-[-0.5px] text-[#111827] md:text-[28px]">Utilisasi Gudang</h1>
              <p className="mt-1 text-[14px] text-[#6b7280]">Visualisasi utilisasi zona per gudang (Area Supervisor)</p>
            </div>

            <div className="relative w-full lg:w-[300px]">
              <WarehouseIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-[#667085]" />
              <select
                value={selectedWarehouseId}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                className="h-[50px] w-full appearance-none rounded-[10px] border border-[#dfe3e8] bg-white pl-11 pr-10 text-[14px] font-semibold text-[#111827] outline-none transition hover:border-[#b9bec5] focus:border-[#111827]"
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.gudang_id} value={warehouse.gudang_id}>
                    {warehouse.nama_gudang} {warehouse.tipe === "dadakan" ? "(Dadakan)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#667085]" />
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-6 py-6 md:px-8">
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-[10px] border border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-[13px] text-[#374151]">
              <AlertCircle size={17} className="shrink-0 text-[#4b5563]" />
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="ml-auto rounded-md p-1 text-[#9ca3af] hover:bg-[#f0f0f0] hover:text-[#111827]">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="mb-6 flex items-center gap-3 rounded-[10px] border border-[#cddff7] bg-[#f3f8ff] px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4385d6] text-white">
              <Info size={15} />
            </div>
            <p className="text-[13px] leading-5 text-[#344a67]">Pilih zona pada denah untuk melihat informasi utilisasi area. Data ini diinput manual oleh Supervisor saat opname.</p>
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h2 className="text-[19px] font-bold tracking-[-0.2px] text-[#111827]">Denah Gudang</h2>
                <p className="mt-1 text-[13px] text-[#6b7280]">{selectedWarehouse?.nama_gudang || "Gudang"}</p>
              </div>

              {selectedWarehouse?.tipe === "dadakan" && (
                <span className="inline-flex items-center rounded-full border border-[#d6efd6] bg-[#e8fbe8] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#14532d]">
                  Dadakan
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-[900px]">
              <div className="overflow-hidden rounded-[10px] border border-[#dfe3e8] bg-[#e8fbe8]">
                {renderFloorPlan()}
              </div>
            </div>
          </div>

          {/* LEGEND */}
          <div className="mx-auto mt-4 flex w-full max-w-[900px] flex-wrap items-center gap-5 rounded-[12px] border border-[#e8eaed] bg-[#fafbfc] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-[3px] border border-[#ef9658] bg-[#FFA86B]" />
              <span className="text-[12px] font-medium text-[#475467]">Indoor</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-[3px] border border-[#f2d8c4] bg-[#FCEBDD]" />
              <span className="text-[12px] font-medium text-[#475467]">Outdoor</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-[3px] border border-[#d6efd6] bg-[#e8fbe8]" />
              <span className="text-[12px] font-medium text-[#475467]">Lorong</span>
            </div>
            <div className="ml-auto flex items-center gap-4">
              {selectedZone && (
                <div className="flex items-center gap-2 rounded-lg bg-[#f2f4f7] px-3 py-1.5">
                  <span className="text-[11px] font-semibold text-[#344054]">Terpilih:</span>
                  <span className="text-[12px] font-bold text-[#111827]">{getCleanZoneCode(selectedZone)}</span>
                  <span className="text-[11px] text-[#667085]">({getZoneType(selectedZone)})</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <WarehouseIcon size={17} className="text-[#667085]" />
                <span className="text-[12px] text-[#6b7280]">{warehouseLayout.length} Zona</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DETAIL ZONA (PERSIS ADMIN) */}
      {panelOpen && selectedZone && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={closePanel}>
          <div className="w-full max-w-[620px] overflow-hidden rounded-2xl bg-white shadow-2xl transition-all" onClick={(e) => e.stopPropagation()}>
            {/* Header Modal Detail */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <h3 className="text-[20px] font-bold text-[#111827]">Detail Zona {getCleanZoneCode(selectedZone)}</h3>
                <p className="mt-0.5 text-[13px] text-[#6b7280]">
                  {selectedWarehouse?.nama_gudang} — {getZoneType(selectedZone)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedWarehouseId) return;
                    const target = `/supervisor/reports?tab=stok&warehouseId=${encodeURIComponent(selectedWarehouseId)}`;
                    window.location.href = target;
                  }}
                  className="rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#374151] transition hover:bg-[#f9fafb]"
                >
                  Lihat Riwayat Stok
                </button>
                <button type="button" onClick={closePanel} className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#111827]">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="px-6 pb-6">
              {/* Search Bar */}
              <div className="relative mb-5">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  type="text"
                  placeholder="Cari kode perangkat / nama barang..."
                  value={panelSearch}
                  onChange={(e) => {
                    setPanelSearch(e.target.value);
                    setPanelPage(1);
                  }}
                  className="w-full rounded-xl border border-[#e5e7eb] bg-white py-2.5 pl-10 pr-4 text-[13px] text-[#111827] placeholder-[#9ca3af] outline-none transition focus:border-[#94a3b8]"
                />
              </div>

              {/* Data Loading / Error / Empty State / List */}
              {panelLoading ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center">
                  <Loader2 size={26} className="animate-spin text-[#6b7280]" />
                  <p className="mt-2 text-[13px] text-[#6b7280]">Memuat data stok...</p>
                </div>
              ) : panelError ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                  <AlertCircle size={32} className="text-red-500 mb-2" />
                  <p className="text-[13px] text-[#374151]">{panelError}</p>
                </div>
              ) : panelStock.length === 0 ? (
                /* Empty State (Persis Admin) */
                <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-[#9ca3af]">
                    <Boxes size={28} strokeWidth={1.5} />
                  </div>
                  <h4 className="text-[14px] font-bold text-[#111827]">Belum ada barang di zona ini</h4>
                  <p className="mt-1 text-[12px] text-[#9ca3af]">Zona ini belum memiliki stok barang</p>
                </div>
              ) : (
                /* List Barang */
                <>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {panelStock.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-xl border border-[#e5e7eb] p-3 transition hover:bg-[#f9fafb]">
                        <div>
                          <p className="text-[13px] font-bold text-[#111827]">{item.nama_barang || item.nama_perangkat || "Tanpa Nama"}</p>
                          <p className="text-[11px] text-[#6b7280]">Kode: {item.kode_barang || item.kode_perangkat || "-"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-bold text-[#111827]">{Number(item.qty || item.stok || 0).toLocaleString("id-ID")}</p>
                          <p className="text-[11px] text-[#6b7280]">Unit</p>
                          <div className="mt-1"><KondisiBadge value={item.kondisi} /></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {panelTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-[12px] text-[#6b7280]">
                        Menampilkan {panelTotal === 0 ? 0 : (panelPage - 1) * panelLimit + 1}-{Math.min(panelPage * panelLimit, panelTotal)} dari {panelTotal} barang
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPanelPage((p) => Math.max(1, p - 1))}
                          disabled={panelPage === 1}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ChevronLeft size={15} />
                        </button>

                        {(() => {
                          const pages: (number | "...")[] = [];
                          const totalPages = panelTotalPages;

                          if (totalPages <= 6) {
                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                          } else {
                            pages.push(1, 2);
                            if (panelPage > 4) pages.push("...");
                            const start = Math.max(3, panelPage - 1);
                            const end = Math.min(totalPages - 2, panelPage + 1);
                            for (let i = start; i <= end; i++) pages.push(i);
                            if (panelPage < totalPages - 3) pages.push("...");
                            pages.push(totalPages - 1, totalPages);
                          }

                          return pages.map((p, idx) =>
                            p === "..." ? (
                              <span key={`ellipsis-${idx}`} className="px-1 text-sm text-slate-400">...</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setPanelPage(Number(p))}
                                className={["flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors", panelPage === p ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"].join(" ")}
                              >
                                {p}
                              </button>
                            ),
                          );
                        })()}

                        <button
                          onClick={() => setPanelPage((p) => Math.min(panelTotalPages, p + 1))}
                          disabled={panelPage === panelTotalPages}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT/UPDATE STATUS UTILISASI (PERSIS ADMIN) */}
      {statusModalOpen && statusModalZone && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4" onClick={closeStatusModal}>
          <div className="w-full max-w-[450px] rounded-2xl bg-white p-6 shadow-2xl transition-all" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-[#111827]">Input Status Zona {getCleanZoneCode(statusModalZone)}</h3>
            <p className="mt-1 text-[12.5px] text-[#6b7280]">Pilih status kecukupan dan/atau kapasitas maksimum zona ini.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#344054]">
                  Kapasitas Maksimum (unit)
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="Contoh: 1000"
                  value={kapasitasMaksimumInput}
                  onChange={(e) => setKapasitasMaksimumInput(e.target.value)}
                  className="h-[38px] w-full rounded-xl border border-[#d0d5dd] bg-white px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#111827]"
                />
                <p className="mt-1 text-[10px] text-[#9ca3af]">
                  Kosongkan jika tidak diubah. Hanya angka bulat lebih dari 0.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-semibold text-[#344054]">
                  Status Kecukupan
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    { value: "CUKUP", label: "Cukup", colorBg: "bg-emerald-500" },
                    { value: "MENDEKATI_PENUH", label: "Mendekati Penuh", colorBg: "bg-amber-500" },
                    { value: "TIDAK_CUKUP", label: "Tidak Cukup", colorBg: "bg-rose-500" },
                  ].map((opt) => {
                    const isSelected = statusFormValue === opt.value;
                    return (
                      <label
                        key={opt.value}
                        onClick={() => setStatusFormValue(opt.value)}
                        className={`flex cursor-pointer items-center justify-start gap-3 rounded-xl border px-4 py-3 transition-all ${
                          isSelected ? "border-[#111827] bg-[#f8fafc] shadow-sm" : "border-[#e5e7eb] hover:border-[#cbd5e1] hover:bg-gray-50/50"
                        }`}
                      >
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${isSelected ? "border-[#111827] bg-[#111827]" : "border-[#d1d5db] bg-white"}`}>
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className={`h-2.5 w-2.5 rounded-full ${opt.colorBg}`} />
                          <span className="text-[13px] font-medium text-[#111827]">{opt.label}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeStatusModal}
                disabled={statusSaving}
                className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-2 text-[13px] font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveStatus}
                disabled={statusSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#1f2937] disabled:opacity-50"
              >
                {statusSaving && <Loader2 size={14} className="animate-spin" />}
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}
  
      {toast && (
        <div
          className={`fixed right-6 top-6 z-[130] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <AlertCircle size={17} className="shrink-0" />
          <span className="text-[13px] font-semibold">{toast.message}</span>
        </div>
      )}

      <ConfirmModal
        open={showDeactivatedModal}
        onConfirm={handleReturnToLogin}
        onClose={() => {}}
        title="Akun Anda Dinonaktifkan"
        description="Akun Anda telah dinonaktifkan oleh admin. Anda akan diarahkan ke halaman login."
        confirmText="Kembali ke Login"
        cancelText=""
        dismissProof
      />
    </div>
  );
}
