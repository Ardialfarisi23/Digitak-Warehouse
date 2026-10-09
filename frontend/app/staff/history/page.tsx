"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface HistoryItem {
  audit_id: number | string;
  aksi: string;
  created_at: string;
  surat_jalan: {
    surat_jalan_id: number | string;
    nomor_surat_jalan: string;
    tipe: string;
    status: string;
    tanggal: string;
  } | null;
}

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

function formatDateTime(iso: string) {
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

function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "safe" | "warning" | "neutral" }) {
  const palette =
    tone === "safe"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-orange-50 text-orange-700"
        : "bg-slate-50 text-slate-600";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${palette}`}>
      {children}
    </span>
  );
}

export default function StaffHistoryPage() {
  const router = useRouter();
  const { get } = useApi();
  const { user } = useAuth();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await get(`${baseUrl}/api/surat-jalan/staff/history?page=${page}&pageSize=${pageSize}`);
        if (!response.ok) {
          const err = await response.json().catch(() => null);
          throw new Error(err?.message || "Gagal memuat riwayat aktivitas.");
        }
        const json = await response.json();
        const data = json?.data ?? json;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotal(Number(data?.total ?? 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
        setItems([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [get, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="px-8 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/staff/dashboard")}
            className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} />
            Kembali ke Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Riwayat Aktivitas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar transaksi yang pernah ditangani oleh {user?.name || user?.username || "staf ini"}.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          Total: {total} aktivitas
        </span>
      </div>

      <div className="rounded-2xl border border-[#F3D9C7] bg-white p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#E8632C]" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            Belum ada aktivitas tercatat untuk akun Anda.
          </p>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 md:hidden">
              {items.map((row) => {
                const sj = row.surat_jalan;
                const waktu = formatDateTime(row.created_at);
                const aksi = AKSI_LABEL[row.aksi] || row.aksi;
                const tipeTone = sj?.tipe === "inbound" ? "safe" : sj?.tipe === "outbound" ? "warning" : "neutral";
                const statusTone = sj?.status === "ditolak" ? "warning" : "neutral";
                const targetHref =
                  sj?.tipe === "outbound"
                    ? `/staff/outbound/${sj?.surat_jalan_id}`
                    : sj?.tipe === "inbound"
                      ? `/staff/putaway/${sj?.surat_jalan_id}`
                      : null;

                return (
                  <Link
                    key={`card-${row.audit_id}`}
                    href={targetHref || "#"}
                    className={`block rounded-xl border border-[#F3D9C7] bg-white p-4 ${targetHref ? "hover:bg-[#FDECE1]/30" : "opacity-70"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">{aksi}</p>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tipeTone === "safe" ? "bg-emerald-50 text-emerald-700" : tipeTone === "warning" ? "bg-orange-50 text-orange-700" : "bg-slate-50 text-slate-600"}`}>
                        {sj?.tipe || "—"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-gray-600">
                      <p><span className="text-gray-400">Waktu:</span> {waktu}</p>
                      <p><span className="text-gray-400">Nomor SJ:</span> {sj?.nomor_surat_jalan || "Surat jalan sudah dihapus"}</p>
                      <p><span className="text-gray-400">Status:</span> {sj?.status?.replace(/_/g, " ") || "—"}</p>
                    </div>
                    {targetHref && (
                      <div className="mt-3 flex min-h-11 items-center justify-center rounded-lg bg-[#E8632C] text-sm font-semibold text-white hover:bg-[#D9591F]">
                        Lihat Detail
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto overscroll-x-contain">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="pb-3 font-semibold">Waktu</th>
                <th className="pb-3 font-semibold">Aksi</th>
                <th className="pb-3 font-semibold">Tipe</th>
                <th className="pb-3 font-semibold">Nomor Surat Jalan</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const sj = row.surat_jalan;
                return (
                  <tr key={String(row.audit_id)} className="border-b border-gray-50 last:border-0 hover:bg-[#FDECE1]/30">
                    <td className="py-3 pr-4 text-gray-500">{formatDateTime(row.created_at)}</td>
                    <td className="py-3 pr-4 font-medium text-gray-800">
                      {AKSI_LABEL[row.aksi] || row.aksi}
                    </td>
                    <td className="py-3 pr-4">
                      {sj ? (
                        <StatusBadge tone={sj.tipe === "inbound" ? "safe" : "warning"}>
                          {sj.tipe}
                        </StatusBadge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {sj ? (
                        <button
                          onClick={() =>
                            router.push(
                              sj.tipe === "outbound"
                                ? `/staff/outbound/${sj.surat_jalan_id}`
                                : `/staff/putaway/${sj.surat_jalan_id}`,
                            )
                          }
                          className="font-semibold text-[#E8632C] hover:underline"
                        >
                          {sj.nomor_surat_jalan}
                        </button>
                      ) : (
                        <span className="text-gray-400">Surat jalan sudah dihapus</span>
                      )}
                    </td>
                    <td className="py-3">
                      {sj ? (
                        <StatusBadge tone={sj.status === "ditolak" ? "warning" : "neutral"}>
                          {sj.status.replace(/_/g, " ")}
                        </StatusBadge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
             </tbody>
           </table>
           </div>
         </>
        )}

        {!isLoading && !error && items.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
            <span className="text-gray-500">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}