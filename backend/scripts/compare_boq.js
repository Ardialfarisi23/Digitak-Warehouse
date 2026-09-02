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
  const all = await prisma.surat_jalan.findMany({
    select: {
      surat_jalan_id: true,
      nomor_surat_jalan: true,
      boq_id: true,
      tipe: true,
      status: true,
      project_id: true,
      created_by: true,
      created_at: true,
      kategori_approval: true,
      pic_pemohon_nama: true,
      boq: {
        select: {
          tiket: {
            select: {
              kode_tiket: true,
            },
          },
        },
      },
    },
  });

  const withBoq = all.filter(s => s.boq_id !== null);
  const withoutBoq = all.filter(s => s.boq_id === null);

  console.log('=== DENGAN boq_id (kode_tiket terisi) ===');
  console.log(JSON.stringify(convertBigInt(withBoq), null, 2));

  console.log('\n=== TANPA boq_id (kode_tiket kosong) ===');
  console.log(JSON.stringify(convertBigInt(withoutBoq), null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
