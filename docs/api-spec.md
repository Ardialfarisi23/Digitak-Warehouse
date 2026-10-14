# Spesifikasi API — Digitak Warehouse Management System

> **Dokumen Pendukung PRD** — Bab 11 (Spesifikasi API Endpoint)
> **Base URL:** `http://localhost:5000` (atau konfigurasi `PORT` di backend `.env`)
> **Total Terdaftar:** 184 Endpoint
> **Format Standar Respons Sukses:** `{ success: true, message?: string, data: ... }`
> **Format Standar Respons Error:** `{ success: false, message: string, errors?: Array }`
> **Kode Error Umum:** `400` (Validasi Zod gagal), `401` (Unauthorized/Token kadaluarsa), `403` (Forbidden/Role tidak sesuai), `404` (Data tidak ditemukan), `500` (Internal Server Error)

---

## Ringkasan Endpoint per Modul

| Modul | Jumlah Endpoint |
|---|---|
| System Root | 1 |
| Penyesuaian Tambahan (Adjustment) | 2 |
| Aisle (Lorong) | 6 |
| Autentikasi | 8 |
| Bill of Quantity (BOQ) | 18 |
| Kategori Barang | 6 |
| Cluster Proyek | 6 |
| Customer | 6 |
| Dashboard | 7 |
| Barang / Material | 5 |
| Notifikasi In-App | 6 |
| Permintaan BOQ Tambahan | 7 |
| Personil | 5 |
| Profil Pengguna | 2 |
| Proyek | 7 |
| Rekonsiliasi Lapangan | 3 |
| Laporan & Rekonsiliasi | 14 |
| Pengaturan Sistem | 4 |
| Supplier | 6 |
| Surat Jalan & Distribusi | 23 |
| Titik Lapangan | 6 |
| Satuan | 6 |
| File Upload | 2 |
| Manajemen Pengguna | 6 |
| Kendaraan | 5 |
| Gudang | 11 |
| Zona Gudang | 6 |
| **TOTAL** | **184** |

---

## Daftar Lengkap Endpoint API

### Modul: System Root (1 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `GET` | `/` | Public | `res.json({ success: true, message: "Digitak Warehouse API" })` | `backend/src/app.js:71` |

### Modul: Penyesuaian Tambahan (Adjustment) (2 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/additional-adjustments` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `additionalController.create
` | `backend/src/modules/additional/additional.routes.js` |
| `GET` | `/api/additional-adjustments` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `additionalController.list
` | `backend/src/modules/additional/additional.routes.js` |

### Modul: Aisle (Lorong) (6 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/aisles` | JWT Authenticated [Role: ADMIN] | `aisleController.create
` | `backend/src/modules/aisle/aisle.routes.js` |
| `GET` | `/api/aisles` | JWT Authenticated [All Roles] | `aisleController.findAll` | `backend/src/modules/aisle/aisle.routes.js` |
| `GET` | `/api/aisles/:code` | JWT Authenticated [All Roles] | `aisleController.findByCode` | `backend/src/modules/aisle/aisle.routes.js` |
| `PUT` | `/api/aisles/:code` | JWT Authenticated [Role: ADMIN] | `aisleController.update
` | `backend/src/modules/aisle/aisle.routes.js` |
| `DELETE` | `/api/aisles/:code` | JWT Authenticated [Role: ADMIN] | `aisleController.softDelete
` | `backend/src/modules/aisle/aisle.routes.js` |
| `PATCH` | `/api/aisles/:code/restore` | JWT Authenticated [Role: ADMIN] | `aisleController.restore
` | `backend/src/modules/aisle/aisle.routes.js` |

### Modul: Autentikasi (8 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | Public | `authController.login
` | `backend/src/modules/auth/auth.routes.js` |
| `POST` | `/api/auth/forgot-password` | Public | `authController.forgotPassword
` | `backend/src/modules/auth/auth.routes.js` |
| `POST` | `/api/auth/reset-password` | Public | `authController.resetPassword
` | `backend/src/modules/auth/auth.routes.js` |
| `PUT` | `/api/auth/change-password` | JWT Authenticated [All Roles] | `authController.changePassword
` | `backend/src/modules/auth/auth.routes.js` |
| `POST` | `/api/auth/refresh` | Public | `authController.refresh
` | `backend/src/modules/auth/auth.routes.js` |
| `POST` | `/api/auth/logout` | JWT Authenticated [All Roles] | `authController.logout
` | `backend/src/modules/auth/auth.routes.js` |
| `GET` | `/api/auth/me` | JWT Authenticated [All Roles] | `authController.me
` | `backend/src/modules/auth/auth.routes.js` |
| `GET` | `/api/auth/admin` | JWT Authenticated [Role: ADMIN] | `user: req.user

        });

    }
