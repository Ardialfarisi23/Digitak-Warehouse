"use client";

import { Bell, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// DATA — ganti seluruh konstanta di bawah ini dengan fetch dari backend
// (Prisma/API route) sesuai skema Surat Jalan, BOQ, dan transaksi harian
// staf yang login. Struktur field sengaja dibuat mirror dari PRD supaya
// tinggal disambungkan.
// ---------------------------------------------------------------------------
const STAFF_NAME = "Budi";

const PERFORMANCE = {
  targetPercent: 75,
  completedTasks: 42,
  remainingTasks: 14,
};

const DAILY_QUOTA = {
  inbound: { label: "Inbound (Penerimaan)", done: 120, total: 200, unit: "Pallet" },
  outbound: { label: "Outbound (Pengiriman)", done: 85, total: 150, unit: "Order" },
};

const ZONE_STATUS = {
  warehouse: "Gudang A",
  zones: [
    { name: "Rak A", note: "Aman", tone: "safe" as const },
    { name: "Dock 1", note: "Padat", tone: "warning" as const, alert: true },
  ],
  transit: "Area Transit",
};

const RECENT_ACTIVITY = [
  { time: "10:45", activity: "Scan 5 Box Komponen (INB-092)", location: "Dock 2", status: "Selesai" },
  { time: "10:12", activity: "Putaway Pallet P-441 ke Rak", location: "Rak C-12", status: "Selesai" },
  { time: "09:30", activity: "Picking Order #OUT-8812", location: "Zona A", status: "Selesai" },
  { time: "08:00", activity: "Login Sistem / Mulai Shift", location: "Scanner #04", status: "Selesai" },
];

const NEXT_TASK = {
  title: "Picking: Surat Jalan #SJ-2023-991",
  description:
    "Tugas prioritas tinggi untuk pelanggan VIP. Diperlukan pengambilan 12 item berbeda.",
  startLocation: "Lorong B, Rak B-04",
  href: "/staff/outbound/SJ-2023-991",
};

// ---------------------------------------------------------------------------

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
      {children}
    </span>
  );
}

function PerformanceDonut({ percent }: { percent: number }) {
  return (
    <div
      className="relative flex h-40 w-40 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(#E8632C ${percent * 3.6}deg, #EFEFEF 0deg)`,
      }}
    >
      <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
        <span className="text-3xl font-bold text-gray-900">{percent}%</span>
        <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
          Target
        </span>
      </div>
    </div>
  );
}

function QuotaRow({
  label,
  done,
  total,
  unit,
  barColor,
}: {
  label: string;
  done: number;
  total: number;
  unit: string;
  barColor: string;
}) {
  const pct = Math.min(100, (done / total) * 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        <span className="text-sm text-gray-500">
          <span className="font-bold text-gray-900">{done}</span> / {total} {unit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export default function StaffDashboardPage() {
  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Selamat Datang, {STAFF_NAME}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Staf Gudang • Digitak WMS</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Sistem Live
        </span>
      </div>

      {/* Baris atas — 3 kolom */}
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Kinerja Hari Ini */}
        <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <p className="mb-6 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Kinerja Hari Ini
          </p>
          <div className="flex justify-center">
            <PerformanceDonut percent={PERFORMANCE.targetPercent} />
          </div>
          <div className="mt-6 flex justify-between text-sm">
            <div>
              <p className="text-gray-400">Selesai</p>
              <p className="font-bold text-gray-900">
                {PERFORMANCE.completedTasks} Tugas
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400">Sisa</p>
              <p className="font-bold text-gray-900">
                {PERFORMANCE.remainingTasks} Tugas
              </p>
            </div>
          </div>
        </div>

        {/* Kuota Harian */}
        <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <p className="mb-8 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Kuota Harian
          </p>
          <div className="flex h-32 flex-col justify-between">
            <QuotaRow
              label={DAILY_QUOTA.inbound.label}
              done={DAILY_QUOTA.inbound.done}
              total={DAILY_QUOTA.inbound.total}
              unit={DAILY_QUOTA.inbound.unit}
              barColor="#E8632C"
            />
            <QuotaRow
              label={DAILY_QUOTA.outbound.label}
              done={DAILY_QUOTA.outbound.done}
              total={DAILY_QUOTA.outbound.total}
              unit={DAILY_QUOTA.outbound.unit}
              barColor="#111827"
            />
          </div>
        </div>

        {/* Status Zona Live */}
        <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Status Zona Live
            </p>
            <span className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600">
              {ZONE_STATUS.warehouse}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ZONE_STATUS.zones.map((zone) => (
              <div
                key={zone.name}
                className={`relative rounded-xl p-4 ${
                  zone.tone === "safe" ? "bg-emerald-50" : "bg-orange-50"
                }`}
              >
                {zone.alert && (
                  <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-orange-500" />
                )}
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {zone.name}
                </p>
                <p
                  className={`mt-1 text-sm font-bold ${
                    zone.tone === "safe" ? "text-emerald-700" : "text-orange-700"
                  }`}
                >
                  {zone.note}
                </p>
              </div>
            ))}
            <div className="col-span-2 rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-500">
                {ZONE_STATUS.transit}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Baris bawah — 2/3 + 1/3 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Aktivitas Terkini */}
        <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Aktivitas Terkini
            </p>
            <a
              href="/staff/history"
              className="text-sm font-semibold text-[#E8632C] hover:underline"
            >
              Lihat Semua
            </a>
          </div>
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
              {RECENT_ACTIVITY.map((row, i) => (
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
            <h3 className="text-lg font-bold leading-snug">{NEXT_TASK.title}</h3>
            <p className="mt-2 text-sm text-gray-400">{NEXT_TASK.description}</p>

            <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <MapPin size={18} className="shrink-0 text-gray-400" />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500">
                  Mulai Dari
                </p>
                <p className="text-sm font-semibold">{NEXT_TASK.startLocation}</p>
              </div>
            </div>
          </div>

          <a
            href={NEXT_TASK.href}
            className="mt-6 flex h-auto items-center justify-center gap-2 rounded-xl bg-[#E8632C] py-3 text-sm font-semibold text-white hover:bg-[#D9591F]"
          >
            Mulai Tugas Berikutnya
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}