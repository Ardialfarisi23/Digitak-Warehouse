const prisma = require("./src/config/prisma");

(async () => {
  try {
    const enums = ["surat_jalan_status", "audit_aksi", "approval_status"];
    for (const t of enums) {
      const rows = await prisma.$queryRaw`SELECT enumlabel FROM pg_enum e JOIN pg_type ty ON ty.oid = e.enumtypid WHERE ty.typname = ${t} ORDER BY e.oid;`;
      console.log(`\n=== ${t} (DB actual) ===`);
      rows.forEach((r) => console.log("  -", r.enumlabel));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
