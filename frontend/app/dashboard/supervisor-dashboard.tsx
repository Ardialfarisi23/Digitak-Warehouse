"use client";

import { ArrowDownLeft, ArrowUpRight, Box, CheckCircle2, Clock, FileText, Radio, SlidersHorizontal, Truck, User, Warehouse } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSupervisorDashboard } from "@/hooks/use-supervisor-dashboard";
import { getStatusBadgeClass, getStatusLabel, formatSisaCapacity } from "@/lib/capacity";
import { ConfirmModal } from "@/components/ConfirmModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("id-ID");
}

function formatStaleAge(iso: string | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diff = Date.now() - t;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam`;
  const days = Math.floor(hours / 24);
  return `${days} hr`;
}

export function SupervisorDashboard() {
  const { user } = useAuth();
  const currentSupervisorName = user?.name || user?.email || "Supervisor";
  const router = useRouter();

  const { selectedWarehouse, selectedProject, isLoading, approvalList, ticketReconciliation, metrics, queue, kapasitasPerGudang, currentTimeLabel, boqStats, activeBoqTickets, stagingSites, approveError, showDeactivatedModal, handleReturnToLogin } = useSupervisorDashboard();

  const [approvingId, setApprovingId] = useState<string | number | null>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);

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
                <Clock size={15} /> {currentTimeLabel || "Memuat…"}
              </span>
            </div>
          </div>
        </div>

        {/* GRID UTAMA (8 COLS KIRI / 4 COLS KANAN) */}
        <div className="grid gap-6 xl:grid-cols-12">
          {/* KOLOM KIRI (8 COLS) */}
          <div className="xl:col-span-8 space-y-6">
            {/* 2 SUMMARY CARDS */}
            <div className="grid grid-cols-2 gap-4 w-full">
              {[
                { label: "Total Perangkat", value: metrics.totalDevices, icon: Warehouse, iconBg: "bg-amber-100 text-amber-700" },
                { label: "Project Aktif", value: metrics.activeProjects, icon: FileText, iconBg: "bg-slate-100 text-slate-600" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.iconBg}`}>
                    <item.icon size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                    <p className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{formatNumber(item.value)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* AKSI & NOTIFIKASI MENUNGGU */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="text-orange-500" size={20} />
                <h3 className="text-lg font-bold text-slate-900">Antrean Aksi & Notifikasi</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {[
                  {
                    title: "Barang Masuk Menunggu Persetujuan",
                    value: queue.inboundPending,
                    badge: `Tertua: ${queue.inboundOldestLabel}`,
                    badgeTone: "bg-slate-100 text-slate-600",
                    accent: "border-l-4 border-l-amber-500",
                    icon: ArrowDownLeft,
                  },
                  {
                    title: "Barang Keluar Menunggu Persetujuan",
                    value: queue.outboundPending,
                    badge: queue.outboundCritical && queue.outboundCritical > 0 ? `Kritis! ${queue.outboundCritical}` : "Aman",
                    badgeTone: queue.outboundCritical && queue.outboundCritical > 0 ? "bg-rose-500 text-white font-bold" : "bg-slate-100 text-slate-600",
                    subBadge: `Tertua: ${queue.outboundOldestLabel}`,
                    accent: "border-l-4 border-l-rose-500",
                    icon: ArrowUpRight,
                  },
                  {
                    title: "Verifikasi Surat Jalan",
                    value: queue.suratJalanPending,
                    badge: `Tertua: ${queue.suratJalanOldestLabel}`,
                    badgeTone: "bg-slate-100 text-slate-600",
                    accent: "border-l-4 border-l-sky-500",
                    icon: Truck,
                  },
                ].map((card) => (
                  <div key={card.title} className={`relative flex flex-col justify-between rounded-2xl bg-white p-4 shadow-sm border border-stone-100 ${card.accent}`}>
                    <div className="flex items-start justify-between gap-2">
                      <card.icon size={18} className="text-slate-400 mt-0.5" />
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${card.badgeTone}`}>{card.badge}</span>
                    </div>

                    <div className="mt-4">
                      <p className="text-3xl font-black text-slate-900 tracking-tight">{formatNumber(card.value)}</p>
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
                {(selectedWarehouse !== "all" || selectedProject !== "all") && <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-[10px] font-extrabold">Data terfilter</span>}
              </div>

              <p className="text-xs text-slate-500 mb-6">Rincian material berdasarkan 5 komponen wajib PRD: BOQ Plan, Additional, MOS (Material on Site), Used, dan Remains.</p>

              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-sm font-semibold text-slate-400">Memuat data rekonsiliasi...</div>
              ) : (
                (() => {
                  const filtered = ticketReconciliation.filter((tkt) => activeBoqTickets.size === 0 || activeBoqTickets.has(tkt.ticketCode));
                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-sm font-semibold text-slate-400">
                        <span>Belum ada data rekonsiliasi untuk filter ini.</span>
                        <span className="text-[11px] font-medium text-slate-400 mt-1">Pilih &quot;Semua Gudang&quot; &amp; &quot;Semua Project&quot; untuk melihat semua tiket.</span>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filtered.map((tkt) => {
                        const maxVal = Math.max(1, tkt.boqPlan + tkt.additional);
                        const statusLabel = tkt.status === "sesuai" ? "Sesuai" : tkt.status === "perhatian" ? "Perhatian" : "Berjalan";
                        const statusTone = tkt.status === "sesuai" ? "bg-emerald-100 text-emerald-700" : tkt.status === "perhatian" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700";

                        const progressPercentage = tkt.boqPlan > 0 ? Math.min(Math.max((tkt.used / tkt.boqPlan) * 100, 0), 100) : 0;
                        const fallbackPercentage = tkt.boqPlan > 0 ? Math.min(Math.max((tkt.mos / tkt.boqPlan) * 100, 0), 100) : 0;
                        const displayPercentage = progressPercentage > 0 ? progressPercentage : fallbackPercentage;

                        return (
                          <div key={`${tkt.ticketCode}-${tkt.projectName}`} className="rounded-2xl border border-stone-100 bg-slate-50/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-slate-900">Kode Tiket: {tkt.ticketCode}</p>
                                <p className="text-[11px] font-semibold text-slate-500">
                                  {tkt.projectName} {tkt.items > 1 ? `• ${tkt.items} item` : ""}
                                </p>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusTone}`}>{statusLabel}</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                                <div style={{ width: `${displayPercentage}%` }} className={`h-full transition-all ${progressPercentage > 0 ? "bg-amber-500" : "bg-emerald-500/60"}`} title={`Realisasi: ${progressPercentage.toFixed(1)}%`} />
                              </div>
                            </div>
                            {progressPercentage === 0 && <p className="text-[10px] font-semibold text-slate-400">*Belum ada realisasi, menampilkan persentase MOS sebagai placeholder</p>}

                            <div className="grid grid-cols-5 gap-2 text-center text-[11px] font-semibold">
                              <div className="rounded-lg bg-white border border-stone-100 p-2">
                                <span className="block text-[10px] text-slate-400 mb-0.5">BOQ Plan</span>
                                <span className="text-slate-700">{tkt.boqPlan.toLocaleString("id-ID")}</span>
                              </div>
                              <div className="rounded-lg bg-white border border-stone-100 p-2">
                                <span className="block text-[10px] text-slate-400 mb-0.5">Additional</span>
                                <span className="text-slate-700">+{tkt.additional.toLocaleString("id-ID")}</span>
                              </div>
                              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2 text-emerald-800">
                                <span className="block text-[10px] text-emerald-600 mb-0.5">MOS</span>
                                <span>{tkt.mos.toLocaleString("id-ID")}</span>
                              </div>
                              <div className="rounded-lg bg-orange-50 border border-orange-100 p-2 text-orange-800">
                                <span className="block text-[10px] text-orange-600 mb-0.5">Used</span>
                                <span>{tkt.used.toLocaleString("id-ID")}</span>
                              </div>
                              <div className={`rounded-lg border p-2 ${tkt.remains < 0 ? "bg-rose-50 border-rose-200 text-rose-600 font-extrabold" : "bg-amber-50 border-amber-100 text-amber-800"}`}>
                                <span className="block text-[10px] mb-0.5">{tkt.remains < 0 ? "Remains" : "Remains"}</span>
                                <span>{tkt.remains.toLocaleString("id-ID")}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}

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
          </div>

          {/* KOLOM KANAN SIDEBAR (4 COLS) */}
          <div className="xl:col-span-4 space-y-6">
            {/* KONDISI GUDANG & STATUS BOQ */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 space-y-6">
              <div className="flex items-center gap-2">
                <Warehouse className="text-orange-500" size={20} />
                <h3 className="text-lg font-bold text-slate-900">Kondisi & Status Gudang</h3>
              </div>

              {/* Kecukupan Area Gudang */}
              <div className="rounded-xl bg-[#FAF8F3] p-4 border border-stone-100 space-y-2">
                <p className="text-xs font-semibold text-slate-500">Kecukupan Area Gudang</p>
                <div className="space-y-2">
                  {kapasitasPerGudang.length === 0 && <p className="text-[11px] text-slate-400">Belum ada data kapasitas.</p>}
                  {kapasitasPerGudang
                    .slice()
                    .sort((a, b) => {
                      const order: Record<string, number> = {
                        TIDAK_CUKUP: 0,
                        MENDEKATI_PENUH: 1,
                        CUKUP: 2,
                      };
                      return (order[a.status] ?? 99) - (order[b.status] ?? 99);
                    })
                    .map((w) => {
                      const badgeClass = getStatusBadgeClass(w.status);
                      const label = getStatusLabel(w.status);
                      const sisaText = formatSisaCapacity(w.sisa, w.kapasitas_maksimum);

                      return (
                        <Link href="/dashboard/supervisor/warehousespv" key={w.gudang_id} className="flex items-center justify-between rounded-lg border border-stone-100 bg-white px-3 py-2 transition hover:shadow-sm">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{w.nama_gudang}</p>
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>{label}</span>
                            {sisaText && <p className="mt-0.5 text-[10px] font-semibold text-slate-600">Sisa: {sisaText}</p>}
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </div>

              {/* Status BOQ */}
              <div className="rounded-xl bg-[#FAF8F3] p-4 border border-stone-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Status BOQ Overall</p>
                  <div className="mt-2 space-y-1 text-xs font-bold text-slate-700">
                    <p className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-stone-400" />
                      {formatNumber(boqStats.draft)} Draft
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      {formatNumber(boqStats.active)} Aktif
                    </p>
                  </div>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-orange-500 font-black text-slate-900 text-base">{formatNumber(boqStats.total)}</div>
              </div>
            </div>

            {/* VERIFIKASI APPROVAL */}
            <div className="w-full rounded-2xl bg-white p-6 shadow-sm border border-stone-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Verifikasi Approval</h3>
                  <Link className="text-sm font-semibold text-orange-500 hover:underline cursor-pointer" href="/dashboard/supervisor/approval">
                    Lihat Semua
                  </Link>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {approvalList.length === 0 ? (
                    <div className="rounded-xl bg-[#FAF8F3] p-4 border border-stone-100 text-center text-xs font-semibold text-slate-400">Tidak ada antrean approval saat ini.</div>
                  ) : (
                    (() => {
                      const filteredApprovals = approvalList.filter((item) => {
                        const status = (item.status || "").toLowerCase();
                        const isApproved = status === "disetujui";

                        if (!isApproved) {
                          return true;
                        }

                        const approvedDate = new Date((item as any).approvedAt || (item as any).updatedAt || Date.now());
                        const now = new Date();
                        const diffHours = (now.getTime() - approvedDate.getTime()) / (1000 * 60 * 60);

                        return diffHours <= 24;
                      });

                      if (filteredApprovals.length === 0) {
                        return <div className="rounded-xl bg-[#FAF8F3] p-4 border border-stone-100 text-center text-xs font-semibold text-slate-400">Tidak ada antrean approval saat ini.</div>;
                      }

                      return filteredApprovals.map((item) => {
                        const href = item.isOutbound ? `/dashboard/supervisor/delivery` : `/dashboard/supervisor/approval/inbound`;

                        return (
                          <Link key={item.id} href={href} className="flex items-center justify-between rounded-xl bg-[#FAF8F3] p-3.5 border border-stone-100 cursor-pointer hover:bg-stone-50 transition">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.isOutbound ? "bg-orange-100 text-orange-600" : "bg-sky-100 text-sky-600"}`}>
                                {item.isOutbound ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-slate-900">{item.rawId}</p>
                                  {item.tag && <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">{item.tag}</span>}
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">
                                  {item.direction} • {item.partner}
                                </p>
                              </div>
                            </div>

                            {item.status === "Menunggu" ? (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  router.push(href);
                                }}
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
                          </Link>
                        );
                      });
                    })()
                  )}
                  {approveError && <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-[11px] font-semibold text-rose-600">{approveError}</div>}
                </div>
              </div>
            </div>

            {/* GUDANG DADAKAN AKTIF */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 space-y-4">
              <div className="flex items-center gap-2">
                <Radio className="text-orange-500" size={20} />
                <h3 className="text-lg font-bold text-slate-900">Gudang Dadakan Aktif</h3>
              </div>

              {stagingSites.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-[#FAF8F3] p-5 text-center text-xs font-semibold text-slate-400">Belum ada gudang dadakan aktif.</div>
              ) : (
                <div className="space-y-3">
                  {stagingSites.slice(0, 5).map((site) => {
                    const isStale = site.createdAt && (Date.now() - new Date(site.createdAt).getTime()) / 3600000 >= 24;
                    return (
                      <div key={site.id} className="rounded-2xl border-2 border-dashed border-stone-200 bg-[#FAF8F3] p-5 space-y-4">
                        <div>
                          <h4 className="text-xl font-extrabold text-slate-900">{site.nama_gudang}</h4>
                          {site.tipe && <p className="text-xs font-semibold text-slate-500 mt-0.5">Tipe: {site.tipe}</p>}
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-bold">
                          <span className="rounded-md bg-stone-200/70 px-2.5 py-1 text-slate-700">Gudang Dadakan</span>
                          <span className={`rounded-md px-2.5 py-1 flex items-center gap-1 ${isStale ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"}`}>
                            <Clock size={12} /> {isStale ? `Belum Diupdate ${formatStaleAge(site.createdAt)}` : `Diupdate ${formatStaleAge(site.createdAt)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
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
