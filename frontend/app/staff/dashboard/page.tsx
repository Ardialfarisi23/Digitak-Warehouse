"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, MapPin, ArrowRight, PackageCheck, Truck } from "lucide-react";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  getStatusBadgeClass,
  getStatusLabel,
  formatSisaCapacity,
} from "@/lib/capacity";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

const AKSI_LABEL: Record<string, string> = {
  create_inbound: "Buat Pengajuan Inbound",
  create_outbound: "Buat Pengajuan Outbound",
  receive_inbound: "Terima Inbound",
  approve_inbound: "Verifikasi Inbound",
  reject_inbound: "Tolak Inbound",
  approve_outbound: "Setujui Outbound",
  reject_outbound: "Tolak Outbound",
  putaway: "Putaway Barang",
  retrieve: "Picking Barang",
  confirm_distributed: "Konfirmasi Distribusi",
  create: "Buat Surat Jalan",
  update: "Perbarui Surat Jalan",
  delete: "Hapus Surat Jalan",
  approve: "Persetujuan",
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type ActivityRow = {
  time: string;
  activity: string;
  location: string;
  status: string;
};

function mapHistoryToActivity(item: {
  aksi: string;
  created_at: string;
  surat_jalan: {
    nomor_surat_jalan: string;
    tipe: string;
    status: string;
  } | null;
}): ActivityRow {
  const label = AKSI_LABEL[item.aksi] || item.aksi;
  const sj = item.surat_jalan;
  const sjRef = sj ? ` (${sj.nomor_surat_jalan})` : "";
  const location = sj?.tipe === "inbound" ? "Inbound" : sj?.tipe === "outbound" ? "Outbound" : "Sistem";
  const status = sj?.status ? sj.status.replace(/_/g, " ") : label;

  return {
    time: formatDateTime(item.created_at),
    activity: `${label}${sjRef}`,
    location,
    status,
  };
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
      {children}
    </span>
  );
}

type ZoneRow = {
  namaZona: string;
  kodeZona: string;
  statusKecukupan: string;
  kapasitasMaksimum: number | null;
  totalQty: number;
  sisa: number | null;
  dinilaiOleh: string | null;
  dinilaiPada: string | null;
};

type NextTaskRow = {
  suratJalanId: number | string;
  nomorSuratJalan: string;
  tipe: "inbound" | "outbound";
  status: string;
  created_at: string;
  gudangAsal?: string | null;
  gudangTujuan?: string | null;
  project?: string | null;
};

type MySubmissionRow = {
  suratJalanId: number | string;
  nomorSuratJalan: string;
  tipe: "inbound" | "outbound";
  status: string;
  created_at: string;
  gudangAsal?: string | null;
  gudangTujuan?: string | null;
  project?: string | null;
};

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

