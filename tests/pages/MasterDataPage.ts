import { Page, Locator, expect } from "@playwright/test";

export class MasterDataPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly tableContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder*="Cari"]');
    this.addButton = page.locator('button:has-text("Tambah")');
    this.tableContainer = page.locator("table");
  }

  async goto() {
    await this.page.goto("/master-data");
    await expect(this.searchInput).toBeVisible({ timeout: 10000 });
  }

  async selectTab(tabName: "Barang" | "Proyek" | "Personil" | "Kendaraan" | "Gudang" | "Supplier" | "Cluster") {
    const tab = this.page.locator(`button:has-text("${tabName}")`);
    await tab.click();
    await this.page.waitForTimeout(500);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(600); // Debounce
  }

  async expectTableContains(text: string) {
    await expect(this.tableContainer).toContainText(text, { timeout: 8000 });
  }
}
