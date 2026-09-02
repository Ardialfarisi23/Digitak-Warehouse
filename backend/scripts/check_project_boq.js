const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function convertBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(convertBigInt);
  if (typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertBigInt(obj[key]);
    }
    return result;
  }
  return obj;
}

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      project_id: true,
      nama_project: true,
      tiket_materials: {
        select: {
          tiket_id: true,
          kode_tiket: true,
          boq: {
            select: {
              boq_id: true,
              status: true,
            },
          },
        },
      },
    },
  });

  console.log('=== PROJECT → TIKET → BOQ MAPPING ===');
  console.log(JSON.stringify(convertBigInt(projects), null, 2));

  const stats = {};
  for (const p of projects) {
    const count = p.tiket_materials.length;
    stats[count] = (stats[count] || 0) + 1;
  }
  console.log('\n=== PROJECT TIKET COUNT DISTRIBUTION ===');
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
