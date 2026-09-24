"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api";
import { useAccountStatusGuard } from "@/hooks/use-account-status-guard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Warehouse = { id: string; nama_gudang: string; tipe?: string; createdAt?: string };
type Project = { id: string; nama_project: string; area: string };
type ApprovalItem = {
  id: string;
  rawId: string;
  numericId?: string;
  isOutbound: boolean;
  tag?: string;
  direction: string;
  partner: string;
  status: "Menunggu" | "Disetujui" | "Ditolak";
  createdAt?: string;
};
type ActivityLogItem = {
  auditId?: string;
  time: string;
  activity: string;
  actor: string;
  result: string;
  resultTone: string;
};

const FALLBACK_WAREHOUSES: Warehouse[] = [
  { id: "wh-1", nama_gudang: "Gudang Utama" },
  { id: "wh-2", nama_gudang: "Gudang Transit" },
];

const FALLBACK_PROJECTS: Project[] = [
  { id: "prj-1", nama_project: "RW 05", area: "Jakarta Selatan" },
  { id: "prj-2", nama_project: "Backbone JKT", area: "Jakarta Pusat" },
];

const FALLBACK_APPROVAL_LIST: ApprovalItem[] = [
  { id: "inbound::SJ-2024001", rawId: "SJ-2024001", isOutbound: false, direction: "Inbound", partner: "PT Supplier A", status: "Menunggu" },
  { id: "outbound::SJ-2024002", rawId: "SJ-2024002", isOutbound: true, tag: "KRITIS", direction: "Outbound", partner: "Project RW 05", status: "Menunggu" },
  { id: "inbound::SJ-2024003", rawId: "SJ-2024003", isOutbound: false, direction: "Inbound", partner: "Gudang Transit", status: "Menunggu" },
];

const FALLBACK_ACTIVITY_LOG: ActivityLogItem[] = [
  { auditId: "fb-1", time: "10:42 WIB", activity: "Approve SJ-2024000", actor: "Andi P.", result: "Sukses", resultTone: "bg-emerald-100 text-emerald-700" },
  { auditId: "fb-2", time: "10:15 WIB", activity: "Scan Inbound Pallet A", actor: "Budi", result: "Selesai", resultTone: "bg-emerald-100 text-emerald-700" },
];

type TicketReconciliation = {
  ticketCode: string;
  projectName: string;
  boqPlan: number;
  additional: number;
  mos: number;
  used: number;
  remains: number;
  totalUnit: string;
  status: string;
  items: number;
};

export type WarehouseAssessment = "CUKUP" | "MENDEKATI_PENUH" | "TIDAK_CUKUP" | null;

export type SupervisorMetrics = {
  totalDevices: number | null;
  activeProjects: number | null;
  todayTransactions: number | null;
  activeStaff: number | null;
};

export type SupervisorQueue = {
  inboundPending: number | null;
  outboundPending: number | null;
  outboundCritical: number | null;
  suratJalanPending: number | null;
  boqNewRequests: number | null;
  discrepancyCount: number | null;
  inboundOldestLabel: string;
  outboundOldestLabel: string;
  suratJalanOldestLabel: string;
  discrepancyOldestLabel: string;
};

export type WarehouseCapacityRow = {
  gudang_id: string;
  nama_gudang: string;
  tipe: string;
  kapasitas_maksimum: number | null;
  total_qty_di_zona: number;
  total_qty_generic: number;
  sisa: number | null;
  status: string;
  total_zona: number;
  total_zona_dengan_kapasitas: number;
};

export type SupervisorDashboardReturn = {
  selectedWarehouse: string;
  selectedProject: string;
  isLoading: boolean;
  warehouses: Warehouse[];
  projects: Project[];
  approvalList: ApprovalItem[];
  activityLog: ActivityLogItem[];
  ticketReconciliation: TicketReconciliation[];
  metrics: SupervisorMetrics;
  queue: SupervisorQueue;
  assessment: WarehouseAssessment;
  kapasitasPerGudang: WarehouseCapacityRow[];
  currentTimeLabel: string;
  boqStats: { draft: number | null; active: number | null; total: number | null };
  activeBoqTickets: Set<string>;
  stagingSites: Warehouse[];
  approvingId: string | null;
  approveError: string | null;
  handleFilterChange: (type: "warehouse" | "project", value: string) => void;
  handleApprove: (compositeId: string) => Promise<void>;
  showDeactivatedModal: boolean;
  handleReturnToLogin: () => void;
};

