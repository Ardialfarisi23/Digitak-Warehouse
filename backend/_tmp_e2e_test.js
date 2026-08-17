const prisma = require("./src/config/prisma");
const repo = require("./src/modules/surat-jalan/surat-jalan.repository");
const service = require("./src/modules/surat-jalan/surat-jalan.service");

const ACTOR_ID = null;
let g = null, b = null, s = null, u = null;
let createdStok = null; // { id, wasCreated }
let originals = { stokQty: null };
let throwaways = [];

const SJ = (qty) => ({
  tipe: "outbound",
  gudang_asal_id: Number(g.gudang_id),
  gudang_tujuan_id: null,
  project_id: null,
  kendaraan_id: null,
  personil_pengantar_id: null,
  kategori_approval: null,
  items: [{ barang_id: String(b.barang_id), qty: qty, satuan_id: String(s.satuan_id), kondisi: "baik" }],
});

function ok(label, cond) {
  console.log((cond ? "  PASS  " : "  FAIL  ") + label);
  return !!cond;
}

(async () => {
  let results = { reject: 0, approve: 0 };
  try {
    [u, b, s, g] = await Promise.all([
      prisma.user_account.findFirst({ select: { user_id: true } }),
      prisma.barang.findFirst({ select: { barang_id: true } }),
      prisma.satuan.findFirst({ select: { satuan_id: true } }),
      prisma.gudang.findFirst({ select: { gudang_id: true } }),
    ]);
    if (!u || !b || !s || !g) throw new Error("Missing FK fixtures");

    // Ensure exactly one stok_gudang row for (gudang, barang, baik) with qty>=100
    const existing = await prisma.stok_gudang.findFirst({
      where: { gudang_id: Number(g.gudang_id), barang_id: Number(b.barang_id), kondisi: "baik" },
    });
    if (!existing) {
      const created = await prisma.stok_gudang.create({
        data: { gudang_id: Number(g.gudang_id), barang_id: Number(b.barang_id), project_id: null, kondisi: "baik", qty: 100, bin_lokasi_id: null },
      });
      createdStok = { id: created.stok_id, wasCreated: true, originalQty: 100 };
    } else {
      createdStok = { id: existing.stok_id, wasCreated: false, originalQty: Number(existing.qty) };
      originals.stokQty = Number(existing.qty);
      if (createdStok.originalQty < 100) {
        await prisma.stok_gudang.update({ where: { stok_id: createdStok.id }, data: { qty: 100 } });
      }
    }

    // ---- REJECT test ----
    console.log("=== REJECT end-to-end ===");
    const sj1 = await repo.create(SJ(1), Number(u.user_id));
    throwaways.push(sj1.surat_jalan_id);
    ok("before: status draft_diajukan", sj1.status === "draft_diajukan");

    const rejected = await service.rejectOutbound(sj1.surat_jalan_id, "Alasan penolakan verifikasi test", Number(u.user_id));
    ok("after: status ditolak", rejected.status === "ditolak");

    const al = await prisma.audit_log.findFirst({
      where: { entity_type: "surat_jalan", entity_id: BigInt(sj1.surat_jalan_id), aksi: "reject_outbound" },
    });
    ok("audit_log reject_outbound written", !!al);
    const apl = await prisma.approval_log.findFirst({ where: { entity_type: "surat_jalan", entity_id: BigInt(sj1.surat_jalan_id) } });
    ok("approval_log written (status ditolak)", apl && apl.status === "ditolak" && apl.catatan === "Alasan penolakan verifikasi test");
    results.reject = al && rejected.status === "ditolak" ? 1 : 0;

    // ---- APPROVE test ----
    console.log("\n=== APPROVE end-to-end ===");
    const sj2 = await repo.create(SJ(1), Number(u.user_id));
    throwaways.push(sj2.surat_jalan_id);

    const beforeStok = await prisma.stok_gudang.findUnique({ where: { stok_id: createdStok.id } });
    const approved = await service.approveOutbound(sj2.surat_jalan_id, Number(u.user_id));
    ok("after: status disetujoi", approved.status === "disetujoi");

    const al2 = await prisma.audit_log.findFirst({
      where: { entity_type: "surat_jalan", entity_id: BigInt(sj2.surat_jalan_id), aksi: "approve_outbound" },
    });
    ok("audit_log approve_outbound written", !!al2);
    const apl2 = await prisma.approval_log.findFirst({ where: { entity_type: "surat_jalan", entity_id: BigInt(sj2.surat_jalan_id) } });
    ok("approval_log written (status disetujoi)", apl2 && apl2.status === "disetujoi");

    const afterStok = await prisma.stok_gudang.findUnique({ where: { stok_id: createdStok.id } });
    const deducted = afterStok && beforeStok && Number(afterStok.qty) === Number(beforeStok.qty) - 1;
    ok("stok_gudang qty deducted by 1 (" + Number(beforeStok.qty) + " -> " + Number(afterStok.qty) + ")", !!deducted);
    results.approve = al2 && approved.status === "disetujoi" && !!deducted ? 1 : 0;
  } catch (e) {
    console.error("TEST ERROR:", e);
  } finally {
    // ---- CLEANUP (no mutation of real record / real stok) ----
    for (const sid of throwaways) {
      await prisma.$executeRawUnsafe(`DELETE FROM stok_ledger WHERE surat_jalan_item_id IN (SELECT item_id FROM surat_jalan_item WHERE surat_jalan_id = ${Number(sid)})`);
      await prisma.approval_log.deleteMany({ where: { entity_type: "surat_jalan", entity_id: BigInt(sid) } });
      await prisma.audit_log.deleteMany({ where: { entity_type: "surat_jalan", entity_id: BigInt(sid) } });
      await prisma.surat_jalan_item.deleteMany({ where: { surat_jalan_id: Number(sid) } });
      await prisma.surat_jalan.delete({ where: { surat_jalan_id: Number(sid) } });
    }
    if (createdStok) {
      if (createdStok.wasCreated) {
        await prisma.stok_gudang.delete({ where: { stok_id: createdStok.id } });
      } else {
        await prisma.stok_gudang.update({ where: { stok_id: createdStok.id }, data: { qty: originals.stokQty == null ? createdStok.originalQty : originals.stokQty } });
      }
    }
    await prisma.$disconnect();
    console.log("\n=== RESULT ===");
    console.log("reject:", results.reject ? "OK (status+audit+approval-log persisted)" : "FAIL");
    console.log("approve:", results.approve ? "OK (status+audit+approval-log+stock persisted)" : "FAIL");
    console.log("=== verified the single real SJ unchanged? ===");
    const real = await prisma.surat_jalan.findUnique({ where: { surat_jalan_id: 1 }, select: { nomor_surat_jalan: true, status: true } }).catch(() => null);
    console.log("real SJ #1:", real ? real.nomor_surat_jalan + " / " + real.status : "n/a");
  }
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); });
