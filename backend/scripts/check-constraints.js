const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const constraints = await prisma.$queryRaw`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      tc.constraint_type
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name IN ('personil', 'gudang')
    ORDER BY tc.table_name, tc.constraint_name
  `;

  console.log('Table constraints:', constraints);

  const indexes = await prisma.$queryRaw`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename IN ('personil', 'gudang')
    ORDER BY tablename, indexname
  `;

  console.log('Indexes:', indexes);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
