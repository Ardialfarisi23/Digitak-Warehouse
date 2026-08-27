"use client";

// ---------------------------------------------------------------------------
// SEMENTARA pakai localStorage (sama seperti surat-jalan-store.ts untuk
// Outbound), sampai backend Inbound tersedia. Struktur data mengikuti PRD
// 7.3.1 & 7.4: staf mencocokkan fisik barang terhadap Surat Jalan Inbound,
// mencatat kondisi per unit, dan menjalankan proses tambahan kelebihan
// barang bila qty fisik melebihi qty di Surat Jalan/Tiket.
// ---------------------------------------------------------------------------

export type KondisiPerangkat = "Baik" | "Rusak Ringan" | "Rusak Berat" | "Tidak Sesuai Spek" | "DOA";

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
  nomor: string; // nomor Surat Jalan Inbound (internal, digenerate sistem)
  namaProject: string;
  asalGudang: string; // gudang/lokasi asal barang dikirim
  tujuanGudang: string; // Gudang 1 / Gudang 2 / Gudang Dadakan (tujuan penerimaan)
  kendaraan: string;
  noPolisi: string;
  namaDriver: string;
  namaPicPemohon: string; // PIC/pemohon yang minta barang ini didatangkan
  tanggal: string;
  items: InboundItem[];
  status: InboundStatus;
};

const STORAGE_KEY = "digitak_inbound_v2";

const ROMAN_MONTH = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const SEED_DATA: InboundSuratJalan[] = [
  {
    id: "inb-1001",
    nomor: "001/INB/INT/DIGITAK/VIII/2026",
    namaProject: "Upgrade Infrastruktur Cabang Bandung",
    asalGudang: "Gudang Pusat Jakarta",
    tujuanGudang: "Gudang 1 — Kantor Pusat Cimahi",
    kendaraan: "Box Truck",
    noPolisi: "B 9021 JKT",
    namaDriver: "Roy",
    namaPicPemohon: "Andi Pratama",
    tanggal: "10 Agustus 2026",
    items: [
      { kodeBarang: "SWT-C9200-24P", namaBarang: "Switch Cisco 24-Port PoE", qtyDiminta: 5, qtyDiterima: 0, kondisi: "", serialNumbers: [] },
      { kodeBarang: "LAP-DELL-5540", namaBarang: "Laptop Dell Precision 5540", qtyDiminta: 3, qtyDiterima: 0, kondisi: "", serialNumbers: [] },
    ],
    status: "BELUM_DIPROSES",
  },
  {
    id: "inb-1002",
    nomor: "002/INB/INT/DIGITAK/VIII/2026",
    namaProject: "Rollout Endpoint Distributor Jabar",
    asalGudang: "PT Lanjut Logistic",
    tujuanGudang: "Gudang Dadakan — Site Cikarang",
    kendaraan: "Pick Up",
    noPolisi: "D 4471 BDG",
    namaDriver: "Bambang",
    namaPicPemohon: "Andi Pratama",
    tanggal: "09 Agustus 2026",
    items: [{ kodeBarang: "SRV-DL380-G10", namaBarang: "Server Dell PowerEdge R750", qtyDiminta: 2, qtyDiterima: 0, kondisi: "", serialNumbers: [] }],
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

/** Generate nomor internal, format: 001/INB/INT/DIGITAK/VIII/2026 */
export function generateNomorInbound(existing: InboundSuratJalan[]): string {
  const now = new Date();
  const urut = String(existing.length + 1).padStart(3, "0");
  const bulanRomawi = ROMAN_MONTH[now.getMonth()];
  const tahun = now.getFullYear();
  return `${urut}/INB/INT/DIGITAK/${bulanRomawi}/${tahun}`;
}

export function addInboundSuratJalan(input: Omit<InboundSuratJalan, "id">): InboundSuratJalan {
  const list = readAll();
  const id = `inb-${Date.now()}`;
  const created: InboundSuratJalan = { ...input, id };
  writeAll([created, ...list]);
  return created;
}

/**
 * SEMENTARA — simulasi tombol approval Supervisor (belum ada modul
 * Supervisor beneran). Nandain Inbound ini Terverifikasi. Push item-nya
 * ke antrean Putaway itu tanggung jawab pemanggil (lihat
 * addPutawayTasksFromInbound di putaway-store.ts) supaya inbound-store
 * & putaway-store tetap independen satu sama lain.
 */
export function verifyInbound(id: string): InboundSuratJalan | undefined {
  const list = readAll();
  const idx = list.findIndex((sj) => sj.id === id);
  if (idx < 0) return undefined;
  list[idx] = { ...list[idx], status: "TERVERIFIKASI" };
  writeAll(list);
  return list[idx];
}
