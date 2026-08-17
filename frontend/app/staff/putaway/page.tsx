"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, PackagePlus } from "lucide-react";
import { getAllPutawayTasks, PutawayTask } from "@/lib/staff/putaway-store";

export default function PutawayListPage() {
  const [tasks, setTasks] = useState<PutawayTask[]>([]);
  const [activeTab, setActiveTab] = useState<"MENUNGGU_PUTAWAY" | "SELESAI">(
    "MENUNGGU_PUTAWAY"
  );

  // TODO: ganti jadi fetch("/api/putaway") begitu backend siap.
  useEffect(() => {
    setTasks(getAllPutawayTasks());
  }, []);

  const filtered = tasks.filter((t) => t.status === activeTab);

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Lokasi & Rak (Putaway)</h1>
        <p className="mt-1 text-sm text-gray-500">
          Barang yang sudah diverifikasi Supervisor dan siap ditempatkan ke rak
        </p>
      </div>

      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setActiveTab("MENUNGGU_PUTAWAY")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "MENUNGGU_PUTAWAY"
              ? "bg-[#E8632C] text-white"
              : "border border-[#F3D9C7] bg-white text-gray-600 hover:bg-[#FDECE1]"
          }`}
        >
          Menunggu Ditempatkan
        </button>
        <button
          onClick={() => setActiveTab("SELESAI")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "SELESAI"
              ? "bg-[#E8632C] text-white"
              : "border border-[#F3D9C7] bg-white text-gray-600 hover:bg-[#FDECE1]"
          }`}
        >
          Sudah Ditempatkan
        </button>
      </div>

      <div className="rounded-2xl border border-[#F3D9C7] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-6 py-4 font-semibold">Barang</th>
              <th className="px-6 py-4 font-semibold">Asal Surat Jalan</th>
              <th className="px-6 py-4 font-semibold">Qty</th>
              <th className="px-6 py-4 font-semibold">Kondisi</th>
              <th className="px-6 py-4 font-semibold">Gudang Tujuan</th>
              {activeTab === "SELESAI" && (
                <th className="px-6 py-4 font-semibold">Gudang & Zona</th>
              )}
              <th className="px-6 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-[#FDECE1]/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 font-medium text-gray-800">
                    <MapPin size={16} className="text-[#E8632C]" />
                    {t.namaBarang}
                  </div>
                  <p className="ml-6 text-xs text-gray-400">{t.kodeBarang}</p>
                  {t.isKelebihan && (
                    <span className="ml-6 mt-1 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#E8632C]">
                      <PackagePlus size={10} />
                      Kelebihan Barang
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-600">{t.sourceNomor}</td>
                <td className="px-6 py-4 text-gray-600">{t.qty} unit</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                    {t.kondisi}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{t.gudangTujuan}</td>
                {activeTab === "SELESAI" && (
                  <td className="px-6 py-4 font-medium text-gray-800">
                    {t.gudangPenyimpanan}
                    <p className="text-xs font-normal text-gray-400">{t.zonaPenyimpanan}</p>
                  </td>
                )}
                <td className="px-6 py-4 text-right">
                  {t.status === "MENUNGGU_PUTAWAY" ? (
                    <Link
                      href={`/staff/putaway/${t.id}`}
                      className="text-sm font-semibold text-[#E8632C] hover:underline"
                    >
                      Tempatkan
                    </Link>
                  ) : (
                    <Link
                      href={`/staff/putaway/${t.id}`}
                      className="text-sm font-semibold text-gray-500 hover:underline"
                    >
                      Lihat
                    </Link>
                  )}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={activeTab === "SELESAI" ? 7 : 6}
                  className="px-6 py-12 text-center text-gray-400"
                >
                  {activeTab === "MENUNGGU_PUTAWAY"
                    ? "Tidak ada barang yang menunggu ditempatkan."
                    : "Belum ada riwayat penempatan."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}