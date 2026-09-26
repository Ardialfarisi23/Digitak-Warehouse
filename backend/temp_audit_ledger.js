const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
async function main() {
  const col = await p.$queryRawUnsafe(`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_name = 'stok_ledger'
      AND column_name IN ('surat_jalan_item_id', 'return_transaction_id', 'ledger_id', 'barang_id', 'jenis_mutasi', 'qty', 'saldo_setelah', 'waktu_mutasi')
    ORDER BY ordinal_position
  `);
  console.log(JSON.stringify(col, null, 2));

  const fks = await p.$queryRawUnsafe(`
    SELECT conname, contype, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'stok_ledger'::regclass
    ORDER BY conname
  `);
  console.log("\nConstraints:");
  fks.forEach(fk => {
    console.log(`  ${fk.conname} (${fk.contype}): ${fk.pg_get_constraintdef}`);
  });

  const indexes = await p.$queryRawUnsafe(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'stok_ledger'
    ORDER BY indexname
  `);
  console.log("\nIndexes:");
  indexes.forEach(idx => {
    console.log(`  ${idx.indexname}`);
  });

  await p.$disconnect();
}
main();
