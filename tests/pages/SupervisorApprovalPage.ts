import { Page, Locator, expect } from "@playwright/test";

export class SupervisorApprovalPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly outboundApprovalCard: Locator;
  readonly inboundApprovalCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1:has-text("Pilih Alur Persetujuan")');
    this.outboundApprovalCard = page.locator('a[href*="/dashboard/supervisor/delivery"]');
    this.inboundApprovalCard = page.locator('a[href*="/dashboard/supervisor/approval/inbound"]');
  }

  async goto() {
    await this.page.goto("/dashboard/supervisor/approval");
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }

  async openOutboundApproval() {
    await this.outboundApprovalCard.click();
    await this.page.waitForURL("**/dashboard/supervisor/delivery**", { timeout: 8000 });
  }
}
