import { test, expect } from "@playwright/test";
import { injectSession } from "../utils/helpers";
import { MasterDataPage } from "../pages/MasterDataPage";

test.describe("Blackbox Testing: Master Data (MSTR-01 s/d MSTR-10)", () => {
  let masterDataPage: MasterDataPage;

  test.beforeEach(async ({ page }) => {
    // Admin login session
    await injectSession(page, "admin");
    masterDataPage = new MasterDataPage(page);
    await masterDataPage.goto();
  });

  test("MSTR-01: [Positif/EP] Membuka daftar Master Barang dan memfilter data", async ({ page }) => {
    await masterDataPage.selectTab("Barang");
    await expect(page.locator("table")).toBeVisible({ timeout: 8000 });

    // Cek keberadaan data barang
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 8000 });
  });

  test("MSTR-04: [Positif/EP] Membuka Master Gudang dan verifikasi list gudang", async ({ page }) => {
    await masterDataPage.selectTab("Gudang");
    await expect(page.locator("table")).toBeVisible({ timeout: 8000 });

    // Verifikasi nama gudang utama tampil
    await masterDataPage.expectTableContains("Gudang");
  });

  test("MSTR-06: [Positif/EP] Membuka Master Kendaraan", async ({ page }) => {
    await masterDataPage.selectTab("Kendaraan");
    await expect(page.locator("table")).toBeVisible({ timeout: 8000 });
  });

  test("MSTR-10: [Negatif/EG] XSS Safety pada input pencarian Master Data", async ({ page }) => {
    const xssPayload = "<script>window.__xss_flag = true;</script>";
    await masterDataPage.search(xssPayload);

    // Pastikan tidak ada script execution
    const isXssExecuted = await page.evaluate(() => (window as any).__xss_flag === true);
    expect(isXssExecuted).toBeFalsy();
  });
});
