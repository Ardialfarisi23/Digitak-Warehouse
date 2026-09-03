"use client";

import { ArrowDownLeft, ArrowUpRight, Box, CheckCircle2, ChevronDown, Clock, FileText, Radio, ShieldAlert, SlidersHorizontal, Truck, User, Warehouse } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSupervisorDashboard } from "@/hooks/use-supervisor-dashboard";

// 1. Summary Cards Top
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
    icon: User,
    iconBg: "bg-orange-100 text-orange-600",
  },
];

// 2. Approval Cards & Action Alerts (Disesuaikan dengan Status Resmi PRD)
const approvalCards = [
  {
    title: "Barang Masuk Menunggu Approval",
    value: "14",
    badge: "Tertua: 1 hari",
    badgeTone: "bg-slate-100 text-slate-600",
    accent: "border-l-4 border-l-amber-500",
    icon: ArrowDownLeft,
    isApproval: true,
  },
  {
    title: "Barang Keluar Approval",
    value: "8",
    badge: "Kritis!",
    badgeTone: "bg-rose-500 text-white font-bold",
    subBadge: "Tertua: 3 jam",
    accent: "border-l-4 border-l-rose-500",
    icon: ArrowUpRight,
    isApproval: true,
  },
  {
    title: "Verifikasi Surat Jalan",
    value: "5",
    badge: "Tertua: 4 hari",
    badgeTone: "bg-slate-100 text-slate-600",
    accent: "border-l-4 border-l-sky-500",
    icon: Truck,
    isApproval: true,
  },
  {
    title: "Permintaan BOQ Baru (Admin)",
    value: "3",
    badge: "Read-Only Info",
    badgeTone: "bg-blue-100 text-blue-700 font-semibold",
    accent: "border-l-4 border-l-blue-500",
    icon: FileText,
    isApproval: false, // Notification Only
  },
  {
    title: "Discrepancy / Selisih Stok",
    value: "2",
    badge: "Tertua: 5 jam",
    badgeTone: "bg-rose-100 text-rose-600",
    accent: "border-l-4 border-l-rose-500",
    icon: ShieldAlert,
    isApproval: true,
  },
];

// 3. Data Rekonsiliasi Per Kode Tiket (5 Komponen Wajib)
const ticketReconciliation = [
  {
    ticketCode: "TKT-2024-001 (RW 05)",
    boqPlan: 500,
    additional: 50,
    mos: 200, // Material on Site
    used: 250, // Used
    remains: 100, // Remains
    totalUnit: "550 Unit Total",
  },
  {
    ticketCode: "TKT-2024-002 (Backbone JKT)",
    boqPlan: 1000,
    additional: 200,
    mos: 400,
    used: 600,
    remains: 200,
    totalUnit: "1,200 Unit Total",
  },
  {
    ticketCode: "TKT-2024-003 (Cluster Depok)",
    boqPlan: 300,
    additional: 20,
    mos: 150,
    used: 100,
    remains: 70,
    totalUnit: "320 Unit Total",
  },
];