` | `backend/src/modules/auth/auth.routes.js` |

### Modul: Bill of Quantity (BOQ) (18 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/boqs` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `boqController.create
` | `backend/src/modules/boq/boq.routes.js` |
| `GET` | `/api/boqs` | JWT Authenticated [All Roles] | `boqController.findAll` | `backend/src/modules/boq/boq.routes.js` |
| `GET` | `/api/boqs/stats` | JWT Authenticated [All Roles] | `boqController.getStats` | `backend/src/modules/boq/boq.routes.js` |
| `GET` | `/api/boqs/areas` | JWT Authenticated [All Roles] | `boqController.getAreas` | `backend/src/modules/boq/boq.routes.js` |
| `GET` | `/api/boqs/items` | JWT Authenticated [All Roles] | `boqController.getItems` | `backend/src/modules/boq/boq.routes.js` |
| `GET` | `/api/boqs/check-ticket` | JWT Authenticated [All Roles] | `boqController.checkTicketAvailability` | `backend/src/modules/boq/boq.routes.js` |
| `GET` | `/api/boqs/export` | JWT Authenticated [All Roles] | `boqController.exportBoqs` | `backend/src/modules/boq/boq.routes.js` |
| `GET` | `/api/boqs/export-matrix` | JWT Authenticated [All Roles] | `boqController.exportMatrixExcel` | `backend/src/modules/boq/boq.routes.js` |
| `GET` | `/api/boqs/:id` | JWT Authenticated [All Roles] | `boqController.findById` | `backend/src/modules/boq/boq.routes.js` |
| `GET` | `/api/boqs/:id/summary` | JWT Authenticated [All Roles] | `boqController.getSummary` | `backend/src/modules/boq/boq.routes.js` |
| `PUT` | `/api/boqs/:id` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `boqController.update
` | `backend/src/modules/boq/boq.routes.js` |
| `PUT` | `/api/boqs/:id/status` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `boqController.updateStatus
` | `backend/src/modules/boq/boq.routes.js` |
| `PATCH` | `/api/boqs/:id/status` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `boqController.updateStatus
` | `backend/src/modules/boq/boq.routes.js` |
| `PUT` | `/api/boqs/:id/verification` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `boqController.update
` | `backend/src/modules/boq/boq.routes.js` |
| `PATCH` | `/api/boqs/:id/verification` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `boqController.update
` | `backend/src/modules/boq/boq.routes.js` |
| `DELETE` | `/api/boqs/:id` | JWT Authenticated [Role: ADMIN] | `boqController.softDelete
` | `backend/src/modules/boq/boq.routes.js` |
| `PUT` | `/api/boqs/:id/restore` | JWT Authenticated [Role: ADMIN] | `boqController.restore
` | `backend/src/modules/boq/boq.routes.js` |
| `PATCH` | `/api/boqs/:id/restore` | JWT Authenticated [Role: ADMIN] | `boqController.restore
` | `backend/src/modules/boq/boq.routes.js` |

