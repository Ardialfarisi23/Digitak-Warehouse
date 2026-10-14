import { test, expect } from "../fixtures/ui-fixtures";
import { LoginPage } from "../pages/LoginPage";
import { TEST_USERS } from "../fixtures/test-data";

test.describe("Blackbox Testing: Autentikasi & Sesi (AUTH-01 s/d AUTH-12)", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("AUTH-01: [Positif/EP] Login Admin General dengan kredensial valid", async ({ page }) => {
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.waitForURL(`**${TEST_USERS.admin.expectedPath}`, { timeout: 10000 });
    expect(page.url()).toContain("/dashboard");

    // Verifikasi token JWT tersimpan di localStorage
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeTruthy();
    expect(token!.length).toBeGreaterThan(20);
  });

  test("AUTH-02: [Positif/EP] Login Supervisor dengan kredensial valid", async ({ page }) => {
    await loginPage.login(TEST_USERS.supervisor.email, TEST_USERS.supervisor.password);
    await page.waitForURL(`**${TEST_USERS.supervisor.expectedPath}`, { timeout: 10000 });
    expect(page.url()).toContain("/dashboard/supervisor");
  });

  test("AUTH-03: [Positif/EP] Login Staf Gudang dengan kredensial valid", async ({ page }) => {
    await loginPage.login(TEST_USERS.staff.email, TEST_USERS.staff.password);
    await page.waitForURL(`**${TEST_USERS.staff.expectedPath}`, { timeout: 10000 });
    expect(page.url()).toContain("/staff/dashboard");
  });

  test("AUTH-04: [Negatif/EP] Login dengan email tidak terdaftar", async () => {
    await loginPage.login(TEST_USERS.invalid.email, TEST_USERS.invalid.password);
    await loginPage.expectErrorMessage("Email atau password salah");
  });

  test("AUTH-05: [Negatif/EP] Login dengan password salah", async () => {
    await loginPage.login(TEST_USERS.admin.email, "wrongpassword123");
    await loginPage.expectErrorMessage("Email atau password salah");
  });

  test("AUTH-06: [Negatif/EG] Login dengan format email tidak valid diblokir validasi form", async ({ page }) => {
    await loginPage.login("admin-tanpa-domain", "admin123");

    // Input type="email" memicu validasi native browser: form tidak terkirim,
    // field ditandai :invalid, dan pengguna tetap di halaman login.
    await loginPage.expectNativeEmailValidationBlocked();
    await expect(page).toHaveURL("/");
  });

  test("AUTH-07: [Negatif/BVA] Login dengan password di bawah 6 karakter", async () => {
    await loginPage.login(TEST_USERS.admin.email, "12345");
    await loginPage.expectValidationError("Password minimal 6 karakter");
  });

  test("AUTH-08: [Positif/BVA] Password tepat 6 karakter lolos validasi panjang form", async () => {
    await loginPage.login(TEST_USERS.admin.email, "123456");

    // Tidak ada error validasi panjang password; form terkirim ke server
    // dan kredensial salah ditolak tingkat server (bukan ditahan form).
    await expect(loginPage.page.locator("p.text-rose-500").filter({ hasText: "Password minimal" })).toHaveCount(0);
    await loginPage.expectErrorMessage("Email atau password salah");
  });

  test("AUTH-09: [Negatif/EG] Login dengan input kosong", async () => {
    await loginPage.submitButton.click();
    await loginPage.expectValidationError("Email wajib diisi");
    await loginPage.expectValidationError("Password wajib diisi");
  });

  test("AUTH-10: [Negatif/EG] Percobaan SQL Injection pada form login", async ({ page }) => {
    await loginPage.login("' OR '1'='1", "' OR '1'='1");

    // Payload tidak lolos validasi format email native/Zod; form tidak terkirim
    // dan tidak ada kebocoran data.
    await loginPage.expectNativeEmailValidationBlocked();
    expect(page.url()).not.toContain("/dashboard");
  });

  test("AUTH-11: [Negatif/DT] Login menggunakan akun yang telah dinonaktifkan", async () => {
    await loginPage.login(TEST_USERS.deactivated.email, TEST_USERS.deactivated.password);
    await loginPage.expectErrorMessage("Akun telah dinonaktifkan");
  });

  test("AUTH-12: [Positif/ST] Logout menghapus sesi dan mengarahkan ke halaman login", async ({ page }) => {
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password);
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Token tersimpan saat login
    const tokenBefore = await page.evaluate(() => localStorage.getItem("token"));
    expect(tokenBefore).toBeTruthy();

    // Logout via menu profil
    await page.locator('header button:has(div:has(p.capitalize))').click();
    const logoutButton = page.locator('button:has-text("Keluar")');
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();

    // Redirect ke root & sesi dibersihkan
    await expect(page).toHaveURL("/", { timeout: 8000 });
    const tokenAfter = await page.evaluate(() => localStorage.getItem("token"));
    expect(tokenAfter).toBeNull();

    // Akses direct URL ke dashboard setelah logout harus kembali ke login
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/", { timeout: 8000 });
  });
});
