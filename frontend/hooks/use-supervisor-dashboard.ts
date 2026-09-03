"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type ApprovalStatus = "Menunggu" | "Disetujui" | "Ditolak";
export type Direction = "Inbound" | "Outbound";
export type FilterField = "warehouse" | "project";

export interface ApprovalItem {
  id: string;
  nomorSuratJalan?: string;
  direction: Direction;
  partner: string;
  status: ApprovalStatus;
  tag?: string;
  isOutbound: boolean;
}

export interface ActivityLogItem {
  time: string;
  activity: string;
  actor: string;
  result: string;
  resultTone: string;
}

export interface WarehouseOption {
  id: string;
  nama_gudang: string;
}

export interface ProjectOption {
  id: string;
  nama_project: string;
  area: string;
}

interface RawWarehouse {
  gudang_id: string | number;
  nama_gudang: string;
}

interface RawProject {
  project_id: string | number;
  nama_project: string;
  area?: string;
}

interface RawApprovalItem {
  id?: string | number;
  surat_jalan_id?: number | string;
  nomorSuratJalan?: string;
  nomor_surat_jalan?: string;
  direction?: string;
  tipe?: string;
  status?: string;
  partner?: string;
  pic_pemohon_nama?: string;
  projectName?: string;
  area?: string;
  warehouse?: string;
  createdAt?: string;
  created_at?: string;
}

interface RawActor {
  nama?: string;
  email?: string;
}

interface RawActivityLog {
  auditId?: string;
  entityType?: string;
  entity_id?: string;
  action?: string;
  aksi?: string;
  actorName?: string;
  createdAt?: string;
  created_at?: string;
  actor?: RawActor;
}

