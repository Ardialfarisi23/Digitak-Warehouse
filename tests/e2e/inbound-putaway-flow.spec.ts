import { test, expect } from "../fixtures/ui-fixtures";
import { injectSession } from "../utils/helpers";
import { InboundPage } from "../pages/InboundPage";

test.describe("E2E User Journey 02: Inbound Material and Warehouse Management", () => {
  test("Staf Gudang memeriksa Inbound -> Membuka Lokasi & Putaway -> Admin memverifikasi laporan", async ({ page }) => {
    // 1. Login sebagai Staf Gudang
    await injectSession(page, "staff");

    // 2. Buka Inbound
    const inboundPage = new InboundPage(page);
    await inboundPage.goto();
    await expect(inboundPage.pageHeading).toBeVisible();

    // 3. Buka halaman Putaway & Lokasi Rak
    await page.goto("/staff/putaway");
    await expect(page.locator("h1, h2").filter({ hasText: /Putaway|Lokasi|Rak/i }).first()).toBeVisible({ timeout: 10000 });

    // 4. Buka Riwayat Transaksi Staf
    await page.goto("/staff/history");
    await expect(page.locator("h1, h2").filter({ hasText: /Riwayat|History/i }).first()).toBeVisible({ timeout: 10000 });

    // 5. Admin memeriksa Laporan & Audit
    await injectSession(page, "admin");
    await page.goto("/dashboard/reports");
    await expect(page.locator("h1, h2").filter({ hasText: /Laporan|Audit/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
