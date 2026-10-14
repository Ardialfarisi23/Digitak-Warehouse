export const TEST_USERS = {
  admin: {
    email: "admin@digitakgudang.com",
    password: "admin123",
    role: "admin_general",
    name: "Ardi Alfarisi",
    expectedPath: "/dashboard",
  },
  supervisor: {
    email: "budi.santoso@digitakgudang.com",
    password: "supervisor123",
    role: "supervisor",
    name: "Budi Santoso",
    expectedPath: "/dashboard/supervisor",
  },
  staff: {
    email: "fajar.hidayat@digitakgudang.com",
    password: "fajar123",
    role: "staf_gudang",
    name: "Fajar Hidayat",
    expectedPath: "/staff/dashboard",
  },
  deactivated: {
    email: "staff@gmail.com",
    password: "123456",
  },
  invalid: {
    email: "notregistered@digitak.com",
    password: "wrongpassword",
  },
};

export const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
export const FRONTEND_BASE_URL = process.env.BASE_URL || "http://localhost:3000";

/**
 * Data uji statis untuk alur E2E inbound (dipisahkan dari logika test).
 * Nomor surat jalan dibuat unik per-run agar test idempotent dan bisa diulang.
 */
export const INBOUND_TEST_DATA = {
  vehicleName: "Truk Box Mitsubishi Canter",
  plateNumber: "B 1234 QA",
  driverName: "Budi Setiawan",
  picName: "Fajar Hidayat",
  vendorName: "PT Mitra E2E Testing",
  itemQty: 5,
  itemCondition: "Baik",
};

export function buildUniqueSuratJalanNumber(prefix = "SJ-E2E"): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}
