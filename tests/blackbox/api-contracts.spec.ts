import { test, expect } from "@playwright/test";
import { apiRequest, getAuthToken } from "../utils/helpers";
import { TEST_USERS, buildUniqueSuratJalanNumber } from "../fixtures/test-data";

/**
 * Blackbox testing tingkat API: memverifikasi aturan bisnis backend
 * berdasarkan input -> response, tanpa mengimplikasikan implementasi internal.
 * Mencakup INB-02, INB-03, dan AUTH-10 (variante API).
 */
test.describe("Blackbox Testing: API Contracts & Business Rules (INB-02, INB-03, AUTH-10-API)", () => {
  let staffToken: string;

  test.beforeAll(async () => {
    const { token } = await getAuthToken(TEST_USERS.staff.email, TEST_USERS.staff.password);
    staffToken = token;
  });

  test("INB-02: [Negatif/EG] Inbound tanpa item barang ditolak validasi", async () => {
    const response = await apiRequest(staffToken, "POST", "/api/surat-jalan/inbound/staff", {
      tipe: "inbound",
      nomor_surat_jalan: buildUniqueSuratJalanNumber(),
      items: [],
    });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain("Minimal satu item");
  });

  test("INB-03: [Negatif/BVA] Inbound dengan qty item = 0 ditolak validasi", async () => {
    const response = await apiRequest(staffToken, "POST", "/api/surat-jalan/inbound/staff", {
      tipe: "inbound",
      nomor_surat_jalan: buildUniqueSuratJalanNumber(),
      items: [
        {
          barang_id: "1",
          qty: 0,
          satuan_id: "4",
          kondisi: "baik",
        },
      ],
    });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain("Qty harus lebih dari 0");
  });

  test("AUTH-10-API: [Negatif/EG] Login API dengan payload SQL Injection ditolak validasi (400) & tidak ada token", async () => {
    const response = await apiRequest(null, "POST", "/api/auth/login", {
      email: "' OR '1'='1' --",
      password: "' OR '1'='1' --",
    });

    // Payload tidak lolos validasi format email (400) dan tidak pernah
    // menghasilkan token sesi.
    expect(response.status).toBe(400);
    expect(response.body?.data?.token).toBeFalsy();
  });

  test("AUTH-API-04: [Negatif/EG] Login API tanpa password ditolak validasi", async () => {
    const response = await apiRequest(null, "POST", "/api/auth/login", {
      email: TEST_USERS.admin.email,
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });
});
