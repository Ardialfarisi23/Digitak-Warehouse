# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: blackbox\rbac.spec.ts >> Blackbox Testing: Role-Based Access Control / RBAC (RBAC-01 s/d RBAC-06) >> RBAC-05: [Positif/DT] Admin General mengakses dashboard & menu lengkap
- Location: tests\blackbox\rbac.spec.ts:45:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('aside a:has-text("Master Data"), nav a:has-text("Master Data")').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('aside a:has-text("Master Data"), nav a:has-text("Master Data")').first() with timeout 8000ms
  - waiting for locator('aside a:has-text("Master Data"), nav a:has-text("Master Data")').first()

```

```yaml
- banner:
  - button
  - button
  - button
  - button "Ardi Alfarisi Admin General Ardi Alfarisi":
    - paragraph: Ardi Alfarisi
    - paragraph: Admin General
    - img "Ardi Alfarisi"
- complementary:
  - img "Digitak Logo"
  - navigation:
    - link:
      - /url: /dashboard
    - link:
      - /url: /master-data
    - link:
      - /url: /dashboard/boq
    - link:
      - /url: /dashboard/delivery
    - link:
      - /url: /dashboard/warehouse
    - link:
      - /url: /dashboard/reconciliation
    - link:
      - /url: /dashboard/reports
    - link:
      - /url: /dashboard/users
  - button "Expand sidebar"
- main:
  - heading "Selamat Pagi, Selamat Beraktivitas!" [level=1]
  - paragraph: Pantau kondisi gudang, status BOQ, dan persetujuan outbound dalam satu tampilan.
  - text: TOTAL ITEM STOK 60 Tersebar di 3 gudang aktif
  - link "BOQ DRAFT 0 Menunggu verifikasi Admin General Review BOQ →":
    - /url: /dashboard/boq
  - text: BOQ AKTIF 12 Status Aktif
  - link "SURAT JALAN PENDING 2 Menunggu konfirmasi Diterima/Didistribusikan Review BOQ →":
    - /url: /dashboard/delivery
  - heading "Kecukupan Area" [level=2]
  - paragraph: Status kecukupan gudang berdasarkan penilaian manual Supervisor.
  - link "Gudang Ciamis Mendekati Penuh Dihitung otomatis":
    - /url: /dashboard/warehouse
    - text: Gudang Ciamis Mendekati Penuh
    - paragraph: Dihitung otomatis
  - link "Gudang Old Trafford Cukup Dihitung otomatis":
    - /url: /dashboard/warehouse
    - text: Gudang Old Trafford Cukup
    - paragraph: Dihitung otomatis
  - link "Gudang Rancamanyar Cukup Dihitung otomatis":
    - /url: /dashboard/warehouse
    - text: Gudang Rancamanyar Cukup
    - paragraph: Dihitung otomatis
  - heading "Ringkasan per Project/Cluster" [level=2]
  - paragraph: Status BOQ dan realisasi hardware tiap proyek.
  - textbox "Cari project atau area..."
  - text: FTTH OPEN AREA RANCAMANYAR Perhatian Rancamanyar • BOQ Aktif Total Item 52 BOQ Plan 37.549 Additional 0 MOS 0 Used 5 Remains -37.549
- alert
```

# Test source

```ts
  1  | import { Page, Locator, expect } from "@playwright/test";
  2  | 
  3  | export class DashboardPage {
  4  |   readonly page: Page;
  5  |   readonly userProfileButton: Locator;
  6  |   readonly logoutButton: Locator;
  7  |   readonly sidebarContainer: Locator;
  8  | 
  9  |   constructor(page: Page) {
  10 |     this.page = page;
  11 |     this.userProfileButton = page.locator('header button:has(div:has(p.capitalize))');
  12 |     this.logoutButton = page.locator('button:has-text("Keluar")');
  13 |     this.sidebarContainer = page.locator('aside, nav[aria-label="Sidebar"], [class*="CompactSidebar"]');
  14 |   }
  15 | 
  16 |   async logout() {
  17 |     await this.userProfileButton.click();
  18 |     await expect(this.logoutButton).toBeVisible({ timeout: 5000 });
  19 |     await this.logoutButton.click();
  20 |     await this.page.waitForURL("**/", { timeout: 8000 });
  21 |   }
  22 | 
  23 |   async expectSidebarItemVisible(text: string) {
  24 |     const item = this.page.locator(`aside a:has-text("${text}"), nav a:has-text("${text}")`);
> 25 |     await expect(item.first()).toBeVisible({ timeout: 8000 });
     |                                ^ Error: expect(locator).toBeVisible() failed
  26 |   }
  27 | 
  28 |   async expectSidebarItemNotVisible(text: string) {
  29 |     const item = this.page.locator(`aside a:has-text("${text}"), nav a:has-text("${text}")`);
  30 |     await expect(item).toHaveCount(0);
  31 |   }
  32 | }
  33 | 
```