type UseSupervisorDashboardResult = {
  selectedWarehouse: string;
  setSelectedWarehouse: (value: string) => void;
  selectedProject: string;
  setSelectedProject: (value: string) => void;
  warehouses: WarehouseOption[];
  projects: ProjectOption[];
  approvalList: ApprovalItem[];
  activityLog: ActivityLogItem[];
  loading: boolean;
  error: string | null;
  handleFilterChange: (field: FilterField, value: string) => void;
  handleApprove: (item: ApprovalItem) => Promise<void>;
  handleReject: (item: ApprovalItem, catatan?: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const SUPERVISOR_ALLOWED_WAREHOUSES = ["Gudang Ciamis", "Gudang Rancamanyar", "Gudang Transit"];

const STATUS_MAP: Record<string, ApprovalStatus> = {
  menunggu_verifikasi: "Menunggu",
  ready_putaway: "Menunggu",
  draft_diajukan: "Menunggu",
  disetujui: "Disetujui",
  diterima_didistribusikan: "Disetujui",
  sedang_dikirim: "Disetujui",
  ditolak: "Ditolak",
};

const STATUS_TONE: Record<string, string> = {
  Menunggu: "bg-slate-100 text-slate-600",
  Disetujui: "bg-emerald-100 text-emerald-700",
  Ditolak: "bg-rose-100 text-rose-600",
  Selesai: "bg-emerald-100 text-emerald-700",
  "Info Baru": "bg-blue-100 text-blue-700",
};

function extractArray<T>(json: unknown): T[] {
  if (json && typeof json === "object" && "data" in json) {
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && "data" in data) {
      const inner = (data as { data?: unknown }).data;
      if (Array.isArray(inner)) return inner as T[];
    }
  }
  return [];
}

function formatTime(dateString: string | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function mapStatus(raw: string | undefined): ApprovalStatus {
  const normalized = String(raw || "").toLowerCase();
  return STATUS_MAP[normalized] ?? "Menunggu";
}

function mapApprovalItem(raw: RawApprovalItem): ApprovalItem {
  const directionRaw = String(raw.direction || raw.tipe || "").toLowerCase();
  const isOutbound = directionRaw === "outbound";
  const direction: Direction = isOutbound ? "Outbound" : "Inbound";
  const status = mapStatus(raw.status);

  let tag: string | undefined;
  if (status === "Menunggu" && isOutbound) {
    tag = "KRITIS";
  }

  return {
    id: String(raw.id ?? raw.surat_jalan_id ?? raw.nomorSuratJalan ?? raw.nomor_surat_jalan ?? ""),
    nomorSuratJalan: raw.nomorSuratJalan || raw.nomor_surat_jalan,
    direction,
    partner: raw.partner || raw.pic_pemohon_nama || raw.projectName || "-",
    status,
    tag,
    isOutbound,
  };
}

function mapActivityItem(raw: RawActivityLog): ActivityLogItem {
  const action = raw.action || raw.aksi || "Aktivitas";
  const resultLower = action.toLowerCase();

  let result: string;
  if (resultLower.includes("tolak") || resultLower.includes("reject")) {
    result = "Ditolak";
  } else if (resultLower.includes("setuju") || resultLower.includes("approve")) {
    result = "Disetujui";
  } else if (resultLower.includes("scan") || resultLower.includes("receive") || resultLower.includes("terima")) {
    result = "Selesai";
  } else {
    result = "Info Baru";
  }

  return {
    time: formatTime(raw.createdAt || raw.created_at),
    activity: action,
    actor: raw.actorName || raw.actor?.nama || raw.actor?.email || "-",
    result,
    resultTone: STATUS_TONE[result] || "bg-blue-100 text-blue-700",
  };
}

export function useSupervisorDashboard(): UseSupervisorDashboardResult {
  const { get, request } = useApi();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [approvalList, setApprovalList] = useState<ApprovalItem[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canAct = isAuthenticated && user?.role?.toLowerCase() === "supervisor";

  const fetchWarehouses = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const res = await get(`${API_BASE}/api/warehouses`);
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        const rawData = extractArray<RawWarehouse>(json);
        const mapped = rawData
          .filter((w) => w && SUPERVISOR_ALLOWED_WAREHOUSES.includes(w.nama_gudang))
          .map((w) => ({ id: String(w.gudang_id), nama_gudang: w.nama_gudang }));
        setWarehouses(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch warehouses:", err);
      setWarehouses([]);
    }
  }, [get, isAuthenticated]);

  const fetchProjects = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const res = await get(`${API_BASE}/api/projects?all=true`);
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        const rawData = extractArray<RawProject>(json);
        const mapped = rawData.map((p) => ({
          id: String(p.project_id),
          nama_project: p.nama_project,
          area: p.area || "-",
        }));
        setProjects(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setProjects([]);
    }
  }, [get, isAuthenticated]);

  const fetchApprovals = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const res = await get(
        `${API_BASE}/api/dashboard/approvals?warehouseId=${encodeURIComponent(selectedWarehouse)}&projectId=${encodeURIComponent(selectedProject)}`
      );
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        const rawItems = extractArray<RawApprovalItem>(json);
        setApprovalList(rawItems.map(mapApprovalItem));
      }
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat antrean approval.");
    }
  }, [get, isAuthenticated, selectedWarehouse, selectedProject]);

  const fetchActivities = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const res = await get(`${API_BASE}/api/dashboard/activities?limit=20`);
      const json = await res.json().catch(() => null);
      if (res.ok && json) {
        const rawItems = extractArray<RawActivityLog>(json);
        setActivityLog(rawItems.map(mapActivityItem));
      }
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    }
  }, [get, isAuthenticated]);

  const handleFilterChange = useCallback((_field: FilterField, value: string) => {
    if (_field === "warehouse") {
      setSelectedWarehouse(value);
    } else {
      setSelectedProject(value);
    }
  }, []);

  const handleApprove = useCallback(
    async (item: ApprovalItem) => {
      if (!canAct) return;

      const previous = approvalList;
      setApprovalList(approvalList.map((a) => (a.id === item.id ? { ...a, status: "Disetujui" } : a)));

      try {
        const endpoint = item.isOutbound
          ? `${API_BASE}/api/surat-jalan/${encodeURIComponent(item.id)}/approve-outbound`
          : `${API_BASE}/api/surat-jalan/${encodeURIComponent(item.id)}/approve-inbound`;

        const res = await request(endpoint, { method: "PUT" });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.message || "Gagal menyetujui surat jalan.");
        }

        await fetchApprovals();
      } catch (err) {
        console.error("Approve failed:", err);
        setApprovalList(previous);
        setError(err instanceof Error ? err.message : "Gagal menyetujui.");
      }
    },
    [canAct, approvalList, request, fetchApprovals]
  );

  const handleReject = useCallback(
    async (item: ApprovalItem, catatan?: string) => {
      if (!canAct) return;

      const previous = approvalList;
      setApprovalList(approvalList.map((a) => (a.id === item.id ? { ...a, status: "Ditolak" } : a)));

      try {
        const endpoint = item.isOutbound
          ? `${API_BASE}/api/surat-jalan/${encodeURIComponent(item.id)}/reject-outbound`
          : `${API_BASE}/api/surat-jalan/${encodeURIComponent(item.id)}/reject-inbound`;

        const res = await request(endpoint, {
          method: "PUT",
          body: JSON.stringify({ catatan: catatan || null }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.message || "Gagal menolak surat jalan.");
        }

        await fetchApprovals();
      } catch (err) {
        console.error("Reject failed:", err);
        setApprovalList(previous);
        setError(err instanceof Error ? err.message : "Gagal menolak.");
      }
    },
    [canAct, approvalList, request, fetchApprovals]
  );

  const fetchInitialData = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      await Promise.all([fetchWarehouses(), fetchProjects(), fetchApprovals(), fetchActivities()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, fetchWarehouses, fetchProjects, fetchApprovals, fetchActivities]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchInitialData();
  }, [authLoading, isAuthenticated, fetchInitialData]);

  return {
    selectedWarehouse,
    setSelectedWarehouse,
    selectedProject,
    setSelectedProject,
    warehouses,
    projects,
    approvalList,
    activityLog,
    loading,
    error,
    handleFilterChange,
    handleApprove,
    handleReject,
    refresh: fetchInitialData,
  };
}
