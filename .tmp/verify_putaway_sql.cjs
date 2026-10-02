const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw`
    WITH pairs AS (
      SELECT
        a.ledger_id AS out_id,
        b.ledger_id AS in_id
      FROM stok_ledger a
      JOIN stok_ledger b ON a.surat_jalan_item_id = b.surat_jalan_item_id
      WHERE a.jenis_mutasi = 'out'
        AND b.jenis_mutasi = 'in'
        AND a.return_transaction_id IS NULL
        AND b.return_transaction_id IS NULL
        AND (
          (a.waktu_mutasi < b.waktu_mutasi AND ABS(EXTRACT(EPOCH FROM (b.waktu_mutasi - a.waktu_mutasi))) <= 1.0)
          OR (a.waktu_mutasi = b.waktu_mutasi AND a.ledger_id < b.ledger_id)
        )
    ),
    out_counts AS (
      SELECT out_id, COUNT(*) AS cnt FROM pairs GROUP BY out_id
    ),
    in_counts AS (
      SELECT in_id, COUNT(*) AS cnt FROM pairs GROUP BY in_id
    ),
    unique_pairs AS (
      SELECT p.out_id, p.in_id
      FROM pairs p
      JOIN out_counts oc ON p.out_id = oc.out_id AND oc.cnt = 1
      JOIN in_counts ic ON p.in_id = ic.in_id AND ic.cnt = 1
    )
    SELECT out_id AS ledger_id FROM unique_pairs
    UNION
    SELECT in_id AS ledger_id FROM unique_pairs
    ORDER BY ledger_id
    LIMIT 20
  `;
  console.log('Rows:', JSON.stringify(rows, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
