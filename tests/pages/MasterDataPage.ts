import { Page, Locator, expect } from "@playwright/test";

export class MasterDataPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly tableContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1:has-text("Master Data")');
    this.searchInput = page.locator('input[placeholder*="Cari"]').first();
    this.addButton = page.locator('button:has-text("Tambah")').first();
    this.tableContainer = page.locator("table");
  }

  async goto() {
    await this.page.goto("/master-data");
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
    await expect(this.searchInput).toBeVisible({ timeout: 10000 });
  }

  async selectTab(tabName: "Barang" | "Proyek" | "Personil" | "Kendaraan" | "Gudang" | "Supplier" | "Cluster") {
    const tab = this.page.locator(`button:has-text("${tabName}")`).first();
    await tab.click();
    // Tunggu tabel termuat ulang untuk tab terpilih (debounce search 400ms
    // ditangani via assertion, bukan sleep statis).
    await expect(this.tableContainer).toBeVisible({ timeout: 8000 });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // Aplikasi mendebounce search 400ms; assertion hanya menunggu tabel
    // tetap ter-render (hasil bisa kosong, tergantung query).
    await expect(this.tableContainer).toBeVisible({ timeout: 8000 });
  }

  async expectHasRows() {
    await expect(this.page.locator("table tbody tr").first()).toBeVisible({ timeout: 8000 });
  }

  async expectTableContains(text: string) {
    await expect(this.tableContainer).toContainText(text, { timeout: 8000 });
  }
}
