"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { getStatusBadgeClass, getStatusLabel, formatSisaCapacity, getStatusSourceLabel } from "@/lib/capacity";

import {
  Boxes,
  ClipboardList,
  Truck,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PackageCheck,
  Package,
  PackageMinus,
  ClipboardCheck,
  Wallet,
  FileCheck2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// DATA DUMMY — sesuai istilah & metrik pada PRD (BOQ, Surat Jalan, Kecukupan
// Area, Rekonsiliasi Hardware)
// ---------------------------------------------------------------------------

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value || 0);

type DashboardStats = {
  totalItems: number;
  activeBoq: number;
  draftBoq: number;
  pendingShipments: number;
  pendingApprovals: number;
  warehouses: number;
};

const defaultDashboardStats: DashboardStats = {
  totalItems: 0,
  activeBoq: 0,
  draftBoq: 0,
  pendingShipments: 0,
  pendingApprovals: 0,
  warehouses: 0,
};

const STATUS_META: Record<
  ProjectSummaryRow["status"],
  { label: string; badge: string; icon: typeof CheckCircle2 }
> = {
  sesuai: {
    label: "Sesuai",
    badge: "bg-emerald-50 text-emerald-600",
    icon: CheckCircle2,
  },
  perhatian: {
    label: "Perhatian",
    badge: "bg-amber-50 text-amber-600",
    icon: AlertTriangle,
  },
  berjalan: {
    label: "Berjalan",
    badge: "bg-blue-50 text-blue-600",
    icon: Package,
  },
};

const METRIC_TONE: Record<
  "slate" | "emerald" | "orange" | "rose",
  { box: string; label: string }
> = {
  slate: { box: "bg-slate-50 text-slate-700", label: "text-slate-400" },
  emerald: { box: "bg-emerald-50 text-emerald-800", label: "text-emerald-600" },
  orange: { box: "bg-orange-50 text-orange-800", label: "text-orange-600" },
  rose: { box: "bg-rose-50 text-rose-600 border border-rose-200", label: "text-rose-600" },
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
  status: "sesuai" | "perhatian" | "berjalan";
  progress: number;
};

