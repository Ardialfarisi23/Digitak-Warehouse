"use client";

// ---------------------------------------------------------------------------
// SEMENTARA localStorage, sampai backend Putaway tersedia. Antrean di sini
// merepresentasikan item yang Surat Jalan Inbound-nya SUDAH diverifikasi
// Supervisor (di luar scope modul staf), jadi siap ditempatkan oleh Staf
// Gudang. Penempatan cuma level Gudang + Zona (pilih dari dropdown) —
// TIDAK ada input rak/bin manual. Staf wajib lampirkan foto bukti sebelum
// konfirmasi.
//
// CATATAN: STORAGE_KEY dinaikkan versinya (v2) supaya browser yang udah
// pernah nyimpen data lama otomatis reset ke seed data terbaru — nggak
// perlu clear localStorage manual.
// ---------------------------------------------------------------------------

export type PutawayStatus = "MENUNGGU_PUTAWAY" | "SELESAI";

export type PutawayTask = {
  id: string;
  sourceNomor: string; // nomor Surat Jalan Inbound asal
  kodeBarang: string;
  namaBarang: string;
  qty: number;
  kondisi: string;
  isKelebihan: boolean; // true kalau item ini berasal dari pencatatan kelebihan barang
  gudangTujuan: string; // gudang yang tertulis di Surat Jalan Inbound asal (referensi awal)
  status: PutawayStatus;
  gudangPenyimpanan?: string; // gudang yang BENERAN dipilih staf pas konfirmasi
  zonaPenyimpanan?: string; // zona di dalam gudang itu yang dipilih staf
  fotoBukti?: string; // data URL foto bukti (sementara disimpan langsung, belum upload ke server)
};

const STORAGE_KEY = "digitak_putaway_v2";

const SEED_DATA: PutawayTask[] = [
  {
    id: "pw-2001",
    sourceNomor: "SJ-JKT-2026-1001",
    kodeBarang: "SWT-C9200-24P",
    namaBarang: "Switch Cisco 24-Port PoE",
    qty: 3,
    kondisi: "Baik",
    isKelebihan: false,
    gudangTujuan: "Gudang 1 — Kantor Pusat Cimahi",
    status: "MENUNGGU_PUTAWAY",
  },
  {
    id: "pw-2002",
    sourceNomor: "SJ-BDG-2026-0442",
    kodeBarang: "SRV-DL380-G10",
    namaBarang: "Server Dell PowerEdge R750",
    qty: 1,
    kondisi: "Baik",
    isKelebihan: true, // contoh: hasil dari kelebihan barang yang tadi dicatat
    gudangTujuan: "Gudang Dadakan — Site Cikarang",
    status: "MENUNGGU_PUTAWAY",
  },
  {
    id: "pw-2003",
    sourceNomor: "SJ-JKT-2026-1001",
    kodeBarang: "LAP-DELL-5540",
    namaBarang: "Laptop Dell Precision 5540",
    qty: 3,
    kondisi: "Baik",
    isKelebihan: false,
    gudangTujuan: "Gudang 1 — Kantor Pusat Cimahi",
    status: "MENUNGGU_PUTAWAY",
  },
  {
    id: "pw-2004",
    sourceNomor: "SJ-JKT-2026-1005",
    kodeBarang: "PWR-UPS-3KVA",
    namaBarang: "UPS 3kVA",
    qty: 2,
    kondisi: "Rusak Ringan",
    isKelebihan: false,
    gudangTujuan: "Gudang 2 — Bandung",
    status: "MENUNGGU_PUTAWAY",
  },
  {
    id: "pw-2005",
    sourceNomor: "SJ-JKT-2026-1006",
    kodeBarang: "STG-NAS-4B",
    namaBarang: "NAS Storage 4-Bay",
    qty: 4,
    kondisi: "Baik",
    isKelebihan: false,
    gudangTujuan: "Gudang 1 — Kantor Pusat Cimahi",
    status: "MENUNGGU_PUTAWAY",
  },
];

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): PutawayTask[] {
  if (!isBrowser()) return SEED_DATA;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return SEED_DATA;
  }
  try {
    return JSON.parse(raw) as PutawayTask[];
  } catch {
    return SEED_DATA;
  }
}

function writeAll(list: PutawayTask[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getAllPutawayTasks(): PutawayTask[] {
  return readAll();
}

export function getPutawayTaskById(id: string): PutawayTask | undefined {
  return readAll().find((t) => t.id === id);
}

export function completePutaway(
  id: string,
  gudangPenyimpanan: string,
  zonaPenyimpanan: string,
  fotoBukti: string
) {
  const list = readAll();
  const idx = list.findIndex((t) => t.id === id);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      status: "SELESAI",
      gudangPenyimpanan,
      zonaPenyimpanan,
      fotoBukti,
    };
    writeAll(list);
  }
}