const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TARGET_NAMES = [
  "Test User 1", "Test User 2", "Test User 3", "Test User 4", "Test User 5",
  "Test User Gudang", "Staff Gudang", "Supervisor Gudang", "Admin General",
  "Yofi Tri Jaya Subrata", "Gan Gan", "Devan"
];

// Semua tabel yang punya FK ke user_account.user_id (berdasarkan schema)
const RELATED = [
  { table: "approval_log", col: "user_id" },
  { table: "audit_log", col: "user_id" },
  { table: "barang", col: "created_by" },
  { table: "barang", col: "updated_by" },
  { table: "boq", col: "created_by" },
  { table: "boq", col: "diaktifkan_oleh" },
  { table: "boq", col: "updated_by" },
  { table: "gudang", col: "created_by" },
  { table: "gudang", col: "updated_by" },
  { table: "kendaraan", col: "created_by" },
  { table: "kendaraan", col: "updated_by" },
  { table: "personil", col: "created_by" },
  { table: "personil", col: "updated_by" },
  { table: "personil", col: "user_id" },
  { table: "project", col: "created_by" },
  { table: "project", col: "updated_by" },
  { table: "titik_lapangan", col: "created_by" },
  { table: "titik_lapangan", col: "updated_by" },
  { table: "surat_jalan", col: "created_by" },
  { table: "surat_jalan", col: "updated_by" },
  { table: "surat_jalan", col: "dilaporkan_tiba_oleh" },
  { table: "surat_jalan", col: "dikonfirmasi_tiba_oleh" },
  { table: "surat_jalan_transit", col: "tiba_by" },
  { table: "surat_jalan_transit", col: "berangkat_by" },
  { table: "tiket_material", col: "created_by" },
  { table: "zona_utilisasi_log", col: "diperbarui_oleh" },
  { table: "zona_gudang", col: "dinilai_oleh" },
  { table: "surat_jalan_item", col: "diperiksa_oleh" },
  { table: "reconciliation_upload_log", col: "uploaded_by" },
  { table: "laporan_mitra", col: "uploaded_by" },
  { table: "notification", col: "user_id" },
  { table: "user_notification_preferences", col: "user_id" },
  { table: "user_gudang", col: "user_id" },
  { table: "return_transaction", col: "created_by" },
  { table: "return_transaction", col: "approved_by" },
  { table: "return_transaction", col: "received_by" },
  { table: "additional_adjustment", col: "created_by" },
  { table: "reconciliation_remains_note", col: "created_by" },
  { table: "reconciliation_remains_note", col: "updated_by" },
  { table: "refresh_token", col: "user_id" },
];

async function main() {
  // Ambil semua user
  const allUsers = await prisma.user_account.findMany({ select: { user_id: true, nama: true, email: true, role: true } });

  // Cari yang cocok dengan nama PERSIS
  const matched = [];
  const notFound = [];
  for (const name of TARGET_NAMES) {
    const found = allUsers.filter(u => u.nama === name);
    if (found.length === 0) notFound.push(name);
    else matched.push(...found);
  }

  // Pastikan Ardi Alfarisi tidak ikut
  const ardi = matched.find(u => u.nama === "Ardi Alfarisi");
  if (ardi) {
    console.log("ERROR: Ardi Alfarisi terpilih! Dihapus dari daftar.");
    matched.splice(matched.indexOf(ardi), 1);
  }

// Cek duplikat
  const dupes = [];
  const seen = {};
  for (const u of matched) {
    seen[u.nama] = (seen[u.nama] || 0) + 1;
  }
  for (const [k,v] of Object.entries(seen)) if (v > 1) dupes.push(k);

  console.log("=== DRY RUN ===");
  console.log("Ditemukan:", matched.length, "user dari", TARGET_NAMES.length, "nama target");
  console.log("Tidak ditemukan:", notFound.length ? notFound.join(", ") : "-");
  console.log("Duplikat:", dupes.length ? dupes.join(", ") : "-");
  console.log("Ardi Alfarisi termasuk:", ardi ? "YA (dihapus)" : "TIDAK");
  console.log("");

  for (const u of matched) {
    const rels = {};
    for (const r of RELATED) {
      try {
        const count = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as c FROM "${r.table}" WHERE "${r.col}" = ${u.user_id}`
        );
        if (count[0].c > 0) rels[`${r.table}.${r.col}`] = count[0].c;
      } catch (e) {
        // tabel/kolom mungkin tidak ada, abaikan
      }
    }
    const totalRelated = Object.values(rels).reduce((a,b)=>a+b,0);
    console.log(`ID ${u.user_id} | ${u.nama} | ${u.email} | role=${u.role} | related=${totalRelated}`);
    for (const [k,v] of Object.entries(rels)) console.log(`    - ${k}: ${v}`);
  }
}

main().finally(() => prisma.$disconnect());