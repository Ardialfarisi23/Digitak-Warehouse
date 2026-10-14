import { Page, Locator, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly userProfileButton: Locator;
  readonly logoutButton: Locator;
  readonly sidebarContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userProfileButton = page.locator('header button:has(div:has(p.capitalize))');
    this.logoutButton = page.locator('button:has-text("Keluar")');
    this.sidebarContainer = page.locator('aside, nav[aria-label="Sidebar"], [class*="CompactSidebar"]');
  }

  async logout() {
    await this.userProfileButton.click();
    await expect(this.logoutButton).toBeVisible({ timeout: 5000 });
    await this.logoutButton.click();
    await this.page.waitForURL("**/", { timeout: 8000 });
  }

  async expectSidebarItemVisible(text: string) {
    const item = this.page.locator(`aside a:has-text("${text}"), nav a:has-text("${text}")`);
    await expect(item.first()).toBeVisible({ timeout: 8000 });
  }

  async expectSidebarItemNotVisible(text: string) {
    const item = this.page.locator(`aside a:has-text("${text}"), nav a:has-text("${text}")`);
    await expect(item).toHaveCount(0);
  }
}
