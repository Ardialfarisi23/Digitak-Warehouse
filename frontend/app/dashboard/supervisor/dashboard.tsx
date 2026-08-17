"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart2,
  Bell,
  Box,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  Radio,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Truck,
  User,
  Users,
  Warehouse,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { mapRole, formatRole } from "@/lib/navigation";

// Konfigurasi Font Plus Jakarta Sans
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

const summaryCards = [
  {
    label: "Total Perangkat",
    value: "1,420",
    icon: Warehouse,
    iconBg: "bg-amber-100 text-amber-700",
  },
  {
    label: "Project Aktif",
    value: "12",
    icon: FileText,
    iconBg: "bg-slate-100 text-slate-600",
  },
  {
    label: "Transaksi Hari Ini",
    value: "48",
    icon: ArrowUpRight,
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  {
    label: "Staf Aktif",
    value: "8",
    icon: Users,
    iconBg: "bg-orange-100 text-orange-600",
  },
];

const approvalCards = [
  {
    title: "Barang Masuk Menunggu Approval",
    value: "14",
    badge: "Tertua: 1 hari",
    badgeTone: "bg-slate-100 text-slate-600",
    accent: "border-l-4 border-l-amber-500",
    icon: ArrowDownLeft,
  },
  {
    title: "Barang Keluar Approval",
    value: "8",
    badge: "Kritis!",
    badgeTone: "bg-rose-500 text-white font-bold",
    subBadge: "Tertua: 3 jam",
    accent: "border-l-4 border-l-rose-500",
    icon: ArrowUpRight,
  },
  {
    title: "Konfirmasi Diterima",
    value: "22",
    badge: "Tertua: 2 hari",
    badgeTone: "bg-slate-100 text-slate-600",
    accent: "border-l-4 border-l-emerald-500",
    icon: CheckCircle2,
  },
  {
    title: "Surat Jalan Verifikasi",
    value: "5",
    badge: "Tertua: 4 hari",
    badgeTone: "bg-slate-100 text-slate-600",
    accent: "border-l-4 border-l-sky-500",
    icon: Truck,
  },
  {
    title: "Permintaan BOQ (Admin)",
    value: "3",
    badge: "Tertua: 1 hari",
    badgeTone: "bg-slate-100 text-slate-600",
    accent: "border-l-4 border-l-amber-500",
    icon: FileText,
  },
  {
    title: "Kasus Pengecualian Baru",
    value: "2",
    badge: "Tertua: 5 jam",
    badgeTone: "bg-rose-100 text-rose-600",
    accent: "border-l-4 border-l-rose-500",
    icon: ShieldAlert,
  },
];

const recentApprovals = [
  {
    id: "SJ-2024001",
    direction: "Inbound",
    partner: "PT Supplier A",
    status: "Menunggu",
    isOutbound: false,
  },
  {
    id: "SJ-2024002",
    direction: "Outbound",
    partner: "Project RW 05",
    status: "Review",
    tag: "KRITIS",
    isOutbound: true,
  },
  {
    id: "SJ-2024003",
    direction: "Inbound",
    partner: "Gudang Transit",
    status: "Menunggu",
    isOutbound: false,
  },
];

const latestActivities = [
  {
    time: "10:42 WIB",
    activity: "Approve SJ-2024000",
    actor: "Andi P.",
    result: "Sukses",
    resultTone: "bg-emerald-100 text-emerald-700",
  },
  {
    time: "10:15 WIB",
    activity: "Scan Inbound Pallet A",
    actor: "Budi",
    result: "Selesai",
    resultTone: "bg-emerald-100 text-emerald-700",
  },
  {
    time: "09:30 WIB",
    activity: "Update BOQ Project RW05",
    actor: "Admin Pusat",
    result: "Draft",
    resultTone: "bg-slate-200 text-slate-700",
  },
  {
    time: "08:55 WIB",
    activity: "Gagal Verifikasi Serial",
    actor: "Siti",
    result: "Error",
    resultTone: "bg-rose-100 text-rose-600",
  },
];

const chartData = [
  { day: "Sen", inbound: 45, outbound: 65 },
  { day: "Sel", inbound: 55, outbound: 50 },
  { day: "Rab", inbound: 70, outbound: 85 },
  { day: "Kam", inbound: 40, outbound: 45 },
  { day: "Jum", inbound: 80, outbound: 70 },
  { day: "Sab", inbound: 25, outbound: 20 },
  { day: "Min", inbound: 15, outbound: 10 },
];

export default function SupervisorDashboard() {
  const router = useRouter();
  const { user, logout, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/");
      } else {
        const userRole = mapRole(user?.role);
        if (userRole !== "supervisor") {
          router.push("/dashboard");
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user) {
    return (
      <div className={`flex min-h-screen items-center justify-center bg-[#F8F6F0] ${plusJakartaSans.className}`}>
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500" />
          <p className="mt-4 text-slate-600 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen bg-[#F8F6F0] text-slate-800 ${plusJakartaSans.className}`}>
      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-20 flex-col items-center justify-between border-r border-stone-200/60 bg-[#FAF8F3] py-6 shadow-sm">
        <div className="flex flex-col items-center gap-8 w-full">
          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden p-0.5">
            <Image
              src="/logo digitak grdasi.png"
              alt="Logo Digitak Studio"
              width={56}
              height={56}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <nav className="flex flex-col items-center gap-3 w-full px-3">
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20 transition">
              <LayoutDashboard size={22} />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl text-stone-500 opacity-80 hover:opacity-100 hover:bg-stone-200/60 hover:text-[#FF5500] transition">
              <FileText size={22} />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl text-stone-500 opacity-80 hover:opacity-100 hover:bg-stone-200/60 hover:text-[#FF5500] transition">
              <Home size={22} />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl text-stone-500 opacity-80 hover:opacity-100 hover:bg-stone-200/60 hover:text-[#FF5500] transition">
              <Box size={22} />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl text-stone-500 opacity-80 hover:opacity-100 hover:bg-stone-200/60 hover:text-[#FF5500] transition">
              <Users size={22} />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl text-stone-500 opacity-80 hover:opacity-100 hover:bg-stone-200/60 hover:text-[#FF5500] transition">
              <BarChart2 size={22} />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl text-stone-500 opacity-80 hover:opacity-100 hover:bg-stone-200/60 hover:text-[#FF5500] transition">
              <Package size={22} />
            </button>
          </nav>
        </div>

        <div className="flex flex-col items-center gap-4 w-full px-3">
          <button className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 opacity-80 hover:opacity-100 hover:bg-stone-200/60 hover:text-[#FF5500] transition">
            <User size={20} />
          </button>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            title="Log Out"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-500 opacity-80 hover:opacity-100 hover:bg-rose-100 transition"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="pl-20 w-full min-h-screen flex flex-col">
        {/* HEADER TOP BAR */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between bg-[#F8F6F0]/90 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Digitak Studio WMS
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-slate-500 hover:text-slate-800">
              <Bell size={20} />
            </button>
            <button className="text-slate-500 hover:text-slate-800">
              <Settings size={20} />
            </button>
            <button className="text-slate-500 hover:text-slate-800">
              <HelpCircle size={20} />
            </button>

            <div className="h-6 w-[1px] bg-stone-300" />

            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <p className="text-sm font-bold text-slate-900">
                  {user.name || user.email || "Andi Pratama"}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {formatRole(user.role) || "Supervisor"}
                </p>
              </div>
              <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm bg-orange-200 flex items-center justify-center font-bold text-orange-700">
                {user.name ? user.name.charAt(0) : "A"}
              </div>
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT BODY */}
        <main className="p-8 pt-2 max-w-[1600px] w-full mx-auto space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Dashboard
              </h2>
              <div className="mt-1 flex items-center gap-3 text-sm font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <User size={15} /> Supervisor: {user.name || user.email || "Andi Pratama"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock size={15} /> 24 Mei 2024, 10:45 WIB
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select className="appearance-none rounded-full border border-stone-300/80 bg-white px-5 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none cursor-pointer">
                  <option>Semua Gudang Saya</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              <div className="relative">
                <select className="appearance-none rounded-full border border-stone-300/80 bg-white px-5 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none cursor-pointer">
                  <option>Semua Project</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* 4 SUMMARY CARDS */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm border border-stone-100"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.iconBg}`}
                >
                  <item.icon size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    {item.label}
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* GRID UTAMA */}
          <div className="grid gap-6 xl:grid-cols-12">
            {/* KOLOM KIRI (8 COLS) */}
            <div className="xl:col-span-8 space-y-6">
              {/* AKSI MENUNGGU SECTION */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="text-orange-500" size={20} />
                  <h3 className="text-lg font-bold text-slate-900">
                    Aksi Menunggu
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {approvalCards.map((card) => (
                    <div
                      key={card.title}
                      className={`relative flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm border border-stone-100 ${card.accent}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <card.icon size={18} className="text-slate-400 mt-0.5" />
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${card.badgeTone}`}
                        >
                          {card.badge}
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="text-3xl font-black text-slate-900 tracking-tight">
                          {card.value}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-600 line-clamp-2">
                          {card.title}
                        </p>
                      </div>

                      {card.subBadge && (
                        <p className="mt-2 text-[11px] font-semibold text-rose-500">
                          {card.subBadge}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* TREN TRANSAKSI 7 HARI */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="text-orange-500" size={20} />
                    <h3 className="text-lg font-bold text-slate-900">
                      Tren Transaksi (7 Hari)
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    ~ 320 Total (+12%)
                  </span>
                </div>

                <div className="rounded-2xl bg-[#FDFCF9] p-6 border border-stone-100">
                  <div className="flex h-52 items-end justify-between gap-2 pt-8 px-4">
                    {chartData.map((d) => (
                      <div
                        key={d.day}
                        className="flex flex-1 flex-col items-center gap-3 h-full justify-end"
                      >
                        <div className="flex items-end gap-1.5 h-full w-full justify-center">
                          <div
                            style={{ height: `${d.inbound}%` }}
                            className="w-3.5 rounded-t-sm bg-sky-400/80 transition-all hover:bg-sky-500"
                          />
                          <div
                            style={{ height: `${d.outbound}%` }}
                            className="w-3.5 rounded-t-sm bg-orange-400 transition-all hover:bg-orange-500"
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-400">
                          {d.day}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-6 text-xs font-semibold text-slate-500 border-t border-stone-200/60 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-xs bg-sky-400/80" />
                      <span>Inbound</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-xs bg-orange-400" />
                      <span>Outbound</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* REKONSILIASI HARDWARE PROJECT */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Box className="text-orange-500" size={20} />
                    <h3 className="text-lg font-bold text-slate-900">
                      Rekonsiliasi Hardware Project
                    </h3>
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      name: "Project RW 05",
                      onSitePercent: 60,
                      usedPercent: 20,
                      remainsPercent: 20,
                      total: "450 Unit",
                    },
                    {
                      name: "Project Backbone JKT",
                      onSitePercent: 40,
                      usedPercent: 40,
                      remainsPercent: 20,
                      total: "1,200 Unit",
                    },
                    {
                      name: "Project Cluster Depok",
                      onSitePercent: 70,
                      usedPercent: 15,
                      remainsPercent: 15,
                      total: "320 Unit",
                    },
                  ].map((proj) => (
                    <div key={proj.name} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{proj.name}</span>
                        <span className="text-slate-400 font-semibold">{proj.total}</span>
                      </div>
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          style={{ width: `${proj.onSitePercent}%` }}
                          className="bg-emerald-700"
                        />
                        <div
                          style={{ width: `${proj.usedPercent}%` }}
                          className="bg-orange-500"
                        />
                        <div
                          style={{ width: `${proj.remainsPercent}%` }}
                          className="bg-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center gap-6 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
                    <span>On Site</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                    <span>Used</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <span>Remains</span>
                  </div>
                </div>
              </div>

              {/* TWO COLUMNS BOTTOM */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* MENUNGGU APPROVAL */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-900">
                        Menunggu Approval
                      </h3>
                      <button className="text-xs font-bold text-orange-500 hover:underline">
                        Lihat Semua
                      </button>
                    </div>

                    <div className="space-y-3">
                      {recentApprovals.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl bg-[#FAF8F3] p-3.5 border border-stone-100"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                                item.isOutbound
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-sky-100 text-sky-600"
                              }`}
                            >
                              {item.isOutbound ? (
                                <ArrowUpRight size={18} />
                              ) : (
                                <ArrowDownLeft size={18} />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-slate-900">
                                  {item.id}
                                </p>
                                {item.tag && (
                                  <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                                    {item.tag}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {item.direction} • {item.partner}
                              </p>
                            </div>
                          </div>

                          {item.status === "Review" ? (
                            <button className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-orange-600 transition">
                              Review
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              {item.status}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AKTIVITAS TERBARU */}
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                      Aktivitas Terbaru
                    </h3>
                    <button className="text-slate-400 hover:text-slate-600">
                      <SlidersHorizontal size={16} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-stone-100 text-slate-400 font-bold">
                          <th className="pb-2">Waktu</th>
                          <th className="pb-2">Aktivitas</th>
                          <th className="pb-2">Aktor</th>
                          <th className="pb-2 text-right">Hasil</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100/60 font-medium text-slate-700">
                        {latestActivities.map((act, i) => (
                          <tr key={i} className="hover:bg-stone-50/50">
                            <td className="py-2.5 text-slate-400 font-semibold">{act.time}</td>
                            <td className="py-2.5 font-semibold text-slate-800">
                              {act.activity}
                            </td>
                            <td className="py-2.5">{act.actor}</td>
                            <td className="py-2.5 text-right">
                              <span
                                className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold ${act.resultTone}`}
                              >
                                {act.result}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* KOLOM KANAN SIDEBAR (4 COLS) */}
            <div className="xl:col-span-4 space-y-6">
              {/* KONDISI GUDANG */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 space-y-6">
                <div className="flex items-center gap-2">
                  <Warehouse className="text-orange-500" size={20} />
                  <h3 className="text-lg font-bold text-slate-900">
                    Kondisi Gudang
                  </h3>
                </div>

                {/* Kecukupan Area Gauge */}
                <div className="rounded-xl bg-[#FAF8F3] p-4 border border-stone-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Kecukupan Area
                      </p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                          75%
                        </span>
                        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-600">
                          Mendekati Penuh
                        </span>
                      </div>
                    </div>
                    <div className="relative h-12 w-20 flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full border-4 border-stone-200 border-t-orange-500 border-r-orange-500 rotate-45" />
                    </div>
                  </div>
                </div>

                {/* Akurasi Stok */}
                <div className="rounded-xl bg-[#FAF8F3] p-4 border border-stone-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      Akurasi Stok
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-slate-900 tracking-tight">
                        99.2%
                      </span>
                      <span className="text-xs font-bold text-emerald-600">
                        ↑ 0.2%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-8">
                    <div className="w-1.5 h-4 bg-emerald-300 rounded-xs" />
                    <div className="w-1.5 h-6 bg-emerald-400 rounded-xs" />
                    <div className="w-1.5 h-8 bg-emerald-600 rounded-xs" />
                  </div>
                </div>

                {/* Status BOQ Circular Progress */}
                <div className="rounded-xl bg-[#FAF8F3] p-4 border border-stone-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">
                      Status BOQ
                    </p>
                    <div className="mt-2 space-y-1 text-xs font-bold text-slate-700">
                      <p className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-stone-400" />
                        15 Draft
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        28 Aktif
                      </p>
                    </div>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-orange-500 font-black text-slate-900 text-base">
                    43
                  </div>
                </div>
              </div>

              {/* GUDANG DADAKAN AKTIF */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 space-y-4">
                <div className="flex items-center gap-2">
                  <Radio className="text-orange-500" size={20} />
                  <h3 className="text-lg font-bold text-slate-900">
                    Gudang Dadakan Aktif
                  </h3>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-[#FAF8F3] p-5 space-y-4">
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-900">
                      Staging Site A
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      12 SKU Tersimpan
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-md bg-stone-200/70 px-2.5 py-1 text-slate-700">
                      Gudang Dadakan
                    </span>
                    <span className="rounded-md bg-orange-100 px-2.5 py-1 text-orange-700 flex items-center gap-1">
                      <Clock size={14} /> Aktif
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}