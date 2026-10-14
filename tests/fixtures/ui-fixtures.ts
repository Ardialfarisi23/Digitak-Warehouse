import { test as base, expect } from "@playwright/test";

/**
 * Fixture yang menyembunyikan Next.js dev overlay (`nextjs-portal`) di
 * development mode. Overlay ini bisa mencegat pointer events sehingga klik
 * Playwright gagal "element intercepts pointer events".
 *
 * Penyelesaian murni sisi test (init script tiap navigasi) — tidak ada
 * kode aplikasi yang diubah.
 */
export const test = base.extend<{ hideDevOverlay: void }>({
  hideDevOverlay: [
    async ({ page }, use) => {
      await page.addInitScript(() => {
        const inject = () => {
          if (document.head && !document.getElementById("pw-hide-dev-overlay")) {
            const style = document.createElement("style");
            style.id = "pw-hide-dev-overlay";
            style.textContent =
              "nextjs-portal{display:none!important;pointer-events:none!important}";
            document.head.appendChild(style);
          }
        };
        inject();
        document.addEventListener("DOMContentLoaded", inject);
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect };
