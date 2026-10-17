const fs = require("fs");
const path = require("path");
process.env.NODE_PATH = path.resolve(__dirname, "..", "frontend", "node_modules");
require("module").Module._initPaths();

global.gc && console.log("global.gc available");

global.Blob = function Blob(parts, opts) {
  const bufs = parts || [];
  global.__lastBlobParts = bufs.slice();
  const size = bufs.reduce((s, p) => {
    if (!p) return s;
    if (Buffer.isBuffer(p)) return s + p.length;
    if (p.length) return s + p.length;
    if (p.byteLength) return s + p.byteLength;
    return s;
  }, 0);
  global.__lastBlobSize = size;
  return { size };
};
global.URL = { createObjectURL: () => "mock-url", revokeObjectURL: () => {} };
global.document = { createElement: () => ({ click() {} }), body: { appendChild() {}, removeChild() {} } };

const { exportReconciliationXlsx } = require("../tmp/b8-compiled/exportReconciliationXlsx");

function makeRecords(n) {
  return Array.from({ length: n }, (_, i) => ({
    project_id: `proj-${i % 5}`,
    project_nama: `Project ${i % 5}`,
    cluster_id: `cl-${i % 50}`,
    nama_cluster: `Cluster ${i % 50}`,
    cluster_type: "tipeA",
    project_type: "FTTH",
    alamat_lengkap: `JL ${i}`,
    kso_partner: "Mitra",
    kso_contact: "0812",
    no_tiket_release: "TR-1",
    vendor: "V",
    homepass_plan: 100,
    status_aktif: true,
    pic_nama: `PIC ${i % 10}`,
    kode_tiket: `TKT-${i}`,
    boq_list: [{ kode_boq: `BOQ-${i}` }],
    barang_id: `bar-${i % 20}`,
    nama_barang: `Barang ${i % 20}`,
    kode_perangkat: `KP-${i % 20}`,
    satuan: "pcs",
    gudang_nama: "Gudang A",
    boq: 10,
    additional: 2,
    mos: 50,
    used: 20,
    remains: 30,
    status: "sesuai",
  }));
}

(async () => {
  const outDir = path.join(__dirname, "..", "tmp", "b8-after");
  fs.mkdirSync(outDir, { recursive: true });

  for (const N of [359, 5000]) {
    const records = makeRecords(N);
    if (global.gc) global.gc();
    const mem0 = process.memoryUsage().heapUsed;
    const t0 = Date.now();
    await exportReconciliationXlsx(records);
    const size = global.__lastBlobSize || 0;
    const afterHeap = process.memoryUsage().heapUsed;
    const dt = Date.now() - t0;
    const bytes = global.__lastBlobParts && global.__lastBlobParts[0] ? global.__lastBlobParts[0] : null;
    console.log(`N=${N}: size=${size} bytes, time=${dt}ms, heapBefore=${Math.round(mem0/1024/1024)}MB, heapAfter=${Math.round(afterHeap/1024/1024)}MB`);
    fs.writeFileSync(path.join(outDir, `N${N}.txt`), `N=${N}\nsize=${size}\ntime=${dt}ms\nheapBefore=${mem0}\nheapAfter=${afterHeap}\n`);
    if (bytes) {
      const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
      fs.writeFileSync(path.join(outDir, `N${N}.xlsx`), buf);
    }
    // free reference
    records.length = 0;
  }
  console.log("After selesai. Output:", outDir);
  process.exit(0);
})();