### Modul: Kategori Barang (6 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/categories` | JWT Authenticated [Role: ADMIN] | `categoryController.create
` | `backend/src/modules/category/category.routes.js` |
| `GET` | `/api/categories` | JWT Authenticated [All Roles] | `categoryController.findAll` | `backend/src/modules/category/category.routes.js` |
| `GET` | `/api/categories/:code` | JWT Authenticated [All Roles] | `categoryController.findByCode` | `backend/src/modules/category/category.routes.js` |
| `PUT` | `/api/categories/:code` | JWT Authenticated [Role: ADMIN] | `categoryController.update
` | `backend/src/modules/category/category.routes.js` |
| `DELETE` | `/api/categories/:code` | JWT Authenticated [Role: ADMIN] | `categoryController.softDelete
` | `backend/src/modules/category/category.routes.js` |
| `PATCH` | `/api/categories/:code/restore` | JWT Authenticated [Role: ADMIN] | `categoryController.restore
` | `backend/src/modules/category/category.routes.js` |

### Modul: Cluster Proyek (6 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `GET` | `/api/clusters` | JWT Authenticated [All Roles] | `clusterController.listByProject` | `backend/src/modules/cluster/cluster.routes.js` |
| `GET` | `/api/clusters/all` | JWT Authenticated [All Roles] | `clusterController.listAll` | `backend/src/modules/cluster/cluster.routes.js` |
| `POST` | `/api/clusters` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `clusterController.create
` | `backend/src/modules/cluster/cluster.routes.js` |
| `PUT` | `/api/clusters/:clusterId` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `clusterController.update
` | `backend/src/modules/cluster/cluster.routes.js` |
| `PATCH` | `/api/clusters/:clusterId/toggle-status` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `clusterController.toggleStatus` | `backend/src/modules/cluster/cluster.routes.js` |
| `DELETE` | `/api/clusters/:clusterId` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `clusterController.deleteCluster` | `backend/src/modules/cluster/cluster.routes.js` |

### Modul: Customer (6 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/customers` | JWT Authenticated [Role: ADMIN] | `customerController.create
` | `backend/src/modules/customer/customer.routes.js` |
| `GET` | `/api/customers` | JWT Authenticated [All Roles] | `customerController.findAll` | `backend/src/modules/customer/customer.routes.js` |
| `GET` | `/api/customers/:code` | JWT Authenticated [All Roles] | `customerController.findByCode` | `backend/src/modules/customer/customer.routes.js` |
| `PUT` | `/api/customers/:code` | JWT Authenticated [Role: ADMIN] | `customerController.update
` | `backend/src/modules/customer/customer.routes.js` |
| `DELETE` | `/api/customers/:code` | JWT Authenticated [Role: ADMIN] | `customerController.softDelete
` | `backend/src/modules/customer/customer.routes.js` |
| `PATCH` | `/api/customers/:code/restore` | JWT Authenticated [Role: ADMIN] | `customerController.restore
` | `backend/src/modules/customer/customer.routes.js` |

### Modul: Dashboard (7 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `GET` | `/api/dashboard` | JWT Authenticated [All Roles] | `dashboardController.getStats` | `backend/src/modules/dashboard/dashboard.routes.js` |
| `GET` | `/api/dashboard/project-summary` | JWT Authenticated [All Roles] | `dashboardController.getProjectSummary` | `backend/src/modules/dashboard/dashboard.routes.js` |
| `GET` | `/api/dashboard/approvals` | JWT Authenticated [All Roles] | `dashboardController.getApprovalQueue` | `backend/src/modules/dashboard/dashboard.routes.js` |
| `GET` | `/api/dashboard/reconciliation` | JWT Authenticated [All Roles] | `dashboardController.getHardwareReconciliation` | `backend/src/modules/dashboard/dashboard.routes.js` |
| `GET` | `/api/dashboard/activities` | JWT Authenticated [All Roles] | `dashboardController.getActivityLog` | `backend/src/modules/dashboard/dashboard.routes.js` |
| `GET` | `/api/dashboard/warehouse-assessment` | JWT Authenticated [All Roles] | `lebih presisi).` | `backend/src/modules/dashboard/dashboard.routes.js` |
| `PUT` | `/api/dashboard/warehouse-assessment/:gudangId` | JWT Authenticated [Role: SUPERVISOR,ADMIN] | `dashboardController.updateWarehouseAssessment` | `backend/src/modules/dashboard/dashboard.routes.js` |

