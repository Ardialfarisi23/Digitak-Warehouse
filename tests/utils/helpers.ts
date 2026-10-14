import { Page } from "@playwright/test";
import { API_BASE_URL, TEST_USERS } from "../fixtures/test-data";

/**
 * Mendapatkan token JWT langsung dari API untuk efisiensi setup state.
 */
export async function getAuthToken(email: string, password: string): Promise<{ token: string; user: any }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Login failed with status ${response.status}: ${JSON.stringify(errorBody)}`);
  }

  const json = await response.json();
  return {
    token: json.data.token,
    user: json.data.user,
  };
}

/**
 * Menyuntikkan token & user data ke localStorage sebelum navigasi agar sesi instan aktif.
 */
export async function injectSession(page: Page, userKey: keyof typeof TEST_USERS): Promise<void> {
  const targetUser = TEST_USERS[userKey];
  const { token, user } = await getAuthToken(targetUser.email, targetUser.password);

  await page.goto("/");
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  }, { token, user });
}

/**
 * Membersihkan seluruh sesi dan cookie browser.
 */
export async function clearSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
