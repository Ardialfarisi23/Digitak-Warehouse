require("dotenv").config();

const app = require("./app");
const prisma = require("./config/prisma");
const { PORT } = require("./config/env");

const startServer = async () => {
  console.log("1. startServer dijalankan");
  console.log("2. PORT:", PORT);
  console.log(
    "3. DATABASE_URL tersedia:",
    !!process.env.DATABASE_URL
  );

  try {
    console.log("4. Mencoba koneksi database...");

    await prisma.$connect();

    console.log("5. Database berhasil terhubung");
    console.log("6. Menjalankan app.listen...");

    const server = app.listen(PORT, () => {
      console.log(`
=========================================
🚀 Digitak Warehouse API
Running on http://localhost:${PORT}
=========================================
`);
    });

    server.on("error", (error) => {
      console.error("❌ SERVER ERROR:", error);
    });

    server.on("listening", () => {
      console.log("7. Server berhasil LISTEN di port", PORT);
    });

  } catch (error) {
    console.error("❌ Failed to connect to the database:");
    console.error(error);

    process.exit(1);
  }
};

startServer();