### Modul: Barang / Material (5 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/items` | JWT Authenticated [Role: ADMIN] | `itemController.create
` | `backend/src/modules/item/item.routes.js` |
| `GET` | `/api/items` | JWT Authenticated [All Roles] | `itemController.findAll` | `backend/src/modules/item/item.routes.js` |
| `GET` | `/api/items/:kode_perangkat` | JWT Authenticated [All Roles] | `itemController.findByKode` | `backend/src/modules/item/item.routes.js` |
| `PUT` | `/api/items/:kode_perangkat` | JWT Authenticated [Role: ADMIN] | `itemController.update
` | `backend/src/modules/item/item.routes.js` |
| `DELETE` | `/api/items/:id` | JWT Authenticated [Role: ADMIN] | `itemController.remove
` | `backend/src/modules/item/item.routes.js` |

### Modul: Notifikasi In-App (6 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `GET` | `/api/notifications` | JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF] | `notificationController.list
` | `backend/src/modules/notifications/notifications.routes.js` |
| `GET` | `/api/notifications/unread-count` | JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF] | `notificationController.unreadCount
` | `backend/src/modules/notifications/notifications.routes.js` |
| `PATCH` | `/api/notifications/:id/read` | JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF] | `notificationController.markRead
` | `backend/src/modules/notifications/notifications.routes.js` |
| `PATCH` | `/api/notifications/read-all` | JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF] | `notificationController.markAllRead
` | `backend/src/modules/notifications/notifications.routes.js` |
| `DELETE` | `/api/notifications/:id` | JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF] | `notificationController.deleteOne
` | `backend/src/modules/notifications/notifications.routes.js` |
| `DELETE` | `/api/notifications` | JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF] | `notificationController.deleteMany
` | `backend/src/modules/notifications/notifications.routes.js` |

### Modul: Permintaan BOQ Tambahan (7 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/permintaan-boqs` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `permintaanBoqController.create
` | `backend/src/modules/permintaan-boq/permintaan-boq.routes.js` |
| `GET` | `/api/permintaan-boqs` | JWT Authenticated [All Roles] | `permintaanBoqController.findAll` | `backend/src/modules/permintaan-boq/permintaan-boq.routes.js` |
| `GET` | `/api/permintaan-boqs/stats` | JWT Authenticated [All Roles] | `permintaanBoqController.getStats` | `backend/src/modules/permintaan-boq/permintaan-boq.routes.js` |
| `GET` | `/api/permintaan-boqs/:id` | JWT Authenticated [All Roles] | `permintaanBoqController.findById` | `backend/src/modules/permintaan-boq/permintaan-boq.routes.js` |
| `PATCH` | `/api/permintaan-boqs/:id/status` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `permintaanBoqController.updateStatus
` | `backend/src/modules/permintaan-boq/permintaan-boq.routes.js` |
| `DELETE` | `/api/permintaan-boqs/:id` | JWT Authenticated [Role: ADMIN] | `permintaanBoqController.softDelete
` | `backend/src/modules/permintaan-boq/permintaan-boq.routes.js` |
| `PATCH` | `/api/permintaan-boqs/:id/restore` | JWT Authenticated [Role: ADMIN] | `permintaanBoqController.restore
` | `backend/src/modules/permintaan-boq/permintaan-boq.routes.js` |

### Modul: Personil (5 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/personnels` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `personnelController.create
` | `backend/src/modules/personnel/personnel.routes.js` |
| `GET` | `/api/personnels` | JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF] | `personnelController.findAll
` | `backend/src/modules/personnel/personnel.routes.js` |
| `GET` | `/api/personnels/:personil_id` | JWT Authenticated [Role: ADMIN,SUPERVISOR,STAFF] | `personnelController.findByPersonilId
` | `backend/src/modules/personnel/personnel.routes.js` |
| `PUT` | `/api/personnels/:personil_id` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `personnelController.update
` | `backend/src/modules/personnel/personnel.routes.js` |
| `DELETE` | `/api/personnels/:personil_id` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `personnelController.remove
` | `backend/src/modules/personnel/personnel.routes.js` |

### Modul: Profil Pengguna (2 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `GET` | `/api/profile` | JWT Authenticated [All Roles] | `profileController.getProfile` | `backend/src/modules/profile/profile.routes.js` |
| `PATCH` | `/api/profile` | JWT Authenticated [All Roles] | `profileController.updateProfile
` | `backend/src/modules/profile/profile.routes.js` |

### Modul: Proyek (7 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/projects` | JWT Authenticated [Role: ADMIN] | `projectController.create
` | `backend/src/modules/projects/project.routes.js` |
| `GET` | `/api/projects` | JWT Authenticated [All Roles] | `projectController.findAll` | `backend/src/modules/projects/project.routes.js` |
| `GET` | `/api/projects/:project_id` | JWT Authenticated [All Roles] | `projectController.findByProjectId` | `backend/src/modules/projects/project.routes.js` |
| `PUT` | `/api/projects/:project_id` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `projectController.update
` | `backend/src/modules/projects/project.routes.js` |
| `DELETE` | `/api/projects/:project_id` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `projectController.remove
` | `backend/src/modules/projects/project.routes.js` |
| `PATCH` | `/api/projects/:project_id/nonaktifkan` | JWT Authenticated [Role: ADMIN] | `projectController.nonaktifkan
` | `backend/src/modules/projects/project.routes.js` |
| `PATCH` | `/api/projects/:project_id/restore` | JWT Authenticated [Role: ADMIN] | `projectController.restore
` | `backend/src/modules/projects/project.routes.js` |

