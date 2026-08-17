"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { mapRole } from "@/lib/navigation";

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
  FileCheck2,
  Database,
  UserCog,
} from "lucide-react";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// ---------------------------------------------------------------------------
// DATA DUMMY — sesuai istilah & metrik pada PRD (BOQ, Surat Jalan, Kecukupan
// Area, Rekonsiliasi Hardware, Approval Outbound)
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

const warehouseCapacity = [
  {
    name: "Gudang Pusat Cimahi",
    percent: 92,
    status: "Tidak Cukup",
    tone: "rose",
  },
  {
    name: "Gudang 2",
    percent: 71,
    status: "Mendekati Penuh",
    tone: "amber",
  },
  {
    name: "Gudang Transit (3 lokasi aktif)",
    percent: 38,
    status: "Cukup",
    tone: "emerald",
  },
];

const toneMap: Record<
  string,
  { badge: string; bar: string; track: string }
> = {
  rose: {
    badge: "text-rose-600 bg-rose-50",
    bar: "bg-rose-500",
    track: "bg-rose-100",
  },
  amber: {
    badge: "text-amber-600 bg-amber-50",
    bar: "bg-amber-500",
    track: "bg-amber-100",
  },
  emerald: {
    badge: "text-emerald-600 bg-emerald-50",
    bar: "bg-emerald-400",
    track: "bg-emerald-100",
  },
};

type ProjectSummaryRow = {
  projectId: number;
  projectName: string;
  clusterId: string | null;
  clusterLabel: string;
  area: string;
  statusBoq: string;
  hardwareOnSite: number;
  used: number;
  remains: number;
  progress: number;
};

const reconciliationBreakdown = [
  { label: "BOQ (Rencana)", value: 620, tone: "bg-slate-300" },
  { label: "Additional", value: 84, tone: "bg-blue-400" },
  { label: "Hardware on Site", value: 560, tone: "bg-emerald-400" },
  { label: "Used (Terpasang)", value: 410, tone: "bg-orange-400" },
  { label: "Remains", value: 150, tone: "bg-slate-400" },
];
const reconciliationMax = Math.max(
  ...reconciliationBreakdown.map((r) => r.value)
);

const activityFeed = [
  {
    id: "act-1",
    icon: FileCheck2,
    iconColor: "text-emerald-600 bg-emerald-50",
    text: "BOQ Proyek SI Data Center BUMN Rw 04 diaktifkan",
    time: "12 menit lalu",
  },
  {
    id: "act-2",
    icon: AlertTriangle,
    iconColor: "text-rose-500 bg-rose-50",
    text: "Surat Jalan #SJ-0231 belum dikonfirmasi diterima sejak 2 hari",
    time: "2 hari lalu",
  },
  {
    id: "act-3",
    icon: PackageCheck,
    iconColor: "text-blue-500 bg-blue-50",
    text: "Kelebihan barang tercatat pada inbound Surat Jalan #SJ-0225 (Switch Managed 24-port)",
    time: "5 jam lalu",
  },
  {
    id: "act-4",
    icon: ShieldCheck,
    iconColor: "text-orange-500 bg-orange-50",
    text: "Permintaan BOQ tambahan dari Supervisor Gudang 2 menunggu tinjauan",
    time: "1 hari lalu",
  },
];

// ---------------------------------------------------------------------------
// HELPER COMPONENTS
// ---------------------------------------------------------------------------

