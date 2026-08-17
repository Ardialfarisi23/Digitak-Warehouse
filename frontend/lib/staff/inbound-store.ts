"use client";

// ---------------------------------------------------------------------------
// SEMENTARA pakai localStorage (sama seperti surat-jalan-store.ts untuk
// Outbound), sampai backend Inbound tersedia. Struktur data mengikuti PRD
// 7.3.1 & 7.4: staf mencocokkan fisik barang terhadap Surat Jalan Inbound,
// mencatat kondisi per unit, dan menjalankan proses tambahan kelebihan
// barang bila qty fisik melebihi qty di Surat Jalan/Tiket.
// ---------------------------------------------------------------------------

export type KondisiPerangkat =
  | "Baik"
  | "Rusak Ringan"
  | "Rusak Berat"
  | "Tidak Sesuai Spek"
  | "DOA";

export type InboundItem = {
  kodeBarang: string;
  namaBarang: string;
  qtyDiminta: number; // qty sesuai Surat Jalan/Tiket asal
  qtyDiterima: number; // qty fisik yang benar-benar diterima staf
  kondisi: KondisiPerangkat | "";
  // Satu slot serial number per unit fisik — panjang array ini harus selalu
  // mengikuti qtyDiterima (tiap unit hardware biasanya punya SN unik dari
  // pabrik, jadi nggak bisa digabung jadi satu field kalau qty > 1).
  serialNumbers: string[];
  // Kelebihan barang (PRD 7.4, Baru v4.2): kalau qtyDiterima > qtyDiminta,
  // selisihnya dicatat sebagai baris stok tersendiri dengan catatan —
  // BUKAN dicampur ke qtyDiterima biasa.
  kelebihan?: {
    qty: number;
    catatan: string;
  };
};

export type InboundStatus = "BELUM_DIPROSES" | "MENUNGGU_VERIFIKASI" | "TERVERIFIKASI";

export type InboundSuratJalan = {
  id: string; // dipakai di URL, tanpa karakter "/"
  nomor: string; // nomor Surat Jalan dari pengirim/lokasi asal
  asal: string; // lokasi/pengirim asal barang
  tujuanGudang: string; // Gudang 1 / Gudang 2 / Gudang Dadakan
  tanggal: string;
  items: InboundItem[];
  status: InboundStatus;
};

const STORAGE_KEY = "digitak_inbound_v1";

const SEED_DATA: InboundSuratJalan[] = [
  {
    id: "inb-1001",
    nomor: "SJ-JKT-2026-1001",
    asal: "Gudang Pusat Jakarta",
    tujuanGudang: "Gudang 1 — Kantor Pusat Cimahi",
    tanggal: "10 Agustus 2026",
    items: [
      { kodeBarang: "SWT-C9200-24P", namaBarang: "Switch Cisco 24-Port PoE", qtyDiminta: 5, qtyDiterima: 0, kondisi: "", serialNumbers: [] },
      { kodeBarang: "LAP-DELL-5540", namaBarang: "Laptop Dell Precision 5540", qtyDiminta: 3, qtyDiterima: 0, kondisi: "", serialNumbers: [] },
    ],
    status: "BELUM_DIPROSES",
  },
  {
    id: "inb-1002",
    nomor: "SJ-BDG-2026-0442",
    asal: "PT Lanjut Logistic",
    tujuanGudang: "Gudang Dadakan — Site Cikarang",
    tanggal: "09 Agustus 2026",
    items: [
      { kodeBarang: "SRV-DL380-G10", namaBarang: "Server Dell PowerEdge R750", qtyDiminta: 2, qtyDiterima: 0, kondisi: "", serialNumbers: [] },
    ],
    status: "BELUM_DIPROSES",
  },
];

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): InboundSuratJalan[] {
  if (!isBrowser()) return SEED_DATA;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return SEED_DATA;
  }
  try {
    return JSON.parse(raw) as InboundSuratJalan[];
  } catch {
    return SEED_DATA;
  }
}

function writeAll(list: InboundSuratJalan[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getAllInbound(): InboundSuratJalan[] {
  return readAll();
}

export function getInboundById(id: string): InboundSuratJalan | undefined {
  return readAll().find((sj) => sj.id === id);
}

export function updateInbound(id: string, updated: InboundSuratJalan) {
  const list = readAll();
  const idx = list.findIndex((sj) => sj.id === id);
  if (idx >= 0) {
    list[idx] = updated;
    writeAll(list);
  }
}