// Baseline B2/B3 response sebelum pemangkasan include/select.
// Panggil fungsi repository langsung (tanpa HTTP), simpan JSON type-tagged ke tmp/b2b3-before/.
const fs = require("fs");
const path = require("path");

const { getInventory } = require("../backend/src/modules/reconciliation/reconciliation.repository");
const {
  getHardwareReconciliation,
  getHardwareReconciliationPerTiket,
  getHardwareReconciliationDetailed,
} = require("../backend/src/modules/reports/reports.repository");

const outDir = path.join(__dirname, "..", "tmp", "b2b3-before");
fs.mkdirSync(outDir, { recursive: true });

function tag(value) {
  if (value === null) return { type: "null", value: null };
  if (value === undefined) return { type: "undefined", value: null };
  if (typeof value === "number") return { type: "number", value: value };
  if (typeof value === "boolean") return { type: "boolean", value: value };
  if (value instanceof Date) return { type: "date", value: value.toISOString() };
  if (typeof value === "string") return { type: "string", value: value };
  if (Buffer.isBuffer(value)) return { type: "buffer", value: "[Buffer]" };
  if (Array.isArray(value)) return value.map(tag);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) out[k] = tag(value[k]);
    return out;
  }
  return { type: typeof value, value: String(value) };
}

function serialize(obj) {
  return tag(obj);
}

async function save(name, data) {
  const payload = typeof data === "string" ? { raw: data } : data;
  fs.writeFileSync(path.join(outDir, name + ".json"), JSON.stringify(serialize(payload), null, 2));
}

const cases = [
  { name: "b2-inventory-project-all", fn: () => getInventory({ search: "", projectId: "all", warehouseId: "all", status: "all", groupBy: "project", clusterId: "all" }) },
  { name: "b2-inventory-cluster-all", fn: () => getInventory({ search: "", projectId: "all", warehouseId: "all", status: "all", groupBy: "cluster", clusterId: "all" }) },
  { name: "b3-hardware-reconciliation-all", fn: () => getHardwareReconciliation({ projectId: "all", search: "" }) },
  { name: "b3-hardware-per-tiket-all", fn: () => getHardwareReconciliationPerTiket({ projectId: "all", search: "" }) },
  { name: "b3-hardware-detailed-all", fn: () => getHardwareReconciliationDetailed({ projectId: "all", search: "" }) },
];

(async () => {
  let totalRows = 0;
  for (const c of cases) {
    try {
      const result = await c.fn();
      const rows = result && Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : [result]);
      totalRows += rows.length;
      await save(c.name, result);
      console.log(`${c.name}: ${rows.length} baris`);
    } catch (e) {
      console.log(`${c.name}: ERROR ${e.message}`);
      await save(c.name, { error: e.message });
    }
  }
  console.log(`\nBaseline selesai. Total baris: ${totalRows}. Output: ${outDir}`);
})();
