"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, History } from "lucide-react";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type ProjectOption = [string, string];

type AdjustmentHistoryItem = {
  adjustment_id: number;
  qty: number;
  alasan: string;
  created_at: string;
  creator: { user_id: number; nama: string } | null;
};

type AdditionalAdjustmentModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectOptions: ProjectOption[];
  defaultProjectId?: string;
  barangId: string;
  barangNama: string;
};

export function AdditionalAdjustmentModal({
  open,
  onClose,
  onSuccess,
  projectOptions,
  defaultProjectId,
  barangId,
  barangNama,
}: AdditionalAdjustmentModalProps) {
  const { get, post } = useApi();
  const { user } = useAuth();

  const [projectId, setProjectId] = useState<string>(defaultProjectId || "");
  const [qty, setQty] = useState<string>("");
  const [alasan, setAlasan] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTotal, setCurrentTotal] = useState<number | null>(null);
  const [rincian, setRincian] = useState<{ dari_kelebihan: number; dari_penyesuaian: number } | null>(null);
  const [history, setHistory] = useState<AdjustmentHistoryItem[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const isSingleProject = projectOptions.length === 1;
  const effectiveProjectId = useMemo(() => {
    if (isSingleProject) return projectOptions[0]?.[0] || "";
    return projectId;
  }, [isSingleProject, projectOptions, projectId]);

  useEffect(() => {
    if (!open) return;
    if (isSingleProject) {
      setProjectId(projectOptions[0]?.[0] || "");
    } else if (defaultProjectId) {
      setProjectId(defaultProjectId);
    } else {
      setProjectId(projectOptions[0]?.[0] || "");
    }
    setQty("");
    setAlasan("");
    setError(null);
    setCurrentTotal(null);
    setRincian(null);
    setHistory([]);
  }, [open, defaultProjectId, isSingleProject, projectOptions]);

  useEffect(() => {
    if (!open || !effectiveProjectId || !barangId) return;
    let cancelled = false;
    setIsLoadingDetail(true);
    setError(null);

    get(
      `/api/additional-adjustments?project_id=${encodeURIComponent(effectiveProjectId)}&barang_id=${encodeURIComponent(barangId)}`
    )
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.clone().json().catch(() => null);
          throw new Error(json?.message || "Gagal memuat data additional.");
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        const data = json?.data || {};
        setCurrentTotal(Number(data.total_additional ?? 0));
        setRincian({
          dari_kelebihan: Number(data.rincian?.dari_kelebihan ?? 0),
          dari_penyesuaian: Number(data.rincian?.dari_penyesuaian ?? 0),
        });
        setHistory(Array.isArray(data.adjustments) ? data.adjustments.slice(0, 10) : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat data additional.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, effectiveProjectId, barangId, get]);

  const qtyNumber = useMemo(() => {
    const trimmed = qty.trim();
    if (trimmed === "") return NaN;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed)) return NaN;
    return parsed;
  }, [qty]);

  const isQtyInvalid = qty === "" || Number.isNaN(qtyNumber) || qtyNumber === 0;
  const isAlasanInvalid = alasan.trim().length < 5;
  const previewTotal = useMemo(() => {
    if (currentTotal === null || Number.isNaN(qtyNumber)) return null;
    return currentTotal + qtyNumber;
  }, [currentTotal, qtyNumber]);
  const isPreviewInvalid = previewTotal === null || previewTotal < 0;

  const canSubmit =
    !isSaving &&
    !isQtyInvalid &&
    !isAlasanInvalid &&
    !isPreviewInvalid &&
    !!effectiveProjectId &&
    !!barangId;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await post("/api/additional-adjustments", {
        project_id: Number(effectiveProjectId),
        barang_id: Number(barangId),
        qty: qtyNumber,
        alasan: alasan.trim(),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || "Gagal menyimpan penyesuaian additional.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan penyesuaian.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Penyesuaian Additional</h2>
            <p className="mt-1 text-xs text-slate-500">
              Barang: {barangNama || barangId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Project</label>
            <select
              value={effectiveProjectId}
              disabled={isSingleProject || isLoadingDetail}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!isSingleProject && <option value="">Pilih Project</option>}
              {projectOptions.map(([id, nama]) => (
                <option key={id} value={id}>
                  {nama}
                </option>
              ))}
            </select>
          </div>

          {isLoadingDetail ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat data additional...
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {currentTotal !== null ? (
                <>
                  <p className="font-semibold text-slate-800">
                    Additional saat ini: {Number(currentTotal).toLocaleString("id-ID")}
                  </p>
                  {rincian && (
                    <p className="mt-1 text-slate-600">
                      Dari inbound kelebihan: {Number(rincian.dari_kelebihan).toLocaleString("id-ID")} •
                      Dari penyesuaian: {Number(rincian.dari_penyesuaian).toLocaleString("id-ID")}
                    </p>
                  )}
                </>
              ) : (
                <p>Pilih project untuk melihat nilai additional.</p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Qty Penyesuaian</label>
            <input
              type="number"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Contoh: 5 atau -3"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
            />
            {isQtyInvalid && (
              <p className="mt-1 text-[11px] text-rose-600">Qty harus bilangan bulat dan tidak boleh 0.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Alasan</label>
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={3}
              placeholder="Jelaskan alasan penyesuaian (minimal 5 karakter)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>{isAlasanInvalid ? "Alasan wajib diisi, minimal 5 karakter." : `Tersisa: ${Math.max(0, 5 - alasan.trim().length)} karakter`}</span>
              <span>{alasan.trim().length}/500</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-800">Pratinjau additional setelah penyesuaian</p>
            <p className="mt-1">
              {previewTotal !== null ? Number(previewTotal).toLocaleString("id-ID") : "-"}
            </p>
            {isPreviewInvalid && (
              <p className="mt-1 text-rose-600">Nilai total tidak boleh negatif.</p>
            )}
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="border-t border-slate-100 pt-2">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <History size={14} />
              Riwayat penyesuaian
            </p>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada penyesuaian untuk kombinasi ini.</p>
              ) : (
                history.map((item) => (
                  <div key={item.adjustment_id} className="rounded-lg border border-slate-200 bg-white p-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${item.qty >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {item.qty >= 0 ? "+" : ""}{item.qty}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(item.created_at).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-700">{item.alasan}</p>
                    <p className="text-[11px] text-slate-500">Oleh: {item.creator?.nama || "-"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? "Menyimpan..." : "Simpan Penyesuaian"}
          </button>
        </div>
      </div>
    </div>
  );
}
