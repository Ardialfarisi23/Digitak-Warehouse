const prisma = require('../src/config/prisma');

async function main() {
  const count = await prisma.gudang.count();
  console.log('COUNT:', count);

  const rows = await prisma.gudang.findMany({
    select: {
      gudang_id: true,
      nama_gudang: true,
      tipe: true,
    },
    orderBy: { gudang_id: 'asc' },
  });

  console.log('ROWS:');
  for (const row of rows) {
    console.log(`${row.gudang_id} | ${row.nama_gudang} | ${row.tipe}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
