import { test, expect } from "../fixtures/ui-fixtures";
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

  test("MSTR-01: [Positif/EP] Membuka daftar Master Barang dan verifikasi data tampil", async () => {
    await masterDataPage.selectTab("Barang");
    await expect(masterDataPage.tableContainer).toBeVisible({ timeout: 8000 });
    await masterDataPage.expectHasRows();
  });

  test("MSTR-04: [Positif/EP] Membuka Master Gudang dan verifikasi list gudang", async () => {
    await masterDataPage.selectTab("Gudang");
    await expect(masterDataPage.tableContainer).toBeVisible({ timeout: 8000 });
    await masterDataPage.expectTableContains("Gudang");
  });

  test("MSTR-06: [Positif/EP] Membuka Master Kendaraan", async () => {
    await masterDataPage.selectTab("Kendaraan");
    await expect(masterDataPage.tableContainer).toBeVisible({ timeout: 8000 });
  });

  test("MSTR-10: [Negatif/EG] XSS Safety pada input pencarian Master Data", async ({ page }) => {
    const xssPayload = "<script>window.__xss_flag = true;</script>";
    await masterDataPage.search(xssPayload);

    // React melakukan escape pada teks/atribut; flag tidak boleh ter-set.
    const isXssExecuted = await page.evaluate(() => (window as any).__xss_flag === true);
    expect(isXssExecuted).toBeFalsy();

    // Halaman tetap stabil setelah input berbahaya
    await expect(masterDataPage.pageHeading).toBeVisible();
  });
});