export function SupervisorDashboard() {
  const { user } = useAuth();
  const currentSupervisorName = user?.name || user?.email || "Supervisor";

  const {
    selectedWarehouse,
    selectedProject,
    warehouses,
    projects,
    approvalList,
    activityLog,
    handleFilterChange,
    handleApprove,
  } = useSupervisorDashboard();

  return (
    <div className="flex w-full min-h-screen flex-col bg-slate-50/50">
      <main className="p-8 pt-6 max-w-[1600px] w-full mx-auto space-y-6">
        {/* TITLE & FILTER BAR */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard Operasional Supervisor</h2>
            <div className="mt-1 flex items-center gap-3 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <User size={15} /> Supervisor: {currentSupervisorName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock size={15} /> 24 Mei 2024, 10:45 WIB
              </span>
            </div>
          </div>

          {/* Filters Dropdown */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedWarehouse}
                onChange={(e) => handleFilterChange("warehouse", e.target.value)}
                className="appearance-none rounded-full border border-stone-300/80 bg-white px-5 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Gudang Saya</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nama_gudang}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={selectedProject}
                onChange={(e) => handleFilterChange("project", e.target.value)}
                className="appearance-none rounded-full border border-stone-300/80 bg-white px-5 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Project / Tiket</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_project} ({p.area})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 4 SUMMARY CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <div key={item.label} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.iconBg}`}>
                <item.icon size={22} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* GRID UTAMA (8 COLS KIRI / 4 COLS KANAN) */}
        <div className="grid gap-6 xl:grid-cols-12">
          {/* KOLOM KIRI (8 COLS) */}
          <div className="xl:col-span-8 space-y-6">
            {/* AKSI & NOTIFIKASI MENUNGGU */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="text-orange-500" size={20} />
                <h3 className="text-lg font-bold text-slate-900">Antrean Aksi & Notifikasi</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {approvalCards.map((card) => (
                  <div key={card.title} className={`relative flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm border border-stone-100 ${card.accent}`}>
                    <div className="flex items-start justify-between gap-2">
                      <card.icon size={18} className="text-slate-400 mt-0.5" />
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${card.badgeTone}`}>{card.badge}</span>
                    </div>

                    <div className="mt-4">
                      <p className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-600 line-clamp-2">{card.title}</p>
                    </div>

                    {card.subBadge && <p className="mt-2 text-[11px] font-semibold text-rose-500">{card.subBadge}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* REKONSILIASI HARDWARE PER KODE TIKET (5 KOMPONEN WAJIB) */}
            <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Box className="text-orange-500" size={20} />
                  <h3 className="text-lg font-bold text-slate-900">Rekonsiliasi Hardware per Kode Tiket</h3>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-6">Rincian material berdasarkan 5 komponen wajib PRD: BOQ Plan, Additional, MOS (Material on Site), Used, dan Remains.</p>

              <div className="space-y-6">
                {ticketReconciliation.map((tkt) => {
                  const maxVal = tkt.boqPlan + tkt.additional;
                  return (
                    <div key={tkt.ticketCode} className="space-y-2 border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between text-xs font-bold text-slate-800">
                        <span>Kode Tiket: {tkt.ticketCode}</span>
                        <span className="text-slate-400 font-semibold">{tkt.totalUnit}</span>
                      </div>

                      {/* Multicolored Progress Bar (5 Components Visual) */}
                      <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div style={{ width: `${(tkt.mos / maxVal) * 100}%` }} className="bg-emerald-600" title={`MOS: ${tkt.mos}`} />
                        <div style={{ width: `${(tkt.used / maxVal) * 100}%` }} className="bg-orange-500" title={`Used: ${tkt.used}`} />
                        <div style={{ width: `${(tkt.remains / maxVal) * 100}%` }} className="bg-amber-400" title={`Remains: ${tkt.remains}`} />
                      </div>

                      {/* Component Details Matrix */}
                      <div className="grid grid-cols-5 gap-2 pt-1 text-center text-[11px] font-semibold text-slate-600">
                        <div className="rounded bg-slate-50 p-1.5">
                          <span className="block text-[10px] text-slate-400">BOQ Plan</span>
                          {tkt.boqPlan}
                        </div>
                        <div className="rounded bg-slate-50 p-1.5">
                          <span className="block text-[10px] text-slate-400">Additional</span>+{tkt.additional}
                        </div>
                        <div className="rounded bg-emerald-50 text-emerald-800 p-1.5">
                          <span className="block text-[10px] text-emerald-600">MOS</span>
                          {tkt.mos}
                        </div>
                        <div className="rounded bg-orange-50 text-orange-800 p-1.5">
                          <span className="block text-[10px] text-orange-600">Used</span>
                          {tkt.used}
                        </div>
                        <div className="rounded bg-amber-50 text-amber-800 p-1.5">
                          <span className="block text-[10px] text-amber-600">Remains</span>
                          <span className={tkt.mos - (tkt.boqPlan + tkt.additional) < 0 ? "text-rose-600 font-bold" : ""}>
                            {tkt.mos - (tkt.boqPlan + tkt.additional)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend Bottom */}
              <div className="mt-6 flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-500 pt-3 border-t border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  <span>MOS (Material on Site)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <span>Used</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span>Remains</span>
                </div>
              </div>
            </div>

            {/* TWO COLUMNS BOTTOM: APPROVAL TABLE & LOG AKTIVITAS */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* MENUNGGU APPROVAL (STATUS PRD RESMI) */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Verifikasi Approval</h3>
                    <button className="text-xs font-bold text-orange-500 hover:underline">Lihat Semua</button>
                  </div>

                   <div className="space-y-3">
                     {approvalList.map((item) => (
                       <div key={item.id} className="flex items-center justify-between rounded-xl bg-[#FAF8F3] p-3.5 border border-stone-100">
                         <div className="flex items-center gap-3">
                           <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.isOutbound ? "bg-orange-100 text-orange-600" : "bg-sky-100 text-sky-600"}`}>
                             {item.isOutbound ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                           </div>
                           <div>
                             <div className="flex items-center gap-2">
                               <p className="text-xs font-bold text-slate-900">{item.id}</p>
                               {item.tag && <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">{item.tag}</span>}
                             </div>
                             <p className="text-[11px] text-slate-500 font-medium">
                               {item.direction} • {item.partner}
                             </p>
                           </div>
                         </div>

                         {item.status === "Menunggu" ? (
                           <button
                             onClick={() => handleApprove(item)}
                             className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-orange-600 transition"
                           >
                             Proses
                           </button>
                         ) : item.status === "Disetujui" ? (
                           <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                             <CheckCircle2 size={14} /> Disetujui
                           </span>
                         ) : (
                           <span className="text-xs font-bold text-rose-500">Ditolak</span>
                         )}
                       </div>
                     ))}
                   </div>
                </div>
              </div>

              {/* AKTIVITAS TERBARU */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Aktivitas Terbaru</h3>
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
                      {activityLog.map((act, i) => (
                        <tr key={i} className="hover:bg-stone-50/50">
                          <td className="py-2.5 text-slate-400 font-semibold">{act.time}</td>
                          <td className="py-2.5 font-semibold text-slate-800">{act.activity}</td>
                          <td className="py-2.5">{act.actor}</td>
                          <td className="py-2.5 text-right">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold ${act.resultTone}`}>{act.result}</span>
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
            {/* KONDISI GUDANG & STATUS BOQ */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 space-y-6">
              <div className="flex items-center gap-2">
                <Warehouse className="text-orange-500" size={20} />
                <h3 className="text-lg font-bold text-slate-900">Kondisi & Status Gudang</h3>
              </div>

              {/* Kecukupan Area (Badge Kategorikal + Label Manual) */}
              <div className="rounded-xl bg-[#FAF8F3] p-4 border border-stone-100 space-y-2">
                <p className="text-xs font-semibold text-slate-500">Kecukupan Area Gudang</p>
                <div className="flex items-center justify-between">
                  <span className="inline-block rounded-lg bg-amber-500 px-3 py-1 text-sm font-extrabold text-white">Mendekati Penuh</span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 pt-1 border-t border-stone-200/60">
                  Dinilai manual oleh <span className="font-bold text-slate-700">{currentSupervisorName}</span> pada <span className="font-bold text-slate-700">24 Mei 2024</span>
                </p>
              </div>

              {/* Status BOQ */}
              <div className="rounded-xl bg-[#FAF8F3] p-4 border border-stone-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Status BOQ Overall</p>
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
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-orange-500 font-black text-slate-900 text-base">43</div>
              </div>
            </div>

            {/* GUDANG DADAKAN AKTIF */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 space-y-4">
              <div className="flex items-center gap-2">
                <Radio className="text-orange-500" size={20} />
                <h3 className="text-lg font-bold text-slate-900">Gudang Dadakan Aktif</h3>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-[#FAF8F3] p-5 space-y-4">
                <div>
                  <h4 className="text-xl font-extrabold text-slate-900">Staging Site A</h4>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">12 SKU Tersimpan</p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-md bg-stone-200/70 px-2.5 py-1 text-slate-700">Gudang Dadakan</span>
                  <span className="rounded-md bg-orange-100 px-2.5 py-1 text-orange-700 flex items-center gap-1">
                    <Clock size={12} /> Belum Diupdate 3 hr
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
