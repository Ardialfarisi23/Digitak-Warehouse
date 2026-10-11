"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { getStatusBadgeClass, getStatusLabel, formatSisaCapacity, getStatusSourceLabel } from "@/lib/capacity";
import { ConfirmModal } from "@/components/ConfirmModal";
import { KondisiBadge } from "@/components/common/KondisiBadge";
import { useAccountStatusGuard } from "@/hooks/use-account-status-guard";

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

function getCleanZoneCode(zone: Zona) {
  return zone.kode_zona || "";
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-0 sm:p-3 md:p-4" onClick={onClose}>
      <div className="flex w-full h-[100dvh] max-h-[100dvh] flex-col rounded-none bg-white shadow-xl sm:w-[min(92vw,640px)] sm:max-h-[calc(100dvh-1.5rem)] sm:rounded-xl md:max-w-[640px] md:h-auto md:max-h-[calc(100dvh-2rem)] md:rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function WarehouseLayoutPage() {
  const router = useRouter();

  const { get, request } = useApi();
  const { user } = useAuth();

  const { showDeactivatedModal, handleReturnToLogin } = useAccountStatusGuard(15000);

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

  const [zoneFormOpen, setZoneFormOpen] = useState(false);
  const [zoneFormMode, setZoneFormMode] = useState<"create" | "edit">("create");
  const [zoneFormZone, setZoneFormZone] = useState<Zona | null>(null);
  const [zoneFormCode, setZoneFormCode] = useState("");
  const [zoneFormName, setZoneFormName] = useState("");
  const [zoneFormTipe, setZoneFormTipe] = useState("");
  const [zoneFormKapasitas, setZoneFormKapasitas] = useState("");
  const [zoneFormSaving, setZoneFormSaving] = useState(false);
  const [zoneFormError, setZoneFormError] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmZone, setDeleteConfirmZone] = useState<Zona | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const canEditStatus = mapRole(user?.role) === "admin" || mapRole(user?.role) === "supervisor";

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    if (!user) return;

    const role = mapRole(user.role);

    if (role !== "admin") {
      setToast({ message: "Anda tidak memiliki akses ke halaman ini.", type: "error" });

      setTimeout(() => {
        if (role === "supervisor") {
          router.replace("/dashboard/supervisor");
        } else if (role === "staff") {
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

  function openCreateZone() {
    setZoneFormMode("create");
    setZoneFormZone(null);
    setZoneFormCode("");
    setZoneFormName("");
    setZoneFormTipe("");
    setZoneFormKapasitas("");
    setZoneFormError(null);
    setZoneFormOpen(true);
  }

  function openEditZone(zone: Zona) {
    setZoneFormMode("edit");
    setZoneFormZone(zone);
    setZoneFormCode(zone.kode_zona);
    setZoneFormName(zone.nama_zona || "");
    setZoneFormTipe(zone.tipe_zona || "");
    setZoneFormKapasitas(
      zone.kapasitas_maksimum != null ? String(zone.kapasitas_maksimum) : ""
    );
    setZoneFormError(null);
    setZoneFormOpen(true);
  }

  function closeZoneForm() {
    setZoneFormOpen(false);
    setZoneFormZone(null);
    setZoneFormError(null);
  }

  async function saveZone() {
    if (!selectedWarehouseId) return;

    setZoneFormSaving(true);
    setZoneFormError(null);

    try {
      const body: Record<string, unknown> = {
        gudang_id: selectedWarehouseId,
        code: zoneFormCode.trim(),
        name: zoneFormName.trim() || undefined,
        tipe_zona: zoneFormTipe || undefined,
      };

      if (zoneFormKapasitas.trim() !== "") {
        body.kapasitas_maksimum = Number(zoneFormKapasitas);
      }

      const isEdit = zoneFormMode === "edit" && zoneFormZone;
      const url = isEdit
        ? `${API_BASE}/api/zones/${zoneFormZone.zona_id}`
        : `${API_BASE}/api/zones`;

      const res = await request(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        const errorsObj = json?.errors as Record<string, string[]> | undefined;
        const fieldError = errorsObj
          ? Object.values(errorsObj)[0]?.[0]
          : json?.message;
        throw new Error(fieldError || "Gagal menyimpan zona.");
      }

      await loadWarehouseLayout(selectedWarehouseId);
      closeZoneForm();
      setToast({ message: isEdit ? "Zona berhasil diperbarui." : "Zona berhasil dibuat.", type: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan zona.";
      setZoneFormError(message);
      setToast({ message, type: "error" });
    } finally {
      setZoneFormSaving(false);
    }
  }

  function openDeleteConfirm(zone: Zona) {
    setDeleteConfirmZone(zone);
    setDeleteConfirmOpen(true);
  }

  function closeDeleteConfirm() {
    setDeleteConfirmOpen(false);
    setDeleteConfirmZone(null);
  }

  async function confirmDeleteZone() {
    if (!deleteConfirmZone) return;

    setDeleteLoading(true);

    try {
      const res = await request(
        `${API_BASE}/api/zones/${deleteConfirmZone.zona_id}`,
        {
          method: "DELETE",
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Gagal menghapus zona.");
      }

      if (selectedWarehouseId) {
        await loadWarehouseLayout(selectedWarehouseId);
      }

      closeDeleteConfirm();
      setToast({ message: "Zona berhasil dihapus.", type: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus zona.";
      setToast({ message, type: "error" });
    } finally {
      setDeleteLoading(false);
    }
  }

  const fetchZoneStock = useCallback(async (zone: Zona) => {
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
  }, [selectedWarehouseId, selectedZone, get]);

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

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [toast]);

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
        <div className="grid min-h-[360px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_90px_1fr] lg:grid-rows-[1fr_1fr] gap-3 sm:gap-4 lg:gap-3">
          <div className="h-full border-b border-r border-white lg:col-start-1 lg:row-start-1">{renderZone(zones[0], "Zona A")}</div>
          <div className="h-full border-b border-l border-white lg:col-start-3 lg:row-start-1">{renderZone(zones[1], "Zona B")}</div>
          <div className="lg:hidden sm:col-span-2 h-8 flex items-center justify-center bg-[#e8fbe8] rounded-lg">
            <span className="text-xs font-bold text-slate-700">Lorong</span>
          </div>
          <div className="h-full border-r border-white lg:col-start-1 lg:row-start-2">{renderZone(zones[2], "Zona C")}</div>
          <div className="h-full border-l border-white lg:col-start-3 lg:row-start-2">{renderZone(zones[3], "Zona D")}</div>
          <div className="hidden lg:flex relative items-center justify-center bg-[#e8fbe8] lg:col-start-2 lg:row-start-1">
            <div className="absolute inset-y-0 left-0 w-px bg-[#d6efd6]" />
            <div className="absolute inset-y-0 right-0 w-px bg-[#d6efd6]" />
            <span className="rotate-[-90deg] text-[17px] font-extrabold tracking-[-0.2px] text-[#111827]">Lorong</span>
          </div>
          <div className="hidden lg:flex relative items-center justify-center bg-[#e8fbe8] lg:col-start-2 lg:row-start-2">
            <div className="absolute inset-y-0 left-0 w-px bg-[#d6efd6]" />
            <div className="absolute inset-y-0 right-0 w-px bg-[#d6efd6]" />
            <span className="rotate-[-90deg] text-[17px] font-extrabold tracking-[-0.2px] text-[#111827]">Lorong</span>
          </div>
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

            {mapRole(user?.role) === "admin" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openCreateZone();
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#111827]/10 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#111827] shadow-sm transition hover:border-[#111827]/30 hover:bg-[#f7f8fa]"
              >
                <Plus size={13} />
                <span>Tambah Zona</span>
              </button>
            )}
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
         <div className="relative z-10 flex flex-grow flex-col items-center justify-center">
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

           {mapRole(user?.role) === "admin" && (
             <>
               <button
                 type="button"
                 onClick={(e) => {
                   e.stopPropagation();
                   openEditZone(zone);
                 }}
                 className="inline-flex items-center gap-1 rounded-lg border border-[#111827]/10 bg-white px-2.5 py-1 text-[10px] font-semibold text-[#111827] shadow-sm transition hover:border-[#111827]/30 hover:bg-[#f7f8fa]"
               >
                 <Pencil size={12} />
                 <span>Edit</span>
               </button>

               <button
                 type="button"
                 onClick={(e) => {
                   e.stopPropagation();
                   openDeleteConfirm(zone);
                 }}
                 className="inline-flex items-center gap-1 rounded-lg border border-[#b42318]/10 bg-white px-2.5 py-1 text-[10px] font-semibold text-[#b42318] shadow-sm transition hover:border-[#b42318]/30 hover:bg-[#fef2f2]"
               >
                 <Trash2 size={12} />
                 <span>Hapus</span>
               </button>
             </>
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

  /* =========================================================
     FLOOR PLAN
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
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h2 className="text-[19px] font-bold tracking-[-0.2px] text-[#111827]">
                  Denah Gudang
                </h2>

                <p className="mt-1 text-[13px] text-[#6b7280]">
                  {selectedWarehouse?.nama_gudang || "Gudang"}
                </p>
              </div>

              {selectedWarehouse?.tipe === "dadakan" && (
                <span className="inline-flex items-center rounded-full border border-[#d6efd6] bg-[#e8fbe8] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#14532d]">
                  Transit
                </span>
              )}
            </div>
          </div>

          {/* =================================================
              WAREHOUSE FLOOR PLAN
          ================================================= */}

          <div className="flex justify-center">
            <div className="w-full max-w-[900px]">

              <div className="overflow-hidden rounded-[10px] border border-[#dfe3e8] bg-[#e8fbe8]">
                {renderFloorPlan()}
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0 border-b border-[#edf0f2] px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h3 className="text-base sm:text-[17px] font-bold text-[#111827]">
              Detail Zona {selectedZone && getCleanZoneCode(selectedZone)}
            </h3>

            {selectedZone && (
              <p className="mt-1 text-xs sm:text-[12px] text-[#6b7280] whitespace-normal">
                {selectedWarehouse?.nama_gudang} — {getZoneType(selectedZone)}
                {(selectedZone.total_item ?? 0) > 0 && (
                  <span> • {(selectedZone.total_item ?? 0)} barang • {Number(selectedZone.total_qty ?? 0).toLocaleString("id-ID")} unit</span>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                if (!selectedWarehouseId || !selectedZone) return;
                const target = `/dashboard/reports?tab=stok&warehouseId=${encodeURIComponent(selectedWarehouseId)}`;
                window.location.href = target;
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#111827]/10 bg-white px-3 py-2 min-h-10 text-sm font-semibold text-[#111827] shadow-sm transition hover:border-[#111827]/30 hover:bg-[#f7f8fa] whitespace-nowrap w-full sm:w-auto"
            >
              Lihat Riwayat Stok
            </button>

            <button
              type="button"
              onClick={closePanel}
              className="flex-shrink-0 min-h-10 min-w-10 flex items-center justify-center rounded-lg p-2 text-[#98a2b3] hover:bg-[#f2f4f7] hover:text-[#111827]"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="shrink-0 border-b border-[#edf0f2] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 rounded-[9px] border border-[#d0d5dd] bg-white px-3">
            <Search
              size={16}
              className="shrink-0 text-[#98a2b3]"
            />

            <input
              value={panelSearch}
              onChange={(e) => setPanelSearch(e.target.value)}
              placeholder="Cari kode perangkat / nama barang…"
              className="h-11 sm:h-[38px] w-full bg-transparent text-base sm:text-[13px] text-[#111827] outline-none placeholder:text-[#98a2b3]"
            />
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 pb-[env(safe-area-inset-bottom)] sm:px-6">
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
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085] text-center w-12">No</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Nama Barang</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Kategori</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Kondisi</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085] text-right">Qty</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Satuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f7]">
                  {filteredPanelStock.map((item, idx) => (
                    <tr key={item.snapshot_id} className="transition hover:bg-[#fafbfc]">
                      <td className="px-4 py-3 text-center text-xs text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-[#111827]">{item.nama_barang}</p>
                        <p className="text-[11px] text-[#98a2b3]">{item.kode_perangkat}</p>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#6b7280]">{item.kategori}</td>
                      <td className="px-4 py-3 text-[13px] text-[#6b7280]"><KondisiBadge value={item.kondisi} /></td>
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

      {/* =====================================================
          MODAL: TAMBAH / EDIT ZONA
      ===================================================== */}

      <ZoneDetailModal open={zoneFormOpen} onClose={closeZoneForm}>
        <div className="border-b border-[#edf0f2] px-6 py-4">
          <h3 className="text-[17px] font-bold text-[#111827]">
            {zoneFormMode === "create" ? "Tambah Zona" : `Edit Zona ${zoneFormZone ? getCleanZoneCode(zoneFormZone) : ""}`}
          </h3>

          <p className="mt-1 text-[12px] text-[#6b7280]">
            {zoneFormMode === "create"
              ? "Buat zona baru untuk gudang ini."
              : "Perbarui data zona."}
          </p>
        </div>

        <div className="px-6 py-5">
          {zoneFormError && (
            <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[13px] text-[#b42318]">
              <AlertCircle size={16} className="shrink-0" />
              <span>{zoneFormError}</span>
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1 block text-[12px] font-semibold text-[#344054]">
              Kode Zona <span className="text-[#b42318]">*</span>
            </label>

            <input
              type="text"
              value={zoneFormCode}
              onChange={(e) => setZoneFormCode(e.target.value)}
              placeholder="Contoh: A"
              className="h-[38px] w-full rounded-xl border border-[#d0d5dd] bg-white px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#111827]"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-[12px] font-semibold text-[#344054]">
              Nama Zona
            </label>

            <input
              type="text"
              value={zoneFormName}
              onChange={(e) => setZoneFormName(e.target.value)}
              placeholder="Contoh: Zona A"
              className="h-[38px] w-full rounded-xl border border-[#d0d5dd] bg-white px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#111827]"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-[12px] font-semibold text-[#344054]">
              Tipe Zona
            </label>

            <select
              value={zoneFormTipe}
              onChange={(e) => setZoneFormTipe(e.target.value)}
              className="h-[38px] w-full rounded-xl border border-[#d0d5dd] bg-white px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#111827]"
            >
              <option value="">— Pilih tipe —</option>
              <option value="Indoor">Indoor</option>
              <option value="Outdoor">Outdoor</option>
            </select>
          </div>

          <div className="mb-2">
            <label className="mb-1 block text-[12px] font-semibold text-[#344054]">
              Kapasitas Maksimum (unit)
            </label>

            <input
              type="number"
              min={1}
              value={zoneFormKapasitas}
              onChange={(e) => setZoneFormKapasitas(e.target.value)}
              placeholder="Kosongkan jika tidak diatur"
              className="h-[38px] w-full rounded-xl border border-[#d0d5dd] bg-white px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#111827]"
            />

            <p className="mt-1 text-[10px] text-[#9ca3af]">
              Hanya angka bulat lebih dari 0. Kosongkan jika belum diatur.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#edf0f2] px-6 py-4">
          <button
            type="button"
            onClick={closeZoneForm}
            disabled={zoneFormSaving}
            className="rounded-lg border border-[#d0d5dd] px-4 py-2 text-[13px] font-semibold text-[#344054] transition hover:bg-[#f7f8fa] disabled:opacity-60"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={saveZone}
            disabled={zoneFormSaving || !zoneFormCode.trim()}
            className="rounded-lg bg-[#111827] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-60"
          >
            {zoneFormSaving ? "Menyimpan..." : zoneFormMode === "create" ? "Buat Zona" : "Simpan Perubahan"}
          </button>
        </div>
      </ZoneDetailModal>

      {/* =====================================================
          DIALOG: KONFIRMASI HAPUS ZONA
      ===================================================== */}

      {deleteConfirmOpen && deleteConfirmZone && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 p-4" onClick={closeDeleteConfirm}>
<div className="w-[calc(100vw-1.5rem)] max-w-[420px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-[#edf0f2] px-6 py-4">
              <h3 className="text-[17px] font-bold text-[#111827]">
                Hapus Zona {getCleanZoneCode(deleteConfirmZone)}
              </h3>

              <p className="mt-1 text-[12px] text-[#6b7280]">
                Yakin ingin menghapus zona <span className="font-semibold">{getCleanZoneCode(deleteConfirmZone)}</span>? Aksi ini tidak bisa dibatalkan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#edf0f2] px-6 py-4">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleteLoading}
                className="rounded-lg border border-[#d0d5dd] px-4 py-2 text-[13px] font-semibold text-[#344054] transition hover:bg-[#f7f8fa] disabled:opacity-60"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmDeleteZone}
                disabled={deleteLoading}
                className="rounded-lg bg-[#b42318] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#8b1a10] disabled:opacity-60"
              >
                {deleteLoading ? "Menghapus..." : "Hapus Zona"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          TOAST
      ===================================================== */}

      {toast && (
        <div
          className={`fixed right-6 top-6 z-[130] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${
            toast.type === "success"
              ? "border-[#cddff7] bg-[#f3f8ff] text-[#344a67]"
              : "border-[#fecaca] bg-[#fef2f2] text-[#7f1d1d]"
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