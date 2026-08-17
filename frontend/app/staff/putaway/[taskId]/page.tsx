"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, PackagePlus, Camera, ChevronDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api";
import {
  getPutawayTaskById,
  completePutaway,
  PutawayTask,
} from "@/lib/staff/putaway-store";

// ---------------------------------------------------------------------------
// Daftar Zona ini masih HARDCODE — belum ada endpoint master data khusus
// Zona/Layout Gudang yang dikonfirmasi. Begitu ada (kemungkinan bagian dari
// fitur "Gudang & Layout" Admin), ganti jadi fetch per gudang yang dipilih.
// ---------------------------------------------------------------------------
const ZONA_OPTIONS = [
  "Zona A — Indoor",
  "Zona B — Indoor",
  "Zona C — Outdoor",
  "Zona D — Outdoor",
];

type Gudang = {
  id: string;
  gudang_id?: string | number;
  nama_gudang: string;
  tipe?: string;
};

export default function PutawayDetailPage() {
  const params = useParams<{ taskId: string }>();
  const router = useRouter();
  const { get } = useApi();

  const [task, setTask] = useState<PutawayTask | null | undefined>(undefined);
  const [gudangList, setGudangList] = useState<Gudang[]>([]);
  const [loadingGudang, setLoadingGudang] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedGudang, setSelectedGudang] = useState("");
  const [selectedZona, setSelectedZona] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TODO: ganti jadi fetch(`/api/putaway/${params.taskId}`)
  useEffect(() => {
    const found = getPutawayTaskById(params.taskId);
    setTask(found ?? null);
  }, [params.taskId]);

  // Ambil daftar Gudang dari master data asli (sama endpoint yang dipakai
  // halaman master-data Admin: /api/warehouses) — TAPI skip kalau tugas ini
  // udah Selesai (mode lihat-doang, nggak butuh dropdown gudang).
  useEffect(() => {
    if (task?.status === "SELESAI") {
      setLoadingGudang(false);
      return;
    }
    if (task === undefined) return; // masih nunggu task ke-load dulu

    async function loadGudang() {
      setLoadingGudang(true);
      setLoadError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      try {
        const res = await get(new URL("/api/warehouses", baseUrl).toString());
        if (!res.ok) throw new Error("Gagal mengambil daftar Gudang.");
        const json = await res.json();
        const data: Gudang[] = Array.isArray(json?.data) ? json.data : json?.data?.data || [];
        setGudangList(data);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Terjadi kesalahan mengambil data Gudang."
        );
      } finally {
        setLoadingGudang(false);
      }
    }
    loadGudang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  if (task === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#E8632C]" />
      </div>
    );
  }

  if (task === null) {
    return (
      <div className="px-8 py-6">
        <p className="text-gray-500">Tugas Putaway tidak ditemukan.</p>
        <button
          onClick={() => router.push("/staff/putaway")}
          className="mt-3 text-sm font-semibold text-[#E8632C] hover:underline"
        >
          Kembali ke daftar Putaway
        </button>
      </div>
    );
  }

  const canSubmit = !!selectedGudang && !!selectedZona && !!foto;
  const isSelesai = task.status === "SELESAI";

  async function handleConfirm() {
    if (!canSubmit || !task) return;
    setSubmitting(true);
    try {
      // TODO: ganti jadi POST /api/putaway/:id/complete (multipart, upload
      // foto ke storage beneran) begitu backend siap. Ini juga titik yang
      // memicu stok bertambah real-time sesuai PRD.
      completePutaway(task.id, selectedGudang, selectedZona, foto!);
      router.push("/staff/putaway");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-8 py-6">
      <button
        onClick={() => router.push("/staff/putaway")}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div className="mx-auto max-w-lg rounded-2xl border border-[#F3D9C7] bg-white p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Barang
          </p>
          <h1 className="mt-1 text-xl font-bold text-gray-900">{task.namaBarang}</h1>
          <p className="text-sm text-gray-500">{task.kodeBarang}</p>
          {task.isKelebihan && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-[#E8632C]">
              <PackagePlus size={12} />
              Ini item hasil kelebihan barang
            </span>
          )}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 text-sm">
          <div>
            <p className="text-gray-400">Qty</p>
            <p className="font-semibold text-gray-900">{task.qty} unit</p>
          </div>
          <div>
            <p className="text-gray-400">Kondisi</p>
            <p className="font-semibold text-gray-900">{task.kondisi}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-400">Asal Surat Jalan</p>
            <p className="font-semibold text-gray-900">{task.sourceNomor}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-400">Gudang Tujuan (rencana)</p>
            <p className="font-semibold text-gray-900">{task.gudangTujuan}</p>
          </div>
        </div>

        {loadError && !isSelesai && (
          <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
            {loadError}
          </div>
        )}

        {isSelesai ? (
          // -----------------------------------------------------------------
          // Mode lihat-doang — barang ini udah ditempatkan, tampilkan hasil
          // yang tersimpan, bukan form input.
          // -----------------------------------------------------------------
          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Sudah Ditempatkan
            </p>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400">Gudang</p>
                <p className="font-semibold text-gray-900">{task.gudangPenyimpanan}</p>
              </div>
              <div>
                <p className="text-gray-400">Zona</p>
                <p className="font-semibold text-gray-900">{task.zonaPenyimpanan}</p>
              </div>
            </div>
            {task.fotoBukti && (
              <div>
                <p className="mb-1.5 text-xs text-gray-400">Foto Bukti</p>
                <img
                  src={task.fotoBukti}
                  alt="Bukti penyimpanan"
                  className="h-48 w-48 rounded-xl border border-gray-200 object-cover"
                />
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Pilih Gudang */}
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <MapPin size={13} />
              Gudang Penyimpanan
            </label>
            <div className="relative mb-4">
              <select
                value={selectedGudang}
                onChange={(e) => {
                  setSelectedGudang(e.target.value);
                  setSelectedZona("");
                }}
                disabled={loadingGudang}
                className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none disabled:opacity-50"
              >
                <option value="" disabled>
                  {loadingGudang ? "Memuat daftar gudang..." : "Pilih gudang..."}
                </option>
                {gudangList.map((g) => (
                  <option key={g.gudang_id || g.id} value={g.nama_gudang}>
                    {g.nama_gudang} {g.tipe ? `(${g.tipe})` : ""}
                  </option>
                ))}
              </select>
              {loadingGudang ? (
                <Loader2
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
                />
              ) : (
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              )}
            </div>

            {/* Pilih Zona — muncul setelah Gudang dipilih */}
            {selectedGudang && (
              <>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Zona
                </label>
                <div className="relative mb-5">
                  <select
                    value={selectedZona}
                    onChange={(e) => setSelectedZona(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 focus:border-[#E8632C] focus:outline-none"
                  >
                    <option value="" disabled>
                      Pilih zona...
                    </option>
                    {ZONA_OPTIONS.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </>
            )}

            {/* Foto bukti — langsung buka kamera */}
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <Camera size={13} />
              Foto Bukti Penyimpanan
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="hidden"
            />

            {foto ? (
              <div className="relative mb-2 w-fit">
                <img
                  src={foto}
                  alt="Bukti penyimpanan"
                  className="h-40 w-40 rounded-xl border border-gray-200 object-cover"
                />
                <button
                  onClick={() => setFoto(null)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-700"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mb-2 flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#E8632C] hover:text-[#E8632C]"
              >
                <Camera size={22} />
                <span className="text-xs font-medium">Lampirkan Foto</span>
              </button>
            )}
            <p className="mb-6 text-xs text-gray-400">
              Wajib difoto sebagai bukti barang sudah ditempatkan.
            </p>

            <Button
              disabled={!canSubmit || submitting}
              onClick={handleConfirm}
              className="h-auto w-full rounded-xl bg-[#E8632C] py-3 text-sm font-semibold text-white hover:bg-[#D9591F] disabled:opacity-40"
            >
              {submitting ? "Menyimpan..." : "Konfirmasi Penempatan"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}