import { test, expect } from "@playwright/test";
import { injectSession, clearSession } from "../utils/helpers";
import { DashboardPage } from "../pages/DashboardPage";

test.describe("Blackbox Testing: Role-Based Access Control / RBAC (RBAC-01 s/d RBAC-06)", () => {
  test("RBAC-06: [Negatif/EG] Akses rute terlindungi tanpa token mengarahkan ke halaman login", async ({ page }) => {
    await clearSession(page);
    await page.goto("/dashboard");
    // Karena tidak ada token, client/middleware mengarahkan kembali ke root
    await page.waitForURL("**/", { timeout: 8000 });
    expect(page.url()).toBe("http://localhost:3000/");
  });

  test("RBAC-01: [Negatif/DT] Staf Gudang mencoba akses halaman manajemen pengguna Admin (/dashboard/users)", async ({ page }) => {
    // Suntik sesi Staf Gudang
    await injectSession(page, "staff");

    // Navigasi direct ke URL Admin Users
    await page.goto("/dashboard/users");

    // Tunggu evaluasi otorisasi
    await page.waitForTimeout(1500);

    // Verifikasi bahwa URL tidak berada di /dashboard/users (dialihkan ke rute yang berwenang)
    expect(page.url()).not.toContain("/dashboard/users");
  });

  test("RBAC-02: [Negatif/DT] Staf Gudang mencoba akses halaman Approval Supervisor", async ({ page }) => {
    await injectSession(page, "staff");
    await page.goto("/dashboard/supervisor/approval");
    await page.waitForTimeout(1500);
    expect(page.url()).not.toContain("/dashboard/supervisor/approval");
  });

  test("RBAC-03: [Positif/DT] Supervisor mengakses area operasional supervisor", async ({ page }) => {
    await injectSession(page, "supervisor");
    await page.goto("/dashboard/supervisor");
    await expect(page).toHaveURL(/.*dashboard\/supervisor.*/);

    const dashboardPage = new DashboardPage(page);
    // Menu approval supervisor harus tersedia
    await dashboardPage.expectSidebarItemVisible("Approval");
  });

  test("RBAC-05: [Positif/DT] Admin General mengakses dashboard & menu lengkap", async ({ page }) => {
    await injectSession(page, "admin");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*dashboard$/);

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.expectSidebarItemVisible("Master Data");
  });
});
