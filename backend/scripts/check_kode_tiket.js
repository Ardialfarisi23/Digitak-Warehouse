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
  const all = await prisma.stok_ledger.findMany({
    select: {
      ledger_id: true,
      surat_jalan_item: {
        select: {
          surat_jalan: {
            select: {
              surat_jalan_id: true,
              boq_id: true,
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
          },
        },
      },
    },
  });
  
  const withKodeTiket = all.filter(r => r.surat_jalan_item?.surat_jalan?.boq?.tiket?.kode_tiket);
  const withoutKodeTiket = all.filter(r => !r.surat_jalan_item?.surat_jalan?.boq?.tiket?.kode_tiket);
  
  console.log('Total stok_ledger:', all.length);
  console.log('With kode_tiket:', withKodeTiket.length);
  console.log('Without kode_tiket:', withoutKodeTiket.length);
  
  if (withKodeTiket.length > 0) {
    console.log('Sample WITH kode_tiket:', JSON.stringify(convertBigInt(withKodeTiket.slice(0, 3)), null, 2));
  }
  if (withoutKodeTiket.length > 0) {
    console.log('Sample WITHOUT kode_tiket:', JSON.stringify(convertBigInt(withoutKodeTiket.slice(0, 3)), null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
