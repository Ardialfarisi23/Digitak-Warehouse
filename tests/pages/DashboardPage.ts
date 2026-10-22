import { Page, Locator, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly userProfileButton: Locator;
  readonly logoutButton: Locator;
  readonly sidebarContainer: Locator;
  readonly sidebarExpandButton: Locator;
  readonly sidebarCollapseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userProfileButton = page.locator('header button:has(div:has(p.capitalize))');
    this.logoutButton = page.locator('button:has-text("Keluar")');
    this.sidebarContainer = page.locator('aside, nav[aria-label="Sidebar"], [class*="CompactSidebar"]');
    this.sidebarExpandButton = this.page.locator('button[aria-label="Expand sidebar"]');
    this.sidebarCollapseButton = this.page.locator('button[aria-label="Collapse sidebar"]');
  }

  /**
   * Sidebar default collapsed (icon-only) sehingga label menu tidak ter-render.
   * Expand dulu sebelum assertion berbasis teks; auto-wait tanpa sleep statis.
   */
  async ensureSidebarExpanded() {
    // Tunggu sidebar selesai render (tombol toggle expand/collapse muncul)
    await expect(this.sidebarExpandButton.or(this.sidebarCollapseButton).first()).toBeVisible({ timeout: 10000 });
    if (await this.sidebarExpandButton.isVisible()) {
      await this.sidebarExpandButton.click();
      await expect(this.sidebarCollapseButton).toBeVisible({ timeout: 5000 });
    }
  }

  async logout() {
    await this.userProfileButton.click();
    await expect(this.logoutButton).toBeVisible({ timeout: 5000 });
    await this.logoutButton.click();
    await expect(this.page).toHaveURL("/", { timeout: 8000 });
  }

  async expectSidebarItemVisible(text: string) {
    await this.ensureSidebarExpanded();
    const item = this.page.locator(`aside a:has-text("${text}"), nav a:has-text("${text}")`);
    await expect(item.first()).toBeVisible({ timeout: 8000 });
  }

  /**
   * Assertion berbasis href (stabil terlepas dari sidebar collapsed/expanded).
   */
  async expectSidebarLinkVisible(href: string) {
    const item = this.page.locator(`aside a[href="${href}"], nav a[href="${href}"]`);
    await expect(item.first()).toBeVisible({ timeout: 8000 });
  }

  async expectSidebarLinkHidden(href: string) {
    // Tunggu sidebar selesai render (minimal satu link ada) sebelum assert absence,
    // supaya tidak false-positive saat sidebar masih loading.
    await expect(this.page.locator("aside a, nav a").first()).toBeAttached({ timeout: 8000 });
    const item = this.page.locator(`aside a[href="${href}"], nav a[href="${href}"]`);
    await expect(item).toHaveCount(0);
  }

  async expectSidebarItemNotVisible(text: string) {
    await this.ensureSidebarExpanded();
    const item = this.page.locator(`aside a:has-text("${text}"), nav a:has-text("${text}")`);
    await expect(item).toHaveCount(0);
  }
}
