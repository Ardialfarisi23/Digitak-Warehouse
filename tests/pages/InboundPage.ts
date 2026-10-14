import { Page, Locator, expect } from "@playwright/test";

export class InboundPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly inputInboundButton: Locator;
  readonly searchInput: Locator;
  readonly tableContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1:has-text("Penerimaan (Inbound)")');
    this.inputInboundButton = page.locator('[data-testid="inbound-open-modal"]');
    this.searchInput = page.locator('input[placeholder*="Cari No. Surat Jalan"]');
    this.tableContainer = page.locator("table");
  }

  async goto() {
    await this.page.goto("/staff/inbound");
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }

  async openInputModal() {
    await this.inputInboundButton.click();
    await expect(this.page.locator('[data-testid="inbound-project-select"]')).toBeVisible({ timeout: 8000 });
  }

  async searchInbound(query: string) {
    await this.searchInput.fill(query);
    // Aplikasi mendebounce search; tunggu tabel tetap ter-render.
    await expect(this.tableContainer).toBeVisible({ timeout: 8000 });
  }

  async expectTableContains(text: string) {
    await expect(this.tableContainer).toContainText(text, { timeout: 10000 });
  }

  // ============================================================
  // FORM INPUT INBOUND (create flow)
  // ============================================================

  /**
   * Mengisi header form inbound. Select memakai value ID (project/cluster/gudang)
   * yang di-fetch live dari API, sehingga tahan terhadap perubahan label.
   */
  async fillInboundHeader(input: {
    projectId: string;
    clusterId: string;
    suratJalanNumber: string;
    warehouseId: string;
    vehicleName: string;
    plateNumber: string;
    driverName: string;
    picName: string;
  }) {
    await this.page.locator('[data-testid="inbound-project-select"]').selectOption(input.projectId);

    // Opsi cluster dimuat setelah project dipilih — tunggu sampai ada opsi.
    const clusterSelect = this.page.locator('[data-testid="inbound-cluster-select"]');
    await expect(clusterSelect.locator("option").nth(1)).toBeAttached({ timeout: 15000 });
    await clusterSelect.selectOption(input.clusterId);

    await this.page.locator('[data-testid="inbound-nomor-sj"]').fill(input.suratJalanNumber);
    await this.page.locator('[data-testid="inbound-tanggal"]').fill(new Date().toISOString().slice(0, 10));

    const gudangSelect = this.page.locator('[data-testid="inbound-gudang-tujuan"]');
    await expect(gudangSelect.locator("option").nth(1)).toBeAttached({ timeout: 10000 });
    await gudangSelect.selectOption(input.warehouseId);

    await this.page.locator('[data-testid="inbound-kendaraan"]').fill(input.vehicleName);
    await this.page.locator('[data-testid="inbound-no-polisi"]').fill(input.plateNumber);
    await this.page.locator('[data-testid="inbound-driver"]').fill(input.driverName);
    await this.page.locator('[data-testid="inbound-pic"]').fill(input.picName);
  }

  /**
   * Memilih Asal Pengiriman = External dengan vendor manual (input teks),
   * sehingga tidak bergantung pada master supplier.
   */
  async chooseExternalManualVendor(vendorName: string) {
    await this.page.locator('[data-testid="inbound-asal-external"]').click();
    await this.page.locator('[data-testid="inbound-vendor-manual-toggle"]').check();
    const nameInput = this.page.locator('[data-testid="inbound-vendor-manual-name"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(vendorName);
  }

  /**
   * Menambahkan satu barang ke daftar draft melalui BarangPicker.
   */
  async addItemToDraft(input: { itemCode: string; qty: number; conditionLabel: string }) {
    const itemInput = this.page.locator('input[placeholder="Kode perangkat"]').first();
    await itemInput.click();

    const searchBox = this.page.locator('input[placeholder="Cari barang..."]');
    await expect(searchBox).toBeVisible({ timeout: 5000 });
    await searchBox.fill(input.itemCode);

    const resultButton = this.page.locator("button").filter({ hasText: input.itemCode }).last();
    await expect(resultButton).toBeVisible({ timeout: 10000 });
    await resultButton.click();

    await this.page.locator('[data-testid="inbound-item-qty"]').fill(String(input.qty));
    await this.page.locator('[data-testid="inbound-item-kondisi"]').selectOption({ label: input.conditionLabel });
    await this.page.locator('[data-testid="inbound-add-item"]').click();
  }

  /**
   * Submit form utama -> modal preview -> konfirmasi simpan.
   */
  async submitInboundAndConfirm() {
    const submitButton = this.page.locator('[data-testid="inbound-submit"]');
    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    await submitButton.click();

    const confirmButton = this.page.locator('[data-testid="inbound-confirm-save"]');
    await expect(confirmButton).toBeVisible({ timeout: 10000 });
    await confirmButton.click();
  }

  async expectSaveSuccess() {
    await expect(
      this.page.locator('h3:has-text("Surat Jalan Inbound Berhasil Disimpan")'),
    ).toBeVisible({ timeout: 20000 });
  }

  async closeSuccessModal() {
    await this.page.locator('[data-testid="inbound-success-ok"]').click();
  }
}
