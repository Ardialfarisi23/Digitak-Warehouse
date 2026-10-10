"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, Clock } from "lucide-react";
import { useApi, API_BASE } from "@/lib/api";

const REMAINS_NOTE_ENDPOINT = `${API_BASE}/api/reconciliation/remains-note`;

interface RemainsNoteFormProps {
  record: {
    project_id: string;
    cluster_id: string;
    barang_id: string;
    remains_note: string | null;
    remains_note_updated_at: string | null;
  };
  onSuccess: () => void;
  isClusterMode: boolean;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: unknown;
}

export function RemainsNoteForm({ record, onSuccess, isClusterMode }: RemainsNoteFormProps) {
  const { put } = useApi();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingNote = record.remains_note || "";
  const updatedAt = record.remains_note_updated_at;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(existingNote);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsEditing(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingNote, record.project_id, record.cluster_id, record.barang_id]);

  async function doPut(keterangan: string) {
    const body = {
      project_id: Number(record.project_id),
      barang_id: Number(record.barang_id),
      keterangan,
    } as const;

    if (isClusterMode && record.cluster_id && record.cluster_id !== "-") {
      (body as Record<string, unknown>).cluster_id = record.cluster_id;
    }

    const response = await put(REMAINS_NOTE_ENDPOINT, body);

    if (!response.ok) {
      let message = "Gagal menyimpan keterangan.";
      try {
        const data = await response.json();
        if (data?.message) message = data.message;
      } catch {
        message = `Gagal menyimpan (status ${response.status})`;
      }
      throw new Error(message);
    }

    return response.json() as Promise<ApiResponse>;
  }

  const handleSave = async () => {
    const trimmed = draft.trim();
    setIsSaving(true);
    setError(null);

    try {
      await doPut(trimmed);
      onSuccess();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(existingNote);
    setIsEditing(false);
    setError(null);
  };

  const handleDelete = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await doPut("");
      onSuccess();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus.");
    } finally {
      setIsSaving(false);
    }
  };

  const remainingChars = 1000 - draft.length;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Keterangan Remains</p>

      {!isEditing ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {existingNote ? (
            <>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{existingNote}</p>
              {updatedAt && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock size={12} />
                  Diperbarui: {new Date(updatedAt).toLocaleString("id-ID")}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <X size={12} className="rotate-45" />
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  Hapus
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center py-4">
              <p className="text-sm text-slate-400">Belum ada keterangan</p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
              >
                Isi Keterangan
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            rows={4}
            disabled={isSaving}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-orange-400 disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Masukkan keterangan Remains (maksimal 1000 karakter)"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{remainingChars < 0 ? "Melebihi batas" : `Tersisa: ${remainingChars} karakter`}</span>
            <span>{draft.length}/1000</span>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || draft.length > 1000}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}