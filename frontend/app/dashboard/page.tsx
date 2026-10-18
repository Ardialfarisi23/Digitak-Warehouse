"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";
import { getStatusBadgeClass, getStatusLabel, formatSisaCapacity, getStatusSourceLabel } from "@/lib/capacity";
import { ClusterReconciliationSection } from "@/components/ClusterReconciliationSection";
import { buildClusterReconciliation, type ClusterReconciliation } from "@/lib/cluster-reconciliation";

import {
  Boxes,
  ClipboardList,
  Truck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Package,
} from "lucide-react";

// ---------------------------------------------------------------------------
// DATA DUMMY — sesuai istilah & metrik pada PRD (BOQ, Surat Jalan, Kecukupan
// Area)
// ---------------------------------------------------------------------------

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID").format(value || 0);

type DashboardStats = {
  totalItems: number;
  activeBoq: number;
  draftBoq: number;
  pendingShipments: number;
  warehouses: number;
};

const defaultDashboardStats: DashboardStats = {
  totalItems: 0,
  activeBoq: 0,
  draftBoq: 0,
  pendingShipments: 0,
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
  belum_ada_data: {
    label: "Belum Ada Data",
    badge: "bg-slate-50 text-slate-500",
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
  status: "sesuai" | "perhatian" | "belum_ada_data";
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
    <div className="rounded-2xl border border-slate-100 bg-white p-3 transition-colors hover:border-slate-200">
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
      <div className={`mt-1 text-xs font-medium ${noteColor} line-clamp-2`}>{note}</div>
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
  const [projectSummary, setProjectSummary] = useState<ProjectSummaryRow[]>([]);
  const [clusterReconciliation, setClusterReconciliation] = useState<ClusterReconciliation[]>([]);
  const [isLoadingRecon, setIsLoadingRecon] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(defaultDashboardStats);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
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

const fetchDashboardData = useCallback(async () => {
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");

      const [statsResponse, projectSummaryResponse] = await Promise.all([
        get(`${apiBase}/api/dashboard`),
        get(`${apiBase}/api/dashboard/project-summary`),
      ]);

      const statsJson = await statsResponse.json();
      const projectSummaryJson = await projectSummaryResponse.json();

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
        warehouses: Number(statsData.warehouses ?? 0),
      });

      setKapasitasPerGudang(Array.isArray(statsData.kapasitas_per_gudang) ? statsData.kapasitas_per_gudang : []);

      setProjectSummary(Array.isArray(projectSummaryJson?.data) ? projectSummaryJson.data : []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setDashboardStats(defaultDashboardStats);
      setProjectSummary([]);
      setKapasitasPerGudang([]);
    } finally {
      setIsLoadingProjects(false);
      setIsLoadingStats(false);
    }
  }, [get]);

  const fetchClusterReconciliation = useCallback(async () => {
    setIsLoadingRecon(true);
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
      const qs = new URLSearchParams();
      qs.set("status", "all");
      qs.set("groupBy", "cluster");
      const res = await get(`${apiBase}/api/reconciliation/inventory?${qs.toString()}`);
      if (!res.ok) return;
      const ct = res.headers.get("content-type");
      if (!ct || !ct.includes("application/json")) return;
      const json = await res.json();
      const raw: unknown = json?.data;
      const data = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { data?: unknown[] })?.data)
          ? (raw as { data: unknown[] }).data
          : [];
      setClusterReconciliation(buildClusterReconciliation(data as never));
    } catch (error) {
      console.error("Error fetching cluster reconciliation:", error);
      setClusterReconciliation([]);
    } finally {
      setIsLoadingRecon(false);
    }
  }, [get]);

  useEffect(() => {
    fetchDashboardData();
    fetchClusterReconciliation();
  }, [get, fetchDashboardData, fetchClusterReconciliation]);

  // Refetch project summary when window gains focus (e.g., after creating project in another tab)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardData();
        fetchClusterReconciliation();
      }
    };
    const onFocus = () => {
      fetchDashboardData();
      fetchClusterReconciliation();
    };
    window.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
    }, [get, fetchDashboardData, fetchClusterReconciliation]);

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
  ];

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
  // Backend sudah memfilter status_aktif: true, dan statusBoq hanya punya 3 nilai:
  // "Aktif" (ada BOQ aktif), "Draft" (hanya BOQ draft/selesai), "Belum Ada" (tanpa BOQ).
  // Oleh karena itu, tampilkan semua projectRows tanpa filter tambahan.
  const activeProjectRows = projectRows;
  return (
    <div className={`flex flex-col gap-4 sm:gap-6 lg:flex-row text-slate-800`}>
      {/* KONTEN UTAMA (KIRI) */}
      <div className="flex-1 space-y-6 min-w-0 w-full">
        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{greeting}</h1>
          <p className="mt-1 text-sm text-slate-400 truncate">
            Pantau kondisi gudang, status BOQ, dan persetujuan outbound dalam satu
            tampilan.
          </p>
        </header>

        {/* 1. KPI ROW */}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
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
        <ClusterReconciliationSection clusters={clusterReconciliation} isLoading={isLoadingRecon} sortByPriority enableFilters initialVisibleCount={8} loadMoreStep={8} />
      </div>

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