import { test, expect } from "@playwright/test";
import { injectSession } from "../utils/helpers";
import { InboundPage } from "../pages/InboundPage";

test.describe("Blackbox Testing: Surat Jalan Inbound (INB-01 s/d INB-10)", () => {
  let inboundPage: InboundPage;

  test.beforeEach(async ({ page }) => {
    await injectSession(page, "staff");
    inboundPage = new InboundPage(page);
    await inboundPage.goto();
  });

  test("INB-01: [Positif/EP] Memuat halaman Penerimaan (Inbound) dan tabel data", async ({ page }) => {
    await expect(inboundPage.pageHeading).toBeVisible();
    await expect(inboundPage.inputInboundButton).toBeVisible();
  });

  test("INB-02: [Positif/EP] Pencarian Surat Jalan pada tabel Inbound", async ({ page }) => {
    await inboundPage.searchInbound("SJ");
    await page.waitForTimeout(500);
    // Verifikasi bahwa pencarian tidak menyebabkan crash
    await expect(inboundPage.pageHeading).toBeVisible();
  });

  test("INB-03: [Positif/ST] Membuka modal Input Inbound", async ({ page }) => {
    await inboundPage.openInputModal();

    // Modal input inbound harus muncul
    const modalHeader = page.locator("h2, h3").filter({ hasText: /Inbound/i });
    await expect(modalHeader.first()).toBeVisible({ timeout: 8000 });

    // Tombol close atau batal dapat menutup modal
    const closeBtn = page.locator("button").filter({ hasText: /Batal|Tutup/i }).or(page.locator("button:has(svg.lucide-x)"));
    if (await closeBtn.first().isVisible()) {
      await closeBtn.first().click();
    }
  });
});
