import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { TEST_USERS } from "../fixtures/test-data";

test.describe("E2E User Journey 01: Multi-Role Authentication, RBAC, and Navigation Workflow", () => {
  test("Siklus Lengkap: Login Admin -> Akses Dashboard & Master Data -> Logout -> Login Supervisor -> Verifikasi Otorisasi -> Login Staff", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // ========================================================
    // TAHAP 1: ADMIN GENERAL WORKFLOW
    // ========================================================
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Redirect to Admin Dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");

    // Periksa navigasi Admin
    await dashboardPage.expectSidebarItemVisible("Master Data");
    await dashboardPage.expectSidebarItemVisible("Gudang & Layout");

    // Navigasi ke Master Data
    await page.goto("/master-data");
    await expect(page.locator('input[placeholder*="Cari"]')).toBeVisible({ timeout: 8000 });

    // Logout Admin
    await dashboardPage.logout();
    expect(page.url()).toBe("http://localhost:3000/");

    // ========================================================
    // TAHAP 2: SUPERVISOR WORKFLOW & RBAC RESTRICTION
    // ========================================================
    await loginPage.login(TEST_USERS.supervisor.email, TEST_USERS.supervisor.password);
    await page.waitForURL("**/dashboard/supervisor", { timeout: 10000 });
    expect(page.url()).toContain("/dashboard/supervisor");

    // Supervisor memeriksa menu Approval
    await dashboardPage.expectSidebarItemVisible("Approval");

    // Supervisor mencoba rute Admin yang dilarang (/dashboard/users)
    await page.goto("/dashboard/users");
    await page.waitForTimeout(1500);
    // RBAC harus mengalihkan atau memblokir akses
    expect(page.url()).not.toContain("/dashboard/users");

    // Logout Supervisor
    await page.goto("/dashboard/supervisor");
    await dashboardPage.logout();
    expect(page.url()).toBe("http://localhost:3000/");

    // ========================================================
    // TAHAP 3: STAF GUDANG WORKFLOW & RESTRICTIONS
    // ========================================================
    await loginPage.login(TEST_USERS.staff.email, TEST_USERS.staff.password);
    await page.waitForURL("**/staff/dashboard", { timeout: 10000 });
    expect(page.url()).toContain("/staff/dashboard");

    // Staf memeriksa menu operasional
    await expect(page.locator('aside, nav').filter({ hasText: /Penerimaan|Inbound/i }).first()).toBeVisible({ timeout: 8000 });

    // Staf mencoba rute Approval Supervisor yang dilarang
    await page.goto("/dashboard/supervisor/approval");
    await page.waitForTimeout(1500);
    expect(page.url()).not.toContain("/dashboard/supervisor/approval");

    // Logout Staf
    await page.goto("/staff/dashboard");
    await dashboardPage.logout();
    expect(page.url()).toBe("http://localhost:3000/");
  });
});
