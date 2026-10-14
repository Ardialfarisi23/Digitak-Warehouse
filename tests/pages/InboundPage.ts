import { Page, Locator, expect } from "@playwright/test";

export class InboundPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly inputInboundButton: Locator;
  readonly searchInput: Locator;
  readonly tableContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1:has-text("Penerimaan (Inbound)")');
    this.inputInboundButton = page.locator('button:has-text("Input Inbound")');
    this.searchInput = page.locator('input[placeholder*="Cari No. Surat Jalan"]');
    this.tableContainer = page.locator("table");
  }

  async goto() {
    await this.page.goto("/staff/inbound");
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }

  async openInputModal() {
    await this.inputInboundButton.click();
  }

  async searchInbound(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async expectTableContains(text: string) {
    await expect(this.tableContainer).toContainText(text, { timeout: 8000 });
  }
}
