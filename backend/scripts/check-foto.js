const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const personilsWithFoto = await prisma.personil.findMany({
    where: {
      foto: {
        not: null,
      },
    },
    select: {
      personil_id: true,
      nama: true,
      foto: true,
    },
  });

  console.log('Personils with foto:');
  for (const p of personilsWithFoto) {
    console.log(`- ${p.nama}: ${p.foto}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