### Modul: Rekonsiliasi Lapangan (3 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `GET` | `/api/reconciliation/filter-options` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `reconciliationController.getFilterOptions
` | `backend/src/modules/reconciliation/reconciliation.routes.js` |
| `GET` | `/api/reconciliation/inventory` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `reconciliationController.getInventory
` | `backend/src/modules/reconciliation/reconciliation.routes.js` |
| `PUT` | `/api/reconciliation/remains-note` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `reconciliationController.saveRemainsNote
` | `backend/src/modules/reconciliation/reconciliation.routes.js` |

### Modul: Laporan & Rekonsiliasi (14 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `GET` | `/api/reports/stock-history` | JWT Authenticated [Role: ADMIN] | `reportsController.getStockHistory` | `backend/src/modules/reports/reports.routes.js` |
| `GET` | `/api/reports/stock-history/export` | JWT Authenticated [Role: ADMIN] | `reportsController.exportStockHistoryExcel` | `backend/src/modules/reports/reports.routes.js` |
| `GET` | `/api/reports/audit-log` | JWT Authenticated [Role: ADMIN] | `reportsController.getAuditLogs` | `backend/src/modules/reports/reports.routes.js` |
| `GET` | `/api/reports/audit-log/export` | JWT Authenticated [Role: ADMIN] | `reportsController.exportAuditLogExcel` | `backend/src/modules/reports/reports.routes.js` |
| `GET` | `/api/reports/reconciliation-upload-logs` | JWT Authenticated [Role: ADMIN] | `reportsController.getReconciliationUploadLogs` | `backend/src/modules/reports/reports.routes.js` |
| `GET` | `/api/reports/hardware-reconciliation` | JWT Authenticated [Role: ADMIN] | `reportsController.getHardwareReconciliation` | `backend/src/modules/reports/reports.routes.js` |
| `GET` | `/api/reports/hardware-reconciliation/per-tiket` | JWT Authenticated [Role: ADMIN] | `reportsController.getHardwareReconciliationPerTiket` | `backend/src/modules/reports/reports.routes.js` |
| `GET` | `/api/reports/hardware-reconciliation/detailed` | JWT Authenticated [Role: ADMIN] | `reportsController.getHardwareReconciliationDetailed` | `backend/src/modules/reports/reports.routes.js` |
| `GET` | `/api/reports/zone-utilization-history` | JWT Authenticated [Role: ADMIN] | `reportsController.getZoneUtilizationHistory` | `backend/src/modules/reports/reports.routes.js` |
| `GET` | `/api/reports/zone-utilization` | JWT Authenticated [Role: ADMIN] | `reportsController.getZoneUtilization` | `backend/src/modules/reports/reports.routes.js` |
| `GET` | `/api/reports/reconciliation/template` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `reportsController.downloadReconciliationTemplate` | `backend/src/modules/reports/reports.routes.js` |
| `POST` | `/api/reports/reconciliation/backfill` | JWT Authenticated [Role: ADMIN] | `reportsController.backfillReconciliation` | `backend/src/modules/reports/reports.routes.js` |
| `POST` | `/api/reports/reconciliation/upload` | JWT Authenticated [Role: ADMIN,SUPERVISOR] + Multer File Upload | `reportsController.uploadReconciliationFile` | `backend/src/modules/reports/reports.routes.js` |
| `POST` | `/api/reports/reconciliation/confirm` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `reportsController.confirmReconciliationUpload` | `backend/src/modules/reports/reports.routes.js` |

### Modul: Pengaturan Sistem (4 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `GET` | `/api/settings/notifications` | JWT Authenticated [All Roles] | `settingsController.getNotificationPreferences` | `backend/src/modules/settings/settings.routes.js` |
| `PUT` | `/api/settings/notifications` | JWT Authenticated [All Roles] | `settingsController.updateNotificationPreferences` | `backend/src/modules/settings/settings.routes.js` |
| `GET` | `/api/settings` | JWT Authenticated [All Roles] | `settingsController.getUserSettings` | `backend/src/modules/settings/settings.routes.js` |
| `PUT` | `/api/settings` | JWT Authenticated [All Roles] | `settingsController.updateUserSettings` | `backend/src/modules/settings/settings.routes.js` |

### Modul: Supplier (6 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/suppliers` | JWT Authenticated [Role: ADMIN] | `supplierController.create
` | `backend/src/modules/supplier/supplier.routes.js` |
| `GET` | `/api/suppliers` | JWT Authenticated [All Roles] | `supplierController.findAll` | `backend/src/modules/supplier/supplier.routes.js` |
| `GET` | `/api/suppliers/:code` | JWT Authenticated [All Roles] | `supplierController.findByCode` | `backend/src/modules/supplier/supplier.routes.js` |
| `PUT` | `/api/suppliers/:code` | JWT Authenticated [Role: ADMIN] | `supplierController.update
` | `backend/src/modules/supplier/supplier.routes.js` |
| `DELETE` | `/api/suppliers/:code` | JWT Authenticated [Role: ADMIN] | `supplierController.softDelete
` | `backend/src/modules/supplier/supplier.routes.js` |
| `PATCH` | `/api/suppliers/:code/restore` | JWT Authenticated [Role: ADMIN] | `supplierController.restore
` | `backend/src/modules/supplier/supplier.routes.js` |

