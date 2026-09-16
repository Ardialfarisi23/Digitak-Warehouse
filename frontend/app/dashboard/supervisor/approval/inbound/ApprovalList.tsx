"use client";

import { useState } from "react";
import useSWR from "swr";
import { useApi } from "@/lib/api";
import { Check, Loader2, AlertCircle } from "lucide-react";

interface InboundForApproval {
  surat_jalan_id: number;
  nomor_surat_jalan: string;
  tanggal: string;
  tipe_pengirim?: "internal" | "external";
  supplier?: { nama: string; kode: string };
  gudang_asal?: { nama_gudang: string };
  items: { qty: number }[];
}

const fetcher = async ([url, get]: [string, Function]) => {
  const response = await get(url);
  if (!response.ok) {
    const error = new Error("An error occurred while fetching the data.");
    // Attach extra info to the error object.
    error.info = await response.json();
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export default function ApprovalList() {
  const { get, post } = useApi();
  const API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/surat-jalan/verification-queue`;

  // useSWR handles fetching, caching, and revalidation.
  // The query to fetch ONLY pending items is handled by the `verification-queue` endpoint.
  const { data: response, error, isLoading, mutate } = useSWR([API_URL, get], fetcher);

  const records: InboundForApproval[] = response?.data || [];
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    setActionError(null);
    try {
      const approveUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/surat-jalan/inbound/${id}/approve`;
      const res = await post(approveUrl, {});
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Gagal menyetujui inbound." }));
        throw new Error(errData.message);
      }

      // --- CACHE INVALIDATION ---
      // Trigger a re-fetch of the verification queue.
      // SWR will get the updated list from the server, and the approved item will be gone.
      await mutate();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan";
      setActionError(errorMessage);
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) return <div className="p-6 text-center text-gray-500">Memuat data persetujuan...</div>;
  if (error) return <div className="p-6 text-center text-rose-600">Gagal memuat data: {error.message}</div>;

  return (
    <div>
      {actionError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
          <AlertCircle size={16} className="mt-0.5" />
          {actionError}
        </div>
      )}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          {/* Table headers */}
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-500">
              <th className="px-6 py-4 font-medium">Nomor Surat Jalan</th>
              <th className="px-6 py-4 font-medium">Asal</th>
              <th className="px-6 py-4 font-medium">Tanggal</th>
              <th className="px-6 py-4 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400">Tidak ada permintaan persetujuan.</td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.surat_jalan_id} className="border-t border-gray-100">
                  <td className="px-6 py-4 font-semibold text-gray-800">{record.nomor_surat_jalan}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {record.tipe_pengirim === "external"
                      ? `${record.supplier?.kode ?? ""} - ${record.supplier?.nama ?? "-"}`
                      : record.tipe_pengirim === "internal"
                      ? record.gudang_asal?.nama_gudang || "-"
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{new Date(record.tanggal).toLocaleDateString("id-ID")}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleApprove(record.surat_jalan_id)}
                      disabled={!!processingId}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingId === record.surat_jalan_id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Setujui
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}