import { test, expect } from "../fixtures/ui-fixtures";
import { injectSession, getAuthToken, captureEvidence } from "../utils/helpers";
import { fetchInboundFormData } from "../utils/api-data";
import { InboundPage } from "../pages/InboundPage";
import { INBOUND_TEST_DATA, buildUniqueSuratJalanNumber, TEST_USERS } from "../fixtures/test-data";

/**
 * E2E-02 (inti): Siklus pembuatan Surat Jalan Inbound oleh Staf Gudang
 * melalui UI lengkap â€” dari buka modal, isi header, tambah item, submit,
 * sampai data tampil di tabel daftar inbound.
 *
 * Traceability: INB-01, INB-08 (alur), MSTR-01 (master data acuan).
 */
test.describe("E2E User Journey 02 (Inti): Pembuatan Surat Jalan Inbound oleh Staf Gudang", () => {
  test("Staf Gudang membuat Surat Jalan Inbound lengkap hingga tersimpan dan tampil di daftar", async ({ page }) => {
    test.slow(); // Alur data penuh melibatkan beberapa round-trip API

    const { token } = await getAuthToken(TEST_USERS.staff.email, TEST_USERS.staff.password);
    const formData = await fetchInboundFormData(token);

    // 1. Login sebagai Staf Gudang & buka halaman Penerimaan
    await injectSession(page, "staff");
    const inboundPage = new InboundPage(page);
    await inboundPage.goto();

    // 2. Buka modal Input Inbound
    await inboundPage.openInputModal();

    // 3. Isi header surat jalan
    const suratJalanNumber = buildUniqueSuratJalanNumber();
    await inboundPage.fillInboundHeader({
      projectId: formData.projectId,
      clusterId: formData.clusterId,
      suratJalanNumber,
      warehouseId: formData.warehouseId,
      vehicleName: INBOUND_TEST_DATA.vehicleName,
      plateNumber: INBOUND_TEST_DATA.plateNumber,
      driverName: INBOUND_TEST_DATA.driverName,
      picName: INBOUND_TEST_DATA.picName,
    });
    await inboundPage.chooseExternalManualVendor(INBOUND_TEST_DATA.vendorName);

    await captureEvidence(page, "e2e-02-inbound-form-filled");

    // 4. Tambahkan item barang dari BOQ aktif
    await inboundPage.addItemToDraft({
      itemCode: formData.itemCode,
      qty: INBOUND_TEST_DATA.itemQty,
      conditionLabel: INBOUND_TEST_DATA.itemCondition,
    });

    // 5. Submit -> preview -> konfirmasi
    await inboundPage.submitInboundAndConfirm();

    // 6. Assertion: modal sukses tampil
    await inboundPage.expectSaveSuccess();
    await captureEvidence(page, "e2e-02-inbound-saved");
    await inboundPage.closeSuccessModal();

    // 7. Assertion: surat jalan baru tampil di tabel daftar inbound
    await expect(async () => {
      await inboundPage.searchInbound(suratJalanNumber);
      await inboundPage.expectTableContains(suratJalanNumber);
    }).toPass({ timeout: 15000 });
  });
});
