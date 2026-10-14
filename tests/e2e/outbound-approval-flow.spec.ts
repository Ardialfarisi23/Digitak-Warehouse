import { test, expect } from "@playwright/test";
import { injectSession } from "../utils/helpers";
import { SupervisorApprovalPage } from "../pages/SupervisorApprovalPage";

test.describe("E2E User Journey 03: Outbound Delivery and Supervisor Approval Workflow", () => {
  test("Alur Outbound: Admin/Staff melihat Surat Jalan -> Supervisor membuka Antrian Approval -> Verifikasi Navigasi", async ({ page }) => {
    // 1. Login sebagai Admin & buka Surat Jalan Delivery
    await injectSession(page, "admin");
    await page.goto("/dashboard/delivery");
    await expect(page.locator("h1, h2").filter({ hasText: /Surat Jalan|Delivery/i }).first()).toBeVisible({ timeout: 10000 });

    // 2. Login sebagai Supervisor & buka Approval Center
    await injectSession(page, "supervisor");
    const approvalPage = new SupervisorApprovalPage(page);
    await approvalPage.goto();
    await expect(approvalPage.pageHeading).toBeVisible();

    // 3. Supervisor membuka riwayat Inbound atau Outbound delivery
    await approvalPage.openOutboundApproval();
    expect(page.url()).toContain("/dashboard/supervisor/delivery");
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  });
});
