const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const orphan = await p.$queryRawUnsafe(`
    SELECT tm."tiket_id", tm."cluster_id"
    FROM "tiket_material" tm
    WHERE tm."cluster_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "cluster" c WHERE c."cluster_id" = tm."cluster_id"
      )
  `);
  console.log(JSON.stringify(orphan.map(r => ({ tiket_id: r.tiket_id?.toString(), cluster_id: r.cluster_id?.toString() })), null, 2));
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
