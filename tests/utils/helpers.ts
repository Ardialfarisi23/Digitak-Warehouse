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
 * Helper fetch API generik dengan bearer token. Dipakai test blackbox
 * tingkat API (input -> output) untuk memverifikasi aturan bisnis backend.
 */
export async function apiRequest(
  token: string | null,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let parsed: any = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  return { status: response.status, body: parsed };
}

/**
 * Menyuntikkan token & user data ke localStorage sebelum navigasi agar sesi instan aktif.
 * Sidebar di-expand (localStorage `sidebar-collapsed` = "false") supaya label
 * menu ter-render — default aplikasi adalah collapsed (icon-only).
 */
export async function injectSession(page: Page, userKey: keyof typeof TEST_USERS): Promise<void> {
  const targetUser = TEST_USERS[userKey];
  const { token, user } = await getAuthToken(targetUser.email, targetUser.password);

  await page.goto("/");
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("sidebar-collapsed", "false");
    },
    { token, user },
  );
}

/**
 * Membersihkan seluruh sesi dan cookie browser.
 * HARUS dipanggil setelah halaman aplikasi dimuat (bukan about:blank),
 * karena akses localStorage pada dokumen kosong diblokir browser.
 */
export async function clearSession(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Menyimpan screenshot bukti untuk skenario kritis ke test-results/evidence/.
 */
export async function captureEvidence(page: Page, fileName: string): Promise<string> {
  const path = `test-results/evidence/${fileName}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}
