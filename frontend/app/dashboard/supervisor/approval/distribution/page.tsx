"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Truck,
  Clock,
  CheckCircle2,
  X,
  MapPin,
  ChevronDown,
  Filter,
  PackageCheck,
  Info,
  Calendar,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Data Dummy Distribusi
const INITIAL_DUMMY_DISTRIBUTION = [
  {
    distribution_id: 301,
    nomor_surat_jalan: "SJ-DIST-2026-001",
    nama_proyek: "Project Jaringan Utama",
    gudang_asal: "Gudang Utama Jakarta",
    tujuan: "Site BTS Kebayoran Baru",
    kurir: "Ekspedisi Internal (Budi Santoso)",
    status: "siap_didistribusikan",
    estimasi_tiba: "13 Aug 2026, 17:00",
    catatan: "Perangkat kritikal untuk upgrade bandwidth backbone.",
    items: [
      { nama: "Router Cisco ISR 4331", qty: 1, unit: "unit", serial_number: "SN-CS-99211" },
      { nama: "Switch Huawei S5735", qty: 1, unit: "unit", serial_number: "SN-HW-11029" },
    ],
  },
  {
    distribution_id: 302,
    nomor_surat_jalan: "SJ-DIST-2026-002",
    nama_proyek: "Project Office Network",
    gudang_asal: "Gudang Cabang Bandung",
    tujuan: "Gedung Telkom Bandung Floor 3",
    kurir: "JNE Logistics (No Resi: JNE-8820192)",
    status: "sedang_dikirim",
    estimasi_tiba: "14 Aug 2026, 10:00",
    catatan: "Kabel dan kabel duct untuk penyambungan jaringan LAN internal.",
    items: [
      { nama: "Kabel UTP Cat6 Amp 305m", qty: 100, unit: "roll", serial_number: "-" },
      { nama: "RJ45 Connector Cat6", qty: 100, unit: "pcs", serial_number: "-" },
    ],
  },
  {
    distribution_id: 303,
    nomor_surat_jalan: "SJ-DIST-2026-003",
    nama_proyek: "Relokasi Perangkat Surabaya",
    gudang_asal: "Gudang Utama Jakarta",
    tujuan: "Gudang Transit Semarang",
    kurir: "Kurir Toko / Driver PT (Ahmad)",
    status: "terkirim",
    estimasi_tiba: "12 Aug 2026, 14:30",
    catatan: "Pengiriman telah sampai dan diterima oleh Petugas Gudang Semarang.",
    items: [
      { nama: "Access Point Aruba AP-505", qty: 5, unit: "unit", serial_number: "SN-AR-77810" },
    ],
  },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: any }
