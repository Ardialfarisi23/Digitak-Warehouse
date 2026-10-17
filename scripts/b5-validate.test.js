const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { validateUploadFile } = require("../backend/src/modules/reports/upload-validate");

const parseDir = path.join(__dirname, "..", "backend", "src", "uploads", "reconciliation");
const files = fs.readdirSync(parseDir).filter((f) => f.endsWith(".xlsx")).sort();

let passed = 0;
let failed = 0;

// 1. Semua 9 file contoh harus lolos dengan mimetype xlsx standar
for (const f of files) {
  const buffer = fs.readFileSync(path.join(parseDir, f));
  const r = validateUploadFile({
    originalname: f,
    mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  if (r.ok) { passed += 1; } else { failed += 1; console.log("GAGAL (xlsx mimetype):", f, r.reason); }
}

// 2. Semua 9 file contoh harus lolos dengan application/octet-stream
for (const f of files) {
  const buffer = fs.readFileSync(path.join(parseDir, f));
  const r = validateUploadFile({
    originalname: f,
    mimetype: "application/octet-stream",
    buffer,
  });
  if (r.ok) { passed += 1; } else { failed += 1; console.log("GAGAL (octet-stream):", f, r.reason); }
}

// 3. Mimetype kosong ditolak
for (const f of files.slice(0, 3)) {
  const buffer = fs.readFileSync(path.join(parseDir, f));
  const r = validateUploadFile({ originalname: f, mimetype: "", buffer });
  if (!r.ok && r.reason === "mimetype_kosong") { passed += 1; } else { failed += 1; console.log("GAGAL (mimetype kosong):", f, r); }
}

// 4. File .xlsx palsu (isi teks biasa) ditolak
const fakeBuffer = Buffer.from("ini bukan file excel, ini cuma teks biasa");
const rFake = validateUploadFile({ originalname: "palsu.xlsx", mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: fakeBuffer });
if (!rFake.ok && rFake.reason === "magic_bytes_tidak_cocok") { passed += 1; } else { failed += 1; console.log("GAGAL (palsu):", rFake); }

// 5. Buffer kosong ditolak
const rEmpty = validateUploadFile({ originalname: "kosong.xlsx", mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.alloc(0) });
if (!rEmpty.ok && rEmpty.reason === "buffer_kosong") { passed += 1; } else { failed += 1; console.log("GAGAL (buffer kosong):", rEmpty); }

// 6. Ekstensi tidak diterima
const rExt = validateUploadFile({ originalname: "file.txt", mimetype: "text/plain", buffer: Buffer.from("hello") });
if (!rExt.ok && rExt.reason === "ekstensi_tidak_diterima") { passed += 1; } else { failed += 1; console.log("GAGAL (ekstensi):", rExt); }

console.log(`\nValidator tes: ${passed} lulus, ${failed} gagal`);
process.exit(failed > 0 ? 1 : 0);