// ---------------------------------------------------------------------------
// HELPER COMPONENTS
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon: Icon,
  iconColor,
  note,
  noteColor,
  href,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  note: string;
  noteColor: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 transition-colors hover:border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wide text-slate-400">
          {label.toUpperCase()}
        </span>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md ${iconColor}`}
        >
          <Icon size={13} strokeWidth={2.5} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className={`mt-1 text-xs font-medium ${noteColor}`}>{note}</div>
      {href && (
        <div className="mt-3 text-xs font-semibold text-orange-500 hover:text-orange-600">
          Review BOQ &rarr;
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

function MetricBox({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: number;
  tone: keyof typeof METRIC_TONE;
  highlight?: boolean;
}) {
  const t = METRIC_TONE[tone];
  return (
    <div className={`rounded-lg px-1 py-2 ${t.box}`}>
      <span className={`block text-[10px] font-medium ${t.label}`}>{label}</span>
      <span className={`block text-xs font-bold ${highlight ? "font-extrabold" : ""}`}>
        {formatNumber(value)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN DASHBOARD CONTENT
// ---------------------------------------------------------------------------

function DashboardPageContent() {
  const { get } = useApi();
  const [projectFilter, setProjectFilter] = useState("");
  const [projectSummary, setProjectSummary] = useState<ProjectSummaryRow[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(defaultDashboardStats);
  const [reconciliationRows, setReconciliationRows] = useState<
    Array<{
      project_id: string;
      project_nama?: string;
      boq: number;
      additional: number;
      mos: number;
      used: number;
      remains: number;
      status?: string;
    }>
  >([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingReconciliation, setIsLoadingReconciliation] = useState(true);
  const [recentBoqs, setRecentBoqs] = useState<
    Array<{
      boq_id: number | string;
      boq_number?: string | null;
      status?: string;
      tanggal_aktivasi?: string | null;
      updated_at?: string | null;
      created_at?: string | null;
      tiket?: { project?: { nama_project?: string } } | null;
    }>
  >([]);
  const [outboundQueue, setOutboundQueue] = useState<
    Array<{
      surat_jalan_id: number | string;
      nomor_surat_jalan?: string;
      status?: string;
      updated_at?: string | null;
      created_at?: string | null;
    }>
  >([]);
  const [inboundList, setInboundList] = useState<
    Array<{
      surat_jalan_id: number | string;
      nomor_surat_jalan?: string;
      status?: string;
      updated_at?: string | null;
      created_at?: string | null;
    }>
  >([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [kapasitasPerGudang, setKapasitasPerGudang] = useState<
    Array<{
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
    }>
  >([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

        const [statsResponse, projectSummaryResponse, reconciliationResponse] = await Promise.all([
          get(`${apiBase}/api/dashboard`),
          get(`${apiBase}/api/dashboard/project-summary`),
          get(`${apiBase}/api/reconciliation/inventory`),
        ]);

        const statsJson = await statsResponse.json();
        const projectSummaryJson = await projectSummaryResponse.json();
        const reconciliationJson = await reconciliationResponse.json();

        if (!statsResponse.ok) {
          throw new Error(statsJson?.message || "Gagal mengambil statistik dashboard.");
        }

        if (!projectSummaryResponse.ok) {
          throw new Error(
            projectSummaryJson?.message || "Gagal mengambil ringkasan project."
          );
        }

        const statsData = statsJson?.data || {};
        setDashboardStats({
          totalItems: Number(statsData.totalItems ?? statsData.items ?? 0),
          activeBoq: Number(statsData.activeBoq ?? 0),
          draftBoq: Number(statsData.draftBoq ?? 0),
          pendingShipments: Number(statsData.pendingShipments ?? 0),
          pendingApprovals: Number(statsData.pendingApprovals ?? 0),
          warehouses: Number(statsData.warehouses ?? 0),
        });

        setKapasitasPerGudang(Array.isArray(statsData.kapasitas_per_gudang) ? statsData.kapasitas_per_gudang : []);

        setProjectSummary(Array.isArray(projectSummaryJson?.data) ? projectSummaryJson.data : []);

        const reconPayload = reconciliationJson?.data;
        const reconList: Array<Record<string, unknown>> = Array.isArray(reconPayload)
          ? reconPayload
          : Array.isArray(reconPayload?.data)
            ? reconPayload.data
            : [];
        const mappedReconRows = reconList.map((row) => {
          const proj = row?.project as { nama_project?: string } | undefined;
          return {
            project_id: String(row?.project_id ?? ""),
            project_nama: (row?.project_nama ?? proj?.nama_project ?? undefined) as string | undefined,
            boq: Number(row?.boq ?? 0) || 0,
            additional: Number(row?.additional ?? 0) || 0,
            mos: Number(row?.mos ?? 0) || 0,
            used: Number(row?.used ?? 0) || 0,
            remains: Number(row?.remains ?? 0) || 0,
            status: row?.status ? String(row.status) : undefined,
          };
        });
        const seenRecon = new Set<string>();
        const dedupedReconRows = mappedReconRows.filter((r) => {
          if (!r.project_id) return true;
          if (seenRecon.has(r.project_id)) return false;
          seenRecon.add(r.project_id);
          return true;
        });
        setReconciliationRows(dedupedReconRows);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setDashboardStats(defaultDashboardStats);
        setProjectSummary([]);
        setReconciliationRows([]);
        setKapasitasPerGudang([]);
      } finally {
        setIsLoadingProjects(false);
        setIsLoadingStats(false);
        setIsLoadingReconciliation(false);
      }
    };

    fetchDashboardData();
  }, [get]);

  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoadingActivity(true);
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
      const safeJson = async (res: Response) => {
        try {
          return await res.json();
        } catch {
          return null;
        }
      };

      const [boqRes, outboundRes, inboundRes] = await Promise.allSettled([
        get(`${apiBase}/api/boqs?page=1&limit=5&sortBy=updated_at&sortOrder=desc`),
        get(`${apiBase}/api/surat-jalan/outbound/queue`),
        get(`${apiBase}/api/surat-jalan/inbound`),
      ]);

      if (boqRes.status === "fulfilled") {
        const res = boqRes.value;
        const json = await safeJson(res);
        if (res.ok) {
          const list = json?.data?.data ?? json?.data ?? [];
          setRecentBoqs(Array.isArray(list) ? list : []);
        } else {
          setRecentBoqs([]);
        }
      } else {
        setRecentBoqs([]);
      }

      if (outboundRes.status === "fulfilled") {
        const res = outboundRes.value;
        const json = await safeJson(res);
        if (res.ok) {
          const list = json?.data ?? [];
          const arr = Array.isArray(list)
            ? list
            : Array.isArray(list?.data)
              ? list.data
              : [];
          setOutboundQueue(arr.slice(0, 5));
        } else {
          setOutboundQueue([]);
        }
      } else {
        setOutboundQueue([]);
      }

      if (inboundRes.status === "fulfilled") {
        const res = inboundRes.value;
        const json = await safeJson(res);
        if (res.ok) {
          const list = json?.data ?? [];
          const arr = Array.isArray(list)
            ? list
            : Array.isArray(list?.data)
              ? list.data
              : [];
          setInboundList(arr.slice(0, 5));
        } else {
          setInboundList([]);
        }
      } else {
        setInboundList([]);
      }

      setIsLoadingActivity(false);
    };

    fetchActivity();
  }, [get]);

  const greeting = `Selamat Pagi, Selamat Beraktivitas! `;

  const kpiCards = [
    {
      label: "Total Item Stok",
      value: formatNumber(dashboardStats.totalItems),
      icon: Boxes,
      iconColor: "text-blue-500 bg-blue-50",
      note: `Tersebar di ${dashboardStats.warehouses || 0} gudang aktif`,
      noteColor: "text-slate-400",
    },
    {
      label: "BOQ Draft",
      value: formatNumber(dashboardStats.draftBoq),
      icon: ClipboardList,
      iconColor: "text-amber-600 bg-amber-50",
      note: "Menunggu verifikasi Admin General",
      noteColor: "text-amber-600",
      href: "/dashboard/boq",
    },
    {
      label: "BOQ Aktif",
      value: formatNumber(dashboardStats.activeBoq),
      icon: ClipboardList,
      iconColor: "text-emerald-600 bg-emerald-50",
      note: "Status Aktif",
      noteColor: "text-slate-400",
    },
    {
      label: "Surat Jalan Pending",
      value: formatNumber(dashboardStats.pendingShipments),
      icon: Truck,
      iconColor: "text-orange-500 bg-orange-50",
      note: "Menunggu konfirmasi Diterima/Didistribusikan",
      noteColor: "text-orange-500",
      href: "/dashboard/delivery",
    },
    {
      label: "Persetujuan Menunggu",
      value: formatNumber(dashboardStats.pendingApprovals),
      icon: ShieldCheck,
      iconColor: "text-rose-500 bg-rose-50",
      note: "Informasi — disetujui oleh Supervisor",
      noteColor: "text-slate-400",
      href: "/dashboard/delivery",
    },
  ];

  const reconciliationTotals = reconciliationRows.reduce(
    (acc, row) => {
      acc.boq += row.boq;
      acc.additional += row.additional;
      acc.mos += row.mos;
      acc.used += row.used;
      acc.remains += row.remains;
      return acc;
    },
    { boq: 0, additional: 0, mos: 0, used: 0, remains: 0 }
  );

  const projectRows = projectSummary.map((p) => {
    const hardwareOnSite = p.hardwareOnSite;
    const used = p.used;
    const remains = p.remains;
    const progress =
      hardwareOnSite > 0
        ? Math.min(Math.round((used / hardwareOnSite) * 100), 100)
        : 0;
    return { ...p, hardwareOnSite, used, remains, progress };
  });
  const activeProjectRows = projectRows.filter((p) => p.statusBoq === "Aktif");

  const filteredProjects = activeProjectRows.filter((p) =>
    `${p.projectName} ${p.area} ${p.clusterLabel}`
      .toLowerCase()
      .includes(projectFilter.toLowerCase())
  );

  const reconciliationBreakdown = [
    { label: "BOQ (Rencana)", value: reconciliationTotals.boq, tone: "bg-slate-300" },
    { label: "Additional", value: reconciliationTotals.additional, tone: "bg-blue-400" },
    { label: "MOS", value: reconciliationTotals.mos, tone: "bg-emerald-400" },
    { label: "Used (Terpasang)", value: reconciliationTotals.used, tone: "bg-orange-400" },
    { label: "Remains", value: reconciliationTotals.remains, tone: "bg-slate-400" },
  ];
  const reconciliationMax = Math.max(
    1,
    ...reconciliationBreakdown.map((r) => r.value)
  );
  const reconciliationValues = isLoadingReconciliation
    ? reconciliationBreakdown.map((r) => ({ ...r, value: 0 }))
    : reconciliationBreakdown;

  const timeAgo = (iso: string | null | undefined): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const diffMs = Date.now() - d.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 0) return null;
    if (sec < 60) return "Baru saja";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} menit lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} jam lalu`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} hari lalu`;
    const wk = Math.floor(day / 7);
    if (wk < 5) return `${wk} minggu lalu`;
    const mo = Math.floor(day / 30);
    return `${mo} bulan lalu`;
  };

  type ActivityItem = {
    id: string;
    type: "boq" | "surat-jalan" | "reconciliation";
    title: string;
    timestamp: string | null;
    actionRequired: boolean;
    actionUrl?: string;
    iconKey: "file" | "truck" | "alert" | "package" | "shield";
    iconTone: string;
  };

  const buildActivityItems = (): ActivityItem[] => {
    const items: ActivityItem[] = [];

    for (const sj of outboundQueue) {
      if (!sj) continue;
      const id = `sj-out-${sj.surat_jalan_id}`;
      const status = String(sj.status ?? "").toLowerCase();
      const actionRequired = status === "draft_diajukan";
      const ts = sj.updated_at ?? sj.created_at ?? null;
      const nomor = sj.nomor_surat_jalan ?? `#${sj.surat_jalan_id}`;
      const verb = actionRequired
        ? "menunggu persetujuan"
        : status === "disetujui"
          ? "telah disetujui"
          : status === "digenerate"
            ? "siap dikirim"
            : `status: ${sj.status ?? "-"}`;
      items.push({
        id,
        type: "surat-jalan",
        title: `Surat Jalan ${nomor} (Outbound) ${verb}`,
        timestamp: ts,
        actionRequired,
        actionUrl: "/dashboard/delivery",
        iconKey: actionRequired ? "shield" : "truck",
        iconTone: actionRequired
          ? "text-orange-500 bg-orange-50"
          : "text-blue-500 bg-blue-50",
      });
    }

    for (const sj of inboundList) {
      if (!sj) continue;
      const id = `sj-in-${sj.surat_jalan_id}`;
      const status = String(sj.status ?? "").toLowerCase();
      const actionRequired = status === "draft_diajukan" || status === "menunggu_verifikasi";
      const ts = sj.updated_at ?? sj.created_at ?? null;
      const nomor = sj.nomor_surat_jalan ?? `#${sj.surat_jalan_id}`;
      const verb = actionRequired
        ? "menunggu verifikasi"
        : status === "disetujui" || status === "digenerate"
          ? "telah disetujui"
          : status === "diterima_didistribusikan"
            ? "telah diterima"
            : `status: ${sj.status ?? "-"}`;
      items.push({
        id,
        type: "surat-jalan",
        title: `Surat Jalan ${nomor} (Inbound) ${verb}`,
        timestamp: ts,
        actionRequired,
        actionUrl: "/dashboard/delivery",
        iconKey: actionRequired ? "alert" : "package",
        iconTone: actionRequired
          ? "text-rose-500 bg-rose-50"
          : "text-emerald-600 bg-emerald-50",
      });
    }

    for (const row of reconciliationRows) {
      if (!row || String(row.status ?? "").toLowerCase() !== "perhatian") continue;
      const id = `recon-${row.project_id}`;
      const projectName = (row as { project_nama?: string }).project_nama ?? `Project ${row.project_id}`;
      items.push({
        id,
        type: "reconciliation",
        title: `Rekonsiliasi ${projectName} memerlukan perhatian`,
        timestamp: null,
        actionRequired: true,
        actionUrl: "/dashboard/reconciliation",
        iconKey: "alert",
        iconTone: "text-rose-500 bg-rose-50",
      });
    }

    for (const boq of recentBoqs) {
      if (!boq) continue;
      const id = `boq-${boq.boq_id}`;
      const status = String(boq.status ?? "").toLowerCase();
      const ts =
        status === "aktif"
          ? boq.tanggal_aktivasi ?? boq.updated_at ?? boq.created_at ?? null
          : boq.updated_at ?? boq.created_at ?? null;
      const projectName =
        boq.tiket?.project?.nama_project ?? `BOQ ${boq.boq_number ?? boq.boq_id}`;
      const actionRequired = status === "draft";
      const verb = actionRequired
        ? "menunggu verifikasi"
        : status === "aktif"
          ? "telah diaktifkan"
          : status === "selesai"
            ? "telah selesai"
            : `status: ${boq.status ?? "-"}`;
      items.push({
        id,
        type: "boq",
        title: `BOQ ${projectName} ${verb}`,
        timestamp: ts,
        actionRequired,
        actionUrl: "/dashboard/boq",
        iconKey: actionRequired ? "alert" : "file",
        iconTone: actionRequired
          ? "text-amber-600 bg-amber-50"
          : "text-emerald-600 bg-emerald-50",
      });
    }

    const withTs = items.filter((i) => i.timestamp);
    const withoutTs = items.filter((i) => !i.timestamp);
    withTs.sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bt - at;
    });
    const priorityScore = (i: ActivityItem) => (i.actionRequired ? 0 : 1);
    const ordered = [...withTs, ...withoutTs].sort((a, b) => {
      const pa = priorityScore(a);
      const pb = priorityScore(b);
      if (pa !== pb) return pa - pb;
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bt - at;
    });
    const seenIds = new Set<string>();
    const dedupedOrdered = ordered.filter((i) => {
      if (seenIds.has(i.id)) return false;
      seenIds.add(i.id);
      return true;
    });
    return dedupedOrdered.slice(0, 5);
  };

  const activityItems = buildActivityItems();

  const iconForKey = (k: ActivityItem["iconKey"]) => {
    switch (k) {
      case "truck":
        return Truck;
      case "alert":
        return AlertTriangle;
      case "package":
        return PackageCheck;
      case "shield":
        return ShieldCheck;
      case "file":
      default:
        return FileCheck2;
    }
  };

  return (
    <div className={`flex gap-6 text-slate-800`}>
      {/* KONTEN UTAMA (KIRI) */}
      <div className="flex-1 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">{greeting}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pantau kondisi gudang, status BOQ, dan persetujuan outbound dalam satu
            tampilan.
          </p>
        </header>

        {/* 1. KPI ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {kpiCards.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        {/* 2. KECUKUPAN AREA */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Kecukupan Area
            </h2>
            <p className="text-xs text-slate-400">
              Status kecukupan gudang berdasarkan penilaian manual Supervisor.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isLoadingStats ? (
              <div className="py-6 text-center text-sm text-slate-400 md:col-span-3">
                Memuat data kapasitas...
              </div>
            ) : kapasitasPerGudang.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400 md:col-span-3">
                Belum ada data kapasitas gudang.
              </div>
            ) : (
              [...kapasitasPerGudang]
                .sort((a, b) => {
                  const order: Record<string, number> = {
                    "TIDAK_CUKUP": 0,
                    "MENDEKATI_PENUH": 1,
                    "CUKUP": 2,
                  };
                  return (order[a.status] ?? 99) - (order[b.status] ?? 99);
                })
                .map((w) => {
                  const statusBadgeClass = getStatusBadgeClass(w.status);
                  const statusLabel = getStatusLabel(w.status);
                  const sisaText = formatSisaCapacity(w.sisa, w.kapasitas_maksimum);
                  const sourceLabel = getStatusSourceLabel({
                    status_kecukupan_source: "AUTO",
                    dinilai_oleh: null,
                    dinilai_pada: null,
                  });

                  return (
                    <Link
                      href={`/dashboard/warehouse`}
                      key={w.gudang_id}
                      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs transition hover:shadow-sm block"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                          <Boxes size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900 leading-snug">
                            {w.nama_gudang}
                          </div>
                          <div className="mt-1.5">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass}`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          {sisaText && (
                            <p className="mt-1 text-[10px] font-semibold text-slate-600">
                              Sisa: {sisaText}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-slate-400">
                            {sourceLabel}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })
            )}
          </div>
        </section>

        {/* 3. RINGKASAN PER PROJECT/CLUSTER */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ringkasan per Project/Cluster
              </h2>
              <p className="text-xs text-slate-400">
                Status BOQ dan realisasi hardware tiap proyek.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-sm text-slate-400 border border-slate-100">
              <Search size={14} />
              <input
                type="text"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                placeholder="Cari project atau area..."
                className="w-48 bg-transparent outline-none placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {isLoadingProjects ? (
              <div className="py-6 text-center text-sm text-slate-400 md:col-span-2">
                Memuat data project...
              </div>
            ) : activeProjectRows.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400 md:col-span-2">
                Belum ada project dengan status BOQ aktif.
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400 md:col-span-2">
                Tidak ada data project/cluster yang sesuai pencarian.
              </div>
            ) : (
              filteredProjects.map((p) => {
                const statusMeta = STATUS_META[p.status];
                const StatusIcon = statusMeta.icon;
                const maxVal = Math.max(1, p.boq + p.additional);
                const remWidth = Math.max(0, p.remains);
                return (
                  <div
                    key={p.projectId}
                    className="rounded-2xl border border-slate-100 bg-white p-3 transition-colors hover:border-slate-200"
                  >
                    {/* Header baris */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold leading-snug text-slate-900">
                            {p.projectName}
                          </span>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta.badge}`}
                          >
                            <StatusIcon size={11} strokeWidth={2.5} />
                            {statusMeta.label}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {p.area}
                          {p.clusterId ? ` • ${p.clusterLabel}` : ""}
                          {p.statusBoq ? ` • BOQ ${p.statusBoq}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">
                          Total Unit
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          {formatNumber(p.hardwareOnSite)}
                        </div>
                      </div>
                    </div>

                    {/* Stacked progress bar */}
                    <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        style={{ width: `${(p.hardwareOnSite / maxVal) * 100}%` }}
                        className="bg-emerald-500"
                        title={`MOS: ${p.hardwareOnSite}`}
                      />
                      <div
                        style={{ width: `${(p.used / maxVal) * 100}%` }}
                        className="bg-orange-500"
                        title={`Used: ${p.used}`}
                      />
                      <div
                        style={{ width: `${(remWidth / maxVal) * 100}%` }}
                        className={p.remains < 0 ? "bg-rose-400" : "bg-slate-300"}
                        title={`Remains: ${p.remains}`}
                      />
                    </div>

                    {/* Grid 5 metric */}
                    <div className="mt-2 grid grid-cols-5 gap-1.5 text-center">
                      <MetricBox label="BOQ Plan" value={p.boq} tone="slate" />
                      <MetricBox label="Additional" value={p.additional} tone="slate" />
                      <MetricBox label="MOS" value={p.hardwareOnSite} tone="emerald" />
                      <MetricBox label="Used" value={p.used} tone="orange" />
                      <MetricBox
                        label="Remains"
                        value={p.remains}
                        tone={p.remains < 0 ? "rose" : "slate"}
                        highlight={p.remains < 0}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* KOLOM KANAN */}
      <aside className="w-80 space-y-4">
        {/* 4b. REKONSILIASI HARDWARE RINGKAS */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">
            Rekonsiliasi Hardware Ringkas
          </h2>
          <p className="text-xs text-slate-400">Agregat seluruh proyek aktif</p>

          <div className="mt-4 space-y-3">
            {reconciliationValues.map((r) => (
              <div key={r.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-semibold text-slate-900">{r.value}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${r.tone}`}
                    style={{ width: `${(r.value / reconciliationMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. AKTIVITAS & TINDAK LANJUT TERBARU */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Aktivitas & Tindak Lanjut Terbaru
            </h2>
          </div>

          <ul className="mt-4 space-y-4">
            {isLoadingActivity ? (
              <li className="text-[11px] text-slate-400">Memuat aktivitas terbaru...</li>
            ) : activityItems.length === 0 ? (
              <li className="text-[11px] text-slate-400">
                Tidak ada aktivitas terbaru
              </li>
            ) : (
              activityItems.map((a, idx) => {
                const Icon = iconForKey(a.iconKey);
                const ts = timeAgo(a.timestamp);
                const inner = (
                  <>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${a.iconTone}`}
                    >
                      <Icon size={13} strokeWidth={2.5} />
                    </span>
                    <div>
                      <div className="text-xs font-medium leading-snug text-slate-700">
                        {a.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock size={10} />
                        {ts ?? "Waktu tidak tersedia"}
                      </div>
                    </div>
                  </>
                );
                return (
                  <li key={`${a.type}-${a.id}-${idx}`}>
                    {a.actionUrl ? (
                      <Link
                        href={a.actionUrl}
                        className="flex items-start gap-3 hover:opacity-90"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3">{inner}</div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PAGE GUARD — only admin can view the main dashboard
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const role = mapRole(user.role);

    if (role === "supervisor") {
      router.replace("/dashboard/supervisor");
    } else if (role === "staff") {
      router.replace("/staff/dashboard");
    }
  }, [router, user]);

  if (!user) return null;

  const role = mapRole(user.role);
  if (role !== "admin") return null;

  return <DashboardPageContent />;
}
