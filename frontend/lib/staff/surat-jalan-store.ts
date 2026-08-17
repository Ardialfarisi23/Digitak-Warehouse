"use client";

// ---------------------------------------------------------------------------
// SEMENTARA pakai localStorage biar form pengajuan & halaman list nyambung
// tanpa nunggu backend. Begitu API Surat Jalan (Prisma) siap, ganti semua
// fungsi di bawah ini jadi fetch() ke endpoint yang sesuai — bentuk data
// (SuratJalan, SuratJalanItem) sengaja dibuat mirror skema yang kemungkinan
// dipakai backend supaya gampang disambung.
// ---------------------------------------------------------------------------

export type ItemCategory = "KRITIS" | "NORMAL";

export type SuratJalanItem = {
  kodeBarang: string;
  namaBarang: string;
  qty: number;
  uom: string;
  keterangan?: string;
  kategori: ItemCategory;
};

export type SuratJalanStatus =
  | "MENUNGGU_APPROVAL"
  | "DISETUJUI"
  | "AUTO_APPROVE"
  | "SIAP_KIRIM"
  | "TERKIRIM";

export type SuratJalan = {
  id: string; // dipakai di URL (/staff/outbound/[id]) — tanpa karakter "/"
  nomor: string; // nomor resmi buat dicetak, format: 001/SJ/INT/DIGITAK/VII/2026
  tanggal: string;
  namaPicPemohon: string;
  kendaraan: string;
  noPolisi: string;
  namaDriver: string;
  tujuan: string;
  projectName?: string;
  items: SuratJalanItem[];
  status: SuratJalanStatus;
};

const STORAGE_KEY = "digitak_surat_jalan_v1";

const ROMAN_MONTH = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
];

const SEED_DATA: SuratJalan[] = [
  {
    id: "sj-991",
    nomor: "SJ-2023-991",
    tanggal: "07 Agt 2026",
    namaPicPemohon: "Andi Pratama",
    kendaraan: "Pick Up",
    noPolisi: "D 1234 ABC",
    namaDriver: "Roy",
    tujuan: "Distributor Jabar",
    items: [
      { kodeBarang: "SWT-C9200-24P", namaBarang: "Switch Cisco 24-Port PoE", qty: 3, uom: "Unit", kategori: "NORMAL" },
      { kodeBarang: "LAP-DELL-5540", namaBarang: "Laptop Dell Precision 5540", qty: 9, uom: "Unit", kategori: "NORMAL" },
    ],
    status: "MENUNGGU_APPROVAL",
  },
  {
    id: "sj-988",
    nomor: "SJ-2023-988",
    tanggal: "06 Agt 2026",
    namaPicPemohon: "Andi Pratama",
    kendaraan: "Box Truck",
    noPolisi: "D 5678 XYZ",
    namaDriver: "Bambang",
    tujuan: "PT Lanjut Logistic",
    items: [
      { kodeBarang: "SRV-DL380-G10", namaBarang: "Server Dell PowerEdge R750", qty: 2, uom: "Unit", kategori: "KRITIS" },
      { kodeBarang: "STG-NAS-4B", namaBarang: "NAS Storage 4-Bay", qty: 2, uom: "Unit", kategori: "KRITIS" },
    ],
    status: "DISETUJUI",
  },
  {
    id: "sj-982",
    nomor: "SJ-2023-982",
    tanggal: "05 Agt 2026",
    namaPicPemohon: "Andi Pratama",
    kendaraan: "Pick Up",
    noPolisi: "D 9012 QWE",
    namaDriver: "Dedi",
    tujuan: "Cabang Bandung",
    items: [
      { kodeBarang: "SWT-C9200-24P", namaBarang: "Switch Cisco 24-Port PoE", qty: 8, uom: "Unit", kategori: "NORMAL" },
    ],
    status: "AUTO_APPROVE",
  },
];

function isBrowser() {
  return typeof window !== "undefined";
}

function readAll(): SuratJalan[] {
  if (!isBrowser()) return SEED_DATA;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return SEED_DATA;
  }
  try {
    return JSON.parse(raw) as SuratJalan[];
  } catch {
    return SEED_DATA;
  }
}

function writeAll(list: SuratJalan[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getAllSuratJalan(): SuratJalan[] {
  return readAll();
}

export function getSuratJalanById(id: string): SuratJalan | undefined {
  return readAll().find((sj) => sj.id === id);
}

/** Generate nomor resmi format: 001/SJ/INT/DIGITAK/VII/2026 */
export function generateNomorSuratJalan(existing: SuratJalan[]): string {
  const now = new Date();
  const urut = String(existing.length + 1).padStart(3, "0");
  const bulanRomawi = ROMAN_MONTH[now.getMonth()];
  const tahun = now.getFullYear();
  return `${urut}/SJ/INT/DIGITAK/${bulanRomawi}/${tahun}`;
}

export function addSuratJalan(input: Omit<SuratJalan, "id">): SuratJalan {
  const list = readAll();
  const id = `sj-${Date.now()}`;
  const newSuratJalan: SuratJalan = { ...input, id };
  writeAll([newSuratJalan, ...list]);
  return newSuratJalan;
}