> = {
  siap_didistribusikan: {
    label: "Siap Didistribusikan",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: PackageCheck,
  },
  sedang_dikirim: {
    label: "Sedang Dikirim",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Truck,
  },
  terkirim: {
    label: "Diterima / Selesai",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
};

export default function SupervisorDistributionPage() {
  const [requests, setRequests] = useState<any[]>(INITIAL_DUMMY_DISTRIBUTION);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters & Search
  const [query, setQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modal State
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Metrics
  const metrics = useMemo(() => {
    const total = requests.length;
    const siap = requests.filter((r) => r.status === "siap_didistribusikan").length;
    const dikirim = requests.filter((r) => r.status === "sedang_dikirim").length;
    const selesai = requests.filter((r) => r.status === "terkirim").length;
    return { total, siap, dikirim, selesai };
  }, [requests]);

  // Filtered Data
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        !query.trim() ||
        r.nomor_surat_jalan?.toLowerCase().includes(query.toLowerCase()) ||
        r.nama_proyek?.toLowerCase().includes(query.toLowerCase()) ||
        r.tujuan?.toLowerCase().includes(query.toLowerCase());

      const matchStatus =
        selectedStatus === "all" || r.status === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [requests, query, selectedStatus]);

  // Handle Mark Received
  const handleMarkAsReceived = (id: number) => {
    setActionLoading(String(id));
    setTimeout(() => {
      setRequests((prev) =>
        prev.map((item) =>
          item.distribution_id === id ? { ...item, status: "terkirim" } : item
        )
      );
      setSelectedItem(null);
      setActionLoading(null);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/supervisor/approval"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-600">
                Supervisor Portal
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500">
                Logistik & Lintas Gudang
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Laporan & Konfirmasi Distribusi
            </h1>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Pengiriman</span>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics.total}
          </div>
          <p className="mt-1 text-xs text-slate-500">Dalam catatan logistik</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <span>Siap Kirim</span>
            <PackageCheck size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">
            {metrics.siap}
          </div>
          <p className="mt-1 text-xs text-blue-600/80">Menunggu pickup kurir</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold uppercase tracking-wider">
            <span>Sedang Transit</span>
            <Truck size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {metrics.dikirim}
          </div>
          <p className="mt-1 text-xs text-amber-600/80">Dalam perjalanan</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase tracking-wider">
            <span>Selesai / Diterima</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">
            {metrics.selesai}
          </div>
          <p className="mt-1 text-xs text-emerald-600/80">Konfirmasi terverifikasi</p>
        </div>
      </div>

      {/* Control Bar: Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-3 top-2.5 text-slate-400"
            size={18}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari No. SJ, Proyek, Tujuan..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Filter
              size={16}
              className="absolute left-3 top-3 text-slate-400 pointer-events-none"
            />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-auto appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-8 py-2 text-sm font-medium text-slate-700 focus:border-cyan-500 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="siap_didistribusikan">Siap Didistribusikan</option>
              <option value="sedang_dikirim">Sedang Dikirim</option>
              <option value="terkirim">Selesai / Diterima</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-3 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* List Cards */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
            <Truck className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Tidak ada data pengiriman distribusi ditemukan
            </p>
            <p className="text-xs text-slate-400">
              Ganti kata kunci atau pilih filter status lain.
            </p>
          </div>
        ) : (
          filteredRequests.map((r) => {
            const statusConfig =
              STATUS_CONFIG[r.status] || STATUS_CONFIG["siap_didistribusikan"];
            const StatusIcon = statusConfig.icon;
            const totalUnits = r.items?.reduce(
              (acc: number, item: any) => acc + item.qty,
              0
            );

            return (
              <div
                key={r.distribution_id}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info Utama */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        {r.nomor_surat_jalan}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusConfig.badgeClass}`}
                      >
                        <StatusIcon size={12} />
                        {statusConfig.label}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {r.nama_proyek}
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-slate-400" />
                        <span>
                          <strong className="text-slate-700">{r.gudang_asal}</strong> →{" "}
                          <strong className="text-slate-900">{r.tujuan}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <Truck size={14} className="text-slate-400" />
                        <span>{r.kurir}</span>
                      </div>
                    </div>

                    {/* Ringkasan Item */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {r.items?.length || 0} jenis item ({totalUnits} unit)
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-md">
                        {r.items
                          ?.map((i: any) => `${i.nama} (${i.qty} ${i.unit})`)
                          .join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedItem(r)}
                      className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold px-4"
                    >
                      Detail / Review
                    </Button>

                    {r.status !== "terkirim" && (
                      <Button
                        onClick={() => handleMarkAsReceived(r.distribution_id)}
                        disabled={actionLoading === String(r.distribution_id)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4"
                      >
                        {actionLoading === String(r.distribution_id)
                          ? "Memproses..."
                          : "Tandai Diterima"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Review Detail Distribusi */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono text-slate-400">
                  {selectedItem.nomor_surat_jalan}
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedItem.nama_proyek}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-5">
              {/* Timeline & Informasi Rute */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block mb-1">
                    Rute Pengiriman
                  </span>
                  <div className="space-y-1 text-slate-800 font-semibold">
                    <p>Asal: {selectedItem.gudang_asal}</p>
                    <p>Tujuan: {selectedItem.tujuan}</p>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block mb-1">
                    Logistik & Waktu
                  </span>
                  <div className="space-y-1 text-slate-800">
                    <p className="flex items-center gap-1">
                      <UserCheck size={13} className="text-slate-400" />
                      {selectedItem.kurir}
                    </p>
                    <p className="flex items-center gap-1">
                      <Calendar size={13} className="text-slate-400" />
                      Est. Tiba: {selectedItem.estimasi_tiba}
                    </p>
                  </div>
                </div>
              </div>

              {selectedItem.catatan && (
                <div className="rounded-2xl bg-blue-50/60 border border-blue-200/60 p-4 flex gap-3">
                  <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900">
                    <span className="font-semibold block mb-0.5">
                      Catatan Distribusi:
                    </span>
                    {selectedItem.catatan}
                  </div>
                </div>
              )}

              {/* Detail Barang */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Rincian Barang Dikirim
                </h4>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Nama Barang</th>
                        <th className="px-4 py-3 text-center">Jumlah</th>
                        <th className="px-4 py-3">Serial Number</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedItem.items?.map((it: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {it.nama}
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            {it.qty} {it.unit}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            {it.serial_number || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl border-slate-200 text-slate-700 text-xs font-semibold px-4"
              >
                Tutup
              </Button>
              {selectedItem.status !== "terkirim" && (
                <Button
                  onClick={() => handleMarkAsReceived(selectedItem.distribution_id)}
                  disabled={actionLoading === String(selectedItem.distribution_id)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5"
                >
                  Tandai Diterima
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}