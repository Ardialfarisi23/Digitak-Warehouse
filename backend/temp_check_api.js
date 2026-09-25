require("dotenv").config();
const http = require("http");
const https = require("https");

const baseUrl = process.env.API_BASE || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function fetchData(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const lib = url.protocol === "https:" ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const id = 44;
  const result = await fetchData(`/api/surat-jalan/${id}`);

  const data = result.data?.data || result.data;
  console.log("status:", result.status);
  console.log("created_by raw:", data?.created_by);
  console.log("created_by type:", typeof data?.created_by);
  console.log("created_by === 8:", data?.created_by === 8);
  console.log("created_by === '8':", data?.created_by === "8");
  console.log("Number(created_by):", Number(data?.created_by));
  console.log("user.id sample (string '8') === created_by:", "8" === data?.created_by);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