### Modul: Surat Jalan & Distribusi (23 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/surat-jalan` | JWT Authenticated [Role: ADMIN,STAFF] | `suratJalanController.create` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `POST` | `/api/surat-jalan/inbound/staff` | JWT Authenticated [All Roles] | `suratJalanController.createStaffInbound
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `POST` | `/api/surat-jalan/:id/receive-inbound` | JWT Authenticated [All Roles] | `suratJalanController.receiveInbound
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `GET` | `/api/surat-jalan/outbound/queue` | JWT Authenticated [All Roles] | `suratJalanController.findOutboundQueue` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `GET` | `/api/surat-jalan/outbound/approval` | JWT Authenticated [Role: SUPERVISOR] | `suratJalanController.findOutboundForApproval` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `GET` | `/api/surat-jalan/outbound/delivery` | JWT Authenticated [Role: SUPERVISOR] | `suratJalanController.findOutboundForDelivery` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `GET` | `/api/surat-jalan/outbound/riwayat-approval` | JWT Authenticated [Role: SUPERVISOR] | `suratJalanController.findOutboundApprovalHistory` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `GET` | `/api/surat-jalan/outbound/:id` | JWT Authenticated [All Roles] | `suratJalanController.findOutboundDetail
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `GET` | `/api/surat-jalan/inbound` | JWT Authenticated [All Roles] | `suratJalanController.findInboundList` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `GET` | `/api/surat-jalan/staff/history` | JWT Authenticated [All Roles] | `suratJalanController.findStaffHistory` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `GET` | `/api/surat-jalan/rejected` | JWT Authenticated [Role: SUPERVISOR] | `suratJalanController.findRejectedList` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `GET` | `/api/surat-jalan/:id` | JWT Authenticated [All Roles] | `suratJalanController.findById
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `PUT` | `/api/surat-jalan/:id/approve-outbound` | JWT Authenticated [Role: SUPERVISOR] | `suratJalanController.approveOutbound
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `PUT` | `/api/surat-jalan/:id/confirm-distributed` | JWT Authenticated [Role: SUPERVISOR] | `suratJalanController.confirmDistributed
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `PUT` | `/api/surat-jalan/:id/delivery-status` | JWT Authenticated [Role: STAFF,SUPERVISOR] | `suratJalanController.updateDeliveryStatus
);

// Gudang Transit — STAFF ONLY (keputusan bisnis #6: supervisor tidak
// ditambahi aksi transit). Scope gudang tetap dipasang di kedua route.` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `POST` | `/api/surat-jalan/:id/transit/tiba` | JWT Authenticated [Role: STAFF] | `suratJalanController.tibaDiTransit
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `POST` | `/api/surat-jalan/:id/transit/lanjut` | JWT Authenticated [Role: STAFF] | `suratJalanController.lanjutDariTransit
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `PUT` | `/api/surat-jalan/:id/reject-outbound` | JWT Authenticated [Role: SUPERVISOR] | `suratJalanController.rejectOutbound
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `PUT` | `/api/surat-jalan/:id/cancel-draft` | JWT Authenticated [Role: STAFF,SUPERVISOR,ADMIN] | `suratJalanController.cancelDraft
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `POST` | `/api/surat-jalan/:id/putaway` | JWT Authenticated [Role: STAFF,SUPERVISOR] | `suratJalanController.putaway
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `POST` | `/api/surat-jalan/:id/retrieve` | JWT Authenticated [Role: STAFF,SUPERVISOR] | `suratJalanController.retrieve
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `POST` | `/api/surat-jalan/:id/items/:itemId/fotos` | JWT Authenticated [Role: STAFF,SUPERVISOR] | `suratJalanController.addItemFoto
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |
| `DELETE` | `/api/surat-jalan/:id/items/:itemId/fotos/:fotoId` | JWT Authenticated [Role: STAFF,SUPERVISOR] | `suratJalanController.deleteItemFoto
` | `backend/src/modules/surat-jalan/surat-jalan.routes.js` |

