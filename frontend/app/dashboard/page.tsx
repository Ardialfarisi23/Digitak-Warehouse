"use client";

import { useState, useEffect, useCallback } from "react";
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

<<<<<<< HEAD
  const fetchDashboardData = useCallback(async () => {
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
=======
const fetchDashboardData = async () => {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
>>>>>>> origin/develop

      const [statsResponse, projectSummaryResponse] = await Promise.all([
        get(`${apiBase}/api/dashboard`),
        get(`${apiBase}/api/dashboard/project-summary`),
      ]);

      const statsJson = await statsResponse.json();
      const projectSummaryJson = await projectSummaryResponse.json();

<<<<<<< HEAD
      if (!statsResponse.ok) {
        throw new Error(statsJson?.message || "Gagal mengambil statistik dashboard.");
=======
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
            projectNama: (row?.projectNama ?? proj?.nama_project ?? undefined) as string | undefined,
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
>>>>>>> origin/develop
      }

<<<<<<< HEAD
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

  useEffect(() => {
    fetchDashboardData();
  }, [get, fetchDashboardData]);

  // Refetch project summary when window gains focus (e.g., after creating project in another tab)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardData();
      }
    };
    const onFocus = () => {
      fetchDashboardData();
    };
    window.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [get, fetchDashboardData]);
=======
    useEffect(() => {
      fetchDashboardData();
    }, [get]);

    // Refetch project summary when window gains focus (e.g., after creating project in another tab)
    useEffect(() => {
      const onVisible = () => {
        if (document.visibilityState === "visible") {
          fetchDashboardData();
        }
      };
      const onFocus = () => {
        fetchDashboardData();
      };
      window.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onFocus);
      return () => {
        window.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("focus", onFocus);
      };
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
>>>>>>> origin/develop

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

  const filteredProjects = activeProjectRows.filter((p) =>
    `${p.projectName} ${p.area} ${p.clusterLabel}`
      .toLowerCase()
      .includes(projectFilter.toLowerCase())
  );

  return (
    <div className={`flex flex-col gap-4 sm:gap-6 lg:flex-row text-slate-800`}>
      {/* KONTEN UTAMA (KIRI) */}
      <div className="flex-1 space-y-6 min-w-0 w-full">
        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{greeting}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pantau kondisi gudang, status BOQ, dan persetujuan outbound dalam satu
            tampilan.
          </p>
        </header>

        {/* 1. KPI ROW */}
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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