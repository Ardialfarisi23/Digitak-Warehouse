import { test, expect } from "../fixtures/ui-fixtures";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { TEST_USERS } from "../fixtures/test-data";
import { captureEvidence } from "../utils/helpers";

test.describe("E2E User Journey 01: Multi-Role Authentication, RBAC, and Navigation Workflow", () => {
  test("Siklus Lengkap: Login Admin -> Akses Dashboard & Master Data -> Logout -> Login Supervisor -> Verifikasi Otorisasi -> Login Staff", async ({ page }) => {
    test.slow(); // Journey lintas 3 peran dengan login/logout berulang

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // ========================================================
    // TAHAP 1: ADMIN GENERAL WORKFLOW
    // ========================================================
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);

    // Redirect to Admin Dashboard
    await page.waitForURL(`**${TEST_USERS.admin.expectedPath}`, { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");

    // Periksa navigasi Admin (sidebar di-expand otomatis pada assertion)
    await dashboardPage.expectSidebarItemVisible("Master Data");
    await dashboardPage.expectSidebarItemVisible("Gudang & Layout");
    await dashboardPage.expectSidebarLinkVisible("/dashboard/users");

    await captureEvidence(page, "e2e-01-admin-dashboard");

    // Navigasi ke Master Data
    await page.goto("/master-data");
    await expect(page.locator('input[placeholder*="Cari"]').first()).toBeVisible({ timeout: 8000 });

    // Logout Admin
    await dashboardPage.logout();

    // ========================================================
    // TAHAP 2: SUPERVISOR WORKFLOW & RBAC RESTRICTION
    // ========================================================
    await loginPage.login(TEST_USERS.supervisor.email, TEST_USERS.supervisor.password);
    await page.waitForURL(`**${TEST_USERS.supervisor.expectedPath}`, { timeout: 10000 });
    expect(page.url()).toContain("/dashboard/supervisor");

    // Supervisor memeriksa menu Approval
    await dashboardPage.expectSidebarItemVisible("Approval");

    await captureEvidence(page, "e2e-01-supervisor-dashboard");

    // Supervisor mencoba rute Admin yang dilarang (/dashboard/users).
    // Role-guard halaman users mengalihkan supervisor keluar dari rute tersebut.
    await page.goto("/dashboard/users");
    await expect(page).not.toHaveURL(/\/dashboard\/users/, { timeout: 10000 });

    // Logout Supervisor
    await page.goto("/dashboard/supervisor");
    await dashboardPage.logout();

    // ========================================================
    // TAHAP 3: STAF GUDANG WORKFLOW & RESTRICTIONS
    // ========================================================
    await loginPage.login(TEST_USERS.staff.email, TEST_USERS.staff.password);
    await page.waitForURL(`**${TEST_USERS.staff.expectedPath}`, { timeout: 10000 });
    expect(page.url()).toContain("/staff/dashboard");

    // Staf memeriksa menu operasional
    await dashboardPage.expectSidebarItemVisible("Penerimaan");

    await captureEvidence(page, "e2e-01-staff-dashboard");

    // Staf mencoba rute Approval Supervisor yang dilarang -> dialihkan
    await page.goto("/dashboard/supervisor/approval");
    await expect(page).toHaveURL(/\/staff\/dashboard/, { timeout: 10000 });

    // Logout Staf
    await page.goto("/staff/dashboard");
    await dashboardPage.logout();
  });
});