### Modul: Titik Lapangan (6 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/titik-lapangan` | JWT Authenticated [Role: ADMIN] | `titikLapanganController.create
` | `backend/src/modules/titik-lapangan/titik-lapangan.routes.js` |
| `GET` | `/api/titik-lapangan` | JWT Authenticated [All Roles] | `titikLapanganController.findAll` | `backend/src/modules/titik-lapangan/titik-lapangan.routes.js` |
| `GET` | `/api/titik-lapangan/:id` | JWT Authenticated [All Roles] | `titikLapanganController.findById` | `backend/src/modules/titik-lapangan/titik-lapangan.routes.js` |
| `PUT` | `/api/titik-lapangan/:id` | JWT Authenticated [Role: ADMIN] | `titikLapanganController.update
` | `backend/src/modules/titik-lapangan/titik-lapangan.routes.js` |
| `DELETE` | `/api/titik-lapangan/:id` | JWT Authenticated [Role: ADMIN] | `titikLapanganController.softDelete` | `backend/src/modules/titik-lapangan/titik-lapangan.routes.js` |
| `PATCH` | `/api/titik-lapangan/:id/restore` | JWT Authenticated [Role: ADMIN] | `titikLapanganController.restore` | `backend/src/modules/titik-lapangan/titik-lapangan.routes.js` |

### Modul: Satuan (6 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/units` | JWT Authenticated [Role: ADMIN] | `unitController.create
` | `backend/src/modules/unit/unit.routes.js` |
| `GET` | `/api/units` | JWT Authenticated [All Roles] | `unitController.findAll` | `backend/src/modules/unit/unit.routes.js` |
| `GET` | `/api/units/:code` | JWT Authenticated [All Roles] | `unitController.findByCode` | `backend/src/modules/unit/unit.routes.js` |
| `PUT` | `/api/units/:code` | JWT Authenticated [Role: ADMIN] | `unitController.update
` | `backend/src/modules/unit/unit.routes.js` |
| `DELETE` | `/api/units/:code` | JWT Authenticated [Role: ADMIN] | `unitController.softDelete
` | `backend/src/modules/unit/unit.routes.js` |
| `PATCH` | `/api/units/:code/restore` | JWT Authenticated [Role: ADMIN] | `unitController.restore
` | `backend/src/modules/unit/unit.routes.js` |

### Modul: File Upload (2 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/upload` | JWT Authenticated [All Roles] + Multer File Upload | `uploadFile` | `backend/src/modules/upload/upload.routes.js` |
| `POST` | `/api/upload/boq-reference` | JWT Authenticated [Role: ADMIN,SUPERVISOR] + Multer File Upload | `uploadBoqReference
` | `backend/src/modules/upload/upload.routes.js` |

### Modul: Manajemen Pengguna (6 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `PATCH` | `/api/users/me/avatar` | JWT Authenticated [All Roles] | `usersController.updateAvatar
` | `backend/src/modules/users/users.routes.js` |
| `DELETE` | `/api/users/me/avatar` | JWT Authenticated [All Roles] | `usersController.deleteAvatar` | `backend/src/modules/users/users.routes.js` |
| `POST` | `/api/users` | JWT Authenticated [Role: ADMIN] | `usersController.create
` | `backend/src/modules/users/users.routes.js` |
| `GET` | `/api/users` | JWT Authenticated [Role: ADMIN] | `usersController.findAll` | `backend/src/modules/users/users.routes.js` |
| `GET` | `/api/users/:user_id` | JWT Authenticated [Role: ADMIN] | `usersController.findById` | `backend/src/modules/users/users.routes.js` |
| `PUT` | `/api/users/:user_id` | JWT Authenticated [Role: ADMIN] | `usersController.update
` | `backend/src/modules/users/users.routes.js` |

### Modul: Kendaraan (5 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/vehicles` | JWT Authenticated [Role: ADMIN] | `vehicleController.create
` | `backend/src/modules/vehicle/vehicle.routes.js` |
| `GET` | `/api/vehicles` | JWT Authenticated [All Roles] | `vehicleController.findAll` | `backend/src/modules/vehicle/vehicle.routes.js` |
| `GET` | `/api/vehicles/:no_polisi` | JWT Authenticated [All Roles] | `vehicleController.findByNoPolisi` | `backend/src/modules/vehicle/vehicle.routes.js` |
| `PUT` | `/api/vehicles/:no_polisi` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `vehicleController.update
` | `backend/src/modules/vehicle/vehicle.routes.js` |
| `DELETE` | `/api/vehicles/:kendaraan_id` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `vehicleController.remove
` | `backend/src/modules/vehicle/vehicle.routes.js` |