function GaugeRing({ score, size = 140 }: { score: number; size?: number }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#FFF7ED"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#F97316"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

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

// ---------------------------------------------------------------------------
// MAIN DASHBOARD CONTENT
// ---------------------------------------------------------------------------

function DashboardPageContent() {
  const { user } = useAuth();
  const { get } = useApi();
  const [projectFilter, setProjectFilter] = useState("");
  const [projectSummary, setProjectSummary] = useState<ProjectSummaryRow[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(defaultDashboardStats);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
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
          pendingApprovals: Number(statsData.pendingApprovals ?? 0),
          warehouses: Number(statsData.warehouses ?? 0),
        });

        setProjectSummary(Array.isArray(projectSummaryJson?.data) ? projectSummaryJson.data : []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setDashboardStats(defaultDashboardStats);
        setProjectSummary([]);
      } finally {
        setIsLoadingProjects(false);
        setIsLoadingStats(false);
      }
    };

    fetchDashboardData();
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
    },
    {
      label: "Approval Menunggu",
      value: formatNumber(dashboardStats.pendingApprovals),
      icon: ShieldCheck,
      iconColor: "text-rose-500 bg-rose-50",
      note: "Informasi — disetujui oleh Supervisor",
      noteColor: "text-slate-400",
    },
  ];

  const filteredProjects = projectSummary.filter((p) =>
    `${p.projectName} ${p.area} ${p.clusterLabel}`
      .toLowerCase()
      .includes(projectFilter.toLowerCase())
  );

  return (
    <div className={`flex gap-6 text-slate-800 ${plusJakartaSans.className}`}>
      {/* KONTEN UTAMA (KIRI) */}
      <div className="flex-1 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">{greeting}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pantau kondisi gudang, status BOQ, dan approval outbound dalam satu
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
              Kapasitas rak/area gudang dibanding volume perangkat saat ini.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {warehouseCapacity.map((w) => {
              const tone = toneMap[w.tone];
              return (
                <div
                  key={w.name}
                  className="rounded-2xl border border-slate-100 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      {w.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}
                    >
                      {w.status}
                    </span>
                  </div>
                  <div className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${tone.track}`}>
                    <div
                      className={`h-full rounded-full ${tone.bar}`}
                      style={{ width: `${w.percent}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {w.percent}% terpakai
                  </div>
                </div>
              );
            })}
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

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Project/Cluster</th>
                  <th className="pb-2 font-medium">Area</th>
                  <th className="pb-2 font-medium">Status BOQ</th>
                  <th className="pb-2 font-medium">Hardware on Site</th>
                  <th className="pb-2 font-medium">Used</th>
                  <th className="pb-2 font-medium">Remains</th>
                  <th className="pb-2 font-medium">Progres</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingProjects ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-slate-400">
                      Memuat data project...
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-sm text-slate-400">
                      Tidak ada data project/cluster yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => (
                    <tr
                      key={p.projectId}
                      className="border-t border-slate-50 hover:bg-slate-50/60"
                    >
                      <td className="py-2.5 font-medium text-slate-900">
                        {p.projectName}
                        {p.clusterId ? (
                          <div className="text-[10px] uppercase tracking-wide text-slate-400">
                            {p.clusterLabel}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2.5 text-slate-500">{p.area}</td>
                      <td className="py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            p.statusBoq === "Aktif"
                              ? "text-emerald-600 bg-emerald-50"
                              : p.statusBoq === "Draft"
                                ? "text-amber-600 bg-amber-50"
                                : "text-slate-500 bg-slate-100"
                          }`}
                        >
                          {p.statusBoq}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-700">{p.hardwareOnSite}</td>
                      <td className="py-2.5 text-slate-700">{p.used}</td>
                      <td className="py-2.5 text-slate-700">{p.remains}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-orange-500"
                              style={{ width: `${p.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {p.progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* KOLOM KANAN */}
      <aside className="w-80 space-y-4">
        {/* 4a. APPROVAL OUTBOUND TEPAT WAKTU */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Approval Outbound Tepat Waktu
          </h2>

          <div className="mt-4 flex justify-center">
            <div className="relative flex items-center justify-center">
              <GaugeRing score={100} />
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold text-slate-900">
                  100<span className="text-base text-slate-300">%</span>
                </span>
                <span className="mt-0.5 text-[10px] font-semibold tracking-wide text-orange-500">
                  KATEGORI KRITIS
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-500">Rata-rata delay konfirmasi</span>
              <span className="font-semibold text-slate-900">4.5 jam</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-sm">
              <span className="text-slate-500">Surat Jalan &gt; 24 jam</span>
              <span className="font-semibold text-rose-500">2 dokumen</span>
            </div>
          </div>
        </section>

        {/* 4b. REKONSILIASI HARDWARE RINGKAS */}
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">
            Rekonsiliasi Hardware Ringkas
          </h2>
          <p className="text-xs text-slate-400">Agregat seluruh proyek aktif</p>

          <div className="mt-4 space-y-3">
            {reconciliationBreakdown.map((r) => (
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
            <button
              type="button"
              className="text-[11px] font-semibold text-orange-500 hover:text-orange-600 cursor-pointer"
            >
              LIHAT SEMUA
            </button>
          </div>

          <ul className="mt-4 space-y-4">
            {activityFeed.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${a.iconColor}`}
                >
                  <a.icon size={13} strokeWidth={2.5} />
                </span>
                <div>
                  <div className="text-xs font-medium leading-snug text-slate-700">
                    {a.text}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock size={10} />
                    {a.time}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Button
            variant="outline"
            className="mt-5 w-full rounded-xl border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            LIHAT SEMUA AKTIVITAS
          </Button>
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
