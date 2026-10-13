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

export type InboundMonitoringApiRow = {
  surat_jalan_id?: string | number;
  id?: string | number;
  nomor_surat_jalan?: string;
  gudang_tujuan?: { nama_gudang?: string } | null;
  status?: string;
  tanggal?: string;
  created_at?: string;
  updated_at?: string;
};

export type InboundMonitoringItem = {
  id: string;
  nomorSuratJalan: string;
  gudangTujuan: string;
  status: string;
  tanggal: string;
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

const FALLBACK_ACTIVITY_LOG: ActivityLogItem[] = [
  { auditId: "fb-1", time: "10:42 WIB", activity: "Approve SJ-2024000", actor: "Andi P.", result: "Sukses", resultTone: "bg-emerald-100 text-emerald-700" },
  { auditId: "fb-2", time: "10:15 WIB", activity: "Scan Inbound Pallet A", actor: "Budi", result: "Selesai", resultTone: "bg-emerald-100 text-emerald-700" },
];

type ProjectApiResponse = {
  project_id?: string | number;
  projectId?: string | number;
  projectName?: string;
  nama_project?: string;
  title?: string;
  clusterId?: string;
  cluster_id?: string;
  clusterLabel?: string;
  area?: string;
  statusBoq?: string;
  hardwareOnSite?: string | number;
  mos?: string | number;
  boq?: string | number;
  additional?: string | number;
  used?: string | number;
  remains?: string | number;
  status?: string;
  progress?: string | number;
};

// Rekonsiliasi hardware diringkas per cluster. Semua angka (boqPlan, additional,
// mos, used, remains) adalah total KUANTITAS yang dijumlahkan dari seluruh baris
// material di dalam cluster tersebut, sehingga Used bisa dibandingkan langsung
// (apple-to-apple) dengan BOQ Plan.
export type ClusterReconciliation = {
  clusterId: string;
  clusterName: string;
  projectName: string;
  boqPlan: number;
  additional: number;
  mos: number;
  used: number;
  remains: number;
  status: string;
  items: number;
};

type ProjectSummaryRow = {
  projectId: number;
  projectName: string;
  clusterId: string | null;
  clusterLabel: string;
  area: string;
  statusBoq: string;
  hardwareOnSite: number;
  mos: number;
  boq: number;
  additional: number;
  used: number;
  remains: number;
  status: "sesuai" | "perhatian" | "belum_ada_data";
  progress: number;
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
  inboundMonitoring: InboundMonitoringItem[];
  activityLog: ActivityLogItem[];
  clusterReconciliation: ClusterReconciliation[];
  projectSummary: ProjectSummaryRow[];
  metrics: SupervisorMetrics;
  queue: SupervisorQueue;
  assessment: WarehouseAssessment;
  kapasitasPerGudang: WarehouseCapacityRow[];
  currentTimeLabel: string;
  boqStats: { draft: number | null; active: number | null; total: number | null };
  stagingSites: Warehouse[];
  handleFilterChange: (type: "warehouse" | "project", value: string) => void;
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
};

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
  const { get } = useApi();
  const { showDeactivatedModal, handleReturnToLogin } = useAccountStatusGuard(60000);

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(FALLBACK_WAREHOUSES);
  const [projects, setProjects] = useState<Project[]>(FALLBACK_PROJECTS);
  const [inboundMonitoring, setInboundMonitoring] = useState<InboundMonitoringItem[]>([]);

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
  const [clusterReconciliation, setClusterReconciliation] = useState<ClusterReconciliation[]>([]);
  const [projectSummary, setProjectSummary] = useState<ProjectSummaryRow[]>([]);
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
  const [stagingSites, setStagingSites] = useState<Warehouse[]>([]);

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
      // Backend mendukung pengelompokan per cluster; dashboard menampilkan
      // rekonsiliasi per cluster (bukan per kode tiket).
      qs.set("groupBy", "cluster");

      const [approvalsRes, reconRes, activitiesRes, assessmentRes, statsRes, itemsRes, projectsRes, boqStatsRes] = await Promise.all([
        get(`${API_BASE}/api/dashboard/approvals`),
        get(`${API_BASE}/api/reconciliation/inventory?${qs.toString()}`),
        get(`${API_BASE}/api/dashboard/activities`),
        get(`${API_BASE}/api/dashboard/warehouse-assessment?gudangId=${warehouseId}`),
        get(`${API_BASE}/api/dashboard/`),
        get(`${API_BASE}/api/items?limit=1`),
        get(`${API_BASE}/api/dashboard/project-summary`),
        get(`${API_BASE}/api/boqs/stats`),
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

          const backendQueue = json?.data || {};
          const inboundPending = typeof backendQueue.inboundCount === "number"
            ? backendQueue.inboundCount
            : mapped.filter((it) => !it.isOutbound && it.status === "Menunggu").length;
          const outboundPending = typeof backendQueue.outboundCount === "number"
            ? backendQueue.outboundCount
            : mapped.filter((it) => it.isOutbound && it.status === "Menunggu").length;
          const suratJalanPending = typeof backendQueue.verificationCount === "number"
            ? backendQueue.verificationCount
            : inboundPending + outboundPending;
          const discrepancyCount = typeof backendQueue.discrepancyCount === "number"
            ? backendQueue.discrepancyCount
            : null;

          const criticalOutbound = mapped.filter(
            (it) => it.isOutbound && (it.tag === "KRITIS" || it.status === "Ditolak")
          );

          setQueue((prev) => ({
            ...prev,
            inboundPending,
            outboundPending,
            outboundCritical: criticalOutbound.length,
            suratJalanPending,
            discrepancyCount: discrepancyCount ?? prev.discrepancyCount,
          }));
        }
      }

      if (reconRes.ok) {
        const contentType = reconRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = await reconRes.json();
          const raw: unknown = json?.data;
          // Mode groupBy=cluster: satu baris = satu (cluster, barang). Nilai
          // boq/additional/mos/used/remains pada setiap baris sudah berupa
          // KUANTITAS barang tersebut.
          const data: Array<{
            cluster_id?: string | null;
            nama_cluster?: string | null;
            project_nama?: string;
            kode_tiket?: string;
            nama_barang?: string;
            boq?: number;
            additional?: number;
            mos?: number;
            used?: number;
            remains?: number;
            status?: string;
          }> = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as { data?: unknown[] })?.data)
              ? ((raw as { data: unknown[] }).data as Array<{
                  cluster_id?: string | null;
                  nama_cluster?: string | null;
                  project_nama?: string;
                  kode_tiket?: string;
                  nama_barang?: string;
                  boq?: number;
                  additional?: number;
                  mos?: number;
                  used?: number;
                  remains?: number;
                  status?: string;
                }>)
              : [];

          const grouped = new Map<string, {
            clusterId: string;
            clusterName: string;
            projectName: string;
            boqPlan: number;
            additional: number;
            mos: number;
            used: number;
            remains: number;
            hasPerhatian: boolean;
            hasSesuai: boolean;
            items: number;
          }>();
          for (const row of data) {
            const projectName = row.project_nama || "-";
            const clusterId = row.cluster_id ? String(row.cluster_id) : "";
            const clusterName = (row.nama_cluster || "").trim() || (clusterId || "Belum ditentukan");
            const key = clusterId || `${projectName}::tanpa-cluster`;
            const boq = Number(row.boq || 0);
            const additional = Number(row.additional || 0);
            const mos = Number(row.mos || 0);
            const used = Number(row.used || 0);
            const remains = Number(row.remains || 0);

            if (!grouped.has(key)) {
              grouped.set(key, {
                clusterId,
                clusterName,
                projectName,
                boqPlan: 0,
                additional: 0,
                mos: 0,
                used: 0,
                remains: 0,
                hasPerhatian: false,
                hasSesuai: false,
                items: 0,
              });
            }

            // Used dijumlahkan dari total kuantitas tiap baris material, jadi
            // skalanya sama dengan BOQ Plan (bukan jumlah baris/jenis item).
            const g = grouped.get(key)!;
            g.boqPlan += boq;
            g.additional += additional;
            g.mos += mos;
            g.used += used;
            g.remains += remains;
            g.items += 1;
            if (row.status === "perhatian") g.hasPerhatian = true;
            else if (row.status === "sesuai") g.hasSesuai = true;
          }

          if (grouped.size) {
            const list = Array.from(grouped.values())
              .map((g) => ({
                clusterId: g.clusterId,
                clusterName: g.clusterName,
                projectName: g.projectName,
                boqPlan: g.boqPlan,
                additional: g.additional,
                mos: g.mos,
                used: g.used,
                remains: g.remains,
                status: g.hasPerhatian ? "perhatian" : g.hasSesuai ? "sesuai" : "berjalan",
                items: g.items,
              }))
              .sort((a, b) =>
                a.clusterName.localeCompare(b.clusterName, "id-ID", { numeric: true })
              );
            setClusterReconciliation(list);
          } else {
            setClusterReconciliation([]);
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

            // Parse project summary data from the same response
            const mapped: ProjectSummaryRow[] = arr.map((p: ProjectApiResponse) => ({
              projectId: Number(p.project_id || p.projectId || 0),
              projectName: p.projectName || p.nama_project || p.title || "Project",
              clusterId: p.clusterId || p.cluster_id || null,
              clusterLabel: p.clusterLabel || (p.clusterId || p.cluster_id ? `RW ${p.clusterId || p.cluster_id}` : "-"),
              area: p.area || "-",
              statusBoq: p.statusBoq || "Belum Ada",
              hardwareOnSite: Number(p.hardwareOnSite || p.mos || 0),
              mos: Number(p.mos || p.hardwareOnSite || 0),
              boq: Number(p.boq || 0),
              additional: Number(p.additional || 0),
              used: Number(p.used || 0),
              remains: Number(p.remains || 0),
              status: p.status || "belum_ada_data",
              progress: Number(p.progress || 0),
            }));
            setProjectSummary(mapped);
          }
        }
      }

      // Angka "Status BOQ Overall" memakai endpoint statistik BOQ resmi
      // (/api/boqs/stats) supaya hitungan Draft/Aktif akurat sesuai data BOQ,
      // bukan hasil parsing daftar yang terpotong paginasi.
      if (boqStatsRes && boqStatsRes.ok) {
        const ct = boqStatsRes.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          const json = await boqStatsRes.json();
          const stats = json?.data || {};
          const draft = typeof stats.draft === "number" ? stats.draft : null;
          const active = typeof stats.aktif === "number" ? stats.aktif : null;
          const total = typeof stats.total === "number" ? stats.total : null;
          if (draft !== null || active !== null || total !== null) {
            setBoqStats({ draft, active, total });
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

  const fetchInboundMonitoring = useCallback(async () => {
    try {
      const res = await get(`${API_BASE}/api/surat-jalan/inbound`);
      if (!res.ok) return;
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) return;
      const json = await res.json();
      const rawList: unknown[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const mapped: InboundMonitoringItem[] = rawList.map((entry) => {
        const r = entry as InboundMonitoringApiRow;
        return {
          id: String(r.surat_jalan_id ?? r.id ?? ""),
          nomorSuratJalan: r.nomor_surat_jalan || "-",
          gudangTujuan: r.gudang_tujuan?.nama_gudang || "-",
          status: r.status || "-",
          tanggal: r.tanggal || r.created_at || r.updated_at || "",
        };
      });
      setInboundMonitoring(mapped);
    } catch {
      // keep existing state on failure
    }
  }, [get]);

  useEffect(() => {
    void fetchWarehouses();
    void fetchProjects();
    void fetchInboundMonitoring();
  }, [fetchWarehouses, fetchProjects, fetchInboundMonitoring]);

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
    inboundMonitoring,
    activityLog,
    clusterReconciliation,
    projectSummary,
    metrics,
    queue,
    assessment,
    kapasitasPerGudang,
    currentTimeLabel,
    boqStats,
    stagingSites,
    handleFilterChange,
    showDeactivatedModal,
    handleReturnToLogin,
  };
}