const FALLBACK_METRICS: SupervisorMetrics = {
  totalDevices: 1420,
  activeProjects: 12,
  todayTransactions: 48,
  activeStaff: 8,
};

const FALLBACK_QUEUE: SupervisorQueue = {
  inboundPending: 14,
  outboundPending: 8,
  outboundCritical: 2,
  suratJalanPending: 5,
  boqNewRequests: 3,
  discrepancyCount: 2,
  inboundOldestLabel: "1 hari",
  outboundOldestLabel: "3 jam",
  suratJalanOldestLabel: "4 hari",
  discrepancyOldestLabel: "5 jam",
};

function formatAge(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam`;
  const days = Math.floor(hours / 24);
  return `${days} hari`;
}

const PENDING_STATUSES = new Set([
  "menunggu",
  "menunggu_verifikasi",
  "draft_diajukan",
  "pending",
]);
const APPROVED_STATUSES = new Set([
  "disetujui",
  "diterima_didistribusikan",
  "ready_putaway",
  "approved",
  "selesai",
]);
const REJECTED_STATUSES = new Set(["ditolak", "rejected", "gagal"]);

function normalizeStatus(raw: string): ApprovalItem["status"] {
  const s = (raw || "").toLowerCase().trim();
  if (PENDING_STATUSES.has(s)) return "Menunggu";
  if (APPROVED_STATUSES.has(s)) return "Disetujui";
  if (REJECTED_STATUSES.has(s)) return "Ditolak";
  return "Menunggu";
}

const SUCCESS_ACTIONS = new Set([
  "create_inbound",
  "create_outbound",
  "receive_inbound",
  "approve_inbound",
  "approve_outbound",
  "confirm_distributed",
  "putaway",
  "retrieve",
  "selesai",
  "sukses",
  "berhasil",
]);
const FAIL_ACTIONS = new Set([
  "reject_inbound",
  "reject_outbound",
  "ditolak",
  "gagal",
]);

function normalizeResult(action: string): { label: "Sukses" | "Gagal" | "Menunggu"; tone: string } {
  const a = (action || "").toLowerCase();
  if (FAIL_ACTIONS.has(a) || a.includes("reject") || a.includes("gagal") || a.includes("ditolak")) {
    return { label: "Gagal", tone: "bg-rose-100 text-rose-700" };
  }
  if (SUCCESS_ACTIONS.has(a) || a.includes("approve") || a.includes("sukses") || a.includes("berhasil") || a.includes("selesai") || a.includes("confirm")) {
    return { label: "Sukses", tone: "bg-emerald-100 text-emerald-700" };
  }
  return { label: "Menunggu", tone: "bg-amber-100 text-amber-700" };
}

export function useSupervisorDashboard() {
  const { get, put } = useApi();
  const { showDeactivatedModal, handleReturnToLogin } = useAccountStatusGuard(60000);

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(FALLBACK_WAREHOUSES);
  const [projects, setProjects] = useState<Project[]>(FALLBACK_PROJECTS);
  const [approvalList, setApprovalList] = useState<ApprovalItem[]>(FALLBACK_APPROVAL_LIST);
  const approvalListRef = useRef<ApprovalItem[]>(FALLBACK_APPROVAL_LIST);
  useEffect(() => {
    approvalListRef.current = approvalList;
  }, [approvalList]);

  const selectedWarehouseRef = useRef<string>("all");
  const selectedProjectRef = useRef<string>("all");
  useEffect(() => {
    selectedWarehouseRef.current = selectedWarehouse;
  }, [selectedWarehouse]);
  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  const fetchDashboardDataRef = useRef<((warehouseId: string, projectId: string) => Promise<void>) | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>(FALLBACK_ACTIVITY_LOG);
  const [ticketReconciliation, setTicketReconciliation] = useState<TicketReconciliation[]>([]);
  const [metrics, setMetrics] = useState<SupervisorMetrics>(FALLBACK_METRICS);
  const [queue, setQueue] = useState<SupervisorQueue>(FALLBACK_QUEUE);
  const [assessment, setAssessment] = useState<WarehouseAssessment>(null);
  const [kapasitasPerGudang, setKapasitasPerGudang] = useState<WarehouseCapacityRow[]>([]);
  const [currentTimeLabel, setCurrentTimeLabel] = useState<string>("");
  const [boqStats, setBoqStats] = useState<{ draft: number | null; active: number | null; total: number | null }>({
    draft: 15,
    active: 28,
    total: 43,
  });
  const [activeBoqTickets, setActiveBoqTickets] = useState<Set<string>>(new Set());
  const [stagingSites, setStagingSites] = useState<Warehouse[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await get(`${API_BASE}/api/warehouses?limit=1000&is_aktif=true&sortBy=nama_gudang&sortOrder=asc`);
      if (!res.ok) return;
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) return;
      const json = await res.json();
      const rawList: unknown[] = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.data?.data)
          ? json.data.data
          : [];
      const list = (rawList as Array<{ gudang_id: string | number; nama_gudang: string; tipe?: string; created_at?: string; createdAt?: string }>).map((w) => ({
        id: String(w.gudang_id),
        nama_gudang: w.nama_gudang,
        tipe: w.tipe,
        createdAt: w.created_at || w.createdAt,
      }));
      if (list.length) setWarehouses(list);
    } catch {
      // keep fallback
    }
  }, [get]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await get(`${API_BASE}/api/projects?all=true&sortBy=nama_project&sortOrder=asc`);
      if (!res.ok) return;
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) return;
      const json = await res.json();
      const rawList: unknown[] = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.data?.data)
          ? json.data.data
          : [];
      const list = (rawList as Array<{ project_id: string | number; nama_project: string; area: string; status?: string; status_aktif?: boolean }>).map((p) => ({
        id: String(p.project_id),
        nama_project: p.nama_project,
        area: p.area,
      }));
      if (list.length) {
        setProjects(list);
        const activeCount = rawList.filter((p) => {
          const obj = p as { status?: string; status_aktif?: boolean };
          if (obj.status_aktif === true) return true;
          const s = (obj.status || "").toLowerCase();
          return s === "aktif" || s === "active" || s === "berjalan";
        }).length;
        setMetrics((prev) => ({ ...prev, activeProjects: activeCount }));
      }
    } catch {
      // keep fallback
    }
  }, [get]);

  const fetchDashboardData = useCallback(async (warehouseId: string, projectId: string) => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams();
      if (warehouseId !== "all") qs.set("warehouseId", warehouseId);
      if (projectId !== "all") qs.set("projectId", projectId);
      qs.set("status", "all");

      const [approvalsRes, reconRes, activitiesRes, assessmentRes, statsRes, itemsRes, projectsRes, boqRes] = await Promise.all([
        get(`${API_BASE}/api/dashboard/approvals`),
        get(`${API_BASE}/api/reconciliation/inventory?${qs.toString()}`),
        get(`${API_BASE}/api/dashboard/activities`),
        get(`${API_BASE}/api/dashboard/warehouse-assessment?gudangId=${warehouseId}`),
        get(`${API_BASE}/api/dashboard/`),
        get(`${API_BASE}/api/items?limit=1`),
        get(`${API_BASE}/api/dashboard/project-summary`),
        get(`${API_BASE}/api/boqs?limit=1000`),
      ]);

      if (approvalsRes.ok) {
        const contentType = approvalsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = await approvalsRes.json();
          const items: Array<{
            id?: string;
            type?: string;
            direction: string;
            tipe?: string;
            nomorSuratJalan?: string;
            partner: string;
            status: string;
            createdAt?: string;
            isKritis?: boolean;
          }> = json?.data?.items || json?.items || [];

          const seen = new Set<string>();
          const mapped: ApprovalItem[] = [];
          for (const it of items) {
            const baseId = it.id || it.nomorSuratJalan || "-";
            const compositeKey = `${it.type || it.tipe || it.direction}::${baseId}`;
            if (seen.has(compositeKey)) continue;
            seen.add(compositeKey);

            const isOutbound = it.direction === "outbound" || it.tipe === "outbound";
            const tag = it.isKritis || it.nomorSuratJalan?.toLowerCase().includes("kritis") ? "KRITIS" : undefined;
            mapped.push({
              id: compositeKey,
              rawId: baseId,
              numericId: it.id ? String(it.id) : undefined,
              isOutbound,
              tag,
              direction: it.direction,
              partner: it.partner,
              status: normalizeStatus(it.status),
              createdAt: it.createdAt,
            });
          }
          if (mapped.length) setApprovalList(mapped);

          const now = Date.now();
          const pendingInbound = mapped.filter((it) => !it.isOutbound && it.status === "Menunggu");
          const pendingOutbound = mapped.filter((it) => it.isOutbound && it.status === "Menunggu");
          const criticalOutbound = mapped.filter(
            (it) => it.isOutbound && (it.tag === "KRITIS" || it.status === "Ditolak")
          );

          const oldest = (arr: { createdAt?: string }[]) => {
            const valid = arr
              .map((x) => (x.createdAt ? new Date(x.createdAt).getTime() : null))
              .filter((t): t is number => typeof t === "number" && !isNaN(t));
            if (!valid.length) return null;
            return now - Math.min(...valid);
          };

          setQueue((prev) => ({
            ...prev,
            inboundPending: pendingInbound.length,
            outboundPending: pendingOutbound.length,
            outboundCritical: criticalOutbound.length,
            inboundOldestLabel: oldest(pendingInbound) ? formatAge(oldest(pendingInbound)!) : prev.inboundOldestLabel,
            outboundOldestLabel: oldest(pendingOutbound) ? formatAge(oldest(pendingOutbound)!) : prev.outboundOldestLabel,
          }));
        }
      }

      if (reconRes.ok) {
        const contentType = reconRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = await reconRes.json();
          const raw: unknown = json?.data;
          const data: Array<{
            kode_tiket?: string;
            project_nama?: string;
            project_id?: string;
            barang_id?: string;
            nama_barang?: string;
            boq?: number;
            additional?: number;
            mos_sistem?: number;
            used?: number;
            remains?: number;
            status?: string;
          }> = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as { data?: unknown[] })?.data)
              ? ((raw as { data: unknown[] }).data as Array<{
                  kode_tiket?: string;
                  project_nama?: string;
                  project_id?: string;
                  barang_id?: string;
                  nama_barang?: string;
                  boq?: number;
                  additional?: number;
                  mos_sistem?: number;
                  used?: number;
                  remains?: number;
                  status?: string;
                }>)
              : [];

          const grouped = new Map<string, {
            ticketCode: string;
            boqPlan: number;
            additional: number;
            mos: number;
            used: number;
            remains: number;
            totalUnit: string;
            status: string;
            projectName: string;
            items: number;
          }>();
          for (const row of data) {
            const projectName = row.project_nama || "-";
            const tickets = (row.kode_tiket || "-")
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean);
            const ticketList = tickets.length ? tickets : ["-"];
            const boq = Number(row.boq || 0);
            const additional = Number(row.additional || 0);
            const mos = Number(row.mos_sistem || 0);
            const used = Number(row.used || 0);
            const remains = Number(row.remains || 0);

            const shareBoq = tickets.length ? boq / ticketList.length : boq;
            const shareAdd = tickets.length ? additional / ticketList.length : additional;
            const shareMos = tickets.length ? mos / ticketList.length : mos;
            const shareUsed = tickets.length ? used / ticketList.length : used;
            const shareRem = tickets.length ? remains / ticketList.length : remains;

            for (const tkt of ticketList) {
              const key = `${projectName}::${tkt}`;
              if (!grouped.has(key)) {
                const total = shareBoq + shareAdd;
                grouped.set(key, {
                  ticketCode: tkt,
                  boqPlan: shareBoq,
                  additional: shareAdd,
                  mos: shareMos,
                  used: shareUsed,
                  remains: shareRem,
                  totalUnit: `${total.toLocaleString("id-ID")} Unit Total`,
                  status: row.status || "berjalan",
                  projectName,
                  items: 1,
                });
              } else {
                const g = grouped.get(key)!;
                g.boqPlan += shareBoq;
                g.additional += shareAdd;
                g.mos += shareMos;
                g.used += shareUsed;
                g.remains += shareRem;
                g.items += 1;
                g.totalUnit = `${(g.boqPlan + g.additional).toLocaleString("id-ID")} Unit Total`;
              }
            }
          }
          if (grouped.size) {
            const list = Array.from(grouped.values()).sort((a, b) =>
              a.ticketCode.localeCompare(b.ticketCode, "id-ID", { numeric: true })
            );
            setTicketReconciliation(list);
          } else {
            setTicketReconciliation([]);
          }
        }
      }

      if (activitiesRes.ok) {
        const contentType = activitiesRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = await activitiesRes.json();
          const logs: Array<{
            auditId?: string;
            action: string;
            actorName: string;
            entityType?: string;
            createdAt: string;
          }> = json?.data || [];
          const mapped: ActivityLogItem[] = logs.map((log) => {
            const norm = normalizeResult(log.action);
            const time = log.createdAt
              ? new Date(log.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
              : "-";
            return {
              auditId: log.auditId,
              time,
              activity: log.action,
              actor: log.actorName || "System",
              result: norm.label,
              resultTone: norm.tone,
            };
          });
          if (mapped.length) setActivityLog(mapped);
        }
      }

      if (assessmentRes.ok) {
        const contentType = assessmentRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = await assessmentRes.json();
          const zonas = json?.data || [];
          if (zonas.length) {
            const status = zonas[0]?.statusKecukupan || "CUKUP";
            setAssessment(status as WarehouseAssessment);
            setQueue((prev) => ({
              ...prev,
              discrepancyCount: zonas.length,
            }));
          }
        }
      }

      if (statsRes && statsRes.ok) {
        const ct = statsRes.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          const json = await statsRes.json();
          const data = json?.data || {};
          setMetrics((prev) => {
            const next = { ...prev };
            if (typeof data.items === "number") next.totalDevices = data.items;
            else if (typeof data.totalItems === "number") next.totalDevices = data.totalItems;
            if (typeof data.projects === "number") next.activeProjects = data.projects;
            if (typeof data.personnels === "number") next.activeStaff = data.personnels;
            if (typeof data.pendingShipments === "number") next.todayTransactions = data.pendingShipments;
            return next;
          });

          const kapasitasList = Array.isArray(data.kapasitas_per_gudang)
            ? data.kapasitas_per_gudang
            : [];
          if (kapasitasList.length) {
            setKapasitasPerGudang(kapasitasList);
          }
        }
      }

      if (itemsRes && itemsRes.ok) {
        const ct = itemsRes.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          const json = await itemsRes.json();
          const total =
            typeof json?.total === "number"
              ? json.total
              : typeof json?.data?.total === "number"
                ? json.data.total
                : Array.isArray(json?.data)
                  ? json.data.length
                  : null;
          if (typeof total === "number" && total > 0) {
            setMetrics((prev) => ({ ...prev, totalDevices: total }));
          }
        }
      }

      if (projectsRes && projectsRes.ok) {
        const ct = projectsRes.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          const json = await projectsRes.json();
          const arr = Array.isArray(json?.data) ? json.data : [];
          if (arr.length) {
            setMetrics((prev) => ({ ...prev, activeProjects: arr.length }));
          }
        }
      }

      if (boqRes && boqRes.ok) {
        const ct = boqRes.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          const json = await boqRes.json();
          const list: Array<{ status?: string; ticketNumber?: string; ticket?: { kode_tiket?: string }; project?: { nama_project?: string } }> = Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json)
              ? json
              : [];
          if (list.length || typeof json?.total === "number") {
            const draft = list.filter((b) => (b.status || "").toLowerCase() === "draft").length;
            const active = list.filter((b) => (b.status || "").toLowerCase() === "aktif").length;
            const total = typeof json?.total === "number" ? json.total : list.length;
            setBoqStats({ draft, active, total });
            const activeTickets = new Set(
              list
                .filter((b) => (b.status || "").toLowerCase() === "aktif")
                .map((b) => b.ticketNumber || b.ticket?.kode_tiket || "")
                .filter((ticket) => Boolean(ticket))
            );
            setActiveBoqTickets(activeTickets);
          }
        }
      }
    } catch {
      // keep existing state on failure
    } finally {
      setIsLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchDashboardDataRef.current = fetchDashboardData;
  }, [fetchDashboardData]);

  useEffect(() => {
    const derived = warehouses.filter((w) => {
      const t = (w.tipe || "").toLowerCase();
      return t.includes("dadakan") || t.includes("staging") || t.includes("sementara") || t.includes("temporary");
    });
    setStagingSites(derived);
  }, [warehouses]);

  useEffect(() => {
    void fetchWarehouses();
    void fetchProjects();
  }, [fetchWarehouses, fetchProjects]);

  useEffect(() => {
    if (warehouses.length && projects.length) {
      void fetchDashboardData(selectedWarehouse, selectedProject);
    }
  }, [selectedWarehouse, selectedProject, warehouses, projects, fetchDashboardData]);

  const handleFilterChange = useCallback((type: "warehouse" | "project", value: string) => {
    if (type === "warehouse") {
      setSelectedWarehouse(value);
    } else {
      setSelectedProject(value);
    }
  }, []);

  const handleApprove = useCallback(
    async (compositeId: string) => {
      const target = approvalListRef.current.find((it) => it.id === compositeId);
      if (!target) return;
      const numericId = target.numericId || target.rawId;
      if (!numericId || !/^\d+$/.test(String(numericId))) {
        setApproveError("ID surat jalan tidak valid untuk diproses.");
        return;
      }

      setApprovingId(compositeId);
      setApproveError(null);
      const endpoint = target.isOutbound
        ? `${API_BASE}/api/surat-jalan/${numericId}/approve-outbound`
        : `${API_BASE}/api/surat-jalan/${numericId}/approve-inbound`;

      try {
        const res = await put(endpoint, { itemAdjustments: [] });
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const errJson = await res.json();
            if (errJson?.message) detail = errJson.message;
            else if (errJson?.error) detail = errJson.error;
          } catch {
            // body bukan JSON
          }
          throw new Error(detail);
        }
        setApprovalList((prev) =>
          prev.map((item) =>
            item.id === compositeId ? { ...item, status: "Disetujui" } : item
          )
        );
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} WIB`;
        const actionLabel = target.isOutbound ? "Approve Outbound" : "Approve Inbound";
        setActivityLog((prev) => [
          {
            auditId: `local-${Date.now()}`,
            time: timeString,
            activity: `${actionLabel} ${target.rawId}`,
            actor: "Anda",
            result: "Sukses",
            resultTone: "bg-emerald-100 text-emerald-700",
          },
          ...prev,
        ]);
        if (fetchDashboardDataRef.current) {
          await fetchDashboardDataRef.current(selectedWarehouseRef.current, selectedProjectRef.current);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gagal memproses approval.";
        setApproveError(`Gagal approve ${target.rawId}: ${message}`);
      } finally {
        setApprovingId(null);
      }
    },
    [put]
  );

  useEffect(() => {
    const formatNow = () => {
      const d = new Date();
      const datePart = d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
      const timePart = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      setCurrentTimeLabel(`${datePart}, ${timePart} WIB`);
    };
    formatNow();
    const t = setInterval(formatNow, 60000);
    return () => clearInterval(t);
  }, []);

  return {
    selectedWarehouse,
    selectedProject,
    isLoading,
    warehouses,
    projects,
    approvalList,
    activityLog,
    ticketReconciliation,
    metrics,
    queue,
    assessment,
    kapasitasPerGudang,
    currentTimeLabel,
    boqStats,
    activeBoqTickets,
    stagingSites,
    approvingId,
    approveError,
    handleFilterChange,
    handleApprove,
    showDeactivatedModal,
    handleReturnToLogin,
  };
}
