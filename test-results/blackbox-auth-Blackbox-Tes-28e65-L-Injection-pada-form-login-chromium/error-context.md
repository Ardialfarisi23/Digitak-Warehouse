# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: blackbox\auth.spec.ts >> Blackbox Testing: Autentikasi & Sesi (AUTH-01 s/d AUTH-12) >> AUTH-10: [Negatif/EG] Percobaan SQL Injection pada form login
- Location: tests\blackbox\auth.spec.ts:63:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.text-rose-500').filter({ hasText: 'Format email tidak valid' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.text-rose-500').filter({ hasText: 'Format email tidak valid' }) with timeout 5000ms
  - waiting for locator('.text-rose-500').filter({ hasText: 'Format email tidak valid' })

```

```yaml
- img "Digitak Logo"
- heading "Warehouse Management System" [level=1]
- paragraph: Kelola operasional gudang dengan lebih cerdas, lebih cepat, dan lebih efisien.
- img "Warehouse Illustration"
- text: Pemantauan Gudang secara Real-time Pelacakan Gudang Role-Based Access yang Dilindungi
- img "Digitak Logo"
- heading "Selamat Datang" [level=2]
- paragraph: Silakan masuk untuk melanjutkan.
- text: Email
- textbox "Email":
  - /placeholder: email@example.com
  - text: "' OR '1'='1"
- text: Kata Sandi
- textbox "Kata Sandi":
  - /placeholder: ••••••••
  - text: "' OR '1'='1"
- button
- checkbox "Ingat Saya"
- text: Ingat Saya
- link "Lupa Kata Sandi?":
  - /url: /forgot-password
- button "Masuk"
- text: Dilindungi oleh Role-Based Access Control
- paragraph: © Warehouse Management System - PT Metanouva Informatika
- paragraph: Version 1.0
- alert
```

# Test source

```ts
  1  | import { Page, Locator, expect } from "@playwright/test";
  2  | 
  3  | export class LoginPage {
  4  |   readonly page: Page;
  5  |   readonly emailInput: Locator;
  6  |   readonly passwordInput: Locator;
  7  |   readonly submitButton: Locator;
  8  |   readonly serverErrorAlert: Locator;
  9  |   readonly emailErrorText: Locator;
  10 |   readonly passwordErrorText: Locator;
  11 | 
  12 |   constructor(page: Page) {
  13 |     this.page = page;
  14 |     this.emailInput = page.locator("#email");
  15 |     this.passwordInput = page.locator("#password");
  16 |     this.submitButton = page.locator('button[type="submit"]');
  17 |     this.serverErrorAlert = page.locator(".bg-rose-50");
  18 |     this.emailErrorText = page.locator("#email ~ p, div:has(#email) p.text-rose-500");
  19 |     this.passwordErrorText = page.locator("div:has(#password) p.text-rose-500");
  20 |   }
  21 | 
  22 |   async goto() {
  23 |     await this.page.goto("/");
  24 |     await expect(this.emailInput).toBeVisible({ timeout: 10000 });
  25 |   }
  26 | 
  27 |   async login(email: string, pass: string) {
  28 |     await this.emailInput.fill(email);
  29 |     await this.passwordInput.fill(pass);
  30 |     await this.submitButton.click();
  31 |   }
  32 | 
  33 |   async expectErrorMessage(messageSubstring: string) {
  34 |     await expect(this.serverErrorAlert).toContainText(messageSubstring, { timeout: 8000 });
  35 |   }
  36 | 
  37 |   async expectValidationError(messageSubstring: string) {
  38 |     const errorLocator = this.page.locator(".text-rose-500").filter({ hasText: messageSubstring });
> 39 |     await expect(errorLocator).toBeVisible({ timeout: 5000 });
     |                                ^ Error: expect(locator).toBeVisible() failed
  40 |   }
  41 | }
  42 | 
```