export default function StaffDashboardPage() {
  const { get } = useApi();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState<string | null>(null);
  const [staffGudangId, setStaffGudangId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showDeactivatedModal, setShowDeactivatedModal] = useState(false);
  const profilePollRef = useRef<number | null>(null);

  const [nextTask, setNextTask] = useState<NextTaskRow | null>(null);
  const [nextTaskLoading, setNextTaskLoading] = useState(true);
  const [nextTaskError, setNextTaskError] = useState<string | null>(null);

  const [inboundPendingCount, setInboundPendingCount] = useState(0);
  const [outboundPendingCount, setOutboundPendingCount] = useState(0);
  const [pendingCountsLoading, setPendingCountsLoading] = useState(true);
  const [pendingCountsError, setPendingCountsError] = useState<string | null>(null);

  const [mySubmissions, setMySubmissions] = useState<MySubmissionRow[]>([]);
  const [mySubmissionsLoading, setMySubmissionsLoading] = useState(true);
  const [mySubmissionsError, setMySubmissionsError] = useState<string | null>(null);

  const staffName = user?.name || user?.username || "Staf Gudang";

  useEffect(() => {
    async function loadProfile() {
      setProfileLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await get(`${baseUrl}/api/profile`);
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.message || "Gagal memuat profil.");
        }
        const json = await response.json();
        const data = json?.data ?? json;
        const gudangId = data?.gudang_id ? String(data.gudang_id) : null;
        setStaffGudangId(gudangId);
      } catch (err) {
        console.error("Gagal memuat profil staff:", err);
        setStaffGudangId(null);
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [get]);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    profilePollRef.current = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await fetch(`${baseUrl}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          const err = await response.json().catch(() => null);
          if (err?.code === "ACCOUNT_DEACTIVATED") {
            clearInterval(profilePollRef.current!);
            profilePollRef.current = null;
            setShowDeactivatedModal(true);
          }
        }
      } catch {
        // abaikan error polling
      }
    }, 15000);

    return () => {
      if (profilePollRef.current) {
        clearInterval(profilePollRef.current);
        profilePollRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    async function loadZones() {
      if (!staffGudangId) {
        setZones([]);
        setZonesLoading(false);
        return;
      }

      setZonesLoading(true);
      setZonesError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await get(
          `${baseUrl}/api/dashboard/warehouse-assessment?gudangId=${staffGudangId}`
        );
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.message || "Gagal memuat status zona.");
        }
        const json = await response.json();
        const data = json?.data ?? json;
        const list = Array.isArray(data) ? data : [];
        const mapped: ZoneRow[] = list.map((z: any) => ({
          namaZona: z.namaZona || z.kodeZona || "-",
          kodeZona: z.kodeZona || "-",
          statusKecukupan: z.statusKecukupan || "CUKUP",
          kapasitasMaksimum: z.kapasitasMaksimum ?? null,
          totalQty: Number(z.totalQty ?? 0),
          sisa: z.sisa ?? null,
          dinilaiOleh: z.dinilaiOleh ?? null,
          dinilaiPada: z.dinilaiPada ?? null,
        }));
        setZones(mapped);
      } catch (err) {
        setZonesError(err instanceof Error ? err.message : "Terjadi kesalahan.");
        setZones([]);
      } finally {
        setZonesLoading(false);
      }
    }

    loadZones();
  }, [get, staffGudangId]);

  useEffect(() => {
    async function loadActivities() {
      setActivitiesLoading(true);
      setActivitiesError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await get(
          `${baseUrl}/api/surat-jalan/staff/history?page=1&pageSize=5`
        );
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.message || "Gagal memuat aktivitas terkini.");
        }
        const json = await response.json();
        const data = json?.data ?? json;
        const items = Array.isArray(data?.items) ? data.items : [];
        const mapped = items.map(mapHistoryToActivity);
        setActivities(mapped);
      } catch (err) {
        setActivitiesError(err instanceof Error ? err.message : "Terjadi kesalahan.");
        setActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    }

    loadActivities();
  }, [get]);

  useEffect(() => {
    async function loadNextTask() {
      if (!staffGudangId) {
        setNextTask(null);
        setNextTaskLoading(false);
        return;
      }

      setNextTaskLoading(true);
      setNextTaskError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

        const [outboundRes, inboundRes] = await Promise.all([
          get(
            `${baseUrl}/api/surat-jalan/outbound/queue?gudangTujuanId=${staffGudangId}&status=disetujui`
          ),
          get(
            `${baseUrl}/api/surat-jalan/inbound?gudangTujuanId=${staffGudangId}&status=ready_putaway`
          ),
        ]);

        const outboundCandidates: NextTaskRow[] = [];
        const inboundCandidates: NextTaskRow[] = [];

        if (outboundRes.ok) {
          const outboundJson = await outboundRes.json();
          const outboundData = outboundJson?.data ?? outboundJson ?? [];
          const outboundList = Array.isArray(outboundData) ? outboundData : [];
          for (const sj of outboundList) {
            outboundCandidates.push({
              suratJalanId: sj.surat_jalan_id,
              nomorSuratJalan: sj.nomor_surat_jalan,
              tipe: "outbound",
              status: sj.status,
              created_at: sj.created_at,
              gudangAsal: sj.gudang_asal?.nama_gudang || null,
              gudangTujuan: sj.gudang_tujuan?.nama_gudang || null,
              project: sj.project?.nama_project || null,
            });
          }
        }

        if (inboundRes.ok) {
          const inboundJson = await inboundRes.json();
          const inboundData = inboundJson?.data ?? inboundJson ?? [];
          const inboundList = Array.isArray(inboundData) ? inboundData : [];
          for (const sj of inboundList) {
            inboundCandidates.push({
              suratJalanId: sj.surat_jalan_id,
              nomorSuratJalan: sj.nomor_surat_jalan,
              tipe: "inbound",
              status: sj.status,
              created_at: sj.created_at,
              gudangAsal: sj.gudang_asal?.nama_gudang || null,
              gudangTujuan: sj.gudang_tujuan?.nama_gudang || null,
              project: sj.project?.nama_project || null,
            });
          }
        }

        const allCandidates = [...outboundCandidates, ...inboundCandidates];
        if (allCandidates.length === 0) {
          setNextTask(null);
          return;
        }

        allCandidates.sort((a, b) => {
          const aTime = new Date(a.created_at).getTime();
          const bTime = new Date(b.created_at).getTime();
          return aTime - bTime;
        });

        setNextTask(allCandidates[0]);
      } catch (err) {
        setNextTaskError(err instanceof Error ? err.message : "Terjadi kesalahan.");
        setNextTask(null);
      } finally {
        setNextTaskLoading(false);
      }
    }

    loadNextTask();
  }, [get, staffGudangId]);

  useEffect(() => {
    async function loadPendingCounts() {
      if (!staffGudangId) {
        setInboundPendingCount(0);
        setOutboundPendingCount(0);
        setPendingCountsLoading(false);
        return;
      }

      setPendingCountsLoading(true);
      setPendingCountsError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const [inboundRes, outboundRes] = await Promise.all([
          get(
            `${baseUrl}/api/surat-jalan/inbound?gudangTujuanId=${staffGudangId}&status=ready_putaway`
          ),
          get(
            `${baseUrl}/api/surat-jalan/outbound/queue?gudangTujuanId=${staffGudangId}&status=disetujui`
          ),
        ]);

        let inboundCount = 0;
        let outboundCount = 0;

        if (inboundRes.ok) {
          const inboundJson = await inboundRes.json();
          const inboundData = inboundJson?.data ?? inboundJson ?? [];
          const inboundList = Array.isArray(inboundData) ? inboundData : [];
          inboundCount = inboundList.length;
        }

        if (outboundRes.ok) {
          const outboundJson = await outboundRes.json();
          const outboundData = outboundJson?.data ?? outboundJson ?? [];
          const outboundList = Array.isArray(outboundData) ? outboundData : [];
          outboundCount = outboundList.length;
        }

        setInboundPendingCount(inboundCount);
        setOutboundPendingCount(outboundCount);
      } catch (err) {
        setPendingCountsError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      } finally {
        setPendingCountsLoading(false);
      }
    }

    loadPendingCounts();
  }, [get, staffGudangId]);

  useEffect(() => {
    async function loadMySubmissions() {
      setMySubmissionsLoading(true);
      setMySubmissionsError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await get(
          `${baseUrl}/api/surat-jalan/staff/history?page=1&pageSize=5`
        );
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.message || "Gagal memuat pengajuan Anda.");
        }
        const json = await response.json();
        const data = json?.data ?? json;
        const items = Array.isArray(data?.items) ? data.items : [];
        const mapped: MySubmissionRow[] = items
          .filter((item: any) => item.surat_jalan)
          .map((item: any) => {
            const sj = item.surat_jalan;
            return {
              suratJalanId: sj.surat_jalan_id,
              nomorSuratJalan: sj.nomor_surat_jalan,
              tipe: sj.tipe === "inbound" ? "inbound" : "outbound",
              status: sj.status,
              created_at: item.created_at,
              gudangAsal: sj.gudang_asal?.nama_gudang || null,
              gudangTujuan: sj.gudang_tujuan?.nama_gudang || null,
              project: sj.project?.nama_project || null,
            };
          });
        setMySubmissions(mapped);
      } catch (err) {
        setMySubmissionsError(err instanceof Error ? err.message : "Terjadi kesalahan.");
        setMySubmissions([]);
      } finally {
        setMySubmissionsLoading(false);
      }
    }

    loadMySubmissions();
  }, [get]);

  const getTaskHref = (task: NextTaskRow | null): string => {
    if (!task) return "#";
    if (task.tipe === "inbound") {
      return `/staff/putaway/${task.suratJalanId}`;
    }
    return `/staff/outbound/${task.suratJalanId}`;
  };

  const getTaskLabel = (task: NextTaskRow | null): string => {
    if (!task) return "";
    if (task.tipe === "inbound") {
      return `Putaway: ${task.nomorSuratJalan}`;
    }
    return `Picking: ${task.nomorSuratJalan}`;
  };

  const getTaskDescription = (task: NextTaskRow | null): string => {
    if (!task) return "";
    const parts = [];
    if (task.project) parts.push(task.project);
    if (task.gudangAsal) parts.push(`Dari ${task.gudangAsal}`);
    if (task.gudangTujuan && task.tipe === "inbound") parts.push(`Ke ${task.gudangTujuan}`);
    const statusLabel = task.status.replace(/_/g, " ");
    parts.push(`Status: ${statusLabel}`);
    return parts.join(" • ");
  };

  const getStartLocation = (task: NextTaskRow | null): string => {
    if (!task) return "-";
    if (task.tipe === "inbound") {
      return task.gudangTujuan || task.gudangAsal || "Gudang";
    }
    return task.gudangAsal || task.gudangTujuan || "Gudang";
  };

  const getSubmissionBadgeClass = (status: string): string => {
    switch (status) {
      case "disetujui":
        return "bg-emerald-50 text-emerald-600";
      case "ditolak":
        return "bg-rose-50 text-rose-600";
      case "ready_putaway":
        return "bg-blue-50 text-blue-600";
      case "sedang_dikirim":
        return "bg-amber-50 text-amber-600";
      case "diterima_didistribusikan":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-amber-50 text-amber-600";
    }
  };

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Selamat Datang, {staffName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Staf Gudang • Digitak WMS</p>
      </div>

      {/* KPI Row — Antrean Barang Masuk & Keluar */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/staff/putaway"
          className="rounded-2xl border border-[#F3D9C7] bg-white p-4 transition-colors hover:border-slate-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wide text-slate-400">
              BARANG MASUK MENUNGGU PUTAWAY
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md text-orange-500 bg-orange-50">
              <PackageCheck size={13} strokeWidth={2.5} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {pendingCountsLoading ? "..." : inboundPendingCount}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-400">
            {pendingCountsLoading ? "Memuat..." : inboundPendingCount === 1 ? "Unit menunggu" : "Unit menunggu"}
          </div>
        </Link>

        <Link
          href="/staff/outbound"
          className="rounded-2xl border border-[#F3D9C7] bg-white p-4 transition-colors hover:border-slate-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wide text-slate-400">
              BARANG KELUAR SIAP DIPROSES
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-md text-blue-500 bg-blue-50">
              <Truck size={13} strokeWidth={2.5} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {pendingCountsLoading ? "..." : outboundPendingCount}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-400">
            {pendingCountsLoading ? "Memuat..." : outboundPendingCount === 1 ? "Unit siap picking" : "Unit siap picking"}
          </div>
        </Link>
      </div>

      {/* Baris atas — Status Zona Live */}
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-1">
        {/* Status Zona Live */}
        <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Status Zona Live
            </p>
            <span className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600">
              {profileLoading
                ? "Memuat..."
                : staffGudangId
                  ? `Gudang #${staffGudangId}`
                  : "Belum ditugaskan"}
            </span>
          </div>

          {profileLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E8632C]" />
            </div>
          ) : !staffGudangId ? (
            <div className="py-6 text-center text-sm text-gray-500">
              Anda belum ditugaskan ke gudang manapun. Hubungi Admin.
            </div>
          ) : zonesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E8632C]" />
            </div>
          ) : zonesError ? (
            <p className="py-6 text-center text-sm text-red-600">{zonesError}</p>
          ) : zones.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Belum ada data zona untuk gudang Anda.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {zones.map((zone) => (
                <div
                  key={zone.kodeZona}
                  className="rounded-xl border border-slate-100 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {zone.namaZona}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(
                        zone.statusKecukupan
                      )}`}
                    >
                      {getStatusLabel(zone.statusKecukupan)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {formatSisaCapacity(zone.sisa, zone.kapasitasMaksimum) || (
                      <span className="text-gray-400">Kapasitas belum diatur</span>
                    )}
                  </div>
                  {zone.dinilaiOleh && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      Dinilai oleh {zone.dinilaiOleh}
                      {zone.dinilaiPada
                        ? ` pada ${new Date(zone.dinilaiPada).toLocaleDateString("id-ID")}`
                        : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Baris bawah — 2/3 + 1/3 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Aktivitas Terkini */}
        <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Aktivitas Terkini
          </p>
          {activitiesLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#E8632C]" />
            </div>
          ) : activitiesError ? (
            <p className="py-10 text-center text-sm text-red-600">{activitiesError}</p>
          ) : activities.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              Belum ada aktivitas tercatat untuk akun Anda.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-3 font-semibold">Waktu</th>
                  <th className="pb-3 font-semibold">Aktivitas</th>
                  <th className="pb-3 font-semibold">Lokasi</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 last:border-0 hover:bg-[#FDECE1]/30"
                  >
                    <td className="py-3 pr-4 text-gray-500">{row.time}</td>
                    <td className="py-3 pr-4 font-medium text-gray-800">
                      {row.activity}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{row.location}</td>
                    <td className="py-3">
                      <StatusBadge>{row.status}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Tugas Prioritas Berikutnya */}
        <div className="flex flex-col justify-between rounded-2xl bg-gray-900 p-6 text-white">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Tugas Prioritas Berikutnya
              </p>
              <Bell size={18} className="text-[#E8632C]" />
            </div>

            {profileLoading || nextTaskLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E8632C]" />
              </div>
            ) : nextTaskError ? (
              <p className="py-6 text-center text-sm text-red-400">{nextTaskError}</p>
            ) : !staffGudangId ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Anda belum ditugaskan ke gudang manapun. Hubungi Admin.
              </p>
            ) : !nextTask ? (
              <p className="py-6 text-center text-sm text-gray-400">
                Tidak ada tugas mendesak saat ini.
              </p>
            ) : (
              <>
                <h3 className="text-lg font-bold leading-snug">{getTaskLabel(nextTask)}</h3>
                <p className="mt-2 text-sm text-gray-400">{getTaskDescription(nextTask)}</p>

                <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/5 p-3">
                  <MapPin size={18} className="shrink-0 text-gray-400" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">
                      Mulai Dari
                    </p>
                    <p className="text-sm font-semibold">{getStartLocation(nextTask)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {nextTask && (
            <a
              href={getTaskHref(nextTask)}
              className="mt-6 flex h-auto items-center justify-center gap-2 rounded-xl bg-[#E8632C] py-3 text-sm font-semibold text-white hover:bg-[#D9591F]"
            >
              Mulai Tugas Berikutnya
              <ArrowRight size={16} />
            </a>
          )}
        </div>
      </div>

      {/* Pengajuan Saya */}
      <div className="mt-6 rounded-2xl border border-[#F3D9C7] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Pengajuan Saya
        </p>
        {mySubmissionsLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#E8632C]" />
          </div>
        ) : mySubmissionsError ? (
          <p className="py-10 text-center text-sm text-red-600">{mySubmissionsError}</p>
        ) : mySubmissions.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            Anda belum pernah mengajukan surat jalan.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {mySubmissions.map((submission, i) => (
              <Link
                key={i}
                href={
                  submission.tipe === "inbound"
                    ? `/staff/inbound/${submission.suratJalanId}`
                    : `/staff/outbound/${submission.suratJalanId}`
                }
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3 transition-colors hover:border-slate-200"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {submission.nomorSuratJalan}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getSubmissionBadgeClass(
                        submission.status
                      )}`}
                    >
                      {submission.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {submission.tipe === "inbound" ? "Inbound" : "Outbound"}
                    {submission.gudangTujuan ? ` • ${submission.gudangTujuan}` : ""}
                  </div>
                </div>
                <div className="ml-3 text-xs text-gray-400">
                  {formatDateTime(submission.created_at)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={showDeactivatedModal}
        onConfirm={() => {
          logout();
          router.push("/login");
        }}
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
