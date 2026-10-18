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

import { Boxes, ClipboardList, Truck } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const formatNumber = (value: number) => new Intl.NumberFormat("id-ID").format(value || 0);

type DashboardStats = {
  totalItems: number; activeBoq: number; draftBoq: number; pendingShipments: number; warehouses: number;
};
const defaultDashboardStats: DashboardStats = {
  totalItems: 0, activeBoq: 0, draftBoq: 0, pendingShipments: 0, warehouses: 0,
};

type KapasitasGudang = {
  gudang_id: string; nama_gudang: string; tipe: string; kapasitas_maksimum: number | null;
  total_qty_di_zona: number; total_qty_generic: number; sisa: number | null;
  status: "CUKUP" | "MENDEKATI_PENUH" | "TIDAK_CUKUP" | null;
  total_zona: number; total_zona_dengan_kapasitas: number;
};

type RecentBoq = {
  boq_id: number; boq_number: string; project: { nama_project: string; area?: string } | null;
  updated_at: string; status: string; status_verifikasi?: string;
};

type OutboundQueueItem = {
  surat_jalan_id: number; nomor_surat_jalan: string; tipe: string; status: string; created_at: string;
  project: { nama_project: string; area?: string } | null; gudang_tujuan: { nama_gudang: string } | null;
  items?: { qty: number }[];
};

type InboundListItem = OutboundQueueItem;

type DashboardKpiCardProps = {
  label: string; value: string; icon: React.ElementType; iconColor: string; note: string; noteColor: string; href?: string;
};

function KpiCard({ label, value, icon: Icon, iconColor, note, noteColor, href }: DashboardKpiCardProps) {
  const content = (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 transition-colors hover:border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wide text-slate-400">{label.toUpperCase()}</span>
        <span className="flex h-6 w-6 items-center justify-center rounded-md">
          <Icon size={13} strokeWidth={2.5} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs font-medium">{note}</div>
      {href && (
        <div className="mt-3 text-xs font-semibold text-orange-500 hover:text-orange-600">Review BOQ &rarr;</div>
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

function formatDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function getBoqStatusLabel(status: string, statusVerifikasi?: string) {
  const s = (status || "").toLowerCase();
  const v = (statusVerifikasi || "").toLowerCase();
  if (s === "draft" || v === "draft") return "Draft";
  if (s === "aktif") return "Aktif";
  if (s === "selesai") return "Selesai";
  if (s === "ditolak") return "Ditolak";
  if (s === "dihapus") return "Dihapus";
  return status || "-";
}

function DashboardPageContent() {
  const { get } = useApi();
  const router = useRouter();
  const { user } = useAuth();

  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isLoadingCapacity, setIsLoadingCapacity] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(defaultDashboardStats);
  const [recentBoqs, setRecentBoqs] = useState<RecentBoq[]>([]);
  const [outboundQueue, setOutboundQueue] = useState<OutboundQueueItem[]>([]);
  const [inboundList, setInboundList] = useState<InboundListItem[]>([]);
  const [kapasitasPerGudang, setKapasitasPerGudang] = useState<KapasitasGudang[]>([]);
  const [isLoadingRecon, setIsLoadingRecon] = useState(false);
  const [clusterReconciliation, setClusterReconciliation] = useState<ClusterReconciliation[]>([]);

  const fetchDashboardData = useCallback(async () => {
  try {
    setIsLoadingStats(true);
    const res = await get(`${API_BASE}/api/dashboard`);
    if (res.ok) {
      const json = await res.json();
      const data = json?.data || {};
      setDashboardStats({
        totalItems: Number(data.totalItems) || 0,
        activeBoq: Number(data.activeBoq) || 0,
        draftBoq: Number(data.draftBoq) || 0,
        pendingShipments: Number(data.pendingShipments) || 0,
        warehouses: Number(data.warehouses) || 0,
      });
      setKapasitasPerGudang(Array.isArray(data.kapasitas_per_gudang) ? data.kapasitas_per_gudang : []);
    }
  } catch (e) {
    // ignore
  } finally {
    setIsLoadingStats(false);
  }
}, [get]);

  const fetchClusterReconciliation = useCallback(async () => {
  try {
    setIsLoadingRecon(true);
    const res = await get(`${API_BASE}/api/reconciliation/inventory?groupBy=cluster`);
    if (res.ok) {
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      setClusterReconciliation(buildClusterReconciliation(data as any));
    }
  } catch (e) {
    // ignore
  } finally {
    setIsLoadingRecon(false);
  }
}, [get]);

  useEffect(() => {
    fetchDashboardData();
    fetchClusterReconciliation();
  }, [fetchDashboardData, fetchClusterReconciliation]);

  const greeting = "Selamat Pagi, Selamat Beraktivitas!";
  const kpiCards = [
    { label: 'Total Item Stok', value: formatNumber(dashboardStats.totalItems), icon: Boxes, iconColor: 'text-blue-500 bg-blue-50', note: "Tersebar di gudang aktif", noteColor: 'text-slate-400' },
    { label: 'BOQ Draft', value: formatNumber(dashboardStats.draftBoq), icon: ClipboardList, iconColor: 'text-amber-600 bg-amber-50', note: 'Menunggu verifikasi Admin General', noteColor: 'text-amber-600', href: '/dashboard/boq' },
    { label: 'BOQ Aktif', value: formatNumber(dashboardStats.activeBoq), icon: ClipboardList, iconColor: 'text-emerald-600 bg-emerald-50', note: 'Status Aktif', noteColor: 'text-slate-400' },
    { label: 'Surat Jalan Pending', value: formatNumber(dashboardStats.pendingShipments), icon: Truck, iconColor: 'text-orange-500 bg-orange-50', note: 'Menunggu konfirmasi Diterima/Didistribusikan', noteColor: 'text-orange-500', href: '/dashboard/delivery' },
  ];

  return (
    <div className='flex w-full min-h-screen flex-col bg-slate-50/50'>
      <main className='p-8 pt-6 max-w-[1600px] w-full mx-auto space-y-6'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-slate-900'>{greeting}</h1>
          <p className='text-sm text-slate-500 mt-1'>Ringkasan operasional gudang & BOQ</p>
        </div>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
  {kpiCards.map((card) => (
    <KpiCard key={card.label} {...card} value={card.value} />
  ))}
</div>
        <ClusterReconciliationSection clusters={clusterReconciliation} isLoading={isLoadingRecon} />
      </main>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const role = mapRole(user.role);
    if (role === 'supervisor') router.replace('/dashboard/supervisor');
    else if (role === 'staff') router.replace('/staff/dashboard');
  }, [router, user]);
  if (!user) return null;
  const role = mapRole(user.role);
  if (role !== 'admin') return null;
  return <DashboardPageContent />;
}













