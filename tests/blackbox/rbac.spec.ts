import { test, expect } from "@playwright/test";
import { injectSession, clearSession, apiRequest, getAuthToken } from "../utils/helpers";
import { TEST_USERS } from "../fixtures/test-data";
import { DashboardPage } from "../pages/DashboardPage";

test.describe("Blackbox Testing: Role-Based Access Control / RBAC (RBAC-01 s/d RBAC-06)", () => {
  test("RBAC-06: [Negatif/EG] Akses rute terlindungi tanpa token mengarahkan ke halaman login", async ({ page }) => {
    await clearSession(page);
    await page.goto("/dashboard");
    // Karena tidak ada token, client/middleware mengarahkan kembali ke root
    await expect(page).toHaveURL("/", { timeout: 8000 });
  });

  test("RBAC-01: [Negatif/DT] Staf Gudang mencoba akses halaman manajemen pengguna Admin (/dashboard/users)", async ({ page }) => {
    // Suntik sesi Staf Gudang
    await injectSession(page, "staff");

    // Navigasi direct ke URL Admin Users
    await page.goto("/dashboard/users");

    // Halaman users punya role-guard: non-admin dialihkan ke dashboard berwenang.
    await expect(page).toHaveURL(/\/staff\/dashboard/, { timeout: 10000 });
  });

  test("RBAC-02: [Negatif/DT] Staf Gudang mencoba akses halaman Approval Supervisor", async ({ page }) => {
    await injectSession(page, "staff");
    await page.goto("/dashboard/supervisor/approval");

    // Supervisor approval hanya untuk supervisor; staff dialihkan.
    await expect(page).toHaveURL(/\/staff\/dashboard/, { timeout: 10000 });
  });

  test("RBAC-03: [Positif/DT] Supervisor mengakses area operasional supervisor", async ({ page }) => {
    await injectSession(page, "supervisor");
    await page.goto("/dashboard/supervisor");
    await expect(page).toHaveURL(/.*dashboard\/supervisor.*/);

    const dashboardPage = new DashboardPage(page);
    // Menu approval supervisor harus tersedia (sidebar di-expand otomatis)
    await dashboardPage.expectSidebarItemVisible("Approval");
    // Menu khusus Admin tidak tampil untuk supervisor
    await dashboardPage.expectSidebarLinkHidden("/dashboard/users");
  });

  test("RBAC-04: [Negatif/DT] Supervisor mencoba membuat user baru via API secara langsung", async () => {
    const { token } = await getAuthToken(TEST_USERS.supervisor.email, TEST_USERS.supervisor.password);

    const response = await apiRequest(token, "POST", "/api/users", {
      nama: "User Tidak Sah",
      email: `intruder.${Date.now()}@digitak.com`,
      password: "password123",
      role: "staf_gudang",
    });

    expect(response.status).toBe(403);
  });

  test("RBAC-05: [Positif/DT] Admin General mengakses dashboard & menu lengkap", async ({ page }) => {
    await injectSession(page, "admin");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*dashboard$/);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.expectSidebarItemVisible("Master Data");
    await dashboardPage.expectSidebarLinkVisible("/dashboard/users");
    await dashboardPage.expectSidebarLinkVisible("/dashboard/reports");
  });
});
