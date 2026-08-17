require("dotenv").config();
const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const changes = [
  { type: "surat_jalan_status", value: "ditolak" },
  { type: "audit_aksi", value: "receive_inbound" },
  { type: "audit_aksi", value: "approve_inbound" },
  { type: "audit_aksi", value: "approve_outbound" },
  { type: "audit_aksi", value: "confirm_distributed" },
  { type: "audit_aksi", value: "reject_inbound" },
  { type: "audit_aksi", value: "reject_outbound" },
];

(async () => {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const added = [];
  try {
    for (const { type, value } of changes) {
      const exists = await client.query(
        `SELECT 1 FROM pg_enum e JOIN pg_type ty ON ty.oid = e.enumtypid WHERE ty.typname = $1 AND e.enumlabel = $2`,
        [type, value]
      );
      if (exists.rowCount > 0) {
        console.log(`SKIP (already present): ${type}::${value}`);
      } else {
        await client.query(`ALTER TYPE "${type}" ADD VALUE '${value}'`);
        console.log(`ADDED: ${type}::${value}`);
        added.push(`${type}::${value}`);
      }
    }
  } catch (e) {
    console.error("ERROR applying enum fix:", e.message);
    throw e;
  } finally {
    await client.end();
  }

  console.log("\nSummary added:", added.length, added);
})();