### Modul: Gudang (11 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/warehouses` | JWT Authenticated [Role: ADMIN] | `warehouseController.create
` | `backend/src/modules/warehouse/warehouse.routes.js` |
| `GET` | `/api/warehouses` | JWT Authenticated [All Roles] | `warehouseController.findAll` | `backend/src/modules/warehouse/warehouse.routes.js` |
| `GET` | `/api/warehouses/:nama_gudang` | JWT Authenticated [All Roles] | `warehouseController.findByNama` | `backend/src/modules/warehouse/warehouse.routes.js` |
| `PUT` | `/api/warehouses/:nama_gudang` | JWT Authenticated [Role: ADMIN] | `warehouseController.update
` | `backend/src/modules/warehouse/warehouse.routes.js` |
| `DELETE` | `/api/warehouses/:nama_gudang` | JWT Authenticated [Role: ADMIN] | `warehouseController.softDelete` | `backend/src/modules/warehouse/warehouse.routes.js` |
| `PATCH` | `/api/warehouses/:nama_gudang/restore` | JWT Authenticated [Role: ADMIN] | `warehouseController.restore` | `backend/src/modules/warehouse/warehouse.routes.js` |
| `GET` | `/api/warehouses/:gudang_id/layout` | JWT Authenticated [All Roles] | `warehouseController.getLayout` | `backend/src/modules/warehouse/warehouse.routes.js` |
| `GET` | `/api/warehouses/:gudang_id/zona/:zona_id/stock-snapshot` | JWT Authenticated [All Roles] | `warehouseController.getZoneStockSnapshot` | `backend/src/modules/warehouse/warehouse.routes.js` |
| `GET` | `/api/warehouses/:gudang_id/stock-check` | JWT Authenticated [All Roles] | `warehouseController.getStockCheck` | `backend/src/modules/warehouse/warehouse.routes.js` |
| `GET` | `/api/warehouses/:gudang_id/picking-stock-check` | JWT Authenticated [All Roles] | `warehouseController.getPickingStockCheck` | `backend/src/modules/warehouse/warehouse.routes.js` |
| `GET` | `/api/warehouses/:gudang_id/picking-availability` | JWT Authenticated [All Roles] | `warehouseController.getPickingAvailability` | `backend/src/modules/warehouse/warehouse.routes.js` |

### Modul: Zona Gudang (6 Endpoint)

| Method | Path | Autentikasi & Hak Akses | Handler / Controller | File Sumber |
|---|---|---|---|---|
| `POST` | `/api/zones` | JWT Authenticated [Role: ADMIN] | `zoneController.create
` | `backend/src/modules/zone/zone.routes.js` |
| `GET` | `/api/zones` | JWT Authenticated [All Roles] | `zoneController.findAll` | `backend/src/modules/zone/zone.routes.js` |
| `GET` | `/api/zones/:code` | JWT Authenticated [All Roles] | `zoneController.findByCode` | `backend/src/modules/zone/zone.routes.js` |
| `PUT` | `/api/zones/:zona_id` | JWT Authenticated [Role: ADMIN] | `zoneController.updateById
` | `backend/src/modules/zone/zone.routes.js` |
| `DELETE` | `/api/zones/:zona_id` | JWT Authenticated [Role: ADMIN] | `zoneController.deleteById
` | `backend/src/modules/zone/zone.routes.js` |
| `PATCH` | `/api/zones/:zona_id/utilization-status` | JWT Authenticated [Role: ADMIN,SUPERVISOR] | `zoneController.updateUtilizationStatus
` | `backend/src/modules/zone/zone.routes.js` |

