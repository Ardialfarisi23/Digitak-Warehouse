const jwt = require("jsonwebtoken");
const express = require("express");
const http = require("http");
const prisma = require("./src/config/prisma");
const suratJalanRoutes = require("./src/modules/surat-jalan/surat-jalan.routes");

const JWT_SECRET = process.env.JWT_SECRET || "digitakwarehouse_super_secret";
const PORT = 5050;

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const json = JSON.stringify(body, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
    return originalJson(JSON.parse(json));
  };
  next();
});

app.use("/api/surat-jalan", suratJalanRoutes);

const token = jwt.sign(
  { id: "2", email: "supervisor@test.com", role: "supervisor" },
  JWT_SECRET,
  { expiresIn: "8h" }
);

async function get(path, withAuth) {
  const headers = withAuth ? { Authorization: "Bearer " + token } : {};
  const res = await fetch(`http://localhost:${PORT}${path}`, { headers });
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch (e) { /* keep text */ }
  return { status: res.status, body };
}

const server = app.listen(PORT, async () => {
  try {
    console.log("=== Unauthenticated (expect 401, proves route registered) ===");
    const noAuth = await get("/api/surat-jalan/outbound/approval", false);
    console.log("status:", noAuth.status, JSON.stringify(noAuth.body));

    console.log("\n=== Authenticated: /outbound/approval (Step 1 endpoint) ===");
    const approval = await get("/api/surat-jalan/outbound/approval?page=1&limit=10", true);
    console.log("status:", approval.status);
    const list = approval.body?.data?.data || [];
    const meta = approval.body?.data?.meta;
    console.log("meta:", JSON.stringify(meta));
    for (const r of list) {
      console.log(" -", r.nomor_surat_jalan, "|", r.tipe, "|", r.status, "| project:", r.project?.nama_project, "| asal:", r.gudang_asal?.nama_gudang, "| tujuan:", r.gudang_tujuan?.nama_gudang, "| driver:", r.personil_pengantar?.nama, "| kendaraan:", r.kendaraan?.no_polisi, "| creator:", r.creator?.nama, "| items:", r.items?.length);
      for (const it of r.items || []) {
        console.log("    item:", it.barang?.kode_perangkat, "|", it.barang?.nama_barang, "| qty:", it.qty, "| satuan:", it.satuan?.kode_satuan);
      }
    }

    console.log("\n=== Authenticated: /outbound/delivery (Step 1 endpoint) ===");
    const delivery = await get("/api/surat-jalan/outbound/delivery?page=1&limit=10", true);
    console.log("status:", delivery.status, "total:", delivery.body?.data?.meta?.total);
  } catch (e) {
    console.error("TEST ERROR:", e);
  } finally {
    server.close(() => prisma.$disconnect());
  }
});
