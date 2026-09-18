const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restore() {
  try {
    const insertData = {
      barang_id: 58,
      kode_perangkat: ' PRK-SVR-001',
      nama_barang: 'Server Rack 2U',
      kategori_id: 3,
      satuan_default_id: 4,
      foto: 'http://localhost:5000/uploads/file-1789730872794-476802109.webp',
      created_at: '2026-09-18 11:27:52.818',
      updated_at: '2026-09-18 11:27:52.818',
      created_by: 4,
      updated_by: 4,
    };

    console.log('Inserting barang_id=58...');
    await prisma.$executeRaw`
      INSERT INTO public.barang 
      (barang_id, kode_perangkat, nama_barang, kategori_id, satuan_default_id, foto, created_at, updated_at, created_by, updated_by)
      VALUES (
        ${insertData.barang_id}::bigint,
        ${insertData.kode_perangkat},
        ${insertData.nama_barang},
        ${insertData.kategori_id}::bigint,
        ${insertData.satuan_default_id}::bigint,
        ${insertData.foto},
        ${insertData.created_at}::timestamp without time zone,
        ${insertData.updated_at}::timestamp without time zone,
        ${insertData.created_by}::bigint,
        ${insertData.updated_by}::bigint
      )
    `;
    console.log('Insert successful');

    const maxId = await prisma.barang.findFirst({
      orderBy: { barang_id: 'desc' },
      select: { barang_id: true },
    });
    console.log('Max barang_id after insert:', maxId);
    console.log('Adjusting sequence barang_id_seq to', Number(maxId.barang_id));

    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('public.barang', 'barang_id'), ${Number(maxId.barang_id)}, true)`;
    console.log('Sequence adjusted');

    const nextVal = await prisma.$queryRaw`SELECT nextval(pg_get_serial_sequence('public.barang', 'barang_id')) AS next_val`;
    console.log('Next barang_id will be:', nextVal[0]?.next_val);

    const count = await prisma.barang.count();
    console.log('Total barang now:', count);

    const restored = await prisma.barang.findUnique({
      where: { barang_id: 58 },
      select: {
        barang_id: true,
        kode_perangkat: true,
        nama_barang: true,
        kategori_id: true,
        satuan_default_id: true,
        foto: true,
        created_at: true,
        updated_at: true,
        created_by: true,
        updated_by: true,
      },
    });
    console.log('Restored item:', JSON.stringify(restored, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

restore();
