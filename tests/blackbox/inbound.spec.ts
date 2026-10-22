import { test, expect } from "../fixtures/ui-fixtures";
import { injectSession } from "../utils/helpers";
import { InboundPage } from "../pages/InboundPage";

test.describe("Blackbox Testing: Surat Jalan Inbound (INB-01 s/d INB-10)", () => {
  let inboundPage: InboundPage;

  test.beforeEach(async ({ page }) => {
    await injectSession(page, "staff");
    inboundPage = new InboundPage(page);
    await inboundPage.goto();
  });

  test("INB-01: [Positif/EP] Memuat halaman Penerimaan (Inbound) dan tabel data", async () => {
    await expect(inboundPage.pageHeading).toBeVisible();
    await expect(inboundPage.inputInboundButton).toBeVisible();
    await expect(inboundPage.tableContainer).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Supplemental UI regression checks (tidak terdaftar di matrix blackbox,
  // menjaga stabilitas interaksi tabel & modal inbound).
  // ---------------------------------------------------------------------------

  test("UI-INB-A: [Positif/EP] Pencarian dengan query yang tidak cocok tidak menyebabkan error halaman", async () => {
    await inboundPage.searchInbound("SJ-TIDAK-ADA-999");
    await expect(inboundPage.pageHeading).toBeVisible();
    await expect(inboundPage.tableContainer).toBeVisible();
    await expect(inboundPage.page.locator(".bg-rose-50")).toHaveCount(0);
  });

  test("UI-INB-B: [Positif/ST] Membuka dan menutup modal Input Inbound", async ({ page }) => {
    await inboundPage.openInputModal();

    // Modal input inbound muncul dengan field header lengkap
    await expect(page.locator('[data-testid="inbound-project-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="inbound-nomor-sj"]')).toBeVisible();
    await expect(page.locator('[data-testid="inbound-gudang-tujuan"]')).toBeVisible();

    // Tombol Batal menutup modal
    const closeBtn = page.locator('button:has-text("Batal")');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.locator('[data-testid="inbound-project-select"]')).toHaveCount(0);
  });
});
