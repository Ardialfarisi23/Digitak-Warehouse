# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: blackbox\rbac.spec.ts >> Blackbox Testing: Role-Based Access Control / RBAC (RBAC-01 s/d RBAC-06) >> RBAC-03: [Positif/DT] Supervisor mengakses area operasional supervisor
- Location: tests\blackbox\rbac.spec.ts:35:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('aside a:has-text("Approval"), nav a:has-text("Approval")').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('aside a:has-text("Approval"), nav a:has-text("Approval")').first() with timeout 8000ms
  - waiting for locator('aside a:has-text("Approval"), nav a:has-text("Approval")').first()

```

```yaml
- banner:
  - button "50"
  - button
  - button
  - button "Budi Santoso Supervisor BS":
    - paragraph: Budi Santoso
    - paragraph: Supervisor
    - text: BS
- complementary:
  - img "Digitak Logo"
  - navigation:
    - link:
      - /url: /dashboard/supervisor
    - link:
      - /url: /dashboard/supervisor/approval
    - link:
      - /url: /dashboard/supervisor/operasional
    - link:
      - /url: /master-data
    - link:
      - /url: /dashboard/supervisor/reconciliation
    - link:
      - /url: /dashboard/supervisor/boq
    - link:
      - /url: /dashboard/supervisor/warehousespv
  - button "Expand sidebar"
- main:
  - main:
    - heading "Dashboard Operasional Supervisor" [level=2]
    - text: "Supervisor: Budi Santoso • 14 Oktober 2026, 09.08 WIB"
    - paragraph: Total Perangkat
    - paragraph: "60"
    - paragraph: Project Aktif
    - paragraph: "1"
    - heading "Antrean Aksi & Notifikasi" [level=3]
    - paragraph: "3"
    - paragraph: Informasi Barang Masuk
    - paragraph: "0"
    - paragraph: Barang Keluar Menunggu Persetujuan
    - paragraph: "0"
    - paragraph: Verifikasi Surat Jalan
    - heading "Rekonsiliasi Hardware per Kode Tiket" [level=3]
    - paragraph: "Rincian material berdasarkan 5 komponen wajib PRD: BOQ Plan, Additional, MOS (Material on Site), Used, dan Remains."
    - paragraph: "Kode Tiket: -"
    - paragraph: FTTH OPEN AREA RANCAMANYAR • 52 item
    - text: Perhatian BOQ Plan 37.549 Additional +0 MOS 0 Used 5 Remains -37.549 MOS (Material on Site) Used Remains
    - heading "Kondisi & Status Gudang" [level=3]
    - paragraph: Kecukupan Area Gudang
    - link "Gudang Ciamis Mendekati Penuh":
      - /url: /dashboard/supervisor/warehousespv
      - paragraph: Gudang Ciamis
      - text: Mendekati Penuh
    - link "Gudang Old Trafford Cukup":
      - /url: /dashboard/supervisor/warehousespv
      - paragraph: Gudang Old Trafford
      - text: Cukup
    - link "Gudang Rancamanyar Cukup":
      - /url: /dashboard/supervisor/warehousespv
      - paragraph: Gudang Rancamanyar
      - text: Cukup
    - paragraph: Status BOQ Overall
    - paragraph: 15 Draft
    - paragraph: 28 Aktif
    - text: "43"
    - heading "Informasi Barang Masuk" [level=3]
    - link "Lihat Semua":
      - /url: /dashboard/supervisor/approval/inbound
    - paragraph: Monitoring Inbound Terakhir
    - 'link "Sj-234567 Siap Putaway Gudang Tujuan: Gudang Ciamis 11 Okt 2026 Lihat Detail"':
      - /url: /dashboard/supervisor/approval/inbound/99
      - paragraph: Sj-234567
      - text: Siap Putaway
      - paragraph: "Gudang Tujuan: Gudang Ciamis"
      - paragraph: 11 Okt 2026
      - text: Lihat Detail
    - 'link "TEST-PRISMA-1790281030462 Draft Diajukan Gudang Tujuan: Gudang Rancamanyar 25 Sep 2026 Lihat Detail"':
      - /url: /dashboard/supervisor/approval/inbound/42
      - paragraph: TEST-PRISMA-1790281030462
      - text: Draft Diajukan
      - paragraph: "Gudang Tujuan: Gudang Rancamanyar"
      - paragraph: 25 Sep 2026
      - text: Lihat Detail
    - 'link "TEST-PRISMA-1790280992538 Draft Diajukan Gudang Tujuan: Gudang Rancamanyar 25 Sep 2026 Lihat Detail"':
      - /url: /dashboard/supervisor/approval/inbound/41
      - paragraph: TEST-PRISMA-1790280992538
      - text: Draft Diajukan
      - paragraph: "Gudang Tujuan: Gudang Rancamanyar"
      - paragraph: 25 Sep 2026
      - text: Lihat Detail
    - heading "Gudang Transit Aktif" [level=3]
    - text: Belum ada gudang transit aktif.
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