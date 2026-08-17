const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./modules/auth/auth.routes");
const warehouseRoutes = require("./modules/warehouse/warehouse.routes");
const aisleRoutes = require("./modules/aisle/aisle.routes");
const binRoutes = require("./modules/bin/bin.routes");
const categoryRoutes = require("./modules/category/category.routes");
const customerRoutes = require("./modules/customer/customer.routes");
const itemRoutes = require("./modules/item/item.routes");
const personnelRoutes = require("./modules/personnel/personnel.routes");
const projectRoutes = require("./modules/projects/project.routes");
const rackRoutes = require("./modules/rack/rack.routes");
const supplierRoutes = require("./modules/supplier/supplier.routes");
const unitRoutes = require("./modules/unit/unit.routes");
const vehicleRoutes = require("./modules/vehicle/vehicle.routes");
const zoneRoutes = require("./modules/zone/zone.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const profileRoutes = require("./modules/profile/profile.routes");
const usersRoutes = require("./modules/users/users.routes");
const suratJalanRoutes = require("./modules/surat-jalan/surat-jalan.routes");
const uploadRoutes = require("./modules/upload/upload.routes");
const boqRoutes = require("./modules/boq/boq.routes");
const permintaanBoqRoutes = require("./modules/permintaan-boq/permintaan-boq.routes");
const reportsRoutes = require("./modules/reports/reports.routes");
const reconciliationRoutes = require("./modules/reconciliation/reconciliation.routes");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://[::1]:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error("CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

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

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Digitak Warehouse API",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/aisles", aisleRoutes);
app.use("/api/bins", binRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/personnels", personnelRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/racks", rackRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/surat-jalan", suratJalanRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/boqs", boqRoutes);
app.use("/api/permintaan-boqs", permintaanBoqRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/reconciliation", reconciliationRoutes);

// Error Handler (HARUS PALING BAWAH)
app.use(errorMiddleware);

module.exports = app;