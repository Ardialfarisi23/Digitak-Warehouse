const prisma = require('D:/Project/digitak-warehouse/backend/src/config/prisma');

async function audit() {
  const allSelesai = await prisma.boq.findMany({
    where: { status: 'selesai' },
    select: {
      boq_id: true,
      boq_number: true,
      source: true,
      status: true,
      tiket: { select: { kode_tiket: true, project: { select: { nama_project: true } } } },
      items: { select: { boq_item_id: true } },
    },
  });

  console.log(`\nTotal BOQ selesai: ${allSelesai.length}\n`);

  let passCount = 0;
  let failCount = 0;

  for (const boq of allSelesai) {
    const normalizedSource = boq.source === 'EMAIL_PO' ? 'top_down'
      : boq.source === 'SUPERVISOR_REQUEST' ? 'bottom_up'
      : boq.source === 'TOP_DOWN' ? 'top_down'
      : boq.source === 'BOTTOM_UP' ? 'bottom_up'
      : boq.source?.toLowerCase();

    const passes = normalizedSource === 'top_down';
    const symbol = passes ? 'PASS' : 'FAIL';

    if (passes) passCount++;
    else failCount++;

    console.log(`${symbol} | id=${boq.boq_id} | ${boq.boq_number} | source=${boq.source} | items=${boq.items.length}`);
  }

  console.log(`\nLolos: ${passCount}, Tersaring: ${failCount}`);

  await prisma.$disconnect();
}

audit().catch(err => {
  console.error(err);
  process.exit(1);
});
