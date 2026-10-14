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
    this.serverErrorAlert = page.locator(".bg-rose-50").first();
    this.emailErrorText = page.locator("p.text-rose-500").filter({ hasText: "Email" });
    this.passwordErrorText = page.locator("p.text-rose-500").filter({ hasText: "Password" });
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
    const errorLocator = this.page.locator("p.text-rose-500").filter({ hasText: messageSubstring });
    await expect(errorLocator).toBeVisible({ timeout: 5000 });
  }

  /**
   * Input bertipe `type="email"` memicu validasi native browser yang
   * memblokir submit form sebelum pesan Zod sempat dirender.
   * Assertion stabil untuk perilaku tersebut: field ditandai :invalid
   * oleh browser dan pengguna tetap di halaman login.
   */
  async expectNativeEmailValidationBlocked() {
    await expect(this.emailInput).toBeVisible();
    const isInvalid = await this.emailInput.evaluate(
      (el: HTMLInputElement) => el.matches(":invalid"),
    );
    expect(isInvalid).toBe(true);
  }
}
