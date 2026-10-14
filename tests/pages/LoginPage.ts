import { Page, Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly serverErrorAlert: Locator;
  readonly emailErrorText: Locator;
  readonly passwordErrorText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator("#email");
    this.passwordInput = page.locator("#password");
    this.submitButton = page.locator('button[type="submit"]');
    this.serverErrorAlert = page.locator(".bg-rose-50");
    this.emailErrorText = page.locator("#email ~ p, div:has(#email) p.text-rose-500");
    this.passwordErrorText = page.locator("div:has(#password) p.text-rose-500");
  }

  async goto() {
    await this.page.goto("/");
    await expect(this.emailInput).toBeVisible({ timeout: 10000 });
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  async expectErrorMessage(messageSubstring: string) {
    await expect(this.serverErrorAlert).toContainText(messageSubstring, { timeout: 8000 });
  }

  async expectValidationError(messageSubstring: string) {
    const errorLocator = this.page.locator(".text-rose-500").filter({ hasText: messageSubstring });
    await expect(errorLocator).toBeVisible({ timeout: 5000 });
  }
}
